# SaaS Foundry project context

This directory registers `ia-chat` as an adopted existing project in [SaaS Foundry](https://github.com/mkwitko/Saas-Foundry).

## Canonical adoption artifacts

- [Initial assessment](https://github.com/mkwitko/Saas-Foundry/blob/main/projects/ia-chat/assessment.md)
- [Prioritized adoption roadmap](https://github.com/mkwitko/Saas-Foundry/blob/main/projects/ia-chat/roadmap.md)
- [First operating cycle](./reports/first-cycle-2026-11-27.md)
- [Module registry](https://github.com/mkwitko/Saas-Foundry/blob/main/catalog/modules.yaml)
- [Security and provenance rules](https://github.com/mkwitko/Saas-Foundry/blob/main/docs/security-and-provenance.md)

## Project-local operating state

- `.foundry/state.yaml`: current bottleneck and next owner action.
- `.foundry/artifacts.yaml`: canonical document map and dependency graph.
- `.foundry/artifact-contracts.yaml`: pinned artifact ownership and handoff contracts.
- `.foundry/evidence.yaml`: evidence, decisions and proposed experiments.
- `.foundry/acceptance.yaml`: module acceptance and verification status.
- `.foundry/revenue/pipeline.yaml`: company-level B2B prospect pipeline; intentionally empty until permission-safe prospect records exist.
- `.foundry/reports/`: dated review outputs.

The registry maps existing sources of truth; it must not create duplicate strategy, product, design or marketing documents. A status of `unknown` means the canonical path is known but its freshness or completeness has not been established. A proposed experiment is not running and has no result.

## Run the Foundry against this project

From local checkouts of both repositories:

```bash
cd ../Saas-Foundry
npm install
npm link

cd ../ia-chat
foundry doctor .
foundry scan . --format md
foundry plan . --format md
foundry artifacts validate .
foundry artifacts status .
foundry artifacts plan . --changed business-strategy
foundry improve report .
foundry revenue report .
```

To use the Foundry checkout without linking the executable:

```bash
node ../Saas-Foundry/bin/foundry.js artifacts validate .
node ../Saas-Foundry/bin/foundry.js artifacts status .
node ../Saas-Foundry/bin/foundry.js artifacts plan . --changed business-strategy
node ../Saas-Foundry/bin/foundry.js improve report .
node ../Saas-Foundry/bin/foundry.js revenue report .
```

The artifact, improvement and revenue commands are read-only. They do not modify canonical documents, send messages, contact prospects, publish content, spend money, or access production databases. Run them from a local checkout with the repository dependencies installed.

## Privacy and operating rules

1. Read `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, specs and founder documents before proposing product changes.
2. Keep existing product docs as the source of truth; Foundry adds an adoption and learning layer.
3. Never put patient names, phone numbers, emails, symptoms, diagnoses, message bodies, transcripts, attachments or appointment notes in Foundry.
4. Do not copy waitlist contacts or patient/customer records into the company-level B2B prospect pipeline.
5. A referral is not permission to contact a third party. Require an introduction or explicit permission.
6. Revalidate stale artifacts before making decisions; do not silently overwrite owner-controlled documents.
7. Do not add an analytics vendor, CRM, paid channel or growth feature until an observed gap justifies it.
8. Keep outreach, publishing, production changes, legal commitments and spend under explicit human approval.

The initial source inventory was static and selective. Production behaviour, event reconciliation, browser acceptance and external provider readiness remain separate verification tasks.

## Automated validation

The workflow [`.github/workflows/foundry-validation.yml`](../.github/workflows/foundry-validation.yml) runs on every pull request and main-branch push. It:

1. Parses all project-local YAML and JSON schemas.
2. Validates artifact contracts, paths, dependencies and cycles.
3. Calculates freshness and downstream handoffs.
4. Generates the evidence-led improvement report.
5. Reviews the company-level revenue pipeline.

The workflow checks out a pinned SaaS Foundry commit (`a9e038f`) for reproducibility. Update that pin deliberately when adopting a newer CLI release. The workflow has read-only repository permissions and does not access production systems or contact customers.
