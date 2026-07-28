import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { githubConnection } from "@/server/drizzle/schemas/github-schema";

export async function findGithubConnectionByOrg(organizationId: string) {
    const [row] = await db
        .select()
        .from(githubConnection)
        .where(eq(githubConnection.organizationId, organizationId))
        .limit(1);
    return row ?? null;
}
