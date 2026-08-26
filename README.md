# QuoteCraft

QuoteCraft is a polished quote builder for freelancers and small service businesses.

**Live:** https://quotecraft-rose.vercel.app

**GitHub Pages fallback:** https://alinasserdev.github.io/quotecraft/

## Product

- Live client-facing quote preview
- Itemized services, discounts, tax, deposits, and six currencies
- Copy-to-clipboard and print/PDF support
- Local saving for signed-out visitors
- Supabase email/password authentication and private cloud quote storage
- Row Level Security so each customer can access only their own records
- Server-enforced Free, Solo, and Studio entitlements
- Paddle subscription checkout integration and verified webhook provisioning
- Studio-only reusable brand profiles
- Responsive desktop and mobile layouts

## Pricing locked for launch

| Plan | Monthly | Yearly | Included |
| --- | ---: | ---: | --- |
| Starter | $0 | $0 | 3 cloud quotes, live preview, PDF/print/copy, QuoteCraft signature |
| Solo | $9 | $90 | Unlimited cloud quotes, custom accent, payment links, no QuoteCraft signature |
| Studio | $19 | $190 | Everything in Solo, 5 reusable brand profiles, priority email support |

Annual pricing gives customers two months free. Paid features are not unlocked by client-side state: only a verified Paddle subscription webhook can update the protected plan fields in Supabase.

## Architecture

- Static HTML/CSS/JavaScript frontend hosted by Vercel
- Supabase Auth + Postgres for users, quotes, and brand profiles
- Supabase RLS policies for tenant isolation and plan limits
- Paddle Billing as merchant of record for subscriptions
- Vercel Functions for public runtime configuration and signed Paddle webhooks

The editor continues to work without cloud configuration and keeps quotes in `localStorage`. Cloud and paid features activate only after the services below are connected.

## Activate authentication and cloud saving

1. Create a free Supabase project.
2. Open its SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
3. In Supabase Auth URL Configuration, set the Site URL to `https://quotecraft-rose.vercel.app` and add the same URL to Redirect URLs.
4. Copy the project URL, public anon key, and service-role key into Vercel environment variables using [`.env.example`](.env.example).
5. Redeploy the Vercel project.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code. It is used only by the webhook function.

## Activate Paddle subscriptions

1. Apply to Paddle as an individual/sole trader and complete domain and identity review.
2. Create recurring Solo and Studio products with monthly and yearly prices matching the table above.
3. Create a Paddle client-side token and add the four price IDs to Vercel using [`.env.example`](.env.example).
4. Add the production webhook destination `https://quotecraft-rose.vercel.app/api/paddle-webhook`.
5. Subscribe it to `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.resumed`, `subscription.paused`, and `subscription.canceled`.
6. Store that destination's signing secret in Vercel as `PADDLE_WEBHOOK_SECRET`.
7. Test in Paddle sandbox before changing `PADDLE_ENVIRONMENT` to `production`.

The webhook validates the raw request with HMAC-SHA256 and updates entitlements with the Supabase service role only after verification.

## Local development

Run any static server from the repository root. Vercel CLI is recommended when testing the `/api` functions and environment variables.

```bash
vercel dev
```

## UAE payment research

See [`PAYMENTS-UAE.md`](PAYMENTS-UAE.md) for the researched provider decision, constraints, and source links.
