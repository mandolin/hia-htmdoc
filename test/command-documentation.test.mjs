/**
 * @file
 * @lang zh-CN HTMDoc命令描述、实际解析声明及已确认帮助的采用回归。
 * @lang en Adoption regressions for HTMDoc command descriptions, actual parser declarations and confirmed help.
 */
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  mkdtemp,
  writeFile,
  mkdir,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import { columns, formatHtmDocHelp } from "../scripts/format-command-help.mjs";
import { createHtmDocCommands } from "../packages/htmdoc-runner/src/command-content.mjs";
import {
  observeHtmDocOptions,
  checkCommandDocumentation,
  buildCommandDocumentation,
} from "../scripts/command-documentation.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(root, "packages/htmdoc-runner/src/cli.mjs");
const handoffCli = path.join(
  root,
  "packages/htmdoc-runner/src/html-authoring-handoff-cli.mjs",
);

/**
 * @lang zh-CN 创建独占HTML及元数据工作区，结束时只删除已核实的临时边界。
 * @lang en Create an owned HTML/metadata workspace, cleaning only its verified temporary boundary afterward.
 * @param {function(string):Promise<void>} action <lang><zh-CN>独占目录中的验收回调。</zh-CN><en>Acceptance callback inside the owned directory.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>验收及清理完成。</zh-CN><en>Acceptance and cleanup complete.</en></lang>
 */
async function withWorkspace(action) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "htmdoc-command-"));
  try {
    await writeFile(
      path.join(directory, "sample.html"),
      "<main>示例 / Sample</main>\n",
    );
    // <lang><zh-CN>复用随包完整请求，防止测试另造契约字段或扩大许可。</zh-CN><en>Reuse complete packaged requests so tests cannot invent contract fields or expand permissions.</en></lang>
    for (const [name, fixture] of [
      ["accepted.json", "accepted"],
      ["refused.json", "refused-version"],
    ]) {
      await writeFile(
        path.join(directory, name),
        await readFile(
          path.join(
            root,
            "packages/htmdoc-runner/examples/handoff." +
              fixture +
              ".request.json",
          ),
        ),
      );
    }
    await action(directory);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("htmdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
}

/**
 * @lang zh-CN 调用npm生成的真实bin，Windows的cmd由PowerShell7启动。
 * @lang en Invoke an actual npm-generated bin, using PowerShell 7 for cmd entries on Windows.
 * @param {string} name <lang><zh-CN>固定调用名。</zh-CN><en>Fixed invocation name.</en></lang>
 * @param {string[]} args <lang><zh-CN>本测试固定参数。</zh-CN><en>Fixed test arguments.</en></lang>
 * @returns {object} <lang><zh-CN>实际进程结果。</zh-CN><en>Actual process result.</en></lang>
 */
function runInstalledBin(name, args) {
  const environment = { ...process.env };
  const pathKey =
    Object.keys(environment).find((key) => key.toLowerCase() === "path") ??
    "PATH";
  environment[pathKey] =
    path.dirname(process.execPath) + path.delimiter + environment[pathKey];
  const file = path.join(
    root,
    "node_modules/.bin",
    name + (process.platform === "win32" ? ".cmd" : ""),
  );
  if (process.platform === "win32") {
    const command =
      "& " +
      [file, ...args]
        .map((value) => "'" + value.replaceAll("'", "''") + "'")
        .join(" ") +
      "; exit $LASTEXITCODE";
    return spawnSync(
      "C:/Program Files/PowerShell/7/pwsh.exe",
      ["-NoLogo", "-NoProfile", "-Command", command],
      { cwd: root, env: environment, encoding: "utf8", timeout: 30000 },
    );
  }
  return spawnSync(file, args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    timeout: 30000,
  });
}

test("a refused core projection preserves the existing generated group", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "htmdoc-command-"));
  const receiptPath = path.join(
    root,
    "packages/htmdoc-runner/src/command-documentation/generation.json",
  );
  const before = await readFile(receiptPath);
  try {
    const module = path.join(directory, "refused-core.mjs");
    await writeFile(
      module,
      'export async function produceCommandDocumentation() { return {status:"refused",diagnostics:[]}; }\n',
    );
    await assert.rejects(buildCommandDocumentation(module));
    assert.deepEqual(await readFile(receiptPath), before);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("htmdoc-command-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("the descriptor covers eight actual switches and conditional positional inputs", () => {
  const [command, handoff] = createHtmDocCommands();
  assert.equal(handoff.options.length, 4);
  assert.equal(handoff.positionals.length, 0);
  const actual = observeHtmDocOptions();
  assert.equal(command.options.length, 8);
  assert.equal(command.positionals[0].name, "positionals");
  assert.equal(command.positionals[0].multiple, true);
  assert.deepEqual(
    command.options.map((item) => item.name).sort(),
    actual.options.map((item) => item.name).sort(),
  );
  assert.equal(actual.strict, true);
  assert.equal(actual.allowPositionals, true);
});

test("the checked generated artifacts bind current sources and original parser declarations", async () => {
  const receipt = await checkCommandDocumentation();
  assert.equal(receipt.commands, 2);
  assert.equal(receipt.symbols, 15);
});

test("an option type conflict is rejected independently of the descriptor", async () => {
  const actual = observeHtmDocOptions();
  actual.options.find((option) => option.name === "config").valueType =
    "boolean";
  await assert.rejects(checkCommandDocumentation({ observation: actual }));
});

for (const [args, code, expected] of [
  [["--help"], 0, "HIA-Documentation-Sys · htmdoc"],
  [["-h"], 0, "配置与副作用 / Configuration and effects"],
  [
    ["--help", "--unknown-command-option"],
    1,
    "HTMDoc failed: invalid arguments, configuration, or build operation.",
  ],
  [
    ["--help", "--config"],
    1,
    "HTMDoc failed: invalid arguments, configuration, or build operation.",
  ],
  [["--help", "--kind", "not-a-kind"], 0, "HIA-Documentation-Sys · htmdoc"],
  [["--help", "--config", "missing.json"], 0, "HIA-Documentation-Sys · htmdoc"],
  [["--version"], 0, "1.0.0"],
  [["--help", "--version"], 0, "HIA-Documentation-Sys · htmdoc"],
  [
    ["--version", "--unknown-command-option"],
    1,
    "HTMDoc failed: invalid arguments, configuration, or build operation.",
  ],
  [
    [],
    1,
    "HTMDoc failed: invalid arguments, configuration, or build operation.",
  ],
]) {
  test("normal CLI boundary " + JSON.stringify(args), () => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, code);
    assert.ok((code ? result.stderr : result.stdout).includes(expected));
    assert.equal(code ? result.stdout : result.stderr, "");
    assert.equal(result.stdout.includes("\x1b"), false);
  });
}

for (const [args, code, output] of [
  [["--help"], 0, "help"],
  [["-h"], 0, "help"],
  [["--version"], 0, "version"],
  [["-v"], 0, "version"],
  [["--help", "--version"], 0, "help"],
  [["--help", "--input", "missing.json"], 0, "help"],
  [["--help", "--out", "../private.json"], 0, "help"],
  [["--help", "--unknown-command-option"], 1, "generic"],
  [["--help", "--input"], 1, "generic"],
  [["--help", "unexpected"], 1, "generic"],
  [[], 1, "input"],
  [["--input", "../private.json"], 1, "input"],
]) {
  test("handoff normal CLI boundary " + JSON.stringify(args), () => {
    const result = spawnSync(process.execPath, [handoffCli, ...args], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, code);
    if (output === "help")
      assert.equal(
        result.stdout,
        formatHtmDocHelp(createHtmDocCommands()[1], 80),
      );
    if (output === "version") assert.equal(result.stdout, "0.1.0-draft\n");
    if (output === "generic")
      assert.equal(
        result.stderr,
        "HTMDoc handoff failed: Unable to evaluate an explicit HTML-authoring handoff request.\n",
      );
    if (output === "input")
      assert.equal(
        result.stderr,
        "HTMDoc handoff failed: --input must be a safe relative path.\n",
      );
    assert.equal(code ? result.stdout : result.stderr, "");
  });
}

test("two independent parsers retain their declarations and display-version identities", () => {
  const [build, handoff] = createHtmDocCommands();
  const observation = observeHtmDocOptions("htmdoc-handoff");
  assert.equal(observation.options.length, 4);
  assert.equal(Object.hasOwn(observation, "allowPositionals"), false);
  assert.equal(build.displayVersion.kind, "runner");
  assert.equal(handoff.displayVersion.kind, "artifact");
  assert.equal(handoff.displayVersion.value, "0.1.0-draft");
});

test("a handoff declaration drift is rejected independently of the build parser", async () => {
  const observation = observeHtmDocOptions("htmdoc-handoff");
  observation.options.find((item) => item.name === "input").valueType =
    "boolean";
  await assert.rejects(
    checkCommandDocumentation({ handoffObservation: observation }),
  );
});

for (const width of [80, 120]) {
  test(
    "handoff output matches the confirmed terminal baseline " + width,
    async () => {
      const expected = await readFile(
        path.join(root, "test/fixtures/command-help/handoff-" + width + ".txt"),
        "utf8",
      );
      assert.equal(
        formatHtmDocHelp(createHtmDocCommands()[1], width),
        expected.replaceAll("\r\n", "\n"),
      );
      for (const command of createHtmDocCommands()) {
        for (const line of formatHtmDocHelp(command, width).split("\n"))
          assert.ok(columns(line) <= width, line);
      }
    },
  );
}

test("build direct mode keeps last output and disables maps", async () =>
  withWorkspace(async (directory) => {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--out-dir",
        "first",
        "--out-dir",
        "second",
        "--no-doc-source-map",
        "sample.html",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal((await readdir(directory)).includes("first"), false);
    const report = JSON.parse(
      await readFile(
        path.join(directory, "second/htmdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(report.status, "success");
    assert.equal(
      report.artifacts.some((item) => item.kind === "doc-source-map"),
      false,
    );
  }));

test("build config ignores direct-only fields and applies supported overrides", async () =>
  withWorkspace(async (directory) => {
    await writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({
        schemaVersion: "1.0.0",
        outputDirectory: "configured",
        inputs: [{ path: "sample.html" }],
      }),
    );
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--config",
        "config.json",
        "--workspace-root",
        "missing-root",
        "--kind",
        "invalid",
        "missing.html",
        "--out-dir",
        "overridden",
        "--sources-content-policy",
        "reference",
        "--no-doc-source-map",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal((await readdir(directory)).includes("configured"), false);
    const report = JSON.parse(
      await readFile(
        path.join(directory, "overridden/htmdoc.producer-result.json"),
        "utf8",
      ),
    );
    assert.equal(report.status, "success");
    assert.equal(
      report.artifacts.some((item) => item.kind === "doc-source-map"),
      false,
    );
  }));

test("build empty overrides retain config and empty direct output selects the root", async () =>
  withWorkspace(async (directory) => {
    await writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({
        schemaVersion: "1.0.0",
        outputDirectory: "configured",
        inputs: [{ path: "sample.html" }],
      }),
    );
    const configured = spawnSync(
      process.execPath,
      [
        cli,
        "--config",
        "config.json",
        "--out-dir",
        "",
        "--sources-content-policy",
        "",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(configured.status, 0, configured.stderr);
    const direct = spawnSync(
      process.execPath,
      [cli, "--out-dir", "", "sample.html"],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(direct.status, 0, direct.stderr);
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(directory, "htmdoc.producer-result.json"),
          "utf8",
        ),
      ).status,
      "success",
    );
  }));

test("build partial failure keeps successful HTML artifacts", async () =>
  withWorkspace(async (directory) => {
    const result = spawnSync(
      process.execPath,
      [cli, "sample.html", "missing.html"],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /^HTMDoc partial:/u);
    assert.equal(
      JSON.parse(
        await readFile(
          path.join(directory, "dist/htmdoc/htmdoc.producer-result.json"),
          "utf8",
        ),
      ).status,
      "partial",
    );
  }));

for (const [file, status] of [
  ["accepted.json", "accepted"],
  ["refused.json", "refused"],
]) {
  test("handoff evaluates explicit metadata to stdout " + status, async () =>
    withWorkspace(async (directory) => {
      const before = (await readdir(directory)).sort();
      const result = spawnSync(
        process.execPath,
        [handoffCli, "--input", file],
        { cwd: directory, encoding: "utf8" },
      );
      assert.equal(result.status, status === "accepted" ? 0 : 1);
      assert.equal(result.stderr, "");
      assert.equal(JSON.parse(result.stdout).status, status);
      assert.deepEqual((await readdir(directory)).sort(), before);
    }),
  );
}

test("handoff explicit output and repeated values select the last path", async () =>
  withWorkspace(async (directory) => {
    const result = spawnSync(
      process.execPath,
      [
        handoffCli,
        "--input",
        "refused.json",
        "--input",
        "accepted.json",
        "--out",
        "first.json",
        "--out",
        "second.json",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal((await readdir(directory)).includes("first.json"), false);
    assert.equal(
      JSON.parse(await readFile(path.join(directory, "second.json"), "utf8"))
        .status,
      "accepted",
    );
  }));

test("handoff empty output uses stdout and filename suffix does not change JSON reading", async () =>
  withWorkspace(async (directory) => {
    await writeFile(
      path.join(directory, "metadata.txt"),
      await readFile(path.join(directory, "accepted.json")),
    );
    const before = (await readdir(directory)).sort();
    const result = spawnSync(
      process.execPath,
      [handoffCli, "--input", "metadata.txt", "--out", ""],
      { cwd: directory, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, "accepted");
    assert.deepEqual((await readdir(directory)).sort(), before);
  }));

for (const output of ["../private.json", "missing/report.json"]) {
  test(
    "handoff output failure preserves owned input and avoids extra output " +
      output,
    async () =>
      withWorkspace(async (directory) => {
        const before = (await readdir(directory)).sort();
        const result = spawnSync(
          process.execPath,
          [handoffCli, "--input", "accepted.json", "--out", output],
          { cwd: directory, encoding: "utf8" },
        );
        assert.equal(result.status, 1);
        assert.equal(result.stdout, "");
        assert.match(result.stderr, /^HTMDoc handoff failed:/u);
        assert.deepEqual((await readdir(directory)).sort(), before);
      }),
  );
}

test("handoff JSON and file failures use the controlled public error", async () =>
  withWorkspace(async (directory) => {
    await writeFile(path.join(directory, "broken.json"), "{PRIVATE_MARKER");
    for (const file of ["broken.json", "missing.json"]) {
      const result = spawnSync(
        process.execPath,
        [handoffCli, "--input", file],
        { cwd: directory, encoding: "utf8" },
      );
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(
        result.stderr,
        "HTMDoc handoff failed: Unable to evaluate an explicit HTML-authoring handoff request.\n",
      );
    }
  }));

for (const [name, version] of [
  ["htmdoc", "1.0.0"],
  ["htmdoc-handoff", "0.1.0-draft"],
]) {
  for (const [args, status] of [
    [["--help"], 0],
    [["--version"], 0],
    [["--help", "--unknown-command-option"], 1],
  ]) {
    test("real installed bin " + name + " " + JSON.stringify(args), () => {
      const result = runInstalledBin(name, args);
      assert.equal(result.status, status, result.stderr);
      if (!status)
        assert.equal(
          result.stdout,
          args[0] === "--version"
            ? version + "\n"
            : formatHtmDocHelp(
                createHtmDocCommands().find((command) => command.id === name),
                80,
              ),
        );
      else assert.equal(result.stdout, "");
    });
  }
}
