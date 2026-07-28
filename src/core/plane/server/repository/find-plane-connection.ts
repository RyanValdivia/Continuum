import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { planeConnection } from "@/server/drizzle/schemas/plane-schema";

export async function findPlaneConnectionByOrg(organizationId: string) {
    const [row] = await db
        .select()
        .from(planeConnection)
        .where(eq(planeConnection.organizationId, organizationId))
        .limit(1);
    return row ?? null;
}
