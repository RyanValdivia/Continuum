import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ServerConfig } from "@/config/server-config";

const STATE_TTL_MS = 10 * 60 * 1000;

type StatePayload = { organizationId: string; userId: string; ts: number };

function sign(payload: string): string {
    return createHmac("sha256", ServerConfig.betterAuthSecret)
        .update(payload)
        .digest("base64url");
}

/**
 * Signs `{organizationId, userId, ts}` into the OAuth `state` param — avoids a
 * server-side state table. The callback re-derives the signature and rejects
 * anything tampered with or older than 10 minutes. Shared by every external
 * provider integration (Notion, Microsoft 365, …).
 */
export function createOAuthState(
    organizationId: string,
    userId: string,
): string {
    const payload = Buffer.from(
        JSON.stringify({ organizationId, userId, ts: Date.now() }),
    ).toString("base64url");
    return `${payload}.${sign(payload)}`;
}

export function verifyOAuthState(state: string): StatePayload | null {
    const [payload, signature] = state.split(".");
    if (!payload || !signature) return null;

    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
        const decoded = JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8"),
        ) as StatePayload;
        if (Date.now() - decoded.ts > STATE_TTL_MS) return null;
        return decoded;
    } catch {
        return null;
    }
}
