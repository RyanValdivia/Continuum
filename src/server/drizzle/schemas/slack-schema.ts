import {
    boolean,
    index,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { organization } from "./organization-schema";

/**
 * One personal Slack identity link per (organization, user) — each employee
 * connects their own Slack account (Sign in with Slack / OpenID Connect) so
 * messages ingested from Slack can be attributed to the right person. No
 * token is stored: the OpenID flow only resolves identity once, it's never
 * used to call further Slack APIs on the user's behalf.
 */
export const slackIdentity = pgTable(
    "slack_identity",
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
        slackUserId: text("slack_user_id").notNull(),
        slackTeamId: text("slack_team_id").notNull(),
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
        // One Slack link per person per org.
        uniqueIndex("slack_identity_org_user_idx").on(
            table.organizationId,
            table.userId,
        ),
        // The same Slack account can't be claimed by two different org members.
        uniqueIndex("slack_identity_org_slack_user_idx").on(
            table.organizationId,
            table.slackUserId,
        ),
    ],
);

export type SlackIdentityRow = typeof slackIdentity.$inferSelect;
export type NewSlackIdentityRow = typeof slackIdentity.$inferInsert;

/**
 * The org-wide Slack bot install (one per org) — separate from
 * `slackIdentity`, which is personal. `botToken` is encrypted at rest (see
 * `server/security/token-cipher.ts`) — never select it into a wire response.
 * Slack bot tokens don't expire, so unlike Notion there's no refresh token.
 */
export const slackConnection = pgTable(
    "slack_connection",
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
        teamId: text("team_id").notNull(),
        teamName: text("team_name").notNull(),
        botUserId: text("bot_user_id").notNull(),
        botToken: text("bot_token").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("slack_connection_organization_id_idx").on(
            table.organizationId,
        ),
    ],
);

export type SlackConnectionRow = typeof slackConnection.$inferSelect;
export type NewSlackConnectionRow = typeof slackConnection.$inferInsert;

/**
 * One row per Slack channel the org has looked at, public or private.
 * `isMonitored` is the admin's opt-in — the Events API webhook drops any
 * message from a channel that isn't monitored here, even if the bot
 * technically received the event.
 */
export const slackChannel = pgTable(
    "slack_channel",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organization.id, { onDelete: "cascade" }),
        slackChannelId: text("slack_channel_id").notNull(),
        name: text("name").notNull(),
        isPrivate: boolean("is_private").default(false).notNull(),
        isMonitored: boolean("is_monitored").default(false).notNull(),
        botIsMember: boolean("bot_is_member").default(false).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("slack_channel_org_channel_idx").on(
            table.organizationId,
            table.slackChannelId,
        ),
        index("slack_channel_org_monitored_idx").on(
            table.organizationId,
            table.isMonitored,
        ),
    ],
);

export type SlackChannelRow = typeof slackChannel.$inferSelect;
export type NewSlackChannelRow = typeof slackChannel.$inferInsert;
