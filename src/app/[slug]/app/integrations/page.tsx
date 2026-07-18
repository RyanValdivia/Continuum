import { NotionIntegrationCard } from "@/core/notion/client/ui/notion-integration-card";

export default function IntegrationsPage() {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
            <h1 className="font-semibold text-2xl">Integraciones</h1>
            <NotionIntegrationCard />
        </div>
    );
}
