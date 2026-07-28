import "server-only";
import { ServerConfig } from "@/config/server-config";
import type { GithubRepos } from "@/core/github/domain/types";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    GithubUnauthorizedError,
    listGithubRepos,
} from "@/server/github/github-api";
import { decryptSecret } from "@/server/security/token-cipher";
import { findGithubConnectionByOrg } from "../repository/find-github-connection";

export async function listGithubReposService(
    organizationId: string,
    userId: string,
): AsyncAppResult<GithubRepos> {
    if (!ServerConfig.github.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["github"] }));
    }

    const membership = await getOrgMembership(organizationId, userId);
    if (!membership) return err(AppErrors.forbidden());

    try {
        const connection = await findGithubConnectionByOrg(organizationId);
        if (!connection)
            return err(AppErrors.notFound({ targets: ["github"] }));

        try {
            const accessToken = decryptSecret(connection.accessToken);
            const items = await listGithubRepos(accessToken);
            return ok({
                items: items.map((r) => ({
                    id: r.id,
                    fullName: r.fullName,
                    name: r.name,
                    owner: r.owner,
                    private: r.private,
                    url: r.url,
                    description: r.description,
                })),
            });
        } catch (cause) {
            if (cause instanceof GithubUnauthorizedError) {
                // Classic OAuth App tokens don't expire — a 401 here means the
                // user revoked access on GitHub's side, not an expiry to refresh.
                return err(AppErrors.forbidden(cause));
            }
            throw cause;
        }
    } catch (cause) {
        return err(AppErrors.unexpected(cause));
    }
}
