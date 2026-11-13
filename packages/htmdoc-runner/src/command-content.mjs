/**
 * @file
 * @lang zh-CN HTMDoc命令的纯双语内容，供静态帮助及开发期core投影共同使用。
 * @lang en Pure bilingual HTMDoc command content shared by static help and development-time core projection.
 */
import { HTMDOC_RUNNER_VERSION, HTMDOC_INPUT_KINDS } from "./metadata.mjs";
import { HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION } from "./html-authoring-handoff.mjs";

/** @lang zh-CN 创建独立的原生字段语言模型，键名及两语正文精确保留。
 * @lang en Create an independent native field locale model retaining exact keys and both localized texts.
 * @param {object} fields <lang><zh-CN>中文/英文文本对。</zh-CN><en>Chinese/English text pairs.</en></lang>
 * @returns {object} <lang><zh-CN>1.0.0字段语言模型。</zh-CN><en>A 1.0.0 field locale model.</en></lang>
 */
function localized(fields) {
  return {
    enabled: true,
    model: "hia-text-i18n",
    modelVersion: "1.0.0",
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en"],
    fields: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [
        key,
        {
          fieldPath: key,
          kind: "text",
          defaultLocale: "zh-CN",
          localizedText: { "zh-CN": value[0], en: value[1] },
        },
      ]),
    ),
  };
}

/** @lang zh-CN 构造参数内容；其名称/类型/短名另由真实parseArgs调用观察。
 * @lang en Construct parameter content, with names, types and short names independently observed from the actual parseArgs call.
 * @param {string} name <lang><zh-CN>原生参数名。</zh-CN><en>Native parameter name.</en></lang>
 * @param {string} zh <lang><zh-CN>中文说明。</zh-CN><en>Chinese description.</en></lang>
 * @param {string} en <lang><zh-CN>英文说明。</zh-CN><en>English description.</en></lang>
 * @param {object} settings <lang><zh-CN>原生类型、短名、显示槽及默认规则。</zh-CN><en>Native type, short name, display slot and default rule.</en></lang>
 * @returns {object} <lang><zh-CN>带未绑定来源的参数内容。</zh-CN><en>Parameter content awaiting provenance binding.</en></lang>
 */
function parameter(name, zh, en, settings = {}) {
  // <lang><zh-CN>显示槽属于文案，位置参数名保留Node原生positionals身份。</zh-CN><en>The displayed slot is prose, while positional names retain Node's native positionals identity.</en></lang>
  const fields = { summary: [zh, en], description: [zh, en] };
  if (settings.metavar) fields.metavar = [settings.metavar, settings.metavar];
  return {
    id: name,
    kind: settings.kind ?? "option",
    name,
    ...(settings.short ? { short: settings.short } : {}),
    valueType: settings.valueType ?? "string",
    required: false,
    multiple: settings.multiple ?? false,
    ...(settings.choices ? { choices: settings.choices } : {}),
    defaultRule: settings.defaultRule ?? {
      kind: "conditional",
      conditions: ["description"],
    },
    i18n: localized(fields),
    evidence: [],
  };
}

/**
 * @lang zh-CN 创建两独立实现的纯字段内容，分别保留运行器和工件版本。
 * @lang en Create pure field content for two independent implementations, retaining runner and artifact versions separately.
 * @returns {object[]} <lang><zh-CN>HTMDoc构建与元数据交接两个命令。</zh-CN><en>The HTMDoc build and metadata handoff commands.</en></lang>
 */
export function createHtmDocCommands() {
  const build = {
    id: "htmdoc",
    executable: "htmdoc",
    path: [],
    kind: "command",
    signature: "htmdoc [options] <input...>",
    i18n: localized({
      summary: [
        "提取HTML与Custom Elements Manifest文档",
        "Extract HTML and Custom Elements Manifest documentation",
      ],
      description: [
        "按明确配置或直接输入抽取HTML类文档并生成标准工件。",
        "Extract HTML-family documentation and generate standard artifacts from explicit configuration or direct inputs.",
      ],
      configUsage: [
        "htmdoc --config htmdoc.config.json",
        "htmdoc --config htmdoc.config.json",
      ],
      configOverrides: [
        "配置模式非空out-dir和sources-content-policy覆盖原值，no-doc-source-map可关闭地图。",
        "In config mode nonempty out-dir and sources-content-policy override configuration, and no-doc-source-map can disable maps.",
      ],
      directOnly: [
        "kind、workspace-root和位置输入仅用于直接模式；配置模式忽略。",
        "kind, workspace-root and positional inputs apply only to direct mode and are ignored in config mode.",
      ],
      paths: [
        "配置路径相对调用目录，配置工作区相对配置目录；直接工作区相对调用目录，输出相对工作区。",
        "Config paths use cwd and configured workspaces use the config directory; direct workspaces use cwd and output uses the workspace.",
      ],
      writes: [
        "构建创建目录并写工件，partial或failed可能保留成功输出；embed策略序列化获准的来源正文。",
        "Builds create directories and artifacts; partial or failed results may retain successful output, and embed serializes authorized source bodies.",
      ],
      parsing: [
        "Node严格解析先于help，未知或缺值返回1；重复带值选项取末值，--后是位置输入。",
        "Node strict parsing precedes help; unknown switches or missing values exit 1. Repeated value options use the last value, and tokens after -- are positional.",
      ],
      offline: [
        "@hia-doc/htmdoc-runner/README.md",
        "@hia-doc/htmdoc-runner/README.md",
      ],
    }),
    displayVersion: { kind: "runner", value: HTMDOC_RUNNER_VERSION },
    parsing: {
      helpOrder: "after-argument-validation",
      unknownOptions: "reject",
    },
    options: [
      parameter(
        "config",
        "从JSON配置构造请求。",
        "Build a request from JSON configuration.",
        {
          short: "c",
          metavar: "path",
          defaultRule: { kind: "not-applicable" },
        },
      ),
      parameter(
        "kind",
        "直接输入类型，省略时按文件名推断。",
        "Direct-input kind, inferred from the filename when omitted.",
        { short: "k", metavar: "kind", choices: [...HTMDOC_INPUT_KINDS] },
      ),
      parameter(
        "out-dir",
        "输出相对工作区，直接模式缺省dist/htmdoc；配置模式仅非空值覆盖。",
        "Output is workspace-relative, defaults to dist/htmdoc in direct mode, and only nonempty values override config mode.",
        { short: "o", metavar: "path" },
      ),
      parameter(
        "workspace-root",
        "直接模式相对调用目录，省略为当前目录。",
        "Direct mode resolves from cwd and defaults to cwd.",
        { metavar: "path" },
      ),
      parameter(
        "sources-content-policy",
        "直接模式缺省none，配置模式仅非空值覆盖。",
        "Direct mode defaults to none, while config mode accepts only nonempty overrides.",
        {
          metavar: "none|reference|embed",
          choices: ["none", "reference", "embed"],
        },
      ),
      parameter(
        "no-doc-source-map",
        "提供时关闭地图；直接模式省略则生成，配置模式保留原值。",
        "Supplying the flag disables maps; omission enables direct-mode maps and retains the configured value.",
        { valueType: "boolean" },
      ),
      parameter("help", "输出帮助并退出0。", "Print help and exit 0.", {
        short: "h",
        valueType: "boolean",
        defaultRule: { kind: "not-applicable" },
      }),
      parameter(
        "version",
        "输出运行器版本并退出0。",
        "Print runner version and exit 0.",
        {
          short: "v",
          valueType: "boolean",
          defaultRule: { kind: "not-applicable" },
        },
      ),
    ],
    positionals: [
      parameter(
        "positionals",
        "直接模式至少一个工作区相对输入；配置模式忽略。",
        "Direct mode requires at least one workspace-relative input; config mode ignores positionals.",
        {
          kind: "positional",
          metavar: "input...",
          multiple: true,
          defaultRule: { kind: "not-applicable" },
        },
      ),
    ],
    examples: ["htmdoc --config htmdoc.config.json"],
    effects: { filesystem: "read-write", network: "none" },
    exitCodes: [
      {
        code: 0,
        i18n: localized({
          summary: ["成功、帮助或版本", "Success, help or version"],
          description: ["成功、帮助或版本", "Success, help or version"],
        }),
      },
      {
        code: 1,
        i18n: localized({
          summary: [
            "参数、配置或构建失败",
            "Argument, configuration or build failure",
          ],
          description: [
            "参数/配置错误或partial/failed构建",
            "Argument/configuration errors or partial/failed builds",
          ],
        }),
      },
    ],
    evidence: [],
  };
  // <lang><zh-CN>独立元数据交接命令使用已确认字段及工件版本，执行条件保留在原语言模型。</zh-CN><en>The independent metadata handoff command uses confirmed fields and artifact version, retaining execution conditions in the native locale model.</en></lang>
  const handoff = {
    id: "htmdoc-handoff",
    executable: "htmdoc-handoff",
    path: [],
    kind: "command",
    signature:
      "htmdoc-handoff --input <safe-relative-json> [--out <safe-relative-json>]",
    i18n: localized({
      summary: [
        "评估显式HTML编写交接元数据",
        "Evaluate explicit HTML authoring handoff metadata",
      ],
      description: [
        "读取明确选定的元数据，纯评估生成accepted/refused交接报告。",
        "Read explicitly selected metadata and purely evaluate an accepted/refused handoff report.",
      ],
      versionIdentity: [
        "显示工件契约" +
          HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION +
          "；安装包为独立版本身份。",
        "Displays artifact contract " +
          HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION +
          "; package version is independent.",
      ],
      paths: [
        "路径相对调用目录且受safe-relative检查；输出文件由调用者显式选择。",
        "Paths are cwd-relative and checked as safe-relative; callers select output explicitly.",
      ],
      writes: [
        "运行读取所选元数据并可写所选结果文件；帮助不读取工作区。",
        "Runs read selected metadata and may write the selected result file; help does not inspect the workspace.",
      ],
      parsing: [
        "Node严格解析先于help，拒绝位置输入。评估执行要求input，help/version提前返回。重复带值选项取末值。",
        "Node strict parsing precedes help and rejects positionals. Evaluation requires input, while help/version return early. Repeated value options use the last value.",
      ],
      defaults: [
        "省略或空out将报告写stdout；非空out写所选路径，已有父目录由调用者准备。",
        "Omitted or empty out writes the report to stdout; nonempty out writes the selected path, whose parent directory is prepared by the caller.",
      ],
      offline: [
        "@hia-doc/htmdoc-runner/README.md",
        "@hia-doc/htmdoc-runner/README.md",
      ],
    }),
    displayVersion: {
      kind: "artifact",
      value: HTML_AUTHORING_DOCUMENTATION_HANDOFF_VERSION,
    },
    parsing: {
      helpOrder: "after-argument-validation",
      unknownOptions: "reject",
    },
    options: [
      {
        ...parameter(
          "input",
          "必填，仅读取这一份元数据JSON。",
          "Required; read only this metadata JSON.",
          {
            short: "i",
            metavar: "safe-relative-json",
            defaultRule: { kind: "not-applicable" },
          },
        ),
        required: true,
      },
      parameter(
        "out",
        "可选输出文件；省略时将结果写stdout。",
        "Optional output file; omission writes the result to stdout.",
        { short: "o", metavar: "safe-relative-json" },
      ),
      parameter("help", "输出帮助并退出0。", "Print help and exit 0.", {
        short: "h",
        valueType: "boolean",
        defaultRule: { kind: "not-applicable" },
      }),
      parameter(
        "version",
        "输出工件契约版本并退出0。",
        "Print artifact contract version and exit 0.",
        {
          short: "v",
          valueType: "boolean",
          defaultRule: { kind: "not-applicable" },
        },
      ),
    ],
    positionals: [],
    examples: ["htmdoc-handoff --input request.json"],
    effects: { filesystem: "read-write", network: "none" },
    exitCodes: [
      {
        code: 0,
        i18n: localized({
          summary: [
            "交接评估accepted、帮助或版本",
            "Accepted handoff, help or version",
          ],
          description: [
            "交接评估accepted、帮助或版本",
            "Accepted handoff, help or version",
          ],
        }),
      },
      {
        code: 1,
        i18n: localized({
          summary: [
            "交接评估refused或参数、读取、处理失败",
            "Refused handoff or argument, read or processing failure",
          ],
          description: [
            "交接评估refused或参数、读取、处理失败",
            "Refused handoff or argument, read or processing failure",
          ],
        }),
      },
    ],
    evidence: [],
  };
  // <lang><zh-CN>handoff参数有独立原生ID，保留真实名称同时避免两个help/version节点混淆。</zh-CN><en>Handoff parameters have independent native IDs, retaining actual names while distinguishing the two help/version nodes.</en></lang>
  for (const option of handoff.options)
    option.id = handoff.id + "." + option.name;
  return [build, handoff];
}
