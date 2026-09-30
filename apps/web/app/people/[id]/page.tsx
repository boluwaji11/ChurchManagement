import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, FileText, Pencil } from "lucide-react";
import {
  withTenant, getPerson, getPersonForEdit, listNotesForPerson, listTagsForPerson,
  listTagsWithCounts, listCustomFields, getCustomValues, canEditPeople, canArchivePeople,
} from "@hearth/db";
import { Avatar, Badge, Button, Card, CardTitle, Separator, Banner } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { ArchiveButton } from "../archive-button";
import { TagEditor } from "../tag-editor";
import { t, plural } from "@hearth/i18n";
import { lifecycleLabel } from "@/lib/person-input";

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
    const person = await getPerson(tx, id);
    if (!person) return null;
    return {
      person,
      notes: await listNotesForPerson(tx, id, session.role, { tenantId: session.tenantId }),
      tags: await listTagsForPerson(tx, id),
      contact: await getPersonForEdit(tx, id),
      allTags: await listTagsWithCounts(tx),
      fields: await listCustomFields(tx, "person"),
      fieldValues: await getCustomValues(tx, "person", id),
    };
  });

  // Not found and not permitted are the same response on purpose. A person in
  // another church must not be distinguishable from a person who does not exist.
  if (!result) notFound();
  const { person, notes, tags, contact, allTags, fields, fieldValues } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;
  const restricted = notes.filter((n) => n.restricted).length;

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={`/people?church=${session.tenantSlug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> {t("people.title")}
      </Link>

      <div className="mb-8 flex items-center gap-4">
        <Avatar name={display} id={person.id} size="xl" />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-display text-fg">{display}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{lifecycleLabel(person.lifecycleStatus)}</Badge>
          </div>
        </div>
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

      {canEditPeople(session.role) || canArchivePeople(session.role) ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {canEditPeople(session.role) ? (
            <Button asChild variant="secondary">
              <Link href={`/people/${person.id}/edit?church=${session.tenantSlug}`}>
                <Pencil /> {t("action.edit")}
              </Link>
            </Button>
          ) : null}
          {canArchivePeople(session.role) ? (
            <ArchiveButton
              church={session.tenantSlug}
              id={person.id}
              name={display}
              archived={Boolean(person.archivedAt)}
            />
          ) : null}
        </div>
      ) : null}

      <Card className="mb-6">
        <CardTitle>{t("person.details")}</CardTitle>
        <Separator className="my-4" />
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {[
            [t("person.firstName"), person.firstName],
            [t("person.lastName"), person.lastName],
            [t("person.email"), contact?.email ?? t("person.notRecorded")],
            [t("person.phone"), contact?.phone ?? t("person.notRecorded")],
            [t("person.dateOfBirth"), person.dateOfBirth ?? t("person.notRecorded")],
            [t("person.firstVisit"), person.firstVisitOn ?? t("person.notRecorded")],
            [t("person.membershipDate"), person.membershipDate ?? t("person.notAMember")],
            [t("person.status"), lifecycleLabel(person.lifecycleStatus)],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-label text-fg-muted">{k}</dt>
              <dd className="text-[length:var(--d-text-body)] text-fg">{v}</dd>
            </div>
          ))}
        </dl>
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

      <Card>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{t("person.notes")}</CardTitle>
          <Badge tone="neutral">{t(`role.${session.role}`)}</Badge>
        </div>
        <Separator className="my-4" />

        {restricted > 0 ? (
          <Banner tone="info" title={plural("notes.restrictedCount", restricted)} className="mb-4">
            {t("notes.restricted.body", { role: t(`role.${session.role}`) })}
          </Banner>
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
      </main>
    </>
  );
}
