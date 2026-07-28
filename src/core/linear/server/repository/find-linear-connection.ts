import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { linearConnection } from "@/server/drizzle/schemas/linear-schema";

export async function findLinearConnectionByOrg(organizationId: string) {
    const [row] = await db
        .select()
        .from(linearConnection)
        .where(eq(linearConnection.organizationId, organizationId))
        .limit(1);
    return row ?? null;
}
