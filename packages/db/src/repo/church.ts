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
  logoKey: string | null;
  /** R1.7. Null when the church has switched joining off. */
  selfSignup: boolean;
  /** R13.18. Whether a statement is written a person or a household. */
  statementsBy: string;
  /** R1.1. The church's own address for its members' screens. */
  customDomain: string | null;
  /** R1.1, R17.1. The name the church chose for its members' address. */
  portalName: string | null;
  /**
   * R1.1, R1.5, R13.1. The number the church is registered under.
   *
   * Present only when the reader carries `church.manage`. Absent otherwise,
   * which is the field-level rule: the record comes back without the field
   * rather than with it blanked, so nothing downstream can read "may not see
   * this" as "the church has not filled it in".
   */
  taxId?: string | null;
}

export interface ChurchInput {
  name: string;
  legalName?: string | null;
  /**
   * R1.1. Left out of the input entirely to keep whatever is stored. A caller
   * that knows nothing about this field cannot blank it by omission, which
   * matters because the setup wizard and the brand picker both write the
   * profile back without ever having read this part of it.
   */
  taxId?: string | null;
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
}

/**
 * R1.1, R1.5. The church's record.
 *
 * The reader is optional because most callers want the timezone or the name
 * and have no business answering who may read a registration number. Passing
 * one is what puts `taxId` on the record, and only for a role carrying
 * `church.manage`.
 */
export async function getChurch(
  db: Tx,
  tenantId: string,
  reader?: Who,
): Promise<ChurchProfile | null> {
  const [row] = await db
    .select({
      id: tenants.id, slug: tenants.slug, name: tenants.name, legalName: tenants.legalName,
      timezone: tenants.timezone, addressLine1: tenants.addressLine1,
      addressLine2: tenants.addressLine2, city: tenants.city, region: tenants.region,
      postalCode: tenants.postalCode, country: tenants.country, phone: tenants.phone, email: tenants.email,
      website: tenants.website, brandHue: tenants.brandHue, logoKey: tenants.logoKey,
      selfSignup: tenants.selfSignup, statementsBy: tenants.statementsBy,
      customDomain: tenants.customDomain, portalName: tenants.portalName,
      taxId: tenants.taxId,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!row) return null;

  /* R1.5. Field-level, enforced here. The view is a convenience, never the
     guard: a screen that forgets to hide this must still not receive it. */
  const { taxId, ...rest } = row;
  return reader && canManageChurch(reader) ? { ...rest, taxId } : rest;
}

const trim = (value: string | null | undefined): string | null => value?.trim() || null;

/**
 * R1.1, R13.1. The registration number, tidied for the one country whose
 * shape we know.
 *
 * A United States EIN is nine digits written as two and then seven, and a
 * church secretary types it every way there is: with the hyphen, without it,
 * with spaces. Stripe and the carriers want one of those, so it is settled
 * here rather than at each of the places that will later read it.
 *
 * Everywhere else it is kept exactly as typed. Guessing at the shape of a
 * charity number we have never seen is how a correct number gets rejected.
 */
export function tidyTaxId(value: string | null | undefined, country: string): string | null {
  const raw = trim(value);
  if (!raw) return null;
  if (country.toUpperCase() !== "US") return raw;

  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 9) throw new InvalidInputError("church.error.taxId");
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

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

  const country = input.country?.trim() || "US";

  const [row] = await db
    .update(tenants)
    .set({
      name,
      legalName: trim(input.legalName),
      /* R1.1. Only touched when the caller named it, so a form that has never
         heard of this field cannot clear it. */
      ...("taxId" in input ? { taxId: tidyTaxId(input.taxId, country) } : {}),
      timezone: input.timezone,
      addressLine1: trim(input.addressLine1),
      addressLine2: trim(input.addressLine2),
      city: trim(input.city),
      region: trim(input.region),
      postalCode: trim(input.postalCode),
      country,
      phone: trim(input.phone),
      email,
      website: trim(input.website),
      ...(input.brandHue ? { brandHue: input.brandHue as never } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, actor.tenantId))
    .returning({
      id: tenants.id, slug: tenants.slug, name: tenants.name, legalName: tenants.legalName,
      timezone: tenants.timezone, addressLine1: tenants.addressLine1,
      addressLine2: tenants.addressLine2, city: tenants.city, region: tenants.region,
      postalCode: tenants.postalCode, country: tenants.country, phone: tenants.phone, email: tenants.email,
      website: tenants.website, brandHue: tenants.brandHue, logoKey: tenants.logoKey,
      selfSignup: tenants.selfSignup, statementsBy: tenants.statementsBy,
      customDomain: tenants.customDomain, portalName: tenants.portalName,
      taxId: tenants.taxId,
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
