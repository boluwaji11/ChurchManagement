# Getting the template loaded, company by company

HRT-289. The merge publishes the template. It does not install it anywhere. A DNS company applies a
template it already holds and refuses one it has never seen, so every company has to load ours, and
the published route for that is an email.

domainconnect.org/dns-providers says it in one line: DNS providers "use these templates and/or
contact the Service Providers to onboard them". There is no automatic pull, no queue we are in, and
no schedule anybody publishes.

## What the daily check says

`/api/domain-connect/check` asks all seven every morning and emails the answer. On 14 October 2026:

| Company | Answer | What it means |
|---|---|---|
| IONOS | Answers for the standard's example, 404 for ours | Implements it, has not loaded us |
| GoDaddy | The same | The same |
| Domain Chief | The same | The same |
| Glauca Digital | The same | The same |
| Cloudflare | 404 for everything, the example included | Does not serve the template question |
| Vercel | The same | The same |
| WordPress.com | Redirects everything to a page that loads | Does not serve it either |

## The one that matters, and the bad news

**GoDaddy told another service provider in October 2026 that it is not accepting new third-party
templates**, with no timeline, and pointed them at Entri Connect, which is the paid service this
whole screen exists to avoid.
[Domain-Connect/Templates#2151](https://github.com/Domain-Connect/Templates/issues/2151), opened 5
October 2026, still open. A maintainer answered "yes, working on it" on 13 October about publishing
each company's onboarding status. Nothing official says the pause exists, and GoDaddy's own
templates kept merging through it.

One secondhand report says IONOS now redirects service providers to Entri as well. Unverified.

GoDaddy holds a large share of US church domains, so if that pause is real the one press reaches far
fewer churches than the nine-company list suggests. It costs us nothing either way: the screen asks
each church's domain before it offers anything, so a church at a company that has not loaded us sees
the three settings and the right page to type them into.

## The emails to send

One a company, from `hello@connectapp.church`. Short, names the template, says what it does, offers
whatever they need next.

| Company | Address |
|---|---|
| IONOS | domain_connect_admin@domain.ionos.com |
| GoDaddy | domainconnect@godaddy.com |
| Cloudflare | domain-connect@cloudflare.com |
| NameSilo | domainconnect@namesilo.com |
| Plesk | domainconnect@plesk.com |
| Vercel | domainconnect@vercel.com |
| WordPress.com | registrar@automattic.com |
| Glauca Digital | hello@glauca.digital |
| Domain Chief | https://aka.chief.app/domainconnect |

The wording to send is in [outreach.md](outreach.md).

## What happens when one of them says yes

Nothing here changes. The screen asks the domain, that company now answers that it holds
`connectapp.church/email`, and the church sees one press instead of three settings. The daily email
is how we find out.
