import { env } from "@/config/env";

export const ServerConfig = {
    databaseURL: env.DATABASE_URL,
    baseUrl: env.NEXT_PUBLIC_APP_URL,
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    googleApiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
    tokenEncryptionKey: env.TOKEN_ENCRYPTION_KEY ?? "",
    notion: {
        clientId: env.NOTION_CLIENT_ID,
        clientSecret: env.NOTION_CLIENT_SECRET,
        isConfigured: Boolean(
            env.NOTION_CLIENT_ID &&
                env.NOTION_CLIENT_SECRET &&
                env.TOKEN_ENCRYPTION_KEY,
        ),
    },
    microsoft: {
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        tenantId: env.MICROSOFT_TENANT_ID,
        isConfigured: Boolean(
            env.MICROSOFT_CLIENT_ID &&
                env.MICROSOFT_CLIENT_SECRET &&
                env.MICROSOFT_TENANT_ID &&
                env.TOKEN_ENCRYPTION_KEY,
        ),
    },
    slack: {
        clientId: env.SLACK_CLIENT_ID,
        clientSecret: env.SLACK_CLIENT_SECRET,
        signingSecret: env.SLACK_SIGNING_SECRET,
        // Personal "Sign in with Slack" linking — just needs the app credentials.
        isIdentityConfigured: Boolean(
            env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET,
        ),
        // Org-wide bot install (channel monitoring + Events API webhook) —
        // also needs the signing secret to verify incoming webhook requests.
        isWorkspaceConfigured: Boolean(
            env.SLACK_CLIENT_ID &&
                env.SLACK_CLIENT_SECRET &&
                env.SLACK_SIGNING_SECRET,
        ),
    },
    info: {
        name: "Hackaton Starter API",
        version: "1.0.0",
        description: "Hackaton Starter API",
    },
    /** Single sanctioned read of the Node built-in. */
    isProduction: process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
} as const;
