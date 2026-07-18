import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySlackSignature } from "../verify-signature";

const SECRET = "test-signing-secret";

function sign(timestamp: string, body: string): string {
    return `v0=${createHmac("sha256", SECRET).update(`v0:${timestamp}:${body}`).digest("hex")}`;
}

describe("verifySlackSignature", () => {
    it("accepts a correctly signed, fresh request", () => {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const rawBody = '{"type":"event_callback"}';
        const signature = sign(timestamp, rawBody);

        expect(
            verifySlackSignature({
                signingSecret: SECRET,
                signature,
                timestamp,
                rawBody,
            }),
        ).toBe(true);
    });

    it("rejects a signature signed with the wrong secret", () => {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const rawBody = '{"type":"event_callback"}';
        const wrongSignature = `v0=${createHmac("sha256", "wrong-secret").update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;

        expect(
            verifySlackSignature({
                signingSecret: SECRET,
                signature: wrongSignature,
                timestamp,
                rawBody,
            }),
        ).toBe(false);
    });

    it("rejects a tampered body", () => {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = sign(timestamp, '{"type":"event_callback"}');

        expect(
            verifySlackSignature({
                signingSecret: SECRET,
                signature,
                timestamp,
                rawBody: '{"type":"evil_payload"}',
            }),
        ).toBe(false);
    });

    it("rejects a stale timestamp (replay protection)", () => {
        const staleTimestamp = String(
            Math.floor(Date.now() / 1000) - 10 * 60,
        );
        const rawBody = "{}";
        const signature = sign(staleTimestamp, rawBody);

        expect(
            verifySlackSignature({
                signingSecret: SECRET,
                signature,
                timestamp: staleTimestamp,
                rawBody,
            }),
        ).toBe(false);
    });

    it("rejects missing signature or timestamp", () => {
        expect(
            verifySlackSignature({
                signingSecret: SECRET,
                signature: null,
                timestamp: "123",
                rawBody: "{}",
            }),
        ).toBe(false);
        expect(
            verifySlackSignature({
                signingSecret: SECRET,
                signature: "v0=abc",
                timestamp: null,
                rawBody: "{}",
            }),
        ).toBe(false);
    });
});
