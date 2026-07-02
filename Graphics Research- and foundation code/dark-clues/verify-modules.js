#!/usr/bin/env node
// verify-modules.js — Validates extracted module files:
// 1. Every .js file parses as valid JavaScript
// 2. Class registrations match the original bundle
// 3. No duplicate class assignments

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

const BASE_DIR = __dirname;
const MODULES_DIR = path.join(BASE_DIR, "modules");
const BUNDLE = path.join(BASE_DIR, "SevenDRL.js");

console.log("=== Module Verification ===\n");

// 1. Count all class registrations in original bundle
const bundleSrc = fs.readFileSync(BUNDLE, "utf8");
const regRe = /(?:\$hxClasses|g)\[\"([\w.]+)\"\]\s*=\s*([A-Za-z_$][\w$]*);/g;
const originalRegs = new Map();
let m;
while ((m = regRe.exec(bundleSrc))) {
  originalRegs.set(m[1], m[2]);
}
console.log(`Original bundle: ${originalRegs.size} class registrations`);

// 2. Find all extracted module files
function findJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findJsFiles(full));
    } else if (entry.name.endsWith(".js")) {
      out.push(full);
    }
  }
  return findJsFiles(MODULES_DIR);
}

// Fix: just call findJsFiles directly
const moduleFiles = [];
function collectFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full);
    } else if (entry.name.endsWith(".js")) {
      moduleFiles.push(full);
    }
  }
}
collectFiles(MODULES_DIR);

console.log(`Extracted modules: ${moduleFiles.length} files\n`);

// 3. Parse each module file and count class registrations
let totalRegs = 0;
let parseErrors = 0;
const allRegs = new Map(); // realName -> file

for (const file of moduleFiles) {
  const rel = path.relative(BASE_DIR, file);
  const src = fs.readFileSync(file, "utf8");

  // Try parsing
  try {
    acorn.parse(src, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowReturnOutsideFunction: true,
    });
  } catch (e) {
    console.log(`  PARSE FAIL: ${rel}: ${e.message}`);
    parseErrors++;
    continue;
  }

  // Count class registrations
  const fileRegs = [];
  const fileRegRe = /(?:\$hxClasses|g)\[\"([\w.]+)\"\]\s*=\s*([A-Za-z_$][\w$]*);/g;
  let fm;
  while ((fm = fileRegRe.exec(src))) {
    fileRegs.push(fm[1]);
    if (allRegs.has(fm[1])) {
      console.log(`  DUPLICATE: ${fm[1]} in ${rel} (also in ${allRegs.get(fm[1])})`);
    }
    allRegs.set(fm[1], rel);
  }
  totalRegs += fileRegs.length;

  const lines = src.split("\n").length;
  const size = (src.length / 1024).toFixed(1);
  console.log(`  ${rel}: ${fileRegs.length} classes, ${lines} lines, ${size} KB`);
}

console.log(`\nTotal class registrations in modules: ${totalRegs}`);
console.log(`Original bundle registrations: ${originalRegs.size}`);
console.log(`Difference: ${totalRegs - originalRegs.size} (negative = some classes not extracted)`);

// 4. Check which classes from the bundle are missing
const missing = [];
for (const [realName] of originalRegs) {
  if (!allRegs.has(realName)) {
    missing.push(realName);
  }
}
if (missing.length > 0) {
  console.log(`\nMissing from modules (${missing.length}):`);
  for (const name of missing.slice(0, 20)) {
    console.log(`  - ${name}`);
  }
  if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`);
}

// 5. Summary
console.log(`\n=== Summary ===`);
console.log(`Parse errors: ${parseErrors}`);
console.log(`Duplicate registrations: ${totalRegs - allRegs.size}`);
console.log(`Missing classes: ${missing.length}`);
console.log(`Status: ${parseErrors === 0 && missing.length === 0 ? "ALL GOOD" : "ISSUES FOUND"}`);
