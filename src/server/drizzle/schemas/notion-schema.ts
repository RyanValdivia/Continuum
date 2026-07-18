import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { organization } from "./organization-schema";

/**
 * One Notion workspace connection per organization. `accessToken`/`refreshToken`
 * are encrypted at rest (see `server/security/token-cipher.ts`) — never select
 * them into a wire response.
 */
export const notionConnection = pgTable(
    "notion_connection",
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
        workspaceIcon: text("workspace_icon"),
        botId: text("bot_id").notNull(),
        accessToken: text("access_token").notNull(),
        refreshToken: text("refresh_token").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("notion_connection_organization_id_idx").on(
            table.organizationId,
        ),
    ],
);

export type NotionConnectionRow = typeof notionConnection.$inferSelect;
export type NewNotionConnectionRow = typeof notionConnection.$inferInsert;
