# Release Checklist

## Local RC

- [x] Parser dependencies and licenses are reviewed.
- [x] Extraction schema and compatibility versions are documented.
- [x] Standalone runner API, JSON config and CLI are tested.
- [x] Documentation producer descriptor/result pass cross-repository validation.
- [x] HTML, fragment, template and CEM examples generate stable artifacts.
- [x] Source privacy and absolute-path checks pass.
- [x] Every workspace package passes npm pack dry-run.
- [x] All eight `0.1.0` tarballs install and run in a fresh offline consumer.
- [x] `npm run release:gate` passes.

## Public Release

- [x] Align the eight candidate versions and exact internal dependency pins at `0.1.0`.
- [x] Remove `private: true` from the eight inventoried public candidates only.
- [x] Add package-level repository, support, engine, file allow-list and public access metadata.
- [x] Add a manual provenance workflow with immutable action revisions and a publish-ready refusal guard.
- [x] Confirm npm `@hia-doc` scope access, account 2FA and GitHub repository administration.
- [x] Resolve first publication as an exact-commit GitHub-hosted workflow with one dedicated temporary granular token.
- [x] Change both train and package status to `publish-approved` under separate W-P110 authorization.
- [x] Add fail-closed partial-batch resume, anonymous registry preflight and post-publish integrity/provenance/consumer checks.
- [x] Run the final Node 20/22/24 compatibility matrix and provenance-enabled publish gate.
- [x] Publish all eight exact `0.1.0` packages from GitHub Actions and confirm anonymous registry visibility.
- [x] Verify eight SHA-512 integrities, eight SLSA provenance statements and an anonymous empty-cache consumer across all packages.
- [x] Configure every package for `mandolin/hia-htmdoc` / `npm-trusted-publish.yml` with `npm publish` as the sole allowed action.
- [x] Delete the GitHub bootstrap secret and revoke the npm bootstrap token after Trusted Publisher verification.
