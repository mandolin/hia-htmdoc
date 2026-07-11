# @hia-doc/htmdoc-runner

Standalone API and CLI for HTML documentation projects.

JSON configs use `schemaVersion: "0.1.0-draft"`. The package exports
`HTMDOC_CONFIG_JSON_SCHEMA` for validation and editor integration.

```js
import path from "node:path";
import { runHtmDoc } from "@hia-doc/htmdoc-runner";

const result = await runHtmDoc({
  workspaceRoot: process.cwd(),
  outputDirectory: path.resolve("dist/htmdoc"),
  inputs: [{ kind: "html", path: "src/index.html" }]
});
```

The runner accepts `html`, `html-fragment`, `html-template` and
`custom-elements-manifest` inputs. It writes HTMDoc extraction artifacts, HIA
documents, direct-source documentation maps and a documentation producer result.

```sh
htmdoc --config htmdoc.config.json
```

Source content is not embedded unless `sourcesContentPolicy: "embed"` is set
explicitly in the config `options` object.
