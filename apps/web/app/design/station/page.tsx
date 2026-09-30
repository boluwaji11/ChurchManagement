"use client";

import * as React from "react";
import { Printer, ArrowRight, UserCheck } from "lucide-react";
import {
  Button, Input, CriticalBanner, CodeDisplay, OfflineBar, BlockingInterrupt,
  Card, Avatar, HueTag, Banner, Badge, Switch,
} from "@hearth/ui";
import { PageTitle, Section } from "@/components/section";

/**
 * The station is a kiosk, not a page. Everything below is drawn at station
 * density regardless of the header setting, because that is the only way to
 * review it honestly.
 */
function Station({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="station" className="rounded-xl border border-line-strong bg-canvas p-0 overflow-hidden shadow-md">
      {children}
    </div>
  );
}

export default function StationPage() {
  const [online, setOnline] = React.useState(false);

  return (
    <>
      <PageTitle
        title="Station"
        lede="The hardest screen in church software. It is 09:58 on a Sunday, forty families are queuing, the wifi has dropped, and the volunteer running this has done it twice before. Everything here serves that moment."
      />

      <Section title="Why it has its own rules" note="A mistake here is a safety incident, not a support ticket. 56px targets, 20px text, 7:1 contrast, one task per screen, no navigation, no hover states, and no icon-only controls.">
        <Banner tone="warning" title="These are the only colours on a station screen">
          The room hue, and critical red. That screen has exactly two things to communicate, and adding a
          third is a safety problem rather than a design preference.
        </Banner>
      </Section>

      <Section title="Connection state is persistent chrome" note="Never a toast. R8.22 says the station never silently fails, and a notification that disappears is a silent failure.">
        <label className="mb-3 flex items-center gap-2.5 text-[length:var(--d-text-body)]">
          <Switch checked={online} onCheckedChange={setOnline} />
          Network connected
        </label>
        <div className="overflow-hidden rounded-lg border border-line">
          <OfflineBar online={online} pending={12} />
        </div>
      </Section>

      <Section title="Check in a family" note="Find family, choose children, confirm, print. Four screens, and this is the second.">
        <Station>
          <OfflineBar online={online} pending={12} />
          <div className="flex flex-col gap-[var(--d-gutter)] p-[var(--d-gutter)]">
            <div className="flex flex-col gap-2">
              <p className="text-label uppercase tracking-wide text-fg-muted">Household</p>
              <h2 className="font-display text-display text-fg">Adeyemi</h2>
            </div>

            <CriticalBanner heading="Allergies and medical" items={["Peanuts, severe", "Inhaler in bag"]} />

            <div className="flex flex-col gap-3">
              {[
                ["Tola Adeyemi", "3 years", "Under fives", "teal", true],
                ["Ife Adeyemi", "7 years", "Primary", "violet", true],
                ["Bisi Adeyemi", "12 years", "Youth", "fern", false],
              ].map(([name, age, room, hue, selected]) => (
                <button
                  key={name as string}
                  type="button"
                  aria-pressed={selected as boolean}
                  className={`flex min-h-[var(--d-tap)] items-center justify-between gap-4 rounded-[var(--d-radius-control)] border-2 p-[var(--d-pad-card)] text-left transition-colors duration-instant ${
                    selected ? "border-primary bg-primary-soft" : "border-line-strong bg-surface"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <Avatar name={name as string} id={name as string} size="lg" />
                    <span className="flex flex-col">
                      <span className="text-[length:var(--d-text-body)] font-semibold text-fg">{name}</span>
                      <span className="text-label text-fg-muted">{age}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <HueTag hue={hue as never}>{room}</HueTag>
                    {selected ? <UserCheck className="size-[var(--d-icon)] text-primary" aria-hidden /> : null}
                  </span>
                </button>
              ))}
            </div>

            <Button full>
              Check in 2 children <ArrowRight />
            </Button>
          </div>
        </Station>
      </Section>

      <Section title="Confirm, and show what will print" note="Every confirmation shows what will be printed before it prints. The code is mono at display size, because a volunteer reads it aloud across a room.">
        <Station>
          <div className="flex flex-col items-center gap-[var(--d-gutter)] p-[var(--d-gutter)]">
            <p className="text-[length:var(--d-text-body)] text-fg-muted">Two children checked in</p>
            <CodeDisplay code="4B07" label="Pickup code" />
            <div className="grid w-full gap-3 sm:grid-cols-2">
              {[
                ["Tola Adeyemi", "Under fives", "teal", true],
                ["Ife Adeyemi", "Primary", "violet", false],
              ].map(([name, room, hue, allergy]) => (
                <Card key={name as string} className="flex flex-col gap-2 border-dashed">
                  <p className="text-label uppercase tracking-wide text-fg-subtle">Child label</p>
                  <p className="text-[length:var(--d-text-body)] font-semibold">{name}</p>
                  <HueTag hue={hue as never}>{room}</HueTag>
                  <p data-numeric className="font-mono text-heading tracking-[0.15em]">4B07</p>
                  {allergy ? <Badge tone="critical">Peanut allergy</Badge> : null}
                </Card>
              ))}
            </div>
            <Button full variant="accent">
              <Printer /> Print 3 labels
            </Button>
            <p className="text-label text-fg-muted">Two child labels and one guardian label, same code.</p>
          </div>
        </Station>
      </Section>

      <Section title="A blocking warning is blocking" note="A custody restriction or a failed pickup code is a full-screen interrupt with one deliberate action. Not a toast, and not a dialog that can be dismissed by clicking beside it.">
        <div data-density="station">
          <BlockingInterrupt
            heading="Do not release this child"
            detail="Bisi Adeyemi has a custody restriction on file. Only Folake Adeyemi may collect. Find a supervisor before continuing."
            action={
              <Button variant="secondary" className="bg-white text-critical">
                Get a supervisor
              </Button>
            }
          />
        </div>
      </Section>

      <Section title="Search, at station size" note="Phone last four digits, name, or a barcode. Returns in under a second at five thousand people.">
        <Station>
          <div className="flex flex-col gap-4 p-[var(--d-gutter)]">
            <label htmlFor="st-search" className="text-[length:var(--d-text-body)] font-semibold">
              Last four digits of your phone number
            </label>
            <Input id="st-search" inputMode="numeric" placeholder="0148" className="text-center font-mono tracking-[0.3em]" />
            <Button full>Find my family</Button>
          </div>
        </Station>
      </Section>
    </>
  );
}
