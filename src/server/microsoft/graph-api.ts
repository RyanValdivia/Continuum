import "server-only";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const LOGIN_BASE = "https://login.microsoftonline.com";

/**
 * Delegated scopes requested on connect. `ChannelMessage.Read.All` is the
 * delegated (not app-only) scope for reading channel messages;
 * `User.ReadBasic.All` lets us resolve message authors' emails for the
 * per-user ingestion docs.
 */
export const MICROSOFT_GRAPH_SCOPES = [
    "offline_access",
    "User.Read",
    "User.ReadBasic.All",
    "Sites.Read.All",
    "Team.ReadBasic.All",
    "Channel.ReadBasic.All",
    "ChannelMessage.Read.All",
].join(" ");

export class MicrosoftUnauthorizedError extends Error {
    constructor() {
        super("Microsoft access token rejected (401)");
        this.name = "MicrosoftUnauthorizedError";
    }
}

// ── OAuth token leg ───────────────────────────────────────────────────────────

export type GraphTokenResponse = {
    accessToken: string;
    refreshToken: string;
    /** Seconds until the access token expires. */
    expiresIn: number;
};

async function requestToken(
    tenantId: string,
    body: Record<string, string>,
): Promise<GraphTokenResponse> {
    const res = await fetch(`${LOGIN_BASE}/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) {
        throw new Error(
            `Microsoft OAuth token request failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
    };
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
    };
}

export function exchangeMicrosoftCode(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
    tenantId: string;
}): Promise<GraphTokenResponse> {
    return requestToken(params.tenantId, {
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: params.redirectUri,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        scope: MICROSOFT_GRAPH_SCOPES,
    });
}

export function refreshMicrosoftToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
    tenantId: string;
}): Promise<GraphTokenResponse> {
    return requestToken(params.tenantId, {
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        scope: MICROSOFT_GRAPH_SCOPES,
    });
}

// ── Shared fetch wrapper ──────────────────────────────────────────────────────

async function graphFetch(accessToken: string, url: string): Promise<Response> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    let res = await fetch(url, { headers });
    if (res.status === 429) {
        // Throttled: honor Retry-After once, then give up to the caller.
        const retryAfterSeconds = Number(res.headers.get("Retry-After") ?? "1");
        await new Promise((resolve) =>
            setTimeout(resolve, retryAfterSeconds * 1000),
        );
        res = await fetch(url, { headers });
    }
    if (res.status === 401) throw new MicrosoftUnauthorizedError();
    if (!res.ok) {
        throw new Error(
            `Microsoft Graph request failed: ${res.status} ${await res.text()}`,
        );
    }
    return res;
}

type GraphListPage<T> = {
    value: T[];
    "@odata.nextLink"?: string;
};

// ── Sites & drive items ───────────────────────────────────────────────────────

export type GraphSiteEntry = {
    driveId: string;
    displayName: string;
    webUrl: string | null;
    kind: "site" | "onedrive";
};

/**
 * Every drive root the picker can browse: the default drive of each site the
 * user can search, plus the connecting user's own OneDrive. Sites whose
 * default drive isn't readable are skipped.
 */
export async function listSitesWithDrives(
    accessToken: string,
): Promise<GraphSiteEntry[]> {
    const res = await graphFetch(accessToken, `${GRAPH_BASE}/sites?search=*`);
    const data = (await res.json()) as {
        value: { id: string; displayName: string; webUrl?: string }[];
    };

    const entries: GraphSiteEntry[] = [];
    for (const site of data.value) {
        try {
            const driveRes = await graphFetch(
                accessToken,
                `${GRAPH_BASE}/sites/${site.id}/drive`,
            );
            const drive = (await driveRes.json()) as { id: string };
            entries.push({
                driveId: drive.id,
                displayName: site.displayName,
                webUrl: site.webUrl ?? null,
                kind: "site",
            });
        } catch {
            // Site without an accessible default drive — not browsable.
        }
    }

    const meRes = await graphFetch(accessToken, `${GRAPH_BASE}/me/drive`);
    const me = (await meRes.json()) as {
        id: string;
        name?: string;
        webUrl?: string;
    };
    entries.push({
        driveId: me.id,
        displayName: me.name ?? "OneDrive",
        webUrl: me.webUrl ?? null,
        kind: "onedrive",
    });

    return entries;
}

export type GraphDriveItem = {
    id: string;
    name: string;
    isFolder: boolean;
    mimeType: string | null;
    size: number | null;
    webUrl: string | null;
};

type RawDriveItem = {
    id: string;
    name: string;
    folder?: Record<string, unknown>;
    file?: { mimeType?: string };
    size?: number;
    webUrl?: string;
};

const MAX_LIST_PAGES = 5;

function toDriveItem(item: RawDriveItem): GraphDriveItem {
    return {
        id: item.id,
        name: item.name,
        isFolder: Boolean(item.folder),
        mimeType: item.file?.mimeType ?? null,
        size: item.size ?? null,
        webUrl: item.webUrl ?? null,
    };
}

/** Children of a drive root (`folderId` omitted) or of a folder. Paginated, bounded. */
export async function listDriveItems(
    accessToken: string,
    driveId: string,
    folderId?: string,
): Promise<GraphDriveItem[]> {
    let url: string | null = folderId
        ? `${GRAPH_BASE}/drives/${driveId}/items/${folderId}/children`
        : `${GRAPH_BASE}/drives/${driveId}/root/children`;

    const items: GraphDriveItem[] = [];
    for (let page = 0; page < MAX_LIST_PAGES && url; page++) {
        const res = await graphFetch(accessToken, url);
        const data = (await res.json()) as GraphListPage<RawDriveItem>;
        items.push(...data.value.map(toDriveItem));
        url = data["@odata.nextLink"] ?? null;
    }
    return items;
}

/** Metadata for one item; `null` when it isn't readable (e.g. deleted mid-ingest). */
export async function getDriveItem(
    accessToken: string,
    driveId: string,
    itemId: string,
): Promise<{
    name: string;
    webUrl: string | null;
    mimeType: string | null;
} | null> {
    const res = await fetch(`${GRAPH_BASE}/drives/${driveId}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) throw new MicrosoftUnauthorizedError();
    if (!res.ok) return null;
    const data = (await res.json()) as RawDriveItem;
    return {
        name: data.name,
        webUrl: data.webUrl ?? null,
        mimeType: data.file?.mimeType ?? null,
    };
}

export async function downloadDriveItemText(
    accessToken: string,
    driveId: string,
    itemId: string,
): Promise<string> {
    const res = await graphFetch(
        accessToken,
        `${GRAPH_BASE}/drives/${driveId}/items/${itemId}/content`,
    );
    return res.text();
}

/** Graph converts Office files server-side when asked for `format=pdf`. */
export async function downloadDriveItemPdf(
    accessToken: string,
    driveId: string,
    itemId: string,
): Promise<Uint8Array> {
    const res = await graphFetch(
        accessToken,
        `${GRAPH_BASE}/drives/${driveId}/items/${itemId}/content?format=pdf`,
    );
    return new Uint8Array(await res.arrayBuffer());
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export type GraphTeam = { id: string; displayName: string };
export type GraphChannel = { id: string; displayName: string };

export async function listJoinedTeams(
    accessToken: string,
): Promise<GraphTeam[]> {
    const res = await graphFetch(accessToken, `${GRAPH_BASE}/me/joinedTeams`);
    const data = (await res.json()) as GraphListPage<GraphTeam>;
    return data.value.map((t) => ({ id: t.id, displayName: t.displayName }));
}

export async function listChannels(
    accessToken: string,
    teamId: string,
): Promise<GraphChannel[]> {
    const res = await graphFetch(
        accessToken,
        `${GRAPH_BASE}/teams/${teamId}/channels`,
    );
    const data = (await res.json()) as GraphListPage<GraphChannel>;
    return data.value.map((c) => ({ id: c.id, displayName: c.displayName }));
}

export type GraphChannelMessage = {
    id: string;
    createdDateTime: string;
    authorId: string | null;
    authorName: string;
    /** Raw body — usually HTML, plain text when `contentType` was text. */
    body: string;
    /** Set on replies: the id of the top-level message they answer. */
    replyToId: string | null;
};

type RawChannelMessage = {
    id: string;
    createdDateTime: string;
    from?: { user?: { id?: string; displayName?: string } } | null;
    body?: { contentType?: string; content?: string };
};

const MAX_MESSAGE_PAGES = 10;
const MAX_REPLY_PAGES = 5;

function toChannelMessage(
    m: RawChannelMessage,
    replyToId: string | null,
): GraphChannelMessage {
    return {
        id: m.id,
        createdDateTime: m.createdDateTime,
        authorId: m.from?.user?.id ?? null,
        authorName: m.from?.user?.displayName ?? "Unknown",
        body: m.body?.content ?? "",
        replyToId,
    };
}

/**
 * Top-level messages of a channel plus their replies, oldest first. Pages are
 * newest-first; when `since` is set, pagination stops at the first message
 * older than the cutoff and older messages (and their replies) are dropped.
 */
export async function listChannelMessages(
    accessToken: string,
    teamId: string,
    channelId: string,
    since?: Date,
): Promise<GraphChannelMessage[]> {
    const base = `${GRAPH_BASE}/teams/${teamId}/channels/${channelId}/messages`;
    const inWindow: GraphChannelMessage[] = [];
    let url: string | null = base;

    for (let page = 0; page < MAX_MESSAGE_PAGES && url; page++) {
        const res = await graphFetch(accessToken, url);
        const data = (await res.json()) as GraphListPage<RawChannelMessage>;

        let reachedCutoff = false;
        const pageMessages: RawChannelMessage[] = [];
        for (const m of data.value) {
            if (since && new Date(m.createdDateTime) < since) {
                reachedCutoff = true;
                continue;
            }
            pageMessages.push(m);
        }

        for (const m of pageMessages) {
            inWindow.push(toChannelMessage(m, null));
            inWindow.push(
                ...(await listReplies(accessToken, base, m.id, since)),
            );
        }

        if (reachedCutoff) break;
        url = data["@odata.nextLink"] ?? null;
    }

    inWindow.sort((a, b) => a.createdDateTime.localeCompare(b.createdDateTime));
    return inWindow;
}

async function listReplies(
    accessToken: string,
    messagesBase: string,
    messageId: string,
    since?: Date,
): Promise<GraphChannelMessage[]> {
    const replies: GraphChannelMessage[] = [];
    let url: string | null = `${messagesBase}/${messageId}/replies`;

    for (let page = 0; page < MAX_REPLY_PAGES && url; page++) {
        const res = await graphFetch(accessToken, url);
        const data = (await res.json()) as GraphListPage<RawChannelMessage>;
        for (const m of data.value) {
            if (since && new Date(m.createdDateTime) < since) continue;
            replies.push(toChannelMessage(m, messageId));
        }
        url = data["@odata.nextLink"] ?? null;
    }
    return replies;
}

/**
 * Author id → email (`mail`, falling back to `userPrincipalName`). Users that
 * can't be resolved map to `null`; callers fall back to the display name.
 */
export async function resolveAuthorEmails(
    accessToken: string,
    userIds: string[],
): Promise<Map<string, string | null>> {
    const emails = new Map<string, string | null>();
    for (const userId of userIds) {
        const res = await fetch(
            `${GRAPH_BASE}/users/${userId}?$select=mail,userPrincipalName`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (res.status === 401) throw new MicrosoftUnauthorizedError();
        if (!res.ok) {
            emails.set(userId, null);
            continue;
        }
        const data = (await res.json()) as {
            mail?: string | null;
            userPrincipalName?: string;
        };
        emails.set(userId, data.mail ?? data.userPrincipalName ?? null);
    }
    return emails;
}

/**
 * Injectable seam for services — tests substitute a fake `GraphApi`, prod uses
 * these real implementations (same spirit as `IngestDeps` in knowledge).
 */
export const graphApi = {
    listSitesWithDrives,
    listDriveItems,
    getDriveItem,
    downloadDriveItemText,
    downloadDriveItemPdf,
    listJoinedTeams,
    listChannels,
    listChannelMessages,
    resolveAuthorEmails,
};
export type GraphApi = typeof graphApi;
