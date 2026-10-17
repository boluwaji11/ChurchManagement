import { CheckCircle2, CircleDot, ExternalLink, GitCommitHorizontal, XCircle } from "lucide-react";
import { platformHealth } from "@connectapp/db";
import { Badge, Banner, EmptyState, Progress, StatTile, Table, Thead, Th, Tr, Td } from "@connectapp/ui";
import { requireTeamMember } from "@/lib/admin";
import { commits, runs, waitingToShip, repoUrl } from "@/lib/github";
import { board, doneness, DEFINED } from "@/lib/board";
import { Screen, Block, Panel } from "@/components/screen";
import { Since } from "@/components/since";

export const dynamic = "force-dynamic";

export const metadata = { title: "Delivery - ConnectApp Admin" };

const TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  Closed: "success",
  Resolved: "info",
  Active: "warning",
  New: "neutral",
  Blocked: "danger",
  Deferred: "neutral",
  Other: "neutral",
};

/**
 * HRT-395, R22.x. What is being built, what is shipped, and what the machines
 * said about it.
 *
 * Four questions in the order somebody actually asks them: is there anything
 * written that is not live, did the last build pass, where is the board, and
 * are the churches using any of it. Everything is read from the repository and
 * the audit log rather than kept in a table of its own, so nothing here can
 * quietly stop matching the truth.
 */
export default async function DeliveryPage() {
  const who = await requireTeamMember();

  const [ship, recent, workflows, plan, weeks] = await Promise.all([
    waitingToShip(),
    commits("main", 10),
    runs(12),
    board(),
    platformHealth.weeks(who.id, 12),
  ]);

  const ci = workflows.filter((one) => one.name !== "Drain the email queue");
  const drain = workflows.find((one) => one.name === "Drain the email queue");
  const busiest = Math.max(1, ...weeks.map((one) => one.entries));

  return (
    <Screen
      title="Delivery"
      lede="What is built, what is deployed, and where the board stands."
      action={
        <a
          href={repoUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-label font-medium text-primary"
        >
          The repository <ExternalLink className="size-3.5" aria-hidden />
        </a>
      }
    >
      {ship === null ? (
        <Banner tone="warning" title="GitHub didn't answer">
          These calls are unauthenticated and limited to sixty an hour. Set GITHUB_TOKEN to raise the limit.
        </Banner>
      ) : ship.ahead === 0 ? (
        <Panel className="flex items-center gap-3">
          <CheckCircle2 className="size-5 shrink-0 text-success-text" aria-hidden />
          <span className="text-body text-fg">
            Everything on <code className="font-mono text-code">main</code> is live.
          </span>
        </Panel>
      ) : (
        <Block title={`${ship.ahead} ${ship.ahead === 1 ? "commit" : "commits"} written and not live`}>
          <Table>
            <Thead>
              <Tr>
                <Th>What</Th>
                <Th>Who</Th>
                <Th>When</Th>
              </Tr>
            </Thead>
            <tbody>
              {ship.commits.map((one) => (
                <Tr key={one.sha}>
                  <Td>
                    <a href={one.url} target="_blank" rel="noreferrer" className="text-fg no-underline hover:text-primary">
                      {one.message}
                    </a>
                  </Td>
                  <Td className="whitespace-nowrap text-fg-muted">{one.author}</Td>
                  <Td className="whitespace-nowrap text-fg-muted"><Since at={one.at} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Block>
      )}

      <Block title="What CI reported">
        {workflows.length === 0 ? (
          <EmptyState title="No workflow runs found" />
        ) : (
          <>
            {drain ? (
              <Panel className="mb-3 flex flex-wrap items-center gap-3">
                <Verdict conclusion={drain.conclusion} status={drain.status} />
                <span className="min-w-0 flex-1 text-body text-fg">
                  The send queue was last drained <Since at={drain.at} />.
                </span>
                <span className="text-caption text-fg-subtle">every five minutes</span>
              </Panel>
            ) : null}

            <Table>
              <Thead>
                <Tr>
                  <Th>Workflow</Th>
                  <Th>Branch</Th>
                  <Th>Verdict</Th>
                  <Th>When</Th>
                </Tr>
              </Thead>
              <tbody>
                {ci.slice(0, 8).map((one, i) => (
                  <Tr key={`${one.url}-${i}`}>
                    <Td>
                      <a href={one.url} target="_blank" rel="noreferrer" className="text-fg no-underline hover:text-primary">
                        {one.name}
                      </a>
                    </Td>
                    <Td className="font-mono text-code text-fg-muted">{one.branch}</Td>
                    <Td><Verdict conclusion={one.conclusion} status={one.status} /></Td>
                    <Td className="whitespace-nowrap text-fg-muted"><Since at={one.at} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Block>

      <Block title="The board">
        {plan === null ? (
          <EmptyState title="Couldn't read BACKLOG.md from the repository" />
        ) : (
          <>
            <div className="mb-4 grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
              <StatTile
                label="Closed"
                value={String(plan.counts.Closed)}
                hue="fern"
                caption="tested and accepted"
              />
              <StatTile
                label="Waiting on you"
                value={String(plan.counts.Resolved)}
                hue="amber"
                emphasis={plan.counts.Resolved > 0 ? "tint" : "quiet"}
                caption="built, not yet tested"
              />
              <StatTile label="Not started" value={String(plan.counts.New)} hue="sky" caption="specified" />
              <StatTile
                label="Blocked"
                value={String(plan.counts.Blocked)}
                hue="coral"
                caption="waiting on something outside"
              />
            </div>

            <div className="flex flex-col gap-4">
              {plan.releases.map((release) => (
                <div key={release.name} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-fg">{release.name}</span>
                    <span data-numeric className="text-caption text-fg-muted tabular-nums">
                      {release.counts.Closed} of {release.total} closed
                    </span>
                  </div>
                  <Progress value={doneness(release.counts, release.total)} label={release.name} />
                  <div className="flex flex-wrap gap-1.5">
                    {DEFINED.filter((state) => release.counts[state] > 0).map((state) => (
                      <Badge key={state} tone={TONE[state]}>
                        {release.counts[state]} {state.toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {plan.counts.Other > 0 ? (
              <Banner tone="info" title={`${plan.counts.Other} rows carry a state the board does not define`} className="mt-4">
                {[...new Set(plan.stories.filter((one) => one.state === "Other").map((one) => one.word))].join(", ")}.
                They are counted apart rather than guessed at.
              </Banner>
            ) : null}

            {plan.at ? (
              <p className="mt-3 text-caption text-fg-subtle">
                BACKLOG.md was last changed <Since at={plan.at} />.
              </p>
            ) : null}
          </>
        )}
      </Block>

      <Block title="Commits on main">
        {recent.length === 0 ? (
          <EmptyState title="GitHub didn't answer." />
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface p-0">
            {recent.map((one) => (
              <li key={one.sha} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <GitCommitHorizontal className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                <a
                  href={one.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-[200px] flex-1 text-body text-fg no-underline hover:text-primary"
                >
                  {one.message}
                </a>
                <code className="font-mono text-code text-fg-subtle">{one.sha}</code>
                <span className="whitespace-nowrap text-caption text-fg-muted">
                  <Since at={one.at} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Church activity, by week">
        {weeks.length === 0 ? (
          <EmptyState title="Nothing recorded yet" />
        ) : (
          <Panel>
            <div className="flex h-32 items-end gap-2">
              {weeks.map((week) => (
                <div key={week.week.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span
                    className="w-full rounded-t-[3px] bg-primary/70"
                    style={{ height: `${Math.max(2, (week.entries / busiest) * 100)}%` }}
                    title={`${week.entries} entries from ${week.churches} churches`}
                  />
                  <span className="truncate text-[10px] text-fg-subtle">
                    {week.week.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-caption text-fg-muted">
              Entries in the audit log, which is the only record that covers every church and every
              kind of work.
            </p>
          </Panel>
        )}
      </Block>
    </Screen>
  );
}

/** What a workflow run concluded, as a mark with its word beside it. */
function Verdict({ conclusion, status }: { conclusion: string | null; status: string }) {
  if (status !== "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-label text-fg-muted">
        <CircleDot className="size-4 shrink-0 animate-pulse" aria-hidden /> running
      </span>
    );
  }
  if (conclusion === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 text-label text-success-text">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden /> passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-label text-danger-text">
      <XCircle className="size-4 shrink-0" aria-hidden /> {conclusion ?? "failed"}
    </span>
  );
}
