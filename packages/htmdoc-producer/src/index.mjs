import {
  HTMDOC_INPUT_KINDS,
  HTMDOC_OUTPUT_KINDS,
  HTMDOC_RUNNER_VERSION,
  runHtmDoc
} from "@hia-doc/htmdoc-runner";

export const htmdocProducerDescriptor = Object.freeze({
  contract: "documentation-producer",
  contractVersion: "0.1.0-draft",
  id: "htmdoc",
  version: HTMDOC_RUNNER_VERSION,
  displayName: "HTMDoc",
  inputKinds: [...HTMDOC_INPUT_KINDS],
  outputKinds: [...HTMDOC_OUTPUT_KINDS],
  capabilities: {
    sourceLinkage: true,
    incremental: false,
    watch: false
  }
});

export const htmdocProducer = Object.freeze({
  descriptor: htmdocProducerDescriptor,
  produce(request, context = {}) {
    return runHtmDoc(request, context);
  }
});

export default htmdocProducer;
