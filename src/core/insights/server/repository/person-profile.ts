import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type {
    ProfileDocument,
    ProfileNodeInput,
} from "@/core/insights/domain/person-profile";
import { db } from "@/server/drizzle/db";
import { user } from "@/server/drizzle/schemas/auth-schema";
import {
    knowledgeNodes,
    sourceDocuments,
} from "@/server/drizzle/schemas/knowledge-schema";
import { member } from "@/server/drizzle/schemas/organization-schema";

const KNOW_HOW_TYPES = ["decision", "process", "concept"] as const;
const RECENT_DOCS_LIMIT = 12;

export interface ProfileMemberRecord {
    memberId: string;
    name: string;
    email: string;
    role: string;
}

export async function findOrgMemberById(
    organizationId: string,
    memberId: string,
): Promise<ProfileMemberRecord | null> {
    const [row] = await db
        .select({
            memberId: member.id,
            name: user.name,
            email: user.email,
            role: member.role,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(
            and(
                eq(member.organizationId, organizationId),
                eq(member.id, memberId),
            ),
        )
        .limit(1);
    return row ?? null;
}

/** Know-how nodes (decision/process/concept) attributed to the person, newest first. */
export async function findPersonNodes(
    organizationId: string,
    personId: string,
): Promise<ProfileNodeInput[]> {
    return db
        .select({
            type: knowledgeNodes.type,
            label: knowledgeNodes.label,
            summary: knowledgeNodes.summary,
        })
        .from(knowledgeNodes)
        .where(
            and(
                eq(knowledgeNodes.organizationId, organizationId),
                eq(knowledgeNodes.personId, personId),
                inArray(knowledgeNodes.type, KNOW_HOW_TYPES),
            ),
        )
        .orderBy(desc(knowledgeNodes.createdAt));
}

export async function findPersonDocuments(
    organizationId: string,
    personId: string,
): Promise<ProfileDocument[]> {
    return db
        .select({
            title: sourceDocuments.title,
            url: sourceDocuments.url,
        })
        .from(sourceDocuments)
        .where(
            and(
                eq(sourceDocuments.organizationId, organizationId),
                eq(sourceDocuments.personId, personId),
            ),
        )
        .orderBy(desc(sourceDocuments.createdAt))
        .limit(RECENT_DOCS_LIMIT);
}
