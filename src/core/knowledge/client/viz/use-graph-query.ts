"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { graphSchema } from "@/core/knowledge/domain/schemas";
import { toVizGraph, type VizGraph } from "./graph-viz";

const envelopeSchema = z.object({
    response: graphSchema,
    code: z.literal("OK"),
    status: z.literal(200),
});

async function fetchGraph(personId?: string | null): Promise<VizGraph> {
    const params = new URLSearchParams({ limit: "200" });
    if (personId) params.set("personId", personId);
    const res = await fetch(`/api/v1/knowledge/graph?${params.toString()}`, {
        headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`graph fetch failed: ${res.status}`);
    const json = await res.json();
    return toVizGraph(envelopeSchema.parse(json).response);
}

/**
 * Fetch one bounded slice of the org's knowledge graph as a view-model.
 * `personId` is passed to the server only to shrink the payload; further
 * client-side person filtering still happens in the explorer.
 */
export function useGraphQuery(personId?: string | null) {
    const query = useQuery({
        queryKey: ["knowledge-graph", personId ?? null],
        queryFn: () => fetchGraph(personId),
        // Global default has throwOnError:true; opt out so we render our own error UI.
        throwOnError: false,
    });
    return {
        data: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
    };
}
