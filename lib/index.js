/**
 * cron-explain - Explain cron expressions in human-readable format
 *
 * Supports standard 5-field cron format:
 *   minute hour day-of-month month day-of-week
 *
 * Also supports extended 6-field format (with seconds):
 *   second minute hour day-of-month month day-of-week
 */

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

const MONTH_ABBREVS = {
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_ABBREVS = {
  'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
};

const FIELD_NAMES = ['minute', 'hour', 'day of month', 'month', 'day of week'];
const FIELD_NAMES_6 = ['second', 'minute', 'hour', 'day of month', 'month', 'day of week'];

const FIELD_RANGES = {
  second: { min: 0, max: 59 },
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  'day of month': { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  'day of week': { min: 0, max: 7 }
};

/**
 * Parse a cron expression into its component parts
 * @param {string} expression - The cron expression
 * @returns {object} Parsed cron fields
 */
function parse(expression) {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Invalid cron expression: must be a non-empty string');
  }

  const parts = expression.trim().split(/\s+/);

  if (parts.length < 5 || parts.length > 6) {
    throw new Error(`Invalid cron expression: expected 5 or 6 fields, got ${parts.length}`);
  }

  const isExtended = parts.length === 6;
  const fieldNames = isExtended ? FIELD_NAMES_6 : FIELD_NAMES;

  const fields = {};
  parts.forEach((part, index) => {
    const fieldName = fieldNames[index];
    fields[fieldName] = parseField(part, fieldName);
  });

  return {
    expression,
    isExtended,
    fields
  };
}

/**
 * Parse a single cron field
 * @param {string} field - Field value
 * @param {string} fieldName - Name of the field
 * @returns {object} Parsed field info
 */
function parseField(field, fieldName) {
  const range = FIELD_RANGES[fieldName];
  const result = {
    raw: field,
    type: 'unknown',
    values: []
  };

  // Handle month/day name abbreviations
  let normalizedField = field.toLowerCase();
  if (fieldName === 'month') {
    for (const [abbrev, num] of Object.entries(MONTH_ABBREVS)) {
      normalizedField = normalizedField.replace(new RegExp(abbrev, 'gi'), num.toString());
    }
  }
  if (fieldName === 'day of week') {
    for (const [abbrev, num] of Object.entries(DAY_ABBREVS)) {
      normalizedField = normalizedField.replace(new RegExp(abbrev, 'gi'), num.toString());
    }
  }

  // Wildcard
  if (normalizedField === '*') {
    result.type = 'wildcard';
    for (let i = range.min; i <= range.max; i++) {
      result.values.push(i);
    }
    return result;
  }

  // Step value (*/n or start-end/n)
  if (normalizedField.includes('/')) {
    result.type = 'step';
    const [rangeStr, stepStr] = normalizedField.split('/');
    const step = parseInt(stepStr, 10);

    if (isNaN(step) || step < 1) {
      throw new Error(`Invalid step value in field '${fieldName}': ${field}`);
    }

    let start, end;
    if (rangeStr === '*') {
      start = range.min;
      end = range.max;
    } else if (rangeStr.includes('-')) {
      [start, end] = rangeStr.split('-').map(n => parseInt(n, 10));
    } else {
      start = parseInt(rangeStr, 10);
      end = range.max;
    }

    for (let i = start; i <= end; i += step) {
      result.values.push(i);
    }
    return result;
  }

  // List (comma-separated)
  if (normalizedField.includes(',')) {
    result.type = 'list';
    const items = normalizedField.split(',');
    for (const item of items) {
      if (item.includes('-')) {
        const [start, end] = item.split('-').map(n => parseInt(n, 10));
        for (let i = start; i <= end; i++) {
          result.values.push(i);
        }
      } else {
        result.values.push(parseInt(item, 10));
      }
    }
    result.values = [...new Set(result.values)].sort((a, b) => a - b);
    return result;
  }

  // Range (start-end)
  if (normalizedField.includes('-')) {
    result.type = 'range';
    const [start, end] = normalizedField.split('-').map(n => parseInt(n, 10));
    for (let i = start; i <= end; i++) {
      result.values.push(i);
    }
    return result;
  }

  // Single value
  const value = parseInt(normalizedField, 10);
  if (isNaN(value)) {
    throw new Error(`Invalid value in field '${fieldName}': ${field}`);
  }
  result.type = 'single';
  result.values.push(value);
  return result;
}

/**
 * Explain a cron expression in human-readable format
 * @param {string} expression - The cron expression
 * @param {object} options - Options for explanation
 * @returns {string} Human-readable explanation
 */
function explain(expression, options = {}) {
  const parsed = parse(expression);
  const { fields, isExtended } = parsed;

  const parts = [];

  // Build time description
  const timePart = buildTimePart(fields, isExtended);
  parts.push(timePart);

  // Build date description
  const datePart = buildDatePart(fields);
  if (datePart) {
    parts.push(datePart);
  }

  // Build day of week description
  const dowPart = buildDayOfWeekPart(fields);
  if (dowPart) {
    parts.push(dowPart);
  }

  let result = parts.join(', ');

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);

  return result;
}

/**
 * Build the time portion of the explanation
 */
function buildTimePart(fields, isExtended) {
  const minute = fields.minute;
  const hour = fields.hour;
  const second = isExtended ? fields.second : null;

  // Check for "every X" patterns
  if (minute.type === 'wildcard' && hour.type === 'wildcard') {
    if (second && second.type === 'wildcard') {
      return 'every second';
    }
    return 'every minute';
  }

  if (minute.type === 'step' && minute.raw.startsWith('*/')) {
    const step = parseInt(minute.raw.split('/')[1], 10);
    if (hour.type === 'wildcard') {
      return `every ${step} minutes`;
    }
  }

  if (hour.type === 'step' && hour.raw.startsWith('*/')) {
    const step = parseInt(hour.raw.split('/')[1], 10);
    if (minute.type === 'single' && minute.values[0] === 0) {
      return `every ${step} hours`;
    }
  }

  // Specific time(s)
  const times = [];
  for (const h of hour.values) {
    for (const m of minute.values) {
      times.push(formatTime(h, m, second ? second.values[0] : null));
    }
  }

  if (times.length === 1) {
    return `at ${times[0]}`;
  } else if (times.length <= 5) {
    return `at ${formatList(times)}`;
  } else {
    return `at ${times.length} different times`;
  }
}

/**
 * Build the date portion of the explanation
 */
function buildDatePart(fields) {
  const dom = fields['day of month'];
  const month = fields.month;

  // Both wildcards - no specific date
  if (dom.type === 'wildcard' && month.type === 'wildcard') {
    return null;
  }

  const parts = [];

  // Day of month
  if (dom.type !== 'wildcard') {
    if (dom.type === 'single') {
      parts.push(`on day ${dom.values[0]}`);
    } else if (dom.values.length <= 5) {
      parts.push(`on days ${formatList(dom.values.map(d => d.toString()))}`);
    } else {
      parts.push(`on ${dom.values.length} days of the month`);
    }
  }

  // Month
  if (month.type !== 'wildcard') {
    const monthNames = month.values.map(m => MONTHS[m]);
    if (monthNames.length === 1) {
      parts.push(`in ${monthNames[0]}`);
    } else if (monthNames.length <= 4) {
      parts.push(`in ${formatList(monthNames)}`);
    } else {
      parts.push(`in ${monthNames.length} months`);
    }
  }

  return parts.join(' ');
}

/**
 * Build the day of week portion of the explanation
 */
function buildDayOfWeekPart(fields) {
  const dow = fields['day of week'];

  if (dow.type === 'wildcard') {
    return null;
  }

  // Normalize Sunday (7 -> 0)
  const values = dow.values.map(v => v === 7 ? 0 : v);
  const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
  const dayNames = uniqueValues.map(d => DAYS[d]);

  // Check for weekday/weekend patterns
  const isWeekdays = uniqueValues.length === 5 &&
    uniqueValues.every(d => d >= 1 && d <= 5);
  const isWeekends = uniqueValues.length === 2 &&
    uniqueValues.includes(0) && uniqueValues.includes(6);

  if (isWeekdays) {
    return 'on weekdays';
  }
  if (isWeekends) {
    return 'on weekends';
  }

  if (dayNames.length === 1) {
    return `on ${dayNames[0]}`;
  } else if (dayNames.length <= 4) {
    return `on ${formatList(dayNames)}`;
  } else {
    return `on ${dayNames.length} days of the week`;
  }
}

/**
 * Format a time value
 */
function formatTime(hour, minute, second = null) {
  const h = hour.toString().padStart(2, '0');
  const m = minute.toString().padStart(2, '0');
  if (second !== null) {
    const s = second.toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return `${h}:${m}`;
}

/**
 * Format a list with proper grammar
 */
function formatList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Validate a cron expression
 * @param {string} expression - The cron expression
 * @returns {object} Validation result
 */
function validate(expression) {
  try {
    const parsed = parse(expression);
    return {
      valid: true,
      expression,
      fields: Object.keys(parsed.fields).length,
      isExtended: parsed.isExtended
    };
  } catch (error) {
    return {
      valid: false,
      expression,
      error: error.message
    };
  }
}

/**
 * Get the next N occurrences of a cron schedule
 * @param {string} expression - The cron expression
 * @param {number} count - Number of occurrences to calculate
 * @param {Date} startFrom - Starting date (default: now)
 * @returns {Date[]} Array of next occurrence dates
 */
function nextOccurrences(expression, count = 5, startFrom = new Date()) {
  const parsed = parse(expression);
  const { fields, isExtended } = parsed;

  const results = [];
  let current = new Date(startFrom);
  current.setMilliseconds(0);

  // Move to next second/minute
  if (isExtended) {
    current.setSeconds(current.getSeconds() + 1);
  } else {
    current.setSeconds(0);
    current.setMinutes(current.getMinutes() + 1);
  }

  const maxIterations = 366 * 24 * 60 * 60; // Max 1 year of seconds
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    const matches =
      (isExtended ? fields.second.values.includes(current.getSeconds()) : true) &&
      fields.minute.values.includes(current.getMinutes()) &&
      fields.hour.values.includes(current.getHours()) &&
      fields['day of month'].values.includes(current.getDate()) &&
      fields.month.values.includes(current.getMonth() + 1) &&
      (fields['day of week'].values.includes(current.getDay()) ||
       fields['day of week'].values.includes(current.getDay() === 0 ? 7 : current.getDay()));

    if (matches) {
      results.push(new Date(current));
    }

    // Increment
    if (isExtended) {
      current.setSeconds(current.getSeconds() + 1);
    } else {
      current.setMinutes(current.getMinutes() + 1);
    }
  }

  return results;
}

/**
 * Common cron presets
 */
const presets = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *'
};

/**
 * Expand a preset to its cron expression
 * @param {string} preset - Preset name (e.g., '@daily')
 * @returns {string} Cron expression
 */
function expandPreset(preset) {
  const lower = preset.toLowerCase();
  if (presets[lower]) {
    return presets[lower];
  }
  return preset;
}

module.exports = {
  parse,
  explain,
  validate,
  nextOccurrences,
  expandPreset,
  presets
};
