"use client";

import * as React from "react";
import { PageTitle, Section } from "@/components/section";
import { Conversation } from "@/components/inbox/thread";
import { Threads, Drafts } from "@/components/inbox/list";
import { Marks, ReactButton, EmojiButton, MARKS } from "@/components/inbox/marks";
import { LineActions } from "@/components/inbox/line-actions";
import type { Mark, Said, ThreadRow, DraftRow } from "@/components/inbox/data";

/**
 * R16.9, R24.11. The inbox's own pieces, in every state they have.
 *
 * The gallery is a tool for us rather than a screen a church sees, so the copy
 * here is written inline and the presses reach the server and come back with
 * nothing: there is no church behind this page. What it is for is the states,
 * which are the thing that cannot be checked by opening one conversation: a
 * mark nobody has pressed and one two hundred people have, a line taken back,
 * a line being changed, a line answering another.
 */

const CHURCH = "Riverside Church";
const DAY = "Tuesday, 7 October";

const marks = (made: [string, number, boolean][]): Mark[] =>
  made.map(([emoji, count, mine]) => ({ emoji, count, mine }));

const line = (one: Partial<Said> & { id: string; body: string }): Said => ({
  fromOffice: false,
  name: "Mina Message",
  photoUrl: null,
  mine: false,
  edited: false,
  deleted: false,
  answering: null,
  clock: "9:14 AM",
  day: DAY,
  at: new Date().toISOString(),
  reactions: [],
  readByOthers: false,
  files: [],
  ...one,
});

const SAID: Said[] = [
  line({ id: "1", body: "Is the hall free on Tuesday evening? We are about twelve." }),
  line({
    id: "2",
    body: "It is. I have put you down from seven.",
    fromOffice: true,
    name: "",
    mine: true,
    clock: "9:21 AM",
    reactions: marks([["🙏", 1, false]]),
    /* Read by the other side: two ticks. */
    readByOthers: true,
  }),
  line({
    id: "3",
    body: "Thank you, that is a great help.",
    clock: "9:24 AM",
    answering: { id: "2", name: "", fromOffice: true, line: "It is. I have put you down from seven." },
  }),
  line({ id: "4", body: "🎉", clock: "9:25 AM" }),
  /* Written down and waiting: one tick. */
  line({ id: "4b", body: "Seven it is.", mine: true, name: "", fromOffice: true, clock: "9:26 AM" }),
  line({
    id: "5",
    body: "One more thing: is the kitchen included?",
    clock: "9:30 AM",
    edited: true,
    reactions: marks([["👍", 3, true], ["❤️", 1, false], ["😮", 230, false]]),
  }),
  line({ id: "6", body: "", clock: "9:31 AM", deleted: true }),
];

const THREADS: ThreadRow[] = [
  {
    key: "office",
    name: CHURCH,
    photoUrl: null,
    memberId: null,
    lastLine: "It is. I have put you down from seven.",
    lastMine: false,
    at: new Date(Date.now() - 4 * 60_000).toISOString(),
    unread: 2,
  },
  {
    key: "group/tuesday-night",
    name: "Tuesday Night",
    photoUrl: null,
    memberId: null,
    lastLine: "I can drive if anybody needs a lift.",
    lastMine: false,
    at: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    unread: 0,
  },
  {
    key: "mina-message",
    name: "Mina Message",
    photoUrl: null,
    memberId: "a",
    lastLine: "Thank you, that is a great help.",
    lastMine: true,
    at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    unread: 0,
  },
];

const DRAFTS: DraftRow[] = [
  {
    key: "mina-message",
    name: "Mina Message",
    photoUrl: null,
    body: "About the rota for next month, I wondered whether",
    at: new Date(Date.now() - 20 * 60_000).toISOString(),
  },
];

/** A frame the width the panel actually is, so nothing is read wider than it. */
function Panel({ children, height = 520 }: { children: React.ReactNode; height?: number }) {
  return (
    <div
      className="flex w-[min(420px,100%)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
      style={{ height }}
    >
      {children}
    </div>
  );
}

export default function InboxGallery() {
  const nothing = () => undefined;

  return (
    <>
      <PageTitle
        title="Inbox"
        lede="Messages written here and read here. Nothing behind this page, so a press answers with nothing."
      />

      <Section
        title="A conversation"
        note="Theirs on the left with their face, yours on the right in the church's own tint. A run of lines from one person carries its name once, a line that is nothing but marks is drawn large with no bubble, and the time sits on its own so nothing put against the message can move it."
      >
        <Panel>
          <Conversation
            church=""
            churchName={CHURCH}
            to="office"
            said={SAID}
            onSent={nothing}
            onChanged={nothing}
          />
        </Panel>
      </Section>

      <Section
        title="What is against a line"
        note="Two marks at most, then a count: a line somebody put two hundred and thirty marks against still reads. The one the reader pressed themselves is ringed."
      >
        <div className="flex flex-wrap items-end gap-8">
          {[
            marks([["👍", 1, false]]),
            marks([["👍", 1, true]]),
            marks([["👍", 3, true], ["❤️", 1, false]]),
            marks([["👍", 3, true], ["❤️", 1, false], ["😮", 230, false]]),
          ].map((set, at) => (
            <span
              key={at}
              className="relative rounded-2xl rounded-bl-sm border border-line bg-surface px-3.5 pb-4 pt-2 text-[15px] leading-6"
            >
              A line with marks on it
              <Marks church="" id={`gallery-${at}`} marks={set} mine={false} onChanged={nothing} />
            </span>
          ))}
        </div>
      </Section>

      <Section
        title="Putting a mark on, and writing one"
        note="Six to choose from, which is as many as anybody uses. The emoji are the webfont's rather than the operating system's, so a church on Windows 10 sees what a church on a Mac sees."
      >
        <div className="flex flex-wrap items-center gap-6">
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1">
            <ReactButton
              church=""
              id="gallery-react"
              marks={[]}
              onChanged={nothing}
              className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-[14px]"
            />
          </span>
          <EmojiButton onPick={nothing} />
          <span className="emoji text-[22px]">{MARKS.join(" ")}</span>
        </div>
      </Section>

      <Section
        title="What somebody may do with a line"
        note="Their own line gets the bar above it, with four marks on it. Somebody else's carries two beside the time, which appear on hover and stay put where there is no pointer."
      >
        <div className="flex flex-wrap items-center gap-8">
          <span className="group flex items-center gap-0.5 rounded-full border border-line bg-surface px-1 py-0.5 shadow-sm">
            <LineActions
              church=""
              id="gallery-mine"
              mine
              marks={[]}
              onReply={nothing}
              onEdit={nothing}
              onChanged={nothing}
            />
          </span>

          <span className="group flex items-center gap-1 text-[11px] text-fg-subtle tabular-nums">
            <LineActions
              church=""
              id="gallery-theirs"
              mine={false}
              marks={[]}
              onReply={nothing}
              onEdit={nothing}
              onChanged={nothing}
              quiet
            />
            9:14 AM
          </span>
        </div>
      </Section>

      <Section
        title="The list, and what was started and not sent"
        note="A row is a face, who it is with, what was last said and when. An unread one is set in full weight with a dot against it, and the dot's words are there for a screen reader."
      >
        <div className="flex flex-wrap gap-6">
          <Panel height={240}>
            <Threads rows={THREADS} churchName={CHURCH} onOpen={nothing} open="office" />
          </Panel>
          <Panel height={240}>
            <Drafts rows={DRAFTS} churchName={CHURCH} onOpen={nothing} />
          </Panel>
        </div>
      </Section>
    </>
  );
}
