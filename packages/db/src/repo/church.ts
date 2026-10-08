import { asc, eq } from "drizzle-orm";
import type { Tx } from "../client";
import { tenants, serviceTimes } from "../schema/tenancy";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith, type Who } from "../permissions";
import { InvalidInputError } from "../errors";
import { LOOKS_LIKE_EMAIL } from "./form-rules";
import type { WriteActor } from "./members";

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
 * Admin. Staff edit members; they do not rename the church.
 */
export const CAN_MANAGE_CHURCH: readonly TenantRole[] = rolesWith("church.manage");
export const canManageChurch = (role: Who): boolean => can(role, "church.manage");

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
  /** R1.1. Where somebody reading a public page writes to. */
  email: string | null;
  website: string | null;
  brandHue: string;
  /**
   * R1.1, R24.4. The colour this church actually uses, as it wrote it.
   *
   * Null until somebody picks one, when the hue above stands in. What is
   * drawn is never this value directly: `brandRamp` keeps its hue and rebuilds
   * the lightness, so a pale brand cannot put unreadable words on a page.
   */
  brandColor: string | null;
  logoKey: string | null;
  /** R1.7. Null when the church has switched joining off. */
  selfSignup: boolean;
  /** R13.18. Whether a statement is written a person or a household. */
  statementsBy: string;
  /** R1.1. The church's own address for its members' screens. */
  customDomain: string | null;
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
  email?: string | null;
  website?: string | null;
  brandHue?: string;
  /** R1.1. A `#rrggbb`, or an empty string to go back to the spectrum hue. */
  brandColor?: string | null;
}

export async function getChurch(db: Tx, tenantId: string): Promise<ChurchProfile | null> {
  const [row] = await db
    .select({
      id: tenants.id, slug: tenants.slug, name: tenants.name, legalName: tenants.legalName,
      timezone: tenants.timezone, addressLine1: tenants.addressLine1,
      addressLine2: tenants.addressLine2, city: tenants.city, region: tenants.region,
      postalCode: tenants.postalCode, country: tenants.country, phone: tenants.phone, email: tenants.email,
      website: tenants.website, brandHue: tenants.brandHue,
      brandColor: tenants.brandColor, logoKey: tenants.logoKey,
      selfSignup: tenants.selfSignup, statementsBy: tenants.statementsBy,
      customDomain: tenants.customDomain,
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
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const name = input.name.trim();
  if (!name) throw new InvalidInputError("church.error.name");
  if (!isKnownTimezone(input.timezone)) throw new InvalidInputError("church.error.timezone");

  // R1.1. A church's own address is printed at the foot of every public page,
  // so a typo here is a typo the congregation reads.
  const email = trim(input.email);
  if (email && !LOOKS_LIKE_EMAIL.test(email)) {
    throw new InvalidInputError("church.error.email");
  }

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
      email,
      website: trim(input.website),
      ...(input.brandHue ? { brandHue: input.brandHue as never } : {}),
      ...(input.brandColor === undefined ? {} : { brandColor: input.brandColor || null }),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, actor.tenantId))
    .returning({
      id: tenants.id, slug: tenants.slug, name: tenants.name, legalName: tenants.legalName,
      timezone: tenants.timezone, addressLine1: tenants.addressLine1,
      addressLine2: tenants.addressLine2, city: tenants.city, region: tenants.region,
      postalCode: tenants.postalCode, country: tenants.country, phone: tenants.phone, email: tenants.email,
      website: tenants.website, brandHue: tenants.brandHue,
      brandColor: tenants.brandColor, logoKey: tenants.logoKey,
      selfSignup: tenants.selfSignup, statementsBy: tenants.statementsBy,
      customDomain: tenants.customDomain,
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
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

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
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const gone = await db
    .delete(serviceTimes)
    .where(eq(serviceTimes.id, id))
    .returning({ id: serviceTimes.id });

  if (gone.length === 0) throw new InvalidInputError("church.error.serviceNotFound");
  return { removed: gone.length };
}
