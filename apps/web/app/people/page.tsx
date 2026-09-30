import Link from "next/link";
import { ArrowRight, Users, UserPlus, HeartHandshake, Archive, Plus } from "lucide-react";
import {
  withTenant, listPeople, countPeopleByStatus, canEditPeople, type PersonRow,
} from "@hearth/db";
import {
  Avatar, Badge, Table, Thead, Th, Tr, Td, StatTile, EmptyState, Button, Banner,
} from "@hearth/ui";
import { PageTitle, Section } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "primary" | "accent" | "neutral" | "success"> = {
  member: "primary",
  visitor: "accent",
  regular_attender: "success",
  inactive: "neutral",
};

const label = (status: string) => status.replace(/_/g, " ");

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string; show?: string }>;
}) {
  const { church, archived, show } = await searchParams;
  // Redirects to sign-in, or to the church chooser if this user is not a member.
  const session = await requireSession(church);

  /**
   * One transaction, one tenant context. Notice there is no tenant filter in the
   * queries below: row-level security supplies it, so forgetting one returns
   * nothing rather than another church's members.
   */
  const { people, counts } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      people: await listPeople(tx, { includeArchived: show === "archived" }),
      counts: await countPeopleByStatus(tx),
    }),
  );

  const showArchived = show === "archived";
  const total = people.length;
  const members = counts["member"] ?? 0;
  const visitors = counts["visitor"] ?? 0;

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <PageTitle title="Directory" lede={session.tenantName} className="mb-0" />
        {canEditPeople(session.role) ? (
          <Button asChild>
            <Link href={`/people/new?church=${session.tenantSlug}`}>
              <Plus /> Add someone
            </Link>
          </Button>
        ) : null}
      </div>

      {archived ? <Banner tone="success" title="Archived" className="mb-8" /> : null}

      {session.role === "staff" || session.role === "member" ? (
        <Banner tone="info" title="Some things are hidden from your role" className="mb-8">
          Confidential pastoral notes are restricted. You will see that they exist and cannot read them.
        </Banner>
      ) : null}

      <Section title="At a glance">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="People" value={String(total)} hue="indigo" icon={<Users className="size-4" />} />
          <StatTile label="Members" value={String(members)} hue="fern" icon={<HeartHandshake className="size-4" />} />
          <StatTile label="Visitors" value={String(visitors)} hue="amber" icon={<UserPlus className="size-4" />} />
        </div>
      </Section>

      <Section
        title={showArchived ? "Directory, including archived" : "Directory"}
        note={`${total} people, ordered by surname.`}
        action={
          <Link
            href={`/people?church=${session.tenantSlug}${showArchived ? "" : "&show=archived"}`}
            className="inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
          >
            <Archive className="size-4" />
            {showArchived ? "Hide archived" : "Show archived"}
          </Link>
        }
      >
        {total === 0 ? (
          <EmptyState
            title="No one here yet"
            body="Add someone by hand, or import your directory from a spreadsheet."
            action={
              <Button asChild>
                <Link href={`/people/new?church=${session.tenantSlug}`}>
                  <Plus /> Add someone
                </Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Person</Th>
                <Th>Household</Th>
                <Th>Status</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th />
              </Tr>
            </Thead>
            <tbody>
              {people.map((p: PersonRow) => (
                <Tr key={p.id}>
                  <Td>
                    <Link
                      href={`/people/${p.id}?church=${session.tenantSlug}`}
                      className="flex items-center gap-2.5 hover:underline"
                    >
                      <Avatar name={p.displayName} id={p.id} size="sm" />
                      <span className={p.archivedAt ? "text-fg-muted line-through" : undefined}>
                        {p.displayName}
                      </span>
                      {p.archivedAt ? <Badge tone="neutral">Archived</Badge> : null}
                    </Link>
                  </Td>
                  <Td className="text-fg-muted">{p.householdName ?? "Not in a household"}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[p.lifecycleStatus] ?? "neutral"}>{label(p.lifecycleStatus)}</Badge>
                  </Td>
                  <Td className="text-fg-muted">{p.primaryEmail ?? "None"}</Td>
                  <Td data-numeric className="text-fg-muted">{p.primaryPhone ?? "None"}</Td>
                  <Td>
                    <Link
                      href={`/people/${p.id}?church=${session.tenantSlug}`}
                      aria-label={`Open ${p.displayName}`}
                      className="inline-flex text-fg-subtle hover:text-fg"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      </main>
    </>
  );
}
