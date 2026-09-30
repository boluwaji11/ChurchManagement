import Link from "next/link";
import { ArrowRight, Users, UserPlus, HeartHandshake, Archive, Plus, Download } from "lucide-react";
import {
  withTenant, listPeople, countPeopleByStatus, canEditPeople, type PersonRow,
} from "@hearth/db";
import {
  Avatar, Badge, Table, Thead, Th, Tr, Td, StatTile, EmptyState, Button, Banner,
} from "@hearth/ui";
import { PageTitle, Section } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { t, plural } from "@hearth/i18n";
import { lifecycleLabel } from "@/lib/person-input";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "primary" | "accent" | "neutral" | "success"> = {
  member: "primary",
  visitor: "accent",
  regular_attender: "success",
  inactive: "neutral",
};


export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string; show?: string; welcome?: string }>;
}) {
  const { church, archived, show, welcome } = await searchParams;
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
        <PageTitle title={t("people.title")} lede={session.tenantName} className="mb-0" />
        {canEditPeople(session.role) ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href={`/people/new?church=${session.tenantSlug}`}>
                <Plus /> {t("people.add")}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/import?church=${session.tenantSlug}`}>
                <Download /> {t("import.title")}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      {archived ? <Banner tone="success" title={t("person.archived.title")} className="mb-8" /> : null}

      {welcome ? (
        <Banner tone="success" title={t("createChurch.welcome.title", { church: session.tenantName })} className="mb-8">
          {t("createChurch.welcome.body")}
        </Banner>
      ) : null}

      {session.role === "staff" || session.role === "member" ? (
        <Banner tone="info" title={t("people.restricted.title")} className="mb-8">
          {t("people.restricted.body")}
        </Banner>
      ) : null}

      <Section title={t("people.glance")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label={t("people.stat.people")} value={String(total)} hue="indigo" icon={<Users className="size-4" />} />
          <StatTile label={t("people.stat.members")} value={String(members)} hue="fern" icon={<HeartHandshake className="size-4" />} />
          <StatTile label={t("people.stat.visitors")} value={String(visitors)} hue="amber" icon={<UserPlus className="size-4" />} />
        </div>
      </Section>

      <Section
        title={showArchived ? t("people.titleWithArchived") : t("people.title")}
        note={plural("people.count", total)}
        action={
          <Link
            href={`/people?church=${session.tenantSlug}${showArchived ? "" : "&show=archived"}`}
            className="inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
          >
            <Archive className="size-4" />
            {showArchived ? t("people.hideArchived") : t("people.showArchived")}
          </Link>
        }
      >
        {total === 0 ? (
          <EmptyState
            title={t("people.empty.title")}
            body={t("people.empty.body")}
            action={
              <Button asChild>
                <Link href={`/import?church=${session.tenantSlug}`}>
                  <Download /> {t("import.title")}
                </Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>{t("people.column.person")}</Th>
                <Th>{t("people.column.household")}</Th>
                <Th>{t("people.column.status")}</Th>
                <Th>{t("people.column.email")}</Th>
                <Th>{t("people.column.phone")}</Th>
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
                      {p.archivedAt ? <Badge tone="neutral">{t("people.archivedBadge")}</Badge> : null}
                    </Link>
                  </Td>
                  <Td className="text-fg-muted">{p.householdName ?? t("people.noHousehold")}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[p.lifecycleStatus] ?? "neutral"}>{lifecycleLabel(p.lifecycleStatus)}</Badge>
                  </Td>
                  <Td className="text-fg-muted">{p.primaryEmail ?? t("people.none")}</Td>
                  <Td data-numeric className="text-fg-muted">{p.primaryPhone ?? t("people.none")}</Td>
                  <Td>
                    <Link
                      href={`/people/${p.id}?church=${session.tenantSlug}`}
                      aria-label={t("people.open", { name: p.displayName })}
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
