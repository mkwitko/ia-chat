# Shared Knowledge and Artifact Contracts

## Purpose

SaaS Foundry coordinates specialist capabilities without allowing each skill to maintain a competing version of the business. The project-local artifact registry is the index of canonical sources of truth; it is not a second documentation system and it does not require every suggested file to exist.

The first implementation is deliberately lightweight: a versioned YAML registry, a versioned contract catalogue, and explicit handoff rules. It works with Claude Code, Codex, OpenCode and other agents because the contract is file-based and agent-neutral.

## Files

| File | Role |
|---|---|
| `.foundry/artifacts.yaml` | Project-local map from logical artifacts to their canonical repository paths |
| `.foundry/artifact-contracts.yaml` | Pinned copy of Foundry's artifact ownership and handoff contracts |
| `.foundry/artifacts.schema.json` | Validation contract for the project-local registry |
| `catalog/artifact-contracts.yaml` | Foundry-maintained definitions, default owners, producers, consumers and invalidation triggers |
| `schemas/artifact-registry.schema.json` | Source schema copied into each project |

The bootstrap creates only the three project-local registry/contract files when absent. It does not create the business, design, marketing or product documents listed in the catalogue.

## Adoption and canonical-path mapping

On the first writable run:

1. Read the project-local registry and contract catalogue.
2. Inspect existing documentation, product specifications, design files, analytics definitions, decision logs and roadmaps.
3. Map each logical artifact to the best existing source of truth. Prefer an existing `PRODUCT.md`, `DESIGN.md`, founder document or analytics specification over creating a duplicate under `.foundry/`.
4. Set `path` to a repository-relative path and `status` to `current`, `proposed`, `stale`, `superseded`, `missing`, `unknown` or `not_applicable`. Leave the path null until a real canonical file is identified.
5. Record owner, producers, consumers, dependencies, evidence IDs, source references, review interval and sensitivity.
6. Never classify a planned document or a README mention as an implemented capability or validated business fact.

Do not create every suggested artifact. Create a new document only when there is a demonstrated gap and no existing canonical source. Keep the registry small and update it when the canonical path changes.

## Cross-capability handoff

A specialist capability must:

1. Read its own inputs from the registry and the referenced canonical artifacts, not from stale copied summaries.
2. Check status, `updated_at`, review interval and upstream dependencies before relying on an artifact.
3. Preserve source evidence and distinguish measured, reported, external, estimated, synthetic and unknown claims.
4. Produce proposed changes with a concise rationale, affected artifact IDs, evidence IDs, expected outcome and verification method.
5. Identify downstream consumers and invalidation triggers when changing an artifact.
6. Update the registry only after the canonical file has actually changed and the change has been verified.
7. Never silently rewrite another capability's owned strategic decisions.

Examples:

- Founder changes the ICP → flag positioning, website messaging, channel plan, sales playbook and product brief for review.
- Impeccable changes a key onboarding flow → notify product, engineering, activation and analytics consumers; do not independently redefine the ICP or offer.
- Marketing changes a landing-page message → verify alignment with the current offer and design system; update the website artifact and its experiment reference.
- Customer Intelligence finds a repeated onboarding failure → create an evidence-linked product/design proposal; do not turn a handful of support cases into a market-wide claim.

## Change policies

| Policy | Meaning |
|---|---|
| `safe_additive` | The owner capability may append or refine non-conflicting information. It may not silently change accepted strategy, price, scope, claims or customer commitments. |
| `owner_approval` | Draft the change and request approval from the artifact owner before changing the canonical source. |
| `propose_only` | Produce a proposal or evidence summary; the owner decides whether to update the canonical artifact. |

When two capabilities disagree, retain both claims with their evidence and create a decision proposal. Do not resolve strategic conflicts by model confidence or by whichever skill ran last.

## Freshness and invalidation

An artifact is stale when its review interval expires, its source changes materially, a listed invalidation trigger occurs, or a dependency becomes stale. Recompute freshness from `updated_at + review_after_days`; do not trust a manually entered current label after expiry.

A dependency change does not automatically mean every downstream artifact must be rewritten. Mark affected consumers for review, explain why, and rerun only the relevant capability. Preserve superseded versions and link the new artifact to the decision or evidence that caused the change.

## Privacy and project isolation

- The registry contains paths, metadata and evidence references, not raw customer records.
- Do not store credentials, patient data, message bodies, private contact data or production exports in artifacts or registry metadata.
- Use aggregate and sanitized customer intelligence. For health-related products, avoid patient-level targeting and require specialist review for sensitive-data handling and claims.
- Never copy project-specific strategy, prospect lists, customer feedback or private metrics into another project's workspace.
- Only generic, non-sensitive operating patterns may be reused across projects, and only after sanitization.

## Acceptance criteria

The shared knowledge layer is ready for use when:

- Every registry entry references a known contract.
- Every mapped path exists and is the intended canonical source.
- No duplicate source-of-truth documents were created during adoption.
- Every material artifact has an owner, sensitivity and change policy.
- Cross-capability proposals identify affected consumers and evidence.
- Stale dependencies are visible and no capability silently overwrites another owner's decisions.
- Project-local files are preserved on re-bootstrap.
