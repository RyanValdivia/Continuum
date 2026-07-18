import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { user } from "@/server/drizzle/schemas/auth-schema";
import {
    type KnowledgeNodeRow,
    knowledgeNodes,
} from "@/server/drizzle/schemas/knowledge-schema";
import { member } from "@/server/drizzle/schemas/organization-schema";

export interface OrgMemberRecord {
    memberId: string;
    name: string;
    email: string;
    role: string;
}

export async function findOrgMembers(
    organizationId: string,
): Promise<OrgMemberRecord[]> {
    return db
        .select({
            memberId: member.id,
            name: user.name,
            email: user.email,
            role: member.role,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(eq(member.organizationId, organizationId))
        .orderBy(user.name);
}

/** Structural nodes only (`person`/`vacancy`) — the people/vacancy surface. */
export async function findPeopleNodes(
    organizationId: string,
): Promise<KnowledgeNodeRow[]> {
    return db
        .select()
        .from(knowledgeNodes)
        .where(
            and(
                eq(knowledgeNodes.organizationId, organizationId),
                inArray(knowledgeNodes.type, ["person", "vacancy"]),
            ),
        );
}

/**
 * Sync: every org member gets a `person` node whose id is the member id.
 * Insert-only — an existing node (person OR already-flipped vacancy) is
 * never touched, so re-syncs are idempotent and safe after offboarding.
 */
export async function upsertPersonNodes(
    organizationId: string,
    members: { memberId: string; name: string }[],
): Promise<void> {
    if (members.length === 0) return;
    await db
        .insert(knowledgeNodes)
        .values(
            members.map((m) => ({
                id: m.memberId,
                organizationId,
                type: "person" as const,
                label: m.name,
                origin: "manual" as const,
            })),
        )
        .onConflictDoNothing({ target: knowledgeNodes.id });
}
