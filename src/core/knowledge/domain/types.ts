import type { z } from "zod";
import type {
    chunkSchema,
    connectorSchema,
    edgeSchema,
    edgeTypeSchema,
    extractedGraphSchema,
    graphNodeSchema,
    graphQuerySchema,
    graphSchema,
    ingestDocumentSchema,
    ingestResultSchema,
    knowledgeGraphNodeSchema,
    nodeOriginSchema,
    nodeSchema,
    nodeTypeSchema,
    personGraphNodeSchema,
    scoredChunkSchema,
    scoredNodeSchema,
    searchKnowledgeSchema,
    searchResultSchema,
    sourceDocumentSchema,
} from "./schemas";

export type Connector = z.infer<typeof connectorSchema>;
export type NodeType = z.infer<typeof nodeTypeSchema>;
export type NodeOrigin = z.infer<typeof nodeOriginSchema>;
export type EdgeType = z.infer<typeof edgeTypeSchema>;

export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type Chunk = z.infer<typeof chunkSchema>;
export type KnowledgeNode = z.infer<typeof nodeSchema>;
export type KnowledgeEdge = z.infer<typeof edgeSchema>;

export type IngestDocument = z.infer<typeof ingestDocumentSchema>;
export type IngestResult = z.infer<typeof ingestResultSchema>;

export type SearchKnowledge = z.infer<typeof searchKnowledgeSchema>;
export type ScoredChunk = z.infer<typeof scoredChunkSchema>;
export type ScoredNode = z.infer<typeof scoredNodeSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;

export type GraphQuery = z.infer<typeof graphQuerySchema>;
export type PersonGraphNode = z.infer<typeof personGraphNodeSchema>;
export type KnowledgeGraphNode = z.infer<typeof knowledgeGraphNodeSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type Graph = z.infer<typeof graphSchema>;

export type ExtractedGraph = z.infer<typeof extractedGraphSchema>;
