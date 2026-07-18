import "server-only";
import { getOrgAccessPolicy } from "./get-org-access-policy";
import { resolveTokenPrincipals } from "./resolve-token-principals";

export interface AccessScope {
    accessToken: string[];
    defaultAccess: "open" | "closed";
}

/** The two pieces every ACL-aware read needs, resolved together — every
 *  consuming service calls this once and threads the result down into its
 *  repository query via `buildAccessPredicate`. */
export async function resolveAccessScope(
    organizationId: string,
    userId: string,
): Promise<AccessScope> {
    const [accessToken, defaultAccess] = await Promise.all([
        resolveTokenPrincipals({ organizationId, userId }),
        getOrgAccessPolicy(organizationId),
    ]);
    return { accessToken, defaultAccess };
}
