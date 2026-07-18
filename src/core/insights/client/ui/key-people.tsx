import Link from "next/link";
import type { KeyPerson } from "@/core/insights/domain/types";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/frontend/components/ui/card";

/** Members and how much of their knowledge the graph has captured. Each row
 *  links to the person's profile (pantalla 2). */
export function KeyPeople({
    people,
    slug,
}: {
    people: KeyPerson[];
    slug: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Gente clave</CardTitle>
            </CardHeader>
            <CardContent>
                {people.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aún no hay miembros en la organización.
                    </p>
                ) : (
                    <ul className="grid gap-1">
                        {people.map((person) => {
                            const captured = person.nodeCount > 0;
                            return (
                                <li key={person.memberId}>
                                    <Link
                                        href={`/${slug}/app/people/${person.memberId}`}
                                        className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-sm">
                                                {person.name}
                                            </p>
                                            <p className="truncate text-muted-foreground text-xs">
                                                {person.email}
                                            </p>
                                        </div>
                                        <span
                                            className={
                                                captured
                                                    ? "shrink-0 text-muted-foreground text-xs tabular-nums"
                                                    : "shrink-0 text-red-500 text-xs"
                                            }
                                        >
                                            {captured
                                                ? `${person.nodeCount} nodos · ${person.exclusiveCount} exclusivos`
                                                : "⚠ sin capturar"}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
