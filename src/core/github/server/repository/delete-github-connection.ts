import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { githubConnection } from "@/server/drizzle/schemas/github-schema";

export async function deleteGithubConnection(organizationId: string) {
    const [row] = await db
        .delete(githubConnection)
        .where(eq(githubConnection.organizationId, organizationId))
        .returning({ id: githubConnection.id });
    return row ?? null;
}
