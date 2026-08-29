# QuoteCraft Shipaton 2026 readiness

QuoteCraft now contains the official RevenueCat Web Billing SDK and RevenueCat Capacitor SDK, plus an Android app shell with package ID `com.alinasserdev.quotecraft`. RevenueCat controls checkout and entitlement restoration when its public SDK keys are configured. The existing Paddle checkout remains available as a migration fallback until RevenueCat dashboard setup is complete.

## What is already implemented

- RevenueCat Web Billing and Android SDKs use the signed-in Supabase UUID as the RevenueCat App User ID.
- Solo and Studio entitlements are reconciled with the server-protected Supabase profile.
- Monthly and annual RevenueCat packages map to QuoteCraft's pricing cards.
- Native purchases can be restored from the account screen.
- A signed RevenueCat webhook updates protected plan metadata in Supabase.
- Capacitor Android project, CI build workflow, and Vercel production build are included.

## RevenueCat dashboard setup

1. Create a RevenueCat project and add Web and Android apps.
2. Use Android package name `com.alinasserdev.quotecraft`.
3. Connect Paddle Sandbox to the Web app, then import the four QuoteCraft recurring prices.
4. Create entitlements named `quotecraft_solo` and `quotecraft_studio`.
5. Attach Solo products to the Solo entitlement and Studio products to the Studio entitlement.
6. Create the `default` offering with custom package identifiers:
   - `solo_monthly`
   - `solo_annual`
   - `studio_monthly`
   - `studio_annual`
7. Add the Web public SDK key to Vercel as `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY`.
8. Add the Android public SDK key as `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
9. Add a RevenueCat webhook pointing to `https://quotecraft-rose.vercel.app/api/revenuecat-webhook` and configure the matching authorization and signing secrets from `.env.example`.
10. Redeploy and complete one Sandbox purchase while signed into QuoteCraft.

Never put a RevenueCat secret API key, Supabase service-role key, Paddle API key, or webhook signing secret in frontend code. RevenueCat public SDK keys are designed to be included in client apps.

## Eligibility gate

The main Shipaton competition does not accept a web-only launch. QuoteCraft must make its first public release as an iOS, iPadOS, macOS, or Android app during August 1–September 30, 2026; be live on an eligible app store; and be available in the United States. At least one purchase must be powered by RevenueCat. The current Android foundation satisfies the code-side SDK requirement, but the app is not eligible until the RevenueCat dashboard and public store-release steps are completed.

Official references:

- https://www.revenuecat.com/blog/engineering/how-to-submit-your-app-for-shipaton
- https://www.shipaton.com/faq
- https://revenuecat-shipaton-2026.devpost.com/rules
- https://www.revenuecat.com/docs/web/web-billing/web-sdk
- https://www.revenuecat.com/docs/getting-started/installation/capacitor

