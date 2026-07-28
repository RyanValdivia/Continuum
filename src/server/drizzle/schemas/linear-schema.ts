import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { organization } from "./organization-schema";

/**
 * One Linear workspace connection per organization. `accessToken`/`refreshToken`
 * are encrypted at rest (see `server/security/token-cipher.ts`) — never select
 * them into a wire response. `refreshToken` is nullable — Linear only issues
 * one for apps requesting `actor=app` tokens.
 */
export const linearConnection = pgTable(
    "linear_connection",
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
        workspaceId: text("workspace_id").notNull(),
        workspaceName: text("workspace_name").notNull(),
        accessToken: text("access_token").notNull(),
        refreshToken: text("refresh_token"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("linear_connection_organization_id_idx").on(
            table.organizationId,
        ),
    ],
);

export type LinearConnectionRow = typeof linearConnection.$inferSelect;
export type NewLinearConnectionRow = typeof linearConnection.$inferInsert;
