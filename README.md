# SuperDate

TypeScript date/time input enhancer. Replaces the native browser date-picker chrome with a fully custom, format-aware overlay — while still delegating the actual popup to the OS so you never re-implement a calendar or clock widget.

Supports `input[type="date"]`, `input[type="time"]`, and `input[type="datetime-local"]`.

## Features

| Feature | Detail |
|---|---|
| **3 input types** | `date`, `time`, and `datetime-local` all supported |
| **Auto-observe** | `SuperDate.bind('.selector')` watches the DOM via `MutationObserver` — inputs added later are automatically enhanced |
| **Custom format** | Global default or per-element via `data-date-format`, `data-time-format`, `data-date-time-delimiter` |
| **Keyboard editing** | `↑ ↓` step values, `← →` move segments, `0–9` type digits, auto-advance on completion |
| **Copy / Paste** | Parses pasted text against configured format + common fallbacks |
| **Native picker** | Calendar / clock icon opens the OS picker; `input.value` stays as ISO string |
| **Zero dependencies** | Plain TypeScript, no runtime deps |

## Install

```bash
npm install @maihcx/super-date
# or copy dist/ into your project
```

## Build

```bash
npm install
npm run build
```

Outputs:

| File | Format |
|---|---|
| `dist/super-date.esm.js` | ES Module |
| `dist/super-date.esm.min.js` | ES Module (minified) |
| `dist/super-date.umd.js` | UMD (browser global `SuperDate`) |
| `dist/super-date.min.js` | UMD (minified) |

## Usage

### Via `<script>` tag

```html
<link rel="stylesheet" href="dist/super-date.min.css" />
<script src="dist/super-date.umd.js"></script>
<script>
  SuperDate.bind('.sd', { format: 'dd/MM/yyyy' });
</script>
```

### ES Module

```js
import SuperDate from './dist/super-date.esm.js';
SuperDate.bind('.sd', { format: 'dd/MM/yyyy' });
```

### TypeScript / bundler

```ts
import SuperDate from 'superdate';
SuperDate.bind('.sd');
```

## API

### `SuperDate.bind(selector, options?)`

Enhances all current **and future** `<input type="date">`, `<input type="time">`, and `<input type="datetime-local">` elements matching `selector`.

```ts
SuperDate.bind('.sd', {
  format:            'dd/MM/yyyy', // date display format
  timeFormat:        'HH:mm',      // time display format
  dateTimeDelimiter: ' ',          // separator between date and time parts
  locale:            'vi-VN',      // locale (reserved for future i18n)
});
```

Returns `this` for chaining.

### `SuperDate.init(el, options?)`

Manually enhance a single element. Returns the `SuperDateInstance`.

```ts
const el = document.querySelector('#my-input') as HTMLInputElement;
SuperDate.init(el, { format: 'yyyy/MM/dd' });
```

### `SuperDate.destroy(el)`

Remove the overlay and restore the original native input.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `format` | `string` | `'dd/MM/yyyy'` | Display format for `date` and the date part of `datetime-local` inputs |
| `timeFormat` | `string` | `'HH:mm'` | Display format for `time` and the time part of `datetime-local` inputs |
| `dateTimeDelimiter` | `string` | `' '` | String inserted between date and time parts in `datetime-local` inputs |
| `locale` | `string` | `navigator.language` | Locale (reserved) |

## Per-element overrides (data attributes)

```html
<!-- date -->
<input type="date" data-date-format="yyyy/MM/dd" />

<!-- time -->
<input type="time" data-time-format="HH:mm:ss" />

<!-- datetime-local — all three can be combined -->
<input type="datetime-local"
  data-date-format="dd/MM/yyyy"
  data-time-format="HH:mm:ss"
  data-date-time-delimiter=" | " />
```

Per-element attributes always take priority over `bind()` options.

## Supported tokens

### Date tokens

| Token | Description | Example |
|---|---|---|
| `yyyy` | 4-digit year | `2025` |
| `yy` | 2-digit year | `25` |
| `MM` | Month, zero-padded | `03` |
| `M` | Month, no padding | `3` |
| `dd` | Day, zero-padded | `07` |
| `d` | Day, no padding | `7` |

### Time tokens

| Token | Description | Example |
|---|---|---|
| `HH` | Hours 24h, zero-padded | `09`, `23` |
| `H` | Hours 24h, no padding | `9`, `23` |
| `hh` | Hours 12h, zero-padded | `09`, `11` |
| `h` | Hours 12h, no padding | `9`, `11` |
| `mm` | Minutes, zero-padded | `05`, `59` |
| `ss` | Seconds, zero-padded | `00`, `59` |

> **Note:** `MM` = months (uppercase), `mm` = minutes (lowercase).

## CSS variables

Override the overlay appearance per-element or globally:

```css
.superdate-overlay {
  --superdate-active-bg:          #2563eb;  /* active segment background */
  --superdate-active-color:       #fff;     /* active segment text */
  --superdate-placeholder-color:  #9ca3af;  /* empty segment placeholder */
  --superdate-sep-color:          inherit;  /* separator / literal color */
}
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| `0–9` | Type digit into active segment, auto-advance when full |
| `↑` / `↓` | Increment / decrement active segment value |
| `←` / `→` | Move to previous / next segment |
| `Tab` / `Shift+Tab` | Move to next / previous segment |
| `Backspace` | Erase last typed digit in buffer |
| `Escape` | Deactivate / clear selection |
| `Ctrl+A` | Select all segments |
| `Ctrl+C` | Copy selected segments as formatted text |
| Click & drag | Multi-segment selection |
| Double-click | Select all segments |

## Input value

The underlying `input.value` always stays in native ISO format — SuperDate only changes the **visual overlay**:

| Input type | `input.value` format |
|---|---|
| `date` | `yyyy-MM-dd` |
| `time` | `HH:mm:ss` |
| `datetime-local` | `yyyy-MM-ddTHH:mm:ss` |

## License

MIT
