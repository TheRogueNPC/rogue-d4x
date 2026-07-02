#!/usr/bin/env node
/**
 * FIND-USAGE — Locate all usages of a class, method, or variable
 *
 * This script helps you understand the impact of changes by finding
 * every place a symbol is used in the codebase.
 *
 * Usage:
 *   node .strict/find-usage.js "Hero"
 *   node .strict/find-usage.js "com_watabou_sevendrl_characters_Hero"
 *   node .strict/find-usage.js "StateChasing"
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const modulesDir = path.join(projectRoot, 'src/modules');

if (process.argv.length < 3) {
  console.error('Usage: node .strict/find-usage.js <symbol-name>');
  console.error('Example: node .strict/find-usage.js "Hero"');
  process.exit(1);
}

const symbolToFind = process.argv[2];
let found = 0;

class UsageFinder {
  constructor(symbol) {
    this.symbol = symbol;
    this.results = [];
  }

  findJSFiles(dir) {
    let files = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(this.findJSFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      console.error(`Error reading ${dir}: ${e.message}`);
    }
    return files;
  }

  find() {
    if (!fs.existsSync(modulesDir)) {
      console.error(`Error: ${modulesDir} not found`);
      return false;
    }

    const files = this.findJSFiles(modulesDir);
    console.log(`\n🔍 Searching for "${this.symbol}" in ${files.length} files...\n`);

    for (const filepath of files) {
      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Look for the symbol in context
          if (this.matchesSymbol(line)) {
            const lineNum = i + 1;
            const relative = path.relative(projectRoot, filepath);

            this.results.push({
              file: relative,
              line: lineNum,
              content: line.trim()
            });

            console.log(`${relative}:${lineNum}`);
            console.log(`  ${line.trim()}\n`);
          }
        }
      } catch (e) {
        console.error(`Error reading ${filepath}: ${e.message}`);
      }
    }

    return this.results.length > 0;
  }

  matchesSymbol(line) {
    // Check for exact word match or as part of a class name
    const patterns = [
      new RegExp(`\\b${this.escapeRegex(this.symbol)}\\b`),
      new RegExp(`_${this.escapeRegex(this.symbol)}\\b`),
      new RegExp(`\\b${this.escapeRegex(this.symbol)}_`)
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  report() {
    console.log(`\n═══ RESULTS ═══\n`);

    if (this.results.length === 0) {
      console.log(`⚠️  "${this.symbol}" not found in any files`);
      return false;
    }

    // Group by file
    const byFile = {};
    for (const result of this.results) {
      if (!byFile[result.file]) {
        byFile[result.file] = [];
      }
      byFile[result.file].push(result);
    }

    console.log(`Found in ${Object.keys(byFile).length} files (${this.results.length} total occurrences):\n`);

    for (const [file, occurrences] of Object.entries(byFile)) {
      console.log(`  ${file} (${occurrences.length} occurrences)`);
    }

    console.log(`\nTo understand impact of changes:`);
    console.log(`  1. Review each file above`);
    console.log(`  2. Check if it's a definition or usage`);
    console.log(`  3. Update all usages if changing the definition`);
    console.log(`  4. Run validator: node .strict/validate.js full\n`);

    return true;
  }
}

const finder = new UsageFinder(symbolToFind);
const found = finder.find();
finder.report();

process.exit(found ? 0 : 1);
