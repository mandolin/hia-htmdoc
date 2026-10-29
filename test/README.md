# HTMDoc Tests

Tests cover parser/extractor output, adapter mapping and fixture governance.

`runner-boundary.test.mjs` exercises declared request types before writes,
safe config/CLI failures, confirmed producer/result identities and exact
legacy/current/unknown result conformance. Run it with `node --test
test/runner-boundary.test.mjs`, or use `npm run release:gate` for the full
generation, handoff, source-range, license, real-pack and isolated-consumer gate.
