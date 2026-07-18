import type { z } from "zod";
import type {
    accessControlEntrySchema,
    accessTokenSchema,
    aclResourceTypeSchema,
    createPrincipalSchema,
    defaultAccessSchema,
    effectSchema,
    grantAccessSchema,
    membershipSchema,
    organizationAccessPolicySchema,
    permissionSchema,
    principalSchema,
    principalTypeSchema,
    setMembershipSchema,
    setOrgAccessPolicySchema,
    updatePrincipalSchema,
} from "./schemas";

export type PrincipalType = z.infer<typeof principalTypeSchema>;
export type AclResourceType = z.infer<typeof aclResourceTypeSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type DefaultAccess = z.infer<typeof defaultAccessSchema>;
export type Principal = z.infer<typeof principalSchema>;
export type CreatePrincipal = z.infer<typeof createPrincipalSchema>;
export type UpdatePrincipal = z.infer<typeof updatePrincipalSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type SetMembership = z.infer<typeof setMembershipSchema>;
export type AccessControlEntry = z.infer<typeof accessControlEntrySchema>;
export type GrantAccess = z.infer<typeof grantAccessSchema>;
export type AccessToken = z.infer<typeof accessTokenSchema>;
export type OrganizationAccessPolicy = z.infer<
    typeof organizationAccessPolicySchema
>;
export type SetOrgAccessPolicy = z.infer<typeof setOrgAccessPolicySchema>;
