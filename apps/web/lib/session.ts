import "server-only";
import { resolveTenantBySlug, listChurches, TENANT_ROLES, type TenantRole } from "@hearth/db";

/**
 * A stand-in for authentication, so the data layer can be reviewed before auth
 * is built. Supabase Auth arrives in the next step and replaces this entirely.
 *
 * Until then the church and the role come from the query string, which is also
 * the most honest way to demonstrate what the isolation actually does: switch
 * church and the data changes completely, switch role and the confidential note
 * stops being readable.
 *
 * The owner connection is never imported here. Tenant resolution goes through a
 * named function in the data layer, and a test enforces that.
 */
export const DEMO_ROLES: readonly TenantRole[] = ["owner", "admin", "staff", "pastoral", "finance"];

export interface Session {
  tenantId: string;
  tenantName: string;
  slug: string;
  role: TenantRole;
}

export async function resolveSession(params: {
  church?: string;
  role?: string;
}): Promise<{ session: Session | null; churches: { slug: string; name: string }[] }> {
  const churches = await listChurches();
  const slug = params.church ?? churches[0]?.slug;
  if (!slug) return { session: null, churches };

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) return { session: null, churches };

  const requested = params.role as TenantRole | undefined;
  const role: TenantRole = requested && TENANT_ROLES.includes(requested) ? requested : "admin";

  return {
    session: { tenantId: tenant.id, tenantName: tenant.name, slug, role },
    churches,
  };
}
