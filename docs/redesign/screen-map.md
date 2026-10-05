repo: boluwaji11/ChurchManagement
branch: main

## Last sync
date: 2026-10-04T02:10:00Z
### Updated in this project
- Notifications, member checkout/kids check-in/decline flow, network compare; new States and Messages page
- Persona pages now load Warm Office directly (one source of truth, persona passed as a prop)
- People: status moved into the filter panel; Export to CSV added
- Serving: Schedule / Teams views; Member Web theme switch; Journeys Step through restored

## Sync history
- 2026-10-04T00:55:00Z: Dark mode everywhere; persona pages synced; Journeys rebuilt as an editable board
- 2026-10-04T00:40:00Z: Services list, Edit person, Labels, print previews, password reset; per-page actions; filter drawer
- 2026-10-04T00:23:41Z: Settings sections built out; service picker; closable setup checklist
- 2026-10-04T00:16:52Z: Review pass, no new routes; removed ConnectApp B - Studio from the screen map
- 2026-10-03T20:17:26Z: Forms builder, Settings → Website embed, public group finder journey, collapsible sidebar

## Screen map
| Screen | Repo files |
|---|---|
| ConnectApp A - Warm Office.dc.html (admin: dashboard, people, person, follow-ups, check-in, incidents, giving, calendar, service plan, live, songs, serving, groups, reports, forms, settings, duplicates, celebrations, import, trust, sign in) | docs/design-system.md, apps/web/app/people/page.tsx, apps/web/app/people/[id]/page.tsx, apps/web/app/followups/board/page.tsx, apps/web/app/checkin/page.tsx, apps/web/app/incidents/page.tsx, apps/web/app/services/[id]/plan/page.tsx, apps/web/app/services/[id]/live/page.tsx, apps/web/app/serving/[id]/schedule/page.tsx, apps/web/app/groups/[id]/page.tsx, apps/web/app/forms/page.tsx, apps/web/app/forms/[id]/page.tsx, apps/web/app/settings/team/page.tsx, apps/web/app/settings/church/page.tsx, apps/web/app/settings/fields/page.tsx, apps/web/app/settings/followups/page.tsx, apps/web/app/settings/privacy/page.tsx, apps/web/app/settings/rooms/page.tsx, apps/web/app/settings/security/page.tsx, apps/web/app/settings/stations/page.tsx, apps/web/app/settings/tags/page.tsx, apps/web/app/services/page.tsx, apps/web/app/services/[id]/plan/print/page.tsx, apps/web/app/people/[id]/edit/page.tsx, apps/web/app/people/print/page.tsx, apps/web/app/checkin/labels/page.tsx, apps/web/app/checkin/rooms/print/page.tsx, apps/web/app/reset/page.tsx, apps/web/app/duplicates/page.tsx, apps/web/app/people/celebrations/page.tsx, apps/web/app/import/page.tsx, apps/web/app/setup/page.tsx, apps/web/app/trust/page.tsx, apps/web/app/sign-in/page.tsx |
| ConnectApp A - Pastor.dc.html | apps/web/app/followups/page.tsx, docs/data-model.md |
| ConnectApp A - Group Leader.dc.html | apps/web/app/groups/[id]/attendance/page.tsx |
| ConnectApp A - Check-in Station.dc.html | apps/web/app/design/station/page.tsx, docs/design-system.md |
| ConnectApp A - Member Portal.dc.html | apps/web/app/home/page.tsx, apps/web/app/serving/respond/[token]/page.tsx |
| ConnectApp A - Member Web.dc.html | apps/web/app/home/page.tsx |
| ConnectApp A - Network Admin.dc.html | apps/web/app/choose-church/page.tsx |
| ConnectApp Journeys.dc.html | apps/web/app/sign-up/page.tsx, apps/web/app/create-church/page.tsx, apps/web/app/join/[code]/page.tsx, apps/web/app/g/[slug]/page.tsx, apps/web/app/g/[slug]/[id]/page.tsx, apps/web/app/settings/stations/page.tsx |
| data.js | docs/data-model.md |
