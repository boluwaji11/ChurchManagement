import { asc, eq } from "drizzle-orm";
import type { Tx } from "../client";
import { tenants, serviceTimes } from "../schema/tenancy";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith } from "../permissions";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";

/**
 * R1.1. The church's own record.
 *
 * Everything here is read on screens a member sees, so it is the one place
 * where getting it wrong is public. The legal name goes on giving statements
 * under IRS Pub. 1771 (R13.14), the timezone decides when a service day starts for
 * every report, and the service times are what attendance and check-in count
 * against.
 */

/**
 * Settings reshape the church for everyone in it, so they stay with Owner and
 * Admin. Staff edit people; they do not rename the church.
 */
export const CAN_MANAGE_CHURCH: readonly TenantRole[] = rolesWith("church.manage");
export const canManageChurch = (role: TenantRole): boolean => can(role, "church.manage");

export interface ChurchProfile {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  timezone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  brandHue: string;
  logoKey: string | null;
  /** R1.7. Null when the church has switched joining off. */
  joinCode: string | null;
}

export interface ChurchInput {
  name: string;
  legalName?: string | null;
  timezone: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
  phone?: string | null;
  website?: string | null;
  brandHue?: string;
}

export async function getChurch(db: Tx, tenantId: string): Promise<ChurchProfile | null> {
  const [row] = await db
    .select({
      id: tenants.id, slug: tenants.slug, name: tenants.name, legalName: tenants.legalName,
      timezone: tenants.timezone, addressLine1: tenants.addressLine1,
      addressLine2: tenants.addressLine2, city: tenants.city, region: tenants.region,
      postalCode: tenants.postalCode, country: tenants.country, phone: tenants.phone,
      website: tenants.website, brandHue: tenants.brandHue, logoKey: tenants.logoKey,
      joinCode: tenants.joinCode,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return row ?? null;
}

const trim = (value: string | null | undefined): string | null => value?.trim() || null;

/** True when the runtime recognises the zone. An unknown zone breaks every date. */
export function isKnownTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export async function updateChurch(
  db: Tx,
  actor: WriteActor,
  input: ChurchInput,
): Promise<ChurchProfile> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const name = input.name.trim();
  if (!name) throw new InvalidInputError("church.error.name");
  if (!isKnownTimezone(input.timezone)) throw new InvalidInputError("church.error.timezone");

  const [row] = await db
    .update(tenants)
    .set({
      name,
      legalName: trim(input.legalName),
      timezone: input.timezone,
      addressLine1: trim(input.addressLine1),
      addressLine2: trim(input.addressLine2),
      city: trim(input.city),
      region: trim(input.region),
      postalCode: trim(input.postalCode),
      country: input.country?.trim() || "US",
      phone: trim(input.phone),
      website: trim(input.website),
      ...(input.brandHue ? { brandHue: input.brandHue as never } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, actor.tenantId))
    .returning({
      id: tenants.id, slug: tenants.slug, name: tenants.name, legalName: tenants.legalName,
      timezone: tenants.timezone, addressLine1: tenants.addressLine1,
      addressLine2: tenants.addressLine2, city: tenants.city, region: tenants.region,
      postalCode: tenants.postalCode, country: tenants.country, phone: tenants.phone,
      website: tenants.website, brandHue: tenants.brandHue, logoKey: tenants.logoKey,
      joinCode: tenants.joinCode,
    });

  if (!row) throw new InvalidInputError("church.error.notFound");
  return row;
}

export interface ServiceTime {
  id: string;
  name: string;
  /** 0 is Sunday. */
  dayOfWeek: number;
  startsAt: string;
  sortOrder: number;
}

export interface ServiceTimeInput {
  name: string;
  dayOfWeek: number;
  startsAt: string;
}

/** Sunday first, then by clock time, which is how a church lists its own week. */
export async function listServiceTimes(db: Tx): Promise<ServiceTime[]> {
  return db
    .select({
      id: serviceTimes.id, name: serviceTimes.name, dayOfWeek: serviceTimes.dayOfWeek,
      startsAt: serviceTimes.startsAt, sortOrder: serviceTimes.sortOrder,
    })
    .from(serviceTimes)
    .orderBy(asc(serviceTimes.dayOfWeek), asc(serviceTimes.startsAt), asc(serviceTimes.sortOrder));
}

export async function addServiceTime(
  db: Tx,
  actor: WriteActor,
  input: ServiceTimeInput,
): Promise<ServiceTime> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const name = input.name.trim();
  if (!name) throw new InvalidInputError("church.error.serviceName");
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    throw new InvalidInputError("church.error.serviceDay");
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startsAt)) {
    throw new InvalidInputError("church.error.serviceTime");
  }

  const [row] = await db
    .insert(serviceTimes)
    .values({
      tenantId: actor.tenantId,
      name,
      dayOfWeek: input.dayOfWeek,
      startsAt: input.startsAt,
    })
    .returning({
      id: serviceTimes.id, name: serviceTimes.name, dayOfWeek: serviceTimes.dayOfWeek,
      startsAt: serviceTimes.startsAt, sortOrder: serviceTimes.sortOrder,
    });

  return row!;
}

export async function removeServiceTime(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<{ removed: number }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const gone = await db
    .delete(serviceTimes)
    .where(eq(serviceTimes.id, id))
    .returning({ id: serviceTimes.id });

  if (gone.length === 0) throw new InvalidInputError("church.error.serviceNotFound");
  return { removed: gone.length };
}
