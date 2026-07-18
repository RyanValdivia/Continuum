import type {
    AccessControlEntry,
    Membership,
    OrganizationAccessPolicy,
    Principal,
} from "@/core/authorization/domain/types";
import type {
    AccessControlEntryRow,
    OrganizationAccessPolicyRow,
    PrincipalMembershipRow,
    PrincipalRow,
} from "@/server/drizzle/schemas/authorization-schema";

export function toPrincipal(row: PrincipalRow): Principal {
    return {
        id: row.id,
        organizationId: row.organizationId,
        type: row.type,
        name: row.name,
        description: row.description,
        userId: row.userId,
        parentId: row.parentId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toMembership(row: PrincipalMembershipRow): Membership {
    return {
        id: row.id,
        memberId: row.memberId,
        groupId: row.groupId,
        createdAt: row.createdAt.toISOString(),
    };
}

export function toAccessControlEntry(
    row: AccessControlEntryRow,
): AccessControlEntry {
    return {
        id: row.id,
        organizationId: row.organizationId,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        principalId: row.principalId,
        permission: row.permission,
        effect: row.effect,
        inheritable: row.inheritable,
        createdBy: row.createdBy,
        createdAt: row.createdAt.toISOString(),
    };
}

export function toOrgAccessPolicy(
    row: OrganizationAccessPolicyRow,
): OrganizationAccessPolicy {
    return { organizationId: row.organizationId, defaultAccess: row.defaultAccess };
}
