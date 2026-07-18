import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getLogger } from "@logtape/logtape";
import { APIError, betterAuth } from "better-auth";
import { openAPI, organization } from "better-auth/plugins";
import { headers } from "next/headers";
import { cache } from "react";
import { ServerConfig } from "@/config/server-config";
import { provisionPersonPrincipal } from "@/core/authorization/server/repository/provision-person-principal";
import { db } from "@/server/drizzle/db";
import * as authSchema from "@/server/drizzle/schemas/auth-schema";
import * as organizationSchema from "@/server/drizzle/schemas/organization-schema";

const logger = getLogger(["server", "auth"]);

export const auth = betterAuth({
    baseURL: ServerConfig.baseUrl,
    basePath: "/api/v1/auth",
    secret: ServerConfig.betterAuthSecret,
    session: { freshAge: 0 },
    emailAndPassword: {
        enabled: true,
        // Starter keeps verification off so sign-up works with no email provider.
        requireEmailVerification: false,
    },
    databaseHooks: {
        user: {
            create: {
                // No email provider to actually verify against, so treat every
                // sign-up as verified. Without this, `emailVerified` stays
                // false forever and the organization plugin's
                // `listUserInvitations` (which requires a verified session
                // email) 403s for every user.
                before: async (user) => ({
                    data: { ...user, emailVerified: true },
                }),
            },
        },
    },
    plugins: [
        openAPI({ disableDefaultReference: !ServerConfig.isDevelopment }),
        organization({
            // No email provider wired up yet — log the invite link instead.
            async sendInvitationEmail(data) {
                const inviteLink = `${ServerConfig.baseUrl}/accept-invitation/${data.id}`;
                logger.info("Organization invitation for {email}: {link}", {
                    email: data.email,
                    link: inviteLink,
                });
            },
            organizationHooks: {
                // Every path that creates a `member` row (org creation, an
                // admin adding someone directly, invitation acceptance) needs
                // a matching `person` principal before that user's first
                // authorization check — see provisionPersonPrincipal's doc.
                async afterAddMember({ member, user }) {
                    await provisionPersonPrincipal({
                        organizationId: member.organizationId,
                        userId: user.id,
                        name: user.name,
                    });
                },
                async afterAcceptInvitation({ member, user }) {
                    await provisionPersonPrincipal({
                        organizationId: member.organizationId,
                        userId: user.id,
                        name: user.name,
                    });
                },
            },
        }),
    ],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: { ...authSchema, ...organizationSchema },
    }),
});

/**
 * React cache()-wrapped session read for server components / guards.
 * Swallows errors → null so callers can treat it as a null-tolerant read.
 */
export const authenticate = cache(async () => {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        return session
            ? { user: session.user, session: session.session }
            : null;
    } catch (e) {
        if (e instanceof APIError) {
            logger.warn("Auth API error: {error}", { error: e });
            return null;
        }
        logger.error("Authentication error: {error}", { error: e });
        return null;
    }
});
