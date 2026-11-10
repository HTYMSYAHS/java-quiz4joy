// Isolated Java runs. Learner code is never executed on the host.
//
// The public Piston API (emkc.org) has been whitelist-only since 15 Feb 2026,
// so this client uses the public Judge0 CE instance. Multi-file programs go in
// as language 89: a zip with bash `compile` / `run` scripts plus the .java files.
// Judge0 compiles them in its own sandbox (javac / java), with a short CPU limit,
// no network, and stdin only. Code leaves the browser. The shared instance is
// rate-limited and sometimes busy.

const JUDGE0_URL = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";
const MAX_FILES = 6;
const MAX_CHARS = 100_000;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

export function zipStore(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(name.length), u16(0),
      name, data,
    ]);
    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(offset), name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concat(centrals);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0),
    u16(files.length), u16(files.length),
    u32(centralDir.length), u32(offset), u16(0),
  ]);
  return concat([...locals, centralDir, end]);
}

export function toBase64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function preflightJava(files) {
  const errors = [];
  if (!files?.length) errors.push("Add a Java file before running.");
  if (files.length > MAX_FILES) errors.push(`Use at most ${MAX_FILES} files (the main file plus 5 others).`);
  const seen = new Set();
  for (const file of files || []) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*\.java$/.test(file.name || "")) {
      errors.push(`${file.name || "(unnamed)"} should be named like Student.java.`);
    }
    if (seen.has(file.name)) errors.push(`Duplicate file ${file.name}.`);
    seen.add(file.name);
    if ((file.content || "").length > MAX_CHARS) errors.push(`${file.name} is too large to send.`);
    if (/^\s*package\s+/m.test(file.content || "")) {
      errors.push(`${file.name} has a package statement. The sandbox compiles in the default package.`);
    }
    const className = String(file.name || "").replace(/\.java$/, "");
    const publics = [...String(file.content || "").matchAll(/public\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)].map((match) => match[1]);
    if (publics.length > 1) errors.push(`${file.name} has more than one public class.`);
    if (publics.length === 1 && publics[0] !== className) {
      errors.push(`${file.name} declares public class ${publics[0]}. Rename the file to ${publics[0]}.java.`);
    }
  }
  return errors;
}

function runScript(mainClass) {
  if (mainClass) return `#!/bin/bash\njava ${mainClass}\n`;
  return `#!/bin/bash
MAIN=$(grep -l "public static void main" *.java | head -1)
CLASS=$(basename "$MAIN" .java)
java "$CLASS"
`;
}

export async function runJava({ files, stdin = "", mainClass = "" }) {
  const local = preflightJava(files);
  if (local.length) {
    return { ok: false, status: "Not sent", stdout: "", stderr: "", compile: local.join("\n"), time: null };
  }
  const payloadFiles = [
    { name: "compile", content: "#!/bin/bash\njavac *.java\n" },
    { name: "run", content: runScript(mainClass) },
    ...files.map((file) => ({ name: file.name, content: file.content ?? "" })),
  ];
  const additional = toBase64(zipStore(payloadFiles));
  let response;
  try {
    response = await fetch(JUDGE0_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language_id: 89,
        additional_files: additional,
        stdin: stdin ?? "",
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    const message = error?.name === "TimeoutError"
      ? "The sandbox did not answer within 25 seconds. The public Judge0 instance may be busy."
      : `Could not reach the sandbox (${error?.message || "network error"}).`;
    return { ok: false, status: "Unavailable", stdout: "", stderr: "", compile: message, time: null };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const hint = response.status === 429
      ? "The public Judge0 instance is rate-limiting this browser. Wait a minute and try again."
      : `Sandbox returned HTTP ${response.status}. ${text.slice(0, 180)}`;
    return { ok: false, status: "Unavailable", stdout: "", stderr: "", compile: hint, time: null };
  }
  const data = await response.json();
  return {
    ok: data.status?.id === 3,
    status: data.status?.description || "Unknown",
    stdout: data.stdout || "",
    stderr: data.stderr || "",
    compile: data.compile_output || "",
    time: data.time ?? null,
    memory: data.memory ?? null,
  };
}

export function formatRun(result) {
  const chunks = [];
  if (result.compile) chunks.push(result.compile.trimEnd());
  if (result.stderr) chunks.push(result.stderr.trimEnd());
  if (result.stdout) chunks.push(result.stdout.replace(/\s+$/, ""));
  if (!chunks.length) chunks.push(result.ok ? "(no output)" : `(${result.status})`);
  return chunks.join("\n");
}

export function explainCompilerText(text) {
  const source = String(text || "");
  const notes = [];
  if (/cannot find symbol/.test(source)) notes.push("cannot find symbol: a name is used before it is declared, or the spelling does not match the field, method, or class.");
  if (/';' expected/.test(source)) notes.push("';' expected: a statement is missing its semicolon, or a bracket is in the wrong place.");
  if (/class .* is public, should be declared in a file named/.test(source)) notes.push("A public class must live in a file of the same name.");
  if (/reached end of file while parsing/.test(source)) notes.push("A brace was opened and never closed.");
  if (/incompatible types/.test(source)) notes.push("incompatible types: the value being assigned does not match the variable's type.");
  if (/missing return statement/.test(source)) notes.push("A method that returns a value needs a return on every path.");
  if (/variable .* might not have been initialized/.test(source)) notes.push("Give the local variable a value before reading it.");
  if (!notes.length && source.trim()) notes.push("Read the first javac line: it names the file and the line number.");
  return notes;
}
