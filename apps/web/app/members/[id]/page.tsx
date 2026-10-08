import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  withTenant, getPerson, householdFor,
  personTimeline, servingForPerson, groupsForPerson,
  listContacts, listAddresses, givingForPerson, getChurch,
  listCustomFields, getCustomValues,
  canEditPeople, canReadGivingAmounts,
} from "@connectapp/db";
import { Avatar, Button, Tooltip } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { photoUrls } from "@/lib/photos";
import { AppShell } from "@/components/app-shell";
import { lifecycleLabel } from "@/lib/person-input";
import { longDate, shortDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { churchNow } from "@/lib/church-now";
import { Timeline } from "./timeline";
import { Contacts } from "./contacts";
import { Places } from "./places";
import { MessageButton } from "./message";
import { NoteForm } from "../note-form";
import { customFieldValue } from "../field-values";
import { canReadConfidentialNotes } from "@connectapp/db";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("members.title"), church);
}

/**
 * What a field with nothing in it reads as.
 *
 * A drawn rule rather than a dash character, because the project writes no
 * dashes and a glyph in the source is still a glyph in the source.
 */
const EMPTY = (
  <span aria-hidden className="inline-block h-px w-3 bg-line-strong align-middle" />
);

/**
 * R24.6. One card in the person's grid.
 *
 * A quiet 13px heading rather than a title with a rule under it, because the
 * card's contents are the thing being read and the heading only says which card
 * this is.
 */
function InfoCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold text-fg">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** R2.2. The same pill the directory uses, so a status reads the same anywhere. */
const STATUS_HUE: Record<string, string> = {
  member: "fern",
  regular_attender: "sky",
  visitor: "amber",
  inactive: "clay",
  deceased: "clay",
};

function PersonStatus({ status }: { status: string }) {
  const hue = STATUS_HUE[status] ?? "clay";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium"
      style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
    >
      {lifecycleLabel(status)}
    </span>
  );
}

/**
 * R2.x. One person.
 *
 * Built to docs/redesign/design: the back link, who they are, and four cards.
 * What we hold about them, who they live with, what they are part of, and
 * everything that has happened, in that order.
 */
export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => {
    const person = await getPerson(tx, id, { role: session.role, userId: session.userId });
    if (!person) return null;

    // Found by their readable address or by their id, so everything after this
    // works from the record's own id rather than from whatever was in the URL.
    const memberId = person.id;

    // Six reads about the same person, all of them keyed on the id above, so
    // they go down the one connection together rather than in turn.
    /*
     * R1.5. Giving amounts are a field-level permission, so the read itself
     * is skipped rather than the number being hidden on the way out.
     */
    const amounts = canReadGivingAmounts(session);
    const year = churchNow(
      (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
    ).date.slice(0, 4);

    const [
      contacts, addresses, household, groups, serving, history, giving,
      customFields, customValues,
    ] = await Promise.all([
      // R2.4. Every way of reaching them, not only the one that leads.
      listContacts(tx, memberId),
      listAddresses(tx, memberId),
      householdFor(tx, memberId),
      groupsForPerson(tx, memberId),
      servingForPerson(tx, memberId),
      // R2.15. Everything that has happened with this person, in one order.
      personTimeline(
        tx,
        { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
        memberId,
      ),
      amounts
        ? givingForPerson(tx, memberId, { from: `${year}-01-01`, to: `${year}-12-31` })
        : Promise.resolve(null),
      /* R1.10. Whatever this church decided a person needs. It was on the
         form and in the directory and nowhere on the record itself. */
      listCustomFields(tx, "person"),
      getCustomValues(tx, "person", memberId),
    ]);

    return {
      person, contacts, addresses, household, groups, serving, history, giving,
      customFields, customValues,
    };
  });

  // Not found and not permitted are the same response on purpose. A person in
  // another church must not be distinguishable from a person who does not exist.
  if (!result) notFound();
  const {
    person, contacts, addresses, household, groups, serving, history, giving,
    customFields, customValues,
  } = result;

  /* R1.10. Only the ones with an answer on this person: a card listing every
     field the church has ever added, most of them blank, says nothing. */
  const extra = customFields
    .map((field) => ({
      id: field.id,
      label: field.label,
      value: customFieldValue(field, customValues[field.id], longDate),
    }))
    .filter((one) => one.value !== "");

  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;
  // R2.9. Their face, signed for the hour.
  const faces = await photoUrls([person.photoKey]);
  const canEdit = canEditPeople(session);

  const places = [
    ...groups.map((g) => ({ key: `g${g.groupId}`, name: g.name, hue: g.typeHue ?? "fern" })),
    ...serving.map((s) => ({ key: `t${s.teamId}`, name: s.teamName, hue: s.hue })),
  ];

  return (
    <AppShell
      session={session}
    >
      <Link
        href={`/members?church=${session.tenantSlug}`}
        className="-my-1.5 inline-flex min-h-8 items-center gap-1.5 self-start py-1.5 font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("members.title")}
      </Link>

      {/* A 72px face, the name in Fraunces at 32, and under it the one line
          that places them: what they are to the church, whose household, and
          since when. */}
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          name={display}
          src={person.photoKey ? (faces[person.photoKey] ?? null) : null}
          id={person.id}
          className="size-[72px] text-[24px] font-semibold"
        />
        <div className="min-w-[200px] flex-1">
          <div className="font-display text-[32px] leading-[38px] text-fg">{display}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PersonStatus status={person.lifecycleStatus} />
            <span className="text-[13px] text-fg-muted">
              {[
                household ? t("person.ofHousehold", { name: household.name }) : null,
                person.membershipDate
                  ? t("person.joinedOn", { date: longDate(person.membershipDate) })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-1">
            <MessageButton name={display} />
            {/* Sized from the same token as the IconButton beside it, so the
                two actions are one pair rather than two shapes. */}
            <Tooltip content={t("action.edit")}>
              <Button
                variant="ghost"
                asChild
                className="size-[var(--d-tap)] min-h-0 rounded-[var(--d-radius-control)] px-0 [&_svg]:size-[var(--d-icon)]"
              >
                <Link
                  href={`/members/${person.slug}/edit?church=${session.tenantSlug}`}
                  aria-label={t("action.edit")}
                >
                  <Pencil />
                </Link>
              </Button>
            </Tooltip>
          </div>
        ) : null}
      </div>

      {/* Everything we hold on the left, everything that has happened on the
          right, with a hairline between them. The timeline is read down rather
          than across, so it gets a column of its own rather than a band under
          the others. */}
      <div className="flex flex-wrap items-stretch gap-6">
        <div className="grid min-w-0 flex-[3_1_420px] content-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <InfoCard title={t("person.contact")}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-fg-subtle">{t("contact.emails")}</span>
              <Contacts
                church={session.tenantSlug}
                memberId={person.id}
                kind="email"
                contacts={contacts}
                canEdit={false}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-fg-subtle">{t("contact.phones")}</span>
              <Contacts
                church={session.tenantSlug}
                memberId={person.id}
                kind="phone"
                contacts={contacts}
                canEdit={false}
              />
            </div>

            {/* R2.4. Theirs and the household's, each said for what it is. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-caption text-fg-subtle">{t("contact.addresses")}</span>
              <Places
                church={session.tenantSlug}
                memberId={person.id}
                places={addresses}
                canEdit={false}
              />
            </div>
          </div>
        </InfoCard>

        <InfoCard title={t("person.household")}>
          {household && household.members.length > 0 ? (
            household.members.map((m) => (
              <span key={m.id} className="flex items-center gap-2.5">
                <Avatar
                  name={m.displayName}
                  id={m.id}
                  className="size-7 text-[12px] font-semibold"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{m.displayName}</span>
                <span className="text-[13px] text-fg-subtle">
                  {t(`householdRole.${m.role}` as never)}
                </span>
              </span>
            ))
          ) : (
            <p className="text-[13px] text-fg-muted">{t("person.noHousehold")}</p>
          )}
        </InfoCard>

        {/*
          * R13.18, R1.5. What this person has given this year.
          *
          * Only for somebody whose role carries "See how much somebody gives".
          * Everybody else does not see an empty card where the number would
          * be: they see no card, because the absence of one says nothing.
          */}
        {giving ? (
          <InfoCard title={t("person.giving")}>
            <div data-numeric className="font-display text-[32px] leading-[38px] text-fg">
              {giving.gifts === 0 ? EMPTY : money(giving.cents)}
            </div>
            <div className="text-[13px] text-fg-muted">
              {giving.gifts === 0
                ? t("person.noGifts")
                : plural("person.giving.year", giving.gifts, {
                    last: giving.lastOn ? shortDate(giving.lastOn) : "",
                  })}
            </div>
          </InfoCard>
        ) : null}

        {/* R1.10. What this church asks about its people beyond the fields
            the product ships with. */}
        {extra.length > 0 ? (
          <InfoCard title={t("person.more")}>
            {extra.map((one) => (
              <div key={one.id} className="flex min-w-0 flex-col gap-0.5">
                <span className="text-caption text-fg-subtle">{one.label}</span>
                <span className="text-[length:var(--d-text-body)] text-fg">{one.value}</span>
              </div>
            ))}
          </InfoCard>
        ) : null}

        <InfoCard title={t("person.groupsAndTeams")}>
          {places.length === 0 ? (
            <p className="text-[13px] text-fg-muted">{t("person.noGroups")}</p>
          ) : (
            places.map((one) => (
              <span key={one.key} className="flex items-center gap-2.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: `var(--hue-${one.hue}-500)` }}
                />
                <span className="font-medium text-fg">{one.name}</span>
              </span>
            ))
          )}
        </InfoCard>

        </div>

        <div className="flex min-w-0 flex-[2_1_320px] flex-col md:border-l md:border-line md:pl-6">
          <InfoCard
            title={t("person.timeline")}
            action={
              canEdit ? (
                <NoteForm
                  church={session.tenantSlug}
                  memberId={person.id}
                  name={display}
                  canConfidential={canReadConfidentialNotes(session)}
                  trigger={
                    <Button variant="secondary" className="min-h-8 px-2.5 text-[13px]">
                      {t("person.addNote")}
                    </Button>
                  }
                />
              ) : null
            }
          >
            <Timeline entries={history} />
          </InfoCard>
        </div>
      </div>
    </AppShell>
  );
}
