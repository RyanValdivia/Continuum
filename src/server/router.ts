import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { serverTiming } from "@elysiajs/server-timing";
import { elysiaLogger } from "@logtape/elysia";
import { getLogger } from "@logtape/logtape";
import { Elysia } from "elysia";
import { z } from "zod";
import { ServerConfig } from "@/config/server-config";
import { documentReviewRouter } from "@/core/document-review/server/api/router";
import { githubRouter } from "@/core/github/server/api/router";
import { knowledgeRouter } from "@/core/knowledge/server/api/router";
import { linearRouter } from "@/core/linear/server/api/router";
import { microsoftRouter } from "@/core/microsoft/server/api/router";
import { notionRouter } from "@/core/notion/server/api/router";
import { onboardingRouter } from "@/core/onboarding/server/api/router";
import { planeRouter } from "@/core/plane/server/api/router";
import { projectRouter } from "@/core/project/server/api/router";
// recruitmentRouter: legacy — no longer linked from the app UI, kept mounted
// only so its type-coupled client (@/core/recruitment/client/hooks.ts) and
// the standalone /apply/[token] page keep compiling and working.
import { recruitmentRouter } from "@/core/recruitment/server/api/router";
import { slackRouter } from "@/core/slack/server/api/router";
import { auth } from "./auth/auth";
import type { APIResponse } from "./common/responses";

const apiErrorLogger = getLogger(["server", "error"]);

const betterAuthPlugin = new Elysia({ name: "better-auth" }).mount(
    auth.handler,
);

// OpenAPI (Scalar UI at /api/v1/openapi) is dev-only.
const docs = new Elysia({ name: "docs" });
if (ServerConfig.isDevelopment) {
    docs.use(
        openapi({
            documentation: {
                info: {
                    title: ServerConfig.info.name,
                    version: ServerConfig.info.version,
                    description: ServerConfig.info.description,
                },
            },
            mapJsonSchema: { zod: z.toJSONSchema },
        }),
    );
}

const app = new Elysia({ prefix: "/api/v1" })
    .use(betterAuthPlugin)
    .use(
        cors({
            origin: [ServerConfig.baseUrl],
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization"],
        }),
    )
    .use(docs)
    .use(serverTiming())
    .use(elysiaLogger())
    .onError(({ error, code, set, request, path }) => {
        const isValidation = code === "VALIDATION";
        if (!isValidation) {
            apiErrorLogger.error(
                "Unhandled API error {code} on {method} {path}: {error}",
                {
                    code,
                    method: request.method,
                    path,
                    error:
                        error instanceof Error
                            ? (error.stack ?? error.message)
                            : String(error),
                },
            );
        }
        set.status = isValidation ? 400 : 500;
        return {
            code: isValidation ? "VALIDATION" : "INTERNAL_SERVER_ERROR",
            status: isValidation ? 400 : 500,
        } satisfies APIResponse;
    })
    .use(projectRouter)
    .use(knowledgeRouter)
    .use(notionRouter)
    .use(microsoftRouter)
    .use(slackRouter)
    .use(githubRouter)
    .use(linearRouter)
    .use(planeRouter)
    .use(documentReviewRouter)
    .use(recruitmentRouter)
    .use(onboardingRouter);

export default app;
export type AppRouter = typeof app;
