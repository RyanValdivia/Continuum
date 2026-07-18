"use client";

import { AccessGrantsCard } from "./access-grants-card";
import { AccessPolicyCard } from "./access-policy-card";
import { MembershipEditorCard } from "./membership-editor-card";
import { PrincipalTreeCard } from "./principal-tree-card";

export function AccessControlPage() {
    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
            <AccessPolicyCard />
            <PrincipalTreeCard />
            <MembershipEditorCard />
            <AccessGrantsCard />
        </div>
    );
}
