# cron-explain

Explain cron expressions in human-readable format.

## Installation

```bash
npm install -g @claude-agent/cron-explain
```

Or use directly with npx:

```bash
npx @claude-agent/cron-explain "0 9 * * 1-5"
```

## CLI Usage

```bash
# Basic explanation
cron-explain "0 9 * * 1-5"
# Output: At 09:00, on weekdays

# Show next occurrences
cron-explain -n 5 "0 9 * * 1-5"

# Validate expression
cron-explain -v "*/15 * * * *"

# JSON output
cron-explain -j "0 0 1 * *"

# List presets
cron-explain -p
```

## API Usage

```javascript
const { parse, explain, validate, nextOccurrences } = require('@claude-agent/cron-explain');

// Explain a cron expression
console.log(explain('0 9 * * 1-5'));
// => "At 09:00, on weekdays"

// Parse into components
const parsed = parse('*/15 * * * *');
console.log(parsed.fields.minute.values);
// => [0, 15, 30, 45]

// Validate
const result = validate('0 0 * * *');
console.log(result.valid);
// => true

// Get next occurrences
const dates = nextOccurrences('0 9 * * *', 5);
console.log(dates);
// => [Date, Date, Date, Date, Date]
```

## Cron Format

```
┌────────────── minute (0-59)
│ ┌──────────── hour (0-23)
│ │ ┌────────── day of month (1-31)
│ │ │ ┌──────── month (1-12 or JAN-DEC)
│ │ │ │ ┌────── day of week (0-7, SUN-SAT)
│ │ │ │ │
* * * * *
```

Also supports 6-field format with seconds:

```
┌──────────────── second (0-59)
│ ┌────────────── minute (0-59)
│ │ ┌──────────── hour (0-23)
│ │ │ ┌────────── day of month (1-31)
│ │ │ │ ┌──────── month (1-12)
│ │ │ │ │ ┌────── day of week (0-7)
│ │ │ │ │ │
* * * * * *
```

### Special Characters

| Character | Description | Example |
|-----------|-------------|---------|
| `*` | Any value | `* * * * *` = every minute |
| `,` | List | `1,15 * * * *` = minute 1 and 15 |
| `-` | Range | `1-5 * * * *` = minutes 1 through 5 |
| `/` | Step | `*/15 * * * *` = every 15 minutes |

### Presets

| Preset | Equivalent | Meaning |
|--------|-----------|---------|
| `@yearly` | `0 0 1 1 *` | Once a year (Jan 1) |
| `@monthly` | `0 0 1 * *` | Once a month (1st) |
| `@weekly` | `0 0 * * 0` | Once a week (Sunday) |
| `@daily` | `0 0 * * *` | Once a day (midnight) |
| `@hourly` | `0 * * * *` | Once an hour |

## Examples

| Expression | Meaning |
|-----------|---------|
| `0 9 * * 1-5` | At 09:00 on weekdays |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 1 * *` | At midnight on the 1st of every month |
| `0 22 * * 1-5` | At 22:00 on weekdays |
| `0 9,18 * * *` | At 09:00 and 18:00 |
| `30 4 1,15 * *` | At 04:30 on the 1st and 15th |

## License

MIT
