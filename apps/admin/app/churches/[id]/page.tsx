import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { platform } from "@connectapp/db";
import { Badge } from "@connectapp/ui";
import { requireOperator } from "@/lib/admin";
import { Shell } from "@/components/shell";
import { Since, On } from "@/components/since";
import { Standing } from "./standing";

export const dynamic = "force-dynamic";

/**
 * R21.x. One church, and the two decisions an operator makes about it.
 *
 * Approving is the one that unblocks a real church, and archiving is the one
 * that takes a test church, a duplicate or a church that has wound down out of
 * service without losing a record. Both write to the log on the way through.
 */
export default async function ChurchPage({ params }: { params: Promise<{ id: string }> }) {
  const who = await requireOperator();
  const { id } = await params;

  const [church, log] = await Promise.all([
    platform.church(who.id, id),
    platform.events(who.id, { tenantId: id, limit: 30 }),
  ]);
  if (!church) notFound();

  const facts = [
    { label: "Address", value: `/${church.slug}` },
    { label: "Timezone", value: church.timezone },
    { label: "Made", value: <On at={church.createdAt} /> },
    { label: "Last seen", value: <Since at={church.lastActivity} /> },
    { label: "Members", value: church.members },
    { label: "Accounts", value: church.accounts },
    { label: "Owner", value: church.ownerName ?? "—" },
    { label: "Owner's address", value: church.ownerEmail ?? "—" },
  ];

  return (
    <Shell
      who={who}
      title={church.name}
      lede={
        church.archivedAt
          ? `Out of service. ${church.archivedReason ?? ""}`.trim()
          : church.approvedAt
            ? `Approved by ${church.approvedBy ?? "somebody"}.`
            : "Waiting on a person. Capped at 25 members, with no invitations and no sign-up address."
      }
      action={
        church.archivedAt ? (
          <Badge tone="neutral">Archived</Badge>
        ) : church.approvedAt ? (
          <Badge tone="success">Approved</Badge>
        ) : (
          <Badge tone="warning">Waiting</Badge>
        )
      }
    >
      <Link
        href="/churches"
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary no-underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Churches
      </Link>

      <div className="grid gap-5 lg:[grid-template-columns:minmax(0,1fr)_320px]">
        <section className="flex flex-col gap-5 rounded-[16px] border border-line bg-surface p-6">
          <h2 className="font-display text-[20px] text-fg">What it is</h2>
          <dl className="grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5">
                <dt className="text-[12px] font-medium text-fg-subtle uppercase">{fact.label}</dt>
                <dd className="text-[length:var(--d-text-body)] text-fg">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Standing
          id={church.id}
          name={church.name}
          approved={church.approvedAt !== null}
          archived={church.archivedAt !== null}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[20px] text-fg">What has been done to it</h2>

        {log.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-line-strong p-6 text-center text-[length:var(--d-text-body)] text-fg-muted">
            Nothing yet.
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col p-0">
            {log.map((event, i) => (
              <li key={event.id} className="flex gap-3">
                <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                  {i === log.length - 1 ? null : (
                    <span className="relative my-1 w-px flex-1 bg-primary/35">
                      <span className="absolute top-1/2 left-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/60" />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 pb-5">
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    <b className="font-semibold">{event.actorName}</b> {event.action} it
                  </span>
                  <span className="text-[12px] text-fg-subtle">
                    <Since at={event.at} />
                    {event.note ? ` · ${event.note}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Shell>
  );
}
