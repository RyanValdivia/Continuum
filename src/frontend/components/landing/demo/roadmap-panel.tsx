import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PUESTOS, type PuestoId } from "./graph-data";

const COLUMNS = ["Etapa", "Qué dominar", "Basado en", "Resultado"];

export function RoadmapPanel({ selected }: { selected: PuestoId | null }) {
    const reduce = useReducedMotion();
    const def = selected ? PUESTOS[selected] : null;

    return (
        <div className="mt-6">
            <AnimatePresence mode="wait">
                {def ? (
                    <motion.div
                        key={selected}
                        initial={reduce ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -8 }}
                        transition={{
                            duration: 0.35,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                    >
                        <div className="flex items-baseline justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-foreground text-lg tracking-tight">
                                    Roadmap de onboarding · {def.label}
                                </h3>
                                <p className="mt-1 text-muted-foreground text-sm">
                                    El output de Continuum: qué dominar para
                                    ocupar este puesto.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-xl border border-border/70">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-border/70 border-b bg-muted/40 text-muted-foreground">
                                            {COLUMNS.map((col) => (
                                                <th
                                                    key={col}
                                                    className="px-4 py-3 font-medium"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {def.roadmap.map((row) => (
                                            <tr
                                                key={row.etapa}
                                                className="border-border/60 border-b last:border-0"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">
                                                    {row.etapa}
                                                </td>
                                                <td className="px-4 py-3 text-foreground">
                                                    {row.foco}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {row.base}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {row.resultado}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.p
                        key="placeholder"
                        initial={false}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-border/60 border-dashed bg-muted/20 px-5 py-8 text-center text-muted-foreground text-sm"
                    >
                        Haz clic en un puesto para ver su roadmap de onboarding
                        — el output de Continuum.
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
