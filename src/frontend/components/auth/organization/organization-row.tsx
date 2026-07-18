"use client"

import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useSetActiveOrganization
} from "@better-auth-ui/react"
import type { Organization } from "better-auth/client"
import { LayoutDashboard, Settings as SettingsIcon } from "lucide-react"

import { Button } from "@/frontend/components/ui/button"
import { Spinner } from "@/frontend/components/ui/spinner"
import { organizationPlugin } from "@/frontend/lib/auth/organization-plugin"
import { OrganizationView } from "./organization-view"

export type OrganizationRowProps = {
  organization: Organization
}

/**
 * Single organization row: logo and labels via `OrganizationView`, plus a Manage action.
 */
export function OrganizationRow({ organization }: OrganizationRowProps) {
  const { authClient, basePaths, navigate } = useAuth()
  const {
    localization: organizationLocalization,
    viewPaths: organizationViewPaths,
    slug,
    slugPrefix
  } = useAuthPlugin(organizationPlugin)

  const { mutate: setActiveOrganization, isPending: setActivePending } =
    useSetActiveOrganization(authClient as OrganizationAuthClient, {
      onSuccess: () => {
        navigate({
          to: `${basePaths.organization}/${organizationViewPaths.organization.settings}`
        })
      }
    })

  function manageOrganization() {
    if (slug !== undefined) {
      navigate({
        to: `${basePaths.organization}/${slugPrefix}${organization.slug}/${organizationViewPaths.organization.settings}`
      })
    } else {
      setActiveOrganization({ organizationId: organization.id })
    }
  }

  function openDashboard() {
    navigate({ to: `/${organization.slug}/app/projects` })
  }

  return (
    <div className="flex items-center gap-3">
      <OrganizationView organization={organization} />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={openDashboard}>
          <LayoutDashboard />
          Abrir
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={setActivePending}
          onClick={manageOrganization}
          aria-label={organizationLocalization.manage}
        >
          {setActivePending ? <Spinner /> : <SettingsIcon />}

          {organizationLocalization.manage}
        </Button>
      </div>
    </div>
  )
}
