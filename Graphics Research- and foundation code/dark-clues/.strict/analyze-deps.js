#!/usr/bin/env node
/**
 * ANALYZE-DEPS — Generates dependency graph and usage analysis
 *
 * This script builds a complete dependency map of the codebase, allowing
 * us to detect circular dependencies, find unused code, and visualize
 * the import graph.
 *
 * Output files:
 * - .dependencies/dependency-graph.json
 * - .dependencies/usage.json
 * - .dependencies/graph.txt (human-readable)
 *
 * Usage:
 *   node .strict/analyze-deps.js           # Generate fresh analysis
 *   node .strict/analyze-deps.js --watch    # Watch for changes
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const depsDir = path.join(projectRoot, '.dependencies');
const modulesDir = path.join(projectRoot, 'src/modules');

// Ensure .dependencies directory exists
if (!fs.existsSync(depsDir)) {
  fs.mkdirSync(depsDir, { recursive: true });
}

class DependencyAnalyzer {
  constructor() {
    this.files = new Map();
    this.graph = {};
    this.usage = {};
    this.errors = [];
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

  extractImports(content) {
    const imports = [];
    const importPattern = /import\s+["'](\.\/[^"']+)["']/g;
    let match;

    while ((match = importPattern.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  extractClasses(content) {
    const classes = [];
    const classPattern = /(?:var|const)\s+([a-zA-Z_]\w*)\s*=/g;
    let match;

    while ((match = classPattern.exec(content)) !== null) {
      classes.push(match[1]);
    }

    return classes;
  }

  extractUsages(content) {
    const usages = [];
    const usagePattern = /([a-zA-Z_]\w+)\s*\./g;
    let match;
    const seen = new Set();

    while ((match = usagePattern.exec(content)) !== null) {
      const usage = match[1];
      if (!seen.has(usage)) {
        usages.push(usage);
        seen.add(usage);
      }
    }

    return usages;
  }

  analyze() {
    console.log('🔍 Analyzing dependencies...\n');

    if (!fs.existsSync(modulesDir)) {
      console.error(`Error: ${modulesDir} not found`);
      return false;
    }

    const files = this.findJSFiles(modulesDir);
    console.log(`Found ${files.length} JavaScript files\n`);

    for (const filepath of files) {
      const relative = path.relative(projectRoot, filepath);
      console.log(`  Analyzing ${relative}...`);

      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const imports = this.extractImports(content);
        const classes = this.extractClasses(content);
        const usages = this.extractUsages(content);

        this.graph[relative] = {
          imports,
          classes,
          usages,
          size: content.length
        };

        // Track class usage
        for (const cls of classes) {
          if (!this.usage[cls]) {
            this.usage[cls] = {
              definedIn: relative,
              usedBy: []
            };
          }
        }

      } catch (e) {
        this.errors.push(`${relative}: ${e.message}`);
        console.error(`    ❌ Error: ${e.message}`);
      }
    }

    // Find usages
    for (const [filepath, data] of Object.entries(this.graph)) {
      for (const usage of data.usages) {
        if (this.usage[usage]) {
          this.usage[usage].usedBy.push(filepath);
        }
      }
    }

    this.saveDependencyGraph();
    this.saveUsage();
    this.saveHumanReadableGraph();

    console.log('\n✓ Analysis complete\n');
    return true;
  }

  saveDependencyGraph() {
    const file = path.join(depsDir, 'dependency-graph.json');
    fs.writeFileSync(file, JSON.stringify(this.graph, null, 2));
    console.log(`✓ Saved: ${path.relative(this.projectRoot, file)}`);
  }

  saveUsage() {
    const file = path.join(depsDir, 'usage.json');
    fs.writeFileSync(file, JSON.stringify(this.usage, null, 2));
    console.log(`✓ Saved: ${path.relative(this.projectRoot, file)}`);
  }

  saveHumanReadableGraph() {
    let text = '# Dependency Graph\n\n';
    text += 'Generated: ' + new Date().toISOString() + '\n\n';

    text += '## Files and Dependencies\n\n';

    const sortedFiles = Object.keys(this.graph).sort();
    for (const file of sortedFiles) {
      const data = this.graph[file];
      text += `### ${file}\n`;
      text += `Size: ${(data.size / 1024).toFixed(1)} KB\n`;

      if (data.imports.length > 0) {
        text += `**Imports:**\n`;
        for (const imp of data.imports) {
          text += `  - ${imp}\n`;
        }
      }

      if (data.classes.length > 0) {
        text += `**Exports (Classes):**\n`;
        for (const cls of data.classes) {
          text += `  - ${cls}\n`;
        }
      }

      text += '\n';
    }

    text += '## Class Usage\n\n';
    const sortedClasses = Object.keys(this.usage).sort();
    for (const cls of sortedClasses) {
      const data = this.usage[cls];
      text += `### ${cls}\n`;
      text += `Defined in: ${data.definedIn}\n`;
      if (data.usedBy.length > 0) {
        text += `Used by:\n`;
        for (const user of data.usedBy) {
          text += `  - ${user}\n`;
        }
      } else {
        text += `⚠️  Not used anywhere (dead code?)\n`;
      }
      text += '\n';
    }

    const file = path.join(depsDir, 'graph.txt');
    fs.writeFileSync(file, text);
    console.log(`✓ Saved: ${path.relative(this.projectRoot, file)}`);
  }
}

// Run analysis
const analyzer = new DependencyAnalyzer();
const success = analyzer.analyze();

if (!success) {
  process.exit(1);
}

console.log('Files saved to .dependencies/');
console.log('\nUsage:');
console.log('  cat .dependencies/graph.txt          # View human-readable graph');
console.log('  cat .dependencies/dependency-graph.json  # View JSON graph');
