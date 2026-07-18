import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type AnalysisRow,
    analysis,
    type NewAnalysisRow,
} from "@/server/drizzle/schemas/recruitment-schema";

export async function upsertAnalysis(
    row: NewAnalysisRow,
): Promise<AnalysisRow> {
    const [saved] = await db
        .insert(analysis)
        .values(row)
        .onConflictDoUpdate({
            target: analysis.candidateId,
            set: {
                score: row.score,
                dimensions: row.dimensions,
                summary: row.summary,
                interviewQuestions: row.interviewQuestions,
            },
        })
        .returning();
    return saved;
}
