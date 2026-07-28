import { Elysia } from "elysia";
import { connectGithubRoute } from "./routes/connect-github.route";
import { disconnectGithubRoute } from "./routes/disconnect-github.route";
import { getGithubStatusRoute } from "./routes/get-github-status.route";
import { githubCallbackRoute } from "./routes/github-callback.route";
import { ingestGithubRoute } from "./routes/ingest-github.route";
import { listGithubReposRoute } from "./routes/list-github-repos.route";

export const githubRouter = new Elysia({ prefix: "/github" })
    .use(githubCallbackRoute)
    .use(connectGithubRoute)
    .use(getGithubStatusRoute)
    .use(disconnectGithubRoute)
    .use(listGithubReposRoute)
    .use(ingestGithubRoute);
