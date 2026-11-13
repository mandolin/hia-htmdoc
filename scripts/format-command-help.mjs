/**
 * @file
 * @lang zh-CN 按已确认HTMDoc两画布从命令字段生成纯文本帮助，复用主CLI已验收的显示列规则。
 * @lang en Generate plain-text help from command fields on the confirmed HTMDoc canvases, reusing the main CLI's verified display-column rules.
 */

/** @lang zh-CN 估算本帮助中英文的显示列，组合音标不增加列。
 * @lang en Estimate columns for this help's Chinese/English text, with combining marks adding no columns.
 */
export function columns(text) {
  return Array.from(text).reduce((width, character) => {
    const code = character.codePointAt(0);
    if (/\p{Mark}/u.test(character) || code === 0x200d) return width;
    return (
      width +
      ((code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe6f) ||
      (code >= 0xff01 && code <= 0xff60) ||
      code >= 0x1f300
        ? 2
        : 1)
    );
  }, 0);
}

/** @lang zh-CN 保留词边界并在超长片段按码点折行，首行及续行缩进分别控制。
 * @lang en Preserve word boundaries and split oversized tokens by code point, controlling first and continuation indentation separately.
 */
function wrap(text, width, prefix = "", continuation = prefix + "  ") {
  const lines = [];
  let line = prefix;
  let hasContent = false;
  for (const token of text.split(/\s+/u)) {
    if (!token) continue;
    const space = hasContent ? " " : "";
    if (columns(line + space + token) <= width) {
      line += space + token;
      hasContent = true;
      continue;
    }
    if (hasContent) {
      lines.push(line);
      line = continuation;
      hasContent = false;
    }
    for (const character of token) {
      if (columns(line + character) > width) {
        lines.push(line);
        line = continuation;
      }
      line += character;
      hasContent = true;
    }
  }
  if (hasContent) lines.push(line);
  return lines;
}

/** @lang zh-CN 按本字段实际语言取正文。
 * @lang en Read prose from the field's actual locale.
 */
function text(model, field, locale) {
  return model.fields[field].localizedText[locale];
}

/** @lang zh-CN 两画布共享短文同行规则，长文逐语言分行。
 * @lang en Share compact bilingual-line rules across canvases, separating longer text by locale.
 */
function prose(model, field, width, indent = "") {
  const zh = text(model, field, "zh-CN");
  const en = text(model, field, "en");
  return columns(indent + zh + " / " + en) <= 80
    ? wrap(zh + " / " + en, width, indent)
    : [...wrap(zh, width, indent), ...wrap(en, width, indent)];
}

/**
 * @lang zh-CN 从单一HTMDoc命令描述生成80或120列帮助，无来源读取或命令执行。
 * @lang en Render 80- or 120-column help from one HTMDoc command description without source reads or command execution.
 * @param {object} command <lang><zh-CN>完整共享命令内容。</zh-CN><en>Complete shared command content.</en></lang>
 * @param {number} width <lang><zh-CN>确认的80或120列。</zh-CN><en>Confirmed 80 or 120 columns.</en></lang>
 * @returns {string} <lang><zh-CN>含结尾换行的纯文本。</zh-CN><en>Plain text with a final newline.</en></lang>
 */
export function formatHtmDocHelp(command, width) {
  if (command.id === "htmdoc-handoff") return formatHandoffHelp(command, width);
  if (![80, 120].includes(width))
    throw new TypeError("Unsupported help canvas.");
  const lines = [
    "HIA-Documentation-Sys · htmdoc",
    ...prose(command.i18n, "summary", width),
    "",
    "用法 / Usage",
    "  " + text(command.i18n, "configUsage", "en"),
    "  " + command.signature,
    "",
    "参数 / Options",
  ];
  for (const option of command.options) {
    const name = option.short
      ? "  -" + option.short + ", --" + option.name
      : "      --" + option.name;
    const label =
      option.valueType === "boolean"
        ? name
        : name + " <" + text(option.i18n, "metavar", "en") + ">";
    lines.push(
      ...wrap(
        label.trimStart(),
        width,
        " ".repeat(label.length - label.trimStart().length),
      ),
      ...prose(option.i18n, "description", width, "    "),
    );
  }
  lines.push("", "位置输入 / Positional inputs");
  for (const input of command.positionals)
    lines.push(
      "  <" + text(input.i18n, "metavar", "en") + ">",
      ...prose(input.i18n, "description", width, "    "),
    );
  lines.push("", "配置与副作用 / Configuration and effects");
  for (const field of [
    "configOverrides",
    "directOnly",
    "paths",
    "writes",
    "parsing",
  ])
    lines.push(...prose(command.i18n, field, width, "  "));
  lines.push("", "退出码 / Exit codes");
  for (const exit of command.exitCodes)
    lines.push(
      ...wrap(
        text(exit.i18n, "summary", "zh-CN") +
          " / " +
          text(exit.i18n, "summary", "en"),
        width,
        "  " + exit.code + " ",
        "    ",
      ),
    );
  lines.push("", "示例 / Example");
  for (const example of command.examples)
    lines.push(...wrap(example, width, "  "));
  lines.push(
    "",
    "离线完整说明 / Complete offline reference",
    "  " + text(command.i18n, "offline", "en"),
  );
  return lines.join("\n") + "\n";
}

/**
 * @lang zh-CN 按已确认handoff两画布呈现工件版本、四选项和元数据交接效果。
 * @lang en Render artifact version, four options and metadata handoff effects on the confirmed handoff canvases.
 * @param {object} command <lang><zh-CN>同一handoff字段内容。</zh-CN><en>Shared handoff field content.</en></lang>
 * @param {number} width <lang><zh-CN>80或120显示列。</zh-CN><en>80 or 120 display columns.</en></lang>
 * @returns {string} <lang><zh-CN>完整纯文本帮助。</zh-CN><en>Complete plain-text help.</en></lang>
 */
function formatHandoffHelp(command, width) {
  if (![80, 120].includes(width))
    throw new TypeError("Unsupported help canvas.");
  const lines = [
    "HIA-Documentation-Sys · htmdoc-handoff",
    ...prose(command.i18n, "summary", width),
    "",
    "版本身份 / Version identity",
    ...prose(command.i18n, "versionIdentity", width, "  "),
    "",
    "用法 / Usage",
    ...wrap(command.signature, width, "  "),
    "",
    "参数 / Options",
  ];
  for (const option of command.options) {
    const name = "  -" + option.short + ", --" + option.name;
    lines.push(
      name +
        (option.valueType === "boolean"
          ? ""
          : " <" + text(option.i18n, "metavar", "en") + ">"),
      ...(option.valueType === "boolean"
        ? prose(option.i18n, "description", width, "    ")
        : [
            ...wrap(text(option.i18n, "description", "zh-CN"), width, "    "),
            ...wrap(text(option.i18n, "description", "en"), width, "    "),
          ]),
    );
  }
  lines.push(
    "",
    "路径与副作用 / Paths and effects",
    ...prose(command.i18n, "paths", width, "  "),
    ...prose(command.i18n, "writes", width, "  "),
    "",
    "退出码 / Exit codes",
  );
  for (const exit of command.exitCodes) {
    const zh = text(exit.i18n, "summary", "zh-CN");
    const en = text(exit.i18n, "summary", "en");
    if (columns("  " + exit.code + " " + zh + " / " + en) <= 80)
      lines.push("  " + exit.code + " " + zh + " / " + en);
    else
      lines.push(
        ...wrap(zh, width, "  " + exit.code + " ", "    "),
        ...wrap(en, width, "    "),
      );
  }
  lines.push(
    "",
    "离线完整说明 / Complete offline reference",
    "  " + text(command.i18n, "offline", "en"),
  );
  return lines.join("\n") + "\n";
}
