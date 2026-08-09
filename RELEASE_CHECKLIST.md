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
- [ ] Confirm npm scope ownership and Trusted Publishing.
- [ ] Resolve the first-publication bootstrap required before Trusted Publisher configuration can exist for new package names.
- [ ] Change both train and package status to `publish-approved` under separate authorization.
- [ ] Run the final Node compatibility matrix and provenance-enabled publish gate.
