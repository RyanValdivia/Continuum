import { drizzle } from "drizzle-orm/node-postgres";
import { ServerConfig } from "@/config/server-config";
import * as schema from "@/server/drizzle/schemas";

// Local docker postgres doesn't speak SSL; hosted providers (Supabase, Neon) require it.
const isLocalDatabase = /\/\/[^@]*@?(localhost|127\.0\.0\.1)/.test(
    ServerConfig.databaseURL,
);

export const db = drizzle({
    connection: {
        connectionString: ServerConfig.databaseURL,
        ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
    },
    schema,
    casing: "snake_case",
});
