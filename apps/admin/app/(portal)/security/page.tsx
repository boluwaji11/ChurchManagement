import { KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { platformHealth } from "@connectapp/db";
import { Badge, Banner, EmptyState, Table, Thead, Th, Tr, Td } from "@connectapp/ui";
import { requireTeamMember } from "@/lib/admin";
import { Screen, Block, Panel } from "@/components/screen";
import { Since } from "@/components/since";

export const dynamic = "force-dynamic";

export const metadata = { title: "Security - ConnectApp Admin" };

/**
 * HRT-396, R21.1. The portal's own door, and who has been at it.
 *
 * Worth a screen of its own because this is the one account in the product
 * that reaches every church. A failed attempt here is a different kind of
 * event from a failed attempt on a church's own sign-in, and it should be
 * somewhere a person actually looks.
 */
export default async function SecurityPage() {
  const who = await requireTeamMember();
  const [ready, attempts] = await Promise.all([
    platformHealth.watching(),
    platformHealth.signIns(who.id, 50),
  ]);

  const refused = attempts.filter((one) => one.outcome === "refused");
  const wrong = attempts.filter((one) => one.outcome === "wrong");

  return (
    <Screen title="Security" lede="Who has been at the portal's door.">
      {ready ? null : (
        <Banner tone="warning" title="Migration 0163 has not been applied here">
          Attempts are not being written down, so this list stays empty and the throttle lets every
          try through. Apply it with{" "}
          <code className="font-mono text-code">pnpm --filter @connectapp/db migrate</code>.
        </Banner>
      )}

      {refused.length > 0 ? (
        <Banner tone="warning" title={`${refused.length} ${refused.length === 1 ? "attempt" : "attempts"} by an account that is not on the team`}>
          The password was right and the account does not operate the platform. That is somebody
          with a real ConnectApp account looking for this door.
        </Banner>
      ) : null}

      <Block title="This account">
        <Panel className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ShieldCheck className="size-5 shrink-0 text-success-text" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-fg">{who.name}</span>
              <span className="block text-caption text-fg-subtle">{who.email}</span>
            </span>
            <Badge tone="success">Team member</Badge>
          </div>

          <dl className="m-0 flex flex-col gap-2 border-t border-line pt-3">
            <Rule
              icon={<KeyRound className="size-4" />}
              title="Two gates"
              body="Supabase has to accept the password, and platform_admins has to name this account. A church's own owner clears the first gate and stops at the second."
            />
            <Rule
              icon={<ShieldAlert className="size-4" />}
              title={`${platformHealth.ATTEMPTS} refusals and the address waits`}
              body={`Counted over ${platformHealth.LOCKOUT_MINUTES} minutes, and cleared by getting in. Every attempt is written down, whether it worked or not.`}
            />
          </dl>
        </Panel>
      </Block>

      <Block title="Attempts">
        {attempts.length === 0 ? (
          <EmptyState title="Nobody has signed in yet." />
        ) : (
          <>
            <p className="text-caption text-fg-muted">
              {attempts.filter((one) => one.outcome === "in").length} got in, {wrong.length} wrong
              password, {refused.length} not on the team.
            </p>
            <Table>
              <Thead>
                <Tr>
                  <Th>Address</Th>
                  <Th>What happened</Th>
                  <Th>From</Th>
                  <Th>When</Th>
                </Tr>
              </Thead>
              <tbody>
                {attempts.map((one, i) => (
                  <Tr key={`${one.at.toISOString()}-${i}`}>
                    <Td className="text-fg">{one.email}</Td>
                    <Td><Outcome outcome={one.outcome} /></Td>
                    <Td className="font-mono text-code text-fg-muted">{one.ip ?? "unknown"}</Td>
                    <Td className="whitespace-nowrap text-fg-muted"><Since at={one.at} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Block>
    </Screen>
  );
}

function Outcome({ outcome }: { outcome: string }) {
  if (outcome === "in") return <Badge tone="success">Signed in</Badge>;
  if (outcome === "refused") return <Badge tone="warning">Not on the team</Badge>;
  if (outcome === "throttled") return <Badge tone="neutral">Made to wait</Badge>;
  return <Badge tone="danger">Wrong password</Badge>;
}

function Rule({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-2.5">
      <span aria-hidden className="mt-0.5 shrink-0 text-fg-subtle">{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-[13px] font-medium text-fg">{title}</dt>
        <dd className="m-0 text-caption text-fg-muted">{body}</dd>
      </div>
    </div>
  );
}
