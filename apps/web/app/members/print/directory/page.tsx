import {
  withTenant, getChurch, memberDirectory, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { BrandRuleFor } from "@/components/brand-rule";
import { AutoPrint } from "../../../checkin/rooms/print/auto-print";
import { Denied } from "@/components/denied";

export const dynamic = "force-dynamic";

const birthday = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long" });

/**
 * R3.5. The directory a church hands out.
 *
 * The only directory of the congregation ConnectApp produces, and it is an act the
 * church takes rather than a box anybody can type into. Every field in it is
 * one the member turned on: the default is a name, and a child is here as a
 * name in their household or not at all.
 *
 * Generated at the moment it is printed, so somebody who opted out last week is
 * not in this week's book.
 */
export default async function PrintDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <main id="main" className="mx-auto min-h-dvh max-w-lg px-4 py-8">
        <Denied />
      </main>
    );
  }

  const { households, when, hue } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const now = churchNow(profile?.timezone ?? "America/Chicago");
      return {
        households: await memberDirectory(tx, { asOf: now.date }),
        when: now,
        // R1.1. The church's own colour on the sheet it hands out.
        hue: profile?.brandHue ?? "indigo",
      };
    },
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 bg-white text-black print:max-w-none print:px-10 print:py-8">
      <AutoPrint />

      {/* The browser's own header and footer come off, and the padding above
          puts the white space back where it belongs. */}
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <BrandRuleFor hue={hue} className="mb-5 h-1.5 w-full print:h-[3mm]" />

      <header className="mb-6 flex items-baseline justify-between gap-4 border-b border-black pb-3">
        <h1 className="font-display text-display">{t("printDirectory.title")}</h1>
        <span className="text-[length:var(--d-text-body)]">
          {session.tenantName} {when.date}
        </span>
      </header>

      {households.length === 0 ? <p className="py-4">{t("printDirectory.none")}</p> : null}

      <div className="columns-1 gap-8 sm:columns-2 print:columns-2">
        {households.map((household) => (
          <section key={household.id} className="mb-5 break-inside-avoid">
            <h2 className="text-heading">{household.name}</h2>

            {household.members.map((person) => (
              <div key={person.id} className="text-[length:var(--d-text-body)]">
                <span>{person.name}</span>
                {person.email ? <span className="ml-2">{person.email}</span> : null}
                {person.phone ? <span className="ml-2">{person.phone}</span> : null}
                {person.birthday ? (
                  <span className="ml-2">{birthday(person.birthday)}</span>
                ) : null}
              </div>
            ))}

            {household.members.find((person) => person.address)?.address ? (
              <div className="text-[length:var(--d-text-body)]">
                {household.members.find((person) => person.address)!.address}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
