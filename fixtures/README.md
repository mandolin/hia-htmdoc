# HTMDoc Fixtures

Fixtures cover realistic HTML, Custom Elements Manifest metadata and unsafe path checks.

- `basic.html` keeps the small comment attachment and annotation smoke fixture.
- `web-components/custom-elements.json` is a CEM-style component API fixture.
- `web-components/template.html` is the matching HTML/template documentation fixture.
- `web-components/dist/` contains generated HTMDoc extraction and HIA core document fixtures.

Regenerate fixture artifacts with:

```sh
npm run build:fixtures
```
