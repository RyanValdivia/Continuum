import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z.url(),
        BETTER_AUTH_SECRET: z.string().min(32),
        // Optional: the Notion integration is disabled (routes return a
        // config error) until all three of these are set.
        NOTION_CLIENT_ID: z.string().optional(),
        NOTION_CLIENT_SECRET: z.string().optional(),
        TOKEN_ENCRYPTION_KEY: z.string().optional(),
    },
    client: {
        NEXT_PUBLIC_APP_URL: z.url(),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        NOTION_CLIENT_ID: process.env.NOTION_CLIENT_ID,
        NOTION_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET,
        TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    emptyStringAsUndefined: true,
});
