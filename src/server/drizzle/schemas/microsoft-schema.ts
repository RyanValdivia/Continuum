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
