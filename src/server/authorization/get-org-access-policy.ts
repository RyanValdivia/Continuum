import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/drizzle/db";
import { organizationAccessPolicy } from "@/server/drizzle/schemas/authorization-schema";

/** No policy row yet == the table's own default: `"open"`. */
export async function getOrgAccessPolicy(
    organizationId: string,
): Promise<"open" | "closed"> {
    const [row] = await db
        .select({ defaultAccess: organizationAccessPolicy.defaultAccess })
        .from(organizationAccessPolicy)
        .where(eq(organizationAccessPolicy.organizationId, organizationId))
        .limit(1);
    return row?.defaultAccess ?? "open";
}
