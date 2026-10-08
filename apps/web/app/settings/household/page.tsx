import { redirect } from "next/navigation";
import { House, Cake } from "lucide-react";
import {
  withTenant, personForUser, householdFor, addressFor,
  canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { Avatar } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { photoUrls } from "@/lib/photos";
import { shortDate } from "@/lib/dates";
import { SettingsHeading } from "../heading";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.household"), church);
}

/**
 * R17.2, R2.4. A member's own household, inside their settings.
 *
 * Reading rather than editing: changing a name or an address is a question for
 * the church office. What the directory publishes is settled on the profile,
 * where a member changes or clears the field itself.
 *
 * It was a column of initials in surname order, which is how a church indexes
 * people and nobody's idea of their own family. It reads from the head of the
 * household outwards now, with faces, and the address the church writes to
 * above them, because that is the one fact the household holds in common.
 */
export default async function MyHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/settings/households?church=${session.tenantSlug}`);
  }

  const mine = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return null;
      return {
        household: await householdFor(tx, self),
        /* R2.4. Where the church writes to. One address, held by whoever in
           the household the church has it against. */
        address: await addressFor(tx, self),
      };
    },
  );

  const faces = await photoUrls(mine?.household?.members.map((one) => one.photoKey) ?? []);

  const where = mine?.address ?? null;

  return (
    <>
      <SettingsHeading title="settings.tab.household" />

      {!mine ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("member.error.noRecord")}
        </p>
      ) : mine.household ? (
        <section className="flex min-w-0 flex-col rounded-[14px] border border-line bg-surface shadow-sm">
          <header className="flex flex-wrap items-center gap-3 px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
              <House aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-5">
              <span className="truncate text-[15px] font-bold text-fg">
                {mine.household.name}
              </span>
              {where ? <span className="truncate text-[13px] text-fg-muted">{where}</span> : null}
            </span>
          </header>

          <hr className="border-0 border-t border-line" />

          <ul className="m-0 flex list-none flex-col p-0">
            {mine.household.members.map((one, at) => {
              const last = at === mine.household!.members.length - 1;

              return (
                <li key={one.id} className="flex min-w-0 gap-3.5 px-5">
                  {/* R24.4. The thread the rest of the product uses for a
                      thing inside a thing, drawn in two pieces so the line
                      crosses the gap between rows. */}
                  <span
                    aria-hidden
                    className="flex w-9 shrink-0 flex-col items-center self-stretch"
                  >
                    <span className={`h-3 w-px ${at === 0 ? "" : "bg-line"}`} />
                    <Avatar
                      name={one.displayName}
                      src={one.photoKey ? (faces[one.photoKey] ?? null) : null}
                      id={one.id}
                      className="size-9 shrink-0 text-[12px] font-semibold"
                    />
                    <span className={`w-px flex-1 ${last ? "" : "bg-line"}`} />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 py-3 leading-5">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-fg">{one.displayName}</span>
                      <span className="truncate text-caption text-fg-subtle">
                        {t(`householdRole.${one.role}` as never)}
                      </span>
                    </span>
                    {/* R2.11. The mark names it. A date on its own beside a
                        name could be anything the church holds. */}
                    {one.dateOfBirth ? (
                      <span
                        className="flex shrink-0 items-center gap-1.5 text-caption text-fg-muted"
                        aria-label={t("privacy.birthday")}
                      >
                        <Cake className="size-3.5 shrink-0" aria-hidden />
                        {shortDate(one.dateOfBirth)}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("home.noHousehold")}</p>
      )}
    </>
  );
}
