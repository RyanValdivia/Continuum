import "server-only";
import { ServerConfig } from "@/config/server-config";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import {
    teamsChannelExternalId,
    teamsUserExternalId,
    truncateContent,
} from "@/core/microsoft/domain/source-plan";
import {
    groupMessagesByAuthor,
    renderTranscript,
} from "@/core/microsoft/domain/transcript";
import type {
    IngestMicrosoftTeams,
    MicrosoftIngestResult,
} from "@/core/microsoft/domain/types";
import {
    getOrgMembership,
    ORG_ADMIN_ROLES,
} from "@/server/auth/get-org-membership";
import {
    AppErrors,
    type AsyncAppResult,
    err,
    ok,
} from "@/server/common/responses";
import {
    listChannelMessages,
    listChannels,
    listJoinedTeams,
    MicrosoftUnauthorizedError,
    resolveAuthorEmails,
} from "@/server/microsoft/graph-api";
import { resolveMicrosoftAccessToken } from "./resolve-microsoft-access-token";

/** Below this, a per-author doc carries too little signal to be worth a doc. */
const MIN_AUTHOR_MESSAGES = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type IngestItem = MicrosoftIngestResult["items"][number];

function failedItem(
    externalId: string,
    title: string,
    error: string,
): IngestItem {
    return {
        externalId,
        title,
        ok: false,
        chunksCreated: 0,
        nodesCreated: 0,
        error,
    };
}

/**
 * Pull Teams channel conversations into the knowledge graph, at two levels:
 * one transcript doc per channel (full conversational context for decision
 * extraction) plus one doc per active author (enables person-scoped
 * retrieval). One channel's failure never aborts the batch.
 */
export async function ingestMicrosoftTeamsChannelsService(
    organizationId: string,
    userId: string,
    input: IngestMicrosoftTeams,
): AsyncAppResult<MicrosoftIngestResult> {
    if (!ServerConfig.microsoft.isConfigured) {
        return err(AppErrors.unprocessableEntity({ targets: ["microsoft"] }));
    }
    const membership = await getOrgMembership(organizationId, userId);
    if (!membership || !ORG_ADMIN_ROLES.has(membership.role)) {
        return err(AppErrors.forbidden());
    }

    try {
        const token = await resolveMicrosoftAccessToken(organizationId);
        if (!token.ok) return err(token.error);
        const accessToken = token.data;

        const since =
            input.sinceDays > 0
                ? new Date(Date.now() - input.sinceDays * DAY_MS)
                : undefined;

        // Display names for document titles.
        const teams = await listJoinedTeams(accessToken);
        const teamName = new Map(teams.map((t) => [t.id, t.displayName]));
        const channelNameByTeam = new Map<string, Map<string, string>>();
        for (const teamId of new Set(input.channels.map((c) => c.teamId))) {
            const channels = await listChannels(accessToken, teamId);
            channelNameByTeam.set(
                teamId,
                new Map(channels.map((c) => [c.id, c.displayName])),
            );
        }

        const items: IngestItem[] = [];
        for (const { teamId, channelId } of input.channels) {
            const channelName =
                channelNameByTeam.get(teamId)?.get(channelId) ?? channelId;
            const title = `Teams: ${teamName.get(teamId) ?? teamId} / #${channelName}`;
            const channelExternalId = teamsChannelExternalId(
                teamId,
                channelId,
                input.sinceDays,
            );

            try {
                const messages = await listChannelMessages(
                    accessToken,
                    teamId,
                    channelId,
                    since,
                );
                if (messages.length === 0) {
                    items.push(
                        failedItem(
                            channelExternalId,
                            title,
                            "Sin mensajes en la ventana elegida",
                        ),
                    );
                    continue;
                }

                const authorIds = [
                    ...new Set(
                        messages
                            .map((m) => m.authorId)
                            .filter((id): id is string => id !== null),
                    ),
                ];
                const emails = await resolveAuthorEmails(
                    accessToken,
                    authorIds,
                );

                const channelResult = await ingestDocumentService(
                    organizationId,
                    {
                        connector: "microsoft",
                        externalId: channelExternalId,
                        title,
                        content: truncateContent(
                            renderTranscript(messages, emails),
                        ),
                        extract: true,
                    },
                );
                if (!channelResult.ok) {
                    items.push(
                        failedItem(
                            channelExternalId,
                            title,
                            channelResult.error.code,
                        ),
                    );
                    continue;
                }
                items.push({
                    externalId: channelExternalId,
                    title,
                    ok: true,
                    chunksCreated: channelResult.data.chunksCreated,
                    nodesCreated: channelResult.data.nodesCreated,
                    error: null,
                });

                for (const group of groupMessagesByAuthor(
                    messages,
                    MIN_AUTHOR_MESSAGES,
                )) {
                    const email = group.authorId
                        ? emails.get(group.authorId)
                        : null;
                    const authorKey = email ?? group.authorName;
                    const userExternalId = teamsUserExternalId(
                        teamId,
                        channelId,
                        input.sinceDays,
                        authorKey,
                    );
                    const userTitle = `${group.authorName} en #${channelName}`;
                    try {
                        const userResult = await ingestDocumentService(
                            organizationId,
                            {
                                connector: "microsoft",
                                externalId: userExternalId,
                                title: userTitle,
                                content: truncateContent(
                                    renderTranscript(group.messages, emails),
                                ),
                                personId: authorKey,
                                extract: true,
                            },
                        );
                        if (!userResult.ok) {
                            items.push(
                                failedItem(
                                    userExternalId,
                                    userTitle,
                                    userResult.error.code,
                                ),
                            );
                            continue;
                        }
                        items.push({
                            externalId: userExternalId,
                            title: userTitle,
                            ok: true,
                            chunksCreated: userResult.data.chunksCreated,
                            nodesCreated: userResult.data.nodesCreated,
                            error: null,
                        });
                    } catch (cause) {
                        items.push(
                            failedItem(
                                userExternalId,
                                userTitle,
                                cause instanceof Error
                                    ? cause.message
                                    : "unknown",
                            ),
                        );
                    }
                }
            } catch (cause) {
                items.push(
                    failedItem(
                        channelExternalId,
                        title,
                        cause instanceof Error ? cause.message : "unknown",
                    ),
                );
            }
        }

        const ingested = items.filter((i) => i.ok).length;
        return ok({ ingested, failed: items.length - ingested, items });
    } catch (cause) {
        if (cause instanceof MicrosoftUnauthorizedError) {
            return err(AppErrors.unauthorized(cause));
        }
        return err(AppErrors.unexpected(cause));
    }
}
