# Third Party Notices

This workspace uses the following reviewed third-party packages.

| Package | Version | License | Purpose |
| --- | --- | --- | --- |
| `parse5` | `7.3.0` | MIT | P1 HTML parser baseline for WHATWG-compatible document and fragment parsing with source locations. |
| `entities` | `6.0.1` | BSD-2-Clause | Transitive dependency of `parse5`. |
| `ajv` | `8.17.1` | MIT | Bundled JSON Schema 2020-12 validation for exact config/extraction reading and explicit lossless migration. No remote schemas are loaded. |
| `fast-deep-equal` | `3.1.3` | MIT | Ajv equality support. |
| `fast-uri` | `3.1.9` | BSD-3-Clause | Ajv schema identifier resolution. |
| `json-schema-traverse` | `1.0.0` | MIT | Ajv schema traversal. |
| `require-from-string` | `2.0.2` | MIT | Ajv transitive implementation dependency. |

Future candidates such as `rehype`, `htmlparser2`, Custom Elements Manifest analyzers, HTML validation tools and source-map utilities must be reviewed before they are added.
