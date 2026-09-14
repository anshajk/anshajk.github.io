import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildResume, runCommand } from "./build-resume.mjs";

function fixture(t, { pages = 1, text = "Example Candidate\nExperience\n", compileError } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "resume build test "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, "resume.tex"), "\\documentclass{article}");
  const calls = [];
  const run = (command, args) => {
    calls.push({ command, args });
    if (command === "tectonic") {
      const output = args[args.indexOf("--outdir") + 1];
      writeFileSync(path.join(output, "resume.log"), "Compiler diagnostics");
      if (compileError) throw new Error(compileError);
      writeFileSync(path.join(output, "resume.pdf"), "Example PDF");
      return "";
    }
    if (command === "pdfinfo") return `Pages: ${pages}\n`;
    if (command === "pdftotext") return text;
    throw new Error(`Unexpected command: ${command}`);
  };
  return { root, run, calls, output: path.join(root, ".resume-build") };
}

test("builds a one-page PDF and text with space-containing paths", (t) => {
  const { root, run, calls, output } = fixture(t);
  const result = buildResume({ root, run });
  assert.equal(result.pages, 1);
  assert.equal(readFileSync(result.pdf, "utf8"), "Example PDF");
  assert.equal(readFileSync(result.textFile, "utf8"), "Example Candidate\nExperience\n");
  assert.deepEqual(calls.map(({ command }) => command), ["tectonic", "pdfinfo", "pdftotext"]);
  assert.ok(calls[0].args.includes("--untrusted"));
  assert.equal(calls[0].args.at(-1), path.join(root, "resume.tex"));
  assert.deepEqual(readdirSync(output).sort(), ["resume.log", "resume.pdf", "resume.txt"]);
});

test("missing private source fails before running tools", (t) => {
  const { root, run, calls } = fixture(t);
  rmSync(path.join(root, "resume.tex"));
  assert.throws(() => buildResume({ root, run }), /Missing resume source/);
  assert.equal(calls.length, 0);
});

test("allows a readable two-page resume", (t) => {
  const { root, run, output } = fixture(t, { pages: 2 });
  assert.equal(buildResume({ root, run }).pages, 2);
  assert.ok(existsSync(path.join(output, "resume.pdf")));
});

test("more than two pages fail without replacing the last successful output", (t) => {
  const { root, run, output } = fixture(t, { pages: 3 });
  mkdirSync(output);
  writeFileSync(path.join(output, "resume.pdf"), "Previous PDF");
  writeFileSync(path.join(output, "resume.txt"), "Previous text");
  assert.throws(() => buildResume({ root, run }), /generated 3 pages/);
  assert.equal(readFileSync(path.join(output, "resume.pdf"), "utf8"), "Previous PDF");
  assert.equal(readFileSync(path.join(output, "resume.txt"), "utf8"), "Previous text");
  assert.deepEqual(readdirSync(output).sort(), ["resume.log", "resume.pdf", "resume.txt"]);
});

test("unreadable page count fails explicitly", (t) => {
  const { root, run } = fixture(t);
  const invalidInfo = (command, args) => command === "pdfinfo" ? "Invalid metadata" : run(command, args);
  assert.throws(() => buildResume({ root, run: invalidInfo }), /Could not determine PDF page count/);
});

for (const text of [" \n\f", "Example \uFFFD Candidate", "Air\uFB02ow"]) {
  test(`rejects unusable extracted text: ${JSON.stringify(text)}`, (t) => {
    const { root, run, output } = fixture(t, { text });
    assert.throws(() => buildResume({ root, run }), /PDF text extraction/);
    assert.ok(!existsSync(path.join(output, "resume.pdf")));
  });
}

test("compiler failure preserves diagnostics and cleans temporary files", (t) => {
  const { root, run, output } = fixture(t, { compileError: "Invalid LaTeX" });
  assert.throws(() => buildResume({ root, run }), /Invalid LaTeX/);
  assert.deepEqual(readdirSync(output), ["resume.log"]);
  assert.equal(readFileSync(path.join(output, "resume.log"), "utf8"), "Compiler diagnostics");
});

test("missing dependencies include installation instructions", () => {
  assert.throws(
    () => runCommand("resume-test-nonexistent-command", []),
    /Missing .*brew install tectonic poppler/,
  );
});

test("command failures surface their exit status and diagnostics", () => {
  assert.throws(
    () => runCommand(process.execPath, ["-e", "process.stderr.write('Example failure'); process.exit(3)"]),
    /exit 3[\s\S]*Example failure/,
  );
});
