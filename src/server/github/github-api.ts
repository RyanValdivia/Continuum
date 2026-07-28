import "server-only";

const GITHUB_API_BASE = "https://api.github.com";

export type GithubTokenResponse = {
    access_token: string;
    refresh_token?: string;
    scope: string;
    token_type: string;
};

export class GithubUnauthorizedError extends Error {
    constructor() {
        super("GitHub access token rejected (401)");
        this.name = "GithubUnauthorizedError";
    }
}

/** Exchanges the OAuth `code` for an access token. GitHub's classic OAuth
 *  Apps return non-expiring tokens (no `refresh_token`); apps with token
 *  expiration enabled return one, which the caller persists if present. */
export async function exchangeGithubCode(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
}): Promise<GithubTokenResponse> {
    const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            client_id: params.clientId,
            client_secret: params.clientSecret,
            code: params.code,
            redirect_uri: params.redirectUri,
        }),
    });
    if (!res.ok) {
        throw new Error(
            `GitHub OAuth token request failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as GithubTokenResponse & {
        error?: string;
        error_description?: string;
    };
    if (data.error) {
        throw new Error(`GitHub OAuth error: ${data.error_description ?? data.error}`);
    }
    return data;
}

/** Only meaningful for GitHub Apps / OAuth Apps with token expiration
 *  enabled — classic OAuth App tokens never expire and have no refresh token. */
export async function refreshGithubToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
}): Promise<GithubTokenResponse> {
    const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: params.refreshToken,
            client_id: params.clientId,
            client_secret: params.clientSecret,
        }),
    });
    if (!res.ok) {
        throw new Error(
            `GitHub OAuth refresh failed: ${res.status} ${await res.text()}`,
        );
    }
    return res.json();
}

function authHeaders(accessToken: string): HeadersInit {
    return {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
}

export type GithubUser = { id: number; login: string };

export async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
    const res = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: authHeaders(accessToken),
    });
    if (res.status === 401) throw new GithubUnauthorizedError();
    if (!res.ok) {
        throw new Error(`GitHub user fetch failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id: number; login: string };
    return { id: data.id, login: data.login };
}

export type GithubRepoItem = {
    id: number;
    fullName: string;
    name: string;
    owner: string;
    private: boolean;
    url: string;
    description: string | null;
};

const MAX_REPO_PAGES = 5; // up to ~500 repos

/** Repos the authenticated user has at least read access to. */
export async function listGithubRepos(
    accessToken: string,
): Promise<GithubRepoItem[]> {
    const items: GithubRepoItem[] = [];

    for (let page = 1; page <= MAX_REPO_PAGES; page++) {
        const url = new URL(`${GITHUB_API_BASE}/user/repos`);
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));
        url.searchParams.set("sort", "updated");

        const res = await fetch(url, { headers: authHeaders(accessToken) });
        if (res.status === 401) throw new GithubUnauthorizedError();
        if (!res.ok) {
            throw new Error(
                `GitHub repos fetch failed: ${res.status} ${await res.text()}`,
            );
        }
        const data = (await res.json()) as Array<{
            id: number;
            full_name: string;
            name: string;
            owner: { login: string };
            private: boolean;
            html_url: string;
            description: string | null;
        }>;
        items.push(
            ...data.map((r) => ({
                id: r.id,
                fullName: r.full_name,
                name: r.name,
                owner: r.owner.login,
                private: r.private,
                url: r.html_url,
                description: r.description,
            })),
        );
        if (data.length < 100) break;
    }

    return items;
}

/** Repo README as plain text (Markdown source — good enough for chunking/embedding). */
export async function fetchGithubReadme(
    accessToken: string,
    owner: string,
    repo: string,
): Promise<string | null> {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`, {
        headers: { ...authHeaders(accessToken), Accept: "application/vnd.github.raw+json" },
    });
    if (res.status === 401) throw new GithubUnauthorizedError();
    if (res.status === 404) return null;
    if (!res.ok) {
        throw new Error(
            `GitHub README fetch failed: ${res.status} ${await res.text()}`,
        );
    }
    return res.text();
}

export type GithubIssue = {
    number: number;
    title: string;
    body: string | null;
    url: string;
};

const MAX_ISSUE_PAGES = 3; // up to ~300 issues

/** Open issues (PRs excluded) for a repo, title + body only. */
export async function fetchGithubIssues(
    accessToken: string,
    owner: string,
    repo: string,
): Promise<GithubIssue[]> {
    const issues: GithubIssue[] = [];

    for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
        const url = new URL(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`);
        url.searchParams.set("state", "open");
        url.searchParams.set("per_page", "100");
        url.searchParams.set("page", String(page));

        const res = await fetch(url, { headers: authHeaders(accessToken) });
        if (res.status === 401) throw new GithubUnauthorizedError();
        if (!res.ok) {
            throw new Error(
                `GitHub issues fetch failed: ${res.status} ${await res.text()}`,
            );
        }
        const data = (await res.json()) as Array<{
            number: number;
            title: string;
            body: string | null;
            html_url: string;
            pull_request?: unknown;
        }>;
        for (const issue of data) {
            if (issue.pull_request) continue; // GitHub's issues endpoint includes PRs
            issues.push({
                number: issue.number,
                title: issue.title,
                body: issue.body,
                url: issue.html_url,
            });
        }
        if (data.length < 100) break;
    }

    return issues;
}
