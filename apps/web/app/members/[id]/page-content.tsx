import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  withTenant, getPerson, householdFor,
  personTimeline, servingForPerson, groupsForPerson,
  listContacts, listAddresses, givingForPerson, getChurch,
  listCustomFields, getCustomValues, listTags, listTagsForPerson, listCampuses,
  canEditPeople, canArchivePeople, canReadGivingAmounts, anniversaryOf,
  checksFor, canSeeChecks, listMilestones,
} from "@connectapp/db";
import { Avatar, Button, Tooltip } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { photoUrls } from "@/lib/photos";
import { lifecycleLabel, maritalOptions } from "@/lib/person-input";
import { longDate, shortDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { churchNow } from "@/lib/church-now";
import { Timeline } from "./timeline";
import { ArchiveButton } from "../archive-button";
import { Contacts } from "./contacts";
import { Places } from "./places";
import { WriteTo } from "@/components/inbox/write-to";
import { NoteForm } from "../note-form";
import { customFieldValue } from "../field-values";
import { canReadConfidentialNotes, canAnswerMessages } from "@connectapp/db";
import { tabMetadata } from "@/lib/page-metadata";
import { memberDirectoryReturnTo } from "@/lib/member-return";
import { MemberPanel, type MemberPanelSection } from "../member-panel";
import { Milestones } from "../milestones";
import { TagEditor } from "../tag-editor";
import { Checks } from "../checks";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("members.title"));
}

/**
 * One label and its value.
 *
 * No rule under it. Every value carried one, so a section of six fields drew
 * six lines across the window, and on a record where half of them are empty
 * the lines were the loudest thing on the screen: a reader met a ledger of
 * what the church does not know about somebody.
 */
function RecordValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-caption text-fg-subtle">{label}</span>
      <span className="text-[length:var(--d-text-body)] text-fg">{children}</span>
    </div>
  );
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
 * One unboxed section in the member record.
 *
 * The heading names the section; a light rule separates its contents from the
 * next section.
 */
function RecordSection({
  id,
  title,
  action,
  children,
}: {
  id?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-member-panel-section={id ? "" : undefined}
      /* No rule under it. The window shows one section at a time, so a line
         below the last thing on screen separates nothing. */
      className="scroll-mt-4 flex flex-col gap-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-title font-semibold text-fg">{title}</h3>
        {action}
      </div>
      {/* The contents in their own box, so a part can tell whether it is the
          first thing under the heading. Measured against the section itself,
          the heading was always first and every part drew a rule. */}
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

/**
 * R24.6. Names a part of a section that holds more than one thing.
 *
 * A rule above each one, so a section of three parts reads as three things
 * rather than one column of headings at the same weight. The first part of a
 * section goes without, because a line directly under the section's own
 * heading separates it from nothing.
 */
function RecordPart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h4 className="text-label font-medium text-fg-muted">{title}</h4>
      {children}
    </div>
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
 * Built to docs/redesign/design: the back link, who they are, and the record
 * sections.
 * What we hold about them, who they live with, what they are part of, and
 * everything that has happened, in that order.
 */
type PersonPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export async function PersonPanelPage({
  params,
  searchParams,
}: {
  params: PersonPageProps["params"];
  searchParams: PersonPageProps["searchParams"];
}) {
  const { id } = await params;
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = memberDirectoryReturnTo(rawReturnTo);
  const session = await requireSession();

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => {
    const person = await getPerson(tx, id, { role: session.role, userId: session.userId });
    if (!person) return null;

    // Found by their readable address or by their id, so everything after this
    // works from the record's own id rather than from whatever was in the URL.
    const memberId = person.id;

    // Record sections use the person's id for their related reads.
    /*
     * R1.5. Giving amounts are a field-level permission, so the read itself
     * is skipped rather than the number being hidden on the way out.
     */
    const amounts = canReadGivingAmounts(session);
    const zone = (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago";
    const year = churchNow(zone).date.slice(0, 4);

    const [
      contacts, addresses, household, groups, serving, history, giving,
      customFields, customValues, memberTags, allTags, campuses, anniversary, milestoneRows, checkStanding,
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
        /* R2.15. Days read on the church's own clock, so an evening's work is
           filed under the evening it happened. */
        { timezone: zone },
      ),
      amounts
        ? givingForPerson(tx, memberId, { from: `${year}-01-01`, to: `${year}-12-31` })
        : Promise.resolve(null),
      /* R1.10. Whatever this church decided a person needs. It was on the
         form and in the directory and nowhere on the record itself. */
      listCustomFields(tx, "person"),
      getCustomValues(tx, "person", memberId),
      listTagsForPerson(tx, memberId),
      /* R1.13. Every tag this church keeps, so one can be put on or taken off
         from the record itself. */
      listTags(tx),
      listCampuses(tx),
      anniversaryOf(tx, memberId),
      /* R2.6, R2.10. The dates a church is asked for and cannot produce, and
         the check that decides whether somebody may serve with children. */
      listMilestones(tx, memberId),
      canSeeChecks(session) ? checksFor(tx, session, memberId) : Promise.resolve(null),
    ]);

    return {
      person, contacts, addresses, household, groups, serving, history, giving,
      customFields, customValues, memberTags, allTags, campuses, anniversary, milestoneRows, checkStanding,
    };
  });

  // Not found and not permitted are the same response on purpose. A person in
  // another church must not be distinguishable from a person who does not exist.
  if (!result) notFound();
  const {
    person, contacts, addresses, household, groups, serving, history, giving,
    customFields, customValues, memberTags, allTags, campuses, anniversary, milestoneRows, checkStanding,
  } = result;

  /* R1.10. Every custom field configured by the church has a place on the record. */
  const extra = customFields
    .map((field) => ({
      id: field.id,
      label: field.label,
      value: customFieldValue(field, customValues[field.id], longDate),
    }));

  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;
  // R2.9. Their face, signed for the hour.
  const faces = await photoUrls([person.photoKey]);
  const canEdit = canEditPeople(session);
  const canArchive = canArchivePeople(session);
  const canMessage = canAnswerMessages(session);
  const editHref =
    `/members/${person.slug}/edit?returnTo=${encodeURIComponent(returnTo ?? "/members")}`;

  const actions = canMessage ? (
    <div className="flex items-center gap-2">
      <WriteTo at={person.slug} name={display} />
    </div>
  ) : undefined;

  /*
   * R24.6. Edit and Close, on the window's own footer.
   *
   * The design has them there, named, rather than a pencil in the corner. Edit
   * is the one thing a reader does to a record they have opened, and an icon
   * beside the close square is the quietest place on the window to put it.
   */
  /*
   * R24.6. What a reader does to a record they have opened. Closing is not
   * here: the square in the corner is the way out of every window in the
   * product, and a second one at the other end is two answers to one question.
   */
  /*
   * R24.6. Editing belongs to the sections that can be edited.
   *
   * Two of the seven hold fields the edit form writes: the personal details and
   * the address and contact. One Edit on the window's footer was a press whose
   * answer depended on which section happened to be open, so it moves onto the
   * heading of each section it actually acts on. The others carry their own
   * presses already: a milestone, a check, a note.
   */
  const editMark = (part?: string) => canEdit ? (
    <Tooltip content={t("action.edit")}>
      <Button
        variant="ghost"
        asChild
        className="size-[var(--d-tap)] min-h-0 rounded-[var(--d-radius-control)] px-0 [&_svg]:size-[var(--d-icon)]"
      >
        <Link
          href={part ? `${editHref}#${part}` : editHref}
          aria-label={t("action.edit")}
        >
          <Pencil />
        </Link>
      </Button>
    </Tooltip>
  ) : undefined;

  const panelFooter = canArchive ? (
    <div className="flex w-full items-center">
      <ArchiveButton
        mark
        church={session.tenantSlug}
        id={person.id}
        name={display}
        archived={Boolean(person.archivedAt)}
      />
    </div>
  ) : undefined;

  /*
   * R24.6. Seven at most, and fewer for most churches.
   *
   * Eleven entries made the rail a list to read rather than a place to go, and
   * several of them held one line each. Things that answer the same question
   * now share a section and keep their own names inside it.
   */
  const panelSections: MemberPanelSection[] = [
    { id: "overview", label: t("personForm.section.details") },
    { id: "contact", label: t("personForm.section.contact") },
    { id: "household", label: t("person.household") },
    { id: "timeline", label: t("person.churchHistory") },
    { id: "belonging", label: t("person.belonging") },
    ...(giving ? [{ id: "giving", label: t("person.giving") }] : []),
    { id: "tags", label: t("person.tags") },
    ...(customFields.length > 0 ? [{ id: "additional", label: t("person.more") }] : []),
  ];

  const content = (
    <>
      {/* Their name, status and personal facts open the record. */}
      <section
        id="overview"
        data-member-panel-section=""
        className="scroll-mt-4 flex flex-col gap-6"
      >
      <div className="flex flex-wrap items-center gap-5">
        {/* R24.6. The mark that edits these fields, on the row that names
            them, as it is on the address and contact section. */}
        <span className="order-last ml-auto self-start">{editMark("details")}</span>
        <Avatar
          name={display}
          src={person.photoKey ? (faces[person.photoKey] ?? null) : null}
          id={person.id}
          className="size-[108px] text-[34px] font-semibold"
        />
        <div className="min-w-[200px] flex-1">
          <div className="font-display text-[32px] leading-[38px] text-fg">{display}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PersonStatus status={person.lifecycleStatus} />
          </div>
        </div>

      </div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        <RecordValue label={t("personForm.dateOfBirth")}>
          {person.dateOfBirth ? longDate(person.dateOfBirth) : EMPTY}
        </RecordValue>
        <RecordValue label={t("person.maritalStatus")}>
          {maritalOptions().find((option) => option.value === person.maritalStatus)?.label ?? EMPTY}
        </RecordValue>
        {/* R2.11. Shown where there is one, so the record reads the way the
            form that wrote it asked. */}
        {anniversary ? (
          <RecordValue label={t("person.anniversary")}>{longDate(anniversary)}</RecordValue>
        ) : null}
      </div>
      </section>

      {/* Everything about the member stays grouped by section. The panel's left
          navigation keeps one part in view at a time. */}
      <div className="flex flex-col gap-7">
          {/*
            * R2.4, R24.6. Written where it is read.
            *
            * An address and a way of reaching somebody are each a row of their
            * own that is added and taken away one at a time, so there is no
            * form to fill in: the pencil led to the same three lists on
            * another address. They are edited here, and the edit form keeps
            * them for the fields beside them.
            */}
          <RecordSection id="contact" title={t("personForm.section.contact")}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-caption text-fg-subtle">{t("contact.emails")}</span>
                <Contacts memberId={person.id} kind="email" contacts={contacts} canEdit={canEdit} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-caption text-fg-subtle">{t("contact.phones")}</span>
                <Contacts memberId={person.id} kind="phone" contacts={contacts} canEdit={canEdit} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-caption text-fg-subtle">{t("contact.addresses")}</span>
                <Places memberId={person.id} places={addresses} canEdit={canEdit} />
              </div>
            </div>
          </RecordSection>

          <RecordSection id="household" title={t("person.household")} action={editMark("household")}>
            {household && household.members.length > 0 ? (
              household.members.map((m) => (
                <span key={m.id} className="flex items-center gap-2.5">
                  <Avatar name={m.displayName} id={m.id} className="size-7 text-[12px] font-semibold" />
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">{m.displayName}</span>
                  <span className="text-[13px] text-fg-subtle">
                    {t(`householdRole.${m.role}` as never)}
                  </span>
                </span>
              ))
            ) : (
              <p className="text-[13px] text-fg-muted">{t("person.noHousehold")}</p>
            )}
          </RecordSection>

          {/*
            * R2.6, R2.7. Three things, each named: the dates a church is asked
            * for years later, what it has marked, and what has happened.
            *
            * They used to sit as four loose blocks of the same weight, two of
            * them usually empty, with a note box open under them and a rule
            * below that separated nothing. On a record with no dates and no
            * milestones that is four lines of apology before the one thing
            * there is to read.
            */}
          <RecordSection id="timeline" title={t("person.churchHistory")} action={editMark("status")}>
            <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
              <RecordValue label={t("personForm.firstVisit")}>
                {person.firstVisitOn ? longDate(person.firstVisitOn) : EMPTY}
              </RecordValue>
              <RecordValue label={t("personForm.membershipDate")}>
                {person.membershipDate ? longDate(person.membershipDate) : EMPTY}
              </RecordValue>
              {campuses.length > 1 ? (
                <RecordValue label={t("person.campus")}>
                  {campuses.find((campus) => campus.id === person.campusId)?.name ?? EMPTY}
                </RecordValue>
              ) : null}
            </div>

            <RecordPart title={t("person.milestones")}>
              <Milestones memberId={person.id} rows={milestoneRows} canEdit={canEdit} />
            </RecordPart>

            {/* R2.7. The note is written into the history it joins, so the
                press that writes one belongs to the history rather than
                floating under it. */}
            <RecordPart title={t("timeline.title")}>
              <Timeline entries={history} />
              {canEdit ? (
                <NoteForm
                  inline
                  memberId={person.id}
                  name={display}
                  canConfidential={canReadConfidentialNotes(session)}
                />
              ) : null}
            </RecordPart>
          </RecordSection>

          <RecordSection id="belonging" title={t("person.belonging")}>
            <RecordPart title={t("groups.title")}>
              {groups.length === 0 ? (
                <p className="text-[13px] text-fg-muted">{t("person.notInGroup")}</p>
              ) : (
                groups.map((group) => (
                  <span key={group.groupId} className="flex items-center gap-2.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: `var(--hue-${group.typeHue ?? "fern"}-500)` }}
                    />
                    <span className="font-medium text-fg">{group.name}</span>
                  </span>
                ))
              )}
            </RecordPart>

            <RecordPart title={t("person.serving")}>
              {serving.length === 0 ? (
                <p className="text-[13px] text-fg-muted">{t("person.notOnTeam")}</p>
              ) : (
                serving.map((team) => (
                  <span key={team.teamId} className="flex items-center gap-2.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: `var(--hue-${team.hue}-500)` }}
                    />
                    <span className="font-medium text-fg">{team.teamName}</span>
                  </span>
                ))
              )}
            </RecordPart>

            {/* R2.10, R21.11. Read by the role the church trusts with it. */}
            {checkStanding ? (
              <RecordPart title={t("checks.title")}>
                <Checks
                  memberId={person.id}
                  standing={checkStanding.standing}
                  expiresOn={checkStanding.expiresOn}
                  rows={checkStanding.checks}
                  canEdit={canEdit}
                />
              </RecordPart>
            ) : null}
          </RecordSection>

          {giving ? (
            <RecordSection id="giving" title={t("person.giving")}>
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
            </RecordSection>
          ) : null}

          {/* R1.13. A tag goes on and comes off with one press, so this
              section carries no pencil either. */}
          <RecordSection id="tags" title={t("person.tags")}>
            {/* Keyed by the record, because the window is a parallel slot and
                keeps its component alive: without this, opening a second
                person showed the first person's tags. */}
            <TagEditor
              key={person.id}
              memberId={person.id}
              all={allTags.map((tag) => ({ id: tag.id, name: tag.name, hue: tag.hue }))}
              assigned={memberTags.map((tag) => tag.id)}
              canEdit={canEdit}
            />
          </RecordSection>

          {customFields.length > 0 ? (
            <RecordSection id="additional" title={t("person.more")} action={editMark("custom")}>
              {extra.map((one) => (
                <div key={one.id} className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-caption text-fg-subtle">{one.label}</span>
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {one.value || EMPTY}
                  </span>
                </div>
              ))}
            </RecordSection>
          ) : null}
      </div>
    </>
  );

  return (
      <MemberPanel
        title={display}
        sections={panelSections}
        actions={actions}
        footer={panelFooter}
        closeTo={returnTo ?? "/members"}
      >
        <div className="flex flex-col gap-5">{content}</div>
      </MemberPanel>
  );
}
