import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type MicrosoftConnectionRow,
    microsoftConnection,
} from "@/server/drizzle/schemas/microsoft-schema";

export async function findMicrosoftConnectionByOrg(
    organizationId: string,
): Promise<MicrosoftConnectionRow | null> {
    const [row] = await db
        .select()
        .from(microsoftConnection)
        .where(eq(microsoftConnection.organizationId, organizationId))
        .limit(1);
    return row ?? null;
}
