import type { z } from "zod";
import type {
    ingestMicrosoftFilesSchema,
    ingestMicrosoftTeamsSchema,
    microsoftCallbackQuerySchema,
    microsoftChannelSchema,
    microsoftChannelsSchema,
    microsoftConnectionSchema,
    microsoftDriveItemSchema,
    microsoftDriveItemsSchema,
    microsoftIngestResultSchema,
    microsoftSiteSchema,
    microsoftSitesSchema,
    microsoftStatusSchema,
    microsoftTeamSchema,
    microsoftTeamsSchema,
} from "./schemas";

export type MicrosoftConnection = z.infer<typeof microsoftConnectionSchema>;
export type MicrosoftStatus = z.infer<typeof microsoftStatusSchema>;
export type MicrosoftCallbackQuery = z.infer<
    typeof microsoftCallbackQuerySchema
>;
export type MicrosoftSite = z.infer<typeof microsoftSiteSchema>;
export type MicrosoftSites = z.infer<typeof microsoftSitesSchema>;
export type MicrosoftDriveItem = z.infer<typeof microsoftDriveItemSchema>;
export type MicrosoftDriveItems = z.infer<typeof microsoftDriveItemsSchema>;
export type MicrosoftTeam = z.infer<typeof microsoftTeamSchema>;
export type MicrosoftTeams = z.infer<typeof microsoftTeamsSchema>;
export type MicrosoftChannel = z.infer<typeof microsoftChannelSchema>;
export type MicrosoftChannels = z.infer<typeof microsoftChannelsSchema>;
export type IngestMicrosoftFiles = z.infer<typeof ingestMicrosoftFilesSchema>;
export type IngestMicrosoftTeams = z.infer<typeof ingestMicrosoftTeamsSchema>;
export type MicrosoftIngestResult = z.infer<typeof microsoftIngestResultSchema>;
