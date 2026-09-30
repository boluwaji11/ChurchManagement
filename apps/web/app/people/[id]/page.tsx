import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, FileText } from "lucide-react";
import { withTenant, getPerson, listNotesForPerson, listTagsForPerson } from "@hearth/db";
import { Avatar, Badge, Card, CardTitle, Separator, Banner, HueTag } from "@hearth/ui";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

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
    const person = await getPerson(tx, id);
    if (!person) return null;
    return {
      person,
      notes: await listNotesForPerson(tx, id, session.role, { tenantId: session.tenantId }),
      tags: await listTagsForPerson(tx, id),
    };
  });

  // Not found and not permitted are the same response on purpose. A person in
  // another church must not be distinguishable from a person who does not exist.
  if (!result) notFound();
  const { person, notes, tags } = result;
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
        <ArrowLeft className="size-4" /> Directory
      </Link>

      <div className="mb-8 flex items-center gap-4">
        <Avatar name={display} id={person.id} size="xl" />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-display text-fg">{display}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{person.lifecycleStatus.replace(/_/g, " ")}</Badge>
            {tags.map((t) => (
              <HueTag key={t.id} hue={t.hue}>{t.name}</HueTag>
            ))}
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardTitle>Details</CardTitle>
        <Separator className="my-4" />
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {[
            ["Legal first name", person.firstName],
            ["Surname", person.lastName],
            ["Date of birth", person.dateOfBirth ?? "Not recorded"],
            ["First visit", person.firstVisitOn ?? "Not recorded"],
            ["Membership date", person.membershipDate ?? "Not a member"],
            ["Status", person.lifecycleStatus.replace(/_/g, " ")],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-label text-fg-muted">{k}</dt>
              <dd className="text-[length:var(--d-text-body)] text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Notes</CardTitle>
          <Badge tone="neutral">{session.role}</Badge>
        </div>
        <Separator className="my-4" />

        {restricted > 0 ? (
          <Banner tone="info" title={`${restricted} note${restricted === 1 ? "" : "s"} restricted`} className="mb-4">
            The {session.role} role can see that these notes exist, who wrote them, and when. It cannot
            read them. The body is encrypted with a key the database never holds, and the field is absent
            from the response rather than blank.
          </Banner>
        ) : null}

        <ul className="flex flex-col gap-3">
          {notes.length === 0 ? (
            <li className="text-[length:var(--d-text-body)] text-fg-muted">No notes yet.</li>
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
                  <Badge tone="danger"><Lock className="size-3" /> Confidential</Badge>
                ) : (
                  <Badge tone="neutral"><FileText className="size-3" /> General</Badge>
                )}
                <span className="text-caption text-fg-muted">
                  {note.authorName ?? "Unattributed"} on{" "}
                  {new Date(note.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              {note.restricted ? (
                <p className="text-[length:var(--d-text-body)] italic text-fg-subtle">
                  Restricted. Your role cannot read this note.
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
