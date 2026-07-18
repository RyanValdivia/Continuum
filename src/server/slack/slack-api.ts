import "server-only";

const SLACK_API_BASE = "https://slack.com/api";
const SLACK_OPENID_TOKEN_URL = "https://slack.com/api/openid.connect.token";
const SLACK_OPENID_USERINFO_URL =
    "https://slack.com/api/openid.connect.userInfo";

export type SlackTokenResponse = {
    access_token: string;
    token_type: string;
    id_token: string;
};

/** Slack's own error convention (`ok`/`error`) shows up across its REST
 *  surface, including the OpenID endpoints — check it in addition to the
 *  HTTP status, since a 200 can still carry `ok: false`. */
type SlackApiEnvelope = { ok?: boolean; error?: string };

function assertSlackOk<T extends SlackApiEnvelope>(data: T, action: string): T {
    if (data.ok === false || data.error) {
        throw new Error(`Slack ${action} failed: ${data.error ?? "unknown"}`);
    }
    return data;
}

/** Exchanges the OpenID Connect `code` for an access token + `id_token`. */
export async function exchangeSlackCode(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
}): Promise<SlackTokenResponse> {
    const body = new URLSearchParams({
        code: params.code,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
    });

    const res = await fetch(SLACK_OPENID_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        throw new Error(
            `Slack token exchange failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as SlackTokenResponse & SlackApiEnvelope;
    return assertSlackOk(data, "token exchange");
}

export type SlackUserInfo = {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    /** Custom OIDC claim — Slack uses the literal URI as the JSON key. */
    "https://slack.com/team_id": string;
};

/** Resolves the signed-in user's Slack identity (id, email, name, team). */
export async function fetchSlackUserInfo(
    accessToken: string,
): Promise<SlackUserInfo> {
    const res = await fetch(SLACK_OPENID_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error(
            `Slack userinfo failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as SlackUserInfo & SlackApiEnvelope;
    return assertSlackOk(data, "userinfo");
}

// ── Bot install (org-wide, admin-only) ─────────────────────────────────────

export type SlackBotTokenResponse = {
    access_token: string;
    bot_user_id: string;
    team: { id: string; name: string };
};

/** Exchanges the classic OAuth v2 `code` for a bot token — distinct endpoint
 *  and response shape from the personal OpenID Connect flow above. */
export async function exchangeSlackBotCode(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
}): Promise<SlackBotTokenResponse> {
    const body = new URLSearchParams({
        code: params.code,
        client_id: params.clientId,
        client_secret: params.clientSecret,
        redirect_uri: params.redirectUri,
    });

    const res = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        throw new Error(
            `Slack bot token exchange failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as SlackBotTokenResponse & SlackApiEnvelope;
    return assertSlackOk(data, "bot token exchange");
}

export type SlackChannelSummary = {
    id: string;
    name: string;
    isPrivate: boolean;
    isMember: boolean;
};

/** Lists public + private channels the bot can see. Paginates internally
 *  (Slack caps `limit` at 1000/page) up to a sane ceiling. */
export async function listSlackChannels(
    botToken: string,
): Promise<SlackChannelSummary[]> {
    const channels: SlackChannelSummary[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < 10; page++) {
        const url = new URL(`${SLACK_API_BASE}/conversations.list`);
        url.searchParams.set("types", "public_channel,private_channel");
        url.searchParams.set("limit", "200");
        url.searchParams.set("exclude_archived", "true");
        if (cursor) url.searchParams.set("cursor", cursor);

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${botToken}` },
        });
        if (!res.ok) {
            throw new Error(
                `Slack conversations.list failed: ${res.status} ${await res.text()}`,
            );
        }
        const data = (await res.json()) as SlackApiEnvelope & {
            channels: {
                id: string;
                name: string;
                is_private: boolean;
                is_member: boolean;
            }[];
            response_metadata?: { next_cursor?: string };
        };
        assertSlackOk(data, "conversations.list");

        channels.push(
            ...data.channels.map((c) => ({
                id: c.id,
                name: c.name,
                isPrivate: c.is_private,
                isMember: c.is_member,
            })),
        );

        cursor = data.response_metadata?.next_cursor;
        if (!cursor) break;
    }

    return channels;
}

/** Joins the bot to a *public* channel — private channels need a human to
 *  `/invite @bot` from inside Slack, the API can't force that. */
export async function joinSlackChannel(
    botToken: string,
    channelId: string,
): Promise<void> {
    const res = await fetch(`${SLACK_API_BASE}/conversations.join`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ channel: channelId }),
    });
    if (!res.ok) {
        throw new Error(
            `Slack conversations.join failed: ${res.status} ${await res.text()}`,
        );
    }
    assertSlackOk(await res.json(), "conversations.join");
}

export type SlackMessage = {
    userId: string | null;
    text: string;
    ts: string;
    threadTs: string | null;
};

/** One page of a channel's history, newest first. Used for the "sync now"
 *  manual backfill — `conversations.history` is rate-limited (as low as
 *  1 req/min for non-Marketplace apps), so callers should not poll this. */
export async function fetchSlackChannelHistory(
    botToken: string,
    channelId: string,
    limit = 50,
): Promise<SlackMessage[]> {
    const url = new URL(`${SLACK_API_BASE}/conversations.history`);
    url.searchParams.set("channel", channelId);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${botToken}` },
    });
    if (!res.ok) {
        throw new Error(
            `Slack conversations.history failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as SlackApiEnvelope & {
        messages: {
            user?: string;
            text?: string;
            ts: string;
            thread_ts?: string;
            subtype?: string;
        }[];
    };
    assertSlackOk(data, "conversations.history");

    return data.messages
        .filter((m) => !m.subtype) // skip joins/leaves/topic-changes/etc.
        .map((m) => ({
            userId: m.user ?? null,
            text: m.text ?? "",
            ts: m.ts,
            threadTs: m.thread_ts ?? null,
        }));
}

export type SlackUserProfile = {
    id: string;
    email: string | null;
    displayName: string | null;
};

/** Resolves a message author's profile (for attribution matching against
 *  `slack_identity`). Requires the `users:read`/`users:read.email` bot scopes. */
export async function fetchSlackUser(
    botToken: string,
    slackUserId: string,
): Promise<SlackUserProfile> {
    const url = new URL(`${SLACK_API_BASE}/users.info`);
    url.searchParams.set("user", slackUserId);

    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${botToken}` },
    });
    if (!res.ok) {
        throw new Error(
            `Slack users.info failed: ${res.status} ${await res.text()}`,
        );
    }
    const data = (await res.json()) as SlackApiEnvelope & {
        user: {
            id: string;
            profile?: { email?: string; real_name?: string };
        };
    };
    assertSlackOk(data, "users.info");

    return {
        id: data.user.id,
        email: data.user.profile?.email ?? null,
        displayName: data.user.profile?.real_name ?? null,
    };
}
