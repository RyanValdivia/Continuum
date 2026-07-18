import { beforeEach, describe, expect, it, vi } from "vitest";

const configState = vi.hoisted(() => ({ microsoftConfigured: true }));

vi.mock("@/config/server-config", () => ({
    ServerConfig: {
        baseUrl: "http://localhost:3000",
        betterAuthSecret: "test-secret-least-thirty-two-chars-long",
        tokenEncryptionKey: "Isnyla5i0RU0s/sMerKmcoHm8pdPn9tiuemcXpCWKsU=",
        get microsoft() {
            return {
                clientId: "cid",
                clientSecret: "secret",
                tenantId: "tenant-1",
                isConfigured: configState.microsoftConfigured,
            };
        },
    },
}));

vi.mock("@/server/auth/get-org-membership", async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import("@/server/auth/get-org-membership")
        >();
    return { ...actual, getOrgMembership: vi.fn() };
});

vi.mock("../../repository/find-microsoft-connection", () => ({
    findMicrosoftConnectionByOrg: vi.fn(),
}));
vi.mock("../../repository/upsert-microsoft-connection", () => ({
    upsertMicrosoftConnection: vi.fn(),
}));
vi.mock("../../repository/delete-microsoft-connection", () => ({
    deleteMicrosoftConnection: vi.fn(),
}));
vi.mock("../../repository/find-org-slug", () => ({
    findOrgSlug: vi.fn(),
}));

vi.mock("@/server/microsoft/graph-api", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@/server/microsoft/graph-api")>();
    return {
        ...actual,
        exchangeMicrosoftCode: vi.fn(),
        refreshMicrosoftToken: vi.fn(),
        listSitesWithDrives: vi.fn(),
        listDriveItems: vi.fn(),
        getDriveItem: vi.fn(),
        downloadDriveItemText: vi.fn(),
        downloadDriveItemPdf: vi.fn(),
        listJoinedTeams: vi.fn(),
        listChannels: vi.fn(),
        listChannelMessages: vi.fn(),
        resolveAuthorEmails: vi.fn(),
    };
});

vi.mock("@/server/microsoft/pdf-text", () => ({ extractPdfText: vi.fn() }));

vi.mock("@/core/knowledge/server/services/ingest-document-service", () => ({
    ingestDocumentService: vi.fn(),
}));
vi.mock("../resolve-microsoft-author", () => ({
    resolveMicrosoftAuthor: vi.fn(),
}));

import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import { getOrgMembership } from "@/server/auth/get-org-membership";
import { createOAuthState } from "@/server/security/oauth-state";
import { encryptSecret } from "@/server/security/token-cipher";
import {
    downloadDriveItemPdf,
    downloadDriveItemText,
    exchangeMicrosoftCode,
    getDriveItem,
    listChannelMessages,
    listChannels,
    listDriveItems,
    listJoinedTeams,
    listSitesWithDrives,
    refreshMicrosoftToken,
    resolveAuthorEmails,
} from "@/server/microsoft/graph-api";
import { extractPdfText } from "@/server/microsoft/pdf-text";
import { deleteMicrosoftConnection } from "../../repository/delete-microsoft-connection";
import { findMicrosoftConnectionByOrg } from "../../repository/find-microsoft-connection";
import { findOrgSlug } from "../../repository/find-org-slug";
import { upsertMicrosoftConnection } from "../../repository/upsert-microsoft-connection";
import { disconnectMicrosoftService } from "../disconnect-microsoft-service";
import { getMicrosoftConnectUrlService } from "../get-microsoft-connect-url-service";
import { getMicrosoftStatusService } from "../get-microsoft-status-service";
import { handleMicrosoftCallbackService } from "../handle-microsoft-callback-service";
import { ingestMicrosoftFilesService } from "../ingest-files-service";
import { ingestMicrosoftTeamsChannelsService } from "../ingest-teams-channels-service";
import { listMicrosoftChannelsService } from "../list-channels-service";
import { listMicrosoftDriveItemsService } from "../list-drive-items-service";
import { listMicrosoftSitesService } from "../list-sites-service";
import { listMicrosoftTeamsService } from "../list-teams-service";
import { resolveMicrosoftAuthor } from "../resolve-microsoft-author";

const connRow = (overrides: Record<string, unknown> = {}) => ({
    id: "conn1",
    organizationId: "org1",
    connectedByUserId: "admin1",
    tenantId: "tenant-1",
    accessToken: encryptSecret("at"),
    refreshToken: encryptSecret("rt"),
    tokenExpiresAt: new Date(Date.now() + 3_600_000),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    configState.microsoftConfigured = true;
    vi.mocked(getOrgMembership).mockResolvedValue({
        role: "admin",
    } as never);
});

// ── connect url ───────────────────────────────────────────────────────────────

describe("getMicrosoftConnectUrlService", () => {
    it("builds the Entra authorize URL with scopes and signed state", async () => {
        const r = await getMicrosoftConnectUrlService("org1", "admin1");
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const url = new URL(r.data);
        expect(url.origin + url.pathname).toBe(
            "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/authorize",
        );
        expect(url.searchParams.get("client_id")).toBe("cid");
        expect(url.searchParams.get("redirect_uri")).toBe(
            "http://localhost:3000/api/v1/microsoft/callback",
        );
        expect(url.searchParams.get("response_type")).toBe("code");
        expect(url.searchParams.get("scope")).toContain("offline_access");
        expect(url.searchParams.get("scope")).toContain(
            "ChannelMessage.Read.All",
        );
        expect(url.searchParams.get("state")).toBeTruthy();
    });

    it("returns 403 for non-admins and 422 when unconfigured", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue({
            role: "member",
        } as never);
        let r = await getMicrosoftConnectUrlService("org1", "u1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");

        configState.microsoftConfigured = false;
        r = await getMicrosoftConnectUrlService("org1", "admin1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("UNPROCESSABLE_ENTITY");
    });
});

// ── callback ──────────────────────────────────────────────────────────────────

describe("handleMicrosoftCallbackService", () => {
    it("rejects an invalid state", async () => {
        const r = await handleMicrosoftCallbackService({
            code: "c",
            state: "garbage",
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
    });

    it("returns the org slug without connecting when the user cancelled", async () => {
        vi.mocked(findOrgSlug).mockResolvedValue("acme");
        const state = createOAuthState("org1", "admin1");
        const r = await handleMicrosoftCallbackService({
            state,
            oauthError: "access_denied",
        });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.data.organizationSlug).toBe("acme");
        expect(exchangeMicrosoftCode).not.toHaveBeenCalled();
    });

    it("exchanges the code and upserts the encrypted connection", async () => {
        vi.mocked(findOrgSlug).mockResolvedValue("acme");
        vi.mocked(exchangeMicrosoftCode).mockResolvedValue({
            accessToken: "new-at",
            refreshToken: "new-rt",
            expiresIn: 3600,
        });
        const state = createOAuthState("org1", "admin1");

        const r = await handleMicrosoftCallbackService({ code: "c", state });

        expect(r.ok).toBe(true);
        expect(upsertMicrosoftConnection).toHaveBeenCalledOnce();
        const values = vi.mocked(upsertMicrosoftConnection).mock.calls[0][0];
        expect(values.organizationId).toBe("org1");
        expect(values.connectedByUserId).toBe("admin1");
        expect(values.tenantId).toBe("tenant-1");
        expect(values.accessToken).not.toContain("new-at");
        expect(values.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });
});

// ── status & disconnect ───────────────────────────────────────────────────────

describe("getMicrosoftStatusService", () => {
    it("forbids non-members", async () => {
        vi.mocked(getOrgMembership).mockResolvedValue(null as never);
        const r = await getMicrosoftStatusService("org1", "u1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
    });

    it("reports disconnected when there is no row", async () => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(null);
        const r = await getMicrosoftStatusService("org1", "admin1");
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.data.connected).toBe(false);
            expect(r.data.connection).toBeNull();
        }
    });

    it("maps the row to the wire shape without tokens", async () => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(connRow());
        const r = await getMicrosoftStatusService("org1", "admin1");
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.data.connected).toBe(true);
            expect(r.data.connection?.tenantId).toBe("tenant-1");
            expect(r.data.connection).not.toHaveProperty("accessToken");
            expect(r.data.connection?.createdAt).toBe(
                "2026-07-01T00:00:00.000Z",
            );
        }
    });
});

describe("disconnectMicrosoftService", () => {
    it("returns 404 when nothing is connected", async () => {
        vi.mocked(deleteMicrosoftConnection).mockResolvedValue(null);
        const r = await disconnectMicrosoftService("org1", "admin1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    });

    it("deletes the connection", async () => {
        vi.mocked(deleteMicrosoftConnection).mockResolvedValue({
            id: "conn1",
        });
        const r = await disconnectMicrosoftService("org1", "admin1");
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.data.id).toBe("conn1");
    });
});

// ── browsing services ─────────────────────────────────────────────────────────

describe("list browsing services", () => {
    it("returns 404 when not connected", async () => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(null);
        const r = await listMicrosoftSitesService("org1", "admin1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    });

    it("lists sites with the stored (unexpired) token", async () => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(connRow());
        vi.mocked(listSitesWithDrives).mockResolvedValue([
            {
                driveId: "d1",
                displayName: "Eng",
                webUrl: null,
                kind: "site",
            },
        ]);
        const r = await listMicrosoftSitesService("org1", "admin1");
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.data.items[0].driveId).toBe("d1");
        expect(listSitesWithDrives).toHaveBeenCalledWith("at");
        expect(refreshMicrosoftToken).not.toHaveBeenCalled();
    });

    it("refreshes an expired token and persists the new one", async () => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(
            connRow({ tokenExpiresAt: new Date(Date.now() - 60_000) }),
        );
        vi.mocked(refreshMicrosoftToken).mockResolvedValue({
            accessToken: "fresh-at",
            refreshToken: "fresh-rt",
            expiresIn: 3600,
        });
        vi.mocked(listDriveItems).mockResolvedValue([]);

        const r = await listMicrosoftDriveItemsService(
            "org1",
            "admin1",
            "d1",
            undefined,
        );

        expect(r.ok).toBe(true);
        expect(refreshMicrosoftToken).toHaveBeenCalledOnce();
        expect(upsertMicrosoftConnection).toHaveBeenCalledOnce();
        expect(listDriveItems).toHaveBeenCalledWith(
            "fresh-at",
            "d1",
            undefined,
        );
    });

    it("returns 401 when the refresh fails (reconnect required)", async () => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(
            connRow({ tokenExpiresAt: new Date(Date.now() - 60_000) }),
        );
        vi.mocked(refreshMicrosoftToken).mockRejectedValue(
            new Error("invalid_grant"),
        );
        const r = await listMicrosoftSitesService("org1", "admin1");
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error.code).toBe("UNAUTHORIZED");
    });

    it("lists teams and channels", async () => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(connRow());
        vi.mocked(listJoinedTeams).mockResolvedValue([
            { id: "t1", displayName: "Platform" },
        ]);
        vi.mocked(listChannels).mockResolvedValue([
            { id: "c1", displayName: "General" },
        ]);

        const teams = await listMicrosoftTeamsService("org1", "admin1");
        expect(teams.ok).toBe(true);
        if (teams.ok) expect(teams.data.items[0].displayName).toBe("Platform");

        const channels = await listMicrosoftChannelsService(
            "org1",
            "admin1",
            "t1",
        );
        expect(channels.ok).toBe(true);
        if (channels.ok) {
            expect(channels.data.items[0].displayName).toBe("General");
        }
    });
});

// ── ingest files ──────────────────────────────────────────────────────────────

describe("ingestMicrosoftFilesService", () => {
    beforeEach(() => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(connRow());
        vi.mocked(ingestDocumentService).mockResolvedValue({
            ok: true,
            data: {
                documentId: "doc1",
                chunksCreated: 3,
                nodesCreated: 2,
                edgesCreated: 1,
            },
        } as never);
    });

    it("ingests a text file into the knowledge graph", async () => {
        vi.mocked(getDriveItem).mockResolvedValue({
            name: "runbook.md",
            webUrl: "https://x/runbook.md",
            mimeType: "text/markdown",
        });
        vi.mocked(downloadDriveItemText).mockResolvedValue("deploy steps");

        const r = await ingestMicrosoftFilesService("org1", "admin1", {
            items: [{ driveId: "d1", itemId: "i1" }],
        });

        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.ingested).toBe(1);
        expect(r.data.items[0]).toMatchObject({
            externalId: "sp:d1:i1",
            title: "runbook.md",
            ok: true,
            chunksCreated: 3,
            nodesCreated: 2,
        });
        expect(ingestDocumentService).toHaveBeenCalledWith(
            "org1",
            expect.objectContaining({
                connector: "microsoft",
                externalId: "sp:d1:i1",
                title: "runbook.md",
                content: "deploy steps",
                url: "https://x/runbook.md",
                extract: true,
            }),
        );
    });

    it("extracts office files through pdf conversion", async () => {
        vi.mocked(getDriveItem).mockResolvedValue({
            name: "report.docx",
            webUrl: null,
            mimeType: null,
        });
        vi.mocked(downloadDriveItemPdf).mockResolvedValue(
            new Uint8Array([1, 2, 3]),
        );
        vi.mocked(extractPdfText).mockResolvedValue("quarterly report");

        const r = await ingestMicrosoftFilesService("org1", "admin1", {
            items: [{ driveId: "d1", itemId: "i2" }],
        });

        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.ingested).toBe(1);
        expect(ingestDocumentService).toHaveBeenCalledWith(
            "org1",
            expect.objectContaining({ content: "quarterly report" }),
        );
    });

    it("skips unsupported or unreadable files without aborting the batch", async () => {
        vi.mocked(getDriveItem)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
                name: "photo.png",
                webUrl: null,
                mimeType: "image/png",
            })
            .mockResolvedValueOnce({
                name: "runbook.md",
                webUrl: null,
                mimeType: null,
            });
        vi.mocked(downloadDriveItemText).mockResolvedValue("ok");

        const r = await ingestMicrosoftFilesService("org1", "admin1", {
            items: [
                { driveId: "d1", itemId: "gone" },
                { driveId: "d1", itemId: "img" },
                { driveId: "d1", itemId: "doc" },
            ],
        });

        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.ingested).toBe(1);
        expect(r.data.failed).toBe(2);
        expect(r.data.items[0].ok).toBe(false);
        expect(r.data.items[1].ok).toBe(false);
        expect(ingestDocumentService).toHaveBeenCalledTimes(1);
    });
});

// ── ingest teams ──────────────────────────────────────────────────────────────

const tmsg = (
    id: string,
    authorId: string | null,
    authorName: string,
    createdDateTime: string,
    body = "text",
    replyToId: string | null = null,
) => ({ id, authorId, authorName, createdDateTime, body, replyToId });

describe("ingestMicrosoftTeamsChannelsService", () => {
    beforeEach(() => {
        vi.mocked(findMicrosoftConnectionByOrg).mockResolvedValue(connRow());
        vi.mocked(listJoinedTeams).mockResolvedValue([
            { id: "t1", displayName: "Platform" },
        ]);
        vi.mocked(listChannels).mockResolvedValue([
            { id: "c1", displayName: "General" },
        ]);
        vi.mocked(ingestDocumentService).mockResolvedValue({
            ok: true,
            data: {
                documentId: "doc1",
                chunksCreated: 2,
                nodesCreated: 1,
                edgesCreated: 0,
            },
        } as never);
        vi.mocked(resolveMicrosoftAuthor).mockResolvedValue(null);
    });

    it("ingests a channel doc plus a per-user doc for active authors", async () => {
        vi.mocked(listChannelMessages).mockResolvedValue([
            tmsg("m1", "u1", "Jane", "2026-07-16T10:00:00Z"),
            tmsg("m2", "u1", "Jane", "2026-07-16T11:00:00Z"),
            tmsg("m3", "u1", "Jane", "2026-07-16T12:00:00Z"),
            tmsg("m4", "u2", "Bob", "2026-07-16T13:00:00Z"),
        ]);
        vi.mocked(resolveAuthorEmails).mockResolvedValue(
            new Map([
                ["u1", "jane@corp.com"],
                ["u2", null],
            ]),
        );
        vi.mocked(resolveMicrosoftAuthor).mockImplementation(
            async (_org, microsoftUserId) =>
                microsoftUserId === "u1" ? "user-jane" : null,
        );

        const r = await ingestMicrosoftTeamsChannelsService("org1", "admin1", {
            channels: [{ teamId: "t1", channelId: "c1" }],
            sinceDays: 30,
        });

        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.ingested).toBe(2);

        const calls = vi.mocked(ingestDocumentService).mock.calls;
        // channel doc
        expect(calls[0][1]).toMatchObject({
            connector: "microsoft",
            externalId: "teams:t1:c1:w30",
            title: "Teams: Platform / #General",
        });
        expect(calls[0][1].content).toContain("Jane <jane@corp.com>");
        expect(calls[0][1].personId).toBeUndefined();
        // per-user doc (Jane has 3 messages; Bob is below the threshold)
        expect(calls).toHaveLength(2);
        expect(calls[1][1]).toMatchObject({
            externalId: "teams:t1:c1:w30:user:jane@corp.com",
            personId: "user-jane",
        });

        // the since window is applied
        const since = vi.mocked(listChannelMessages).mock.calls[0][3];
        expect(since).toBeInstanceOf(Date);
        expect((since as Date).getTime()).toBeLessThan(Date.now());
    });

    it("reports a channel with no messages as a failed item", async () => {
        vi.mocked(listChannelMessages).mockResolvedValue([]);

        const r = await ingestMicrosoftTeamsChannelsService("org1", "admin1", {
            channels: [{ teamId: "t1", channelId: "c1" }],
            sinceDays: 7,
        });

        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.data.failed).toBe(1);
        expect(r.data.items[0].ok).toBe(false);
        expect(ingestDocumentService).not.toHaveBeenCalled();
    });
});
