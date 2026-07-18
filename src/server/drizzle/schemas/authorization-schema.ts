import { sql } from "drizzle-orm";
import {
    type AnyPgColumn,
    boolean,
    check,
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { organization } from "./organization-schema";

export const principalType = pgEnum("principal_type", [
    "person",
    "group",
    "ou",
]);
export const aclResourceType = pgEnum("acl_resource_type", [
    "knowledge_node",
    "source_document",
    "ou",
]);
export const aclPermission = pgEnum("acl_permission", [
    "read",
    "write",
    "admin",
]);
export const aclEffect = pgEnum("acl_effect", ["allow", "deny"]);
export const defaultAccess = pgEnum("default_access", ["open", "closed"]);

/**
 * Unified security-principal table (AD's SID). A `person` is the bridge from a
 * Better Auth `user` to the authorization graph — one per (org, user), created
 * automatically when a `member` row is created (see the auto-provision hook).
 * A `group` is a nestable security group; an `ou` is a container in the org's
 * tree. `parentId` is every principal's single home container — mirrors AD's
 * "an object lives in exactly one container" rule, and is what OU-ancestry
 * walks climb.
 */
export const principal = pgTable(
    "principal",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        type: principalType("type").notNull(),
        name: text("name").notNull(),
        description: text("description"),
        userId: text("user_id").references(() => user.id, {
            onDelete: "cascade",
        }),
        parentId: text("parent_id").references(
            (): AnyPgColumn => principal.id,
            { onDelete: "cascade" },
        ),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("principal_organization_id_idx").on(table.organizationId),
        index("principal_organization_id_type_idx").on(
            table.organizationId,
            table.type,
        ),
        index("principal_parent_id_idx").on(table.parentId),
        // One person-principal per (org, user) — partial so group/ou rows
        // (userId null) never collide.
        uniqueIndex("principal_organization_id_user_id_uq")
            .on(table.organizationId, table.userId)
            .where(sql`${table.userId} is not null`),
        check("principal_name_not_empty", sql`length(trim(${table.name})) > 0`),
    ],
);

/**
 * Group membership, supports nesting: `memberId` may itself be a `group`
 * principal, so a group-in-a-group resolves transitively in
 * `resolve-token-principals.ts`'s recursive walk.
 */
export const principalMembership = pgTable(
    "principal_membership",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        memberId: text("member_id")
            .notNull()
            .references(() => principal.id, { onDelete: "cascade" }),
        groupId: text("group_id")
            .notNull()
            .references(() => principal.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("principal_membership_member_group_uq").on(
            table.memberId,
            table.groupId,
        ),
        index("principal_membership_member_id_idx").on(table.memberId),
        index("principal_membership_group_id_idx").on(table.groupId),
    ],
);

/**
 * The DACL. `resourceId` deliberately isn't an FK — one column can't reference
 * `knowledge_nodes`, `source_documents`, and `principal` (for `ou` resources)
 * at once, same reasoning as `sourceDocuments.personId`. Deny wins over allow;
 * see `buildAccessPredicate` in the authorization domain's services.
 */
export const accessControlEntry = pgTable(
    "access_control_entry",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        resourceType: aclResourceType("resource_type").notNull(),
        resourceId: text("resource_id").notNull(),
        principalId: text("principal_id")
            .notNull()
            .references(() => principal.id, { onDelete: "cascade" }),
        permission: aclPermission("permission").notNull(),
        effect: aclEffect("effect").notNull(),
        inheritable: boolean("inheritable").notNull().default(true),
        createdBy: text("created_by").references(() => user.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("access_control_entry_resource_idx").on(
            table.organizationId,
            table.resourceType,
            table.resourceId,
        ),
        index("access_control_entry_principal_id_idx").on(table.principalId),
        uniqueIndex("access_control_entry_unique_grant").on(
            table.resourceType,
            table.resourceId,
            table.principalId,
            table.permission,
            table.effect,
        ),
    ],
);

/**
 * Per-org fail-open/fail-closed switch. `"open"` (the default) means a
 * resource with zero ACEs is readable by every member — required so existing
 * data doesn't vanish the moment this system ships. Only flip an org to
 * `"closed"` once its ACEs actually cover what it holds.
 */
export const organizationAccessPolicy = pgTable("organization_access_policy", {
    organizationId: text("organization_id")
        .primaryKey()
        .references(() => organization.id, { onDelete: "cascade" }),
    defaultAccess: defaultAccess("default_access").notNull().default("open"),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export type PrincipalRow = typeof principal.$inferSelect;
export type NewPrincipalRow = typeof principal.$inferInsert;
export type PrincipalMembershipRow = typeof principalMembership.$inferSelect;
export type NewPrincipalMembershipRow = typeof principalMembership.$inferInsert;
export type AccessControlEntryRow = typeof accessControlEntry.$inferSelect;
export type NewAccessControlEntryRow = typeof accessControlEntry.$inferInsert;
export type OrganizationAccessPolicyRow =
    typeof organizationAccessPolicy.$inferSelect;
export type NewOrganizationAccessPolicyRow =
    typeof organizationAccessPolicy.$inferInsert;
