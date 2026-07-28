import "server-only";
import { db } from "@/server/drizzle/db";
import {
    githubConnection,
    type NewGithubConnectionRow,
} from "@/server/drizzle/schemas/github-schema";

export async function upsertGithubConnection(values: NewGithubConnectionRow) {
    const [row] = await db
        .insert(githubConnection)
        .values(values)
        .onConflictDoUpdate({
            target: githubConnection.organizationId,
            set: {
                connectedByUserId: values.connectedByUserId,
                githubUserId: values.githubUserId,
                githubLogin: values.githubLogin,
                accessToken: values.accessToken,
                refreshToken: values.refreshToken,
                updatedAt: new Date(),
            },
        })
        .returning();
    return row;
}
