import { GithubIntegrationCard } from "@/core/github/client/ui/github-integration-card";
import { LinearIntegrationCard } from "@/core/linear/client/ui/linear-integration-card";
import { MicrosoftIdentityCard } from "@/core/microsoft/client/ui/microsoft-identity-card";
import { MicrosoftIntegrationCard } from "@/core/microsoft/client/ui/microsoft-integration-card";
import { NotionIntegrationCard } from "@/core/notion/client/ui/notion-integration-card";
import { PlaneIntegrationCard } from "@/core/plane/client/ui/plane-integration-card";
import { SlackIntegrationCard } from "@/core/slack/client/ui/slack-integration-card";
import { SlackWorkspaceCard } from "@/core/slack/client/ui/slack-workspace-card";

export default function IntegrationsPage() {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <h1 className="font-semibold text-2xl">Integraciones</h1>
            <NotionIntegrationCard />
            <MicrosoftIntegrationCard />
            <MicrosoftIdentityCard />
            <SlackIntegrationCard />
            <SlackWorkspaceCard />
            <GithubIntegrationCard />
            <LinearIntegrationCard />
            <PlaneIntegrationCard />
        </div>
    );
}
