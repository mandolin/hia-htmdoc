# Release Checklist

## Local RC

- [x] Parser dependencies and licenses are reviewed.
- [x] Extraction schema and compatibility versions are documented.
- [x] Standalone runner API, JSON config and CLI are tested.
- [x] Documentation producer descriptor/result pass cross-repository validation.
- [x] HTML, fragment, template and CEM examples generate stable artifacts.
- [x] Source privacy and absolute-path checks pass.
- [x] Every workspace package passes npm pack dry-run.
- [x] `npm run release:gate` passes.

## Public Release

- [ ] Replace local `0.0.0` package versions with the approved release set.
- [ ] Remove `private: true` only from packages selected for publication.
- [ ] Confirm npm scope ownership and Trusted Publishing.
- [ ] Run the final Node compatibility matrix and provenance-enabled publish gate.
