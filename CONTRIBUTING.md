# Contributing

Thank you for helping improve Nepal's Vendure payment ecosystem.

## Before opening a change

- Search existing issues and discussions first.
- Use an issue for new providers, public API changes, database changes, or payment-state changes before investing in a large implementation.
- Never post merchant credentials, customer information, production transaction identifiers, private provider documents, or unredacted logs.
- Provider implementations must be based on official, legally shareable documentation.

Small bug fixes, tests, and documentation improvements may be submitted directly.

## Development setup

Requirements:

- Node.js 22 or newer
- npm

```bash
git clone <your-fork-url>
cd vendure-plugin-nepal-payments
npm ci
npm run check
```

Useful commands:

```bash
npm run typecheck
npm test
npm run test:watch
npm run build
npm pack --dry-run
```

## Pull requests

Every pull request should:

- explain the user-visible behavior and payment risk being changed;
- include tests for successful and unsuccessful provider responses;
- cover duplicate callbacks and amount/reference mismatches where applicable;
- update documentation and `CHANGELOG.md` for user-visible changes;
- avoid unrelated formatting or dependency changes;
- pass `npm run check`.

Payment code should fail closed: unknown, malformed, ambiguous, or unverifiable provider responses must never settle a Vendure payment.

## Adding a provider

Read [`docs/ADDING_A_PROVIDER.md`](./docs/ADDING_A_PROVIDER.md). A new provider is not complete until it has:

- official documentation references;
- sandbox configuration;
- initiation, verification, and status mapping;
- exact amount and reference validation;
- callback idempotency tests;
- refund behavior documented, even if refunds are manual;
- installation and storefront documentation.

## Licensing contributions

By submitting a contribution, you agree that it may be distributed under this project's MIT License. No contributor license agreement is currently required.

## Reporting security problems

Do not open public issues for vulnerabilities. Follow [`SECURITY.md`](./SECURITY.md).
