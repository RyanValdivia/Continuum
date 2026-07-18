"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/frontend/components/ui/input";

export function GraphSearch({
    onSubmit,
}: {
    onSubmit: (query: string) => void;
}) {
    const [value, setValue] = useState("");
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(value);
            }}
            className="absolute top-4 right-4 z-10"
        >
            <div className="relative">
                <Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Buscar nodo…"
                    className="w-52 bg-background/70 pl-8 backdrop-blur"
                />
            </div>
        </form>
    );
}
