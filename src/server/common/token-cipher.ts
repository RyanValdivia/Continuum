import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ServerConfig } from "@/config/server-config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
    const key = Buffer.from(ServerConfig.tokenEncryptionKey, "base64");
    if (key.length !== 32) {
        throw new Error(
            "TOKEN_ENCRYPTION_KEY must decode to 32 bytes (base64 of `openssl rand -base64 32`)",
        );
    }
    return key;
}

/** Encrypts a secret (e.g. an OAuth token) for storage. Output is `iv:authTag:ciphertext`, all base64. */
export function encryptSecret(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
        iv.toString("base64"),
        authTag.toString("base64"),
        ciphertext.toString("base64"),
    ].join(":");
}

export function decryptSecret(encrypted: string): string {
    const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
        throw new Error("Malformed encrypted secret");
    }
    const decipher = createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(ciphertextB64, "base64")),
        decipher.final(),
    ]);
    return plaintext.toString("utf8");
}
