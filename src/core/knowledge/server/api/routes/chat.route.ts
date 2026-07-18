import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
    convertToModelMessages,
    createUIMessageStreamResponse,
    streamText,
    toUIMessageStream,
    type UIMessage,
} from "ai";
import { Elysia } from "elysia";
import { z } from "zod";
import { ServerConfig } from "@/config/server-config";
import { authed } from "@/server/auth/middleware/authed";
import { requireActiveOrg } from "@/server/auth/require-active-org";
import { AppErrors, errorToResponse } from "@/server/common/responses";
import { buildSystemPrompt, latestUserText } from "../../chat/build-context";
import { searchKnowledgeService } from "../../services/search-knowledge-service";

const google = createGoogleGenerativeAI({ apiKey: ServerConfig.googleApiKey });
const CHAT_MODEL = "gemini-2.5-flash";

const chatRequestSchema = z.object({
    messages: z.array(z.unknown()),
    personId: z.string().trim().min(1).optional(),
});

const emptyResult = (query: string) => ({
    query,
    chunks: [],
    nodes: [],
    edges: [],
});

/**
 * Streaming chat over the knowledge graph. Retrieves context for the latest user
 * turn, grounds Gemini on it, and streams an AI-SDK UI message stream back to
 * `useChat`. Streaming endpoints are the one exception to the CommonResponse
 * envelope — the success path returns a raw `Response`.
 */
export const chatRoute = new Elysia().use(authed).post(
    "/chat",
    async ({ session, body, status }) => {
        const org = requireActiveOrg(session);
        if (!org.ok) return status(403, errorToResponse(org.error));

        const messages = body.messages as UIMessage[];
        const query = latestUserText(messages);
        if (!query)
            return status(
                400,
                errorToResponse(
                    AppErrors.invalidBody({ targets: ["messages"] }),
                ),
            );

        // Retrieve grounding context; a retrieval failure degrades to no context
        // rather than failing the whole turn.
        const search = await searchKnowledgeService(org.data, {
            query,
            personId: body.personId,
            limit: 8,
            hops: 1,
        });

        const result = streamText({
            model: google(CHAT_MODEL),
            system: buildSystemPrompt(
                search.ok ? search.data : emptyResult(query),
            ),
            messages: await convertToModelMessages(messages),
        });

        return createUIMessageStreamResponse({
            stream: toUIMessageStream({ stream: result.stream }),
        });
    },
    {
        authed: true,
        body: chatRequestSchema,
        detail: {
            tags: ["Knowledge"],
            summary: "Chat with the knowledge agent (streaming)",
            description:
                "Retrieval-augmented streaming chat. Grounds Gemini on the org's knowledge (optionally one person's) and streams a UI message stream for useChat.",
        },
    },
);
