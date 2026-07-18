import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import type { VacancyStatus } from "@/core/recruitment/domain/types";
import { db } from "@/server/drizzle/db";
import { knowledgeNodes } from "@/server/drizzle/schemas/knowledge-schema";
import { organization } from "@/server/drizzle/schemas/organization-schema";
import {
    candidate,
    type NewVacancyRow,
    vacancy,
    type VacancyRow,
} from "@/server/drizzle/schemas/recruitment-schema";

/**
 * Offboarding: the member's node becomes the vacancy in place. Insert when
 * the node doesn't exist yet; on conflict flip type + label only — the id,
 * edges, and every `personId` attribution elsewhere are deliberately left
 * untouched (the knowledge outlives the departure).
 */
export async function flipPersonNodeToVacancy(
    organizationId: string,
    memberId: string,
    title: string,
): Promise<void> {
    await db
        .insert(knowledgeNodes)
        .values({
            id: memberId,
            organizationId,
            type: "vacancy",
            label: title,
            origin: "manual",
        })
        .onConflictDoUpdate({
            target: knowledgeNodes.id,
            set: { type: "vacancy", label: title },
        });
}

/** Graph twin of a manual vacancy — vacancy id == node id. */
export async function insertVacancyNode(
    organizationId: string,
    id: string,
    title: string,
): Promise<void> {
    await db.insert(knowledgeNodes).values({
        id,
        organizationId,
        type: "vacancy",
        label: title,
        origin: "manual",
    });
}

export async function insertVacancy(row: NewVacancyRow): Promise<VacancyRow> {
    const [inserted] = await db.insert(vacancy).values(row).returning();
    return inserted;
}

export async function findVacancyById(
    organizationId: string,
    id: string,
): Promise<VacancyRow | null> {
    const [row] = await db
        .select()
        .from(vacancy)
        .where(
            and(eq(vacancy.organizationId, organizationId), eq(vacancy.id, id)),
        )
        .limit(1);
    return row ?? null;
}

/** Public-portal lookup — joins the org name for the landing copy. */
export async function findVacancyByToken(
    token: string,
): Promise<(VacancyRow & { organizationName: string }) | null> {
    const [row] = await db
        .select({ vacancy, organizationName: organization.name })
        .from(vacancy)
        .innerJoin(organization, eq(vacancy.organizationId, organization.id))
        .where(eq(vacancy.publicToken, token))
        .limit(1);
    return row
        ? { ...row.vacancy, organizationName: row.organizationName }
        : null;
}

export async function listVacancies(
    organizationId: string,
): Promise<(VacancyRow & { candidateCount: number })[]> {
    const rows = await db
        .select({
            vacancy,
            candidateCount: count(candidate.id),
        })
        .from(vacancy)
        .leftJoin(candidate, eq(candidate.vacancyId, vacancy.id))
        .where(eq(vacancy.organizationId, organizationId))
        .groupBy(vacancy.id)
        .orderBy(sql`${vacancy.createdAt} desc`);
    return rows.map((r) => ({
        ...r.vacancy,
        candidateCount: r.candidateCount,
    }));
}

export async function setVacancyStatus(
    organizationId: string,
    id: string,
    status: VacancyStatus,
): Promise<VacancyRow | null> {
    const [row] = await db
        .update(vacancy)
        .set({ status })
        .where(
            and(eq(vacancy.organizationId, organizationId), eq(vacancy.id, id)),
        )
        .returning();
    return row ?? null;
}

export async function setVacancyToken(
    organizationId: string,
    id: string,
    publicToken: string,
): Promise<VacancyRow | null> {
    const [row] = await db
        .update(vacancy)
        .set({ publicToken })
        .where(
            and(eq(vacancy.organizationId, organizationId), eq(vacancy.id, id)),
        )
        .returning();
    return row ?? null;
}

export async function countCandidates(vacancyId: string): Promise<number> {
    const [row] = await db
        .select({ value: count(candidate.id) })
        .from(candidate)
        .where(eq(candidate.vacancyId, vacancyId));
    return row?.value ?? 0;
}
