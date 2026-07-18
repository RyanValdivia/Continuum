import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalRow,
    principal,
} from "@/server/drizzle/schemas/authorization-schema";

export async function findPrincipalById(
    organizationId: string,
    id: string,
): Promise<PrincipalRow | null> {
    const [row] = await db
        .select()
        .from(principal)
        .where(and(eq(principal.id, id), eq(principal.organizationId, organizationId)))
        .limit(1);
    return row ?? null;
}
