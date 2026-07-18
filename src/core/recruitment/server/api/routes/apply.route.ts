import { Elysia, t } from "elysia";
import { z } from "zod";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { applyToVacancyService } from "../../services/apply-to-vacancy-service";

const applyResultSchema = z.object({ received: z.literal(true) });

/**
 * Public application endpoint — the one route in the project without
 * `authed` (like the Notion OAuth callback). Multipart body is validated
 * with Elysia `t` (zod cannot represent `File` under the global OpenAPI
 * zod mapping); the service re-validates everything with `applyInputSchema`.
 */
export const applyRoute = new Elysia().post(
    "/apply/:token",
    async ({ params, body, status }) => {
        const result = await applyToVacancyService({
            token: params.token,
            name: body.name,
            email: body.email,
            cv: {
                data: new Uint8Array(await body.cv.arrayBuffer()),
                filename: body.cv.name,
                mediaType: "application/pdf",
            },
            website: body.website === "" ? undefined : body.website,
        });
        if (!result.ok)
            return status(
                result.error.status as 400 | 404 | 409 | 422 | 429 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 200 }),
            email: t.String({ format: "email" }),
            cv: t.File({ type: "application/pdf" }),
            website: t.Optional(t.String()),
        }),
        params: z.object({ token: z.string() }),
        response: {
            200: successResponseSchema(applyResultSchema, "ApplyResult"),
            400: errorResponseSchema(400),
            404: errorResponseSchema(404),
            409: errorResponseSchema(409),
            422: errorResponseSchema(422),
            429: errorResponseSchema(429),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Recruitment"],
            summary: "Public: submit a CV to a vacancy",
        },
    },
);
