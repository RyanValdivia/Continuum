import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    MicrosoftUnauthorizedError,
    refreshMicrosoftToken,
    resolveAuthorEmails,
} from "../graph-api";

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...headers },
    });
}

describe("exchangeMicrosoftCode", () => {
    it("posts a form-encoded authorization_code grant to the tenant endpoint", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                access_token: "at",
                refresh_token: "rt",
                expires_in: 3600,
            }),
        );

        const result = await exchangeMicrosoftCode({
            code: "auth-code",
            redirectUri: "http://localhost:3000/api/v1/microsoft/callback",
            clientId: "cid",
            clientSecret: "secret",
            tenantId: "tenant-1",
        });

        expect(result).toEqual({
            accessToken: "at",
            refreshToken: "rt",
            expiresIn: 3600,
        });
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(
            "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token",
        );
        const body = new URLSearchParams(init.body as string);
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("code")).toBe("auth-code");
        expect(body.get("client_id")).toBe("cid");
        expect(body.get("client_secret")).toBe("secret");
        expect(body.get("redirect_uri")).toBe(
            "http://localhost:3000/api/v1/microsoft/callback",
        );
        expect(body.get("scope")).toContain("offline_access");
    });

    it("throws when the token endpoint rejects", async () => {
        fetchMock.mockResolvedValueOnce(
            new Response("bad request", { status: 400 }),
        );
        await expect(
            exchangeMicrosoftCode({
                code: "x",
                redirectUri: "r",
                clientId: "c",
                clientSecret: "s",
                tenantId: "t",
            }),
        ).rejects.toThrow("token request failed");
    });
});

describe("refreshMicrosoftToken", () => {
    it("uses the refresh_token grant", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                access_token: "at2",
                refresh_token: "rt2",
                expires_in: 3600,
            }),
        );
        const result = await refreshMicrosoftToken({
            refreshToken: "rt",
            clientId: "cid",
            clientSecret: "secret",
            tenantId: "tenant-1",
        });
        expect(result.accessToken).toBe("at2");
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        const body = new URLSearchParams(init.body as string);
        expect(body.get("grant_type")).toBe("refresh_token");
        expect(body.get("refresh_token")).toBe("rt");
    });
});

describe("listSitesWithDrives", () => {
    it("combines searched sites (with their default drive) and the user's OneDrive", async () => {
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    value: [
                        {
                            id: "site-1",
                            displayName: "Eng",
                            webUrl: "https://sp/eng",
                        },
                    ],
                }),
            )
            .mockResolvedValueOnce(jsonResponse({ id: "drive-1" }))
            .mockResolvedValueOnce(
                jsonResponse({
                    id: "od-drive",
                    name: "OneDrive",
                    webUrl: "https://od/",
                }),
            );

        const sites = await listSitesWithDrives("token");

        expect(sites).toEqual([
            {
                driveId: "drive-1",
                displayName: "Eng",
                webUrl: "https://sp/eng",
                kind: "site",
            },
            {
                driveId: "od-drive",
                displayName: "OneDrive",
                webUrl: "https://od/",
                kind: "onedrive",
            },
        ]);
        const [sitesUrl] = fetchMock.mock.calls[0] as [string];
        expect(sitesUrl).toContain("/sites?search=*");
        const [driveUrl] = fetchMock.mock.calls[1] as [string];
        expect(driveUrl).toContain("/sites/site-1/drive");
        const [odUrl] = fetchMock.mock.calls[2] as [string];
        expect(odUrl).toContain("/me/drive");
    });
});

describe("listDriveItems", () => {
    it("lists root children when no folderId is given and maps folder/file fields", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                value: [
                    {
                        id: "f1",
                        name: "Docs",
                        folder: {},
                        size: 0,
                        webUrl: "https://x/docs",
                    },
                    {
                        id: "i1",
                        name: "runbook.md",
                        file: { mimeType: "text/markdown" },
                        size: 123,
                        webUrl: "https://x/runbook.md",
                    },
                ],
            }),
        );

        const items = await listDriveItems("token", "drive-1");

        expect(items).toEqual([
            {
                id: "f1",
                name: "Docs",
                isFolder: true,
                mimeType: null,
                size: 0,
                webUrl: "https://x/docs",
            },
            {
                id: "i1",
                name: "runbook.md",
                isFolder: false,
                mimeType: "text/markdown",
                size: 123,
                webUrl: "https://x/runbook.md",
            },
        ]);
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain("/drives/drive-1/root/children");
    });

    it("lists a folder's children when folderId is given", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ value: [] }));
        await listDriveItems("token", "drive-1", "folder-9");
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain("/drives/drive-1/items/folder-9/children");
    });
});

describe("downloadDriveItemText", () => {
    it("returns the item content as text", async () => {
        fetchMock.mockResolvedValueOnce(new Response("hello world"));
        await expect(
            downloadDriveItemText("token", "drive-1", "item-1"),
        ).resolves.toBe("hello world");
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain("/drives/drive-1/items/item-1/content");
    });

    it("throws MicrosoftUnauthorizedError on 401", async () => {
        fetchMock.mockResolvedValueOnce(new Response("nope", { status: 401 }));
        await expect(
            downloadDriveItemText("token", "drive-1", "item-1"),
        ).rejects.toBeInstanceOf(MicrosoftUnauthorizedError);
    });
});

describe("listChannels (429 handling)", () => {
    it("retries once after a 429 honoring Retry-After", async () => {
        fetchMock
            .mockResolvedValueOnce(
                new Response("throttled", {
                    status: 429,
                    headers: { "Retry-After": "0" },
                }),
            )
            .mockResolvedValueOnce(
                jsonResponse({ value: [{ id: "c1", displayName: "General" }] }),
            );

        const channels = await listChannels("token", "team-1");

        expect(channels).toEqual([{ id: "c1", displayName: "General" }]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

describe("listChannelMessages", () => {
    it("paginates top-level messages and attaches replies, stopping at the since cutoff", async () => {
        const since = new Date("2026-07-10T00:00:00Z");
        fetchMock
            // page 1 of messages
            .mockResolvedValueOnce(
                jsonResponse({
                    value: [
                        {
                            id: "m2",
                            createdDateTime: "2026-07-15T10:00:00Z",
                            from: { user: { id: "u1", displayName: "Jane" } },
                            body: { contentType: "html", content: "<p>hi</p>" },
                        },
                        {
                            id: "m1",
                            createdDateTime: "2026-07-11T10:00:00Z",
                            from: { user: { id: "u2", displayName: "Bob" } },
                            body: { contentType: "text", content: "old-ish" },
                        },
                    ],
                    "@odata.nextLink":
                        "https://graph.microsoft.com/v1.0/next-page",
                }),
            )
            // replies for m2
            .mockResolvedValueOnce(
                jsonResponse({
                    value: [
                        {
                            id: "r1",
                            createdDateTime: "2026-07-15T11:00:00Z",
                            from: { user: { id: "u2", displayName: "Bob" } },
                            body: { contentType: "text", content: "reply" },
                        },
                    ],
                }),
            )
            // replies for m1
            .mockResolvedValueOnce(jsonResponse({ value: [] }))
            // page 2 — only older-than-since messages, so iteration stops
            .mockResolvedValueOnce(
                jsonResponse({
                    value: [
                        {
                            id: "m0",
                            createdDateTime: "2026-07-01T10:00:00Z",
                            from: null,
                            body: { contentType: "text", content: "too old" },
                        },
                    ],
                }),
            );

        const messages = await listChannelMessages(
            "token",
            "team-1",
            "chan-1",
            since,
        );

        expect(messages.map((m) => m.id)).toEqual(["m1", "m2", "r1"]);
        const byId = new Map(messages.map((m) => [m.id, m]));
        expect(byId.get("m2")).toMatchObject({
            authorId: "u1",
            authorName: "Jane",
            body: "<p>hi</p>",
        });
        expect(byId.get("r1")).toMatchObject({ replyToId: "m2" });
        // chronological order
        expect(
            messages.every(
                (m, i) =>
                    i === 0 ||
                    messages[i - 1].createdDateTime <= m.createdDateTime,
            ),
        ).toBe(true);
        const [firstUrl] = fetchMock.mock.calls[0] as [string];
        expect(firstUrl).toContain("/teams/team-1/channels/chan-1/messages");
    });
});

describe("listJoinedTeams", () => {
    it("returns the user's joined teams", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                value: [{ id: "t1", displayName: "Platform" }],
            }),
        );
        const teams = await listJoinedTeams("token");
        expect(teams).toEqual([{ id: "t1", displayName: "Platform" }]);
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain("/me/joinedTeams");
    });
});

describe("getDriveItem", () => {
    it("returns file metadata and null when not found", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse({
                id: "i1",
                name: "runbook.md",
                webUrl: "https://x/runbook.md",
                file: { mimeType: "text/markdown" },
            }),
        );
        const item = await getDriveItem("token", "drive-1", "i1");
        expect(item).toEqual({
            name: "runbook.md",
            webUrl: "https://x/runbook.md",
            mimeType: "text/markdown",
        });

        fetchMock.mockResolvedValueOnce(new Response("nf", { status: 404 }));
        await expect(
            getDriveItem("token", "drive-1", "missing"),
        ).resolves.toBeNull();
    });
});

describe("downloadDriveItemPdf", () => {
    it("requests the pdf conversion and returns bytes", async () => {
        const bytes = new Uint8Array([37, 80, 68, 70]); // %PDF
        fetchMock.mockResolvedValueOnce(new Response(bytes));
        const pdf = await downloadDriveItemPdf("token", "drive-1", "item-1");
        expect(pdf).toEqual(bytes);
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain("/drives/drive-1/items/item-1/content");
        expect(url).toContain("format=pdf");
    });
});

describe("resolveAuthorEmails", () => {
    it("maps user ids to mail or userPrincipalName, null on failure", async () => {
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    mail: "jane@corp.com",
                    userPrincipalName: "jane@corp.com",
                }),
            )
            .mockResolvedValueOnce(
                jsonResponse({ mail: null, userPrincipalName: "bob@corp.com" }),
            )
            .mockResolvedValueOnce(new Response("forbidden", { status: 403 }));

        const emails = await resolveAuthorEmails("token", ["u1", "u2", "u3"]);

        expect(emails.get("u1")).toBe("jane@corp.com");
        expect(emails.get("u2")).toBe("bob@corp.com");
        expect(emails.get("u3")).toBeNull();
        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toContain("/users/u1");
    });
});
