import type { z } from "zod";
import type {
    slackChannelSchema,
    slackChannelsResponseSchema,
    slackConnectionSchema,
    slackIdentitySchema,
    slackStatusSchema,
    slackWorkspaceStatusSchema,
    syncSlackChannelResultSchema,
    toggleSlackChannelSchema,
} from "./schemas";

export type SlackIdentity = z.infer<typeof slackIdentitySchema>;
export type SlackStatus = z.infer<typeof slackStatusSchema>;
export type SlackConnection = z.infer<typeof slackConnectionSchema>;
export type SlackWorkspaceStatus = z.infer<typeof slackWorkspaceStatusSchema>;
export type SlackChannel = z.infer<typeof slackChannelSchema>;
export type SlackChannelsResponse = z.infer<typeof slackChannelsResponseSchema>;
export type ToggleSlackChannel = z.infer<typeof toggleSlackChannelSchema>;
export type SyncSlackChannelResult = z.infer<
    typeof syncSlackChannelResultSchema
>;
