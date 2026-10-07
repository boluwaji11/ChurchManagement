"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Skeleton, Card, CardTitle, Avatar, Banner, IconButton } from "@connectapp/ui";
import { PageTitle, Section, Row } from "@/components/section";

/** The gallery is a tool for us, so it names itself plainly. */
export const metadata = { title: "Design · motion" };

const DURATIONS = [
  ["instant", "80ms", "Colour and opacity on hover, focus, press"],
  ["fast", "140ms", "Tooltips, dropdowns, checkbox and toggle"],
  ["base", "200ms", "Dialogs, popovers, accordion, tab content"],
  ["slow", "300ms", "Sheets, drawers, page transitions"],
  ["spring", "420ms", "Direct manipulation, drag, reorder"],
];

let nextId = 4;

export default function Motion() {
  const [members, setPeople] = React.useState([
    { id: 1, name: "Sarah Bennett" },
    { id: 2, name: "Daniel Ramirez" },
    { id: 3, name: "Ruth Whitfield" },
  ]);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState<"idle" | "saving" | "ok" | "fail">("idle");

  return (
    <>
      <PageTitle
        title="Motion"
        lede="Motion shows causality: where a thing came from, where it went, what changed. Anything that exists to be admired gets cut."
      />

      <Section title="Durations" note="Exits are faster than entrances, always. Hover the swatches.">
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {DURATIONS.map(([token, ms, use]) => (
            <div key={token as string} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div
                className="h-10 w-24 rounded-md bg-sunken transition-colors ease-out hover:bg-primary"
                style={{ transitionDuration: `var(--duration-${token})` }}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <code className="text-code text-fg">{token}</code>
                <span className="text-caption text-fg-muted">{use}</span>
              </div>
              <span data-numeric className="text-label text-fg-subtle">{ms}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="List insert and remove"
        note="A person appearing in a filtered list should be visible, not surprising. Add and remove a few."
      >
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Roster</CardTitle>
            <Button
              variant="secondary"
              onClick={() => setPeople((p) => [...p, { id: nextId++, name: `New person ${nextId}` }])}
            >
              <Plus /> Add
            </Button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {members.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-md border border-line bg-canvas p-2"
                style={{ animation: "connectapp-rise var(--duration-base) var(--ease-out)" }}
              >
                <span className="flex items-center gap-2.5">
                  <Avatar name={p.name} id={String(p.id)} size="sm" />
                  <span className="text-[length:var(--d-text-body)]">{p.name}</span>
                </span>
                <IconButton
                  label={`Remove ${p.name}`}
                  onClick={() => setPeople((cur) => cur.filter((x) => x.id !== p.id))}
                >
                  <Trash2 />
                </IconButton>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section
        title="Optimistic state"
        note="A saved record settles. A failed one shakes once and reverts, so the animation is the error message's first half."
      >
        <Row>
          <Button
            loading={saved === "saving"}
            variant={saved === "ok" ? "accent" : "primary"}
            onClick={() => {
              setSaved("saving");
              setTimeout(() => setSaved("ok"), 700);
              setTimeout(() => setSaved("idle"), 2200);
            }}
          >
            {saved === "ok" ? "Saved" : "Save household"}
          </Button>
          <Button
            variant="secondary"
            className={saved === "fail" ? "animate-[connectapp-shake_var(--duration-slow)_var(--ease-in-out)]" : ""}
            onClick={() => {
              setSaved("fail");
              setTimeout(() => setSaved("idle"), 900);
            }}
          >
            Simulate a failure
          </Button>
        </Row>
        {saved === "fail" ? (
          <Banner tone="danger" title="That did not save">
            The phone number needs an area code. Nothing else was lost.
          </Banner>
        ) : null}
      </Section>

      <Section
        title="Skeletons, never spinners"
        note="Anything expected to take over 300ms gets a skeleton. Under 300ms, show nothing at all, because a flash of loading is worse than a wait nobody noticed."
      >
        <Row>
          <Button variant="secondary" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1600); }}>
            Load the directory
          </Button>
        </Row>
        <div className="mt-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-line bg-surface p-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">Loaded. Four households.</p>
          )}
        </div>
      </Section>

      <Section
        title="What we never animate"
        note="Page load reveals. Scroll-triggered fades on functional screens. Anything on a station beyond a confirmation. Anything that delays an interaction by more than one frame."
      >
        <Banner tone="info" title="Reduced motion means no motion, not less">
          Turn on Reduce Motion in your system settings and reload. Every duration collapses to 1ms through a
          single token override, so no component can forget to honour it.
        </Banner>
      </Section>
    </>
  );
}
