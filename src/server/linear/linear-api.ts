import "server-only";

const LINEAR_TOKEN_URL = "https://api.linear.app/oauth/token";
const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";

export type LinearTokenResponse = {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    scope: string;
};

export class LinearUnauthorizedError extends Error {
    constructor() {
        super("Linear access token rejected (401)");
        this.name = "LinearUnauthorizedError";
    }
}

async function requestToken(
    body: Record<string, string>,
): Promise<LinearTokenResponse> {
    const res = await fetch(LINEAR_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
    });
    if (!res.ok) {
        throw new Error(
            `Linear OAuth token request failed: ${res.status} ${await res.text()}`,
        );
    }
    return res.json();
}

export function exchangeLinearCode(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
}): Promise<LinearTokenResponse> {
    return requestToken({
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: params.redirectUri,
        client_id: params.clientId,
        client_secret: params.clientSecret,
    });
}

export function refreshLinearToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
}): Promise<LinearTokenResponse> {
    return requestToken({
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
        client_id: params.clientId,
        client_secret: params.clientSecret,
    });
}

async function graphql<T>(
    accessToken: string,
    query: string,
    variables?: Record<string, unknown>,
): Promise<T> {
    const res = await fetch(LINEAR_GRAPHQL_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401) throw new LinearUnauthorizedError();
    if (!res.ok) {
        throw new Error(
            `Linear GraphQL request failed: ${res.status} ${await res.text()}`,
        );
    }
    const json = (await res.json()) as { data?: T; errors?: unknown[] };
    if (json.errors?.length) {
        const errors = json.errors as Array<{ message?: string }>;
        if (
            errors.some((e) =>
                e.message?.toLowerCase().includes("authentication"),
            )
        ) {
            throw new LinearUnauthorizedError();
        }
        throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
    }
    if (!json.data) throw new Error("Linear GraphQL response had no data");
    return json.data;
}

export type LinearOrganization = { id: string; name: string };

export async function fetchLinearOrganization(
    accessToken: string,
): Promise<LinearOrganization> {
    const data = await graphql<{
        organization: { id: string; name: string };
    }>(accessToken, `query { organization { id name } }`);
    return data.organization;
}

export type LinearIssueItem = {
    id: string;
    identifier: string;
    title: string;
    url: string;
    teamName: string | null;
};

const ISSUE_PAGE_SIZE = 100;
const MAX_ISSUE_PAGES = 5; // up to ~500 issues

/** Non-completed, non-cancelled issues across every team in the workspace. */
export async function listLinearIssues(
    accessToken: string,
): Promise<LinearIssueItem[]> {
    const items: LinearIssueItem[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_ISSUE_PAGES; page++) {
        const data = await graphql<{
            issues: {
                nodes: Array<{
                    id: string;
                    identifier: string;
                    title: string;
                    url: string;
                    team: { name: string } | null;
                }>;
                pageInfo: { hasNextPage: boolean; endCursor: string | null };
            };
        }>(
            accessToken,
            `query Issues($after: String) {
                issues(
                    first: ${ISSUE_PAGE_SIZE}
                    after: $after
                    filter: { state: { type: { nin: ["completed", "canceled"] } } }
                ) {
                    nodes {
                        id
                        identifier
                        title
                        url
                        team { name }
                    }
                    pageInfo { hasNextPage endCursor }
                }
            }`,
            { after: cursor },
        );

        items.push(
            ...data.issues.nodes.map((n) => ({
                id: n.id,
                identifier: n.identifier,
                title: n.title,
                url: n.url,
                teamName: n.team?.name ?? null,
            })),
        );

        if (!data.issues.pageInfo.hasNextPage) break;
        cursor = data.issues.pageInfo.endCursor ?? undefined;
    }

    return items;
}

export type LinearIssueDetail = {
    id: string;
    identifier: string;
    title: string;
    description: string | null;
    url: string;
};

/** Fetches full description text for a set of issue ids (batched one query,
 *  since Linear's GraphQL has no bulk-by-ids issue lookup). */
export async function fetchLinearIssueDetails(
    accessToken: string,
    issueIds: string[],
): Promise<LinearIssueDetail[]> {
    const results = await Promise.all(
        issueIds.map((id) =>
            graphql<{
                issue: {
                    id: string;
                    identifier: string;
                    title: string;
                    description: string | null;
                    url: string;
                } | null;
            }>(
                accessToken,
                `query Issue($id: String!) {
                    issue(id: $id) {
                        id
                        identifier
                        title
                        description
                        url
                    }
                }`,
                { id },
            ),
        ),
    );
    return results
        .map((r) => r.issue)
        .filter((issue): issue is LinearIssueDetail => issue !== null);
}
