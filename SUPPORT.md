# Support

This is a community-maintained open-source project and comes without a commercial support SLA.

- Use **GitHub Discussions** for setup questions, design discussion, and provider onboarding experiences.
- Use **GitHub Issues** for reproducible plugin bugs and documentation problems.
- Use **private vulnerability reporting** for security issues.
- Contact the payment provider's merchant support for account approval, fees, settlements, transaction disputes, API access, production keys, and provider outages.

When asking for help, include plugin, Vendure, Node.js, database, provider environment, order state, and redacted error details. Never share secrets, customer data, OTPs, PINs, raw QR payloads, WebSocket capability URLs, or complete production transaction identifiers.

For Fonepay setup and current sandbox limitations, follow [`docs/FONEPAY.md`](./docs/FONEPAY.md). Invalid provider TLS certificates, endpoint access, and merchant certification must be resolved by Fonepay or the acquiring bank; maintainers will not recommend disabling certificate validation.
