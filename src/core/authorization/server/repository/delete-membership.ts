import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { principalMembership } from "@/server/drizzle/schemas/authorization-schema";

export async function deleteMembership(params: {
    memberId: string;
    groupId: string;
}): Promise<void> {
    await db
        .delete(principalMembership)
        .where(
            and(
                eq(principalMembership.memberId, params.memberId),
                eq(principalMembership.groupId, params.groupId),
            ),
        );
}
