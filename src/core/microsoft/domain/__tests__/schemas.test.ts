import { describe, expect, it } from "vitest";
import {
    ingestMicrosoftFilesSchema,
    ingestMicrosoftTeamsSchema,
    microsoftCallbackQuerySchema,
    microsoftConnectionSchema,
    microsoftStatusSchema,
} from "../schemas";

describe("microsoftConnectionSchema", () => {
    it("never exposes tokens", () => {
        const parsed = microsoftConnectionSchema.parse({
            id: "c1",
            organizationId: "org1",
            tenantId: "tenant-1",
            connectedByUserId: "user-1",
            tokenExpiresAt: "2026-07-18T15:00:00.000Z",
            createdAt: "2026-07-18T14:00:00.000Z",
            updatedAt: "2026-07-18T14:00:00.000Z",
        });
        expect(parsed).not.toHaveProperty("accessToken");
        expect(parsed).not.toHaveProperty("refreshToken");
    });
});

describe("microsoftStatusSchema", () => {
    it("accepts a disconnected status", () => {
        const parsed = microsoftStatusSchema.parse({
            configured: false,
            connected: false,
            connection: null,
        });
        expect(parsed.connected).toBe(false);
    });
});

describe("microsoftCallbackQuerySchema", () => {
    it("requires state and allows an oauth error without code", () => {
        expect(
            microsoftCallbackQuerySchema.safeParse({
                state: "s",
                error: "access_denied",
            }).success,
        ).toBe(true);
        expect(
            microsoftCallbackQuerySchema.safeParse({ code: "c" }).success,
        ).toBe(false);
    });
});

describe("ingestMicrosoftFilesSchema", () => {
    it("accepts a batch of drive items", () => {
        const parsed = ingestMicrosoftFilesSchema.parse({
            items: [{ driveId: "d1", itemId: "i1" }],
        });
        expect(parsed.items).toHaveLength(1);
    });

    it("rejects an empty batch and blank ids", () => {
        expect(
            ingestMicrosoftFilesSchema.safeParse({ items: [] }).success,
        ).toBe(false);
        expect(
            ingestMicrosoftFilesSchema.safeParse({
                items: [{ driveId: "  ", itemId: "i1" }],
            }).success,
        ).toBe(false);
    });
});

describe("ingestMicrosoftTeamsSchema", () => {
    it("accepts channels with a supported window", () => {
        const parsed = ingestMicrosoftTeamsSchema.parse({
            channels: [{ teamId: "t1", channelId: "c1" }],
            sinceDays: 30,
        });
        expect(parsed.sinceDays).toBe(30);
    });

    it("rejects an unsupported window", () => {
        expect(
            ingestMicrosoftTeamsSchema.safeParse({
                channels: [{ teamId: "t1", channelId: "c1" }],
                sinceDays: 45,
            }).success,
        ).toBe(false);
    });

    it("rejects an empty channel selection", () => {
        expect(
            ingestMicrosoftTeamsSchema.safeParse({
                channels: [],
                sinceDays: 7,
            }).success,
        ).toBe(false);
    });
});
