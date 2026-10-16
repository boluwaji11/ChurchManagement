import "server-only";
import { publicChurchTimezone } from "@connectapp/db";
import type { PublicSite, SiteData } from "@connectapp/db";
import type { SiteCtx } from "@/components/church-site/kit";

/**
 * HRT-382. The church, as every section of its website sees it.
 *
 * Built once per page, from the published document and from the readers that
 * carry the public gate. Plain data all the way down, so the editor's canvas
 * can be handed the same object across the server and browser boundary.
 */
export function siteCtxFrom(
  site: PublicSite,
  data: SiteData,
  options: { editing?: boolean } = {},
): SiteCtx {
  return {
    slug: site.slug,
    name: site.church.name,
    country: site.church.country,
    timezone: site.church.timezone,
    /* The church's own mark, which it uploaded once in Settings and which the
       giving page and the group finder already show. */
    logo: site.church.logoKey
      ? { key: site.church.logoKey, url: null, alt: site.church.name }
      : null,
    email: site.church.email,
    phone: site.church.phone,
    address: {
      line1: site.church.addressLine1,
      line2: site.church.addressLine2,
      city: site.church.city,
      region: site.church.region,
      postalCode: site.church.postalCode,
    },
    takesGifts: site.church.takesGifts,
    doc: site.doc,
    data: {
      services: data.services,
      events: data.events.map((one) => ({
        id: one.id,
        slug: one.slug,
        name: one.name,
        hue: one.hue,
        coverKey: one.coverKey,
        startsOn: one.startsOn,
        startsAt: one.startsAt,
        endsOn: one.endsOn,
        location: one.location,
        city: one.city,
        takesRegistrations: one.takesRegistrations,
      })),
      groups: data.groups.map((one) => ({
        id: one.id,
        slug: one.slug,
        name: one.name,
        description: one.description,
        typeName: one.typeName,
        typeHue: one.typeHue,
        photoKey: one.photoKey,
        dayOfWeek: one.dayOfWeek,
        startsAt: one.startsAt,
        location: one.location,
        online: one.online,
        openToJoin: one.openToJoin,
      })),
      funds: data.funds,
      forms: Object.fromEntries(
        Object.entries(data.forms).map(([slug, form]) => [
          slug,
          form ? { id: form.id, name: form.name, intro: form.intro } : undefined,
        ]),
      ),
    },
    ...(options.editing ? { editing: true } : {}),
  };
}

/** The church's own date, which decides what counts as coming up. */
export async function churchToday(slug: string): Promise<string> {
  const timezone = await publicChurchTimezone(slug);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
