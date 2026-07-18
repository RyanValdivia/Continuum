import { Elysia } from "elysia";
import { connectSlackRoute } from "./routes/connect-slack.route";
import { connectSlackWorkspaceRoute } from "./routes/connect-slack-workspace.route";
import { disconnectSlackRoute } from "./routes/disconnect-slack.route";
import { disconnectSlackWorkspaceRoute } from "./routes/disconnect-slack-workspace.route";
import { getSlackStatusRoute } from "./routes/get-slack-status.route";
import { getSlackWorkspaceStatusRoute } from "./routes/get-slack-workspace-status.route";
import { listSlackChannelsRoute } from "./routes/list-slack-channels.route";
import { slackCallbackRoute } from "./routes/slack-callback.route";
import { slackEventsRoute } from "./routes/slack-events.route";
import { slackWorkspaceCallbackRoute } from "./routes/slack-workspace-callback.route";
import { syncSlackChannelRoute } from "./routes/sync-slack-channel.route";
import { toggleSlackChannelRoute } from "./routes/toggle-slack-channel.route";

export const slackRouter = new Elysia({ prefix: "/slack" })
    .use(slackCallbackRoute)
    .use(slackWorkspaceCallbackRoute)
    .use(slackEventsRoute)
    .use(connectSlackRoute)
    .use(getSlackStatusRoute)
    .use(disconnectSlackRoute)
    .use(connectSlackWorkspaceRoute)
    .use(getSlackWorkspaceStatusRoute)
    .use(disconnectSlackWorkspaceRoute)
    .use(listSlackChannelsRoute)
    .use(toggleSlackChannelRoute)
    .use(syncSlackChannelRoute);
