import { AlertTriangle, Mail, CreditCard } from "lucide-react";
import { platformHealth } from "@connectapp/db";
import { check, environment, whereWeAre } from "@connectapp/env";
import { Badge, Banner, StatTile, Table, Thead, Th, Tr, Td } from "@connectapp/ui";
import { requireOperator } from "@/lib/admin";
import { probeEverything } from "@/lib/probes";
import { Screen, Block, Panel } from "@/components/screen";
import { StateDot, worst, wordFor } from "@/components/state-dot";
import { Bars } from "@/components/bars";
import { Since } from "@/components/since";
import { CheckAgain } from "./check-again";

export const dynamic = "force-dynamic";

export const metadata = { title: "Status - ConnectApp Admin" };

/**
 * HRT-394, N3. Every integration and every API, asked rather than assumed.
 *
 * Opening this screen runs the probes, which is what makes it worth opening:
 * a status page reading from a cache is a status page that can tell you
 * everything is fine while nothing is. The answers are written down on the way
 * past, so the row of bars beside each service is built out of real readings
 * rather than invented.
 */
export default async function StatusPage() {
  const who = await requireOperator();
  const env = environment();
  const here = whereWeAre();

  /* The probes go first and the history is read while they run. */
  const [probes, history, spread, queue] = await Promise.all([
    probeEverything(),
    platformHealth.recentChecks(who.id, env),
    platformHealth.spread(who.id),
    platformHealth.queue(who.id),
  ]);

  /* What was just learned becomes part of the record. */
  await Promise.all(
    probes.map((one) =>
      platformHealth.recordCheck(
        { service: one.service, state: one.state, tookMs: one.tookMs, said: one.said },
        env,
      ),
    ),
  );

  const overall = worst(probes.map((one) => one.state));
  const findings = check(env);

  return (
    <Screen
      title="Status"
      lede="What each thing the platform depends on said just now."
      action={<CheckAgain />}
    >
      {findings.length > 0 ? (
        <Banner tone={findings.some((one) => one.severity === "stop") ? "danger" : "warning"} title="The keys do not match the environment">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {findings.map((one) => (
              <li key={one.name}>
                <code className="font-mono text-code">{one.name}</code> {one.said}
              </li>
            ))}
          </ul>
        </Banner>
      ) : null}

      <Panel className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <span className="flex items-center gap-2.5">
          <StateDot state={overall} className="size-7" />
          <span className="font-display text-heading text-fg">
            {overall === "pass"
              ? "Everything is answering"
              : overall === "warn"
                ? "Something is slow"
                : overall === "fail"
                  ? "Something is down"
                  : "Nothing to check here"}
          </span>
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-caption text-fg-muted">
          <Badge tone={env === "production" ? "neutral" : "accent"}>{env}</Badge>
          {here.supabase ? <span className="font-mono text-code">{here.supabase}</span> : null}
          <span>Stripe {here.stripe ?? "unset"}</span>
        </span>
      </Panel>

      <Block title="Services">
        <ul className="flex list-none flex-col gap-0 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface p-0">
          {probes.map((probe) => (
            <li key={probe.service} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
              <span className="flex min-w-[220px] flex-[2] items-center gap-3">
                <StateDot state={probe.state} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-semibold text-fg">{probe.label}</span>
                  <span className="text-caption text-fg-subtle">{probe.matters}</span>
                </span>
              </span>

              <span className="flex min-w-[150px] flex-1 flex-col gap-0.5">
                <span className="text-[13px] text-fg">{wordFor(probe.state)}</span>
                {probe.said ? (
                  <span className="text-caption text-fg-subtle">{probe.said}</span>
                ) : null}
              </span>

              <span
                data-numeric
                className="min-w-[70px] text-right text-[13px] text-fg-muted tabular-nums"
              >
                {probe.tookMs === null ? null : `${probe.tookMs}ms`}
              </span>

              <Bars checks={history.get(probe.service) ?? []} />
            </li>
          ))}
        </ul>
      </Block>

      <Block title="How far the integrations have reached">
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
          <StatTile
            label="Stripe started"
            value={`${spread.stripeAccounts} of ${spread.churches}`}
            hue="jade"
            icon={<CreditCard className="size-4" />}
            caption="have an account"
          />
          <StatTile
            label="Stripe charging"
            value={String(spread.stripeCharging)}
            hue="fern"
            caption="Stripe will take a payment"
          />
          <StatTile
            label="On live Stripe"
            value={String(spread.stripeLive)}
            hue="teal"
            caption="rather than a test account"
          />
          <StatTile
            label="Email connected"
            value={`${spread.emailConnected} of ${spread.churches}`}
            hue="sky"
            icon={<Mail className="size-4" />}
            caption="own account connected"
          />
          <StatTile
            label="Grants running out"
            value={String(spread.grantsExpiring)}
            hue="amber"
            emphasis={spread.grantsExpiring > 0 ? "tint" : "quiet"}
            icon={<AlertTriangle className="size-4" />}
            caption="inside a fortnight"
          />
          <StatTile
            label="Providers refusing"
            value={String(spread.providerErrors)}
            hue="coral"
            emphasis={spread.providerErrors > 0 ? "tint" : "quiet"}
            caption="last call was an error"
          />
        </div>
      </Block>

      <Block title="The send queue">
        <Table>
          <Thead>
            <Tr>
              <Th>Waiting</Th>
              <Th>In flight</Th>
              <Th>Stuck</Th>
              <Th>Sent, 24h</Th>
              <Th>Failed, 24h</Th>
              <Th>Bounced, 24h</Th>
              <Th>Oldest waiting</Th>
            </Tr>
          </Thead>
          <tbody>
            <Tr>
              <Td data-numeric className="tabular-nums">{queue.waiting}</Td>
              <Td data-numeric className="tabular-nums">{queue.sending}</Td>
              <Td data-numeric className="tabular-nums">
                {queue.stuck > 0 ? (
                  <Badge tone="danger">{queue.stuck}</Badge>
                ) : (
                  queue.stuck
                )}
              </Td>
              <Td data-numeric className="tabular-nums">{queue.sent24h}</Td>
              <Td data-numeric className="tabular-nums">
                {queue.failed24h > 0 ? <Badge tone="warning">{queue.failed24h}</Badge> : 0}
              </Td>
              <Td data-numeric className="tabular-nums">
                {queue.bounced24h > 0 ? <Badge tone="warning">{queue.bounced24h}</Badge> : 0}
              </Td>
              <Td className="text-fg-muted">
                {queue.oldest ? <Since at={queue.oldest} /> : "nothing waiting"}
              </Td>
            </Tr>
          </tbody>
        </Table>
      </Block>
    </Screen>
  );
}
