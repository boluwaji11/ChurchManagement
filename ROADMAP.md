# Roadmap

Five releases to GA, then Phase 2. Each release is defined by what a church can do with it, not by a
feature count. Requirement IDs refer to [PRD.md](PRD.md).

## 0.1 Foundation

Internal only. No church touches this.

Multi-tenancy with Postgres row-level security, authentication and MFA, roles with field-level
permissions, people and households, relationships, milestones, custom fields, tags, the audit log,
CSV and Excel import with dry-run and rollback, and complete export.

**Exit criteria:** an adversarial test suite attempts cross-tenant reads and writes on every table
through both the ORM and raw SQL, and every attempt fails. Field-level permission enforcement is
verified at the query layer.

Requirements: R1.x, R2.x, R19.1 to R19.4, R19.7, R19.8, R21.1 to R21.6, R21.12, R21.15, R22.8

## 0.2 Sunday Core

The first release real churches run. A church can run Sunday and know who came.

Attendance including headcount-only mode, children's check-in with offline operation, the directory
with per-field member privacy, groups with a public finder, the six follow-up pipelines, saved lists,
background check status, the setup wizard, and the Planning Center, Breeze, and ChurchTrac importers.

**Exit criteria:** three pilot churches complete four consecutive Sundays of children's check-in with
zero safety incidents, including at least one Sunday with a deliberate network failure.

Requirements: R3.x, R5.x, R7.x, R8.x, R9.1 to R9.8, R19.5, R21.10, R21.11, R22.1 to R22.3, R22.7

## 0.3 Money

A church can take and record giving, and file statements in January.

Stripe Connect onboarding at a zero platform fee, online one-time and recurring giving, funds with
restricted designations, cash and cheque batch entry with dual control, non-cash gifts, pledges and
campaigns, IRS Publication 1771 compliant year end statements, deposit slips, the QuickBooks export,
and the lapsed donor report.

**Exit criteria:** one pilot church issues compliant year end statements from real data, and a CPA
reviews a sample statement against IRS Publication 1771 before release.

Requirements: R13.x, R19.6, R21.9

## 0.4 Service Ops

A church can plan and staff the service. This release also lays the Phase 2 spine.

Service plans with ordered items and a live running total, notes per position, attachments, templates,
live mode, the **presenter-grade song library** with arrangements, sequences, ChordPro transposition,
and CCLI usage export, plus volunteer teams, scheduling with conflict detection, blockout dates,
accept and decline without login, substitute swaps, the background check gate, and the coverage gap
dashboard.

**Exit criteria:** one pilot church plans and staffs four consecutive services entirely in Sanctuary.
A song's lyrics round-trip through export and import with section types and labels intact.

Requirements: R10.1 to R10.9, R10.12, R11.1 to R11.12, R12.1 to R12.7, R12.9, R12.10, R12.12

## 1.0 GA

A church can replace its existing ChMS entirely. Public launch.

Forms with conditional logic, pastoral care with a separate confidential tier, events and
registrations, the calendar with room booking and facility use approvals, communication with
bring-your-own email and SMS, the member and volunteer PWA, twenty canned reports including the
first-time visitor conversion funnel, the REST API and webhooks, custom roles, Google SSO, DSAR
handling, and the community forum.

**Exit criteria:** ten churches migrated off a paid product, 12-week retention above 80%, and the
donation coverage ratio at 1.0.

Requirements: R4.x, R6.x, R14.x, R15.x, R16.x, R17.x, R18.x, R20.1 to R20.5, R1.6, R1.9, R1.15,
R9.9 to R9.11, R10.10, R10.11, R10.13, R11.13, R12.8, R13.7, R13.26, R19.9, R21.7, R21.8, R21.13,
R21.14, R22.4 to R22.6, R22.9

## 1.x Post-GA

Configurable pipeline builder, scheduled reports, Google and Outlook calendar sync, Zapier, CCLI
SongSelect import, background check provider integration, Mailchimp sync, barcode household cards.

## Phase 2: Sanctuary Stage

A separate PRD before build. Outline in [PRD.md section 8.23](PRD.md).

An Electron desktop presenter for macOS, Windows, and Linux, sharing a `@sanctuary/songs` package
with the web platform and a local SQLite cache. Offline first. It renders slides directly from the
song sections and arrangement sequences that Phase 1 already stores, which is the entire reason the
two products are one platform.

Stage does not win by being a better standalone presenter. OpenLP, FreeShow, Quelea, and Church
Presenter are already free and already good. Stage wins by being the only presenter that already
knows this Sunday's plan, this Sunday's songs, the keys they are in, and who is on the team.

Phase 1 owes Phase 2 exactly two things, and both ship in 0.4: the song schema and the sync contract.
Nothing else about Stage may influence Phase 1 scope.
