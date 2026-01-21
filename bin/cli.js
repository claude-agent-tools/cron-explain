#!/usr/bin/env node

/**
 * cron-explain CLI - Explain cron expressions from the command line
 */

const { parse, explain, validate, nextOccurrences, expandPreset, presets } = require('../lib/index.js');

const VERSION = '1.0.0';

function printUsage() {
  console.log(`
cron-explain v${VERSION}
Explain cron expressions in human-readable format

Usage:
  cron-explain <expression>         Explain a cron expression
  cron-explain -n <count> <expr>    Show next N occurrences
  cron-explain -v <expression>      Validate a cron expression
  cron-explain -p                   List preset expressions

Options:
  -h, --help         Show this help message
  -V, --version      Show version number
  -v, --validate     Validate the expression
  -n, --next <N>     Show next N occurrences (default: 5)
  -j, --json         Output in JSON format
  -p, --presets      List common cron presets

Examples:
  cron-explain "0 9 * * 1-5"        # At 09:00 on weekdays
  cron-explain "*/15 * * * *"       # Every 15 minutes
  cron-explain "@daily"             # Preset: every day at midnight
  cron-explain -n 10 "0 0 * * *"    # Next 10 occurrences
  cron-explain -v "0 0 30 2 *"      # Validate (Feb 30 never happens)

Cron format:
  ┌────────────── minute (0-59)
  │ ┌──────────── hour (0-23)
  │ │ ┌────────── day of month (1-31)
  │ │ │ ┌──────── month (1-12 or JAN-DEC)
  │ │ │ │ ┌────── day of week (0-7, SUN-SAT)
  │ │ │ │ │
  * * * * *

Special characters:
  *   any value
  ,   list separator (1,3,5)
  -   range (1-5)
  /   step (*/15 = every 15)
`);
}

function printPresets() {
  console.log('\nCommon cron presets:\n');
  for (const [name, expr] of Object.entries(presets)) {
    const explanation = explain(expr);
    console.log(`  ${name.padEnd(12)} ${expr.padEnd(15)} ${explanation}`);
  }
  console.log('');
}

function formatDate(date) {
  // Format in local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  if (args.includes('-V') || args.includes('--version')) {
    console.log(VERSION);
    process.exit(0);
  }

  if (args.includes('-p') || args.includes('--presets')) {
    printPresets();
    process.exit(0);
  }

  // Parse flags
  let outputJson = false;
  let showNext = 0;
  let validateOnly = false;
  let expression = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-j' || arg === '--json') {
      outputJson = true;
    } else if (arg === '-v' || arg === '--validate') {
      validateOnly = true;
    } else if (arg === '-n' || arg === '--next') {
      showNext = parseInt(args[++i], 10) || 5;
    } else if (!arg.startsWith('-')) {
      expression = arg;
    }
  }

  if (!expression) {
    console.error('Error: No cron expression provided');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Expand presets
  expression = expandPreset(expression);

  try {
    if (validateOnly) {
      const result = validate(expression);
      if (outputJson) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (result.valid) {
          console.log(`✓ Valid ${result.isExtended ? '6' : '5'}-field cron expression`);
        } else {
          console.log(`✗ Invalid: ${result.error}`);
        }
      }
      process.exit(result.valid ? 0 : 1);
    }

    const explanation = explain(expression);
    const parsed = parse(expression);

    if (showNext > 0) {
      const occurrences = nextOccurrences(expression, showNext);

      if (outputJson) {
        console.log(JSON.stringify({
          expression,
          explanation,
          nextOccurrences: occurrences.map(d => d.toISOString())
        }, null, 2));
      } else {
        console.log(`\nExpression: ${expression}`);
        console.log(`Meaning:    ${explanation}`);
        console.log(`\nNext ${showNext} occurrences:`);
        occurrences.forEach((date, i) => {
          console.log(`  ${(i + 1).toString().padStart(2)}. ${formatDate(date)}`);
        });
        console.log('');
      }
    } else {
      if (outputJson) {
        console.log(JSON.stringify({
          expression,
          explanation,
          fields: Object.entries(parsed.fields).reduce((acc, [k, v]) => {
            acc[k] = { raw: v.raw, type: v.type, values: v.values };
            return acc;
          }, {}),
          isExtended: parsed.isExtended
        }, null, 2));
      } else {
        console.log(`\n  ${explanation}\n`);
      }
    }
  } catch (error) {
    if (outputJson) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
