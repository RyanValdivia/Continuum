import { Elysia } from "elysia";
import { z } from "zod";
import { authed } from "@/server/auth/middleware/authed";
import {
    CommonResponse,
    errorResponseSchema,
    errorToResponse,
    successResponseSchema,
} from "@/server/common/responses";
import { disconnectSlackWorkspaceService } from "../../services/disconnect-slack-workspace-service";

export const disconnectSlackWorkspaceRoute = new Elysia().use(authed).delete(
    "/:organizationId/workspace",
    async ({ user, params, status }) => {
        const result = await disconnectSlackWorkspaceService(
            params.organizationId,
            user.id,
        );
        if (!result.ok)
            return status(
                result.error.status as 403 | 404 | 500,
                errorToResponse(result.error),
            );
        return status(
            200,
            CommonResponse.successful({ response: result.data }),
        );
    },
    {
        authed: true,
        params: z.object({ organizationId: z.string() }),
        response: {
            200: successResponseSchema(
                z.object({ id: z.string() }),
                "DisconnectSlackWorkspace",
            ),
            403: errorResponseSchema(403),
            404: errorResponseSchema(404),
            500: errorResponseSchema(500),
        },
        detail: {
            tags: ["Slack"],
            summary: "Uninstall the org's Slack bot (admin-only)",
        },
    },
);
