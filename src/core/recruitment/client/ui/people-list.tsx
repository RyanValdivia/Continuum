"use client";

import { useState } from "react";
import type { PersonListItem } from "@/core/recruitment/domain/types";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { OffboardPersonModal } from "./offboard-person-modal";

export function PeopleList({ people }: { people: PersonListItem[] }) {
    const [offboarding, setOffboarding] = useState<PersonListItem | null>(null);

    return (
        <div className="space-y-2">
            {people.map((p) => (
                <div
                    key={p.memberId}
                    className="flex items-center justify-between rounded-lg border p-4"
                >
                    <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-muted-foreground text-sm">
                            {p.email} · {p.role}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {p.nodeType === "vacancy" ? (
                            <Badge variant="secondary">Vacante abierta</Badge>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setOffboarding(p)}
                            >
                                Marcar salida
                            </Button>
                        )}
                    </div>
                </div>
            ))}
            {offboarding && (
                <OffboardPersonModal
                    memberId={offboarding.memberId}
                    memberName={offboarding.name}
                    open
                    onOpenChange={(open) => !open && setOffboarding(null)}
                />
            )}
        </div>
    );
}
