import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { organization } from "./organization-schema";

/**
 * One Plane workspace connection per organization. Plane (self-hosted or
 * plane.so) has no OAuth app model — orgs paste a personal/workspace API key
 * generated in Plane's settings, so there's no `refreshToken` and no callback
 * flow. `apiKey` is encrypted at rest (see `server/security/token-cipher.ts`)
 * — never select it into a wire response.
 */
export const planeConnection = pgTable(
    "plane_connection",
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
        // e.g. "https://api.plane.so" or a self-hosted instance's base URL.
        baseUrl: text("base_url").notNull(),
        workspaceSlug: text("workspace_slug").notNull(),
        apiKey: text("api_key").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        uniqueIndex("plane_connection_organization_id_idx").on(
            table.organizationId,
        ),
    ],
);

export type PlaneConnectionRow = typeof planeConnection.$inferSelect;
export type NewPlaneConnectionRow = typeof planeConnection.$inferInsert;
