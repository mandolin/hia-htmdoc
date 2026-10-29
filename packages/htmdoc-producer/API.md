# HTML documentation producer API

## Public exports

`htmdocProducerDescriptor` is the immutable SDK descriptor.
`htmdocProducer` is `{descriptor,produce}`; `default` is that same producer.
The descriptor reference is shared by the named and default objects.

## Inputs

`produce(request, context)` delegates the original request/context to runHtmDoc:
absolute runtime roots, explicit relative HTML/fragment/template/CEM inputs,
options/profileIds, abort signal and progress callback. No plugin scanning occurs.

## Returns

The runner Promise resolves a documentation-producer-result containing actual
artifacts, safe diagnostics, implementation identity and success/partial/failed.
The descriptor contains contract/version, id, version, displayName, inputKinds,
outputKinds and capabilities. It carries no runtime absolute paths.

## Defaults

Context defaults to an empty object; runner defaults apply unchanged. Descriptor
id htmdoc, sourceLinkage true, incremental/watch false. Implementation version
follows the runner package, independently of wire contract versions.

## Errors

Invalid request rejection, output I/O and progress-callback errors follow
runHtmDoc. Per-input failures become result diagnostics. The wrapper does not
catch, retry, repair, migrate or reinterpret these outcomes.

## Effects

Importing creates only metadata/objects. Calling produce performs the runner's
explicit reads/writes; no additional I/O or host/network action is added.
Cancellation does not roll back files already written.

## Compatibility

Package 1.0.0 uses confirmed descriptor/result 1.0.0. Exact old results remain
readable in the shared SDK/conformance reader. Old published tarballs are not
rewritten and artifact versions remain independent.

## Source linkage

The descriptor declares sourceLinkage, while actual maps retain their own
1.1.0 identity and known/unknown precision. Capability metadata alone is not a
source authorization or cross-transform same-point proof.

## Privacy

Runtime roots are never descriptor data. Output privacy follows runner options
and owner-reviewed domain text. This wrapper is not a sandbox for callbacks,
symlinks or arbitrary caller-provided documentation.
