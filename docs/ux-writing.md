# UX writing

How ConnectApp talks to the people who use it.

This is the authoritative guide for every word a person reads in the product: screens, buttons,
labels, dialogs, errors, empty states, notifications, emails, and the text only a screen reader
hears. [CLAUDE.md](../CLAUDE.md) carries the short version. [docs/design-system.md](design-system.md)
owns how text is presented; this document owns what it says.

## The standard, in one paragraph

ConnectApp should sound natural, clear, warm, professional, and approachable. Write the way a
thoughtful colleague would explain something to a volunteer who has fifteen minutes before a
meeting. Say what happened and what to do next. Give people enough context to finish the task, and
no more than that.

## Who is reading

| Reader | What they need |
|---|---|
| The church administrator | Speed and precision. They are in the product every week and know where things are. |
| A volunteer | To finish one task correctly, having been shown it once, weeks ago. |
| A pastor | The answer, not the mechanism. |
| A ministry leader | Their own small corner of the product, with no training. |
| A parent at check-in | Their child's name, their room, and the code on the label. Nothing else. |
| A member in the portal | To give, join, respond, or update a detail, on a phone, in under a minute. |
| A visitor on a church's public site | To find a service time and feel welcome. |

Almost none of them are software experts. None of them chose this software. Most are doing this
alongside a job.

## Voice and tone

The voice stays the same everywhere: plain, confident, human, unhurried. The tone moves with the
situation.

| Situation | Tone | Example |
|---|---|---|
| A record saved | Brief, unremarkable | "Changes saved." |
| A welcome email | Warm, personal | "Welcome to ConnectApp. Here is how to get your church set up." |
| A permissions screen | Precise, neutral | "Administrators can edit every member record and manage church settings." |
| A security notice | Unambiguous, calm | "Your session has expired. Sign in again to continue." |
| A financial consequence | Exact, complete | "Gifts go to your church's Stripe account. ConnectApp takes no fee. Stripe charges its own processing fee on each gift." |
| Children's check-in | Short, literal, safety first | "Allergy: peanuts." |
| An error we caused | Honest, actionable | "Couldn't save your changes. Try again." |

What the voice is not: jokey, salesy, apologetic, or clever. No exclamation marks except in a genuine
welcome. No winking at the reader.

## Terminology

Use one word for one thing, everywhere, including in emails and on the public site.

| Use | Not |
|---|---|
| member, person | contact, record, entity, user (for a member) |
| household | family unit, family group |
| service | Sunday, Sunday service, mass |
| group | small group, community group (unless the church named it that) |
| serving team | volunteer team, rota team |
| check-in | checkin, check in (as a noun) |
| gift | donation (in member-facing text), contribution (except on statements, where it is the legal term) |
| fund | designation, bucket |
| archive | delete, remove (when the record is kept) |
| church | organization, tenant, account |
| sign in, sign out | log in, login, logout |
| email address | e-mail, email (when the address itself is meant) |

"Tenant", "actor", "repo", "RLS", "catalogue key", "job queue" and the rest of the internal
vocabulary never appear on a screen.

Where a church has named something itself, the church's word wins over ours.

### Service days

A church does not only meet on Sunday. Churches meet on Saturdays, on Fridays, on weeknights, and
many hold several services across several days. Write "a service", "the service", "service day", or
"between services". "Sunday" is correct only as the name of an actual weekday, such as in a day
picker or a group that genuinely meets on Sundays.

Avoid denominational assumptions: no "mass", "sacrament", "parish" or "diocese" in shared product
copy unless the church supplied the word.

## Buttons

A button says what it does, in the fewest words that stay unambiguous. Use the verb the reader would
use.

Good: `Save changes` `Add member` `Create group` `Send invitation` `Publish website` `Archive`
`Restore` `Cancel` `Try again` `Check in` `Import file` `Export`

Keep established interface language. "Add member" is correct and familiar; do not replace it with
something more interesting.

- Lead with the verb. `Add member`, not `Member add` or `New member` where something is being created
  by the press.
- In a dialog, the confirming button repeats the action from the title: a dialog titled
  "Archive this group?" confirms with `Archive group`, not `OK` or `Confirm`.
- `Cancel` is the word for backing out. Not `Never mind`, not `Go back`.
- A button that goes somewhere rather than doing something is named for the destination:
  `Church settings`, not `Go to church settings`.
- A repeated row action is an icon with a label for the tooltip and the accessible name. See the
  design system.
- Never put a count on a button or a tab.

## Headings and screen titles

A screen title is the name of the thing, in one or two words: `People`, `Check-in`, `Services`,
`Giving`, `Website`.

A screen may carry one line under the title saying what the screen is for, when a first-time reader
would otherwise have to guess. It says something the title does not:

Good: "Everyone this church keeps a record of."
Bad: "Manage your members here."

Section headings inside a screen are nouns, sentence case, no trailing punctuation.

## Body text and supporting text

Supporting text is allowed and is often the right thing. It earns its place when it:

- explains a complex setting,
- clarifies an unfamiliar feature,
- prevents a likely mistake,
- describes a consequence,
- explains a financial implication,
- clarifies a privacy or security decision,
- tells a new reader what happens next.

It does not earn its place when it restates the heading, reassures without informing, or explains an
obvious field. A `Name` field needs no hint.

Do not force every screen to carry the same amount of text. A dense settings table and a first-run
onboarding step have different jobs.

Write in sentences. Two short sentences beat one long one with a semicolon.

## Form labels

- Sentence case, no colon: `Email address`, `Date of birth`, `Preferred name`.
- Name the thing, not the storage: `Phone number`, not `Primary contact method`.
- A required field carries the red asterisk through `Field`'s `required` prop wherever the server
  refuses a blank.
- Group related fields under a heading rather than explaining the grouping in prose.
- Checkbox labels state the state when checked: "Send a copy to the group leader."

## Placeholders

A placeholder is never the label.

- When the grey text is a specimen of what goes in the field, open with `e.g. `:
  "e.g. Tuesday night".
- A search field's placeholder is an instruction: "Search people".
- A select's placeholder names the choice: "Choose a room".
- Most fields need no placeholder at all.
- Never a real church's name, real domain, or a real person's details in a placeholder or example.

## Helper text

One line, under the field, for something the reader needs before typing. It is not the place for
rules the reader will discover from an error.

Good: "We send the check-in code to this number."
Good: "This becomes your church's web address: yourchurch.connectapp.church."
Bad: "Enter your email address."

## Dialogs

A dialog confirms an action or reports what happened. It is not a form that writes a record; that is
a side panel.

**Simple action.** The title is the whole of it.

```
Remove announcement?
[Cancel] [Remove]
```

**Consequential action.** Add a description that carries what the title cannot: a consequence
elsewhere, a window for undoing it, or a cost.

```
Archive this group?
Members will no longer see this group in active listings. You can restore it later.
[Cancel] [Archive group]
```

Rules:

- The title names the action and its target, and ends in a question mark.
- A description goes in only when it adds information. Repeating the title in other words is the
  single clearest sign a dialog was written by a machine.
- The description must match the implementation. Do not say "permanently deleted" where the record
  is archived, and do not say "you can restore it later" where it cannot be restored.
- Name the real consequence: what other people will see, what stops working, what happens to money
  already taken.
- Destructive confirmations use the danger button and the action's own verb.

## Empty states

An empty state tells the reader what belongs here and gives them the press that starts it.

```
No groups yet
Create a group for people to connect.
[Create group]
```

- The title is the plain fact: "No groups yet", "No notifications", "Nothing scheduled".
- A description goes in when the reader may not know what the feature is for. A notifications panel
  needs none.
- Offer the action only when this reader is allowed to take it.
- An empty state after a search or filter is a different message: "No people match these filters."
  with a way to clear them.

## Loading and in-progress text

- Skeletons rather than spinners for a screen that is arriving. No words needed.
- A press that starts work puts the control in its busy state. Where words are needed, use the
  present participle of the action: "Saving", "Sending", "Importing", "Publishing".
- Work the reader has to wait through gets the working panel and a sentence saying what is happening:
  "Importing 243 people. This can take a minute."
- Never leave a press looking untouched.

## Errors

An error says what happened and what to do next, in words the reader can act on.

| Situation | Write |
|---|---|
| A save failed for an unknown reason | "Couldn't save your changes. Try again." |
| A known cause | "This file is too large. Choose a photo smaller than 10 MB." |
| A duplicate | "This email address is already in use." |
| An expired session | "Your session has expired. Sign in again." |
| A permission | "You don't have permission to edit this. Ask an administrator." |
| A validation failure | "Enter a date in the future." |

Rules:

- Do not blame the network unless the failure is known to be a network failure.
- Do not invent a cause. "Something went wrong" is weak; "Couldn't send the invitation. Try again."
  is honest and actionable.
- Never show a stack trace, an error code, a table name, or an internal identifier to a reader. A
  support reference is acceptable where support can use it.
- Put the error where the problem is. A field error sits under the field. A failed action's error
  sits in the panel or banner that holds the action, not only in a toast.
- Say "couldn't", not "could not", in error text. It reads the way a person speaks.

## Success messages

- Short and unremarkable: "Changes saved." "Invitation sent." "Website published."
- Confirm the thing that is hard to see: "Invitation sent to anna@example.org."
- No congratulation. No exclamation marks.
- Where the screen itself shows the result, say nothing.

## Warnings

A warning is read in half a second, so it leads with the risk.

- "This room is over its ratio. Add a volunteer before checking in more children."
- "Two people have the same name and birthday. Review before merging."
- A warning that cannot be acted on is not a warning; it is noise.

## Notifications

- One line, naming who or what, then what happened: "Anna Bell accepted the serving request."
- Written from the reader's point of view, not the system's.
- Interpolated dates are rendered in the church's own format, never as an ISO string.
- A notification links to the exact place the reader can act.

## Onboarding and setup

The setup guide is read by somebody who has never seen the product.

- Each step's title is the outcome, in the church's language: "Bring your people in", "Your first
  service".
- Each step's instruction names the control to press on the screen it sent them to, in one sentence.
- Say what the step is for when the reader may not know why it matters.
- Never imply a step is mandatory when it is skippable, and never congratulate.
- Optional steps say so.

## Email

Transactional email is often a church's first impression of ConnectApp.

- Subject lines are specific and under about fifty characters: "Verify your email address",
  "Your church is ready", "Anna Bell asked to join Tuesday Night".
- The first line says why this email arrived.
- One clear action per email, as a real link with readable text.
- Warm in a welcome, neutral in a receipt, precise in anything about money or access.
- Do not promise a review or approval time unless that commitment is real.
- Every email says which church it is about, and who to reply to.
- Plain-text alternatives carry the same information.

## Public site and marketing copy

- Make the cost argument once, with evidence, then describe what the product does.
- Never invent adoption numbers, church counts, testimonials, or awards.
- Never describe an unfinished feature as available.
- Do not make privacy or security guarantees beyond what the implementation and the published
  commitments support.

## Accessibility

- Every icon-only control has a label that names the action: "Edit Anna Bell", not "Edit".
- Link text makes sense alone. Never "click here" or "read more" on its own.
- An accessible name describes the action, not the icon: "Close", not "X".
- Error text is associated with its field so it is announced on focus.
- Screen-reader-only text is written for listening: no visual directions like "below" or "on the
  right".
- Images that carry meaning get alt text that carries the same meaning. Decorative images get empty
  alt text.
- Do not rely on colour alone to carry a word's meaning.

## Localization

- Every user-facing string lives in `packages/i18n` and is read with `t("key")`. A test fails the
  build on copy written inline.
- A number in a sentence uses `plural("stem", n)`, with a `.one` and an `.other` entry. "Send this to
  1 recipients?" is the thing this rule exists to prevent. Write the singular out rather than
  interpolating it: "Send this to 1 recipient?" This covers the verb as well as the noun, so "1
  person has" and "4 people have" are two entries.
- Do not build a sentence by concatenating fragments. Give the whole sentence one key with
  placeholders.
- Keep placeholders meaningful: `{name}`, `{count}`, `{date}`, not `{0}`.
- Dates, times, numbers and money are formatted from the church's country, resolved on the server and
  again in the browser. Never from the reader's browser locale.
- Money on screen goes through `money()`. An amount being typed uses `MoneyInput`.
- Spelling follows the church's country through the spelling layer, so a key's value may read
  "organise" or "organize" depending on the church.

## Punctuation and mechanics

- Sentence case for everything: titles, headings, buttons, labels, menu items.
- No em dashes and no en dashes, anywhere, including numeric ranges. Write "50 to 500". CI checks
  this.
- Full stops end sentences in body text, helper text, descriptions and errors. Labels, buttons,
  headings and single-fragment empty-state titles take none.
- Serial comma.
- Contractions are welcome where a person would use one: "don't", "couldn't", "you'll".
- Numerals for numbers, including one through nine, where the number is data. Words where the number
  is part of a phrase: "one of a kind".
- Quotation marks around a church's own words when quoting a value back: Archive "Tuesday Night"?

## Patterns to avoid

These are the habits that make copy read as machine-written.

- **Repeated slogans.** Saying "free" or "no cost" on every screen. Make the point once.
- **Artificial contrast.** "Archive, never delete." "Free forever, no tiers." A claim followed by its
  own negation for rhetorical effect. Say the true thing and stop.
- **Runs of negations.** "No email, no card, no account." Describe what the thing does.
- **Counter-statements.** "This is progress, not delay." "It is deferred, not dropped." Answering an
  implied criticism nobody made.
- **Excessive reassurance.** "Don't worry, your data is safe!" Say what happens.
- **Awkward metaphors.** "Your church's records live here." "The exit is the trust." Describe the
  feature.
- **Over-formality.** "The changes you made are now held." Write "Changes saved."
- **Invented vocabulary** for ordinary actions. "Commit edits" instead of "Save changes".
- **Hedging.** "You may wish to consider verifying your domain." Write "Verify your domain."
- **Explaining twice.** A dialog whose description restates its title. A screen whose lede restates
  its heading.

A note on the previous guidance: an earlier version of these rules tried to prevent bad writing with
absolute prohibitions, including a ban on all supporting text and on any sentence containing a
contrast. Those rules produced their own awkwardness, which is worse than the habit they were aimed
at. The rule now is the one above: write the sentence a thoughtful person would write, and if a
guideline here blocks the natural phrasing, rewrite the thought rather than contorting the words.

## Explaining technical things

Some tasks are genuinely technical and the reader still has to complete them. Domain verification
needs DNS records. Email authentication involves SPF, DKIM and DMARC. Stripe onboarding asks for a
bank account and identity documents.

- Use the correct terms. A reader who has to paste a TXT record needs to be told it is a TXT record.
- Say what to do, in order, with the exact values to copy.
- Say where to do it: "in your domain registrar's DNS settings".
- Say how long it takes and what happens next: "DNS changes can take up to an hour to reach us. We
  check every few minutes and email you when it is verified."
- Do not simplify a technical fact into something untrue.
- Link to the fuller explanation rather than putting all of it on the screen.

## Review checklist

Before copy ships:

1. Read it aloud. Would a person say it?
2. Does it say what happened, and what to do next?
3. Is every word doing work? Cut the rest.
4. Does the supporting text earn its place, or restate the heading?
5. Does a dialog's description match what the code actually does?
6. Does an error help, without blaming or inventing a cause?
7. Are the terms the same ones the rest of the product uses?
8. Does any number go through `plural`?
9. Do icon-only controls and links read correctly alone?
10. Is it free of em dashes, en dashes, slogans, artificial contrasts, and reassurance?
11. Have you seen it in the interface, at phone width as well as on a desktop?
