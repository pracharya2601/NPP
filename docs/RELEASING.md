# Maintainer release process

## One-time repository setup

Before the first public release:

1. Create the public GitHub repository.
2. Add `repository`, `homepage`, and `bugs` URLs to `package.json`.
3. Replace the repository link placeholders in `CHANGELOG.md`.
4. Confirm that the `@prakashacharya` npm scope belongs to the publishing user or organization and that maintainers have publish access. Otherwise choose a scope you control before the first release.
5. Enable GitHub private vulnerability reporting.
6. Create a short-lived npm granular access token for the initial publication:
   - grant read and write access to the `@prakashacharya` scope;
   - enable bypass 2FA because GitHub Actions cannot answer an interactive OTP prompt;
   - use the shortest practical expiration;
   - add it to the GitHub `npm` environment as an environment secret named `NPM_TOKEN`.
7. Enable branch protection requiring the CI workflow.
8. Add an npm README/profile link to the public repository.

`npm publish` intentionally runs `npm run check:release-metadata` and refuses to publish until these real public URLs are configured.

The npm token must only be stored as a GitHub Actions secret. Never commit it to this repository, place it directly in the workflow, or include it in an issue or log. The release workflow exposes it only to the credential check and `npm publish` steps as `NODE_AUTH_TOKEN`.

### Configure the first GitHub Actions publication

1. Sign in to npm with an account that can publish packages under `@prakashacharya`.
2. In npm account settings, create a granular access token with read and write access to the `@prakashacharya` scope and bypass 2FA enabled.
3. In GitHub, open **Settings > Environments > npm**. Create the environment if it does not exist.
4. Under **Environment secrets**, add a secret named `NPM_TOKEN` and paste the npm token as its value.
5. Optionally configure required reviewers on the `npm` environment so a maintainer must approve every publication.
6. Follow the release checklist below and publish the GitHub Release. The workflow publishes the package; maintainers do not run `npm publish` locally.

After the first package version exists on npm, replace token authentication with npm Trusted Publishing. Configure the package's trusted publisher for GitHub owner `pracharya2601`, repository `NPP`, workflow `release.yml`, and environment `npm`; then remove `NPM_TOKEN` from GitHub and remove the credential-check and `NODE_AUTH_TOKEN` configuration from the workflow. Trusted Publishing uses GitHub OIDC and does not require a stored publishing token.

Vendure recommends scoped plugin package names, a current changelog included in the npm package, full installation and storefront documentation, compatibility metadata, and tests before submission to Vendure Hub.

## Release checklist

1. Ensure CI passes on the default branch.
2. Update `CHANGELOG.md`, moving relevant Unreleased entries into a dated version.
3. Update the version without creating an automatic Git tag:

   ```bash
   npm version <patch|minor|major> --no-git-tag-version
   ```

4. Run:

   ```bash
   npm ci
   npm run check
   npm pack --dry-run
   npm audit --omit=dev
   ```

5. Inspect the tarball file list. It must include `dist`, README, docs, changelog, license, and notices, and must exclude tests, credentials, local environment files, and private documentation.
6. Commit the version and changelog.
7. Create a signed tag `v<version>`.
8. Push the commit and tag.
9. Create a GitHub Release from the tag. The release workflow verifies that tag and package versions match, then publishes to npm with provenance using the protected `NPM_TOKEN` secret.
10. Verify installation in a clean Vendure project.
11. For a stable, documented release, submit the npm and GitHub URLs to Vendure Hub.

## Versioning

The package uses Semantic Versioning.

- Patch: backwards-compatible fixes and documentation.
- Minor: backwards-compatible provider/features after 1.0.
- Major: public API, configuration, GraphQL, database, or behavioral breaking changes.

Before 1.0, a minor version may be breaking. Such changes must be clearly labeled in the changelog and migration notes.

Provider-side API changes can require urgent plugin releases even when this project's TypeScript API is unchanged.
