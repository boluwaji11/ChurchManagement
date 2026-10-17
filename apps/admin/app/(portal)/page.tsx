import Link from "next/link";
import { ArrowRight, Building2, CircleUser, Clock, HeartPulse, Users } from "lucide-react";
import { platform, platformHealth } from "@connectapp/db";
import { environment } from "@connectapp/env";
import { EmptyState, StatTile } from "@connectapp/ui";
import { requireTeamMember } from "@/lib/admin";
import { Screen, Block } from "@/components/screen";
import { Trail } from "@/components/trail";
import { StateDot } from "@/components/state-dot";

export const dynamic = "force-dynamic";

export const metadata = { title: "Overview - ConnectApp Admin" };

/**
 * R22.x. Where the platform stands, in the order a team member needs it.
 *
 * The queue first, because every church in it is a church waiting on a person
 * and the sixty-minute promise is made of that number being small. Then the
 * shape of the platform, then whether its own machinery is working, then what
 * has been done lately.
 *
 * Four reads, sent together. They do not depend on each other and waiting for
 * each in turn is three round trips nobody asked for.
 */
export default async function OverviewPage() {
  const who = await requireTeamMember();
  const env = environment();

  const [signals, recent, checks, spread] = await Promise.all([
    platform.signals(who.id),
    platform.events(who.id, { limit: 8 }),
    platformHealth.latestChecks(who.id, env),
    platformHealth.spread(who.id),
  ]);

  const waiting = signals.provisional;

  return (
    <Screen title="Overview" lede="Where the platform stands today.">
      {waiting > 0 ? (
        <Link
          href="/churches?standing=provisional"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent-soft px-5 py-4 no-underline transition-colors duration-instant hover:bg-accent-soft/70"
        >
          <Clock className="size-5 shrink-0 text-ember-800" aria-hidden />
          <span className="min-w-0 flex-1 text-body text-ember-800">
            <b className="font-semibold">
              {waiting === 1 ? "One church is" : `${waiting} churches are`}
            </b>{" "}
            {waiting === 1 ? "waiting on a person." : "waiting on a person."} Capped at 25 members
            until somebody looks.
          </span>
          <ArrowRight className="size-4 shrink-0 text-ember-800" aria-hidden />
        </Link>
      ) : null}

      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
        <StatTile
          label="Churches"
          value={String(signals.churches)}
          hue="indigo"
          icon={<Building2 className="size-4" />}
          caption="live on the platform"
        />
        <StatTile
          label="Waiting on a person"
          value={String(waiting)}
          hue="amber"
          emphasis={waiting > 0 ? "tint" : "quiet"}
          icon={<Clock className="size-4" />}
          caption="provisional, capped at 25"
        />
        <StatTile
          label="Active in 12 weeks"
          value={String(signals.active)}
          hue="fern"
          icon={<HeartPulse className="size-4" />}
          caption="recorded something"
        />
        <StatTile
          label="Members held"
          value={signals.members.toLocaleString("en-US")}
          hue="teal"
          icon={<Users className="size-4" />}
          caption="across every church"
        />
        <StatTile
          label="Accounts"
          value={signals.accounts.toLocaleString("en-US")}
          hue="sky"
          icon={<CircleUser className="size-4" />}
          caption="that can sign in"
        />
        <StatTile
          label="New this month"
          value={String(signals.newThisMonth)}
          hue="violet"
          caption="churches created"
        />
      </div>

      <Block
        title="The platform itself"
        action={
          <Link href="/status" prefetch={false} className="text-label font-medium text-primary">
            Status
          </Link>
        }
      >
        {checks.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-5 py-4 text-body text-fg-muted">
            Nothing has been probed in {env} yet. Open Status to run the checks.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2 p-0">
            {checks.map((check) => (
              <li
                key={check.service}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <StateDot state={check.state} />
                <span className="text-[13px] font-medium text-fg capitalize">{check.service}</span>
                {check.tookMs === null ? null : (
                  <span data-numeric className="text-caption text-fg-subtle tabular-nums">
                    {check.tookMs}ms
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      {spread.stripeAccounts > 0 || spread.emailConnected > 0 ? (
        <Block title="How far the integrations have reached">
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
            <StatTile
              label="Taking gifts"
              value={`${spread.stripeCharging} of ${spread.churches}`}
              hue="jade"
              caption="Stripe will take a payment"
            />
            <StatTile
              label="Sending email"
              value={`${spread.emailConnected} of ${spread.churches}`}
              hue="sky"
              caption="own mail account connected"
            />
            {spread.grantsExpiring > 0 ? (
              <StatTile
                label="Grants running out"
                value={String(spread.grantsExpiring)}
                hue="coral"
                emphasis="tint"
                caption="inside a fortnight"
              />
            ) : null}
          </div>
        </Block>
      ) : null}

      <Block
        title="Lately"
        action={
          <Link href="/log" className="text-label font-medium text-primary">
            The whole log
          </Link>
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="Nothing has been done here yet." />
        ) : (
          <Trail events={recent} />
        )}
      </Block>
    </Screen>
  );
}
