# Organization App Sidebar

**Date:** 2026-07-18
**Status:** Shipped

## Goal

Replace the top-only header in the org app (`/[slug]/app`) with a shadcn
**collapsible-icon sidebar**, giving persistent navigation as the app grows.

## Decisions

- shadcn `sidebar` block (collapsible="icon" — collapses to an icon rail, ⌘/Ctrl+B,
  mobile → sheet, state persisted via cookie). Installed via the shadcn CLI
  (kept existing customized ui primitives — only `sidebar.tsx` + `sheet.tsx`
  were added; `--sidebar-*` tokens appended to `globals.css`).
- Nav is driven by the existing app routes: **Proyectos** (`projects`) and
  **Conocimiento** (`knowledge` — the org knowledge-agent chat). Trivial to
  extend as more routes land.
- Reuse the better-auth **OrganizationSwitcher** in the sidebar header (hidden
  when collapsed to icon). Sign-out lives in the footer.

## Structure

- `src/app/[slug]/app/layout.tsx` (server, keeps `requireAuth` +
  `requireOrganization`): `<SidebarProvider>` → `<AppSidebar>` + `<SidebarInset>`
  with a content header (`SidebarTrigger` + active-route title).
- `src/app/[slug]/app/app-sidebar.tsx` (client): `AppSidebar` (header switcher,
  nav with `usePathname` active state styled `primary`, footer email + sign-out)
  and `AppHeaderTitle` (route→title for the content header).
- Removed `sign-out-button.tsx` (inlined into the sidebar footer).

## Notes

- Active nav item styled with the brand blue (`data-[active=true]:bg-primary/10
  text-primary`); sidebar chrome uses the neutral `--sidebar-*` tokens.
- Verified: expanded + collapsed rail, active-state switching, org switcher,
  footer sign-out, and both pages (Projects table, Knowledge chat) rendering
  full-height inside `SidebarInset`.
