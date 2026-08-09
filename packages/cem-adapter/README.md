# @hia-doc/cem-adapter

Bridges Custom Elements Manifest artifacts into HTMDoc extraction data and HIA-compatible documentation data.

The adapter maps HTML-facing Web Components metadata such as attributes, slots, events, CSS parts, CSS custom properties, CSS custom states and demos. JavaScript members and methods are preserved as component metadata for later JS/JSDoc bridge consumption.

```sh
npm install @hia-doc/cem-adapter
```

```js
import { cemManifestToHtmlExtraction } from "@hia-doc/cem-adapter";

const extraction = cemManifestToHtmlExtraction(manifest, {
  path: "custom-elements.json"
});
```

The adapter consumes an already-loaded manifest object and does not discover
packages or execute component code.
