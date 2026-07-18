import "server-only";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import { findMicrosoftConnectionByOrg } from "../repository/find-microsoft-connection";
import { getValidAccessToken } from "./get-valid-access-token";

/**
 * Shared preflight for every service that talks to Graph: the org must be
 * connected (404) and the token must decrypt/refresh (401 → reconnect).
 */
export async function resolveMicrosoftAccessToken(
    organizationId: string,
): AsyncAppResult<string> {
    const connection = await findMicrosoftConnectionByOrg(organizationId);
    if (!connection) {
        return err(AppErrors.notFound({ targets: ["microsoft"] }));
    }
    try {
        return ok(await getValidAccessToken(connection));
    } catch (cause) {
        return err(AppErrors.unauthorized(cause));
    }
}
