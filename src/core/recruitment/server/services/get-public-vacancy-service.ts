import "server-only";
import type { PublicVacancy } from "@/core/recruitment/domain/types";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findVacancyByToken } from "../repository/vacancies";

/** Public-safe vacancy read for the apply portal (title + org name only). */
export async function getPublicVacancyService(
    token: string,
): AsyncAppResult<PublicVacancy> {
    try {
        const row = await findVacancyByToken(token);
        if (row?.status !== "open") {
            return err(AppErrors.notFound());
        }
        return ok({
            title: row.title,
            organizationName: row.organizationName,
        });
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
