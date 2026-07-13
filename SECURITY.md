# Security policy

Payment integrations are security-sensitive. Please report vulnerabilities privately.

## Supported versions

Until version 1.0.0, security fixes are provided for the latest published minor release only. After 1.0.0, this table will list supported release lines explicitly.

| Version | Supported |
| --- | --- |
| Latest `0.x` | Yes |
| Older `0.x` | No |

## Reporting a vulnerability

Use GitHub's **Security → Report a vulnerability** private reporting flow after the public repository is created. Do not open a public issue, discussion, or pull request.

Include:

- affected plugin and Vendure versions;
- provider and sandbox/production context;
- impact and realistic attack scenario;
- reproduction steps using redacted or synthetic data;
- suggested mitigation, if known.

Never include live keys, customer data, wallet identifiers, OTPs, PINs, or reusable production transaction details.

Maintainers should acknowledge a report within 5 business days, provide an initial assessment within 10 business days, and coordinate disclosure after a fix is available. These are targets, not a commercial support SLA.

## Scope

Examples of security issues include:

- settling without server-to-server verification;
- accepting mismatched amounts, currencies, orders, or provider references;
- callback replay or duplicate settlement;
- leaked provider credentials or sensitive logs;
- cross-channel or cross-order payment attachment;
- unsafe redirect handling;
- signature verification bypasses.

Provider account disputes, merchant onboarding, transaction reversals, and provider outages should be handled through the provider's official merchant support rather than this security process.
