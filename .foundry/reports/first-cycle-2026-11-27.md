# IA Chat — first SaaS Foundry cycle

**Date:** 27 November 2026  
**Repository:** `mkwitko/ia-chat`, branch `main` at `a8025d2e6313ecbceafbc928250e74638e9c92f5`  
**Mode:** Existing product adoption  
**Scope:** Static review of selected specifications, founder strategy documents, API routes, customer/result views and product entry points. No production database, patient conversations, raw logs, secrets, billing accounts or provider accounts were accessed. No paid API call or external customer contact was made.

## Executive conclusion

IA Chat does not need another ideation cycle, a second CRM, a new analytics vendor or a broad feature expansion. The product already has a substantial foundation: multi-tenant architecture, inbox, assistant, appointment booking, customer records, consent and opt-out controls, waitlist, invitations, referral attribution, onboarding, trial and billing surfaces.

The current constraint is **commercial evidence and end-to-end measurement**:

1. Connect prospect source to invitation, WhatsApp connection, activation, first value and payment.
2. Execute the already documented founder-led referral and live-demo plan with real prospects and permission.
3. Verify the remaining P0 security, metrics and browser acceptance gates before expanding the pilot.
4. Capture real pilot outcomes and costs before changing pricing, expanding verticals or scaling channels.

The existing product CRM represents end customers/patients. It must not become a B2B prospect database. The new Foundry revenue pipeline is intentionally separate and company-level only; it starts empty.

## 1. Current business and product position

### Positioning and ICP

- Owner-defined market: small service businesses, professionals and autonomous operators with appointment-based workflows.
- Initial pilot vertical: chiropractor; referrals to adjacent local businesses are a channel hypothesis, not proof that those segments will buy.
- Core promise: stop losing customers through unanswered messages, forgotten follow-up and disorganized scheduling.
- Existing phrase: recepcionista com IA e assistente de crescimento para pequenos negócios.
- The name `Consultório Aberto` remains a decision to revisit only with owner approval; the current code and brand should not be renamed as part of this cycle.

### Offer and price

- Documented plan prices: Essencial R$ 197, Agenda R$ 297, Pro R$ 497 and Clínica R$ 697.
- Only Essencial and Agenda are currently offered for subscription; Pro and Clínica remain unavailable.
- Assisted setup is included at no fee; the 14-day trial begins after WhatsApp connection.
- The planned real-prospect Agenda price comparison is R$ 247 versus R$ 297.
- The simulated buyer panel recorded 0 purchases from 18 valid responses and trust as the leading objection (11/18). This is synthetic evidence only, not market validation.
- The launch plan's target of 6 WhatsApp-connected trials and 3 paid customers from 10 invited prospects is a pre-written success threshold, not an achieved result.

## 2. Existing capability and data-source inventory

| Journey stage | Existing source / implementation | Current limitation |
|---|---|---|
| Public interest | `apps/api/src/waitlist/waitlist-routes.ts` | Stores personal email and optional name; only aggregate counts may enter Foundry. |
| Referral attribution | `apps/api/src/growth/referral-routes.ts`, waitlist referral code | Code/link and waitlist signup count exist; owner shares manually; no automated outreach, no activation or paid attribution. |
| Invitation | `apps/api/src/invites/invite-routes.ts` and invite store | Invite state exists; needs a stable funnel mapping to redemption and downstream activation. |
| Onboarding | `apps/api/src/onboarding/onboarding-routes.ts`, tenant onboarding progress | Step progress exists; a consistent cross-stage event contract and duration mapping still need verification. |
| WhatsApp connection | channel state and WhatsApp routes | The source exists, but real-number/provider approval and connection lifecycle need operational verification. |
| Customer lifecycle | `apps/api/src/customers/customers-view.ts`, `packages/db/src/customers/facts.ts`, `stage.ts` | This is the customer/patient CRM, not the SaaS B2B prospect pipeline. Never copy patient contact details or message content into Foundry. |
| Pilot results | `apps/api/src/results/results-routes.ts`, results view and database aggregates | Results screen/route exist; the task ledger still requires every displayed number to be reconciled to its reference query. |
| Trial | `apps/api/src/trial/trial-routes.ts` | Trial state and 14-day window exist; map its exact start trigger to the acquisition funnel. |
| Subscription | `apps/api/src/billing/billing-routes.ts`, `webhook.ts` | Asaas integration is optional and can be off without credentials; production payment outcomes must be verified against provider records. |
| Operational telemetry | Sentry, Axiom, Langfuse and operator events documented | Operational observability is not a marketing-to-revenue event taxonomy. |

This was a selected static inventory, not a complete database or production audit. The next sprint should inspect existing first-party tables and queries before adding new events or vendors.

## 3. Evidence and confidence

| Finding | Class | Interpretation |
|---|---|---|
| Small-business positioning and chiropractor as first pilot | E3 repository | Owner decision, not proof of demand. |
| 0/18 simulated purchases; trust 11/18 | E6 synthetic | Useful to shape trust messaging; cannot validate willingness to pay. |
| Plan prices and R$ 247/R$ 297 test | E3 repository | Owner decision and planned test; no real price conversion observed. |
| Referral, live demo and founder Instagram | E3 repository | Planned channels; no repeatable channel performance is established. |
| Waitlist/referral APIs and customer lifecycle | E3 repository | Code existence is not production usage or conversion. |
| P0 permissions and Results verification still open in TASKS.md | E3 repository | Documented acceptance gaps; recheck code/tests when those tasks are implemented. |

No real customer quotes, patient records, production metrics or revenue figures were added to the ledger.

## 4. Priority gaps

### P0 — before expanding the pilot

1. **M-05: Customers and Results permissions.** Complete explicit permission definitions and role tests; receptionist access must follow the documented least-privilege policy.
2. **M-07: Results reconciliation.** Verify every displayed metric against its reference query and a deterministic fixture; show counts and denominators.
3. **SMB-01: browser acceptance.** Complete the 360 px and 1280 px pass across the specified screen states.
4. **External readiness.** Close the relevant Meta, Google, provider, legal and operational gates in E-00b/c/e/g; distinguish account approval from code completion.
5. **Real channel validation.** Confirm the WhatsApp connection with the actual pilot number and the chosen connection method before treating integration readiness as production proof.

### P1 — commercial learning

1. Build a first-party source map from waitlist/referral → invite → onboarding → WhatsApp connected → activation → first value → paid → retained.
2. Record the next ten real prospect conversations through the existing founder-led channels.
3. Define a leading activation event and an outcome event with the pilot owner.
4. Review pilot outcomes, support friction, cost per conversation and founder setup time weekly.
5. Do not add a second CRM, paid ads, predictive lead scoring or additional verticals yet.

## 5. First commercial experiments — proposed, not running

### EXP-REFERRAL-01 — founder-led referral and demo cohort

- **Hypothesis:** permission-based introductions and live demonstrations can produce qualified discovery conversations and WhatsApp-connected trials in the initial segment.
- **Intervention:** work through up to ten real prospects from warm introductions and the documented demo channel; ask for permission or an introduction before contact.
- **Primary metric:** count of qualified prospects who complete a demo and connect WhatsApp.
- **Pre-written target:** 6 connected trials and 3 paid customers from 10 invited prospects, as recorded in founder/launch.md. This is a target, not a forecast.
- **Guardrails:** no mass outreach, no purchased lists, no contact without permission, no fabricated outcomes, no patient data in the prospect pipeline.

### EXP-PRICE-01 — Agenda price comparison

- **Hypothesis:** real buyer behaviour may differ between R$ 247 and R$ 297; simulated panel data is insufficient to choose.
- **Intervention:** use the owner-documented price comparison in the next ten real sales conversations only if the owner reconfirms the test before presenting it.
- **Primary metric:** paid conversions by price shown, always with numerator and denominator.
- **Guardrails:** same offer and terms, record the price shown, no statistical-significance claim from a tiny sample, no misleading discount or false urgency.

Neither experiment is marked running. No outcome is inferred.

## 6. Privacy and governance

- The revenue pipeline is company-level only and currently empty.
- Do not store patient names, phone numbers, emails, symptoms, diagnoses, message bodies, transcripts, attachments or appointment notes in Foundry.
- Do not export waitlist emails or patient/customer records into the B2B prospect pipeline.
- A referral is not permission to contact the referred business; obtain an introduction or explicit permission first.
- No external outreach, publication, paid spend, production change or legal/provider commitment was made in this cycle.

## 7. Recommended next cycle

**Run a measurement and pilot-readiness sprint, not a feature sprint.**

1. Complete the event/source map using existing first-party data; define event names, properties, denominator, timezone, retention and owner.
2. Finish M-05 and M-07 with tests and verify SMB-01 in the browser.
3. Close the external pilot gates and confirm the real-number WhatsApp flow.
4. Execute the permission-based ten-prospect cohort and record company-level outcomes in `.foundry/revenue/pipeline.yaml`.
5. Review the evidence ledger weekly; update pricing, offer, ICP or channel decisions only when real buyer behaviour justifies it.

**Success of this cycle:** the project now has a canonical artifact registry, evidence ledger, explicit decision/experiment records and an empty privacy-safe B2B pipeline. Runtime CLI validation and production funnel reconciliation remain the next verification tasks.
