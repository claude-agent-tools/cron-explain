/**
 * Tests for cron-explain
 */

const { parse, explain, validate, nextOccurrences, expandPreset } = require('../lib/index.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (isEqual) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ ${message}`);
    console.log(`    Expected: ${JSON.stringify(expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
  }
}

console.log('\n=== cron-explain tests ===\n');

// Test: parse()
console.log('parse():');
{
  const result = parse('0 9 * * 1-5');
  assert(result.expression === '0 9 * * 1-5', 'preserves original expression');
  assert(result.isExtended === false, 'detects 5-field format');
  assert(result.fields.minute.values[0] === 0, 'parses minute field');
  assert(result.fields.hour.values[0] === 9, 'parses hour field');
  assertEqual(result.fields['day of week'].values, [1, 2, 3, 4, 5], 'parses day range');
}

// Test: 6-field extended format
console.log('\nextended format:');
{
  const result = parse('30 0 9 * * 1-5');
  assert(result.isExtended === true, 'detects 6-field format');
  assert(result.fields.second.values[0] === 30, 'parses second field');
}

// Test: explain()
console.log('\nexplain():');
{
  assert(explain('0 0 * * *').includes('00:00'), 'midnight');
  assert(explain('0 9 * * 1-5').toLowerCase().includes('weekday'), 'weekdays');
  assert(explain('*/15 * * * *').includes('15 minutes'), 'step values');
  assert(explain('0 0 1 1 *').toLowerCase().includes('january'), 'specific month');
  assert(explain('0 0 * * 0,6').toLowerCase().includes('weekend'), 'weekends');
}

// Test: validate()
console.log('\nvalidate():');
{
  const valid = validate('0 9 * * *');
  assert(valid.valid === true, 'valid expression returns true');

  const invalid = validate('invalid');
  assert(invalid.valid === false, 'invalid expression returns false');
  assert(invalid.error !== undefined, 'invalid expression includes error');
}

// Test: nextOccurrences()
console.log('\nnextOccurrences():');
{
  // Use local time for cron (standard behavior)
  const base = new Date();
  base.setHours(10, 0, 0, 0);
  const next = nextOccurrences('0 12 * * *', 3, base);
  assert(next.length === 3, 'returns requested count');
  assert(next[0].getHours() === 12, 'first occurrence at correct hour');
  assert(next[0].getMinutes() === 0, 'first occurrence at correct minute');
}

// Test: expandPreset()
console.log('\nexpandPreset():');
{
  assertEqual(expandPreset('@daily'), '0 0 * * *', '@daily preset');
  assertEqual(expandPreset('@hourly'), '0 * * * *', '@hourly preset');
  assertEqual(expandPreset('@weekly'), '0 0 * * 0', '@weekly preset');
  assertEqual(expandPreset('0 0 * * *'), '0 0 * * *', 'non-preset unchanged');
}

// Test: special characters
console.log('\nspecial characters:');
{
  const list = parse('0,15,30,45 * * * *');
  assertEqual(list.fields.minute.values, [0, 15, 30, 45], 'comma-separated list');

  const range = parse('* 9-17 * * *');
  assertEqual(range.fields.hour.values, [9, 10, 11, 12, 13, 14, 15, 16, 17], 'range');

  const step = parse('*/10 * * * *');
  assertEqual(step.fields.minute.values, [0, 10, 20, 30, 40, 50], 'step values');
}

// Test: month/day names
console.log('\nmonth/day names:');
{
  const monthNames = parse('0 0 1 jan,jun,dec *');
  assertEqual(monthNames.fields.month.values, [1, 6, 12], 'month abbreviations');

  const dayNames = parse('0 0 * * mon-fri');
  assertEqual(dayNames.fields['day of week'].values, [1, 2, 3, 4, 5], 'day abbreviations');
}

// Test: edge cases
console.log('\nedge cases:');
{
  try {
    parse('');
    assert(false, 'empty string should throw');
  } catch (e) {
    assert(true, 'empty string throws error');
  }

  try {
    parse('* * *');
    assert(false, 'too few fields should throw');
  } catch (e) {
    assert(true, 'too few fields throws error');
  }

  // Sunday as 0 and 7
  const sun0 = parse('0 0 * * 0');
  const sun7 = parse('0 0 * * 7');
  assert(sun0.fields['day of week'].values.includes(0), 'Sunday as 0');
  assert(sun7.fields['day of week'].values.includes(7), 'Sunday as 7');
}

// Summary
console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
