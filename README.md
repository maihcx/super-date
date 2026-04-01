# SuperDate

TypeScript date-input enhancer. Replaces the native browser date-picker chrome with a fully custom, format-aware overlay — while still delegating the actual date popup to the OS so you never re-implement a calendar widget.

## Features

| Feature | Detail |
|---|---|
| **Auto-observe** | `SuperDate.bind('.selector')` watches the DOM via `MutationObserver` — inputs added later are automatically enhanced |
| **Custom format** | Global default or per-element via `data-date-format=""` |
| **Keyboard editing** | `↑ ↓` step values, `← →` move segments, `0-9` type digits, auto-advance on completion |
| **Copy / Paste** | Parses pasted text against configured format + common fallbacks |
| **Native picker** | Calendar icon opens the OS date picker; `input.value` stays as ISO `yyyy-MM-dd` |
| **Zero dependencies** | Plain TypeScript, no runtime deps |

## Install

```bash
npm install superdate   # if published
# or copy src/SuperDate.ts into your project
```

## Build

```bash
npm install
npm run build
```

Outputs:
- `dist/super-date.esm.js` — ES Module (native ESM)
- `dist/super-date.esm.min.js` — ES Module (native ESM with Minify)
- `dist/super-date.umd.js` — ES UMD (native UMD)
- `dist/super-date.min.js` — ES UMD (native UMD with Minify)

## Usage

### Via `<script>` tag (IIFE)

```html
<script src="dist/super-date.umd.js"></script>
<script>
  SuperDate.bind('input[type="date"]');
</script>
```

### ES Module

```js
import SuperDate from './dist/super-date.esm.js';
SuperDate.bind('.my-dates', { format: 'dd/MM/yyyy' });
```

### TypeScript / bundler

```ts
import SuperDate from 'superdate';
SuperDate.bind('.date-field');
```

## API

### `SuperDate.bind(selector, options?)`

Enhances all current **and future** `<input type="date">` elements matching `selector`.

```ts
SuperDate.bind('.date-input', {
  format: 'dd/MM/yyyy',   // default overlay format
  locale: 'vi-VN',        // locale for future i18n features
});
```

Returns `this` for chaining.

### `SuperDate.init(el, options?)` 

Manually enhance a single element. Returns the `SuperDateInstance`.

### `SuperDate.destroy(el)`

Remove the overlay and restore the original input.

## Per-element format override

```html
<input type="date" class="sd" data-date-format="yyyy-MM-dd" />
<input type="date" class="sd" data-date-format="MM/dd/yyyy" />
```

## Supported tokens

| Token | Meaning | Example |
|---|---|---|
| `yyyy` | 4-digit year | `2025` |
| `yy` | 2-digit year | `25` |
| `MM` | Month, zero-padded | `03` |
| `M` | Month, no padding | `3` |
| `dd` | Day, zero-padded | `07` |
| `d` | Day, no padding | `7` |

## CSS variables

Override the overlay appearance:

```css
.superdate-overlay {
  --superdate-active-bg: #2563eb;
  --superdate-active-color: #fff;
  --superdate-placeholder-color: #9ca3af;
  --superdate-sep-color: currentColor;
}
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| `0-9` | Type digit into active segment, auto-advance |
| `↑` / `↓` | Increment / decrement active segment |
| `←` / `→` | Move to previous / next segment |
| `Tab` / `Shift+Tab` | Move to next / previous segment |
| `Backspace` | Erase last typed digit in buffer |
| `Escape` | Deactivate overlay |
| `Ctrl+A` | Activate first segment |

## License

MIT
