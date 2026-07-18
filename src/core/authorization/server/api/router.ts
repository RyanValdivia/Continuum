import { Elysia } from "elysia";
import { createPrincipalRoute } from "./routes/create-principal.route";
import { deletePrincipalRoute } from "./routes/delete-principal.route";
import { getAccessPolicyRoute } from "./routes/get-access-policy.route";
import { grantAccessRoute } from "./routes/grant-access.route";
import { listAcesRoute } from "./routes/list-aces.route";
import { listMembershipsRoute } from "./routes/list-memberships.route";
import { listPrincipalsRoute } from "./routes/list-principals.route";
import { removeMembershipRoute } from "./routes/remove-membership.route";
import { revokeAccessRoute } from "./routes/revoke-access.route";
import { setAccessPolicyRoute } from "./routes/set-access-policy.route";
import { setMembershipRoute } from "./routes/set-membership.route";
import { updatePrincipalRoute } from "./routes/update-principal.route";

export const authorizationRouter = new Elysia({ prefix: "/authorization" })
    .use(
        new Elysia({ prefix: "/principals" })
            .use(listPrincipalsRoute)
            .use(createPrincipalRoute)
            .use(updatePrincipalRoute)
            .use(deletePrincipalRoute),
    )
    .use(
        new Elysia({ prefix: "/memberships" })
            .use(listMembershipsRoute)
            .use(setMembershipRoute)
            .use(removeMembershipRoute),
    )
    .use(
        new Elysia({ prefix: "/access-control-entries" })
            .use(listAcesRoute)
            .use(grantAccessRoute)
            .use(revokeAccessRoute),
    )
    .use(
        new Elysia({ prefix: "/access-policy" })
            .use(getAccessPolicyRoute)
            .use(setAccessPolicyRoute),
    );
