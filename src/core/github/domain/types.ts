import type { z } from "zod";
import type {
    githubConnectionSchema,
    githubIngestResultSchema,
    githubRepoSchema,
    githubReposSchema,
    githubStatusSchema,
    ingestGithubSchema,
} from "./schemas";

export type GithubConnection = z.infer<typeof githubConnectionSchema>;
export type GithubStatus = z.infer<typeof githubStatusSchema>;
export type GithubRepo = z.infer<typeof githubRepoSchema>;
export type GithubRepos = z.infer<typeof githubReposSchema>;
export type IngestGithub = z.infer<typeof ingestGithubSchema>;
export type GithubIngestResult = z.infer<typeof githubIngestResultSchema>;
