import { AppErrors, type AppResult, err, ok } from "@/server/common/responses";

/**
 * Every route resolves the caller's active organization from their session;
 * without one there is nothing to scope to → 403.
 */
export function requireActiveOrg(session: {
    activeOrganizationId?: string | null;
}): AppResult<string> {
    if (!session.activeOrganizationId) {
        return err(AppErrors.forbidden());
    }
    return ok(session.activeOrganizationId);
}
