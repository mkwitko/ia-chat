# SaaS Foundry project context

This directory registers this repository as an adopted project in [SaaS Foundry](https://github.com/mkwitko/Saas-Foundry).

## Canonical adoption artifacts

- [Project manifest and full initial assessment](https://github.com/mkwitko/Saas-Foundry/tree/main/projects/ia-chat)
- [Assessment](https://github.com/mkwitko/Saas-Foundry/blob/main/projects/ia-chat/assessment.md)
- [Prioritized roadmap](https://github.com/mkwitko/Saas-Foundry/blob/main/projects/ia-chat/roadmap.md)
- [Module registry](https://github.com/mkwitko/Saas-Foundry/blob/main/catalog/modules.yaml)
- [Security and provenance rules](https://github.com/mkwitko/Saas-Foundry/blob/main/docs/security-and-provenance.md)

## Run the Foundry against this project

From a local checkout of both repositories:

```bash
cd ../Saas-Foundry
npm install
npm link

cd ../ia-chat
foundry doctor .
foundry scan . --format md
foundry plan . --format md
```

To use the Foundry checkout without linking the executable:

```bash
node ../Saas-Foundry/bin/foundry.js doctor .
node ../Saas-Foundry/bin/foundry.js scan . --format json --out /tmp/ia-chat-scan.json
node ../Saas-Foundry/bin/foundry.js plan . --scan /tmp/ia-chat-scan.json
```

The scanner reads repository metadata and selected documentation only. It does not read arbitrary source bodies, `.env*`, secrets, production data, patient/customer message content, attachments or raw logs. The planner is advisory and does not change this repository.

## Rules for future work

1. Read the existing `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, specs and founder documents before proposing changes.
2. Keep those files as the project source of truth. SaaS Foundry adds an adoption and learning layer; it does not replace the product docs.
3. Keep patient, clinical, production and secret data outside Foundry scans and analytics.
4. Re-scan before making a new recommendation. The assessment is a dated snapshot, not a permanent truth.
5. Do not add a tool, analytics vendor, CRM or growth feature until an observed gap justifies it.
6. Keep outreach, publishing, production changes and spend under explicit human approval.

The Foundry CLI v0.2 now provides local read-only scanning, deterministic planning and manifest diagnostics. This directory is the project manifest and governance pointer; the CLI itself remains in the separate SaaS Foundry repository.
