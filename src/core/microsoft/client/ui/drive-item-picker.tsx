"use client";

import { ChevronRight, FileText, Folder } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMicrosoft } from "@/core/microsoft/client/hooks";
import { classifyDriveItem } from "@/core/microsoft/domain/source-plan";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/frontend/components/ui/select";
import { Skeleton } from "@/frontend/components/ui/skeleton";

type SelectedFile = { driveId: string; itemId: string; name: string };

/**
 * Browse SharePoint sites / OneDrive and pick files to ingest. Folders are
 * drilled into (a breadcrumb stack); files toggle a selection that survives
 * navigation, since knowledge tends to be scattered across folders.
 */
export function DriveItemPicker({
    organizationId,
}: {
    organizationId: string;
}) {
    const { useSites, useDriveItems, useIngestFiles } =
        useMicrosoft(organizationId);
    const sites = useSites();
    const ingest = useIngestFiles();

    const [driveId, setDriveId] = useState<string>("");
    const [folderStack, setFolderStack] = useState<
        { id: string; name: string }[]
    >([]);
    const [selected, setSelected] = useState<Map<string, SelectedFile>>(
        new Map(),
    );

    const currentFolder = folderStack[folderStack.length - 1];
    const items = useDriveItems(driveId, currentFolder?.id);
    const driveItems = items.data?.response.items ?? [];
    const siteList = sites.data?.response.items ?? [];

    const selectDrive = (next: string) => {
        setDriveId(next);
        setFolderStack([]);
    };

    const toggleFile = (file: SelectedFile, checked: boolean) => {
        const key = `${file.driveId}:${file.itemId}`;
        const next = new Map(selected);
        if (checked) next.set(key, file);
        else next.delete(key);
        setSelected(next);
    };

    const runIngest = () => {
        ingest.mutate(
            { items: [...selected.values()] },
            {
                onSuccess: (res) => {
                    const { response } = res as {
                        response: { ingested: number; failed: number };
                    };
                    toast.success(
                        `Ingestados ${response.ingested} archivo${response.ingested === 1 ? "" : "s"} al grafo` +
                            (response.failed
                                ? ` · ${response.failed} con error`
                                : ""),
                    );
                    setSelected(new Map());
                },
                onError: () => toast.error("Falló la ingesta de archivos"),
            },
        );
    };

    if (sites.isPending) return <Skeleton className="h-24 w-full" />;

    if (sites.error) {
        return (
            <p className="text-muted-foreground text-sm">
                No se pudieron cargar los sitios de SharePoint.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3 pt-3">
            <div className="flex items-center gap-2">
                <Select value={driveId} onValueChange={selectDrive}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegí un sitio o OneDrive" />
                    </SelectTrigger>
                    <SelectContent>
                        {siteList.map((site) => (
                            <SelectItem key={site.driveId} value={site.driveId}>
                                {site.displayName}
                                {site.kind === "onedrive" ? " (OneDrive)" : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    size="sm"
                    onClick={runIngest}
                    disabled={ingest.isPending || selected.size === 0}
                >
                    {ingest.isPending
                        ? "Ingestando…"
                        : `Ingestar ${selected.size}`}
                </Button>
            </div>

            {driveId ? (
                <>
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <button
                            type="button"
                            className="hover:underline"
                            onClick={() => setFolderStack([])}
                        >
                            Raíz
                        </button>
                        {folderStack.map((folder, index) => (
                            <span
                                key={folder.id}
                                className="flex items-center gap-1"
                            >
                                <ChevronRight className="size-3" />
                                <button
                                    type="button"
                                    className="hover:underline"
                                    onClick={() =>
                                        setFolderStack(
                                            folderStack.slice(0, index + 1),
                                        )
                                    }
                                >
                                    {folder.name}
                                </button>
                            </span>
                        ))}
                    </div>

                    {items.isPending ? (
                        <Skeleton className="h-24 w-full" />
                    ) : driveItems.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Carpeta vacía.
                        </p>
                    ) : (
                        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                            {driveItems.map((item) => {
                                if (item.isFolder) {
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                                                onClick={() =>
                                                    setFolderStack([
                                                        ...folderStack,
                                                        {
                                                            id: item.id,
                                                            name: item.name,
                                                        },
                                                    ])
                                                }
                                            >
                                                <Folder className="size-4 text-muted-foreground" />
                                                {item.name}
                                            </button>
                                        </li>
                                    );
                                }
                                const kind = classifyDriveItem(
                                    item.name,
                                    item.mimeType,
                                );
                                const key = `${driveId}:${item.id}`;
                                return (
                                    <li
                                        key={item.id}
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                                    >
                                        <Checkbox
                                            checked={selected.has(key)}
                                            disabled={!kind}
                                            onCheckedChange={(checked) =>
                                                toggleFile(
                                                    {
                                                        driveId,
                                                        itemId: item.id,
                                                        name: item.name,
                                                    },
                                                    checked === true,
                                                )
                                            }
                                        />
                                        <FileText className="size-4 text-muted-foreground" />
                                        <span
                                            className={
                                                kind
                                                    ? ""
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {item.name}
                                        </span>
                                        {!kind && (
                                            <Badge variant="secondary">
                                                no soportado
                                            </Badge>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            ) : (
                <p className="text-muted-foreground text-sm">
                    Elegí una ubicación para ver sus archivos. Formatos
                    soportados: texto (md, txt, csv, html, json, xml) y Office
                    (docx, pptx, xlsx).
                </p>
            )}
        </div>
    );
}
