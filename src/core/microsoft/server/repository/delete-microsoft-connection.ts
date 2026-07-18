import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { microsoftConnection } from "@/server/drizzle/schemas/microsoft-schema";

export async function deleteMicrosoftConnection(
    organizationId: string,
): Promise<{ id: string } | null> {
    const [row] = await db
        .delete(microsoftConnection)
        .where(eq(microsoftConnection.organizationId, organizationId))
        .returning({ id: microsoftConnection.id });
    return row ?? null;
}
