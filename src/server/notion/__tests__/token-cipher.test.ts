import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../token-cipher";

describe("token-cipher", () => {
    it("round-trips a plaintext secret", () => {
        const encrypted = encryptSecret("secret_access_token_value");
        expect(encrypted).not.toContain("secret_access_token_value");
        expect(decryptSecret(encrypted)).toBe("secret_access_token_value");
    });

    it("produces a different ciphertext each time (random IV)", () => {
        const a = encryptSecret("same-plaintext");
        const b = encryptSecret("same-plaintext");
        expect(a).not.toBe(b);
    });

    it("throws when the ciphertext has been tampered with", () => {
        const encrypted = encryptSecret("secret");
        const [iv, tag, ciphertext] = encrypted.split(":");
        const tampered = [iv, tag, `${ciphertext.slice(0, -2)}zz`].join(":");
        expect(() => decryptSecret(tampered)).toThrow();
    });

    it("throws on a malformed encrypted string", () => {
        expect(() => decryptSecret("not-a-valid-payload")).toThrow();
    });
});
