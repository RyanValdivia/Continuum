"use client"

import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useCreateOrganization
} from "@better-auth-ui/react"
import { Briefcase } from "lucide-react"
import { type SyntheticEvent, useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from "@/frontend/components/ui/alert-dialog"
import { Button } from "@/frontend/components/ui/button"
import { Field, FieldError } from "@/frontend/components/ui/field"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { Spinner } from "@/frontend/components/ui/spinner"
import { organizationPlugin } from "@/frontend/lib/auth/organization-plugin"
import { SlugField, sanitizeSlug } from "./slug-field"

/** Props for the `CreateOrganizationDialog` component. */
export type CreateOrganizationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Safely reads the created organization's slug out of the mutation result. */
function createdOrgSlug(data: unknown): string | undefined {
  if (data && typeof data === "object") {
    if ("slug" in data && typeof (data as { slug?: unknown }).slug === "string") {
      return (data as { slug: string }).slug
    }
    if ("data" in data) {
      return createdOrgSlug((data as { data: unknown }).data)
    }
  }
  return undefined
}

export function CreateOrganizationDialog({
  open,
  onOpenChange
}: CreateOrganizationDialogProps) {
  const { authClient, localization, navigate } = useAuth()
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [nameError, setNameError] = useState<string>()

  const { mutate: createOrganization, isPending: isCreating } =
    useCreateOrganization(authClient as OrganizationAuthClient, {
      // A new org has no data yet — send the creator into onboarding (step 2:
      // first ingestion / connect Notion) rather than back to where they were.
      onSuccess: (data) => {
        onOpenChange(false)
        const targetSlug = createdOrgSlug(data) ?? slug
        if (targetSlug) navigate({ to: `/${targetSlug}/app/onboarding` })
      }
    })

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    createOrganization({ name, slug })
  }

  useEffect(() => {
    if (!open) {
      setSlug("")
      setName("")
      setSlugEdited(false)
      setNameError(undefined)
    }
  }, [open])

  useEffect(() => {
    if (slugEdited) return
    setSlug(sanitizeSlug(name))
  }, [name, slugEdited])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Briefcase />
            </AlertDialogMedia>

            <AlertDialogTitle>
              {organizationLocalization.createOrganization}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {organizationLocalization.organizationsDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-4">
            <Field data-invalid={!!nameError}>
              <Label htmlFor="create-organization-name">
                {organizationLocalization.name}
              </Label>

              <Input
                id="create-organization-name"
                name="name"
                autoFocus
                required
                placeholder={organizationLocalization.namePlaceholder}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError(undefined)
                }}
                onInvalid={(e) => {
                  e.preventDefault()
                  setNameError(localization.auth.fieldRequired)
                }}
                aria-invalid={!!nameError}
                disabled={isCreating}
              />

              <FieldError>{nameError}</FieldError>
            </Field>

            <SlugField
              id="create-organization-slug"
              value={slug}
              onChange={(value) => {
                setSlug(value)
                setSlugEdited(true)
              }}
              disabled={isCreating}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>
              {localization.settings.cancel}
            </AlertDialogCancel>

            <Button type="submit" disabled={isCreating}>
              {isCreating && <Spinner />}

              {organizationLocalization.createOrganization}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
