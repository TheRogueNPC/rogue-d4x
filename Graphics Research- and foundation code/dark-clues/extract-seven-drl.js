#!/usr/bin/env node
// extract-seven-drl.js — Physically splits SevenDRL.js into feature modules.
// Unlike extract-modules.js (which expects pre-chunked files), this works
// directly on a monolithic Haxe-compiled bundle.
//
// Usage: node extract-seven-drl.js [--dry-run]

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const walk = require("acorn-walk");
const escope = require("eslint-scope");

const DRY_RUN = process.argv.includes("--dry-run");
const BASE_DIR = __dirname;
const BUNDLE = path.join(BASE_DIR, "SevenDRL.js");
const MANIFEST = path.join(BASE_DIR, "module-manifest.json");
const OUT_DIR = BASE_DIR; // modules/ paths in manifest are relative to BASE_DIR

// ── Load inputs ───────────────────────────────────────────────────────
const src = fs.readFileSync(BUNDLE, "utf8");
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const lines = src.split("\n");

console.log(`Bundle: ${src.length} bytes, ${lines.length} lines`);
console.log(`Manifest: ${Object.keys(manifest).length} target modules`);
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

// ── Parse the full bundle ─────────────────────────────────────────────
console.log("Parsing AST...");
const ast = acorn.parse(src, {
  ecmaVersion: "latest",
  sourceType: "script",
  locations: true,
  ranges: true,
  allowReturnOutsideFunction: true,
});
const scopeManager = escope.analyze(ast, {
  ecmaVersion: "latest",
  sourceType: "script",
  optimistic: false,
  ignoreEval: true,
});
console.log(`  AST: ${ast.body.length} top-level nodes`);
console.log(`  Scopes: ${scopeManager.scopes.length}\n`);

// ── Find all class registrations ──────────────────────────────────────
// $hxClasses["com.watabou.sevendrl.SevenDRL"] = com_watabou_sevendrl_SevenDRL;
// g["com.watabou.utils.ArrayExtender"] = X;
const classRegs = new Map(); // realName -> { minified, offset, line }
const regRe = /(?:\$hxClasses|g)\[\"([\w.]+)\"\]\s*=\s*([A-Za-z_$][\w$]*);/g;
let m;
while ((m = regRe.exec(src))) {
  classRegs.set(m[1], {
    minified: m[2],
    offset: m.index,
    line: src.slice(0, m.index).split("\n").length,
  });
}

// ── Find var declarations for each minified name ──────────────────────
// var com_watabou_sevendrl_SevenDRL = function() {
const varDeclRe = /^(var\s+([A-Za-z_$][\w$]*)\s*=\s*(function|\$hxEnums))/gm;
const varDecls = new Map(); // minifiedName -> { line, offset }
while ((m = varDeclRe.exec(src))) {
  varDecls.set(m[2], {
    line: src.slice(0, m.index).split("\n").length,
    offset: m.index,
  });
}

// ── Find __super__ assignments (for inheritance ordering) ──────────────
const superRe = /^([A-Za-z_$][\w$]*)\.__super__\s*=\s*([A-Za-z_$][\w$]*);/gm;
const inheritance = new Map(); // child -> parent
while ((m = superRe.exec(src))) {
  inheritance.set(m[1], m[2]);
}

// ── Resolve class spans ───────────────────────────────────────────────
// Each class starts at its var declaration and ends at the next class's
// var declaration (or end of file for the last one).
const allVarDecls = [...varDecls.entries()]
  .sort((a, b) => a[1].offset - b[1].offset);

function findClassEnd(minifiedName) {
  const idx = allVarDecls.findIndex(([name]) => name === minifiedName);
  if (idx === -1) return src.length;
  if (idx < allVarDecls.length - 1) {
    return allVarDecls[idx + 1][1].offset;
  }
  return src.length;
}

// Build realName -> span mapping
const classSpans = new Map(); // realName -> { start, end, minified, line }
for (const [realName, reg] of classRegs) {
  const varInfo = varDecls.get(reg.minified);
  if (!varInfo) {
    // Enum or registration without a var (e.g. ActionCard enum)
    // Find the $hxEnums line
    const enumRe = new RegExp(
      `\\$hxClasses\\["${realName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\"]\\s*=\\s*([A-Za-z_$][\\w$]*);`
    );
    const em = src.slice(reg.offset, reg.offset + 500).match(enumRe);
    if (em) {
      // The enum object itself — find the preceding `var X = $hxEnums[`
      const searchStart = Math.max(0, reg.offset - 2000);
      const preceding = src.slice(searchStart, reg.offset);
      const enumVarRe = new RegExp(
        `var\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*\\$hxEnums\\["${realName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\"]`
      );
      const evm = preceding.match(enumVarRe);
      if (evm) {
        const enumStart = searchStart + preceding.lastIndexOf(evm[0]);
        const enumMinified = evm[1];
        const endIdx = allVarDecls.findIndex(([name]) => name === enumMinified);
        const end = endIdx < allVarDecls.length - 1 ? allVarDecls[endIdx + 1][1].offset : src.length;
        classSpans.set(realName, {
          start: enumStart,
          end,
          minified: enumMinified,
          line: src.slice(0, enumStart).split("\n").length,
        });
      }
    }
    continue;
  }

  classSpans.set(realName, {
    start: varInfo.offset,
    end: findClassEnd(reg.minified),
    minified: reg.minified,
    line: varInfo.line,
  });
}

console.log(`Resolved ${classSpans.size} class spans\n`);

// ── Group classes by target module ────────────────────────────────────
const moduleAssignments = new Map(); // targetFile -> [{ realName, span }]
const unassigned = [];

for (const [realName, span] of classSpans) {
  let found = false;
  for (const [targetFile, classes] of Object.entries(manifest)) {
    if (classes.includes(realName)) {
      if (!moduleAssignments.has(targetFile)) moduleAssignments.set(targetFile, []);
      moduleAssignments.get(targetFile).push({ realName, span });
      found = true;
      break;
    }
  }
  if (!found) unassigned.push({ realName, span });
}

// Sort classes within each module by their position in the source
for (const [targetFile, classes] of moduleAssignments) {
  classes.sort((a, b) => a.span.start - b.span.start);
}

console.log("Module assignments:");
let totalAssigned = 0;
for (const [targetFile, classes] of [...moduleAssignments.entries()].sort()) {
  console.log(`  ${targetFile}: ${classes.length} classes`);
  totalAssigned += classes.length;
}
console.log(`  (unassigned/runtime): ${unassigned.length} classes`);
console.log(`  Total assigned: ${totalAssigned}\n`);

// ── Detect cross-module dependencies ──────────────────────────────────
// For each module, find which other modules it references
const moduleDeps = new Map(); // targetFile -> Set<otherTargetFile>

for (const [targetFile, classes] of moduleAssignments) {
  const deps = new Set();
  const assignedNames = new Set(classes.map(c => c.realName));

  for (const cls of classes) {
    // Check constructor calls, prototype methods, etc.
    const body = src.slice(cls.span.start, cls.span.end);
    // Find references to other registered class minified names
    for (const [otherRealName, otherReg] of classRegs) {
      if (otherRealName === cls.realName) continue;
      if (body.includes(otherReg.minified)) {
        // Find which module owns this
        for (const [otherFile, otherClasses] of moduleAssignments) {
          if (otherFile === targetFile) continue;
          if (otherClasses.some(c => c.realName === otherRealName)) {
            deps.add(otherFile);
          }
        }
      }
    }
  }
  moduleDeps.set(targetFile, deps);
}

console.log("Cross-module dependencies:");
for (const [targetFile, deps] of [...moduleDeps.entries()].sort()) {
  if (deps.size > 0) {
    console.log(`  ${targetFile} -> ${[...deps].join(", ")}`);
  }
}
console.log();

// ── Write module files ────────────────────────────────────────────────
let filesWritten = 0;

for (const [targetFile, classes] of moduleAssignments) {
  const outPath = path.join(OUT_DIR, targetFile);
  let body = "";

  // Add module header comment
  const moduleShortName = path.basename(targetFile, ".js");
  body += `// ═══════════════════════════════════════════════════════════════════\n`;
  body += `// ${moduleShortName.toUpperCase()} — ${targetFile}\n`;
  body += `// Extracted from SevenDRL.js by extract-seven-drl.js\n`;
  body += `// Classes: ${classes.map(c => c.realName.split(".").pop()).join(", ")}\n`;
  body += `// ═══════════════════════════════════════════════════════════════════\n\n`;

  for (const cls of classes) {
    const originalLine = cls.span.line;
    const bodyText = src.slice(cls.span.start, cls.span.end);
    const shortName = cls.realName.split(".").pop();

    // Add class header comment
    body += `// ─── ${shortName} (${cls.realName}) ─── line ${originalLine} ───\n`;
    body += bodyText;
    body += `\n`;
  }

  // Add footer
  body += `\n// ═══ END ${targetFile} ═══\n`;

  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, body);
  }
  filesWritten++;
  console.log(`  ${DRY_RUN ? "[dry]" : "[write]"} ${outPath} (${classes.length} classes, ${body.length} bytes)`);
}

// ── Write base/runtime file (everything not assigned) ─────────────────
// Build the runtime portion by removing assigned class spans from the source
let runtimeBody = "";
let lastEnd = 0;

// Sort all assigned spans by start position
const allAssignedSpans = [];
for (const [, classes] of moduleAssignments) {
  for (const cls of classes) {
    allAssignedSpans.push(cls.span);
  }
}
allAssignedSpans.sort((a, b) => a.start - b.start);

// Collect runtime-only spans (gaps between assigned classes)
for (const span of allAssignedSpans) {
  if (span.start > lastEnd) {
    runtimeBody += src.slice(lastEnd, span.start);
  }
  lastEnd = span.end;
}
if (lastEnd < src.length) {
  runtimeBody += src.slice(lastEnd);
}

// Add header
const runtimeHeader = `// ═══════════════════════════════════════════════════════════════════
// RUNTIME — Base engine + unassigned classes
// Extracted from SevenDRL.js by extract-seven-drl.js
// Contains: Lime/OpenFL runtime, Haxe stdlib, msignal, and
//           unclassified utility classes
// ═══════════════════════════════════════════════════════════════════\n\n`;

const runtimeOut = path.join(OUT_DIR, "runtime", "base.js");
if (!DRY_RUN) {
  fs.mkdirSync(path.dirname(runtimeOut), { recursive: true });
  fs.writeFileSync(runtimeOut, runtimeHeader + runtimeBody);
}
console.log(`  ${DRY_RUN ? "[dry]" : "[write]"} ${runtimeOut} (${runtimeBody.length} bytes)`);

// ── Write index.js that re-exports everything ─────────────────────────
let indexBody = `// ═══════════════════════════════════════════════════════════════════\n`;
indexBody += `// INDEX — Module entry point for Dark Clues\n`;
indexBody += `// Generated by extract-seven-drl.js\n`;
indexBody += `// ═══════════════════════════════════════════════════════════════════\n\n`;
indexBody += `// Runtime base (must load first)\n`;
indexBody += `import "./runtime/base.js";\n\n`;

for (const [targetFile] of [...moduleAssignments.keys()].sort()) {
  indexBody += `import "./${targetFile}";\n`;
}

if (!DRY_RUN) {
  fs.writeFileSync(path.join(OUT_DIR, "index.js"), indexBody);
}
console.log(`  ${DRY_RUN ? "[dry]" : "[write]"} modules/index.js`);

// ── Write dependency graph ────────────────────────────────────────────
let depGraph = `# Module Dependency Graph\n\n`;
for (const [targetFile, deps] of [...moduleDeps.entries()].sort()) {
  depGraph += `## ${targetFile}\n`;
  if (deps.size === 0) {
    depGraph += `No cross-module dependencies.\n\n`;
  } else {
    depGraph += `Depends on:\n`;
    for (const dep of deps) {
      depGraph += `- ${dep}\n`;
    }
    depGraph += `\n`;
  }
}

if (!DRY_RUN) {
  fs.writeFileSync(path.join(OUT_DIR, "DEPENDENCIES.md"), depGraph);
}
console.log(`  ${DRY_RUN ? "[dry]" : "[write]"} modules/DEPENDENCIES.md`);

console.log(`\nDone. ${filesWritten} module files + 1 runtime base + 1 index.`);
if (DRY_RUN) console.log("(Dry run — no files written)");
