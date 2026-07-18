import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { organization } from "./organization-schema";

/**
 * One Microsoft 365 tenant connection per organization.
 * `accessToken`/`refreshToken` are encrypted at rest (see
 * `server/common/token-cipher.ts`) — never select them into a wire response.
 */
export const microsoftConnection = pgTable(
    "microsoft_connection",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        connectedByUserId: text("connected_by_user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        tenantId: text("tenant_id").notNull(),
        accessToken: text("access_token").notNull(),
        refreshToken: text("refresh_token").notNull(),
        tokenExpiresAt: timestamp("token_expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("microsoft_connection_organization_id_idx").on(
            table.organizationId,
        ),
    ],
);

export type MicrosoftConnectionRow = typeof microsoftConnection.$inferSelect;
export type NewMicrosoftConnectionRow = typeof microsoftConnection.$inferInsert;

/**
 * One personal Microsoft identity link per (organization, user) — each
 * employee connects their own Microsoft account (Sign in with Microsoft /
 * OpenID Connect) so Teams messages ingested via the org's tenant connection
 * can be attributed to the right person. No token is stored: the flow only
 * resolves identity once, mirroring `slackIdentity`.
 */
export const microsoftIdentity = pgTable(
    "microsoft_identity",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        microsoftUserId: text("microsoft_user_id").notNull(),
        email: text("email"),
        displayName: text("display_name"),
        avatarUrl: text("avatar_url"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        // One Microsoft link per person per org.
        uniqueIndex("microsoft_identity_org_user_idx").on(
            table.organizationId,
            table.userId,
        ),
        // The same Microsoft account can't be claimed by two different org members.
        uniqueIndex("microsoft_identity_org_ms_user_idx").on(
            table.organizationId,
            table.microsoftUserId,
        ),
    ],
);

export type MicrosoftIdentityRow = typeof microsoftIdentity.$inferSelect;
export type NewMicrosoftIdentityRow = typeof microsoftIdentity.$inferInsert;
