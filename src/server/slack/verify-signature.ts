import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 60 * 5;

/**
 * Verifies Slack's Events API request signature (`X-Slack-Signature` /
 * `X-Slack-Request-Timestamp`) against the raw body, per Slack's spec:
 * `v0={HMAC-SHA256(signingSecret, "v0:{timestamp}:{rawBody}")}`. Rejects
 * stale timestamps to block replay of a captured request.
 */
export function verifySlackSignature(params: {
    signingSecret: string;
    signature: string | null;
    timestamp: string | null;
    rawBody: string;
}): boolean {
    const { signingSecret, signature, timestamp, rawBody } = params;
    if (!signature || !timestamp) return false;

    const timestampSeconds = Number(timestamp);
    if (
        !Number.isFinite(timestampSeconds) ||
        Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS
    ) {
        return false;
    }

    const base = `v0:${timestamp}:${rawBody}`;
    const expected = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
}
