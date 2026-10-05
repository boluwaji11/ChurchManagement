# ConnectApp

**Product Requirements Document**

| | |
|---|---|
| **Product** | ConnectApp, a church management platform. Phase 2 adds Hearth Stage, a worship presenter. |
| **Version** | 1.0 (draft) |
| **Date** | 29 September 2026 |
| **Status** | Approved for build |
| **Owner** | Boluwaji Oyewumi |
| **Name** | "ConnectApp" chosen after "Sanctuary" was found in use by three competing products. A formal trademark search is a pre-launch task. The name lives in configuration, not in code. |

---

## 1. Summary

ConnectApp is a church management platform for small churches, given to them at no cost and built for
the volunteer who actually runs it.

It starts as the system a church runs its week on: people, families, attendance, children's
check-in, giving, groups, volunteers, and the Sunday service plan. Phase 2 adds Hearth Stage, a
worship presenter that replaces ProPresenter and, crucially, already knows what is happening on
Sunday because it reads the same service plan and the same song library.

It is funded by donations and grants, hosted by us, and licensed AGPL-3.0, so that staying free is a
property of the licence rather than a promise in a blog post.

### 1.1 The one-sentence thesis

Free church software already exists and churches cannot use it. ConnectApp is the first one that is
both free and usable by a volunteer who gives four hours a week.

---

## 2. The problem

### 2.1 Church software is priced for churches that have budgets

Pricing verified September 2026:

| Product | Price | Note |
|---|---|---|
| ChurchTrac | $9 to $105/mo | Cheapest credible option. Accounting is another $15/mo. |
| Breeze | $72/mo | Flat rate, no per-member fee. |
| Tithe.ly | $72/mo, $119/mo bundled | Flat fee, unlimited users. |
| Planning Center | Up to $239/mo | Nine separate products, each priced separately. |
| ProPresenter | $289/yr per seat, $649/yr campus | Plus $199/yr for ProContent, plus a $99 signup fee. |

Two things about that table matter more than the headline numbers.

**Modular pricing hides the real cost.** Planning Center's entry points are free or near free, and
then you need People, Services, Giving, and Check-Ins to run an ordinary Sunday. Four products, four
price tiers, and a bill well past $150/mo for a church of two hundred.

**Transaction fees dwarf the subscription.** Online giving carries roughly 2.9% plus 30 cents. A
church receiving $40,000 a month online pays about $1,200 a month in processing. The $72
subscription is not the expense. The giving platform is.

Add the presenter, the website, the bulk email tool, and the church app, and a two hundred member
congregation with one part time administrator is carrying five subscriptions and a four figure
annual software line.

### 2.2 Free options exist, and they do not work

This is the part most "free church software" pitches skip, so it is worth being precise.

**Rock RMS** is genuinely free, genuinely open source, and has the strongest CRM feature set of any
church platform: connection pipelines, engagement scoring, discipleship tracking, workflow
automation. It also runs on Windows, IIS, and .NET, has a steep learning curve, and requires a
developer or a paid hosting partner. Rock Cloud hosting runs $50 to $200/mo, which is to say, the
same as the products it was meant to undercut.

**ChurchCRM** is free and self-hostable with a comparable feature list and a dated interface.

Both are built for churches with a technical person. The church in section 3 does not have one. It
has Maria, who is a retired schoolteacher, comes in Tuesdays and Thursdays, and is very good at her
job and will not be installing IIS.

### 2.3 The actual gap

> Free software for churches exists. Easy software for churches exists. Nothing is both.

ConnectApp's target is Rock RMS's price with Breeze's usability. That sentence is the product
strategy, and every scoping decision in this document comes from it: if a feature makes the product
more powerful but less usable by a volunteer, it is cut or deferred, no matter how much the
competition markets it.

---

## 3. Who this is for

### 3.1 In scope

Churches of **50 to 500 weekly attendance**, with **zero to two paid staff**, administered by a
**non-technical volunteer or a part time secretary**.

### 3.2 Explicitly out of scope for v1

Multi-site churches. Congregations over 2,000. Denominational or diocesan rollups. Churches with an
IT staff member.

This exclusion is not modesty, it is what buys us the ability to ship. It is why ConnectApp has no
workflow automation engine and no engagement scoring model. Both are a reason Rock RMS is unusable
for everyone else, and a 180 member church has never once needed either.

Report building was the third of those and is now built, bounded, under R18.12. The bound is what
matters: a church picks a subject, a field and an operator from a fixed catalogue. Nothing in it
asks anybody to choose a table or write an expression.

Campus and location are still modeled in the schema from day one, because retrofitting tenancy
boundaries is the one mistake you cannot undo cheaply. The UI simply does not expose them in v1.

### 3.3 Personas

**Maria, volunteer administrator.** In the office two mornings a week. Adds new families, keeps
contact details current, prints the directory, prepares Sunday's check-in labels, chases the people
who have gone quiet. She is the daily user and the product's real judge. Her enemy is retyping
things she has already typed. If ConnectApp makes her do double entry, she goes back to the
spreadsheet, and the church goes with her.

**Pastor Dave, lead pastor.** Wants to know who is new, who is slipping away, and whether Sunday
will run smoothly. Not a software person, and not interested in becoming one. He evaluates
ConnectApp with exactly one question: can Maria use it?

**Grace, treasurer, volunteer.** Records the cash and cheques from Sunday, reconciles the deposit,
and every January produces year end giving statements that must satisfy the IRS. That is a legal
deadline, not a nice to have. If ConnectApp cannot produce compliant statements in January, ConnectApp
is not a giving system.

**Ruth, children's ministry lead.** Runs check-in on Sunday with a rotating team of volunteers. Her
entire job for ninety minutes is knowing which child is in which room, which child cannot eat
peanuts, and that no child leaves with the wrong adult. She needs the system to be fast, obvious to
a first-time volunteer, and to keep working when the church wifi drops. Which it will.

**James, worship and tech lead, volunteer.** Plans the set, schedules the band, runs the slides.
Today he is paying for ProPresenter personally, or the church runs a copy from 2016, or he is
building slides in PowerPoint on Saturday night. He is the Phase 2 user, and he is the one who will
tell four other churches about ConnectApp.

**Members and attendees.** Want the directory, a way to give, to sign their kids in from the car
park, and to find a small group. They will use ConnectApp for four minutes a week and should never
need to be taught how.

---

## 4. Positioning

**For** small and mid-size churches, **who** cannot justify $150 a month in software,
**ConnectApp is** a complete church management platform **that** costs nothing and is built for a
volunteer, **unlike** Planning Center and Breeze, which charge per module, **and unlike** Rock RMS,
which also costs nothing and needs a developer.

Messaging, in the product's own voice. Said once each, not repeated as a refrain:

- Every feature, every church, every time. No modules, no tiers, no upsell.
- Your giving goes to your bank, through your own Stripe account. We take nothing.
- Your data is yours. Export all of it, any time, in one click.
- Built for the volunteer who comes in on Tuesdays, not for a software buyer.

### 4.1 What makes this more than one more ChMS

ConnectApp owns the whole Sunday loop:

```
  Service plan            order of service, songs, who is serving
        |
        v
  Volunteer scheduling    invitations, accept/decline, reminders
        |
        v
  Hearth Stage         renders THAT plan from THAT song library, live
        |
        v
  Check-in + attendance   who actually came, which room, which child
        |
        v
  Follow-up               visitor and absence pipelines generate themselves
        |
        +-----------------> back into the people record
```

Planning Center owns plan through schedule, then exports to ProPresenter through a lossy import.
ProPresenter owns the stage and knows nothing about your people. Nobody owns the loop.

The consequence is an architecture decision that has to land in Phase 1 and cannot wait for Phase 2:
**the song library and the service plan are the shared spine.** Songs are stored in a
presenter-grade schema from the first migration, specced in section 8.12 and section 9.4. If Phase 1
ships a convenient song list instead, Phase 2 is a rewrite. This is the single highest-leverage
decision in this document.

---

## 5. The funding model, and what it costs us

A platform with no revenue and no funding model dies in eighteen months and takes its churches' data
with it. So the funding model is a product requirement, and it has six consequences that constrain
the build.

**Funding:** donations from churches that can afford to give, individual supporters, and grants. No
paid tier. No enterprise edition. No per-seat anything.

### 5.1 Giving: never touch the money

Online giving runs on **Stripe Connect with the church's own Stripe account**, and a platform
application fee of **zero**. Money moves from the giver to the church's Stripe account to the
church's bank. It never passes through us.

Four things fall out of that, and all four are good:

1. We pay no processing fees, so giving volume does not create a cost we cannot cover.
2. We are not a money transmitter, so we avoid a licensing regime a donation funded project could
   never afford to enter.
3. Our PCI scope stays at SAQ-A, because card data never touches our servers. Stripe-hosted elements
   only, always.
4. Giving through ConnectApp costs the church less than Tithe.ly, because there is no platform margin
   stacked on top of Stripe's rate.

Manual entry of cash and cheques is a first-class feature, not an afterthought, because most churches
in this segment still take most of their giving in a plate.

### 5.2 Messaging: bring your own credentials

Churches supply their own Resend or SMTP credentials for bulk email, and their own Twilio credentials
for SMS. ConnectApp sends through them.

This looks like a limitation. It is survival. Reselling messaging credits is the line item that
bankrupts donation funded platforms, because cost scales linearly with the thing you cannot control.
A church sending 4,000 texts a month is a real bill, every month, forever.

A small shared email quota exists for transactional mail only: invitations, password resets, check-in
receipts, scheduling notifications. Bulk communication requires the church's own keys, and the setup
wizard walks Maria through it in under five minutes.

### 5.3 Storage: hard quotas, visible

Per-tenant storage quotas, enforced, with the number shown in the admin UI before anyone hits it.
Images transcoded and resized on upload. Sermon video is an explicit non-goal: link to YouTube.

### 5.4 Support is the real cost, not servers

Multi-tenant Postgres and a modest application footprint serve hundreds of small churches for a few
hundred dollars a month. Support does not scale that way. Non-technical volunteers across five
hundred churches generate a load one person cannot carry, and no amount of donation revenue fixes an
inbox.

So the product carries a burden paid competitors do not: it has to be self-serve past the point that
is comfortable. That is why migration (section 8.19) and onboarding (section 8.22) are first-class
requirements with acceptance criteria, and not polish. Primary support is a community forum. There is
no support inbox.

### 5.5 Trust has to be structural

Churches will ask three questions, and they are the right questions. Why does this cost nothing. Will
you sell our data. What happens when you lose interest.

Promises do not answer those. Structure does:

- **AGPL-3.0 source.** Anyone can read it, run it, and fork it. The licence makes a closed
  commercial fork impossible, which is what turns the pricing into a property of the licence.
- **Complete export, always, ungated.** One click, every entity, open formats. The exit is the trust.
- **A published wind-down commitment.** Ninety days' notice, final exports, and the self-host guide
  released on day one of any shutdown.
- **Nonprofit governance** for the hosted service.
- **We never train models on church data.** Contractual, not aspirational.

### 5.6 Donation coverage ratio gates growth

Donations divided by infrastructure cost. It is a tracked metric (section 12), and it has to reach
1.0 before we spend anything on growth. Signing up churches we cannot afford to host is not
generosity, it is a future outage.

---

## 6. Non-goals

Saying no is most of the work. These are out, and each one has a reason.

| Not building | Why |
|---|---|
| General ledger, accounts payable, payroll | Export to QuickBooks. Accounting software is a product, not a feature, and churches already have one. |
| Website builder or CMS | Crowded, low differentiation, high support burden. Integrate instead. |
| Native branded iOS and Android apps | A good PWA covers the member use case. App store review cycles for hundreds of white-label builds is a full-time job we do not have. |
| Livestreaming platform | YouTube and Facebook already do this for free and better. |
| Multi-site and denominational rollups (v1) | Different product, different buyer, and that buyer has a budget. |
| Workflow automation engine | Ship six opinionated pipelines instead. This is the Rock RMS trap. |
| A report builder with tables, joins or expressions | R18.12 builds reports from a fixed catalogue of subjects and fields instead. A church picks from lists it recognises. |
| Sermon video hosting | Storage cost we cannot fund. Link out. |
| Reselling SMS or email credits | See section 5.2. |
| Self-hosting as a supported product (v1) | The source is public and self-hosting will work, but it is not supported, documented, or tested in v1. |

---

## 7. Release plan

Five releases to GA, then Phase 2. Each release is defined by the church that can use it, not by a
feature count.

| Release | Name | A church can now | Exit criteria |
|---|---|---|---|
| **0.1** | Foundation | Nothing yet, internal only | Tenancy, auth, roles, people, households, import, export, audit log all working with RLS verified by test |
| **0.2** | Sunday Core | Run Sunday and know who came | 3 pilot churches complete four consecutive Sundays of check-in with zero safety incidents |
| **0.3** | Money | Take and record giving, and file statements | One pilot church issues compliant year end statements from real data |
| **0.4** | Service Ops | Plan and staff the service | One pilot church plans and staffs four consecutive services entirely in ConnectApp |
| **1.0** | GA | Replace their existing ChMS entirely | 10 churches migrated off a paid product, 12 week retention above 80%, donation coverage ratio at 1.0 |
| **P2** | Hearth Stage | Run slides from the service plan | Separate PRD at build time. Outline in section 8.23. |

Release tags used in section 8: **0.1**, **0.2**, **0.3**, **0.4**, **1.0**, **1.x** (post-GA),
**P2** (presenter phase).

---

## 8. Functional requirements

Twenty-three domains. Each requirement carries an ID, a release tag, and acceptance criteria where
the criteria are not self-evident. IDs are stable and are the reference used in issues and commits.

### 8.1 Tenancy, roles, and administration

The foundation everything else sits on. Get tenant isolation and permissions wrong here and no
later feature can be trusted with a counselling note or a giving record.

| ID | Rel | Requirement |
|---|---|---|
| R1.1 | 0.1 | Church organisation profile: legal name, display name, address, timezone, service times, logo, brand colour. |
| R1.2 | 0.1 | Campus and location entities exist in the schema and on every relevant record. Single-campus assumption in the UI. |
| R1.3 | 0.1 | Row-level tenant isolation on every table via `tenant_id` plus Postgres row-level security. No application-layer-only filtering. |
| R1.4 | 0.1 | Built-in roles: Owner, Admin, Staff, Finance, Pastoral, Group Leader, Team Leader, Check-in Volunteer, Member. |
| R1.5 | 0.1 | **Field-level permissions.** Giving amounts are visible only to Finance and Owner. Confidential pastoral notes only to Pastoral and Owner. Not a UI convention, enforced at the query layer. |
| R1.6 | 1.0 | Custom roles built from a granular permission matrix. |
| R1.7 | 0.1 | User invitation by email with role assignment, expiry, and revocation. |
| R1.8 | 0.1 | Password auth plus TOTP multi-factor. MFA mandatory for Owner, Admin, and Finance. |
| R1.9 | 1.0 | Google SSO. |
| R1.11 | 0.1 | **Immutable append-only audit log** recording actor, action, entity, before and after values, timestamp, IP. Covers every write to people, giving, notes, permissions, and check-in. |
| R1.12 | 0.1 | Custom fields on Person, Household, Group, Event, and Donation. Types: text, number, date, select, multi-select, boolean, file. |
| R1.13 | 0.1 | Freeform tags on Person and Household, with tag management and merge. |
| R1.14 | 0.2 | Saved lists, both static membership and dynamic rule-based, reusable as targets for communication, scheduling, and reports. |
| R1.15 | 1.0 | API keys with scoped permissions, plus outbound webhooks. |
| R1.16 | 0.1 | Storage quota shown in admin settings with current usage, and a warning at 80%. |

*Accept R1.3:* an automated test suite attempts cross-tenant reads and writes on every table through
both the ORM and raw SQL as the application role, and every attempt fails.
*Accept R1.5:* a Staff-role session requesting a donation amount through the API receives the record
with the amount field absent, not null and not zero.
*Accept R1.11:* the audit log cannot be modified or deleted by any application role, including Owner.

### 8.2 People

The hub. Every other domain reads from here, and Maria spends most of her time in it, so keystroke
count is a design constraint and not a detail.

| ID | Rel | Requirement |
|---|---|---|
| R2.1 | 0.1 | Person record: names including preferred name, gender, date of birth, marital status, photo, lifecycle status. |
| R2.2 | 0.1 | **Household** with members and roles: head, spouse, child, other. A person belongs to one household at a time, with history retained. |
| R2.3 | 0.1 | Multiple emails, phones, and addresses per person, each with a type and one marked primary. |
| R2.4 | 0.1 | Relationships independent of household: spouse, parent, child, **guardian**, emergency contact, and **do-not-contact pairs** for custody and safeguarding situations. |
| R2.5 | 0.1 | Lifecycle status: Visitor, Regular Attender, Member, Inactive, Deceased, Archived. Status changes are logged with date and actor. |
| R2.6 | 0.1 | **Milestones** with date and notes: first visit, salvation, baptism, confirmation, child dedication, membership class, marriage, death. Extensible list. |
| R2.7 | 0.1 | Notes in two separate classes: **general** (staff visible) and **confidential pastoral** (restricted per R1.5, separately audited). The distinction is enforced, not advisory. |
| R2.8 | 0.1 | **Duplicate detection** on create and on import, matching on name, email, phone, and address, with a review queue and a **merge that is reversible for 30 days**. |
| R2.9 | ~~0.2~~ | ~~Skills, interests, and spiritual gifts as managed vocabularies, queryable for volunteer recruiting.~~ **Cut.** A record of what every member is good at and feels called to is more than a church needs to run, and more than is worth holding about somebody. Serving (R10.x) records what a position requires instead. |
| R2.10 | 0.2 | **Background check status**: provider, date completed, expiry date, result. Status tracking only in v1. Feeds the scheduling gate in R10.9. |
| R2.11 | 0.2 | Birthday and anniversary lists, filterable by month and week. |
| R2.12 | 0.1 | Bulk edit and bulk tag across a selected list. |
| R2.13 | 0.1 | **Archive, never hard delete.** Archived people leave all lists and counts but retain giving and attendance history. Hard deletion happens only through the DSAR path in R21.7. |
| R2.14 | 0.2 | Full-text search across names, emails, phones, and addresses, returning results in under 300ms at 5,000 people. |
| R2.15 | 0.2 | Person timeline: a single chronological view of attendance, giving (permission gated), group membership, serving, notes, milestones, and communications. |
| R2.16 | 0.2 | **Lifecycle status moves itself.** A nightly pass promotes a Visitor to Regular Attender on a configurable threshold of visits in a window, defaulting to three in eight weeks. Joining a group or a team, or a membership milestone being added, sets Member. A Visitor or Regular Attender with no attendance, serving, giving or group activity for a configurable quiet period, defaulting to twelve months, becomes Inactive. A Member is never moved to Inactive by the system: the pass raises it for a human to confirm. A status a person set by hand is never overwritten by the pass. |
| R2.17 | 0.2 | **Status history**: every change records the status before, the status after, when, and who made it, naming the system where the nightly pass made it. Readable on the person and reversible in one press. |
| R2.18 | 0.2 | **Staff is recorded separately from lifecycle status**: a flag, a job title and a start date on the person, shown as a badge beside the status. Independent of the tenant role, because an outside bookkeeper holds Finance without being staff and a volunteer worship lead holds Team Leader without being staff. |

*Accept R2.4:* a do-not-contact pair prevents both people appearing in the same household directory
entry and blocks either from being listed as the other's emergency contact.
*Accept R2.8:* importing a file of 500 people that contains 40 known duplicates surfaces at least 38
of them in the review queue before any record is written.
*Accept R2.15:* the timeline loads in one request and renders in under one second for a person with
ten years of history.

### 8.3 Directory

The feature members actually ask for, and the one with the sharpest privacy edge. A church directory
leaking a home address is a real harm, so the default is private and every field is opt in.

| ID | Rel | Requirement |
|---|---|---|
| R3.1 | ~~0.2~~ | ~~Member-facing directory, searchable, grouped by household, with photos.~~ **Cut, October 2026.** A search box over the congregation is not something a member does, and gating the fields does not change what the box is. The printed directory (R3.5) is what a church hands out, and R3.2 to R3.4 govern it. |
| R3.2 | 0.2 | **Per-field visibility controlled by the member**, defaulting to hidden for address and date of birth, and to visible for name only. |
| R3.3 | 0.2 | Whole-record opt out. A member can be absent from the directory entirely while remaining in the database. |
| R3.4 | 0.2 | Children are never shown with contact details, only as household members, and only when the household head opts in. |
| R3.5 | 0.2 | Printable and downloadable PDF photo directory honouring every visibility setting at generation time. |
| R3.6 | 0.2 | Separate admin view showing all fields regardless of member visibility settings, permission gated. Built in F2: with R3.1 cut, it is the only directory on a screen. |

*Accept R3.2:* a member who has hidden their address sees it in their own profile and no other member
sees it anywhere, including in the generated PDF and the API.

### 8.4 Forms

How data gets in without Maria typing it. Every form submission that does not create a person record
is a form that created work instead of saving it.

| ID | Rel | Requirement |
|---|---|---|
| R4.1 | 1.0 | Form builder: text, long text, number, date, select, multi-select, checkbox, file upload, section headers. |
| R4.2 | 1.0 | Conditional logic, showing and hiding fields based on prior answers. |
| R4.3 | 1.0 | Public link plus an embeddable snippet for the church website. |
| R4.4 | 1.0 | **Submissions match to an existing person or create one**, using the R2.8 duplicate logic, and write custom field answers onto the person record. |
| R4.5 | 1.0 | Submission review queue for submissions that matched ambiguously. |
| R4.6 | 1.0 | Notification on submit to a chosen user or role. |
| R4.7 | 1.0 | Submission triggers pipeline entry (R5.4), for example a connection card starting the first-visit pipeline. |
| R4.8 | 1.0 | Prebuilt templates: connection card, prayer request, membership interest, volunteer application, child information and medical, facility use request. |
| R4.9 | 1.0 | Required-field validation, spam protection, and per-form submission limits. |

*Accept R4.4:* a connection card submitted by an existing member updates their phone number on their
existing record and does not create a second record.

### 8.5 Follow-up and assimilation

The difference between a database and a ministry tool. This is also where we consciously refuse to
build what Rock RMS built.

**Design decision:** no workflow engine in v1. Six fixed, well-designed pipelines instead. A
configurable builder is 1.x, and only if pilot churches ask for it. Most will not, because the six
cover what small churches actually do.

| ID | Rel | Requirement |
|---|---|---|
| R5.1 | 0.2 | Pipeline model: ordered steps, each with an assignee, a due date, an outcome, and notes. |
| R5.2 | 0.2 | Six prebuilt pipelines: **First Visit**, **Second Visit**, **Absent Three Weeks**, **Baptism Interest**, **Membership Class**, **Serving Interest**. |
| R5.3 | 0.2 | Automatic entry on trigger events: first attendance recorded, second attendance recorded, three consecutive absences, form submission, milestone added. |
| R5.4 | 0.2 | Manual entry, bulk entry from a list, and manual exit with a reason. |
| R5.5 | 0.2 | **My Follow-ups** queue per user: everything assigned to me, sorted by due date, with overdue surfaced first. |
| R5.6 | 0.2 | Generic tasks not attached to a pipeline, assignable to a user with a due date and a linked person. |
| R5.7 | 0.2 | Pipeline dashboard: how many people are in each stage, how long they have been there, and what is overdue. |
| R5.8 | 1.x | Configurable pipeline builder. |

*Accept R5.3:* a person recorded as attending for the first time appears in the First Visit pipeline
within one minute, assigned to the configured default owner, with a due date two days out.
*Accept R5.5:* the queue is the landing page for the Pastoral role and loads in under one second.

### 8.6 Pastoral care

The most sensitive data in the building. A counselling note leaking does more damage than a giving
record leaking, so this domain gets its own permission tier and its own audit trail.

| ID | Rel | Requirement |
|---|---|---|
| R6.1 | 1.0 | Care log: dated interactions with type (call, visit, hospital, email, meeting), participants, summary, and follow-up date. |
| R6.2 | 1.0 | **Confidential counselling notes** with a permission tier separate from general pastoral access, granted per user, with every read as well as every write recorded in the audit log. |
| R6.3 | 1.0 | Prayer requests: member submitted through the portal or staff entered, with privacy levels of public prayer wall, staff only, or pastor only. |
| R6.4 | 1.0 | Hospital and home visit tracking with admission and discharge dates, and a visit roster for the care team. |
| R6.5 | 1.0 | Care teams with assignment and caseload visibility. |
| R6.6 | 1.0 | Benevolence requests: amount requested, decision, amount granted, decision maker, and notes, reportable in aggregate without exposing individual names to non-finance roles. |
| R6.7 | 1.0 | Follow-up reminders on care interactions, surfacing in the R5.5 queue. |

*Accept R6.2:* a user without the confidential tier sees that a note exists, its date, and its author,
and cannot read its content through the UI, the API, an export, or a report.
*Accept R6.2:* every read of a confidential note writes an audit entry naming the reader.

### 8.7 Attendance

Most churches in this segment count heads on a clipboard. ConnectApp has to be better than the
clipboard on the first Sunday, or it does not get a second.

| ID | Rel | Requirement |
|---|---|---|
| R7.1 | 0.2 | Service occurrences generated from the church's configured service times, editable, with cancellation and special services. |
| R7.2 | 0.2 | **Headcount-only mode.** A single number per service per category (adults, children, visitors). Many churches will never do more than this, and the product must not nag them into it. |
| R7.3 | 0.2 | Individual attendance recording, by roster tick-list, search, or check-in (R8.x). |
| R7.4 | 0.2 | Attendance against groups and events as well as services. |
| R7.5 | 0.2 | **Automatic first-time and second-time visitor flagging** based on attendance history, feeding R5.3. |
| R7.6 | 0.2 | **Absence detection**: configurable consecutive-absence threshold, defaulting to three, feeding the Absent Three Weeks pipeline. |
| R7.7 | 0.2 | Backdated and corrected entry, with the correction audited. |
| R7.8 | 0.2 | Notes per occurrence, for weather, holidays, and anything that explains a number. |
| R7.9 | 0.2 | Trends: week over week, year over year, rolling four-week average, and comparison against the same week last year. |

*Accept R7.3:* recording individual attendance for 120 people from a roster takes under three minutes
on a tablet, with no page reloads.
*Accept R7.6:* the threshold counts only occurrences the person would have been expected at, and
ignores cancelled services.

### 8.8 Check-in

**Safety-critical.** This is the one domain where a software defect can cause physical harm to a
child. It is specified in more detail than anything else in this document, and the offline
requirement is not negotiable.

The failure mode we are designing against is concrete: it is 9:58 on a Sunday morning, forty families
are queuing, the church wifi has dropped, and the volunteer running the station has done this twice
before. Everything below serves that moment.

#### Station and flow

| ID | Rel | Requirement |
|---|---|---|
| R8.1 | 0.2 | Station modes: **self-serve kiosk**, **manned station**, **mobile or tablet roaming**, and **pre-check-in from a member's phone** before arrival. |
| R8.2 | 0.2 | Station configuration: which services, which rooms, which label printer, and which mode, saved per device. |
| R8.3 | 0.2 | Family lookup by phone number last four digits, name, or barcode, returning the household in under one second. |
| R8.4 | 0.2 | Check in multiple children from one household in a single flow, with per-child room assignment. |
| R8.5 | 0.2 | Adults and volunteers can check in for attendance and name badges through the same station. |

#### Child safety

| ID | Rel | Requirement |
|---|---|---|
| R8.6 | 0.2 | **Matching label pair**: a child label and a guardian pickup label printed together, sharing a **unique per-visit security code**. Codes are unique within a service occurrence and are not reused within 12 months. |
| R8.7 | 0.2 | **Checkout requires the code** or an explicit supervisor override, and the override records who authorised it and why. |
| R8.8 | 0.2 | **Authorised pickup list** per child, enforced at checkout. A person not on the list cannot collect the child without a supervisor override. |
| R8.9 | 0.2 | **Do-not-contact and custody restrictions from R2.4 are enforced at checkout** and shown as a blocking warning, not a passive note. |
| R8.10 | 0.2 | **Allergies and medical notes are printed on the child label and shown on screen at the moment of check-in**, not buried in a profile the volunteer will not open. |
| R8.11 | 0.2 | Child label includes name, room, service, security code, allergy flag, and the church name. Guardian label includes child name, room, and the matching code. |
| R8.12 | 0.2 | Bag or stroller label as an optional third print. |
| R8.13 | 0.2 | **Incident reports**: date, child, room, volunteers present, description, action taken, and whether the guardian was notified. Restricted to the Pastoral and Admin roles, permanently retained. |

#### Rooms and ratios

| ID | Rel | Requirement |
|---|---|---|
| R8.14 | 0.2 | Rooms with age or grade ranges, and automatic room suggestion by the child's date of birth. |
| R8.15 | 0.2 | **Room capacity limits** with a warning at capacity and a block above it, overridable by a supervisor. |
| R8.16 | 0.2 | **Volunteer to child ratio warnings** per room, with the ratio configurable per age band. |
| R8.17 | 0.2 | **Two-adult-rule warning**: a room showing fewer than two checked-in volunteers raises a visible alert on the supervisor dashboard. |
| R8.18 | 0.2 | Live room roster, printable, showing who is present now and who has been collected. |
| R8.19 | 0.2 | Supervisor dashboard: every room, headcount, capacity, ratio status, and outstanding pickups. |

#### Offline

| ID | Rel | Requirement |
|---|---|---|
| R8.20 | 0.2 | **The station caches the household roster, room configuration, and medical notes locally before the service begins.** |
| R8.21 | 0.2 | **Check-in and checkout continue to function with no network**, printing labels and generating valid security codes from a locally reserved code range that cannot collide with another station's. |
| R8.22 | 0.2 | The station shows its connection state plainly, and never silently fails. |
| R8.23 | 0.2 | **Automatic reconciliation** on reconnect, with conflicts surfaced for human resolution rather than auto-merged. |
| R8.24 | 0.2 | Label printing works offline, via a local print path, not a server-rendered document. |

#### Hardware

| ID | Rel | Requirement |
|---|---|---|
| R8.25 | 0.2 | Brother QL series and Dymo LabelWriter support, the two printers this segment actually owns. |
| R8.26 | 0.2 | Plain paper fallback: a printable check-in sheet for churches with no label printer. |
| R8.27 | 1.0 | Barcode or QR household cards for returning families. |

*Accept R8.6:* two children checked into different rooms in the same service never receive the same
security code, including when checked in from two different offline stations.
*Accept R8.10:* a volunteer completing a check-in for a child with a recorded peanut allergy cannot
finish the flow without the allergy having been displayed on screen.
*Accept R8.21:* with the network interface disabled mid-service, a station completes 30 check-ins and
15 checkouts, prints correct labels throughout, and reconciles all 45 events with zero data loss and
zero code collisions on reconnect.
*Accept R8.8:* an adult not on a child's authorised pickup list is refused at checkout, and the
refusal is logged.

### 8.9 Groups and discipleship

Where the church actually happens between Sundays. The hard part is not the roster, it is getting
group leaders to record anything at all, so every leader-facing flow is built for a phone and for
under sixty seconds of effort.

| ID | Rel | Requirement |
|---|---|---|
| R9.1 | 0.2 | Group types, configurable: small group, ministry team, class, committee, other. |
| R9.2 | 0.2 | Group record: name, description, type, meeting day and time, recurrence, location, capacity, open or closed. |
| R9.3 | 0.2 | Leaders and co-leaders, with **group-leader-scoped permissions** that see only their own group's members and contact details. |
| R9.4 | 0.2 | Roster with join date, leave date, and role within the group. |
| R9.5 | 0.2 | **Public group finder** for members: browse and filter by type, day, and location, with a join request. |
| R9.6 | 0.2 | Join request approval by the leader, with the member notified either way. |
| R9.7 | 0.2 | **Group attendance in under sixty seconds on a phone**: tick present, mark the meeting as not held, done. |
| R9.8 | 0.2 | Group messaging to the roster, using the church's configured email or SMS provider. |
| R9.9 | 1.0 | Group files and resources, subject to the storage quota. |
| R9.10 | 1.0 | Classes and courses: cohorts with a start and end date, sessions, and completion tracking that writes a milestone on the person record. |
| R9.11 | 1.0 | Group health reporting: attendance consistency, roster growth, meetings held versus scheduled, and groups with no recorded activity in 30 days. |

*Accept R9.3:* a group leader querying the people API receives only members of groups they lead, with
no giving data and no confidential notes, verified by test.
*Accept R9.7:* recording attendance for a group of twelve takes four taps and one submit on a phone.

### 8.10 Serving and volunteers

The domain that decides whether James stays. Volunteer scheduling is tedious, high friction, and the
single most common reason a worship leader pays for Planning Center.

| ID | Rel | Requirement |
|---|---|---|
| R10.1 | 0.4 | Teams and positions: worship, tech, hospitality, children, ushers, and custom, each with named positions. |
| R10.2 | 0.4 | Required background check per position, and which of the team's positions each person plays. (Required skills was cut with R2.9: ConnectApp keeps no list of what a congregant is good at. What a team has asked of somebody is held on the team.) |
| R10.3 | 0.4 | Scheduling by service occurrence: assign a person to a position, reading **across all teams** so the scheduler is shown where else somebody is at that hour. (Amended October 2026: serving in two places at one hour is allowed. The church ruled that somebody who runs the desk and reads a lesson in the same service is doing what small churches do.) |
| R10.4 | 0.4 | **Availability and blockout dates** entered by the volunteer through the portal, respected by scheduling with a warning on override. |
| R10.5 | 0.4 | Serving frequency preference per volunteer, for example once a month, surfaced to the scheduler. |
| R10.6 | 0.4 | **Accept and decline** from an email, SMS, or portal link with no login required, with an optional reason on decline. |
| ~~R10.7~~ | ~~0.4~~ | ~~**Substitute request flow**: a volunteer requests a swap, the system offers qualified and available alternatives, the leader confirms.~~ **Cut, October 2026.** A decline already empties the slot and tells the leader. Filling it is the same picker that filled it the first time, with the same warnings. A separate request object was a second way to say the same thing. |
| R10.8 | 0.4 | Automated reminders: on schedule publication, one week out, and two days out, configurable per team. |
| R10.9 | 0.4 | **Background check gate.** A person without a valid, unexpired check cannot be scheduled to a position flagged as working with children. Hard block, overridable only by Owner, and the override is audited. |
| R10.10 | 1.0 | Training and certification records with expiry, for safeguarding training, first aid, and DBS or equivalent. |
| R10.11 | 1.0 | Volunteer hours recording and reporting. |
| R10.12 | 0.4 | **Coverage gap dashboard**: every unfilled position for the next six weeks, ranked by how soon. |
| R10.13 | 1.0 | Rotation assistance: suggest assignments based on frequency preference, availability, and last served date. |

*Accept R10.3:* attempting to schedule a person to two positions in overlapping services raises a
blocking conflict naming both.
*Accept R10.6:* a volunteer accepts a schedule request from an SMS link on a phone in two taps,
without logging in, and the token expires after use or after 30 days.
*Accept R10.9:* the block is enforced server side, at the point of assignment, and cannot be bypassed
by the API.

### 8.11 Service planning

Half of the Sunday loop. This is the Planning Center Services job, and it is also the input to
Hearth Stage, which means the plan is a data structure and not a document.

| ID | Rel | Requirement |
|---|---|---|
| R11.1 | 0.4 | Plan per service occurrence, with title, date, series, and theme. |
| R11.2 | 0.4 | **Ordered plan items** with type (song, scripture, sermon, announcement, media, prayer, offering, custom), title, duration, and description. |
| R11.3 | 0.4 | **Live running total and projected end time**, recalculating as durations change. The single most used feature in a plan editor. |
| R11.4 | 0.4 | Song items reference a song and a specific **arrangement**, carrying the key and the sequence into the plan. |
| R11.5 | 0.4 | Scripture items carry reference, translation, and the resolved text. |
| R11.6 | 0.4 | Notes per item, plus **notes addressed to a specific person or position**, so the drummer sees the drummer's note. |
| R11.7 | 0.4 | Attachments per item: chord charts, PDFs, audio, images, video. |
| R11.8 | 0.4 | **Plan templates and duplication** from a prior week, carrying structure without carrying content. |
| R11.9 | 0.4 | Team assignment inline on the plan, writing through to R10.3, so the plan and the schedule are one thing. |
| R11.10 | 0.4 | Printable and exportable order of service, in a full version for the team and a short version for the bulletin. |
| R11.11 | 0.4 | **Live mode**: a phone view showing the current item, the next item, elapsed versus planned, and a tap to advance. Read-only for the team, controllable by the leader. |
| R11.12 | 0.4 | Plan revision history, with who changed what and when. Worship leaders change plans on Saturday night and need to know it happened. |
| R11.13 | 1.0 | **Music stand view**: swipe through charts, per-person and shared annotations, attached practice audio with a rehearsal playlist. |
| R11.14 | P2 | Plan is readable by Hearth Stage over the sync API, including arrangement, sequence, key, and resolved scripture text. |

*Accept R11.3:* changing one item's duration updates the projected end time with no page reload.
*Accept R11.6:* a volunteer viewing the plan sees global notes plus notes addressed to their own
position, and not notes addressed to others.
*Accept R11.9:* assigning a person on the plan creates the schedule request, and declining the request
shows as unfilled on the plan.

### 8.12 Song library

**The spine.** Every field here exists so that Hearth Stage can render from this record with no
transformation and no import step. This is the whole reason the management system and the presenter
are one platform, and it is why this schema ships in 0.4 and not in Phase 2.

| ID | Rel | Requirement |
|---|---|---|
| R12.1 | 0.4 | Song record: title, alternate titles, author and composer, publisher, year, **CCLI song number**, copyright line, and administration notes. |
| R12.2 | 0.4 | Themes and tags, plus tempo in BPM, time signature, and typical duration. |
| R12.3 | 0.4 | Default key, and a flag for public domain. |
| R12.4 | 0.4 | **Lyrics stored as an ordered set of labeled sections**, each with a type (intro, verse, pre-chorus, chorus, bridge, tag, instrumental, ending), a label (V1, C2, B), and lines. Never a single text blob. |
| R12.5 | 0.4 | **Multiple arrangements per song**, each with a name, key, BPM, and a **sequence**: an ordered list of section labels, for example `V1 C V2 C B C C`. |
| R12.6 | 0.4 | **Chord charts in ChordPro**, with server-side and client-side transposition to any key. |
| R12.7 | 0.4 | Audio and video attachments per arrangement, for reference recordings and practice tracks. |
| R12.8 | 1.0 | **Parallel translation lyrics**: one or more additional language versions, section-aligned to the primary, so Stage can render bilingual slides. |
| R12.9 | 0.4 | **Usage history**: every plan a song appeared in, with date, service, arrangement, and key, and a last-used date on the song. |
| R12.10 | 0.4 | **CCLI usage report export** for the reporting period, in the format CCLI accepts. Small churches get fined for failing this, and no free tool does it. |
| R12.11 | 1.x | SongSelect import by CCLI number, pulling lyrics and chord charts. |
| R12.12 | 0.4 | Manual song entry and bulk import from plain text, ChordPro, and OpenLyrics. |
| R12.13 | P2 | Rendered by Hearth Stage directly from these records, over the sync API. |

*Accept R12.4:* a song's lyrics round-trip through export and import with section types and labels
intact, and a sequence referencing `V1 C B` resolves to exactly those sections in that order.
*Accept R12.6:* a chart in G transposes to Bb correctly for all chords including slash chords and
sharps, verified against a fixture set of 50 charts.
*Accept R12.10:* the export for a six-month period lists every song used, the number of uses, and the
CCLI number, and validates against CCLI's required columns.

### 8.13 Giving

Where the money is, and where the mission is. A church of two hundred pays roughly $1,200 a month in
processing fees on Tithe.ly-class platforms. ConnectApp's giving is cheaper to operate than that, not
because of a discount, but because we take nothing at all.

#### Online giving

| ID | Rel | Requirement |
|---|---|---|
| R13.1 | 0.3 | **Stripe Connect onboarding**: the church connects or creates its own Stripe account through an in-app flow, with **platform application fee fixed at zero**. |
| R13.2 | 0.3 | Card, ACH bank debit, Apple Pay, and Google Pay, all through Stripe-hosted elements. **Card data never reaches our servers.** |
| R13.3 | 0.3 | One-time and **recurring gifts**, with the giver able to change amount, fund, frequency, and payment method, and to cancel, without contacting the church. |
| R13.4 | 0.3 | Fund selection at the point of giving, and split gifts across multiple funds. |
| R13.5 | 0.3 | **Optional fee coverage**: the giver may choose to add the processing fee. Displayed honestly, never defaulted on. |
| R13.6 | 0.3 | Giving page hosted at the church's ConnectApp subdomain, brandable, mobile first, working with no login. |
| R13.7 | 1.0 | Text-to-give and a printable QR code for the foyer and the bulletin. |
| R13.8 | 0.3 | Failed payment handling: retry schedule, giver notification, and a staff report of failed recurring gifts. |

#### Funds and manual entry

| ID | Rel | Requirement |
|---|---|---|
| R13.9 | 0.3 | Funds with name, code, active flag, and a **restricted or unrestricted designation**, with restricted fund balances reported separately. |
| R13.10 | 0.3 | **Batch entry for cash and cheques**: open a batch, enter gifts, see a running total against a declared expected total, and close the batch only when they reconcile. |
| R13.11 | 0.3 | **Dual control on batches**: the counting team records two counters, and closing a batch with a variance requires a note. |
| R13.12 | 0.3 | Cheque number, giver, fund, amount, and date per line, with fast keyboard-only entry. |
| R13.13 | 0.3 | **Non-cash and in-kind gifts**: description, estimated value, date, and acknowledgment handling, kept separate from cash totals. |
| R13.14 | 0.3 | Anonymous gifts recorded to a fund with no donor. |
| R13.15 | 0.3 | Refunds and voids, both audited, and reflected in statements. |

#### Pledges and statements

| ID | Rel | Requirement |
|---|---|---|
| R13.16 | 0.3 | Pledges and campaigns: target, period, per-household commitments, progress against commitment, and campaign totals. |
| R13.17 | 0.3 | **Year-end giving statements compliant with IRS Publication 1771**, containing the church's name, the gift dates and amounts, a description but no valuation of non-cash gifts, the statement that no goods or services were provided in exchange, or a description and good faith estimate of any that were, and contemporaneous written acknowledgment for any single gift of $250 or more. |
| R13.18 | 0.3 | Statements generated per household or per individual, church's choice, with **household roll-up and soft credits** so a couple receives one statement. |
| R13.19 | 0.3 | Statement delivery by email and as a print batch, and **self-serve download by the giver** from the portal at any time. |
| R13.20 | 0.3 | Quid pro quo handling on event registrations that carry a benefit, so a $100 gala ticket with a $40 dinner is stated correctly. |

#### Reporting and accounting handoff

| ID | Rel | Requirement |
|---|---|---|
| R13.21 | 0.3 | Fund balances and giving totals by period, by fund, and by method. |
| R13.22 | 0.3 | **Deposit slip generation** per batch, matching what the treasurer takes to the bank. |
| R13.23 | 0.3 | **QuickBooks and CSV export** of deposits and fund allocations. We hand off to accounting, we do not become it. |
| R13.24 | 0.3 | **Lapsed donor report**: gave last year, has not given in N days. The most actionable report in church finance. |
| R13.25 | 0.3 | Giving trends, giving by household band, and first-time giver report. |
| R13.26 | 1.0 | Budget versus actual at fund level. Not a general ledger, a single comparison the treasurer needs. |

*Accept R13.1:* the Stripe Connect account is owned by the church, payouts settle to the church's bank
without passing through any ConnectApp-controlled account, and the application fee on every charge is
verifiably zero.
*Accept R13.2:* a full PCI scan and SAQ-A self-assessment confirms no cardholder data touches
ConnectApp infrastructure.
*Accept R13.10:* a batch cannot be closed while the entered total differs from the declared total,
unless a variance note is recorded.
*Accept R13.17:* a sample statement is reviewed against IRS Publication 1771 by a CPA before 0.3 ships.

### 8.14 Events and registrations

| ID | Rel | Requirement |
|---|---|---|
| R14.1 | 1.0 | Event record: name, description, dates and times, location, image, visibility public or members-only. |
| R14.2 | 1.0 | Public event page with registration, no login required. |
| R14.3 | 1.0 | Free and paid registration, paid through the church's Stripe Connect account at a zero platform fee. |
| R14.4 | 1.0 | Capacity limits with a **waitlist** and automatic promotion when a place frees. |
| R14.5 | 1.0 | Custom questions per registrant, with conditional logic, reusing R4.2. |
| R14.6 | 1.0 | **Family registration in one flow**: register several household members, answer per-person questions, pay once. |
| R14.7 | 1.0 | Add-ons and variable pricing, for example a T-shirt size or an early-bird rate. |
| R14.8 | 1.0 | Promotional and scholarship discount codes, including full waivers, because churches subsidise camp fees. |
| R14.9 | 1.0 | Recurring events and event series. |
| R14.10 | 1.0 | Event check-in reusing the R8 station, including name badges and rosters. |
| R14.11 | 1.0 | Cancellation and refund handling, with the refund policy shown at registration. |
| R14.12 | 1.0 | Attendee export, printable roster, and emergency contact sheet for youth and children's events. |

*Accept R14.6:* a parent registers three children and themselves for a camp, answers medical questions
per child, and pays once.

### 8.15 Calendar and facilities

Room booking conflicts are a genuine source of conflict in churches. This domain is small and pays
for itself the first time it prevents a wedding rehearsal colliding with a youth night.

| ID | Rel | Requirement |
|---|---|---|
| R15.1 | 1.0 | Master church calendar: services, events, group meetings, and room bookings in one view, filterable by ministry. |
| R15.2 | 1.0 | Public calendar with an **iCal or ICS subscription feed** for the church website. |
| R15.3 | 1.x | Two-way Google Calendar and Outlook sync. |
| R15.4 | 1.0 | Rooms and resources with capacity and attributes, and equipment as bookable resources. |
| R15.5 | 1.0 | **Booking with conflict detection**, including setup and teardown buffer times so two events do not collide in the turnaround. |
| R15.6 | 1.0 | **Facility use request workflow**: a request from a ministry or an outside group, an approval step with an approver role, and a decision notification. |
| R15.7 | 1.0 | Outside group requests capture the responsible person, insurance confirmation, and fee, because this is how churches actually handle hall hire. |
| R15.8 | 1.0 | Printable monthly and weekly calendars, and a printable room schedule for the building. |

*Accept R15.5:* a booking overlapping another booking's teardown buffer is refused with both bookings
named.

### 8.16 Communication

Constrained by section 5.2. Churches bring their own sending credentials, and ConnectApp is a very good
front end for them.

| ID | Rel | Requirement |
|---|---|---|
| R16.1 | 1.0 | **Bring-your-own email provider**: Resend API key or plain SMTP, configured in a wizard that verifies the connection and sends a test before saving. |
| R16.2 | 1.0 | **Bring-your-own SMS**: Twilio account SID and token, with the church's own number. |
| R16.3 | 1.0 | Shared transactional email quota for invitations, password resets, check-in receipts, and schedule requests. Bulk sending requires R16.1. |
| R16.4 | 1.0 | Email composer with templates, merge fields, and a saved-template library. |
| R16.5 | 1.0 | **Targeting** by saved list, group, team, pipeline stage, tag, giving status, or attendance status. |
| R16.6 | 1.0 | Scheduled sending and a send queue with progress. |
| R16.7 | 1.0 | Delivery, bounce, and open tracking where the provider supports it, plus bounce-driven email invalidation on the person record. |
| R16.8 | 1.0 | **Consent and unsubscribe management**: one-click unsubscribe honoured across all bulk sends, CAN-SPAM compliant footers, and **explicit opt-in recorded per person before any SMS**, for TCPA. |
| R16.9 | 1.0 | SMS conversations: inbound replies routed to a shared inbox and attached to the person record. |
| R16.10 | 1.0 | PWA push notifications for schedule requests, group messages, and announcements. |
| R16.11 | 1.0 | Announcement feed in the member portal. |
| R16.12 | 1.0 | **Print output**: mail-merge letters, mailing labels in Avery layouts, and envelope printing. Churches print far more than software vendors expect. |
| R16.13 | 1.0 | Birthday and anniversary automations, sending on the day from a template. |

*Accept R16.8:* a person with no recorded SMS opt-in is excluded from every SMS send, silently to the
recipient and visibly to the sender, with the count of excluded recipients shown before sending.
*Accept R16.1:* the wizard fails clearly and does not save credentials that cannot send.

### 8.17 Member and volunteer portal

A PWA, not a native app. Four minutes of use a week, and it should never need explaining.

| ID | Rel | Requirement |
|---|---|---|
| R17.1 | 1.0 | Passwordless sign-in by emailed magic link, plus password as an option. Members will not remember a password for a church app. |
| R17.2 | 1.0 | Profile and household self-service: contact details, photo, and the R3.2 privacy settings. |
| R17.3 | 1.0 | Directory, honouring all visibility rules. |
| R17.4 | 1.0 | Give, view giving history, manage recurring gifts, and download statements. |
| R17.5 | 1.0 | Browse groups, request to join, see my groups. |
| R17.6 | 1.0 | Register for events, view my registrations. |
| R17.7 | 1.0 | **My serving schedule**, with accept and decline, blockout dates, and substitute requests. |
| R17.8 | 1.0 | **Check my children in from my phone**, generating the codes that the station prints on arrival. |
| R17.9 | 1.0 | Submit forms and prayer requests. |
| R17.10 | 1.0 | Prayer wall, for requests marked public. |
| R17.11 | 1.0 | Installable PWA with offline shell and push notifications. |

*Accept R17.1:* a member signs in from a magic link and reaches their giving history in two taps.

### 8.18 Reporting and analytics

Twenty good reports, not a report builder. The refusal is deliberate.

| ID | Rel | Requirement |
|---|---|---|
| R18.1 | 1.0 | Dashboard: attendance trend, giving trend, new people this month, volunteer coverage gaps, overdue follow-ups. |
| R18.2 | 1.0 | Attendance reports: trend, year over year, by service, by demographic, individual attendance history. |
| R18.3 | 1.0 | **First-time visitor conversion funnel**: first visit, second visit, joined a group, started serving, became a member, with conversion rates and elapsed time at each step. The single most valuable report a small church can have. |
| R18.4 | 1.0 | Growth and retention: new, returning, lapsed, and net change by month. |
| R18.5 | 1.0 | Giving reports: by fund, by period, by household band, lapsed donors, first-time givers, pledge progress. |
| R18.6 | 1.0 | Group participation and group health. |
| R18.7 | 1.0 | Volunteer coverage, serving frequency, and expiring background checks and certifications. |
| R18.8 | 1.0 | Milestone and demographic lists: birthdays, anniversaries, baptisms this year, new members. |
| R18.9 | 1.0 | **Connectedness indicator** per person: a plain four-part signal of whether they attend, give, serve, and belong to a group. Four booleans and a count, not a machine learning score. Understandable at a glance is the whole point. |
| R18.10 | 1.0 | CSV and PDF export on every report. |
| R18.11 | 1.x | Scheduled reports emailed weekly or monthly. |
| R18.12 | 1.0 | **Build a report and keep it.** A subject from a fixed set, conditions on that subject's own fields, chosen columns, and an optional count by one field with a measure. It previews as it is built, saves under a name, runs from the reports list, exports to CSV, and archives. Acceptance: every subject, field, operator and measure is a key in a server-side catalogue, checked on write and again on read, so nothing a church types reaches the database as SQL; a saved report naming a field that no longer exists drops that field rather than failing; sensitive fields (allergies, medical and pastoral notes) are absent from the catalogue; results are capped at 500 rows on screen and 5,000 in a file. |

*Accept R18.9:* the indicator is explainable in one sentence to a pastor, and clicking any part of it
lists the people it refers to.

### 8.19 Data portability and migration

The trust mechanism, and the adoption mechanism. A church will not move to ConnectApp if moving is
hard, and will not trust ConnectApp if leaving is hard.

| ID | Rel | Requirement |
|---|---|---|
| R19.1 | 0.1 | **CSV and Excel import** with column mapping, saved mappings, and templates. |
| R19.2 | 0.1 | **Dry-run preview** showing exactly what will be created, updated, and skipped, before anything is written. |
| R19.3 | 0.1 | Duplicate handling during import via R2.8, with a choice of skip, update, or create. |
| R19.4 | 0.1 | **Rollback** of a completed import within 30 days, as one operation. |
| R19.5 | 0.2 | **Dedicated importers for Planning Center, Breeze, and ChurchTrac**, mapping their native export formats including households, giving history, and groups. |
| R19.6 | 0.3 | Giving history import, preserving fund, date, method, and amount, so the first year-end statement is complete. |
| R19.7 | 0.1 | Demo data set, loadable and removable, so a church can explore before committing. |
| R19.8 | 0.1 | **Complete export of every entity, one click, ungated, always available**, in CSV plus a JSON archive with attachments. No plan gate, no support ticket, no delay. |
| R19.9 | 1.0 | Scheduled automatic export delivered to the church's own storage, for churches that want their own backup. |

*Accept R19.5:* a Planning Center export of 800 people with households, 2,000 giving records, and 30
groups imports with zero manual field mapping and under 2% requiring review.
*Accept R19.8:* the export completes for a 5,000 person church within ten minutes and reimports into a
clean ConnectApp instance with no data loss.

### 8.20 Integrations and API

| ID | Rel | Requirement |
|---|---|---|
| R20.1 | 1.0 | REST API covering people, households, groups, attendance, giving, events, and plans, with scoped API keys and rate limits. |
| R20.2 | 1.0 | Outbound webhooks on person created, attendance recorded, gift received, form submitted, and schedule accepted. |
| R20.3 | 1.0 | Bible API integration for scripture lookup in plans, supporting multiple translations. |
| R20.4 | 1.0 | QuickBooks and generic accounting CSV export. |
| R20.5 | 1.0 | iCal feeds out. |
| R20.6 | 1.x | Zapier and Make integration. |
| R20.7 | 1.x | CCLI SongSelect. |
| R20.8 | 1.x | Background check provider integration, writing results to R2.10. |
| R20.9 | 1.x | Mailchimp list sync, for churches already invested there. |
| R20.10 | P2 | Import from ProPresenter, EasyWorship, OpenLP, OpenSong, and PowerPoint. |

### 8.21 Security, privacy, and compliance

This platform has to be more careful than a paid one, not less, because there is no enterprise
security team behind it and the data is unusually sensitive: minors' records, home addresses, giving
amounts, counselling notes.

| ID | Rel | Requirement |
|---|---|---|
| R21.1 | 0.1 | Tenant isolation by row-level security, tested adversarially (see R1.3). |
| R21.2 | 0.1 | **Field-level permission enforcement at the query layer**, not the view layer (see R1.5). |
| R21.3 | 0.1 | TLS in transit, encryption at rest for the database and object storage, and application-level encryption for confidential pastoral notes. |
| R21.4 | 0.1 | MFA, enforced for privileged roles. |
| R21.5 | 0.1 | Immutable audit log, including reads of confidential notes and giving records. |
| R21.6 | 0.1 | Automated daily backups with point-in-time recovery, and a **restore drill run and documented quarterly**. An untested backup is not a backup. |
| R21.7 | 1.0 | **GDPR and CCPA data subject access**: export of one person's data, correction, and true deletion with a documented retention exception for financial records. |
| R21.8 | 1.0 | Configurable retention policies, with a default of indefinite for financial and safeguarding records and configurable for everything else. |
| R21.9 | 0.3 | **PCI SAQ-A posture only.** Stripe-hosted elements exclusively. Any change that would put card data in our request path is prohibited. |
| R21.10 | 0.2 | Minors' records handled distinctly: no public directory contact details, restricted export, and parental consent recorded for portal access. |
| R21.11 | 0.2 | Safeguarding records: incident reports, training records, and background checks, retained permanently and access restricted. |
| R21.12 | 0.1 | **No model training on church data.** Stated in the terms, enforced in the data pipeline, and no third-party processor permitted to do so either. |
| R21.13 | 1.0 | Published subprocessor list and a public status page. |
| R21.14 | 1.0 | Annual third-party penetration test, results summarised publicly. |
| R21.15 | 0.1 | Secrets management: church-supplied provider credentials encrypted at rest with a separate key, never logged, never returned by the API. |

*Accept R21.6:* a documented quarterly drill restores a full tenant to a point in time and verifies row
counts against the source.
*Accept R21.15:* a church's Twilio token cannot be read back through the UI or the API after saving,
only replaced.

### 8.22 Onboarding and support

Section 5.4 makes this a survival requirement rather than a courtesy. Every support conversation we do
not need to have is what keeps the model viable.

| ID | Rel | Requirement |
|---|---|---|
| R22.1 | 0.2 | **Guided setup wizard**: church details, service times, roles and invitations, import, giving connection, messaging credentials. Progress saved, resumable, skippable. |
| R22.2 | 0.2 | In-context help on every screen, and an embedded searchable help centre. |
| R22.3 | 0.2 | **Time to value target: under 60 minutes from signup to an imported, usable directory**, measured in the product. |
| R22.4 | 1.0 | **Community forum as the primary support channel**, seeded and moderated. No support inbox. |
| R22.5 | 1.0 | Public changelog and public roadmap. |
| R22.6 | 1.0 | In-app announcements for releases and incidents. |
| R22.7 | 0.2 | **Accessibility to WCAG 2.2 AA.** Church volunteers span every age and ability, and a check-in station has to work for someone with a tremor and reading glasses. Audited, not assumed. |
| R22.8 | 0.1 | All user-facing strings externalised for translation from the first commit, even though v1 ships English only. |
| R22.9 | 1.0 | Onboarding email sequence driven by activation state, not by calendar days. |

*Accept R22.7:* full keyboard operability, screen reader labelling on every interactive element, and
contrast ratios verified by automated audit in CI plus one manual audit per release.
*Accept R22.3:* measured for real pilot churches, not in a demo.

### 8.23 Hearth Stage, Phase 2

Outline depth here. Stage gets its own PRD before build. What follows is the shape of it and the
contract it has with Phase 1.

**The competitive position is the important part.** OpenLP, FreeShow, Quelea, and Church Presenter are
already free and already good. Hearth Stage does not win by being a better standalone presenter.
It wins by being the only presenter that already knows this Sunday's plan, this Sunday's songs, the
keys they are in, and who is on the team, because it reads the same database that Maria and James
already use.

**Delivery:** Electron desktop for macOS, Windows, and Linux, sharing a `@connectapp/songs` package
with the web platform, with a local SQLite cache. **Offline first.** The building's internet is not a
dependency for Sunday morning.

| ID | Requirement |
|---|---|
| S1 | Sync service plans and the song library from the platform, and cache them locally. Once synced, run with no network. |
| S2 | Render lyric slides directly from R12.4 sections following the R12.5 arrangement sequence. No import, no transformation. |
| S3 | Themes and templates, text styling, safe areas, and per-slide overrides. |
| S4 | Backgrounds: still image, video loop, and live camera input. |
| S5 | Scripture slides with multiple translations, and automatic verse splitting across slides. |
| S6 | Announcement loops and pre-service rotations. |
| S7 | Countdown timers and clocks. |
| S8 | **Stage display and confidence monitor**: current slide, next slide, plan notes, clock, timer. |
| S9 | Multi-screen output mapping with independent content per output. |
| S10 | **NDI output and alpha-keyed output** for lower thirds in the livestream. |
| S11 | Audio and video playback as plan items. |
| S12 | Props and overlays, shown independently of the main slide. |
| S13 | Hotkeys, macros, MIDI, OSC, and Stream Deck triggers. |
| S14 | **Remote control from a phone or tablet** on the local network. |
| S15 | Bilingual and multi-language lyric output from R12.8, and caption output. |
| S16 | Import from ProPresenter, EasyWorship, OpenLP, OpenSong, and PowerPoint. |
| S17 | Report song usage back to the platform, feeding R12.9 and the CCLI export in R12.10. |
| S18 | Crash recovery: restore to the current slide within five seconds of a restart. |

Non-goals for Stage: audio mixing, lighting control, video switching, and Ableton or MultiTracks
session playback. Those are separate products with separate hardware, and pretending otherwise is how
Stage never ships.


### 8.24 Design system and front end

Cross-cutting, and a requirement rather than a preference. ConnectApp replaces software churches pay for,
so it has to look better than that software, not merely cost less.

Full specification in [docs/design-system.md](docs/design-system.md). The requirements that belong in
a PRD are here.

| ID | Rel | Requirement |
|---|---|---|
| R24.1 | 0.1 | **Three density modes from one system**: `office` (dense, desk, keyboard), `station` (Sunday kiosk, 56px targets, 20px text), `portal` (phone, app-like). Set on the root element, resolved through tokens, so a component is written once. |
| R24.2 | 0.1 | **Design tokens in a platform-neutral source** (`packages/ui/tokens`), generated to CSS custom properties. Mobile comes later and must inherit the palette, scale, and motion rather than reinvent them. |
| R24.3 | 0.1 | OKLCH colour throughout: warm stone neutrals, ink primary, ember accent, plus an **eight-hue spectrum at matched lightness and chroma**, evenly spread. Eight, because twelve read as a paint chart and the extra four were too close to their neighbours to tell apart at a glance. |
| R24.4 | 0.2 | **Colour is assigned to things, not sprinkled on them.** Rooms, teams, group types, funds, ministries, and pipeline stages each own a hue, auto-assigned on creation for maximum separation and editable by the church. Everything else stays quiet: dashboard tiles are plain by default, and at most one in a row is tinted. |
| R24.5 | 0.2 | **Check-in room colour prints on the child label** and tints the room card and the supervisor dashboard, so a volunteer can direct a parent by colour. Faster and more accurate than reading a room name. |
| R24.6 | 1.0 | Master calendar, schedule grids, and all charts are colour-coded from the spectrum, with a categorical series keeping the same colour across every view of the same data. |
| R24.7 | 0.1 | Type: a display serif (Fraunces) with a UI sans (Inter) and a mono for codes (JetBrains Mono), chosen because a volunteer reads a pickup code aloud and must not confuse 0 with O. Self-hosted, no layout shift. |
| R24.8 | 0.1 | **Body text never lighter than 400 weight.** Contrast minimums 4.5:1 body, 3:1 UI boundaries, and **7:1 on any station screen**. Verified in CI. |
| R24.9 | 0.1 | **Colour is never the only signal.** Every status carries an icon or a label as well. |
| R24.10 | 0.1 | **Dark mode is a first-class target**, not an inversion, including dark pairs for every spectrum hue. Tech booths and stage areas are dark on purpose. |
| R24.11 | 0.1 | Lucide icons, consistent stroke per size, one concept to one glyph in a single registry. **Icon-only controls carry accessible labels, and are not permitted at all at station density.** |
| R24.12 | 0.2 | **Motion clarifies, never decorates**: route transitions through the View Transitions API, list insert and reorder animated, optimistic state settling or reverting, skeletons rather than spinners above 300ms, and nothing animated on page load. |
| R24.13 | 0.1 | `prefers-reduced-motion: reduce` means **no motion**, not less, enforced through a single token override so no component can forget. |
| R24.14 | 0.2 | **Station layout makes the safety information impossible to miss**: allergies as a full-width critical banner that cannot be scrolled past, blocking warnings as full-screen interrupts rather than dismissible dialogs, offline state as persistent chrome rather than a toast. |
| R24.15 | 0.1 | **Every component ships with all states** (default, hover, focus-visible, active, disabled, loading, error, empty), a **visible focus ring that is never removed**, full keyboard operation, all three densities, and light and dark. |
| R24.16 | 0.1 | **A `/design` gallery route** rendering every component in every state and density. This is how design gets reviewed, and it is the first thing built. |
| R24.17 | 0.2 | **Illustrated empty states** in spectrum hues, not a grey icon and an apology. A church's first week should feel like an invitation. |
| R24.18 | 0.1 | No glassmorphism, no hover-only affordances, no toast-only errors, no placeholder-as-label, no modal stacking, no emoji as iconography. The full list is in the design system document. |

*Accept R24.8:* an automated contrast audit runs in CI over the gallery route and fails the build on
any violation, with station-density screens held to 7:1.
*Accept R24.16:* the gallery is reachable in a pilot church's own instance, so design review happens on
real data and real devices rather than in a mockup.
*Accept R24.1:* one component implementation renders correctly in all three densities with no
density-specific branches in its own code.

---

## 9. Architecture and data model spine

Full detail lives in [docs/architecture.md](docs/architecture.md) and
[docs/data-model.md](docs/data-model.md). This section records the decisions that are expensive to
change later.

### 9.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript, end to end | One language across web, API, jobs, and the Phase 2 desktop app, so the song and plan logic is written once. |
| Repo | pnpm workspaces plus Turborepo | Stage must import the same packages the web app uses. |
| Web and API | Next.js App Router, server actions plus a REST surface | One deployable, fast to build, good defaults. |
| Database | PostgreSQL | Row-level security is the tenant isolation mechanism. Nothing else on this list is negotiable. |
| ORM | Drizzle | Explicit SQL, predictable queries, and RLS-friendly. |
| Jobs | Durable queue for imports, statements, sends, and reconciliation | Statement generation and imports are long running and must survive a deploy. |
| Files | S3-compatible object storage, per-tenant prefixes, hard quotas | Cost control per section 5.3. |
| Payments | Stripe Connect, zero application fee | Section 5.1. |
| Email and SMS | Church-supplied Resend, SMTP, and Twilio credentials | Section 5.2. |
| Member app | PWA | Section 6. |
| Presenter | Electron plus shared core, SQLite cache | Section 8.23. |
| Licence | AGPL-3.0 | Section 5.5. |

### 9.2 Tenancy

Every table carries `tenant_id`. Postgres row-level security policies are the enforcement boundary,
with the application connecting as a role that cannot bypass them. Application-layer filtering is a
convenience, never a control. Campus and location columns exist from the first migration even though
v1 exposes a single campus, because adding a tenancy dimension later is the one refactor that touches
every query.

### 9.3 Core entities

```
Tenant ──┬── Campus ── Location ── Room
         ├── Person ──┬── HouseholdMembership ── Household
         │            ├── Relationship (spouse, guardian, emergency, do-not-contact)
         │            ├── Milestone
         │            ├── Note (general | confidential)
         │            ├── BackgroundCheck
         │            └── CustomFieldValue
         ├── ServiceOccurrence ──┬── AttendanceRecord
         │                       ├── CheckInEvent ── CheckOutEvent
         │                       └── Plan ── PlanItem ──┬── Song ── Arrangement
         │                                              ├── ScriptureRef
         │                                              └── Attachment
         ├── Team ── Position ── ScheduleRequest (pending|accepted|declined)
         ├── Group ── GroupMembership ── GroupMeeting ── GroupAttendance
         ├── Fund ── Donation ── Batch
         │        └── Pledge ── Campaign
         ├── Event ── Registration ── Registrant
         ├── Pipeline ── PipelineInstance ── PipelineStep ── Task
         ├── Form ── FormSubmission
         └── AuditEntry (append only)
```

### 9.4 The song schema, specced

This is the spine from section 4.1, and it is the reason the two products are one platform. Written
out because getting it wrong in 0.4 costs a rewrite in Phase 2.

```
Song
  id, tenant_id
  title, alternate_titles[]
  author, composer, publisher, year
  ccli_number, copyright_line, is_public_domain
  themes[], tempo_bpm, time_signature, typical_duration_seconds
  default_key
  last_used_at

SongSection                       one row per labeled block of lyrics
  id, song_id
  section_type    intro | verse | pre_chorus | chorus | bridge | tag | instrumental | ending
  label           "V1", "C", "B2"
  sort_order
  lines[]         ordered lines of text, never a single blob
  language        ISO code, primary language marked on the song
  translation_of  nullable self-reference, aligning a translated section to its primary

Arrangement
  id, song_id
  name            "Sunday 2026", "Acoustic"
  key, tempo_bpm
  sequence[]      ordered section labels: ["V1","C","V2","C","B","C","C"]
  chordpro        full chart, transposable
  is_default

ArrangementMedia
  id, arrangement_id
  kind            reference_audio | practice_track | video | chart_pdf
  storage_key, duration_seconds

SongUsage                         drives CCLI reporting in R12.10
  id, tenant_id, song_id, arrangement_id
  plan_item_id, service_occurrence_id
  used_on, key_used, source        platform | stage
```

Three properties matter, and each maps to a Phase 2 capability:

1. **Lyrics are structured, not a blob.** Stage renders slides per section (S2). A blob would force a
   parser, and a parser would force an import step, and an import step is exactly the ProPresenter
   handoff we are trying to delete.
2. **Sequence is data.** The arrangement says `V1 C V2 C B C C`, so Stage builds the slide order with
   no human step, and the same sequence drives the printed chart and the music stand view (R11.13).
3. **Translations are section-aligned.** Bilingual slides (S15) are a join, not a second song.

### 9.5 Offline check-in

The station is the only place where offline is a hard requirement (R8.20 to R8.24), so it gets a
deliberate design rather than a general sync framework.

- Before the service, the station pulls the household roster, room configuration, medical notes, and
  authorised pickup lists into local storage.
- Each station is issued a **reserved security code range** on sync, so codes generated offline cannot
  collide with another station's, satisfying R8.6.
- Check-in and checkout events are written to a local append-only log and replayed on reconnect.
- Replay conflicts, for example the same child checked in at two stations, are surfaced to a human.
  Nothing auto-merges a child's location.

### 9.6 Hearth Stage sync contract

Stage is a client of a versioned sync API, not a second application with a second database. It pulls
plans, plan items, songs, sections, arrangements, and resolved scripture text, and it pushes back
`SongUsage` rows. That is the entire contract, and it is why R11.14 and R12.13 exist as Phase 1
requirements rather than Phase 2 work.

---

## 10. Non-functional requirements

| ID | Requirement |
|---|---|
| N1 | **Sunday window availability of 99.9% or better, measured specifically between 07:00 and 14:00 local time on Sundays**, and reported separately from overall uptime. Generic monthly uptime hides the only outage that matters. |
| N2 | Check-in lookup returns in under one second at 5,000 people. Person search in under 300ms. |
| N3 | Any page interactive in under 2.5 seconds on a mid-range Android phone over 4G. Volunteers are on the church wifi and their own phones, not a desk. |
| N4 | The platform is usable at 5,000 people and 250,000 giving records per tenant without query tuning per church. |
| N5 | No deploys during Sunday windows. Enforced by tooling, not by memory. |
| N6 | Every destructive action is reversible or confirmed: merges reversible 30 days, imports rollback-able 30 days, archive instead of delete. |
| N7 | WCAG 2.2 AA, audited in CI and manually per release (R22.7). |
| N8 | All strings externalised from the first commit (R22.8). |
| N9 | Zero-downtime migrations. A church cannot be told the database is upgrading on a Saturday night. |
| N10 | Infrastructure cost per church per month tracked and published internally, because section 5.6 depends on knowing it. |

---

## 11. Success metrics

Revenue is not a metric here, so these replace it. Each has a target for GA.

| Metric | Definition | GA target |
|---|---|---|
| **Activation** | Churches completing a first check-in or a first giving statement within 30 days of signup | 60% |
| **12-week retention** | Churches still recording attendance 12 weeks after signup. The honest churn signal, because a church that stops recording attendance has left, whatever the login data says. | 80% |
| **Time to value** | Signup to an imported, usable directory | Under 60 minutes, median |
| **Sunday reliability** | Availability inside Sunday 07:00 to 14:00 local windows | 99.9% |
| **Support load** | Support contacts per church per month | Under 0.5 and falling |
| **Donation coverage ratio** | Donations divided by infrastructure cost | 1.0 before growth spend |
| **Migration success** | Churches that completed a migration from a paid product without manual data repair | 90% |
| **Mission metric** | Aggregate annual subscription spend displaced across all churches | Reported, not targeted |

The two to watch hardest are **12-week retention** and **donation coverage ratio**. The first tells us
whether the product works. The second tells us whether it survives.

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **A check-in failure lets a child leave with the wrong adult** | Critical | R8.6 to R8.13 as specified, offline as a hard requirement, adversarial testing of the code and pickup logic before any pilot, and incident reporting built in from 0.2. This risk sets the release gate for 0.2. |
| **Donations never cover hosting** | Critical | Section 5.6 gates growth on the coverage ratio. Costs are structurally low by design: no payment fees, no messaging costs, hard storage quotas. Worst case, growth pauses rather than the service degrading. |
| **Support volume exceeds one person** | High | Community forum instead of an inbox, migration and onboarding as first-class requirements, and a product deliberately smaller than its competitors. If support still swamps us, the answer is narrowing the segment, not hiring. |
| **Scope creep from the presenter** | High | Stage is Phase 2 with its own PRD, and Phase 1 owes it exactly two things: the song schema in 9.4 and the sync contract in 9.6. Nothing else about Stage may influence Phase 1 scope. |
| **Churches distrust something given away** | High | Trust is structural, not promised: AGPL source, ungated export, published wind-down commitment, nonprofit governance, no model training. Pilot churches as references. |
| **Solo maintainer bus factor** | High | Public source, documented architecture, a self-host guide committed to release on any shutdown, and no proprietary dependency that cannot be swapped. |
| **Giving statements are wrong in January** | High | CPA review before 0.3 ships (R13.17), and the first pilot statement season is treated as a release gate. |
| **A data breach of counselling notes or minors' records** | High | Field-level enforcement at the query layer, separate encryption for confidential notes, audit on read, MFA for privileged roles, annual penetration test. |
| **Feature comparison against Planning Center loses deals** | Medium | We are not competing on the comparison table. Positioning is section 4, and the non-goals in section 6 are the strategy. Losing a 2,000 member church is the intended outcome. |
| **Stripe Connect onboarding friction blocks giving adoption** | Medium | In-app guided flow, and manual batch giving fully usable without Stripe so a church gets value before it connects anything. |
| **The name "ConnectApp" is unavailable** | Low | A formal search by a trademark attorney before any brand spend. The name lives in configuration, so a rename is a find and replace, not a refactor. Fallbacks held in reserve: Vestry, Ember. |

---

## 13. Decisions

These were open questions. All eight are now closed, with the reasoning recorded so they do not get
reopened without new information.

### 13.1 Name: ConnectApp

**"Sanctuary" is unusable.** It is in active use by at least three church management products,
including [SanctuaryOS](https://sanctuaryos.app/), a direct competitor covering member management,
giving, volunteers, and pastoral care.

**Decision: ConnectApp.** The presenter is **Hearth Stage**. A connectapp is the warm centre of a house,
where people gather, and it is plain English rather than liturgical vocabulary, which matters for a
US market of largely non-denominational churches. Short, spellable, sayable, and not in use in this
category. It also gives the palette its story, which the design system uses directly.

A formal trademark search by an attorney is required before any brand spend, but not before building.
The name lives in configuration. Fallbacks held in reserve: **Vestry**, **Ember**.

### 13.2 Nonprofit structure: defer incorporation, use a fiscal host

**Decision: do not incorporate before the first donation.** Take donations through a fiscal host,
Open Collective being the obvious choice, which provides a transparent public ledger, handles receipts
through the host entity, and needs no legal entity of our own. The transparent ledger is also a trust
asset, because churches can see exactly what their donations pay for.

Incorporate a nonprofit entity when either trigger fires: annual donations pass roughly $25,000, or
the platform passes fifty churches. Before either, incorporation is cost and paperwork with no
benefit. After either, it is necessary for governance, liability, and grant eligibility.

### 13.3 Pilot churches: shadow mode removes the blocker

The real problem was never recruitment, it was that no responsible church will let a pre-1.0 product
be the source of truth for where their children are.

**Decision: 0.2 pilots run check-in in shadow mode.** ConnectApp runs alongside the church's existing
paper or software process for four Sundays. The church's existing process stays authoritative. ConnectApp
prints its labels, generates its codes, and records its events, and every discrepancy is compared
afterwards. Nothing about a child's safety depends on ConnectApp during the pilot.

That makes the ask to a pilot church nearly free, and it makes the 0.2 exit criteria stronger rather
than weaker, because four shadow Sundays produce a measured discrepancy rate rather than an absence
of complaints. ConnectApp becomes authoritative only when a church chooses to switch after shadow mode.

Pilot criteria: 80 to 400 attendance, an active children's ministry, a named volunteer administrator,
and currently paying for software. Recruitment is a tracked task, not an open specification question.

### 13.4 Licence: AGPL-3.0, final

**Decision: AGPL-3.0.** The argument that matters is not developer preference, it is the trust
argument in section 5.5. Staying free has to be a property of the licence rather than a promise, and
AGPL makes a closed commercial fork of a hosted service impossible. Apache-2.0 would attract more
outside contributors and give up the only structural guarantee we have. For a platform whose entire
proposition is that it will not become expensive later, that is the wrong trade.

Settled before the first outside contribution, which is when it becomes expensive to change.

### 13.5 Bible text: free translations by default, licensed ones by the church's own key

This resolves cleanly by reusing the bring-your-own-credentials pattern from section 5.2.

**Bundled and always available, no key, no cost:**

| Translation | Basis |
|---|---|
| **BSB**, Berean Standard Bible | Dedicated to the public domain in 2023. Modern, readable, and the sensible default. |
| **WEB**, World English Bible | Public domain. |
| **KJV** and **ASV** | Public domain. |
| **NET** | Free web service access with attribution. |

Served through the Free Use Bible API, whose source is MIT licensed and whose terms explicitly permit
commercial use, with a self-hosted copy of the public domain texts as a fallback so scripture lookup
never depends on a third party being up on a Sunday.

**ESV:** supported through a **church-supplied API key** from api.esv.org. Free for non-commercial use
at 5,000 queries a day, which every church in our segment qualifies for and no church will exceed. We
never hold the key.

**NIV: not supported, and we say so plainly.** Biblica licensing is restrictive, there is no free API,
and pretending otherwise wastes a church's time. Churches wanting NIV, NLT, or similar can licence
individually through API.Bible from around $10 a month per translation and supply that key, using the
same mechanism as ESV.

**Default shipped: BSB.** Requirements affected: R11.5, R20.3, S5.

### 13.6 CCLI reporting: export the columns, confirm the detail in build

CCLI reporting is submitted through CCLI's own portal. There is no public API to submit against, so
there is nothing to integrate with.

**Decision: R12.10 ships a CSV export and a printable report** containing song title, CCLI song
number, author, dates used, and number of uses in the period, which is the data a human transcribes
or uploads. Exact column names are confirmed directly with CCLI during 0.4 rather than blocking the
design now. The underlying `SongUsage` data (section 9.4) is complete regardless of format, so a
format change is a report template edit.

Small churches genuinely get penalised for failing to report, and no free tool does this. It stays in
0.4.

### 13.7 Denominational returns: out of scope, handled generically

**Decision: not built.** Some denominations mandate specific annual returns, and building even three
of them means maintaining forms that change annually, for a differentiator that only matters to
churches inside those denominations.

The canned reports and CSV export (R18.x) give a church everything needed to complete a return by
hand, which is what they do today. Revisited after 1.0 only if a denomination arrives with churches
attached.

### 13.8 Non-US giving statements: pluggable from day one, US only in 0.3

**Decision: the statement generator takes a jurisdiction rule set and a receipt template, and 0.3
ships exactly one, the IRS Publication 1771 implementation.**

No IRS assumption is hardcoded: not the required disclosure text, not the $250 contemporaneous
acknowledgment threshold, not the non-cash valuation rule, not the tax year boundary, not the currency.
UK Gift Aid and Canadian CRA receipts are genuinely different documents with different legal content,
and they are out of scope for v1. Adding one later must be a new rule set and template, never a change
to the generator.

This is a small amount of work now and the difference between a market and a rewrite later.

### 13.9 Database and platform: Supabase

Not one of the original eight, and it needed answering before any code.

**Decision: Supabase.**

| Reason | Detail |
|---|---|
| **RLS is the native idiom** | Our tenant isolation boundary is Postgres row-level security (section 9.2). Supabase is built around RLS, so its tooling, docs, and client libraries assume the model we already committed to, instead of fighting it. |
| **Four vendors collapse into one** | Postgres, auth, object storage, and realtime. For a solo maintainer, vendor count is a real cost, and every integration is a thing that can break on a Sunday. |
| **Auth we do not have to build** | Magic links for members (R17.1), TOTP MFA (R1.8), and Google SSO (R1.9) are weeks of work done correctly, and getting auth subtly wrong is how a church's data leaks. |
| **Cost fits the funding model** | The free tier covers the pilot phase outright. Pro is $25 a month with 100,000 monthly active users, which covers several hundred churches at our segment size. |
| **Open source and self-hostable** | Consistent with the AGPL story and the wind-down commitment in section 5.5. |
| **No data-layer lock-in** | It is Postgres. If Supabase ever becomes the wrong answer, the exit is `pg_dump`, which matters because section 5.5 promises churches an exit and we should hold ourselves to the same standard. |

**How we use it, and how we do not:**

- **Drizzle against the Postgres connection directly.** We do not use the auto-generated PostgREST
  API, because field-level permissions have to be enforced in our own query layer (R1.5, R21.2) and
  our public API is a designed surface (R20.1), not a database projection.
- **Connect as a role that RLS applies to**, with the tenant set per transaction via a session
  variable. The service role key is used only by the job worker for operations that are genuinely
  cross-tenant, and never from a request path.
- **Supabase Auth for authentication, our own tables for authorization.** Roles, scoping, and
  field-level rules are ours.
- **Supabase Storage with per-tenant prefixes and enforced quotas** (section 5.3).
- **Realtime is not used in v1.** The check-in station's offline design (section 9.5) is a local event
  log, not a live subscription, and adding a socket dependency to the one screen that must work
  without a network would be backwards.

**The one line to watch:** Supabase Auth prices on monthly active users, which is the only cost in our
stack that scales with member count rather than church count. It is tracked under N10. If it ever
becomes the dominant cost line, the exit is a self-hosted auth library on the same Postgres, which is
a contained change because authorization was never Supabase's job.

## Appendix: pricing sources

All figures verified September 2026.

- [Planning Center overview](https://help.planningcenter.com/en/179938-what-is-planning-center-.html)
- [Tithe.ly on church management software pricing](https://get.tithe.ly/blog/church-management-software-price)
- [ChurchTrac pricing and comparison](https://www.churchtrac.com/blog/best-church-management-software)
- [Breeze and Planning Center comparison, Capterra](https://www.capterra.com/compare/76708-132513/Planning-Center-vs-Breeze-ChMS)
- [Renewed Vision pricing, ProPresenter](https://support.renewedvision.com/hc/en-us/articles/35579747176083-Renewed-Vision-Pricing-and-Renewal-Process)
- [Rock RMS review and hosting costs](https://churchmemberpro.com/blog/rock-rms-review/)
- [Open source church management comparison](https://theleadpastor.com/tools/best-open-source-church-management-software/)
- [Free church presentation software landscape](https://theleadpastor.com/tools/best-free-church-presentation-software/)
- [FreeShow](https://freeshow.app/)
