import { describe, expect, it } from "vitest";
import {
    classifyDriveItem,
    spExternalId,
    teamsChannelExternalId,
    teamsUserExternalId,
    truncateContent,
} from "../source-plan";

describe("classifyDriveItem", () => {
    it("classifies text-like files by extension", () => {
        expect(classifyDriveItem("runbook.md", null)).toBe("text");
        expect(classifyDriveItem("data.csv", "text/csv")).toBe("text");
        expect(classifyDriveItem("page.HTML", null)).toBe("text");
    });

    it("classifies office files by extension and mime", () => {
        expect(classifyDriveItem("report.docx", null)).toBe("office");
        expect(
            classifyDriveItem(
                "slides",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ),
        ).toBe("office");
    });

    it("returns null for unsupported files", () => {
        expect(classifyDriveItem("photo.png", "image/png")).toBeNull();
        expect(classifyDriveItem("archive.zip", null)).toBeNull();
    });
});

describe("truncateContent", () => {
    it("leaves short content alone and caps long content", () => {
        expect(truncateContent("abc")).toBe("abc");
        expect(truncateContent("x".repeat(500_000))).toHaveLength(480_000);
    });
});

describe("externalId builders", () => {
    it("builds stable ids per source", () => {
        expect(spExternalId("d1", "i1")).toBe("sp:d1:i1");
        expect(teamsChannelExternalId("t1", "c1", 30)).toBe("teams:t1:c1:w30");
        expect(teamsUserExternalId("t1", "c1", 0, "jane@corp.com")).toBe(
            "teams:t1:c1:w0:user:jane@corp.com",
        );
    });
});
