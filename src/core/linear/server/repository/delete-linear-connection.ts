import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { linearConnection } from "@/server/drizzle/schemas/linear-schema";

export async function deleteLinearConnection(organizationId: string) {
    const [row] = await db
        .delete(linearConnection)
        .where(eq(linearConnection.organizationId, organizationId))
        .returning({ id: linearConnection.id });
    return row ?? null;
}
