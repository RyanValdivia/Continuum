import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNotionOAuthState, verifyNotionOAuthState } from "../oauth-state";

describe("oauth-state", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("round-trips organizationId/userId", () => {
        const state = createNotionOAuthState("org_1", "user_1");
        const decoded = verifyNotionOAuthState(state);
        expect(decoded).toEqual({
            organizationId: "org_1",
            userId: "user_1",
            ts: expect.any(Number),
        });
    });

    it("rejects a tampered payload", () => {
        const state = createNotionOAuthState("org_1", "user_1");
        const [, signature] = state.split(".");
        const forgedPayload = Buffer.from(
            JSON.stringify({ organizationId: "org_evil", userId: "user_1", ts: Date.now() }),
        ).toString("base64url");
        expect(verifyNotionOAuthState(`${forgedPayload}.${signature}`)).toBeNull();
    });

    it("rejects a malformed state", () => {
        expect(verifyNotionOAuthState("garbage")).toBeNull();
    });

    it("rejects a state older than 10 minutes", () => {
        const state = createNotionOAuthState("org_1", "user_1");
        vi.advanceTimersByTime(11 * 60 * 1000);
        expect(verifyNotionOAuthState(state)).toBeNull();
    });
});
