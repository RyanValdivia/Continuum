import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embedMany } from "ai";
import { ServerConfig } from "@/config/server-config";
import { EMBEDDING_DIM } from "@/server/drizzle/schemas/knowledge-schema";

export { EMBEDDING_DIM };
export const EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Gemini asymmetric retrieval task types. Documents and queries are embedded
 * with matching-but-distinct task types so query↔document similarity is
 * calibrated by the model.
 */
export type EmbedTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/**
 * The embedding seam. Services and the repository depend on this function type,
 * not on the provider — tests inject a deterministic fake, prod uses
 * {@link googleEmbed}. Output order matches input order; every vector is
 * `EMBEDDING_DIM` long and L2-normalized.
 */
export type EmbedFn = (
    texts: string[],
    taskType: EmbedTaskType,
) => Promise<number[][]>;

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });

export const googleEmbed: EmbedFn = async (texts, taskType) => {
    if (texts.length === 0) return [];

    const { embeddings } = await embedMany({
        model: google.embedding(EMBEDDING_MODEL),
        values: texts,
        providerOptions: {
            google: { outputDimensionality: EMBEDDING_DIM, taskType },
        },
    });

    return embeddings.map((vector, i) => {
        if (vector.length !== EMBEDDING_DIM) {
            throw new Error(
                `Embedding ${i} has ${vector.length} dims, expected ${EMBEDDING_DIM}. ` +
                    "Check outputDimensionality support for the model.",
            );
        }
        return normalize(vector);
    });
};

/** L2-normalize so cosine distance stays stable after dimensionality reduction. */
function normalize(vector: number[]): number[] {
    let sumSquares = 0;
    for (const value of vector) sumSquares += value * value;
    const magnitude = Math.sqrt(sumSquares);
    if (magnitude === 0) return vector;
    return vector.map((value) => value / magnitude);
}
