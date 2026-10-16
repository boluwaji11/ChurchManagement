/**
 * HRT-382, R22.2, R1.5. What a published website reads from the church.
 *
 * The point of building a church's website inside its management system is
 * that the service times on the page are the service times in the product, and
 * nobody types them twice. The risk of it is the obvious one: a page that reads
 * from the church's records could read the wrong ones.
 *
 * So nothing here writes its own query. Every binding resolves through the
 * reader the platform already uses for its own public pages, each of which
 * carries the gate: a group has to be listed and published, an event has to be
 * published and still to come, a form has to be open, a fund has to be one the
 * church is receiving gifts to, and the church itself has to be approved and
 * not a demo. That set of readers is the allowlist, and it is the only way
 * anything reaches a page.
 *
 * What is read is decided by the document, so a website with no events section
 * does not ask about events.
 */

import { owner } from "../client";
import { publicEvents, type ListedEvent } from "./public-events";
import { publicGroups, type PublicGroup } from "./public-groups";
import { publicForm, type PublicForm } from "./public-forms";
import { givingPage } from "./public-giving";
import type { SiteDoc } from "./site-doc";

export interface SiteServiceTime {
  name: string;
  /** 0 is Sunday, matching JavaScript and Postgres. */
  dayOfWeek: number;
  startsAt: string;
  campus: string | null;
}

export interface SiteFund {
  id: string;
  name: string;
  description: string | null;
}

export interface SiteData {
  services: SiteServiceTime[];
  events: ListedEvent[];
  groups: PublicGroup[];
  funds: SiteFund[];
  /** Keyed by the address the form answers on. */
  forms: Record<string, PublicForm>;
  takesGifts: boolean;
}

export const EMPTY_SITE_DATA: SiteData = {
  services: [], events: [], groups: [], funds: [], forms: {}, takesGifts: false,
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** R1.1. When the church gathers, which is public by its nature. */
export async function siteServiceTimes(slug: string): Promise<SiteServiceTime[]> {
  if (!SLUG.test(slug)) return [];
  return owner()<SiteServiceTime[]>`
    select st.name,
           st.day_of_week as "dayOfWeek",
           st.starts_at as "startsAt",
           c.name as campus
      from service_times st
      join tenants t on t.id = st.tenant_id
      left join campuses c on c.id = st.campus_id
     where t.slug = ${slug}
       and t.approved_at is not null
       and t.demo_expires_at is null
     order by st.day_of_week, st.starts_at, st.sort_order`;
}

/** What the document asks the church for, gathered once per page. */
export interface DataWanted {
  services: boolean;
  events: number;
  groups: number;
  funds: boolean;
  forms: string[];
}

/**
 * Reads the document and says what it will need.
 *
 * The whole document rather than one page, because the shared header and footer
 * are on every page and a footer showing service times wants them on the
 * contact page too.
 */
export function dataWantedBy(doc: SiteDoc): DataWanted {
  const wanted: DataWanted = {
    services: doc.footer.showTimes,
    events: 0,
    groups: 0,
    funds: false,
    forms: [],
  };
  for (const page of doc.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const bind = section.bind;
      if (!bind) continue;
      switch (bind.source) {
        case "serviceTimes": wanted.services = true; break;
        case "events": wanted.events = Math.max(wanted.events, bind.limit); break;
        case "groups": wanted.groups = Math.max(wanted.groups, bind.limit); break;
        case "funds": wanted.funds = true; break;
        case "form":
          if (!wanted.forms.includes(bind.formSlug)) wanted.forms.push(bind.formSlug);
          break;
        case "manual": break;
      }
    }
    /* A button can send somebody to a form without a section holding one. */
  }
  return wanted;
}

/**
 * Everything one published website needs from the church, in one go.
 *
 * `today` is the church's own date rather than the server's, so an event
 * running this evening is still listed by a reader on the other side of the
 * world.
 */
export async function siteData(
  slug: string,
  doc: SiteDoc,
  today: string,
): Promise<SiteData> {
  const wanted = dataWantedBy(doc);
  const [services, events, groups, giving, forms] = await Promise.all([
    wanted.services ? siteServiceTimes(slug) : Promise.resolve([]),
    wanted.events > 0 ? publicEvents(slug, today) : Promise.resolve([]),
    wanted.groups > 0 ? publicGroups(slug) : Promise.resolve([]),
    wanted.funds ? givingPage(slug) : Promise.resolve(null),
    Promise.all(wanted.forms.slice(0, 8).map(async (formSlug) =>
      [formSlug, await publicForm(slug, formSlug)] as const,
    )),
  ]);

  const held: Record<string, PublicForm> = {};
  for (const [formSlug, form] of forms) {
    if (form) held[formSlug] = form;
  }

  return {
    services,
    events: events.slice(0, Math.max(wanted.events, 0)),
    groups: groups.slice(0, Math.max(wanted.groups, 0)),
    funds: giving?.funds ?? [],
    forms: held,
    takesGifts: Boolean(giving),
  };
}
