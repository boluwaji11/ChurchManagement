import { notFound } from "next/navigation";
import { CreditCard, Mail } from "lucide-react";
import { platform, platformHealth } from "@connectapp/db";
import { Badge, EmptyState } from "@connectapp/ui";
import { requireTeamMember } from "@/lib/admin";
import { Screen, Block, Panel } from "@/components/screen";
import { Since, On } from "@/components/since";
import { Blank } from "@/components/blank";
import { Trail } from "@/components/trail";
import { Standing as Mark } from "@/components/standing";
import { Standing } from "./standing";

export const dynamic = "force-dynamic";

export const metadata = { title: "Church - ConnectApp Admin" };

/**
 * R21.x. One church: what it is, how it is wired, and the two decisions a team
 * member makes about it.
 *
 * The wiring is new and is the reason this screen is worth opening when a
 * church writes in. "Our giving page is broken" and "our emails are not
 * arriving" were both answered by opening Stripe in one tab and the database
 * in another; both answers are now on the screen that already carries the
 * church's name.
 */
export default async function ChurchPage({ params }: { params: Promise<{ id: string }> }) {
  const who = await requireTeamMember();
  const { id } = await params;

  const found = await platform.church(who.id, id);
  if (!found) notFound();

  const [log, wiring] = await Promise.all([
    platform.events(who.id, { tenantId: found.id, limit: 30 }),
    platformHealth.churchWiring(who.id, found.id),
  ]);

  const facts = [
    { label: "Address", value: `/${found.slug}` },
    { label: "Timezone", value: found.timezone },
    { label: "Made", value: <On at={found.createdAt} /> },
    { label: "Last seen", value: <Since at={found.lastActivity} /> },
    { label: "Members", value: found.members },
    { label: "Accounts", value: found.accounts },
    { label: "Owner", value: found.ownerName ?? <Blank /> },
    { label: "Owner's address", value: found.ownerEmail ?? <Blank /> },
    { label: "Storage", value: megabytes(wiring.storageBytes) },
  ];

  return (
    <Screen
      trail={[{ label: "Churches", href: "/churches" }, { label: found.name }]}
      title={found.name}
      lede={
        found.archivedAt
          ? `Out of service. ${found.archivedReason ?? ""}`.trim()
          : found.approvedAt
            ? `Approved by ${found.approvedBy ?? "somebody"}.`
            : "Waiting for review. Capped at 25 members, with no invitations and no sign-up address."
      }
      action={<Mark church={found} />}
    >
      <div className="grid gap-5 lg:[grid-template-columns:minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Block title="What it is">
            <Panel>
              <dl className="m-0 grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex flex-col gap-0.5">
                    <dt className="text-caption font-medium text-fg-subtle uppercase">{fact.label}</dt>
                    <dd className="m-0 text-body text-fg">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </Block>

          <Block title="How it is wired">
            <div className="grid gap-3 sm:grid-cols-2">
              <Wire
                icon={<CreditCard className="size-4" />}
                title="Giving"
                lines={
                  wiring.stripeAccountId
                    ? [
                        { label: "Account", value: wiring.stripeAccountId, mono: true },
                        { label: "Mode", value: wiring.stripeLive ? "Live" : "Test" },
                        { label: "Takes payments", value: wiring.stripeCharges ? "Yes" : "No" },
                        { label: "Payouts", value: wiring.stripePayouts ? "Yes" : "No" },
                        { label: "Details given", value: wiring.stripeDetails ? "Yes" : "No" },
                        {
                          label: "Rate",
                          value: wiring.nonprofitRateAt ? "Nonprofit, 2.2%" : "Standard, 2.9%",
                        },
                      ]
                    : null
                }
                nothing="No Stripe account connected."
                tone={
                  !wiring.stripeAccountId ? "off" : wiring.stripeCharges ? "good" : "waiting"
                }
              />

              <Wire
                icon={<Mail className="size-4" />}
                title="Email"
                lines={
                  wiring.emailVendor
                    ? [
                        { label: "Through", value: wiring.emailVendor },
                        { label: "State", value: wiring.emailState ?? "unknown" },
                        { label: "Sends as", value: wiring.emailFrom ?? "not set" },
                        ...(wiring.emailExpires
                          ? [{ label: "Grant lapses", value: <On at={wiring.emailExpires} /> }]
                          : []),
                        ...(wiring.emailError
                          ? [{ label: "Last refusal", value: wiring.emailError }]
                          : []),
                      ]
                    : null
                }
                nothing="No mail account connected."
                tone={
                  !wiring.emailVendor
                    ? "off"
                    : wiring.emailState === "connected" && !wiring.emailError
                      ? "good"
                      : "waiting"
                }
              />
            </div>
          </Block>

          <Block title="What has been done to it">
            {log.length === 0 ? (
              <EmptyState title="Nothing yet." />
            ) : (
              <Trail events={log} withoutChurch />
            )}
          </Block>
        </div>

        <Standing
          id={found.id}
          name={found.name}
          approved={found.approvedAt !== null}
          archived={found.archivedAt !== null}
        />
      </div>
    </Screen>
  );
}

/** One integration, and what it is doing. */
function Wire({
  icon,
  title,
  lines,
  nothing,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  lines: { label: string; value: React.ReactNode; mono?: boolean }[] | null;
  nothing: string;
  tone: "good" | "waiting" | "off";
}) {
  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-fg-muted">{icon}</span>
        <h3 className="m-0 text-title text-fg">{title}</h3>
        <span className="ml-auto">
          {tone === "good" ? (
            <Badge tone="success">Working</Badge>
          ) : tone === "waiting" ? (
            <Badge tone="warning">Part way</Badge>
          ) : (
            <Badge tone="neutral">Not connected</Badge>
          )}
        </span>
      </div>

      {lines === null ? (
        <p className="m-0 text-body text-fg-muted">{nothing}</p>
      ) : (
        <dl className="m-0 flex flex-col gap-1.5">
          {lines.map((line) => (
            <div key={line.label} className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-caption text-fg-subtle">{line.label}</dt>
              <dd
                className={`m-0 min-w-0 truncate text-[13px] text-fg ${line.mono ? "font-mono text-code" : ""}`}
              >
                {line.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

/** R21.4. Bytes, in the unit a person reads a quota in. */
function megabytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
