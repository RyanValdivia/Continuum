import { Elysia } from "elysia";
import { connectNotionRoute } from "./routes/connect-notion.route";
import { disconnectNotionRoute } from "./routes/disconnect-notion.route";
import { getNotionStatusRoute } from "./routes/get-notion-status.route";
import { listNotionPagesRoute } from "./routes/list-notion-pages.route";
import { notionCallbackRoute } from "./routes/notion-callback.route";

export const notionRouter = new Elysia({ prefix: "/notion" })
    .use(notionCallbackRoute)
    .use(connectNotionRoute)
    .use(getNotionStatusRoute)
    .use(disconnectNotionRoute)
    .use(listNotionPagesRoute);
