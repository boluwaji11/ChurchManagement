import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, FileText, Plus } from "lucide-react";
import {
  withTenant, getPerson, getPersonForEdit, householdFor, addressFor, listNotesForPerson, listTagsForPerson, listsForPerson,
  personTimeline,
  listTagsWithCounts, listCustomFields, getCustomValues, canEditPeople, canArchivePeople,
  listRelationships, listPeople, listMilestones, servingForPerson,
  assignmentsForPerson, listBlockouts, getServingPreference,
  canFollowUp, listPipelines, entriesFor, tasksFor, getChurch,
  canSeeChecks, checksFor, canReadConfidentialNotes,
} from "@hearth/db";
import {
  Avatar, Badge, Button, Card, CardTitle, Separator, Banner, HueDot, type Hue,
} from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { AppShell } from "@/components/app-shell";
import { ArchiveButton } from "../archive-button";
import { TagEditor } from "../tag-editor";
import { Timeline } from "./timeline";
import { Relationships } from "../relationships";
import { Availability } from "../availability";
import { Milestones } from "../milestones";
import { FollowUps, PersonTasks } from "../followups";
import { Checks } from "../checks";
import { NoteForm } from "../note-form";
import { t, plural } from "@hearth/i18n";
import { lifecycleLabel } from "@/lib/person-input";
import { longDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * A recorded value, as a person reads it. A yes-or-no field that was never
 * answered still reads "No", because that is what the checkbox said.
 */
function showValue(type: string, value: unknown): string {
  if (type === "boolean") return value === true ? t("value.yes") : t("value.no");
  if (value === null || value === undefined || value === "") return t("person.notRecorded");
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : t("person.notRecorded");
  return String(value);
}

/** One field of a record, and a way to act on it when there is one. */
/** What a field with nothing in it reads as. */
const EMPTY = "\u2014";

/** First letters, for the household faces. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * R24.6. One card in the person's grid.
 *
 * A quiet heading at 13px rather than a title, because the card's contents are
 * the thing being read and the heading is only saying which card this is.
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
        <h3 className="text-[13px] font-medium text-fg-subtle">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** R2.2. The same pill the directory uses, so a status looks the same anywhere. */
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

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string; saved?: string; restored?: string }>;
}) {
  const { id } = await params;
  const { church, saved, restored } = await searchParams;
  const session = await requireSession(church);

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => {
    const person = await getPerson(tx, id, { role: session.role, userId: session.userId });
    if (!person) return null;

    const today = churchNow(
      (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
    ).date;

    return {
      person,
      notes: await listNotesForPerson(tx, id, session.role, { tenantId: session.tenantId }),
      tags: await listTagsForPerson(tx, id),
      // R1.14. Which lists this person is on, which is the question somebody
      // asks when they want to know why she keeps being contacted.
      onLists: canEditPeople(session.role) ? await listsForPerson(tx, id) : [],
      // R2.15. Everything that has happened with this person, in one order.
      history: await personTimeline(
        tx,
        { tenantId: session.tenantId, role: session.role, userId: session.userId },
        id,
      ),
      contact: await getPersonForEdit(tx, id),
      // R2.4. The family around this record, for the card the design gives it.
      household: await householdFor(tx, id),
      // R2.4. Theirs, or the household's, which is what a church writes.
      address: await addressFor(tx, id),
      allTags: await listTagsWithCounts(tx),
      fields: await listCustomFields(tx, "person"),
      fieldValues: await getCustomValues(tx, "person", id),
      relationships: await listRelationships(tx, id),
      // R10.1. Every team they serve on, in one place rather than one per ministry.
      serving: await servingForPerson(tx, id),
      // R10.3 to R10.5. What they are down for, and what they have said about
      // when they can.
      upcoming: await assignmentsForPerson(tx, id, { from: today, limit: 8 }),
      away: await listBlockouts(tx, id, { from: today }),
      frequency: await getServingPreference(tx, id),
      milestones: await listMilestones(tx, id),
      pipelines: canFollowUp(session.role) ? await listPipelines(tx) : [],
      entries: canFollowUp(session.role) ? await entriesFor(tx, id) : [],
      tasks: canFollowUp(session.role) ? await tasksFor(tx, id) : [],
      // R2.10, R21.11. The safeguarding drawer, for the roles that hold it.
      checks: canSeeChecks(session.role) ? await checksFor(tx, { role: session.role }, id) : null,
      today,
      // Everyone in the church, for the picker. A church of 50 to 500 fits in a
      // list; the search this will need at five thousand is R2.14's job.
      everyone: await listPeople(tx),
    };
  });

  // Not found and not permitted are the same response on purpose. A person in
  // another church must not be distinguishable from a person who does not exist.
  if (!result) notFound();
  const {
    person, notes, tags, contact, household, address, allTags, fields, fieldValues, relationships, everyone, serving, upcoming, away, frequency,
    milestones, pipelines, entries, tasks, today, checks, onLists, history,
  } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;
  const restricted = notes.filter((n) => n.restricted).length;

  return (
    <AppShell
      session={session}
      title={t("person.title")}
      action={
        canEditPeople(session.role) ? (
          <Button asChild>
            <a href="#notes">
              <Plus /> {t("person.addNote")}
            </a>
          </Button>
        ) : undefined
      }
    >
      <Link
        href={`/people?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      {/* 72px avatar, the name in Fraunces at 32, and under it the one line
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
                person.membershipDate ? t("person.joinedOn", { date: longDate(person.membershipDate) }) : null,
              ].filter(Boolean).join(" \u00b7 ")}
            </span>
          </div>
        </div>

        {canEditPeople(session.role) ? (
          <Button variant="secondary" asChild>
            <Link href={`/people/${person.id}/edit?church=${session.tenantSlug}`}>
              {t("action.edit")}
            </Link>
          </Button>
        ) : null}
      </div>

      {saved ? <Banner tone="success" title={t("person.saved")} className="mb-6" /> : null}

      {restored ? <Banner tone="success" title={t("person.restored")} className="mb-6" /> : null}

      {person.archivedAt ? (
        <Banner tone="warning" title={t("person.archived.title")} className="mb-6">
          {t("person.archived.body", {
            date: new Date(person.archivedAt).toLocaleDateString(undefined, {
              day: "numeric", month: "long", year: "numeric",
            }),
          })}
        </Banner>
      ) : null}



      {/*
        * Two columns from large up. The left is the record, the right is what
        * the church is doing about them. On a phone it is one column and the
        * record comes first, which is what somebody looking them up came for.
        */}
      {/* One column, as the design has it. The old two-column split put the
          church's follow-up work in a narrow rail beside the record, and the
          record is what somebody opened this page for. */}

      {/* The design's card grid: what we hold about them, who they live with,
          and what they are part of. It wraps at 280px, so one column on a
          phone and three on a desk. */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <InfoCard title={t("person.contact")}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[length:var(--d-text-body)]">
            <dt className="text-fg-subtle">{t("person.email")}</dt>
            <dd className="min-w-0 truncate text-fg">
              {contact?.email ? (
                <a href={`mailto:${contact.email}`} className="underline-offset-4 hover:underline">
                  {contact.email}
                </a>
              ) : EMPTY}
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
              ) : EMPTY}
            </dd>

            <dt className="text-fg-subtle">{t("person.address")}</dt>
            <dd className="text-fg">{address ?? EMPTY}</dd>

            <dt className="text-fg-subtle">{t("person.dateOfBirth")}</dt>
            <dd className="text-fg">
              {person.dateOfBirth ? longDate(person.dateOfBirth) : EMPTY}
            </dd>

            <dt className="text-fg-subtle">{t("person.firstVisit")}</dt>
            <dd className="text-fg">
              {person.firstVisitOn ? longDate(person.firstVisitOn) : EMPTY}
            </dd>
          </dl>

          {/* R8.10. What a label printed a warning about, where the church
              keeps it. The station shows these at the moment of check-in. */}
          {contact?.allergies || contact?.medicalNote ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-3 text-[length:var(--d-text-body)]">
              {contact.allergies ? (
                <>
                  <dt className="text-fg-subtle">{t("personForm.allergies")}</dt>
                  <dd className="text-fg">{contact.allergies}</dd>
                </>
              ) : null}
              {contact.medicalNote ? (
                <>
                  <dt className="text-fg-subtle">{t("personForm.medicalNote")}</dt>
                  <dd className="text-fg">{contact.medicalNote}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
        </InfoCard>

        <InfoCard title={t("person.household")}>
          {household && household.members.length > 0 ? (
            household.members.map((m) => (
              <Link
                key={m.id}
                href={`/people/${m.id}?church=${session.tenantSlug}`}
                className="flex items-center gap-2.5"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-semibold text-fg-muted">
                  {initialsOf(m.displayName)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{m.displayName}</span>
                <span className="text-[13px] text-fg-subtle">
                  {t(`householdRole.${m.role}` as never)}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-[13px] text-fg-muted">{t("person.noHousehold")}</p>
          )}
        </InfoCard>

        <InfoCard title={t("person.groupsAndTeams")}>
          {serving.length === 0 ? (
            <p className="text-[13px] text-fg-muted">{t("person.noGroups")}</p>
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
        </InfoCard>
      </div>

      {fields.length > 0 ? (
        <Card className="mb-6">
          <CardTitle>{t("person.more")}</CardTitle>
          <Separator className="my-4" />
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.id} className="flex flex-col">
                <dt className="text-label text-fg-muted">{f.label}</dt>
                <dd className="text-[length:var(--d-text-body)] text-fg">
                  {showValue(f.type, fieldValues[f.id])}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardTitle>{t("person.milestones")}</CardTitle>
        <Separator className="my-4" />
        <Milestones
          church={session.tenantSlug}
          personId={person.id}
          rows={milestones}
          canEdit={canEditPeople(session.role)}
        />
      </Card>

      <Card className="mb-6">
        <CardTitle>{t("person.relationships")}</CardTitle>
        <Separator className="my-4" />
        <Relationships
          church={session.tenantSlug}
          personId={person.id}
          rows={relationships.map((r) => ({
            id: r.id,
            kind: r.kind,
            relatedPersonId: r.relatedPersonId,
            relatedName: r.relatedName,
          }))}
          candidates={everyone
            .filter((p) => p.id !== person.id)
            .map((p) => ({
              id: p.id,
              name: `${p.preferredName ?? p.firstName} ${p.lastName}`,
            }))}
          canEdit={canEditPeople(session.role)}
          canLift={canArchivePeople(session.role)}
        />
      </Card>

      {serving.length > 0 ? (
        <Card className="mb-6">
          <CardTitle>{t("serving.onTeams")}</CardTitle>
          <Separator className="my-4" />
          <ul className="flex flex-col gap-2">
            {serving.map((team) => (
              <li key={team.teamId} className="flex flex-wrap items-center gap-2">
                <HueDot hue={team.hue as Hue} />
                <Link
                  href={`/serving/${team.teamId}?church=${session.tenantSlug}`}
                  className="text-[length:var(--d-text-body)] text-fg underline-offset-4 hover:underline"
                >
                  {team.teamName}
                </Link>
                {team.role === "leader" ? (
                  <Badge tone="neutral">{t("serving.role.leader")}</Badge>
                ) : null}
                {team.positions.length > 0 ? (
                  <span className="text-caption text-fg-muted">
                    {team.positions.join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {upcoming.length > 0 ? (
            <>
              <Separator className="my-4" />
              <h3 className="mb-2 text-label text-fg">{t("serving.upcoming")}</h3>
              <ul className="flex flex-col gap-1">
                {upcoming.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-[length:var(--d-text-body)] text-fg">
                      {longDate(entry.occursOn)}
                    </span>
                    <span className="text-caption text-fg-muted">
                      {entry.teamName} {entry.positionName}
                    </span>
                    {entry.status === "declined" ? (
                      <Badge tone="danger">{t("plan.status.declined")}</Badge>
                    ) : entry.status === "accepted" ? (
                      <Badge tone="success">{t("plan.status.accepted")}</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <Separator className="my-4" />
          <Availability
            church={session.tenantSlug}
            personId={person.id}
            frequency={frequency}
            away={away.map((range) => ({
              id: range.id,
              startsOn: range.startsOn,
              endsOn: range.endsOn,
              reason: range.reason,
            }))}
            canEdit={canEditPeople(session.role)}
          />
        </Card>
      ) : null}

      {onLists.length > 0 ? (
        <Card className="mb-6">
          <CardTitle>{t("lists.title")}</CardTitle>
          <Separator className="my-4" />
          <ul className="flex flex-wrap gap-2">
            {onLists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/people?church=${session.tenantSlug}&list=${list.id}`}
                  className="inline-flex items-center rounded-full border border-line px-3 py-1 text-caption text-fg-muted hover:border-line-strong hover:text-fg"
                >
                  {list.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardTitle>{t("person.tags")}</CardTitle>
        <Separator className="my-4" />
        <TagEditor
          church={session.tenantSlug}
          personId={person.id}
          all={allTags.map((t) => ({ id: t.id, name: t.name, hue: t.hue }))}
          assigned={tags.map((t) => t.id)}
          canEdit={canEditPeople(session.role)}
        />
      </Card>

      {/* Full width, because it is the one thing on this screen that is read
          top to bottom rather than glanced at. */}
      <InfoCard
        title={t("person.timeline")}
        action={
          canEditPeople(session.role) ? (
            <Button variant="secondary" asChild className="min-h-[30px] px-2.5 text-[13px]">
              <a href="#notes">{t("person.addNote")}</a>
            </Button>
          ) : null
        }
      >
        <Timeline entries={history} />
      </InfoCard>

      <Card id="notes">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{t("person.notes")}</CardTitle>
          <Badge tone="neutral">{t(`role.${session.role}`)}</Badge>
        </div>
        <Separator className="my-4" />

        {restricted > 0 ? (
          <Banner tone="info" title={plural("notes.restrictedCount", restricted)} className="mb-4" />
        ) : null}

        {canEditPeople(session.role) ? (
          <div className="mb-4">
            <NoteForm
              church={session.tenantSlug}
              personId={person.id}
              canConfidential={canReadConfidentialNotes(session.role)}
            />
          </div>
        ) : null}

        <ul className="flex flex-col gap-3">
          {notes.length === 0 ? (
            <li className="text-[length:var(--d-text-body)] text-fg-muted">{t("notes.none")}</li>
          ) : null}

          {notes.map((note) => (
            <li
              key={note.id}
              className={
                note.classification === "confidential"
                  ? "rounded-lg border border-danger/25 bg-danger-soft/40 p-3"
                  : "rounded-lg border border-line bg-canvas p-3"
              }
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {note.classification === "confidential" ? (
                  <Badge tone="danger"><Lock className="size-3" /> {t("notes.confidential")}</Badge>
                ) : (
                  <Badge tone="neutral"><FileText className="size-3" /> {t("notes.general")}</Badge>
                )}
                <span className="text-caption text-fg-muted">
                  {t("notes.by", {
                    author: note.authorName ?? t("notes.unattributed"),
                    date: new Date(note.createdAt).toLocaleDateString(undefined, {
                      day: "numeric", month: "long", year: "numeric",
                    }),
                  })}
                </span>
              </div>
              {note.restricted ? (
                <p className="text-[length:var(--d-text-body)] italic text-fg-subtle">
                  {t("notes.restricted")}
                </p>
              ) : (
                <p className="text-[length:var(--d-text-body)] text-fg">{note.body}</p>
              )}
            </li>
          ))}
        </ul>
      </Card>

        {canArchivePeople(session.role) ? (
          <div className="mt-2 mb-6">
            <ArchiveButton
              church={session.tenantSlug}
              id={person.id}
              name={display}
              archived={Boolean(person.archivedAt)}
            />
          </div>
        ) : null}


        {canFollowUp(session.role) ? (
        <Card className="mb-6">
          <CardTitle>{t("person.followups")}</CardTitle>
          <Separator className="my-4" />
          <FollowUps
            church={session.tenantSlug}
            personId={person.id}
            today={today}
            canEdit
            pipelines={pipelines.map((pipeline) => ({
              id: pipeline.id, name: pipeline.name, hue: pipeline.hue,
            }))}
            entries={entries.map((entry) => ({
              id: entry.id,
              pipelineName: entry.pipelineName,
              pipelineHue: entry.pipelineHue,
              status: entry.status,
              startedOn: entry.startedOn,
              exitReason: entry.exitReason,
              steps: entry.steps.map((step) => ({
                id: step.id,
                title: step.title,
                dueOn: step.dueOn,
                doneAt: step.doneAt ? step.doneAt.toISOString() : null,
                outcome: step.outcome,
                mine: step.assigneeUserId === session.userId,
              })),
            }))}
          />
        </Card>
      ) : null}

        {canFollowUp(session.role) ? (
        <Card className="mb-6">
          <CardTitle>{t("followups.tasks")}</CardTitle>
          <Separator className="my-4" />
          <PersonTasks
            church={session.tenantSlug}
            personId={person.id}
            today={today}
            canEdit
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              dueOn: task.dueOn,
              doneAt: task.doneAt ? task.doneAt.toISOString() : null,
              outcome: task.outcome,
              mine: task.assigneeUserId === session.userId,
            }))}
          />
        </Card>
        ) : null}

        {checks ? (
          <Card className="mb-6">
            <CardTitle>{t("checks.title")}</CardTitle>
            <Separator className="my-4" />
            <Checks
              church={session.tenantSlug}
              personId={person.id}
              standing={checks.standing}
              expiresOn={checks.expiresOn}
              canEdit
              rows={checks.checks.map((row) => ({
                id: row.id,
                provider: row.provider,
                status: row.status,
                completedOn: row.completedOn,
                expiresOn: row.expiresOn,
              }))}
            />
          </Card>
        ) : null}
    </AppShell>
  );
}
