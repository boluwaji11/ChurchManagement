"use server";

import {
  withTenant, createEvent, updateEvent, setEventStatus, setEventArchived,
  setEventRegistrationOpen, setEventHue, setEventCover, ensureEventForm, setEventForm,
  getChurch, lookupPeople,
  type EventInput, type EventStatus,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

async function context(church?: string) {
  const session = await requireSession(church);
  const actor = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  return { actor, ctx: actor };
}

export interface EventResult {
  error?: string;
  id?: string;
}

/** What the form posts, as the editor writes it. */
function read(data: FormData): EventInput {
  const text = (key: string) => {
    const value = data.get(key);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  const flag = (key: string) => data.get(key) === "on" || data.get(key) === "true";
  const number = (key: string) => {
    const value = text(key);
    return value === null ? null : Number(value);
  };

  return {
    name: text("name") ?? "",
    description: text("description"),
    hue: text("hue"),
    startsOn: text("startsOn") ?? "",
    startsAt: text("startsAt"),
    endsOn: text("endsOn"),
    endsAt: text("endsAt"),
    location: text("location"),
    addressLine1: text("addressLine1"),
    addressLine2: text("addressLine2"),
    city: text("city"),
    region: text("addressRegion"),
    postalCode: text("postalCode"),
    country: text("addressCountry"),
    listed: flag("listed"),
    registrationOpen: flag("registrationOpen"),
    registrationClosesOn: text("registrationClosesOn"),
    registrationClosesAt: text("registrationClosesAt"),
    capacity: number("capacity"),
    waitlist: flag("waitlist"),
    campusId: text("campusId"),
  };
}

export async function createEventFrom(data: FormData): Promise<EventResult> {
  const church = String(data.get("church") ?? "") || undefined;
  const { actor, ctx } = await context(church);
  try {
    const made = await withTenant(ctx, (tx) => createEvent(tx, actor, read(data)));
    return { id: made.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveEvent(data: FormData): Promise<EventResult> {
  const church = String(data.get("church") ?? "") || undefined;
  const id = String(data.get("id") ?? "");
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => updateEvent(tx, actor, id, read(data)));
    return { id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function publishEvent(
  id: string,
  status: EventStatus,
  church?: string,
): Promise<EventResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setEventStatus(tx, actor, id, status));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function openEventRegistration(
  id: string,
  open: boolean,
  church?: string,
): Promise<EventResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setEventRegistrationOpen(tx, actor, id, open));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function recolourEvent(
  id: string,
  hue: string,
  church?: string,
): Promise<EventResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setEventHue(tx, actor, id, hue));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function clearEventCover(id: string, church?: string): Promise<EventResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setEventCover(tx, actor, id, null));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archiveEvent(
  id: string,
  archived: boolean,
  church?: string,
): Promise<EventResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setEventArchived(tx, actor, id, archived));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R14.5. Makes this event's question set, the first time a church adds one. */
export async function startEventForm(id: string, church?: string): Promise<EventResult> {
  const { actor, ctx } = await context(church);
  try {
    const form = await withTenant(ctx, (tx) => ensureEventForm(tx, actor, id));
    return { id: form.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface PersonHit {
  id: string;
  name: string;
}

/** R14.1. Who to ask about an event, looked up the way every person field is. */
export async function findEventContact(
  query: string,
  church?: string,
): Promise<PersonHit[]> {
  const session = await requireSession(church);
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  try {
    return await withTenant(ctx, async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const asOf = churchNow(profile?.timezone ?? "America/Chicago").date;
      const matches = await lookupPeople(tx, query, { asOf, limit: 10 });
      return matches.map((one) => ({
        id: one.person.id,
        name: `${one.person.name} ${one.person.lastName}`,
      }));
    });
  } catch {
    return [];
  }
}

/** R14.5. Points an event at a form the church already wrote, or unlinks it. */
export async function useFormForEvent(
  eventId: string,
  formId: string | null,
  church?: string,
): Promise<EventResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setEventForm(tx, actor, eventId, formId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
