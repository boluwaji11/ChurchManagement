import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, FileText, Pencil } from "lucide-react";
import {
  withTenant, getPerson, getPersonForEdit, listNotesForPerson, listTagsForPerson, listsForPerson,
  personTimeline, listAbilities, abilitiesForPerson,
  listTagsWithCounts, listCustomFields, getCustomValues, canEditPeople, canArchivePeople,
  listRelationships, listPeople, listMilestones,
  canFollowUp, listPipelines, entriesFor, tasksFor, getChurch,
  canSeeChecks, checksFor, canReadConfidentialNotes,
} from "@hearth/db";
import { Avatar, Badge, Button, Card, CardTitle, Separator, Banner } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { AppHeader } from "@/components/app-header";
import { ArchiveButton } from "../archive-button";
import { TagEditor } from "../tag-editor";
import { Timeline } from "./timeline";
import { AbilityEditor } from "../ability-editor";
import { Relationships } from "../relationships";
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
function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-label text-fg-muted">{label}</dt>
      <dd className="text-[length:var(--d-text-body)] text-fg">
        {href ? (
          <a href={href} className="underline-offset-4 hover:underline">{value}</a>
        ) : (
          value
        )}
      </dd>
    </div>
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
    return {
      person,
      notes: await listNotesForPerson(tx, id, session.role, { tenantId: session.tenantId }),
      tags: await listTagsForPerson(tx, id),
      // R1.14. Which lists this person is on, which is the question somebody
      // asks when they want to know why she keeps being contacted.
      onLists: canEditPeople(session.role) ? await listsForPerson(tx, id) : [],
      // R2.9. What this person can do, cares about, and is gifted in.
      allAbilities: await listAbilities(tx),
      abilities: await abilitiesForPerson(tx, id),
      // R2.15. Everything that has happened with this person, in one order.
      history: await personTimeline(
        tx,
        { tenantId: session.tenantId, role: session.role, userId: session.userId },
        id,
      ),
      contact: await getPersonForEdit(tx, id),
      allTags: await listTagsWithCounts(tx),
      fields: await listCustomFields(tx, "person"),
      fieldValues: await getCustomValues(tx, "person", id),
      relationships: await listRelationships(tx, id),
      milestones: await listMilestones(tx, id),
      pipelines: canFollowUp(session.role) ? await listPipelines(tx) : [],
      entries: canFollowUp(session.role) ? await entriesFor(tx, id) : [],
      tasks: canFollowUp(session.role) ? await tasksFor(tx, id) : [],
      // R2.10, R21.11. The safeguarding drawer, for the roles that hold it.
      checks: canSeeChecks(session.role) ? await checksFor(tx, { role: session.role }, id) : null,
      today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
      // Everyone in the church, for the picker. A church of 50 to 500 fits in a
      // list; the search this will need at five thousand is R2.14's job.
      everyone: await listPeople(tx),
    };
  });

  // Not found and not permitted are the same response on purpose. A person in
  // another church must not be distinguishable from a person who does not exist.
  if (!result) notFound();
  const {
    person, notes, tags, contact, allTags, fields, fieldValues, relationships, everyone,
    milestones, pipelines, entries, tasks, today, checks, onLists, history,
    allAbilities, abilities,
  } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;
  const restricted = notes.filter((n) => n.restricted).length;

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href={`/people?church=${session.tenantSlug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={display} id={person.id} size="xl" />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-display text-fg">{display}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{lifecycleLabel(person.lifecycleStatus)}</Badge>
            </div>
          </div>
        </div>

        {canEditPeople(session.role) ? (
          <Button asChild>
            <Link href={`/people/${person.id}/edit?church=${session.tenantSlug}`}>
              <Pencil /> {t("action.edit")}
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
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex flex-col">

      <Card className="mb-6">
        <CardTitle>{t("person.details")}</CardTitle>
        <Separator className="my-4" />
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Detail label={t("person.firstName")} value={person.firstName} />
          <Detail label={t("person.lastName")} value={person.lastName} />
          <Detail
            label={t("person.email")}
            value={contact?.email ?? t("person.notRecorded")}
            href={contact?.email ? `mailto:${contact.email}` : undefined}
          />
          <Detail
            label={t("person.phone")}
            value={contact?.phone ?? t("person.notRecorded")}
            href={contact?.phone ? `tel:${contact.phone.replace(/[^+\d]/g, "")}` : undefined}
          />
          <Detail
            label={t("person.dateOfBirth")}
            value={person.dateOfBirth ? longDate(person.dateOfBirth) : t("person.notRecorded")}
          />
          <Detail
            label={t("person.firstVisit")}
            value={person.firstVisitOn ? longDate(person.firstVisitOn) : t("person.notRecorded")}
          />
          <Detail
            label={t("person.membershipDate")}
            value={person.membershipDate ? longDate(person.membershipDate) : t("person.notAMember")}
          />
          <Detail label={t("person.status")} value={lifecycleLabel(person.lifecycleStatus)} />
        </dl>

        {/* R8.10. What a label printed a warning about, where somebody can
            read it. The station shows these at the moment of check-in; this is
            where the church keeps them. */}
        {contact?.allergies || contact?.medicalNote ? (
          <>
            <Separator className="my-4" />
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {contact.allergies ? (
                <Detail label={t("personForm.allergies")} value={contact.allergies} />
              ) : null}
              {contact.medicalNote ? (
                <Detail label={t("personForm.medicalNote")} value={contact.medicalNote} />
              ) : null}
            </dl>
          </>
        ) : null}


      </Card>

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
        <CardTitle>{t("ability.title")}</CardTitle>
        <Separator className="my-4" />
        <AbilityEditor
          church={session.tenantSlug}
          personId={person.id}
          all={allAbilities.map((a) => ({ id: a.id, kind: a.kind, name: a.name }))}
          assigned={abilities.map((a) => a.id)}
          canEdit={canEditPeople(session.role)}
        />
      </Card>

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

      <Card className="mb-6">
        <CardTitle>{t("timeline.title")}</CardTitle>
        <Separator className="my-4" />
        <Timeline entries={history} />
      </Card>

      <Card>
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

      </div>

      <aside className="flex flex-col">
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
      </aside>
      </div>
      </main>
    </>
  );
}
