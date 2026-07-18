import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalRow,
    principal,
} from "@/server/drizzle/schemas/authorization-schema";

export async function updatePrincipal(
    organizationId: string,
    id: string,
    patch: { name?: string; description?: string | null; parentId?: string | null },
): Promise<PrincipalRow | null> {
    const [row] = await db
        .update(principal)
        .set(patch)
        .where(and(eq(principal.id, id), eq(principal.organizationId, organizationId)))
        .returning();
    return row ?? null;
}
