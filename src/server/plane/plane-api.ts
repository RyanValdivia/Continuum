import "server-only";

export class PlaneUnauthorizedError extends Error {
    constructor() {
        super("Plane API key rejected (401)");
        this.name = "PlaneUnauthorizedError";
    }
}

function apiBase(baseUrl: string, workspaceSlug: string): string {
    return `${baseUrl.replace(/\/$/, "")}/api/v1/workspaces/${workspaceSlug}`;
}

function authHeaders(apiKey: string): HeadersInit {
    return { "X-API-Key": apiKey, "Content-Type": "application/json" };
}

async function planeFetch<T>(url: string, apiKey: string): Promise<T> {
    const res = await fetch(url, { headers: authHeaders(apiKey) });
    if (res.status === 401 || res.status === 403) {
        throw new PlaneUnauthorizedError();
    }
    if (!res.ok) {
        throw new Error(`Plane API request failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
}

export type PlaneProjectItem = {
    id: string;
    name: string;
    identifier: string;
};

/** Verifies the connection works and returns the workspace's projects.
 *  Throws `PlaneUnauthorizedError` on a bad key/workspace pair. */
export async function fetchPlaneProjects(
    baseUrl: string,
    workspaceSlug: string,
    apiKey: string,
): Promise<PlaneProjectItem[]> {
    const data = await planeFetch<{
        results?: Array<{ id: string; name: string; identifier: string }>;
    }>(`${apiBase(baseUrl, workspaceSlug)}/projects/`, apiKey);
    const results = data.results ?? [];
    return results.map((p) => ({
        id: p.id,
        name: p.name,
        identifier: p.identifier,
    }));
}

export type PlaneIssueItem = {
    id: string;
    name: string;
    description: string | null;
    sequenceId: number;
    projectIdentifier: string;
};

const ISSUE_PAGE_SIZE = 100;
const MAX_ISSUE_PAGES = 5; // up to ~500 issues per project

/** All issues in a project, title + plain-text description. Plane's
 *  `description` field is a JSON doc (rich text); `description_stripped` /
 *  `description_html` are lighter — we use `description_stripped` when
 *  present and fall back to the issue name only. */
export async function fetchPlaneIssues(
    baseUrl: string,
    workspaceSlug: string,
    projectId: string,
    projectIdentifier: string,
    apiKey: string,
): Promise<PlaneIssueItem[]> {
    const items: PlaneIssueItem[] = [];
    let cursor = "";

    for (let page = 0; page < MAX_ISSUE_PAGES; page++) {
        const url = new URL(
            `${apiBase(baseUrl, workspaceSlug)}/projects/${projectId}/issues/`,
        );
        url.searchParams.set("per_page", String(ISSUE_PAGE_SIZE));
        if (cursor) url.searchParams.set("cursor", cursor);

        const data = await planeFetch<{
            results?: Array<{
                id: string;
                name: string;
                description_stripped: string | null;
                sequence_id: number;
            }>;
            next_cursor?: string | null;
            total_results?: number;
        }>(url.toString(), apiKey);

        const results = data.results ?? [];
        items.push(
            ...results.map((i) => ({
                id: i.id,
                name: i.name,
                description: i.description_stripped,
                sequenceId: i.sequence_id,
                projectIdentifier,
            })),
        );

        if (!data.next_cursor || results.length < ISSUE_PAGE_SIZE) break;
        cursor = data.next_cursor;
    }

    return items;
}
