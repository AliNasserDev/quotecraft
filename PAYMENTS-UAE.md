# UAE payment route for QuoteCraft

Research checked on 26 August 2026. This is product research, not legal or tax advice.

## Recommendation: Paddle

Paddle is the strongest first-revenue option for QuoteCraft because:

- Paddle says business verification is not required for individuals or sole traders, although identity and domain review still apply.
- Paddle works with software suppliers worldwide except its published unsupported-country list; the UAE is not on that list.
- Paddle acts as merchant of record, reselling the software and handling customer payment collection and applicable sales tax/VAT.
- Its standard checkout fee is 5% + $0.50 per transaction. This is more expensive than a direct processor at scale, but avoids upfront infrastructure and tax-compliance work while revenue is small.
- It supports recurring SaaS prices, hosted checkout, custom checkout data, webhooks, and customer billing workflows.

Official sources:

- [Paddle account verification](https://www.paddle.com/help/start/account-verification/what-is-account-verification)
- [Paddle business identification for individuals and sole traders](https://www.paddle.com/help/start/account-verification/what-is-business-verification)
- [Paddle supported supplier countries](https://www.paddle.com/help/legal/sanctions/which-countries-are-supported-by-paddle)
- [Paddle merchant-of-record model](https://www.paddle.com/legal/gdpr)
- [Paddle fees](https://www.paddle.com/legal/terms)
- [Paddle checkout custom data](https://developer.paddle.com/api-reference/about/custom-data/)
- [Paddle webhook signature verification](https://developer.paddle.com/webhooks/about/signature-verification/)

## Strong alternative: Lemon Squeezy

Lemon Squeezy is also a merchant-of-record platform. Its official documentation lists the UAE for bank payouts, supports SaaS tax categories, and documents non-US individuals using a W-8 tax form. It is worth applying to if Paddle rejects the product or onboarding profile.

Official sources:

- [Lemon Squeezy supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- [Lemon Squeezy payouts](https://docs.lemonsqueezy.com/help/getting-started/getting-paid)
- [Lemon Squeezy tax forms](https://docs.lemonsqueezy.com/help/tax-forms)
- [Lemon Squeezy SaaS tax categories](https://docs.lemonsqueezy.com/help/products/tax-categories)

## Why not Stripe or Ziina Business yet

Stripe's UAE requirements explicitly state that sole establishments and freelancers need a valid UAE trade licence or freelancer permit. Ziina's current Business registration instructions also require a trade licence and a three-month business bank statement.

- [Stripe UAE verification requirements](https://support.stripe.com/questions/uae-business-verification-requirements?locale=en-GB)
- [Ziina Business registration requirements](https://ziina.com/help-center/6847336-how-do-i-register-for-a-business-account)

Ziina Personal can receive person-to-person payments, but it should not be used to disguise commercial SaaS revenue as personal transfers. QuoteCraft should use a provider-approved commercial onboarding path.

## Important boundary

A processor's individual or sole-trader onboarding route does not override UAE licensing, tax, residency, or age requirements. Paddle or Lemon Squeezy can reduce payment and indirect-tax infrastructure, but they may request more information and they cannot legalize an activity that otherwise requires a permit. Confirm the exact activity with the relevant UAE licensing authority or a qualified adviser once revenue begins.
