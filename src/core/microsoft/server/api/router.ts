import { Elysia } from "elysia";
import { connectMicrosoftRoute } from "./routes/connect-microsoft.route";
import { disconnectMicrosoftRoute } from "./routes/disconnect-microsoft.route";
import { getMicrosoftStatusRoute } from "./routes/get-microsoft-status.route";
import { ingestMicrosoftFilesRoute } from "./routes/ingest-files.route";
import { ingestMicrosoftTeamsRoute } from "./routes/ingest-teams.route";
import { listMicrosoftChannelsRoute } from "./routes/list-channels.route";
import { listMicrosoftDriveItemsRoute } from "./routes/list-drive-items.route";
import { listMicrosoftSitesRoute } from "./routes/list-sites.route";
import { listMicrosoftTeamsRoute } from "./routes/list-teams.route";
import { microsoftCallbackRoute } from "./routes/microsoft-callback.route";

export const microsoftRouter = new Elysia({ prefix: "/microsoft" })
    .use(microsoftCallbackRoute)
    .use(connectMicrosoftRoute)
    .use(getMicrosoftStatusRoute)
    .use(disconnectMicrosoftRoute)
    .use(listMicrosoftSitesRoute)
    .use(listMicrosoftDriveItemsRoute)
    .use(listMicrosoftTeamsRoute)
    .use(listMicrosoftChannelsRoute)
    .use(ingestMicrosoftFilesRoute)
    .use(ingestMicrosoftTeamsRoute);
