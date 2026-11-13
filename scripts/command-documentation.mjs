/**
 * @file
 * @lang zh-CN HTMDoc命令工件的实际观察、core开发期投影及独立离线新鲜度门禁。
 * @lang en Actual HTMDoc command observation, development-time core projection and independent offline freshness gating.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createHtmDocCommands } from "../packages/htmdoc-runner/src/command-content.mjs";
import { formatHtmDocHelp } from "./format-command-help.mjs";

// <lang><zh-CN>固定本owner及实际来源，生成文件不参与来源摘要，避免自引用。</zh-CN><en>Fix this owner and actual sources, excluding generated files from source digests to avoid self-reference.</en></lang>
const root = fileURLToPath(new URL("../", import.meta.url));
const owner = path.join(root, "packages/htmdoc-runner");
// <lang><zh-CN>Ajv来自runner已声明依赖，按该包解析，避免依赖工作区意外hoist。</zh-CN><en>Resolve Ajv through the runner's declared dependency, avoiding accidental workspace hoisting.</en></lang>
const Ajv2020 = createRequire(path.join(owner, "package.json"))(
  "ajv/dist/2020.js",
).default;
const output = path.join(owner, "src/command-documentation");
const sourceNames = [
  "src/cli.mjs",
  "src/html-authoring-handoff-cli.mjs",
  "src/html-authoring-handoff.mjs",
  "HANDOFF.md",
  "src/command-content.mjs",
  "src/metadata.mjs",
  "src/index.mjs",
  "src/schema.mjs",
  "src/config-compatibility.mjs",
  "src/schemas/htmdoc-config-0.1.0-draft.schema.json",
  "src/schemas/htmdoc-config-1.0.0.schema.json",
  "README.md",
  "package.json",
];
const outputNames = [
  "description.json",
  "observations.json",
  "document.hia.json",
  "command.schema.json",
  "document.schema.json",
  "help.mjs",
];

/** @lang zh-CN 对实际字节计算固定小写SHA-256。
 * @lang en Hash actual bytes as fixed lowercase SHA-256.
 */
function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** @lang zh-CN 读取固定源字节，LF约定由本仓属性控制，原字节原样交core。
 * @lang en Read fixed source bytes whose LF convention is governed by repository attributes, passing original bytes unchanged to core.
 */
async function sources() {
  return new Map(
    await Promise.all(
      sourceNames.map(async (name) => {
        const bytes = await fs.readFile(path.join(owner, name));
        assert.equal(
          bytes.includes(13),
          false,
          "Command source bytes must follow the repository LF attributes.",
        );
        return [name, bytes];
      }),
    ),
  );
}

/**
 * @lang zh-CN 在独立进程捕获真实parseArgs参数表，原生框架校验完成后以受控错误结束。
 * @lang en Capture actual parseArgs settings in an isolated process, ending with a controlled error after native validation.
 * @returns {object} <lang><zh-CN>实际类型/短名、位置输入许可及调用行。</zh-CN><en>Actual types, short names, positional permission and call line.</en></lang>
 */
export function observeHtmDocOptions(executable = "htmdoc") {
  // <lang><zh-CN>两实现分别观察，省略allowPositionals的声明事实原样保留。</zh-CN><en>Observe both implementations separately, retaining declared omission of allowPositionals unchanged.</en></lang>
  const definitions = {
    htmdoc: {
      source: "src/cli.mjs",
      positionals: true,
      error:
        "HTMDoc failed: invalid arguments, configuration, or build operation.\n",
    },
    "htmdoc-handoff": {
      source: "src/html-authoring-handoff-cli.mjs",
      positionals: undefined,
      error:
        "HTMDoc handoff failed: Unable to evaluate an explicit HTML-authoring handoff request.\n",
    },
  };
  const definition = definitions[executable];
  assert.ok(definition, "Unknown owner executable.");
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts/observe-command-options.mjs"),
      path.join(owner, definition.source),
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe", "pipe"],
      timeout: 15000,
    },
  );
  assert.equal(
    result.status,
    1,
    "Declaration probe did not reach the controlled boundary.",
  );
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, definition.error);
  const observation = JSON.parse(result.output[3]);
  assert.equal(observation.strict, true);
  assert.equal(observation.allowPositionals, definition.positionals);
  assert.ok(
    Number.isSafeInteger(observation.callLine) && observation.callLine >= 1,
  );
  return observation;
}

/**
 * @lang zh-CN 采集两份真实声明，测试只可显式替换对应实现的观察以核拒绝路径。
 * @lang en Collect two actual declarations, allowing tests to explicitly substitute the corresponding observation only for refusal checks.
 */
function actualObservations(options = {}) {
  return {
    htmdoc: options.observation ?? observeHtmDocOptions(),
    "htmdoc-handoff":
      options.handoffObservation ?? observeHtmDocOptions("htmdoc-handoff"),
  };
}

/**
 * @lang zh-CN 把两独立实现分别绑定到实际包bin、源字节及解析行。
 * @lang en Bind both independent implementations separately to actual package bins, source bytes and parser lines.
 */
function describe(bytes, observations) {
  const manifest = JSON.parse(bytes.get("package.json").toString("utf8"));
  assert.equal(manifest.name, "@hia-doc/htmdoc-runner");
  assert.deepEqual(Object.keys(manifest.bin).sort(), [
    "htmdoc",
    "htmdoc-handoff",
  ]);
  const commands = createHtmDocCommands();
  for (const command of commands) {
    const source =
      command.id === "htmdoc"
        ? "src/cli.mjs"
        : "src/html-authoring-handoff-cli.mjs";
    const observation = observations[command.id];
    assert.equal(manifest.bin[command.executable], "./" + source);
    assert.equal(hash(bytes.get(source)), observation.cliSha256);
    assert.deepEqual(
      command.options
        .map((item) => [item.name, item.valueType, item.short ?? null])
        .sort(),
      observation.options
        .map((item) => [item.name, item.valueType, item.short ?? null])
        .sort(),
    );
    for (const item of [command, ...command.options, ...command.positionals]) {
      item.evidence = Object.keys(item)
        .filter(
          (key) =>
            !["id", "i18n", "evidence", "options", "positionals"].includes(key),
        )
        .flatMap((fieldPath) => [
          { fieldPath, sourceId: "src/command-content.mjs" },
          { fieldPath, sourceId: source },
        ]);
      item.evidence.push(
        ...Object.keys(item.i18n.fields).flatMap((key) => [
          {
            fieldPath: "i18n.fields." + key,
            sourceId: "src/command-content.mjs",
          },
          {
            fieldPath: "i18n.fields." + key,
            sourceId: command.id === "htmdoc" ? "README.md" : "HANDOFF.md",
          },
        ]),
      );
      if (Object.hasOwn(item, "defaultRule"))
        item.evidence.push(
          ...(command.id === "htmdoc"
            ? [
                "src/index.mjs",
                "src/config-compatibility.mjs",
                "src/schemas/htmdoc-config-1.0.0.schema.json",
                "src/schemas/htmdoc-config-0.1.0-draft.schema.json",
              ]
            : ["src/html-authoring-handoff.mjs"]
          ).map((sourceId) => ({ fieldPath: "defaultRule", sourceId })),
        );
      if (item === command)
        item.evidence.push(
          { fieldPath: "executable", sourceId: "package.json" },
          {
            fieldPath: "displayVersion",
            sourceId:
              command.id === "htmdoc"
                ? "src/metadata.mjs"
                : "src/html-authoring-handoff.mjs",
          },
        );
      // <lang><zh-CN>只陈述实际调用行，完整未知坐标约定保留在原描述中。</zh-CN><en>State only the actual call line, retaining unknown coordinate conventions in the original description.</en></lang>
      item.evidence.unshift({
        fieldPath: item === command ? "signature" : "name",
        sourceId: source,
        range: {
          start: { line: observation.callLine },
          end: { line: observation.callLine },
        },
        rangeConvention: { endBoundary: "unknown", columnUnit: "unknown" },
      });
    }
  }
  const description = {
    contract: "command-documentation",
    contractVersion: "0.1.0-draft",
    owner: { packageName: manifest.name, packageVersion: manifest.version },
    sources: [...bytes].map(([id, value]) => ({
      id,
      path: id,
      sha256: hash(value),
      language: id.endsWith(".mjs")
        ? "javascript"
        : id.endsWith(".json")
          ? "json"
          : "markdown",
    })),
    commands,
  };
  const declarations = commands.map((command) => ({
    commandId: command.id,
    sourceDigests: Object.fromEntries(
      description.sources.map((source) => [source.id, source.sha256]),
    ),
    options: structuredClone(observations[command.id].options),
    positionals: command.positionals.map((item) => ({
      name: item.name,
      valueType: item.valueType,
    })),
  }));
  return { description, observations: declarations };
}

/** @lang zh-CN 生成带双语文件职责的静态模块，实际CLI仅导入两个已生成字符串。
 * @lang en Generate a static module with bilingual file responsibility, exposing only two generated strings to the actual CLI.
 */
function helpModule(commands) {
  // <lang><zh-CN>四个静态正文都来自同一字段图，运行期各入口仅选择自己的两个画布。</zh-CN><en>All four static texts derive from the same field graphs, with each runtime entry selecting only its own two canvases.</en></lang>
  return (
    "/**\n * @file\n * @lang zh-CN 双入口共享内容生成的静态帮助，通过commands:build更新。\n * @lang en Static dual-entry help generated from shared content, updated through commands:build.\n */\n" +
    commands
      .flatMap((command) =>
        [80, 120].map(
          (width) =>
            "/**\n * @lang zh-CN " +
            width +
            "列命令帮助。\n * @lang en " +
            width +
            "-column command help.\n */\nexport const " +
            (command.id === "htmdoc"
              ? "HTMDOC_HELP_"
              : "HTMDOC_HANDOFF_HELP_") +
            width +
            " = " +
            JSON.stringify(formatHtmDocHelp(command, width)) +
            ";\n",
        ),
      )
      .join("\n")
  );
}

/** @lang zh-CN 构建前和读取时共用两自包含schema校验，失败不进入目录替换。
 * @lang en Share both self-contained schema checks before publication and during reading, preventing replacement on validation failure.
 */
function validateArtifacts(generated) {
  for (const [schema, artifact] of [
    ["command.schema.json", "description.json"],
    ["document.schema.json", "document.hia.json"],
  ]) {
    const validate = new Ajv2020({ strict: true, allErrors: true }).compile(
      JSON.parse(generated[schema]),
    );
    assert.ok(
      validate(JSON.parse(generated[artifact])),
      "Generated command artifact does not match its owner schema.",
    );
  }
  // <lang><zh-CN>静态投影须逐原生节点保持真实语言字段，避免合法结构掩盖正文丢失。</zh-CN><en>Static projection must retain actual locale fields per native node, preventing valid structure from hiding lost prose.</en></lang>
  const description = JSON.parse(generated["description.json"]);
  const document = JSON.parse(generated["document.hia.json"]);
  const originals = description.commands.flatMap((command) => [
    command,
    ...command.options,
    ...command.positionals,
  ]);
  assert.equal(document.symbols.length, originals.length);
  for (const original of originals) {
    const symbols = document.symbols.filter(
      (symbol) => symbol.metadata.commandDocumentation.nativeId === original.id,
    );
    assert.equal(symbols.length, 1);
    assert.deepEqual(symbols[0].i18n, original.i18n);
    if (original.signature)
      assert.equal(symbols[0].signature, original.signature);
  }
}

/**
 * @lang zh-CN 离线验证两schema、真实来源/观察及生成快照的逐字节关系，无core运行依赖。
 * @lang en Validate both schemas and byte-level relationships among actual sources, observations and generated snapshots offline, without a core runtime dependency.
 * @param {object} options <lang><zh-CN>测试可显式提供冲突观察。</zh-CN><en>Tests may explicitly supply conflicting observations.</en></lang>
 * @returns {Promise<object>} <lang><zh-CN>已核命令及符号数量。</zh-CN><en>Verified command and symbol counts.</en></lang>
 */
export async function checkCommandDocumentation(options = {}) {
  const bytes = await sources();
  const observations = actualObservations(options);
  const current = describe(bytes, observations);
  const generated = Object.fromEntries(
    await Promise.all(
      outputNames.map(async (name) => [
        name,
        await fs.readFile(path.join(output, name)),
      ]),
    ),
  );
  const receipt = JSON.parse(
    await fs.readFile(path.join(output, "generation.json"), "utf8"),
  );
  assert.deepEqual(
    Object.keys(receipt.outputs).sort(),
    [...outputNames].sort(),
  );
  for (const name of outputNames)
    assert.equal(hash(generated[name]), receipt.outputs[name]);
  const description = JSON.parse(generated["description.json"]);
  const document = JSON.parse(generated["document.hia.json"]);
  assert.equal(receipt.coreContractVersion, document.schemaVersion);
  assert.equal(receipt.commandContractVersion, description.contractVersion);
  assert.deepEqual(description, current.description);
  assert.deepEqual(
    JSON.parse(generated["observations.json"]),
    current.observations,
  );
  assert.deepEqual(
    document.metadata.commandDocumentation.artifact,
    description,
  );
  assert.equal(
    document.metadata.commandDocumentation.verification.sourceBytes,
    "matched",
  );
  assert.equal(
    document.metadata.commandDocumentation.verification.declarationObservations,
    "host-observation-matched",
  );
  assert.equal(document.symbols.length, 15);
  assert.equal(
    generated["help.mjs"].toString("utf8"),
    helpModule(description.commands),
  );
  validateArtifacts(generated);
  return { commands: 2, symbols: document.symbols.length };
}

/**
 * @lang zh-CN 重新生成时显式加载所选core入口并执行严格投影，整组暂存后替换。
 * @lang en Explicitly load the selected core entry and perform strict projection during regeneration, replacing the generated group after staging.
 * @param {string|undefined} coreModule <lang><zh-CN>core入口文件，缺省使用正常安装的@hia-doc/core。</zh-CN><en>Core entry file, defaulting to normally installed @hia-doc/core.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>已生成并重新核验。</zh-CN><en>Regenerated and revalidated.</en></lang>
 */
export async function buildCommandDocumentation(coreModule) {
  const core = coreModule
    ? await import(pathToFileURL(path.resolve(coreModule)).href)
    : await import("@hia-doc/core");
  const bytes = await sources();
  const current = describe(bytes, actualObservations());
  const result = await core.produceCommandDocumentation(current.description, {
    sourceBytes: bytes,
    declarations: current.observations,
  });
  assert.equal(
    result.status,
    "ready",
    "Core command projection refused or lacked evidence.",
  );
  const generated = {
    "description.json": current.description,
    "observations.json": current.observations,
    "document.hia.json": result.document,
    "command.schema.json": core.COMMAND_DOCUMENTATION_JSON_SCHEMA,
    "document.schema.json": core.HIA_DOCUMENT_SCHEMA,
  };
  const files = Object.fromEntries(
    Object.entries(generated).map(([name, value]) => [
      name,
      JSON.stringify(value, null, 2) + "\n",
    ]),
  );
  files["help.mjs"] = helpModule(current.description.commands);
  validateArtifacts(files);
  files["generation.json"] =
    JSON.stringify(
      {
        coreContractVersion: core.HIA_CORE_CONTRACT_VERSION,
        commandContractVersion: current.description.contractVersion,
        outputs: Object.fromEntries(
          Object.entries(files).map(([name, value]) => [name, hash(value)]),
        ),
      },
      null,
      2,
    ) + "\n";
  // <lang><zh-CN>只在本owner的src目录内暂存/移动，失败恢复原组，同目标拒绝并发写者。</zh-CN><en>Stage and move only within this owner's src directory, restoring the predecessor on failure and refusing concurrent writers.</en></lang>
  const parent = path.dirname(output);
  const lockPath = output + ".lock";
  const lock = await fs.open(lockPath, "wx");
  let staging;
  let backup;
  try {
    const previous = await fs.lstat(output).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (previous) {
      assert.ok(previous.isDirectory() && !previous.isSymbolicLink());
      assert.deepEqual(
        (await fs.readdir(output)).sort(),
        [...outputNames, "generation.json"].sort(),
      );
      for (const name of [...outputNames, "generation.json"])
        assert.ok(
          (await fs.lstat(path.join(output, name))).isFile() &&
            !(await fs.lstat(path.join(output, name))).isSymbolicLink(),
        );
    }
    staging = await fs.mkdtemp(path.join(parent, ".command-documentation-"));
    for (const [name, content] of Object.entries(files))
      await fs.writeFile(path.join(staging, name), content, "utf8");
    if (previous) {
      backup = staging + ".previous";
      assert.equal(path.dirname(backup), parent);
      await fs.rename(output, backup);
    }
    try {
      await fs.rename(staging, output);
    } catch (error) {
      if (backup) await fs.rename(backup, output);
      throw error;
    }
    staging = undefined;
    if (backup) {
      assert.equal(path.dirname(backup), parent);
      await fs.rm(backup, { recursive: true });
    }
  } finally {
    try {
      if (staging) {
        assert.equal(path.dirname(staging), parent);
        await fs.rm(staging, { recursive: true, force: true });
      }
    } finally {
      await lock.close();
      await fs.unlink(lockPath);
    }
  }
  await checkCommandDocumentation();
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  if (process.argv[2] === "--build") {
    assert.ok(
      process.argv.length === 3 ||
        (process.argv.length === 5 && process.argv[3] === "--core-module"),
    );
    await buildCommandDocumentation(process.argv[4]);
  } else {
    assert.equal(process.argv.length, 2);
    await checkCommandDocumentation();
  }
  console.log(
    "HTMDoc command documentation verified: 2 implementations, 12 options, 1 positional, 15 symbols.",
  );
}
