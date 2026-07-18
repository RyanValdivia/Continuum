import "server-only";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

export type NotionTokenResponse = {
    access_token: string;
    refresh_token: string;
    bot_id: string;
    workspace_id: string;
    workspace_name: string;
    workspace_icon: string | null;
    duplicated_template_id: string | null;
};

function basicAuthHeader(clientId: string, clientSecret: string): string {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function requestToken(
    body: Record<string, string>,
    clientId: string,
    clientSecret: string,
): Promise<NotionTokenResponse> {
    const res = await fetch(`${NOTION_API_BASE}/oauth/token`, {
        method: "POST",
        headers: {
            Authorization: basicAuthHeader(clientId, clientSecret),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(
            `Notion OAuth token request failed: ${res.status} ${await res.text()}`,
        );
    }
    return res.json();
}

export function exchangeNotionCode(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
}): Promise<NotionTokenResponse> {
    return requestToken(
        {
            grant_type: "authorization_code",
            code: params.code,
            redirect_uri: params.redirectUri,
        },
        params.clientId,
        params.clientSecret,
    );
}

export function refreshNotionToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
}): Promise<NotionTokenResponse> {
    return requestToken(
        { grant_type: "refresh_token", refresh_token: params.refreshToken },
        params.clientId,
        params.clientSecret,
    );
}

export type NotionSearchItem = {
    id: string;
    object: "page" | "database";
    url: string;
    title: string;
    /** Parent page/database id, or `null` when it's directly under the
     *  workspace — sharing a page in Notion cascades to its whole subtree,
     *  so this is what lets the UI render that structure instead of a flat list. */
    parentId: string | null;
    /** Only set when `parentId` is — `"block"`/`"workspace"` parents aren't
     *  individually fetchable the same way, so they're left unresolved. */
    parentType: "page" | "database" | null;
    iconEmoji: string | null;
    iconUrl: string | null;
};

function extractTitle(item: Record<string, unknown>): string {
    const properties = item.properties as
        | Record<string, { title?: { plain_text?: string }[] }>
        | undefined;
    if (properties) {
        for (const prop of Object.values(properties)) {
            const text = prop.title?.[0]?.plain_text;
            if (text) return text;
        }
    }
    const title = (item as { title?: { plain_text?: string }[] }).title;
    return title?.[0]?.plain_text ?? "Untitled";
}

function extractParent(item: Record<string, unknown>): {
    id: string | null;
    type: "page" | "database" | null;
} {
    const parent = item.parent as
        | { type: "page_id"; page_id: string }
        | { type: "database_id"; database_id: string }
        | { type: "block_id"; block_id: string }
        | { type: "workspace"; workspace: true }
        | undefined;
    if (!parent) return { id: null, type: null };
    if (parent.type === "page_id") return { id: parent.page_id, type: "page" };
    if (parent.type === "database_id") {
        return { id: parent.database_id, type: "database" };
    }
    // block_id/workspace parents aren't individually fetchable the same way.
    return { id: null, type: null };
}

function extractIcon(item: Record<string, unknown>): {
    emoji: string | null;
    url: string | null;
} {
    const icon = item.icon as
        | { type: "emoji"; emoji: string }
        | { type: "external"; external: { url: string } }
        | { type: "file"; file: { url: string } }
        | null
        | undefined;
    if (!icon) return { emoji: null, url: null };
    if (icon.type === "emoji") return { emoji: icon.emoji, url: null };
    if (icon.type === "external")
        return { emoji: null, url: icon.external.url };
    if (icon.type === "file") return { emoji: null, url: icon.file.url };
    return { emoji: null, url: null };
}

/** One page of the Notion workspace's shared pages/databases. Requires an unexpired access token. */
export async function searchNotion(
    accessToken: string,
    cursor?: string,
): Promise<{
    items: NotionSearchItem[];
    nextCursor: string | null;
}> {
    const res = await fetch(`${NOTION_API_BASE}/search`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(
            cursor
                ? { start_cursor: cursor, page_size: 100 }
                : { page_size: 100 },
        ),
    });
    if (res.status === 401) {
        throw new NotionUnauthorizedError();
    }
    if (!res.ok) {
        throw new Error(
            `Notion search failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as {
        results: Record<string, unknown>[];
        next_cursor: string | null;
    };
    return {
        items: data.results.map((item) => {
            const icon = extractIcon(item);
            const parent = extractParent(item);
            return {
                id: item.id as string,
                object: item.object as "page" | "database",
                url: item.url as string,
                title: extractTitle(item),
                parentId: parent.id,
                parentType: parent.type,
                iconEmoji: icon.emoji,
                iconUrl: icon.url,
            };
        }),
        nextCursor: data.next_cursor,
    };
}

const MAX_SEARCH_PAGES = 10;

/**
 * Walks Notion's `search` cursor to completion (up to 1000 items) instead of
 * returning just the first 100. Most of what used to show up as a "missing
 * parent" needing its own extra fetch was really just page 2+ of the same
 * search — this is what fixed that, `resolveMissingParents` below is now
 * only a fallback for genuinely un-returned ancestors.
 */
export async function searchNotionAll(
    accessToken: string,
): Promise<NotionSearchItem[]> {
    const items: NotionSearchItem[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
        const result = await searchNotion(accessToken, cursor);
        items.push(...result.items);
        if (!result.nextCursor) break;
        cursor = result.nextCursor;
    }

    return items;
}

/**
 * Fetches a single page or database so it can stand in for a parent that
 * Notion's search didn't itself return (e.g. sharing a page cascades access
 * to every row of a database inside it, but the database row's `parent`
 * points at a database that search sometimes omits). Returns `null` if it's
 * no longer accessible — the caller just leaves that branch unresolved.
 */
export async function fetchNotionParent(
    accessToken: string,
    id: string,
    kind: "page" | "database",
): Promise<NotionSearchItem | null> {
    const res = await fetch(
        `${NOTION_API_BASE}/${kind === "database" ? "databases" : "pages"}/${id}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Notion-Version": NOTION_VERSION,
            },
        },
    );
    if (res.status === 401) throw new NotionUnauthorizedError();
    if (!res.ok) return null;

    const item = (await res.json()) as Record<string, unknown>;
    const icon = extractIcon(item);
    const parent = extractParent(item);
    return {
        id: item.id as string,
        object: kind,
        url: item.url as string,
        title: extractTitle(item),
        parentId: parent.id,
        parentType: parent.type,
        iconEmoji: icon.emoji,
        iconUrl: icon.url,
    };
}

const MAX_PARENT_RESOLUTION_HOPS = 5;
/** Notion's rate limit is an average of ~3 req/s with short bursts allowed. */
const PARENT_FETCH_CONCURRENCY = 5;

async function mapWithConcurrency<T>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<void>,
): Promise<void> {
    let index = 0;
    async function worker() {
        while (index < items.length) {
            const item = items[index++];
            await fn(item);
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, worker),
    );
}

/**
 * Walks up from any item whose `parentId` isn't itself in `items` (search
 * cascades access to a database's rows but sometimes omits the database
 * itself) and fetches those missing ancestors, so the UI can nest rows under
 * their real parent instead of showing them as unrelated top-level items.
 * Bounded to a few hops so a long, partially-inaccessible chain can't spiral
 * into unbounded API calls.
 */
export async function resolveMissingParents(
    accessToken: string,
    items: NotionSearchItem[],
): Promise<NotionSearchItem[]> {
    const known = new Map(items.map((item) => [item.id, item]));
    const attempted = new Set<string>();

    for (let hop = 0; hop < MAX_PARENT_RESOLUTION_HOPS; hop++) {
        // Dedupe by parentId — many rows in the same database share one
        // missing parent, and each should only trigger one fetch.
        const missing = new Map<string, "page" | "database">();
        for (const item of known.values()) {
            if (
                item.parentId &&
                item.parentType &&
                !known.has(item.parentId) &&
                !attempted.has(item.parentId)
            ) {
                missing.set(item.parentId, item.parentType);
            }
        }
        if (missing.size === 0) break;

        await mapWithConcurrency(
            [...missing],
            PARENT_FETCH_CONCURRENCY,
            async ([parentId, parentType]) => {
                attempted.add(parentId);
                const parent = await fetchNotionParent(
                    accessToken,
                    parentId,
                    parentType,
                );
                if (parent) known.set(parent.id, parent);
            },
        );
    }

    return [...known.values()];
}

export class NotionUnauthorizedError extends Error {
    constructor() {
        super("Notion access token rejected (401)");
        this.name = "NotionUnauthorizedError";
    }
}
