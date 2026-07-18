import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type NewPrincipalRow,
    type PrincipalRow,
    principal,
} from "@/server/drizzle/schemas/authorization-schema";

export async function insertPrincipal(
    values: NewPrincipalRow,
): Promise<PrincipalRow> {
    const [row] = await db.insert(principal).values(values).returning();
    return row;
}
