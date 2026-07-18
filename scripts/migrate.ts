import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Local docker postgres doesn't speak SSL; hosted providers (Supabase, Neon) require it.
const isLocalDatabase = /\/\/[^@]*@?(localhost|127\.0\.0\.1)/.test(
    process.env.DATABASE_URL ?? "",
);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
await pool.end();

console.log("migrations applied");
