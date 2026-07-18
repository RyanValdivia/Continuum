import "server-only";
import {
    applyInputSchema,
    MAX_CANDIDATES_PER_VACANCY,
    MAX_CV_BYTES,
} from "@/core/recruitment/domain/schemas";
import type { ApplyInput } from "@/core/recruitment/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { googleParseCv, type ParseCvFn } from "../llm/parse-cv";
import {
    findCandidateByEmail,
    insertCandidate,
} from "../repository/candidates";
import { countCandidates, findVacancyByToken } from "../repository/vacancies";

export interface ApplyDeps {
    parseCv?: ParseCvFn;
}

/**
 * Public application intake. Deliberately leak-free: unknown token and closed
 * vacancy are the same 404; honeypot submissions are accepted silently and
 * dropped. The candidate row is stored `pending` and the analysis runs right
 * after (wired in the analysis task).
 */
export async function applyToVacancyService(
    rawInput: ApplyInput,
    deps: ApplyDeps = {},
): AsyncAppResult<{ received: true }> {
    const parseCv = deps.parseCv ?? googleParseCv;

    const parsed = applyInputSchema.safeParse(rawInput);
    if (!parsed.success) {
        return err(AppErrors.invalidBody({ cause: parsed.error }));
    }
    const input = parsed.data;

    try {
        // Honeypot: pretend success, store nothing.
        if (input.website) return ok({ received: true });

        if (input.cv.data.byteLength > MAX_CV_BYTES) {
            return err(AppErrors.unprocessableEntity({ targets: ["cv"] }));
        }

        const vacancy = await findVacancyByToken(input.token);
        if (!vacancy || vacancy.status !== "open") {
            return err(AppErrors.notFound());
        }

        const total = await countCandidates(vacancy.id);
        if (total >= MAX_CANDIDATES_PER_VACANCY) {
            return err(AppErrors.tooManyRequests());
        }

        const duplicate = await findCandidateByEmail(vacancy.id, input.email);
        if (duplicate) {
            return err(AppErrors.conflict({ targets: ["email"] }));
        }

        let profile;
        try {
            profile = await parseCv(input.cv.data);
        } catch (cause) {
            return err(
                AppErrors.unprocessableEntity({ targets: ["cv"], cause }),
            );
        }

        await insertCandidate({
            vacancyId: vacancy.id,
            name: input.name,
            email: input.email,
            cvFilename: input.cv.filename,
            cvText: profile.plainText,
            profile,
            status: "pending",
        });

        return ok({ received: true });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
