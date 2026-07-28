import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { planeConnection } from "@/server/drizzle/schemas/plane-schema";

export async function deletePlaneConnection(organizationId: string) {
    const [row] = await db
        .delete(planeConnection)
        .where(eq(planeConnection.organizationId, organizationId))
        .returning({ id: planeConnection.id });
    return row ?? null;
}
