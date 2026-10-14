# The email, ready to send

HRT-289. One a company, from `hello@connectapp.church`. The addresses are in
[onboarding.md](onboarding.md).

Subject: **Domain Connect template for ConnectApp (connectapp.church / email)**

> Hello,
>
> We run ConnectApp, a free church management platform. Churches on it send email from their own
> domain, which means three DNS records, and the churches we serve are run by volunteers who have
> never opened a DNS panel.
>
> Our Domain Connect template was merged into the public repository on 14 October 2026:
> https://github.com/Domain-Connect/Templates/blob/master/connectapp.church.email.json
>
> providerId `connectapp.church`, serviceId `email`. Three records: a DKIM TXT at
> `resend._domainkey` and two CNAMEs at `rsend` and `send`. It uses the synchronous flow, signed,
> with the public key published at `_dck1.connectapp.church`.
>
> Could you load it, so churches whose domains are with you can put those records in place with one
> press? Happy to send anything else you need.
>
> Thank you,
