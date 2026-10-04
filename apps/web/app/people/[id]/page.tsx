import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  withTenant, getPerson, getPersonForEdit, householdFor, addressFor,
  personTimeline, servingForPerson, groupsForPerson,
  canEditPeople,
} from "@hearth/db";
import { Avatar, Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { lifecycleLabel } from "@/lib/person-input";
import { longDate } from "@/lib/dates";
import { Timeline } from "./timeline";
import { MessageButton } from "./message";
import { NoteForm } from "../note-form";
import { canReadConfidentialNotes } from "@hearth/db";

export const dynamic = "force-dynamic";

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

    return {
      person,
      contact: await getPersonForEdit(tx, id),
      household: await householdFor(tx, id),
      // R2.4. Theirs, or the household's, which is what a church writes.
      address: await addressFor(tx, id),
      groups: await groupsForPerson(tx, id),
      serving: await servingForPerson(tx, id),
      // R2.15. Everything that has happened with this person, in one order.
      history: await personTimeline(
        tx,
        { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
        id,
      ),
    };
  });

  // Not found and not permitted are the same response on purpose. A person in
  // another church must not be distinguishable from a person who does not exist.
  if (!result) notFound();
  const { person, contact, household, address, groups, serving, history } = result;

  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;
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
        href={`/people?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      {/* A 72px face, the name in Fraunces at 32, and under it the one line
          that places them: what they are to the church, whose household, and
          since when. */}
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={display} id={person.id} className="size-[72px] text-[24px] font-semibold" />
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
            <Button
              variant="ghost"
              asChild
              className="size-[var(--d-tap)] min-h-0 rounded-[var(--d-radius-control)] px-0 [&_svg]:size-[var(--d-icon)]"
            >
              <Link
                href={`/people/${person.id}/edit?church=${session.tenantSlug}`}
                aria-label={t("action.edit")}
                title={t("action.edit")}
              >
                <Pencil />
              </Link>
            </Button>
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
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[length:var(--d-text-body)]">
            <dt className="text-fg-subtle">{t("person.email")}</dt>
            <dd className="min-w-0 truncate text-fg">
              {contact?.email ? (
                <a href={`mailto:${contact.email}`} className="underline-offset-4 hover:underline">
                  {contact.email}
                </a>
              ) : (
                EMPTY
              )}
            </dd>

            <dt className="text-fg-subtle">{t("person.phone")}</dt>
            <dd className="text-fg tabular-nums">
              {contact?.phone ? (
                <a
                  href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
                  className="underline-offset-4 hover:underline"
                >
                  {contact.phone}
                </a>
              ) : (
                EMPTY
              )}
            </dd>

            <dt className="text-fg-subtle">{t("person.address")}</dt>
            <dd className="text-fg">{address ?? EMPTY}</dd>
          </dl>
        </InfoCard>

        <InfoCard title={t("person.household")}>
          {household && household.members.length > 0 ? (
            household.members.map((m) => (
              <span key={m.id} className="flex items-center gap-2.5">
                <Avatar
                  name={m.displayName}
                  id={m.id}
                  className="size-7 text-[11px] font-semibold"
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
          * R13.x. The shell of the giving card the design draws here.
          *
          * There are no gift or fund tables yet, so it has nothing to read and
          * shows what a person with no recorded giving would see. It fills in
          * when the money work is built.
          */}
        <InfoCard title={t("person.giving")}>
          <div className="font-display text-[32px] leading-[38px] text-fg">{EMPTY}</div>
          <div className="text-[13px] text-fg-muted">{t("person.noGifts")}</div>
        </InfoCard>

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
                  personId={person.id}
                  name={display}
                  canConfidential={canReadConfidentialNotes(session.role)}
                  trigger={
                    <Button variant="secondary" className="min-h-[30px] px-2.5 text-[13px]">
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
