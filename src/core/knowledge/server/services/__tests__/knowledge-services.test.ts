import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../repository/source-documents", () => ({
    upsertSourceDocument: vi.fn(),
}));
vi.mock("../../repository/chunks", () => ({
    replaceDocumentChunks: vi.fn(),
    searchChunks: vi.fn(),
}));
vi.mock("../../repository/nodes", () => ({
    insertNodes: vi.fn(),
    searchNodes: vi.fn(),
}));
vi.mock("../../repository/edges", () => ({ insertEdges: vi.fn() }));
vi.mock("../../repository/graph", () => ({
    expandGraph: vi.fn(),
    listGraph: vi.fn(),
}));

import type {
    ExtractedGraph,
    IngestDocument,
} from "@/core/knowledge/domain/types";
import type {
    ChunkRow,
    KnowledgeEdgeRow,
    KnowledgeNodeRow,
    SourceDocumentRow,
} from "@/server/drizzle/schemas/knowledge-schema";
import type { EmbedFn } from "../../embeddings/embed";
import type { ExtractFn } from "../../extract/extract";
import { replaceDocumentChunks, searchChunks } from "../../repository/chunks";
import { insertEdges } from "../../repository/edges";
import { expandGraph } from "../../repository/graph";
import { insertNodes, searchNodes } from "../../repository/nodes";
import { upsertSourceDocument } from "../../repository/source-documents";
import { ingestDocumentService } from "../ingest-document-service";
import { searchKnowledgeService } from "../search-knowledge-service";

const ORG = "org1";
const DIM = 768;
const vec = (fill = 0.1) => Array(DIM).fill(fill);

// Deterministic fakes for the injectable seams — no network, no model.
const fakeEmbed: EmbedFn = async (texts) => texts.map(() => vec());

const docRow = (over: Partial<SourceDocumentRow> = {}): SourceDocumentRow => ({
    id: "doc1",
    organizationId: ORG,
    personId: null,
    connector: "manual",
    externalId: "ext1",
    url: null,
    title: "Doc",
    contentHash: "hash",
    lastSeenAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const nodeRow = (over: Partial<KnowledgeNodeRow> = {}): KnowledgeNodeRow => ({
    id: "n_a",
    organizationId: ORG,
    personId: null,
    type: "decision",
    label: "Label",
    summary: null,
    embedding: vec(),
    sourceChunkId: null,
    origin: "sync",
    confidence: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const chunkRow = (over: Partial<ChunkRow> = {}): ChunkRow => ({
    id: "c1",
    organizationId: ORG,
    documentId: "doc1",
    personId: null,
    content: "chunk text",
    ord: 0,
    embedding: vec(),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const edgeRow = (over: Partial<KnowledgeEdgeRow> = {}): KnowledgeEdgeRow => ({
    id: "e1",
    organizationId: ORG,
    fromNodeId: "n_a",
    toNodeId: "n_b",
    type: "relates_to",
    weight: 1,
    sourceChunkId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...over,
});

const ingestInput = (over: Partial<IngestDocument> = {}): IngestDocument => ({
    connector: "manual",
    externalId: "ext1",
    title: "Doc",
    content: "We chose Postgres over Firebase for relational integrity.",
    extract: true,
    ...over,
});

describe("ingestDocumentService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(upsertSourceDocument).mockResolvedValue({
            row: docRow(),
            contentChanged: true,
        });
        vi.mocked(replaceDocumentChunks).mockImplementation(async (p) =>
            p.chunks.map((c, i) => chunkRow({ id: `c${i}`, ord: c.ord })),
        );
        vi.mocked(insertNodes).mockImplementation(async (p) =>
            p.nodes.map((n, i) =>
                nodeRow({ id: `node${i}`, type: n.type, label: n.label }),
            ),
        );
        vi.mocked(insertEdges).mockImplementation(async (p) =>
            p.edges.map((e, i) =>
                edgeRow({
                    id: `edge${i}`,
                    fromNodeId: e.fromNodeId,
                    toNodeId: e.toNodeId,
                    type: e.type,
                }),
            ),
        );
    });

    it("chunks + embeds and extracts a subgraph, dropping invalid edges", async () => {
        const fakeExtract: ExtractFn = async (): Promise<ExtractedGraph> => ({
            nodes: [
                { tempId: "t1", type: "decision", label: "Use Postgres" },
                { tempId: "t2", type: "concept", label: "Database" },
            ],
            edges: [
                { from: "t1", to: "t2", type: "relates_to" }, // valid
                { from: "t1", to: "missing", type: "references" }, // dangling → dropped
                { from: "t1", to: "t1", type: "part_of" }, // self-loop → dropped
            ],
        });

        const result = await ingestDocumentService(ORG, ingestInput(), {
            embed: fakeEmbed,
            extract: fakeExtract,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.documentId).toBe("doc1");
        expect(result.data.chunksCreated).toBe(1);
        expect(result.data.nodesCreated).toBe(2);
        expect(result.data.edgesCreated).toBe(1);

        // Only the one valid edge reaches the repository, remapped to real ids.
        const edgesArg = vi.mocked(insertEdges).mock.calls[0][0].edges;
        expect(edgesArg).toEqual([
            { fromNodeId: "node0", toNodeId: "node1", type: "relates_to" },
        ]);
    });

    it("skips extraction when extract=false", async () => {
        const fakeExtract = vi.fn<ExtractFn>();
        const result = await ingestDocumentService(
            ORG,
            ingestInput({ extract: false }),
            { embed: fakeEmbed, extract: fakeExtract },
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.nodesCreated).toBe(0);
            expect(result.data.edgesCreated).toBe(0);
        }
        expect(fakeExtract).not.toHaveBeenCalled();
        expect(insertNodes).not.toHaveBeenCalled();
    });

    it("returns INTERNAL_SERVER_ERROR when a repository throws", async () => {
        vi.mocked(replaceDocumentChunks).mockRejectedValue(
            new Error("db down"),
        );
        const result = await ingestDocumentService(ORG, ingestInput(), {
            embed: fakeEmbed,
            extract: async () => ({ nodes: [], edges: [] }),
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe("INTERNAL_SERVER_ERROR");
    });
});

describe("searchKnowledgeService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(searchChunks).mockResolvedValue([
            { row: chunkRow({ id: "c1" }), score: 0.9 },
        ]);
        vi.mocked(searchNodes).mockResolvedValue([
            { row: nodeRow({ id: "n_a" }), score: 0.8 },
        ]);
    });

    it("expands matched nodes and scores expansion-only nodes null", async () => {
        vi.mocked(expandGraph).mockResolvedValue({
            nodes: [nodeRow({ id: "n_a" }), nodeRow({ id: "n_b" })],
            edges: [edgeRow({ fromNodeId: "n_a", toNodeId: "n_b" })],
        });

        const result = await searchKnowledgeService(
            ORG,
            { query: "why postgres", limit: 8, hops: 1 },
            { embed: fakeEmbed },
        );

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.chunks).toHaveLength(1);
        expect(result.data.chunks[0].score).toBe(0.9);

        const scoreById = new Map(
            result.data.nodes.map((n) => [n.id, n.score]),
        );
        expect(scoreById.get("n_a")).toBe(0.8); // vector-matched keeps score
        expect(scoreById.get("n_b")).toBeNull(); // reached only by expansion
        expect(result.data.edges).toHaveLength(1);
    });

    it("skips graph expansion when hops=0", async () => {
        const result = await searchKnowledgeService(
            ORG,
            { query: "why postgres", limit: 8, hops: 0 },
            { embed: fakeEmbed },
        );

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.nodes).toHaveLength(1);
            expect(result.data.nodes[0].score).toBe(0.8);
            expect(result.data.edges).toHaveLength(0);
        }
        expect(expandGraph).not.toHaveBeenCalled();
    });
});
