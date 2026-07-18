# Continuum

> **La memoria viva de la empresa.** Plataforma de **continuidad del
> conocimiento** — un **grafo de conocimiento** + **un agente de IA por
> persona**. Menos búsqueda, más continuidad.

Continuum no es otro chatbot. Preserva el **criterio** y la **experiencia** de
cada persona — no solo sus documentos. Cuando alguien clave se va, queda un
agente que entiende y explica su trabajo, acelerando el onboarding y
sosteniendo la continuidad operativa.

## La idea

Cuando alguien clave se va de la empresa, su conocimiento se va con esa persona.
Por más documentos que tengas, no se captura el contexto, el criterio ni la
experiencia. El reemplazo es **lento**, **costoso** y **dependiente** de los que
quedan.

Continuum llena ese hueco: modela **cómo trabaja realmente cada persona**, cómo
toma decisiones y cómo transmite su conocimiento a través de su agente.

### Cómo funciona

- **Grafo de conocimiento** — conecta personas, decisiones, procesos y contexto, no archivos sueltos.
- **Un agente por persona** — cada agente modela el criterio y la experiencia de quien representa.
- **Transferencia de conocimiento** — el agente entiende y explica el trabajo, acelera el onboarding y sostiene la continuidad cuando alguien sale.

### Competencia

| Categoría | Herramientas | Qué les falta |
|-----------|--------------|---------------|
| Búsqueda empresarial | Glean, M365 Copilot | No preservan criterio ni experiencia |
| Documentación | Guru, Notion, Confluence | Documentan, no modelan cómo trabaja la persona |
| Gestión de tareas | Asana, ClickUp | No capturan el conocimiento operativo |

Ninguna está pensada para **preservar y transferir el conocimiento operativo de
cada persona**. Ahí está el hueco que llena Continuum.

---

## Detalles técnicos

### Stack

Next 16 · React 19 · Elysia (`/api/v1`) · Better Auth (email + password,
organizaciones) · Drizzle ORM + Postgres (node-postgres) · Eden +
`eden-tanstack-react-query` · zod · shadcn/ui + Tailwind v4 · `motion` · LogTape ·
Vitest · Biome.

### Superficie del producto

| Ruta | Qué es |
|------|--------|
| `/` | Landing pública (marketing). Redirige a la app si hay sesión + organización. |
| `/{slug}/app/...` | App multi-tenant, scoped por organización. |
| `/auth/[path]` | Sign in / sign up (Better Auth UI). |
| `/api/v1/*` | API Elysia. OpenAPI (Scalar) dev-only en `/api/v1/openapi`. |

### Arquitectura

Los dominios viven en `src/core/<domain>/`:

| Capa | Contiene |
|------|----------|
| `domain/` | zod `schemas.ts` + `types.ts` inferidos (única fuente de tipos) |
| `server/repository/` | acceso Drizzle (`import "server-only"` + `db` compartido), scoped por `userId` |
| `server/services/` | orquestación, devuelve `AsyncAppResult<T>`, valida ownership |
| `server/api/` | rutas Elysia `*.route.ts` + `router.ts` por dominio (el prefijo vive en el router) |
| `client/` | hooks Eden/TanStack-Query + UI shadcn |

**Wire rules:** toda respuesta usa el envelope `CommonResponse`; los 4xx
esperados son valores `err(AppErrors.x)`, no throws; las rutas autenticadas
llevan `.use(authed)` **y** `authed: true`. Un router no está vivo hasta que se
`.use()`a en `src/server/router.ts`.

### Landing page

Construida nativa en el stack (React + Tailwind v4 + shadcn + `motion`), en
`src/frontend/components/landing/` — un componente enfocado por sección
(`nav`, `hero`, `problem`, `how-it-works`, `comparison`, `cta`, `footer`) +
`reveal.tsx` (fade-up en scroll, respeta `prefers-reduced-motion`). Marca azul
vía tokens en `src/app/globals.css`. Diseño en
[`docs/superpowers/specs/`](./docs/superpowers/specs/).

## Setup

```bash
pnpm install
cp .env.example .env      # DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL
pnpm db:migrate           # aplicar migraciones a Postgres
pnpm dev                  # http://localhost:3000
```

`BETTER_AUTH_SECRET`: `openssl rand -base64 32`. `DATABASE_URL`: cualquier
Postgres (Supabase, Neon, local).

## Scripts

`pnpm dev | build | start` · `pnpm test` (Vitest) · `pnpm check` (Biome) ·
`pnpm typecheck` · `pnpm db:generate | db:migrate | db:studio`.

## Más

- Convenciones para agentes/colaboradores: [`AGENTS.md`](./AGENTS.md).
- Reglas de code review: [`docs/code-review/`](./docs/code-review/).
