import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new Error(
        `Missing ${command}. Install Tectonic and Poppler first (macOS: brew install tectonic poppler).`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.signal ?? `exit ${result.status}`}):\n${result.stderr}${result.stdout}`,
    );
  }
  return result.stdout;
}

export function buildResume({ root = projectRoot, run = runCommand } = {}) {
  const source = path.join(root, "resume.tex");
  if (!existsSync(source) || !statSync(source).isFile()) {
    throw new Error(
      `Missing resume source: ${source}. Place your local Overleaf source there; it is intentionally not checked in.`,
    );
  }

  const output = path.join(root, ".resume-build");
  mkdirSync(output, { recursive: true });
  const temporary = mkdtempSync(path.join(output, ".build-"));
  const temporaryPdf = path.join(temporary, "resume.pdf");
  const temporaryText = path.join(temporary, "resume.txt");
  const temporaryLog = path.join(temporary, "resume.log");
  const pdf = path.join(output, "resume.pdf");
  const textFile = path.join(output, "resume.txt");

  try {
    run("tectonic", ["--untrusted", "--keep-logs", "--outdir", temporary, source]);
    const information = run("pdfinfo", [temporaryPdf]);
    const pageMatch = information.match(/^Pages:\s+(\d+)\s*$/m);
    if (!pageMatch) {
      throw new Error("Could not determine PDF page count from pdfinfo.");
    }
    const pages = Number(pageMatch[1]);
    if (pages < 1 || pages > 2) {
      throw new Error(
        `Expected a one- or two-page resume; generated ${pages} pages. Shorten the content before rebuilding. The last successful PDF, if any, is unchanged.`,
      );
    }

    const text = run("pdftotext", [
      "-enc", "UTF-8", "-nopgbrk", temporaryPdf, "-",
    ]);
    if (!/\p{L}/u.test(text) || /[\uFB00-\uFB06\uFFFD]/u.test(text)) {
      throw new Error(
        "PDF text extraction is empty or contains replacement characters or typographic ligatures. Check font character mappings and disable common ligatures before submitting to an ATS.",
      );
    }
    writeFileSync(temporaryText, text);
    renameSync(temporaryPdf, pdf);
    renameSync(temporaryText, textFile);
    return { pdf, textFile, pages };
  } finally {
    try {
      if (existsSync(temporaryLog)) {
        copyFileSync(temporaryLog, path.join(output, "resume.log"));
      }
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) {
      throw new Error("Usage: npm run resume:build (reads the repository-root resume.tex)");
    }
    const { pdf, textFile, pages } = buildResume();
    console.log(`Built ${pdf} (${pages} ${pages === 1 ? "page" : "pages"}).\nExtracted text: ${textFile}`);
  } catch (error) {
    console.error(`Resume build failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
