"use client";

import * as React from "react";
import {
  CalendarDays, CalendarX, CircleDot, ClipboardList, DoorOpen, HeartHandshake,
  History, Inbox, ListMusic, ListPlus, Printer, SearchX, ShieldAlert, Tablet,
  Tag, Users,
} from "lucide-react";
import { EmptyState } from "@hearth/ui";
import { useChurchMark } from "./church-mark";

/**
 * The icons an empty state can wear, by name.
 *
 * A name rather than the component itself, because most of these screens are
 * server components and a lucide icon is an object with methods, which cannot
 * cross into a client component.
 */
const ICONS = {
  calendar: CalendarDays,
  calendarOff: CalendarX,
  group: CircleDot,
  form: ClipboardList,
  room: DoorOpen,
  serving: HeartHandshake,
  history: History,
  inbox: Inbox,
  order: ListMusic,
  field: ListPlus,
  printer: Printer,
  noResults: SearchX,
  incident: ShieldAlert,
  station: Tablet,
  tag: Tag,
  people: Users,
} as const;

export type EmptyIcon = keyof typeof ICONS;

/**
 * R24.17. An empty state wearing this church's mark.
 *
 * The church's logo where it has one, and otherwise an icon naming the thing
 * that is missing. A drawing of a hall tells a church nothing about why their
 * screen is empty; their own mark at least tells them whose screen it is.
 */
export function Empty({
  icon,
  title,
  body,
  action,
  className,
}: {
  /** What is missing, for a church that has not uploaded a logo. */
  icon: EmptyIcon;
  title: string;
  body?: string;
  /** The same button this page carries in its corner. */
  action?: React.ReactNode;
  className?: string;
}) {
  const logoUrl = useChurchMark();
  const Icon = ICONS[icon];

  return (
    <EmptyState
      mark={
        logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            aria-hidden
            className="size-14 rounded-2xl border border-line bg-surface object-contain p-1.5"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="size-7" aria-hidden strokeWidth={1.5} />
          </span>
        )
      }
      title={title}
      body={body}
      action={action}
      className={className}
    />
  );
}
