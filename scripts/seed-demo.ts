/**
 * Demo seed — a full fictional company (Nébula) so every screen shows real,
 * attributed data: accounts, members (persons), knowledge nodes + edges, a
 * vacancy from an offboarded person, and ranked candidates.
 *
 * Run: pnpm tsx --env-file=.env scripts/seed-demo.ts
 * Idempotency: skips if the org already has person nodes (re-run safe-ish).
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { ingestDocumentService } from "@/core/knowledge/server/services/ingest-document-service";
import { offboardPersonService } from "@/core/recruitment/server/services/offboard-person-service";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/drizzle/db";
import { user } from "@/server/drizzle/schemas/auth-schema";
import {
    knowledgeEdges,
    knowledgeNodes,
} from "@/server/drizzle/schemas/knowledge-schema";
import { member, organization } from "@/server/drizzle/schemas/organization-schema";
import { analysis, candidate } from "@/server/drizzle/schemas/recruitment-schema";

const ORG_NAME = "Nébula";
const ORG_SLUG = "nebula";
const PASSWORD = "Nebula2026!";

type Person = {
    name: string;
    email: string;
    role: "owner" | "admin" | "member";
    offboardAs?: string;
    docs: { title: string; content: string }[];
};

const PEOPLE: Person[] = [
    {
        name: "María Fernández",
        email: "maria@nebula.demo",
        role: "owner",
        offboardAs: "Backend Senior (Facturación)",
        docs: [
            {
                title: "Decisión: facturación por suscripción con Stripe",
                content:
                    "Decidimos migrar la facturación de pagos únicos a un modelo de suscripción mensual con Stripe Billing. El criterio fue tener ingresos recurrentes predecibles y reducir la fricción de recobro. Elegimos Stripe sobre construir un motor propio porque maneja prorrateo, reintentos de cobro fallido (dunning) y cumplimiento PCI. Regla clave: al cambiar de plan a mitad de ciclo se prorratea automáticamente y el crédito se aplica al siguiente periodo. Los webhooks de invoice.paid e invoice.payment_failed disparan el cambio de estado de la cuenta. El riesgo asumido fue el lock-in con Stripe; lo mitigamos aislando toda la lógica detrás de un puerto BillingProvider.",
            },
            {
                title: "Proceso: cierre de facturación mensual",
                content:
                    "El cierre mensual corre el día 1. Paso 1: congelar el uso del mes anterior tomando el snapshot de medidores. Paso 2: generar las invoices en Stripe para cada suscripción activa. Paso 3: conciliar las invoices emitidas contra el reporte de ingresos y marcar discrepancias. Paso 4: revisar manualmente las cuentas Enterprise (contratos con condiciones especiales). Paso 5: enviar el resumen de MRR a Finanzas. Si un cobro falla tres veces, la cuenta pasa a estado 'past_due' y se notifica al owner. Este proceso depende del snapshot de medidores; si falla, se bloquea todo el cierre.",
            },
        ],
    },
    {
        name: "Carlos Ruiz",
        email: "carlos@nebula.demo",
        role: "admin",
        docs: [
            {
                title: "Decisión: AWS ECS Fargate sobre Kubernetes",
                content:
                    "Elegimos AWS ECS con Fargate en lugar de Kubernetes (EKS) para el cómputo de contenedores. El criterio fue minimizar la carga operativa: no queríamos administrar un plano de control ni nodos. Con Fargate no gestionamos servidores y el autoscaling por tarea es suficiente para nuestra escala. Rechazamos Kubernetes porque su complejidad no se justificaba con un equipo de plataforma de una persona. Tradeoff aceptado: menos portabilidad multi-nube y menos ecosistema de herramientas. La base de datos es RDS Postgres Multi-AZ. Todo el tráfico entra por un ALB con WAF.",
            },
            {
                title: "Proceso: despliegue y rollback",
                content:
                    "El despliegue es continuo desde main. Paso 1: CI construye la imagen y la sube a ECR. Paso 2: se actualiza la task definition de ECS con la nueva imagen. Paso 3: ECS hace un despliegue rolling con health checks; si un target no pasa el health check en 3 minutos, se aborta. Rollback: se re-apunta el servicio a la task definition anterior (guardamos las últimas cinco). Las migraciones de base de datos corren antes del despliegue y deben ser retrocompatibles. Nunca se hace un cambio destructivo de esquema en el mismo release que lo usa.",
            },
        ],
    },
    {
        name: "Ana Torres",
        email: "ana@nebula.demo",
        role: "admin",
        docs: [
            {
                title: "Decisión: política de gastos y aprobaciones",
                content:
                    "Definimos umbrales de aprobación de gastos. Menos de 100 USD: cualquier miembro con su tarjeta corporativa. Entre 100 y 1000 USD: aprobación del manager. Más de 1000 USD: aprobación de Finanzas y del CEO. El criterio fue equilibrar agilidad con control. Todo gasto necesita recibo subido en menos de 7 días o se descuenta. Los proveedores recurrentes se registran como suscripciones y se revisan cada trimestre para cortar gasto muerto.",
            },
            {
                title: "Proceso: conciliación bancaria mensual",
                content:
                    "Cada mes se concilian los movimientos del banco contra la contabilidad. Paso 1: importar el extracto bancario. Paso 2: hacer match automático por monto y fecha. Paso 3: revisar manualmente los movimientos sin match. Paso 4: registrar comisiones e intereses. Paso 5: cerrar el mes y bloquear ediciones. Depende de que la facturación (María) haya cerrado primero, porque los ingresos de Stripe deben estar registrados.",
            },
        ],
    },
    {
        name: "Diego Salinas",
        email: "diego@nebula.demo",
        role: "member",
        docs: [
            {
                title: "Decisión: priorización de roadmap con RICE",
                content:
                    "Adoptamos RICE (Reach, Impact, Confidence, Effort) para priorizar el roadmap. El criterio fue tener una vara objetiva y evitar decidir por quien grita más fuerte. Reach se mide en usuarios afectados por trimestre, Impact en una escala de 0.25 a 3, Confidence en porcentaje y Effort en semanas-persona. La puntuación es (Reach × Impact × Confidence) / Effort. Rechazamos MoSCoW porque no discrimina bien entre features grandes. Las features de deuda técnica entran con un Impact mínimo garantizado para que no queden siempre al fondo.",
            },
            {
                title: "Proceso: discovery de features",
                content:
                    "Antes de construir, toda feature pasa por discovery. Paso 1: definir el problema y a quién afecta. Paso 2: entrevistar a 5 usuarios. Paso 3: escribir un one-pager con la hipótesis y la métrica de éxito. Paso 4: revisar con ingeniería la factibilidad. Paso 5: prototipo de baja fidelidad y prueba con usuarios. Solo pasa a desarrollo si la métrica de éxito es clara y medible.",
            },
        ],
    },
    {
        name: "Lucía Gómez",
        email: "lucia@nebula.demo",
        role: "member",
        docs: [
            {
                title: "Decisión: data warehouse en BigQuery",
                content:
                    "Elegimos BigQuery como data warehouse sobre Redshift y Snowflake. El criterio fue el modelo serverless y el pago por consulta, que encaja con nuestro volumen irregular. No queríamos administrar clusters. Rechazamos Snowflake por costo a nuestra escala y Redshift por la carga operativa. Los datos crudos aterrizan en una capa 'raw', se transforman con dbt en una capa 'staging' y se exponen en 'marts'. La regla es que ninguna app consulta 'raw' directamente.",
            },
            {
                title: "Proceso: pipeline de ingestión de datos",
                content:
                    "La ingestión corre cada hora. Paso 1: extraer de las fuentes (Postgres, Stripe, eventos) con Fivetran. Paso 2: cargar en la capa raw de BigQuery. Paso 3: correr los modelos dbt de staging y marts. Paso 4: correr tests de dbt; si fallan, se alerta y se detiene la promoción a marts. Paso 5: refrescar los dashboards. Depende de que las fuentes estén disponibles; si Stripe falla, se reintenta y se marca el batch como parcial.",
            },
        ],
    },
    {
        name: "Pablo Méndez",
        email: "pablo@nebula.demo",
        role: "member",
        docs: [
            {
                title: "Decisión: adoptar React Server Components",
                content:
                    "Decidimos adoptar React Server Components con Next para el frontend. El criterio fue reducir el JavaScript enviado al cliente y acercar el fetch de datos al servidor. La regla es que los componentes son server por defecto y solo se marcan 'use client' cuando necesitan estado o eventos. Rechazamos un SPA puro por el costo de hidratación y el manejo manual de caché. Tradeoff: la curva de aprendizaje del modelo servidor/cliente y el cuidado con lo que cruza la frontera de serialización.",
            },
            {
                title: "Proceso: design system y revisión de UI",
                content:
                    "Todo cambio de UI usa el design system basado en shadcn y tokens de Tailwind. Paso 1: construir con componentes existentes; si falta uno, se propone al design system. Paso 2: revisión de accesibilidad (contraste, foco, aria). Paso 3: revisión visual en claro y oscuro. Paso 4: aprobación de diseño antes de merge. La regla: nunca colores hardcodeados, siempre tokens.",
            },
        ],
    },
];

async function ensureOrg(): Promise<string> {
    const [existing] = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.slug, ORG_SLUG))
        .limit(1);
    if (existing) return existing.id;
    const id = randomUUID();
    await db.insert(organization).values({ id, name: ORG_NAME, slug: ORG_SLUG });
    return id;
}

async function ensureUser(person: Person): Promise<string> {
    const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, person.email))
        .limit(1);
    if (existing) return existing.id;
    const res = await auth.api.signUpEmail({
        body: { email: person.email, password: PASSWORD, name: person.name },
    });
    return res.user.id;
}

async function ensureMember(
    orgId: string,
    userId: string,
    role: string,
): Promise<string> {
    const [existing] = await db
        .select({ id: member.id })
        .from(member)
        .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
        .limit(1);
    if (existing) return existing.id;
    const id = randomUUID();
    await db.insert(member).values({ id, organizationId: orgId, userId, role });
    return id;
}

async function main() {
    console.log("Seeding demo org …");
    const orgId = await ensureOrg();

    // Guard against duplicate re-runs.
    const alreadyPersons = await db
        .select({ id: knowledgeNodes.id })
        .from(knowledgeNodes)
        .where(
            and(
                eq(knowledgeNodes.organizationId, orgId),
                eq(knowledgeNodes.type, "person"),
            ),
        )
        .limit(1);
    if (alreadyPersons.length > 0) {
        console.log(
            `Org "${ORG_SLUG}" already has person nodes — skipping to avoid duplicates.`,
        );
        console.log(`Accounts (password for all: ${PASSWORD}):`);
        for (const p of PEOPLE) console.log(`  ${p.email}`);
        return;
    }

    const created: { person: Person; memberId: string; userId: string }[] = [];

    for (const person of PEOPLE) {
        const userId = await ensureUser(person);
        const memberId = await ensureMember(orgId, userId, person.role);
        created.push({ person, memberId, userId });

        // Person node (id = member id — the attribution key everywhere).
        await db
            .insert(knowledgeNodes)
            .values({
                id: memberId,
                organizationId: orgId,
                type: "person",
                label: person.name,
                origin: "manual",
            })
            .onConflictDoNothing({ target: knowledgeNodes.id });

        // Ingest each doc through the real pipeline (chunks + embeddings +
        // extracted decision/process/concept nodes + edges).
        for (const [i, doc] of person.docs.entries()) {
            const result = await ingestDocumentService(orgId, {
                connector: "manual",
                externalId: `seed:${memberId}:${i}`,
                title: doc.title,
                content: doc.content,
                personId: memberId,
                extract: true,
            });
            if (result.ok) {
                console.log(
                    `  ${person.name}: "${doc.title}" → ${result.data.nodesCreated} nodes, ${result.data.edgesCreated} edges`,
                );
            } else {
                console.warn(
                    `  ${person.name}: ingest failed (${result.error.code}) — ${doc.title}`,
                );
            }
        }
    }

    // Guarantee links: connect each person node to their extracted know-how
    // nodes, so the graph is connected and connectivity is real.
    for (const { memberId } of created) {
        const nodes = await db
            .select({ id: knowledgeNodes.id })
            .from(knowledgeNodes)
            .where(
                and(
                    eq(knowledgeNodes.organizationId, orgId),
                    eq(knowledgeNodes.personId, memberId),
                    inArray(knowledgeNodes.type, [
                        "decision",
                        "process",
                        "concept",
                    ]),
                ),
            );
        if (nodes.length === 0) continue;
        await db
            .insert(knowledgeEdges)
            .values(
                nodes.map((n) => ({
                    organizationId: orgId,
                    fromNodeId: memberId,
                    toNodeId: n.id,
                    type: "relates_to" as const,
                })),
            )
            .onConflictDoNothing();
    }

    // Offboard María → her node becomes a vacancy for her replacement.
    const maria = created.find((c) => c.person.offboardAs);
    if (maria) {
        const offboard = await offboardPersonService(
            maria.userId,
            orgId,
            maria.memberId,
            { title: maria.person.offboardAs as string },
        );
        if (offboard.ok) {
            console.log(`Offboarded ${maria.person.name} → vacancy created.`);
            await seedCandidates(offboard.data.id);
        } else {
            console.warn(`Offboard failed: ${offboard.error.code}`);
        }
    }

    console.log("\n=== DEMO ACCOUNTS ===");
    console.log(`Org: ${ORG_NAME} (/${ORG_SLUG}/app)  ·  password: ${PASSWORD}`);
    for (const { person } of created) {
        console.log(`  ${person.role.padEnd(6)}  ${person.email}  (${person.name})`);
    }
    console.log("Done.");
}

async function seedCandidates(vacancyId: string) {
    const cands = [
        {
            name: "Sofía Herrera",
            email: "sofia.candidata@example.com",
            score: 86,
            summary:
                "Fuerte en facturación y Stripe; buen criterio de arquitectura. Le falta profundidad en cierres contables.",
            dimensions: [
                { name: "Dominio de facturación", score: 90, strengths: ["Stripe Billing", "prorrateo"], gaps: [] },
                { name: "Procesos", score: 82, strengths: ["cierre mensual"], gaps: ["conciliación"] },
                { name: "Criterio de arquitectura", score: 85, strengths: ["aislar proveedor"], gaps: [] },
            ],
            questions: [
                { question: "¿Cómo manejarías dunning de cobros fallidos?", measures: "Dominio de facturación" },
                { question: "Describe un cierre mensual que hayas liderado.", measures: "Procesos" },
                { question: "¿Cuándo construir vs. comprar un motor de billing?", measures: "Criterio de arquitectura" },
            ],
        },
        {
            name: "Andrés Molina",
            email: "andres.candidato@example.com",
            score: 63,
            summary:
                "Backend sólido pero poca experiencia específica en facturación por suscripción.",
            dimensions: [
                { name: "Dominio de facturación", score: 45, strengths: [], gaps: ["sin Stripe Billing", "sin prorrateo"] },
                { name: "Procesos", score: 70, strengths: ["pipelines"], gaps: ["cierre contable"] },
                { name: "Criterio de arquitectura", score: 75, strengths: ["puertos y adaptadores"], gaps: [] },
            ],
            questions: [
                { question: "¿Cómo aprenderías el dominio de facturación rápido?", measures: "Dominio de facturación" },
                { question: "¿Qué proceso de cierre implementarías desde cero?", measures: "Procesos" },
            ],
        },
        {
            name: "Valentina Ríos",
            email: "valentina.candidata@example.com",
            score: 74,
            summary:
                "Buen balance; experiencia en fintech pero con otro stack de pagos.",
            dimensions: [
                { name: "Dominio de facturación", score: 78, strengths: ["fintech", "pagos"], gaps: ["no Stripe"] },
                { name: "Procesos", score: 72, strengths: ["conciliación"], gaps: [] },
                { name: "Criterio de arquitectura", score: 70, strengths: [], gaps: ["escala"] },
            ],
            questions: [
                { question: "Compara tu stack de pagos con Stripe Billing.", measures: "Dominio de facturación" },
                { question: "¿Cómo garantizas una conciliación correcta?", measures: "Procesos" },
            ],
        },
    ];

    for (const c of cands) {
        const candidateId = randomUUID();
        await db.insert(candidate).values({
            id: candidateId,
            vacancyId,
            name: c.name,
            email: c.email,
            cvFilename: `${c.name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
            cvText: `CV de ${c.name}. ${c.summary}`,
            profile: {
                plainText: `CV de ${c.name}. ${c.summary}`,
                summary: c.summary,
                skills: c.dimensions.flatMap((d) => d.strengths).slice(0, 8),
                yearsOfExperience: 6,
                experience: [],
            },
            status: "analyzed",
        });
        await db.insert(analysis).values({
            candidateId,
            score: c.score,
            dimensions: c.dimensions,
            summary: c.summary,
            interviewQuestions: c.questions,
        });
    }
    console.log(`Seeded ${cands.length} candidates for the vacancy.`);
}

await main();
process.exit(0);
