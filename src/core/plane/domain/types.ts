import type { z } from "zod";
import type {
    connectPlaneSchema,
    ingestPlaneSchema,
    planeConnectionSchema,
    planeIngestResultSchema,
    planeProjectSchema,
    planeProjectsSchema,
    planeStatusSchema,
} from "./schemas";

export type PlaneConnection = z.infer<typeof planeConnectionSchema>;
export type PlaneStatus = z.infer<typeof planeStatusSchema>;
export type ConnectPlane = z.infer<typeof connectPlaneSchema>;
export type PlaneProject = z.infer<typeof planeProjectSchema>;
export type PlaneProjects = z.infer<typeof planeProjectsSchema>;
export type IngestPlane = z.infer<typeof ingestPlaneSchema>;
export type PlaneIngestResult = z.infer<typeof planeIngestResultSchema>;
