import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type PrincipalRow,
    principal,
} from "@/server/drizzle/schemas/authorization-schema";
import { findPrincipalByUser } from "./find-principal-by-user";

/**
 * Idempotent: called from Better Auth's `afterAddMember`/`afterAcceptInvitation`
 * organization hooks every time a `member` row is created, so a `person`
 * principal always exists before that user's first authorization check.
 * `onConflictDoNothing` (against the `principal_organization_id_user_id_uq`
 * partial index) makes a duplicate call — retries, both hooks somehow firing
 * for the same event — a safe no-op instead of a unique-violation crash.
 */
export async function provisionPersonPrincipal(params: {
    organizationId: string;
    userId: string;
    name: string;
}): Promise<PrincipalRow> {
    const [inserted] = await db
        .insert(principal)
        .values({
            organizationId: params.organizationId,
            type: "person",
            name: params.name,
            userId: params.userId,
        })
        .onConflictDoNothing()
        .returning();
    if (inserted) return inserted;

    const existing = await findPrincipalByUser(params.organizationId, params.userId);
    if (!existing) {
        throw new Error(
            "provisionPersonPrincipal: insert conflicted but no existing row was found",
        );
    }
    return existing;
}
