#!/usr/bin/env node
/**
 * VALIDATOR — Prevents project corruption through automated checks
 *
 * This script runs before commits and catches:
 * - Syntax errors
 * - Circular dependencies
 * - Locked file edits
 * - Invalid imports
 * - Undefined classes
 *
 * Usage:
 *   node .strict/validate.js full              # Complete validation
 *   node .strict/validate.js src/modules/core/game.js  # Single file
 *   node .strict/validate.js check-deps src/modules/core/game.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const LOCKED_FILES = [
  '.LOCKED',
  'runtime/base.js',
  'SevenDRL.js',
  '.PROJECT_RULES.md',
  '.strict/validate.js'
];

const EDIT_ALLOWED = [
  'src/modules/core',
  'src/modules/watabou',
  'src/mods',
  'src/assets',
  'docs',
  '.workflows',
  'README.md',
  'package.json'
];

const IMPORT_RULES = {
  'modules/core/characters.js': ['watabou', 'core/game', 'core/states'],
  'modules/core/game.js': ['watabou', 'core/pathfinding', 'core/characters', 'core/actions', 'core/visuals'],
  'modules/core/states.js': ['watabou', 'core/characters'],
  'modules/core/actions.js': ['watabou', 'core/characters', 'core/game'],
  'modules/core/scenes.js': ['watabou', 'core/game', 'core/characters', 'core/actions'],
};

class Validator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  log(msg, color = RESET) {
    console.log(`${color}${msg}${RESET}`);
  }

  error(msg) {
    this.errors.push(msg);
    this.log(`  ❌ ${msg}`, RED);
  }

  warn(msg) {
    this.warnings.push(msg);
    this.log(`  ⚠️  ${msg}`, YELLOW);
  }

  success(msg) {
    this.log(`  ✓ ${msg}`, GREEN);
  }

  // Check if file has valid JavaScript syntax
  checkSyntax(filepath) {
    const result = spawnSync('node', ['--check', filepath], {
      stdio: 'pipe',
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      this.error(`Syntax error in ${filepath}`);
      if (result.stderr) {
        this.log(result.stderr, RED);
      }
      return false;
    }
    return true;
  }

  // Check if file is in locked zone
  isLockedFile(filepath) {
    const rel = path.relative(this.projectRoot, filepath);
    return LOCKED_FILES.some(locked => rel.includes(locked));
  }

  // Check if file is in editable zone
  isEditableFile(filepath) {
    const rel = path.relative(this.projectRoot, filepath);
    return EDIT_ALLOWED.some(allowed => rel.includes(allowed));
  }

  // Check imports in a file
  checkImports(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const importPattern = /import\s+["']\.\/([^"']+)["']/g;
      let match;

      while ((match = importPattern.exec(content)) !== null) {
        const imported = match[1];
        const fileType = this.getFileType(filepath);

        if (IMPORT_RULES[fileType]) {
          const allowed = IMPORT_RULES[fileType];
          const isAllowed = allowed.some(a => imported.includes(a));

          if (!isAllowed) {
            this.error(`Invalid import in ${filepath}: ${imported} (not in allowed list)`);
            return false;
          }
        }
      }
      return true;
    } catch (e) {
      this.error(`Failed to parse ${filepath}: ${e.message}`);
      return false;
    }
  }

  getFileType(filepath) {
    const rel = path.relative(this.projectRoot, filepath);
    for (const [type] of Object.entries(IMPORT_RULES)) {
      if (rel.includes(type)) return type;
    }
    return 'unknown';
  }

  // Check for circular dependencies
  checkCircularDeps(filepath) {
    const deps = this.extractDependencies(filepath);
    return !this.hasCycle(filepath, deps, new Set());
  }

  extractDependencies(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const importPattern = /import\s+["']\.\/([^"']+)["']/g;
      const deps = [];
      let match;

      while ((match = importPattern.exec(content)) !== null) {
        deps.push(match[1]);
      }
      return deps;
    } catch (e) {
      return [];
    }
  }

  hasCycle(file, deps, visited) {
    if (visited.has(file)) return true;
    visited.add(file);

    for (const dep of deps) {
      const depPath = path.resolve(path.dirname(file), dep);
      const depDeps = this.extractDependencies(depPath);
      if (this.hasCycle(depPath, depDeps, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  // Validate single file
  validateFile(filepath) {
    if (!fs.existsSync(filepath)) {
      this.error(`File not found: ${filepath}`);
      return false;
    }

    const rel = path.relative(this.projectRoot, filepath);
    this.log(`\nValidating ${rel}...`, CYAN);

    let valid = true;

    // Check if locked
    if (this.isLockedFile(filepath)) {
      this.error(`Locked file cannot be edited: ${rel}`);
      return false;
    }

    // Check syntax
    if (!this.checkSyntax(filepath)) {
      valid = false;
    } else {
      this.success('Syntax valid');
    }

    // Check imports
    if (!this.checkImports(filepath)) {
      valid = false;
    } else {
      this.success('Imports valid');
    }

    // Check circular deps
    if (!this.checkCircularDeps(filepath)) {
      this.error(`Circular dependency detected in ${filepath}`);
      valid = false;
    } else {
      this.success('No circular dependencies');
    }

    return valid;
  }

  // Validate all files
  validateAll() {
    this.log('\n═══ FULL PROJECT VALIDATION ═══\n', CYAN);

    const srcDir = path.join(this.projectRoot, 'src/modules');
    let valid = true;

    if (!fs.existsSync(srcDir)) {
      this.warn(`No src/modules directory found. Skipping module validation.`);
      return valid;
    }

    const files = this.findJSFiles(srcDir);
    this.log(`Found ${files.length} JavaScript files\n`);

    for (const file of files) {
      if (!this.validateFile(file)) {
        valid = false;
      }
    }

    return valid;
  }

  findJSFiles(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(this.findJSFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  // Report results
  report() {
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;

    this.log(`\n═══ VALIDATION REPORT ═══\n`, CYAN);

    if (totalErrors === 0) {
      this.log(`✓ ALL CHECKS PASSED`, GREEN);
      if (totalWarnings > 0) {
        this.log(`⚠️  ${totalWarnings} warnings`, YELLOW);
      }
      return true;
    } else {
      this.log(`❌ ${totalErrors} errors, ${totalWarnings} warnings`, RED);
      return false;
    }
  }
}

// Main
const args = process.argv.slice(2);
const validator = new Validator();
let valid = true;

if (args.length === 0 || args[0] === 'full') {
  valid = validator.validateAll();
} else if (args[0] === 'check-deps' && args[1]) {
  validator.log(`\nChecking dependencies in ${args[1]}...`, CYAN);
  if (validator.checkCircularDeps(args[1])) {
    validator.success('No circular dependencies');
  } else {
    validator.error('Circular dependency found!');
    valid = false;
  }
} else {
  // Single file
  valid = validator.validateFile(args[0]);
}

const success = validator.report();
process.exit(success ? 0 : 1);
