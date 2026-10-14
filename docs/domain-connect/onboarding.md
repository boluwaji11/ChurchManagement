# Getting the template loaded, company by company

HRT-289. The merge publishes the template. It does not install it anywhere. A DNS company applies a
template it already holds and refuses one it has never seen, so every company has to load ours, and
the published route for that is an email.

domainconnect.org/dns-providers says it in one line: DNS providers "use these templates and/or
contact the Service Providers to onboard them". There is no automatic pull, no queue we are in, and
no schedule anybody publishes.

## Where each company stood, 14 October 2026

Asked by hand. The daily check that did this was taken out once the emails went: it answered the
same question every morning and the answer only changes when a company acts on one of them.

| Company | Answer | What it means |
|---|---|---|
| IONOS | Answers for the standard's example, 404 for ours | Implements it, has not loaded us |
| GoDaddy | The same | The same |
| Domain Chief | The same | Imports daily and skipped ours, see below |
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

## What came back, 14 October 2026

**NameSilo** and **Domain Chief** both answered the same way, within hours: they synchronise with the
public repository automatically and a merged template is usually live **within about 24 hours**.
Neither will load one by hand.

> NameSilo: "We automatically synchronize our system with the official Domain Connect repository.
> Once your templates are reviewed and merged there, they will typically become available on NameSilo
> within approximately 24 hours." Their verify endpoint is `https://www.namesilo.com/domainconnect/v2`,
> and they suggest registering a test domain there to prove it end to end.

> Domain Chief: "Templates are discovered automatically (every 24 hours) if supported. You do not need
> to ask Domain Chief to enable it." Test against `domainchief.app`.

Our template merged on 14 October, so neither window has closed yet. Both answer 200 for the
standard's own example and 404 for ours, which is exactly what a company that has not yet run its
import looks like. Ask again a day later:

```
curl -s -o /dev/null -w "%{http_code}\n" https://www.namesilo.com/domainconnect/v2/domainTemplates/providers/connectapp.church/services/email
curl -s -o /dev/null -w "%{http_code}\n" https://domain.chief.app/api/domainconnect/v2/domainTemplates/providers/connectapp.church/services/email
```

If either is still 404 after a day, the importer skipped it over something it does not support, and
both named an address for that case: `domainconnect@chief.app`, and NameSilo's own support.

## The emails to send

One a company, from `hello@connectapp.church`. Short, names the template, says what it does, offers
whatever they need next.

| Company | Address |
|---|---|
| IONOS | domain_connect_admin@domain.ionos.com |
| GoDaddy | domainconnect@godaddy.com |
| Cloudflare | domain-connect@cloudflare.com |
| NameSilo | domainconnect@namesilo.com (replied: automatic, about 24 hours) |
| Plesk | domainconnect@plesk.com |
| Vercel | domainconnect@vercel.com |
| WordPress.com | registrar@automattic.com |
| Glauca Digital | hello@glauca.digital |
| Domain Chief | domainconnect@chief.app (replied: automatic, every 24 hours) |

The wording to send is in [outreach.md](outreach.md).

**Sent, 14 October 2026.**

## What happens when one of them says yes

Nothing here changes. The screen asks the domain, that company now answers that it holds
`connectapp.church/email`, and the church sees one press instead of three settings. Asking by hand
is one line:

```
curl -s https://api.domainconnect.ionos.com/v2/domainTemplates/providers/connectapp.church/services/email
```
