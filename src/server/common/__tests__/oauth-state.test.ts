import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOAuthState, verifyOAuthState } from "../oauth-state";

describe("oauth-state", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("round-trips organizationId/userId", () => {
        const state = createOAuthState("org_1", "user_1");
        const decoded = verifyOAuthState(state);
        expect(decoded).toEqual({
            organizationId: "org_1",
            userId: "user_1",
            ts: expect.any(Number),
        });
    });

    it("rejects a tampered payload", () => {
        const state = createOAuthState("org_1", "user_1");
        const [, signature] = state.split(".");
        const forgedPayload = Buffer.from(
            JSON.stringify({
                organizationId: "org_evil",
                userId: "user_1",
                ts: Date.now(),
            }),
        ).toString("base64url");
        expect(verifyOAuthState(`${forgedPayload}.${signature}`)).toBeNull();
    });

    it("rejects a malformed state", () => {
        expect(verifyOAuthState("garbage")).toBeNull();
    });

    it("rejects a state older than 10 minutes", () => {
        const state = createOAuthState("org_1", "user_1");
        vi.advanceTimersByTime(11 * 60 * 1000);
        expect(verifyOAuthState(state)).toBeNull();
    });
});
