import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import {
    type CandidateRow,
    candidate,
    type NewCandidateRow,
} from "@/server/drizzle/schemas/recruitment-schema";

export async function insertCandidate(
    row: NewCandidateRow,
): Promise<CandidateRow> {
    const [inserted] = await db.insert(candidate).values(row).returning();
    return inserted;
}

export async function findCandidateByEmail(
    vacancyId: string,
    email: string,
): Promise<CandidateRow | null> {
    const [row] = await db
        .select()
        .from(candidate)
        .where(
            and(eq(candidate.vacancyId, vacancyId), eq(candidate.email, email)),
        )
        .limit(1);
    return row ?? null;
}
