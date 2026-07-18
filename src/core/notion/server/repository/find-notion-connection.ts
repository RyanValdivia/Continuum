import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { notionConnection } from "@/server/drizzle/schemas/notion-schema";

export async function findNotionConnectionByOrg(organizationId: string) {
    const [row] = await db
        .select()
        .from(notionConnection)
        .where(eq(notionConnection.organizationId, organizationId))
        .limit(1);
    return row ?? null;
}
