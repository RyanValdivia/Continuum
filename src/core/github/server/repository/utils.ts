import type { GithubConnection } from "@/core/github/domain/types";
import type { GithubConnectionRow } from "@/server/drizzle/schemas/github-schema";

/** Convert a DB row into the wire shape — drops the encrypted tokens. */
export function toGithubConnection(row: GithubConnectionRow): GithubConnection {
    return {
        id: row.id,
        organizationId: row.organizationId,
        githubLogin: row.githubLogin,
        connectedByUserId: row.connectedByUserId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
