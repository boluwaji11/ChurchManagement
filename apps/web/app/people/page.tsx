import Link from "next/link";
import { ArrowRight, Users, UserPlus, HeartHandshake, ShieldCheck } from "lucide-react";
import {
  withTenant, listPeople, countPeopleByStatus, listTags, type PersonRow,
} from "@hearth/db";
import {
  Avatar, Badge, Table, Thead, Th, Tr, Td, StatTile, EmptyState, Button, HueTag, Banner,
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
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  // Redirects to sign-in, or to the church chooser if this user is not a member.
  const session = await requireSession(church);

  /**
   * One transaction, one tenant context. Notice there is no tenant filter in the
   * queries below: row-level security supplies it, so forgetting one returns
   * nothing rather than another church's members.
   */
  const { people, counts, tags } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      people: await listPeople(tx),
      counts: await countPeopleByStatus(tx),
      tags: await listTags(tx),
    }),
  );

  const total = people.length;
  const members = counts["member"] ?? 0;
  const visitors = counts["visitor"] ?? 0;

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageTitle title="Directory" lede={`${session.tenantName}, read through the tenant-scoped connection.`} />

      {session.role === "staff" || session.role === "member" ? (
        <Banner tone="info" title="Some things are hidden from your role" className="mb-8">
          Confidential pastoral notes are restricted. You will see that they exist and cannot read them.
        </Banner>
      ) : null}

      <Section title="At a glance">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="People" value={String(total)} hue="indigo" icon={<Users className="size-4" />} />
          <StatTile label="Members" value={String(members)} hue="fern" icon={<HeartHandshake className="size-4" />} />
          <StatTile label="Visitors" value={String(visitors)} hue="amber" icon={<UserPlus className="size-4" />} />
          <StatTile label="Tags" value={String(tags.length)} hue="teal" icon={<ShieldCheck className="size-4" />} />
        </div>
      </Section>

      <Section title="Directory" note={`${total} people, ordered by surname. Archived people are excluded.`}>
        {total === 0 ? (
          <EmptyState
            title="No one here yet"
            body="Import your directory from a spreadsheet, or from Planning Center, Breeze, or ChurchTrac."
            action={<Button>Import a directory</Button>}
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
                      {p.displayName}
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

      {tags.length > 0 ? (
        <Section title="Tags" note="Every tag owns a hue, so a list of them is scannable rather than a wall of text.">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <HueTag key={t.id} hue={t.hue}>{t.name}</HueTag>
            ))}
          </div>
        </Section>
      ) : null}
      </main>
    </>
  );
}
