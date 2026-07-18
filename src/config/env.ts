import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    server: {
        DATABASE_URL: z.url(),
        BETTER_AUTH_SECRET: z.string().min(32),
        // Gemini API key — powers embeddings + graph extraction. The AI SDK
        // google provider also reads this env name by default.
        GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
        // Optional: the Notion integration is disabled (routes return a
        // config error) until all three of these are set.
        NOTION_CLIENT_ID: z.string().optional(),
        NOTION_CLIENT_SECRET: z.string().optional(),
        // Optional: the Microsoft 365 integration is disabled (routes return a
        // config error) until all three of these are set. TENANT_ID may be a
        // tenant GUID or "common"/"organizations" for multi-tenant apps.
        MICROSOFT_CLIENT_ID: z.string().optional(),
        MICROSOFT_CLIENT_SECRET: z.string().optional(),
        MICROSOFT_TENANT_ID: z.string().optional(),
        TOKEN_ENCRYPTION_KEY: z.string().optional(),
    },
    client: {
        NEXT_PUBLIC_APP_URL: z.url(),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        NOTION_CLIENT_ID: process.env.NOTION_CLIENT_ID,
        NOTION_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET,
        MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
        MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
        MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID,
        TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    emptyStringAsUndefined: true,
});
