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
        // Org-wide tenant connection (SharePoint/OneDrive/Teams ingestion) —
        // persists tokens, needs the encryption key.
        isConfigured: Boolean(
            env.MICROSOFT_CLIENT_ID &&
                env.MICROSOFT_CLIENT_SECRET &&
                env.MICROSOFT_TENANT_ID &&
                env.TOKEN_ENCRYPTION_KEY,
        ),
        // Personal "Sign in with Microsoft" linking — no token persisted, so
        // no encryption key needed. Same app credentials as the org-wide flow.
        isIdentityConfigured: Boolean(
            env.MICROSOFT_CLIENT_ID &&
                env.MICROSOFT_CLIENT_SECRET &&
                env.MICROSOFT_TENANT_ID,
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
    github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        isConfigured: Boolean(
            env.GITHUB_CLIENT_ID &&
                env.GITHUB_CLIENT_SECRET &&
                env.TOKEN_ENCRYPTION_KEY,
        ),
    },
    linear: {
        clientId: env.LINEAR_CLIENT_ID,
        clientSecret: env.LINEAR_CLIENT_SECRET,
        isConfigured: Boolean(
            env.LINEAR_CLIENT_ID &&
                env.LINEAR_CLIENT_SECRET &&
                env.TOKEN_ENCRYPTION_KEY,
        ),
    },
    plane: {
        // Self-hosted, token-based (no app registration) — each org pastes its
        // own workspace URL + API key, so this only needs the encryption key.
        isConfigured: Boolean(env.TOKEN_ENCRYPTION_KEY),
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
