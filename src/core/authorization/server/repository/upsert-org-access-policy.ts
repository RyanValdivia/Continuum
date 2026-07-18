import "server-only";
import { db } from "@/server/drizzle/db";
import {
    type OrganizationAccessPolicyRow,
    organizationAccessPolicy,
} from "@/server/drizzle/schemas/authorization-schema";

export async function upsertOrgAccessPolicy(params: {
    organizationId: string;
    defaultAccess: "open" | "closed";
}): Promise<OrganizationAccessPolicyRow> {
    const [row] = await db
        .insert(organizationAccessPolicy)
        .values(params)
        .onConflictDoUpdate({
            target: organizationAccessPolicy.organizationId,
            set: { defaultAccess: params.defaultAccess, updatedAt: new Date() },
        })
        .returning();
    return row;
}
