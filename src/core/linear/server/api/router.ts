import { Elysia } from "elysia";
import { connectLinearRoute } from "./routes/connect-linear.route";
import { disconnectLinearRoute } from "./routes/disconnect-linear.route";
import { getLinearStatusRoute } from "./routes/get-linear-status.route";
import { ingestLinearRoute } from "./routes/ingest-linear.route";
import { linearCallbackRoute } from "./routes/linear-callback.route";
import { listLinearIssuesRoute } from "./routes/list-linear-issues.route";

export const linearRouter = new Elysia({ prefix: "/linear" })
    .use(linearCallbackRoute)
    .use(connectLinearRoute)
    .use(getLinearStatusRoute)
    .use(disconnectLinearRoute)
    .use(listLinearIssuesRoute)
    .use(ingestLinearRoute);
