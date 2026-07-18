import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { notionConnection } from "@/server/drizzle/schemas/notion-schema";

export async function deleteNotionConnection(organizationId: string) {
    const [row] = await db
        .delete(notionConnection)
        .where(eq(notionConnection.organizationId, organizationId))
        .returning({ id: notionConnection.id });
    return row ?? null;
}
