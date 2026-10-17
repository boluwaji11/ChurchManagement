# UX copy audit

A review of every user-facing string in ConnectApp against
[ux-writing.md](ux-writing.md), October 2026.

## What was reviewed

| | |
|---|---|
| Strings in the English catalogue | 5,497 |
| Catalogue strings changed | 339 |
| Inline strings in the admin portal and the development gate | 14 reviewed and changed |
| Files changed | 11 |
| Screens reviewed in a browser | see "Browser review" below |

`packages/i18n/src/messages/en.ts` was read end to end rather than sampled, and
`packages/i18n/src/messages/client.ts` was regenerated with `pnpm catalogue`. Every key, every
placeholder and every plural form was kept. No key was added or removed, so nothing in the
application had to change to follow this.

The `/design` gallery is exempt by policy: it is a tool for the people building ConnectApp.

## The patterns that were fixed

These are the recurring faults. Each one appeared in many places, and the table under each product
area gives representative examples rather than all 339 lines.

### 1. "That did not save. Try again." (35 keys)

The same generic failure, in a register nobody speaks, on 35 screens. All now read **"Couldn't save
your changes. Try again."** Keys: `settings.profile.failed`, `place.failed`, `announce.failed`,
`milestone.failed`, `relationship.failed`, `notes.failed`, `households.failed`, `roles.failed`,
`giving.failed`, `fund.failed`, `campaigns.failed`, `merge.failed`, `groups.failed`, `find.failed`,
`followups.failed`, `queue.failed`, `pipelines.failed`, `setup.failed`, `team.failed`,
`privacy.failed`, `checks.failed`, `serving.failed`, `order.failed`, `itemKind.failed`,
`planTpl.failed`, `plan.failed`, `form.failed`, `incident.failed`, `services.failed`,
`roster.failed`, `rooms.failed`, `stations.failed`, `checkin.failed`, `board.failed`,
`labels.failed`.

Priority: high. Status: done.

### 2. Failures written as a flat statement, with no next step

"Not saved", "Not imported", "Not exported", "Not created", "Not archived", "That did not work",
"That did not go through", "That could not be sent", "Could not save", "That did not take". Each one
now says what failed and what to do.

Priority: high. Status: done.

### 3. "Click" on a product with a check-in tablet (24 keys)

The setup guide said "Click Add a team", "then click Save". Every other instruction in the product
says "press", and a tablet at a check-in desk has nothing to click. All 24 `setup.at.*` strings now
say **press**.

Priority: medium. Status: done.

### 4. A dialog's cancel button saying something different every time (17 keys)

"Keep it", "Keep them", "Leave as-is", "Leave it in place". A reader who has learned that Cancel
backs out had to read the left-hand button on every dialog. Now **Cancel**, except where "Cancel"
would collide with the action itself: cancelling a service (`services.keep`: "Leave it on the
calendar"), cancelling a scheduled email (`send.callOff.keep`: "Keep it scheduled") and leaving an
unsaved template (`mailTemplate.keepWriting`: "Keep writing") keep their own words, which carry
information Cancel would lose.

Priority: medium. Status: done.

### 5. A promised approval time we have not committed to (6 keys)

"usually within the hour" appeared on the provisional banner, two refusal messages, the team screen,
the website embed screen and the welcome email. Nothing supports it. Each one now says what happens
rather than when.

Priority: high, because it is a promise to a church. Status: done.

### 6. Two words for the same thing

Check-in rooms were called both "rooms" and "kids classes", sometimes on adjacent screens:
`rooms.title` said "Kids classes" while `settings.tab.rooms` said "Rooms" and `rooms.add` said "Add
room". The table of rooms includes an auditorium, a chapel and a hall, so "class" was wrong as well
as inconsistent. Now **room** throughout, in 10 keys.

`contact.primary` said "Main" where the rest of the product says primary. Now **Primary**.

Priority: medium. Status: done.

### 7. A ratio label that said the opposite of the field

`rooms.ratio` is "Children per volunteer" and `rooms.ratioLabel`, for the same number, said "Adults
to children". One of the two was inverted on a screen that governs child supervision ratios.

Priority: high, because it is in the safety-critical area. Status: done. Both now read "Children per
volunteer".

### 8. Metaphor and voice where a plain sentence was wanted

"Where your website answers", "This turns itself over as soon as it is in", "Each church is sealed
off", "The shape goes", "Been and gone", "Darkness over the picture", "Nobody has pledged yet",
"That list answers itself".

Priority: medium. Status: done.

### 9. Slogan and counter-statement on the trust page

"The licence is the reason free forever is a fact rather than a promise" is the artificial-contrast
pattern. "Not by us, and not by anybody we pay to run part of this" is a run of negations. Both
rewritten to state what is true.

Priority: medium. Status: done.

### 10. Punctuation

Error sentences without a terminal full stop, title case on `board.markDone` ("Mark Done"),
`board.finished` ("All Steps Completed") and `groups.add` ("Create a Group"), a missing question mark
on `site.builder`, an ellipsis on `site.support.sending`.

Priority: low. Status: done.

## By product area

### Public website and trust

| Key | Was | Now | Why |
|---|---|---|---|
| `trust.export.title` | You can take everything, any day | Export your church's data anytime | Said plainly, and names the thing being exported |
| `trust.source.body` | ...The licence is the reason free forever is a fact rather than a promise. | ...so anybody can read the code that runs your church, and any fork of it has to stay open too. | Replaces the contrast construction with what the licence does |
| `trust.training.body` | ...Not by us, and not by anybody we pay to run part of this... a test refuses the build if one appears. | ...by us or by any company we pay to run part of ConnectApp. The product contains no model at all... | Run of negations, and an internal CI detail a church cannot act on |
| `site.trust.private.body` | Each church is sealed off. | Each church's records are kept separate. | Describes the feature rather than reaching for an image |
| `site.support.failure` | Your message could not be sent. Try again or use the support email in the footer. | Couldn't send your message. Try again, or email us at support@connectapp.church. | Gives the address instead of sending the reader to look for it |
| `site.support.sending` | Sending message... | Sending | The product's busy state carries no ellipsis anywhere else |

### Onboarding, sign-in and approval

| Key | Was | Now | Why |
|---|---|---|---|
| `signUp.title` | Let's bring your church in | Create your account | Says what the screen does |
| `signUp.failed` | That did not work | Couldn't create your account | Names what failed |
| `signIn.failed` | That did not work | Couldn't sign you in | Same |
| `signUp.sent.wait` | Email not received? Look in spam. | No email? Check your spam folder. | How a person says it |
| `signUp.error.name` | Give both names. They become your own record in the church. | Enter your first and last name. These become your own record in the church. | "Give both names" reads as a command from a form |
| `auth.error.expiredLink` | That link has run out. Ask for a new one. | That link has expired. Ask for a new one. | "Run out" is for supplies |
| `auth.error.partialLink` | That link arrived incomplete, which some mail programs do to a long one. | That link arrived incomplete. Some email programs break long links. | One idea per sentence |
| `auth.error.unknown` | That did not work. Try again, and tell us if it keeps happening. | Something went wrong. Try again, and tell us if it keeps happening. | Honest about an unknown cause |
| `provisional.title` | This church is still being reviewed for full access | Your church is being reviewed | Shorter, addressed to the reader |
| `provisional.body` | ...open once approved, usually within the hour. | ...open once your church is approved. | Removes an unsupported time commitment |
| `provisional.error.people` | A church being checked holds up to 25 members. The rest opens once somebody has looked at it. | A church awaiting approval holds up to 25 members. The limit lifts once your church is approved. | "Somebody has looked at it" is how we talk internally |
| `createChurch.submit` | Create it | Create church | A button names its object |
| `createChurch.failed` | Not created | Couldn't create your church | Says what to do with it |
| `chooseChurch.denied.title` | That church is not available to you | You don't have access to that church | Plain, and not passive |

### People, households and the directory

| Key | Was | Now | Why |
|---|---|---|---|
| `members.empty.title` | No one here yet | No members yet | Names what is missing |
| `directory.none` | 0 members | No members | A count of zero is a sentence, not a number |
| `directory.sort.by` | In the order of | Sort by | Familiar interface language |
| `directory.exporting` | Building the file | Preparing your file | "Building" is ours, not theirs |
| `contact.error.email` | That email address does not look right | Enter a valid email address. | Says what to do |
| `contact.error.signIn` | ...so it stays | ...so it can't be removed. | Says why the control refused |
| `contact.makePrimary` | Make this the main one | Make primary | Established wording, and matches the badge |
| `notes.makeConfidential` | Pastoral, and restricted | Restrict to pastoral roles | A checkbox label says what checking it does |
| `notes.restricted` | Restricted. Your role cannot read this note. | Your role can't read this note. | The first word repeated the second sentence |
| `personForm.archivedNotice.body` | Off every list until you restore them. | They stay off every list until you restore them. | A sentence with a subject |
| `households.empty.body` | A household is made when you put somebody into one on their own page. | A household is created when you add somebody to one from their own page. | Reads aloud |

### Check-in and rooms, the safety-critical area

Every change here was made conservatively. Nothing that states a safety rule was shortened.

| Key | Was | Now | Why |
|---|---|---|---|
| `rooms.ratioLabel` | Adults to children | Children per volunteer | It labels the same number as `rooms.ratio`, and said the inverse of it |
| `rooms.title` | Kids classes | Rooms | One word for one thing, and the list holds halls and auditoriums too |
| `rooms.create` | Add a class | Add a room | Same |
| `checkin.room`, `incident.room` | Class | Room | Same |
| `board.error.full` | That class is full. | That room is full. | Same |
| `error.permission.manageRooms` | change kids classes | change check-in rooms | Same |
| `checkout.block.pickup` | They are not on the list of members who may collect this child. | They are not on the list of people approved to collect this child. | An approved adult need not be a member of the church |
| `checkout.failed` | That did not work | Couldn't check them out. Try again. | At a checkout desk, "that did not work" says nothing |
| `checkin.mine.failed` | That did not go through | Couldn't check them in. Try again. | Same |
| `station.conflict.code` | The code was not one this station was given. | That code wasn't issued by this station. | Active, and clearer about which station |
| `labels.blocked` | Your browser stopped the label window opening | Your browser blocked the label window. Allow pop-ups for this site and try again. | The old one named the problem and not the fix, two minutes before a service |
| `checkin.notPrinted` | Labels did not print | The labels didn't print | Grammar |

`checkout.stop` ("Do not let them go") and `checkout.blocked` ("Stop") were left exactly as they
are. They are stark on purpose.

### Giving

| Key | Was | Now | Why |
|---|---|---|---|
| `give.failed` | That did not go through | Couldn't complete your gift | A giver needs to know it was their gift that failed |
| `give.stop.body` | This will stop the recurring gift. | No further payments are collected. | The old line restated its own title |
| `giving.count.removeBody` | What it counted goes with it. | The amounts counted in this session are removed too. | A consequence stated in full, on a money screen |
| `giving.funds.restrictedWhy` | Given for one thing, and spent on that. | Given for one purpose, and spent on it. | "One thing" is vague on a restricted fund |
| `pledge.none` | Nobody has pledged yet | No pledges yet | Matches every other empty state |
| `stripe.missing` | On Stripe, fill out your Legal name, addresses and other information exactly as it appears... | On Stripe, enter your legal name, address and other details exactly as they appear... | Agreement, capitalization, and a full stop |
| `stripe.failed` | Stripe did not answer. Nothing has been charged, so try again. | Stripe didn't answer and nothing has been charged. Try again. | The reassurance belongs with the fact, not with the instruction |
| `stripe.state.waiting` | Stripe has what your church sent and is still deciding | Stripe has your details and is still reviewing them | Reads aloud |

### Messaging

| Key | Was | Now | Why |
|---|---|---|---|
| `inbox.error.mark` | That is not a mark this product knows | That reaction is not supported. | The old one is the data layer talking |
| `inbox.failed` | That did not send | Couldn't send your message | Names the object |
| `send.error.subject` | Give the message a subject | Enter a subject. | Field errors say what to do |
| `send.error.nobody` | Nobody in that audience has an email address | Nobody in that group has an email address. | "Audience" is our word for it |
| `send.cap` | A send reaches 500 people at a time. | Each send reaches up to 500 people. | "A send" is a noun we invented |
| `send.sentSome` | Sent to {delivered}. {failed} did not go. | Sent to {delivered}. {failed} didn't go through. | Grammar |
| `email.watching.one` | This turns itself over as soon as it is in. | This updates itself as soon as the record is in place. | Nobody knows what turning over means here |
| `email.error.from` | Give the address mail goes out as | Enter the address email is sent from. | Plain, and "email" not "mail" |
| `email.said.exchange` | Resend would not finish the connection. Try again | Couldn't finish connecting to Resend. Try again. | We own the failure |
| `email.test.notConnected` | Nothing is connected to send through | Connect an email account first. | Says what to do |

### Website builder

| Key | Was | Now | Why |
|---|---|---|---|
| `website.settings.address` | Where your website answers | Your website address | "Answers" is server language |
| `website.addressTaken` | Another page already answers at that address. | Another page already uses that address. | Same |
| `website.field.overlay` | Darkness over the picture | Shade over the picture | A control label, not a mood |
| `website.saveFailed` | Could not save | Couldn't save | How a person says it |
| `website.denied` | You do not have permission to change this church's website. | You don't have permission to edit this church's website. | Contraction, and "edit" matches the button |
| `website.error.document` | Something in this website could not be saved. Undo your last change and try again. | Couldn't save part of this website. Undo your last change and try again. | Shorter, and we own it |
| `website.mediaUploadFailed` | The upload did not finish. Try again. | Couldn't upload your media. Try again. | Names what failed |

### Services, serving and follow-ups

| Key | Was | Now | Why |
|---|---|---|---|
| `meeting.saveNotHeld` | Save, it did not meet | Save as not met | A button with a comma in it |
| `meeting.notHeld` | It did not meet | It didn't meet | Contraction |
| `board.markDone` | Mark Done | Mark done | Sentence case |
| `board.finished` | All Steps Completed | All steps completed | Sentence case |
| `board.none.title` | Nobody in this one | Nobody at this stage | "This one" refers to nothing on the screen |
| `queue.nobody` | Nobody has these | Nobody is assigned these | Says the relationship |
| `serves.short` | {count} still wanted | {count} still needed | "Wanted" reads as a notice board |
| `home.mySchedule.none` | You are not on the rota | You are not scheduled yet | "Rota" is regional, and the screen is called Schedule |
| `respond.no` | No, I cannot | No, I can't | A volunteer answering an email |
| `order.template.removeBody` | The shape goes. Plans already built from it keep their items. | The template is deleted. Plans already built from it keep their items. | "The shape" is the author's word for it |
| `live.failed` | That did not take. Try again. | Couldn't save your changes. Try again. | "Did not take" is not a failure message |

### Events and forms

| Key | Was | Now | Why |
|---|---|---|---|
| `event.past` | Been and gone | Past | A status badge |
| `event.archiveTitle` | Put {name} away? | Archive {name}? | The dialog's title names the action its button performs |
| `event.restore` | Bring it back | Restore | Familiar label, and matches every other restore |
| `event.failed` | That could not be saved | Couldn't save your changes. Try again. | Consistent with every other save |
| `publicEvent.failed` | That could not be sent | Couldn't send your registration. Try again. | A visitor needs to know what did not happen |
| `publicForm.failed` | That could not be sent | Couldn't send your answers. Try again. | Same |
| `form.help` | Add more description | Add a description | Grammar |

### Announcements

| Key | Was | Now | Why |
|---|---|---|---|
| `announce.lede` | What your church tells everybody. | Share updates with your congregation. | Says what the screen is for |
| `announce.expiresOn` | Comes down {date} | Expires {date} | The field is called Expires |
| `announce.expires` | Take it down on | Expires on | Same |
| `announce.expired` | Taken down | Expired | Same |
| `announce.pinned` | Hold at the top | Pin to the top | The badge beside it says Pinned |
| `announce.archiveTitle` | Take "{title}" off the board? | Archive "{title}"? | The button says Archive |
| `announce.archived.title` | Announcements off the board | Archived announcements | "The board" is not a thing on this screen |
| `announce.none` | Nothing written yet | No announcements yet | Matches every other empty state |

### Domains and DNS

The technical explanations here were left long on purpose. A volunteer pasting a TXT record needs
the full instruction, and `ux-writing.md` says so.

| Key | Was | Now | Why |
|---|---|---|---|
| `domain.spf` | Who may send email | Allowed email senders | Reads as a label rather than a question |
| `domain.unknownHost` | Not one we recognise | Unknown provider | Says what it is |
| `domain.leaving` | What stays exactly as it is | What won't change | Shorter, same meaning |
| `domain.adding` | What we would add | What we'll add | The church has already asked for it by this point |
| `domain.error.notADomain` | That does not look like a domain name. | Enter a valid domain name. | Says what to do |
| `domain.error.notAllowed` | Your role cannot change the church's settings. | You don't have permission to change church settings. | Addressed to the person, not to their role |
| `domain.warn.noMx` | No emails can be received at this domain. Check your website is correct. | This domain can't receive email. Check the website address on your church profile. | Names the field to check |

### Permissions and errors across the product

"Your role cannot X" appeared as a heading on five screens. A role is not the reader. All now read
"You don't have permission to X".

| Key | Was | Now |
|---|---|---|
| `forbidden.addPeople` | Your role cannot add members | You don't have permission to add members |
| `forbidden.editPeople` | Your role cannot edit members | You don't have permission to edit members |
| `forbidden.denied` | This is not open to your role | You don't have access to this screen |
| `forbidden.body` | Your role does not reach this screen. | Your role doesn't include this area. |
| `tags.forbidden.title` | Your role cannot change tags | You don't have permission to change tags |
| `fields.forbidden.title` | Your role cannot change fields | You don't have permission to change fields |
| `missing.title` | That is not here | We couldn't find that |
| `fault.title` | That screen did not load | This screen didn't load |

### The setup guide

The guide's copy, written in HRT-367, needed less work than the rest: it already explains what each
step is for and why it matters. What changed was 24 instructions saying "Click" and two smaller
things.

| Key | Was | Now | Why |
|---|---|---|---|
| `setup.at.*` (24 keys) | Click Add a team, ... then click Save. | Press Add a team, ... then press Save. | The rest of the product says press, and a check-in tablet has nothing to click |
| `setup.done.title` | You're all set! | You're all set | The product carries no exclamation marks outside a welcome |
| `setup.putAway.body` | ...set up skipped features anytime. | ...set up any skipped steps at any time. | "Anytime" and "features" are not the church's words |

### Transactional email

| Key | Was | Now | Why |
|---|---|---|---|
| `mail.welcome.checking` | {underReview} This usually takes less than an hour. | {underReview} We review every registration by hand. | An approval time we have not committed to, in the one place a church would hold us to it |
| `invite.unsent.title` | The invitation could not be emailed | Couldn't email the invitation | Active |
| `invite.unsent.recorded` | ...once that is sorted. | ...once that is fixed. | Regional idiom |

The three-email registration sequence was checked against the implementation and is correct: an
email verification (`mail.verify.*`), then a welcome while approval is pending (`mail.welcome.*`,
which carries the member cap and says what opens on approval), then an approval confirmation
(`mail.approved.*`). Each one is sent once, from a distinct trigger. The welcome names the review
and the approval email names the outcome, so neither can arrive claiming the wrong status.

### The platform admin portal

The portal is an internal tool and its strings are inline rather than in the catalogue. It was
reviewed anyway, because the ConnectApp team reads it every day.

| File | Was | Now |
|---|---|---|
| `standing.tsx` | Banner: "That did not work" | "That didn't work" |
| `standing.tsx` | "It counts again, and the people who could sign in to it can sign in to it." | "It counts again, and everybody who could sign in to it can sign in again." |
| `standing.tsx` | Confirm: "Put it back" (on two different dialogs) | "Put back into service" and "Put back behind the cap" |
| `churches/[id]/page.tsx` | "Waiting on a person. Capped at 25 members..." | "Waiting for review. Capped at 25 members..." |
| `delivery/page.tsx` | Block title: "What the machines said" | "What CI reported" |
| `actions.ts` | "That did not work. Try again." | "Something went wrong. Try again." |
| `actions.ts` | "Both an address and a password are needed." | "Enter an email address and a password." |
| `actions.ts` | "That address and password do not match a team member's account." | "That email address and password don't match a team member's account." |
| `sign-in/page.tsx`, `sign-in/form.tsx`, `team/members.tsx`, `join/route.ts` | "did not work" | "didn't work" |
| `apps/web/app/dev-gate/gate.tsx` | "That did not work" | "That didn't work" |

## Left alone deliberately

| What | Why |
|---|---|
| `members.add` ("Add a member") | Natural, and the October 2026 design specifies "Add person" for the People screen's own action. Changing one without the other would make them disagree. Worth settling, and not in this pass |
| `checkout.stop`, `checkout.blocked` | Stark on purpose, in the safety-critical area |
| `permission.*` (21 keys) | Long because each one explains a permission to a volunteer choosing roles. The length earns its place |
| `domain.help.*`, `help.taxId.*`, `dns.steps.*` | Technical explanations a reader has to follow exactly. `ux-writing.md` asks for correct terms and complete steps here |
| `tagLib.*`, `fundLib.*`, `teamLib.*`, `flowLib.*`, `planLib.*`, `typeLib.*`, `roomLib.*` | Starter libraries. They are a church's own vocabulary and read well already |
| `services.keep` ("Leave it on the calendar") | Its dialog confirms with "Cancel {name} on {date}", so a Cancel button would be ambiguous |
| `send.callOff.keep` ("Keep it scheduled") | Same collision, with cancelling a scheduled email |
| `mailTemplate.keepWriting` ("Keep writing") | Carries more than Cancel would, and matches `unsaved.stay` |
| `merge.keep` ("Keep this one") | A choice between two records, not a cancel |
| `email.from.namePlaceholder` ("e.g. Grace Chapel") | A generic two-word specimen. Flagged rather than changed: the rule against naming a real church is worth applying here if a better specimen can be found |
| `site.giving.card.title` ("Give to Grace Fellowship") | The same question, on the marketing site's mock giving card. Flagged |
| `when.minutes.one` ("{count} min ago") | Reads as "1 min ago", which is correct, and the abbreviation is deliberate in a dense list |

## Browser review

Checked against a production build, signed in as a seeded account.

| Screen | Checked |
|---|---|
| `/dashboard` | Greeting, tiles, empty states |
| `/members` | Empty state, filters, sort labels, bulk archive dialog |
| `/members/import` | The three setup instructions, now reading "press" |
| `/settings/church` | Labels, the domain panel, save |
| `/settings/rooms` | The room wording, the ratio label |
| `/settings/email` | Provider choice, the connection errors |
| `/giving` | Redirected to the dashboard: the seeded administrator does not hold `canManageGiving`. Not reviewed on screen |
| `/website` | The builder's panels and its save states |
| `/checkin` | The desk, the room board |
| `/` (marketing) | The trust section |

All eight screens rendered with nothing thrown, nothing logged as an error and no failed request.

Anything that could not be exercised without an outside account, meaning a live Stripe refusal, a
real Resend authorization failure and a genuine DNS warning, was read in the catalogue rather than
on screen, and is listed here rather than claimed as reviewed. `/giving` redirected to the dashboard
under the seeded administrator account, so the giving screens were read in the catalogue too.

**The review found one fault the catalogue reading had missed.** The setup guide listed "Set up your
ConnectApp website" and "Build your church website" as two separate steps, four rows apart. The first
is the member portal's address and has nothing to do with the website builder. `setup.step.portal` is
now "Choose your web address" and `portal.title` is "Your church's web address". This is the reason
copy gets read in the interface rather than in the file: both strings were defensible on their own.

## Second pass, 17 October 2026

The first pass fixed the faults it could name and left the rest. Two things it
missed, both found by the owner rather than by me.

### The admin portal was barely touched

The portal's strings are inline rather than in the catalogue, so a pass driven by
`packages/i18n` never reached them. The first pass changed 14 of them, almost all
"did not work" to "didn't work". **65 more have now been rewritten**, across 18
files.

| Was | Now |
|---|---|
| Waiting on a person | Awaiting approval |
| Members held | Members |
| Active in 12 weeks | Active in the last 12 weeks |
| The platform itself | Platform services |
| How far the integrations have reached | Integrations in use |
| Lately | Recent activity |
| The whole log | View the full log |
| What it is / How it is wired / What has been done to it | Church details / Integrations / Activity |
| Made / Through / Sends as / Grant lapses / Last refusal | Created / Provider / Sends from / Access expires / Last failure |
| Who has been at the portal's door. | Every attempt to sign in to the portal, newest first. |
| Two gates | Two checks on every sign-in |
| Made to wait | Rate limited |
| 5 refusals and the address waits | 5 failed attempts locks an address |
| 14 got in, 0 wrong password | 14 signed in, 0 wrong password |
| Reading the repository | Loading |
| No workflow runs came back. | No workflow runs found |
| e.g. Living Waters | Search by name |

**Two of those were only visible in a browser.** `platform_admins`, a database
table name, was printed on the Security screen in a sentence explaining the two
checks. And the status screen reported "No credential in this environment" for
the product itself, where the reason is a missing host rather than a missing
credential; it now says "Not set up here", matching the header beside it.

### The catalogue kept the formal register

127 further strings changed.

**124 contractions.** The standard asks for them where a person would use one,
and the catalogue was almost entirely formal: "is not", "does not", "cannot",
"could not". Left alone deliberately: the safety-critical check-in strings, where
"Do not let them go" is stark on purpose; the legal wording on a giving
statement; and the trust page, where the full form reads as the commitment it is.

**45 passive not-found errors made active.** "That church could not be found" is
now "We couldn't find that church". It was the single most repeated error shape
in the product.

**One test updated**, because it asserted the old wording of
`error.permission` word for word.

## Settled since

1. **`members.add` stays "Add a member".** Settled 17 October 2026. The design specifies "Add
   person" for that screen, and the rest of the product says member everywhere: the nav item, the
   screen title, "Archived members", "No members yet". One screen saying person would be the
   outlier. Recorded against the design's own words table in
   [redesign/README.md](redesign/README.md).
2. **The two church-name specimens are gone.** `email.from.namePlaceholder` is now
   "e.g. your church's name" and `site.giving.card.title` is "Give to your church". Neither names a
   church that could be somebody's.
3. **`website.unpublish` was an orphan**, not a wording problem. Nothing referenced it, literally or
   dynamically; the live control is `website.settings.takeDown`, "Take the website down", which is
   accurate. The key has been removed.
4. **`mail.welcome.checking` was restored to its original wording.** This pass changed "This usually
   takes less than an hour" on the grounds that it promised a review time we had not committed to.
   That was wrong: the owner wrote the email, approval is handled by a person for each pilot church,
   and the commitment is real. The original sentence stands.

## Still open

1. **Error punctuation** is now consistent within every string this pass touched. A handful of
   non-error strings still end without a full stop where a sentence would take one. Low priority.
