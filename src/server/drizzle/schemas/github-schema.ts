import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { organization } from "./organization-schema";

/**
 * One GitHub OAuth App connection per organization. `accessToken` is
 * encrypted at rest (see `server/security/token-cipher.ts`) — never select it
 * into a wire response. GitHub's classic OAuth App tokens don't expire, so
 * `refreshToken` is nullable and only populated when the app has token
 * expiration enabled.
 */
export const githubConnection = pgTable(
    "github_connection",
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
        githubUserId: text("github_user_id").notNull(),
        githubLogin: text("github_login").notNull(),
        accessToken: text("access_token").notNull(),
        refreshToken: text("refresh_token"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("github_connection_organization_id_idx").on(
            table.organizationId,
        ),
    ],
);

export type GithubConnectionRow = typeof githubConnection.$inferSelect;
export type NewGithubConnectionRow = typeof githubConnection.$inferInsert;
