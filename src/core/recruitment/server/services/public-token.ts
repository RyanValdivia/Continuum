import "server-only";
import { randomBytes } from "node:crypto";

/** Opaque public identifier for the apply portal — never the vacancy id. */
export const generatePublicToken = (): string =>
    randomBytes(32).toString("hex");
