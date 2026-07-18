import { Elysia } from "elysia";
import { connectMicrosoftRoute } from "./routes/connect-microsoft.route";
import { connectMicrosoftIdentityRoute } from "./routes/connect-microsoft-identity.route";
import { disconnectMicrosoftRoute } from "./routes/disconnect-microsoft.route";
import { disconnectMicrosoftIdentityRoute } from "./routes/disconnect-microsoft-identity.route";
import { getMicrosoftIdentityStatusRoute } from "./routes/get-microsoft-identity-status.route";
import { getMicrosoftStatusRoute } from "./routes/get-microsoft-status.route";
import { ingestMicrosoftFilesRoute } from "./routes/ingest-files.route";
import { ingestMicrosoftTeamsRoute } from "./routes/ingest-teams.route";
import { listMicrosoftChannelsRoute } from "./routes/list-channels.route";
import { listMicrosoftDriveItemsRoute } from "./routes/list-drive-items.route";
import { listMicrosoftSitesRoute } from "./routes/list-sites.route";
import { listMicrosoftTeamsRoute } from "./routes/list-teams.route";
import { microsoftCallbackRoute } from "./routes/microsoft-callback.route";
import { microsoftIdentityCallbackRoute } from "./routes/microsoft-identity-callback.route";

export const microsoftRouter = new Elysia({ prefix: "/microsoft" })
    .use(microsoftCallbackRoute)
    .use(microsoftIdentityCallbackRoute)
    .use(connectMicrosoftRoute)
    .use(connectMicrosoftIdentityRoute)
    .use(getMicrosoftStatusRoute)
    .use(getMicrosoftIdentityStatusRoute)
    .use(disconnectMicrosoftRoute)
    .use(disconnectMicrosoftIdentityRoute)
    .use(listMicrosoftSitesRoute)
    .use(listMicrosoftDriveItemsRoute)
    .use(listMicrosoftTeamsRoute)
    .use(listMicrosoftChannelsRoute)
    .use(ingestMicrosoftFilesRoute)
    .use(ingestMicrosoftTeamsRoute);
