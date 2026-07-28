import { Elysia } from "elysia";
import { connectPlaneRoute } from "./routes/connect-plane.route";
import { disconnectPlaneRoute } from "./routes/disconnect-plane.route";
import { getPlaneStatusRoute } from "./routes/get-plane-status.route";
import { ingestPlaneRoute } from "./routes/ingest-plane.route";
import { listPlaneProjectsRoute } from "./routes/list-plane-projects.route";

export const planeRouter = new Elysia({ prefix: "/plane" })
    .use(connectPlaneRoute)
    .use(getPlaneStatusRoute)
    .use(disconnectPlaneRoute)
    .use(listPlaneProjectsRoute)
    .use(ingestPlaneRoute);
