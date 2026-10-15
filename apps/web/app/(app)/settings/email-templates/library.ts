import { t, type MessageKey } from "@connectapp/i18n";
import type { LibraryItem } from "@/components/library-picker";

/**
 * HRT-291, R16.4. The messages a church was going to write anyway.
 *
 * A blank subject box asks a volunteer to invent their church's own voice on
 * the spot, which is how a template screen stays empty for a year. These are
 * the four a church of this size actually sends, in words it can send as they
 * are, and picking one fills the same form somebody would have typed.
 *
 * `{first}` and `{church}` are left in, because seeing a mark used is how
 * somebody learns the marks exist.
 */
const STARTERS: { key: string; name: MessageKey; subject: MessageKey; body: MessageKey }[] = [
  {
    key: "welcome",
    name: "mailLib.welcome",
    subject: "mailLib.welcome.subject",
    body: "mailLib.welcome.body",
  },
  {
    key: "invite",
    name: "mailLib.invite",
    subject: "mailLib.invite.subject",
    body: "mailLib.invite.body",
  },
  {
    key: "giving",
    name: "mailLib.giving",
    subject: "mailLib.giving.subject",
    body: "mailLib.giving.body",
  },
  {
    key: "called",
    name: "mailLib.called",
    subject: "mailLib.called.subject",
    body: "mailLib.called.body",
  },
];

export interface TemplatePreset extends LibraryItem {
  name: string;
  subject: string;
  body: string;
}

/** The library in this church's language, without what it already keeps. */
export function templateLibrary(taken: string[]): TemplatePreset[] {
  const held = new Set(taken.map((one) => one.trim().toLowerCase()));

  return STARTERS.map((one) => {
    const name = t(one.name);
    return {
      key: one.key,
      label: name,
      detail: t(one.subject),
      name,
      subject: t(one.subject),
      body: t(one.body),
    };
  }).filter((one) => !held.has(one.name.toLowerCase()));
}
