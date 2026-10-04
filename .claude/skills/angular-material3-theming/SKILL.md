---
name: angular-material3-theming
description: >
  Apply this skill whenever working with Angular Material theming, design tokens, component
  styling, or theme configuration in an Angular project. Use it when the user asks to set up
  a theme, customize Material components, add dark/light/high-contrast/compact mode support,
  override Material component styles, or work with mat.theme(), mat.define-theme(), or any
  Angular Material mixin. Also apply when the user wants to style a Material component
  differently from its default appearance, even if they don't explicitly say "theming".
  Always use this skill alongside scss-conventions — they are complementary.
---

# Angular Material 3 Theming Skill

## Core principles (apply always)

1. **M3 API only** — `mat.define-theme()` and `mat.theme()`. Never use `mat.define-light-theme()`, `mat.define-dark-theme()`, or any M2 theming API.
2. **Tokens over selectors** — override via system tokens (`$overrides` on `mat.theme()`) or component override mixins (`mat.button-overrides()` etc.). Never target internal Angular Material CSS selectors directly.
3. **No `::ng-deep`** — ever. If component-level style piercing is genuinely needed, disable `ViewEncapsulation` on that component instead.
4. **No `!important`** — if you feel you need it, you are targeting the wrong layer. Use the correct token or mixin.
5. **All four modes supported** — every project supports light/dark, high contrast, compact density, and reduced motion. System preference is always the default fallback; body/html classes override when the user has set an explicit app preference.
6. **Scalable and modifiable** — theme structure must make it easy to change palettes, add variants, or swap tokens without cascading rewrites.
7. **Token-based throughout** — all colours, spacing, and typography must reference system tokens (`--mat-sys-*`) or custom design tokens. Never hardcode colour values in component SCSS. This enables external token generators (Material Theme Builder, etc.) to produce dark, light, high-contrast, and compact themes by swapping token sets only.

---

## File structure

```
src/
├── styles/
│   ├── _theme-colors.scss       # Generated or custom palette definitions
│   ├── _theme-base.scss         # mat.theme() call — the single source of truth
│   ├── _theme-overrides.scss    # Global component token overrides
│   ├── _theme-modes.scss        # Dark, high-contrast, compact, reduced-motion
│   └── _theme-typography.scss   # Typography config (optional, if customised)
└── styles.scss                  # Imports everything in order
```

`styles.scss` import order:
```scss
@use 'styles/theme-colors' as theme;
@use 'styles/theme-base';
@use 'styles/theme-overrides';
@use 'styles/theme-modes';
```

---

## Global theme setup (`_theme-base.scss`)

```scss
@use '@angular/material' as mat;
@use './theme-colors' as theme;

html {
  @include mat.theme((
    color: (
      primary: theme.$primary-palette,
      tertiary: theme.$tertiary-palette,
    ),
    typography: Roboto,
    density: 0,
  ));

  // Enable browser light/dark switching via light-dark() CSS function.
  // This is the default — no class required. The html class overrides below
  // will force a specific scheme when the user has set an explicit preference.
  color-scheme: light dark;
}

html, body {
  height: 100%;
}

body {
  margin: 0;
  font-family: Roboto, 'Helvetica Neue', sans-serif;
  background: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
}
```

### Palette definition (`_theme-colors.scss`)

Use the Angular Material schematic to generate this file:
```bash
ng generate @angular/material:theme-color
```

Or define manually using built-in M3 palettes:
```scss
@use '@angular/material' as mat;

// Use a built-in M3 palette
$primary-palette: mat.$violet-palette;
$tertiary-palette: mat.$azure-palette;
```

For custom brand colors, use the schematic output which produces tonal palettes
compatible with M3's color system.

---

## Mode support (`_theme-modes.scss`)

All four modes follow the same pattern:
**system preference = default fallback → body/html class = explicit user override.**

```scss
@use '@angular/material' as mat;
@use './theme-colors' as theme;

// ─── LIGHT / DARK ────────────────────────────────────────────────────────────
//
// Default: color-scheme: light dark on <html> means the browser picks based
// on prefers-color-scheme. No class needed for system preference.
//
// Override: add class to <html> element via ThemeService.

html.theme-light {
  color-scheme: light;
}

html.theme-dark {
  color-scheme: dark;
}

// ─── HIGH CONTRAST ───────────────────────────────────────────────────────────
//
// System preference fallback via prefers-contrast: more.
// Override: add .theme-high-contrast to <body> via ThemeService.

@media (prefers-contrast: more) {
  html {
    @include theme.high-contrast-overrides(color-scheme);
    @include mat.strong-focus-indicators();
  }
}

body.theme-high-contrast {
  @include theme.high-contrast-overrides(color-scheme);
  @include mat.strong-focus-indicators();
}

// ─── COMPACT DENSITY ─────────────────────────────────────────────────────────
//
// No standard system media query for compact — app setting only.
// Override: add .theme-compact to <body> via ThemeService.

body.theme-compact {
  @include mat.all-component-densities(-2);
}

// ─── REDUCED MOTION ──────────────────────────────────────────────────────────
//
// System preference fallback. Override: add .theme-reduce-motion to <body>.
// Note: transitions on Material components are handled by Angular Material
// itself. This block handles any custom transitions in the app.
// For Angular Animations, inject the media query into a service and swap
// BrowserAnimationsModule for NoopAnimationsModule when reduced motion is active.

@media (prefers-reduced-motion: no-preference) {
  // Custom app-level transitions go here (scoped per component normally,
  // but global transitions like page transitions belong here).
}

body.theme-reduce-motion * {
  // Suppress all custom transitions when the user has explicitly set
  // reduced motion in the app settings.
  transition-duration: 0.01ms !important;  // Exception: !important justified here
  animation-duration: 0.01ms !important;   // because we are globally overriding
  animation-iteration-count: 1 !important; // motion across all elements.
}
```

> **Note on `!important` in `theme-reduce-motion`**: This is the one justified use of
> `!important` in the entire codebase. It is necessary to reliably suppress all
> third-party and component-level transitions when a user has explicitly requested
> reduced motion via app settings. Do not use `!important` anywhere else.

---

## Global component overrides (`_theme-overrides.scss`)

Override at the `:root` or `html` level using component override mixins.
This is the **primary place** for design system decisions that apply globally.

```scss
@use '@angular/material' as mat;

// Override button tokens globally
:root {
  @include mat.button-overrides((
    filled-container-color: light-dark(var(--mat-sys-primary), var(--mat-sys-primary)),
    filled-label-text-color: var(--mat-sys-on-primary),
    // Disabled states
    filled-disabled-container-color: light-dark(
      color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent),
      color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent)
    ),
  ));
}

// Override card tokens globally
:root {
  @include mat.card-overrides((
    elevated-container-color: var(--mat-sys-surface-container-low),
  ));
}
```

### How to find available tokens for a component

1. Check the Angular Material docs for the component → "Styling" tab
2. Or inspect `node_modules/@angular/material/` for `_<component>-theme.scss`
3. Prefer **system-level tokens** (`var(--mat-sys-*)`) over hardcoded values — they
   automatically adapt to light/dark/high-contrast themes.

### System token reference (most commonly used)

```scss
// Color roles — always prefer these over raw palette values
var(--mat-sys-primary)
var(--mat-sys-on-primary)
var(--mat-sys-secondary)
var(--mat-sys-on-secondary)
var(--mat-sys-tertiary)
var(--mat-sys-on-tertiary)
var(--mat-sys-surface)
var(--mat-sys-on-surface)
var(--mat-sys-surface-container)
var(--mat-sys-surface-container-low)
var(--mat-sys-surface-container-high)
var(--mat-sys-error)
var(--mat-sys-on-error)
var(--mat-sys-outline)
var(--mat-sys-outline-variant)

// Typography roles
var(--mat-sys-body-large)
var(--mat-sys-body-medium)
var(--mat-sys-label-large)
var(--mat-sys-title-medium)

// Elevation
var(--mat-sys-level1)
var(--mat-sys-level2)
var(--mat-sys-level3)
```

---

## Component-level overrides (in component `.scss` files)

Use this when an override is specific to one component instance, not the whole app.
Always use the component's override mixin — never target internal selectors.

```scss
// In app-hero-section/app-hero-section.component.scss
@use '@angular/material' as mat;

// Override button appearance only within this component's scope
:host {
  @include mat.button-overrides((
    filled-container-color: var(--mat-sys-tertiary),
    filled-label-text-color: var(--mat-sys-on-tertiary),
  ));
}
```

`:host` scopes the override to this component without raising specificity beyond
what is needed. This is the correct alternative to `::ng-deep`.

### When to use component-level vs global overrides

| Scenario | Where to override |
|---|---|
| Design system standard (applies everywhere) | `_theme-overrides.scss` at `:root` |
| One-off variant in a specific section | Component `.scss` with `:host` |
| Theme variant (dark, high-contrast) | `_theme-modes.scss` |
| Single element inside a component | Component `.scss` with `:host` + BEM |

---

## ThemeService pattern (Angular)

A single service manages all mode state and applies the correct classes.
System preferences are always the baseline — the service only acts when the user
has made an explicit choice.

```typescript
import { Injectable, inject, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ColorScheme = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly html = this.document.documentElement;
  private readonly body = this.document.body;

  readonly colorScheme = signal<ColorScheme>('system');
  readonly highContrast = signal<boolean>(false);
  readonly compact = signal<boolean>(false);
  readonly reduceMotion = signal<boolean>(false);

  constructor() {
    // Apply classes reactively whenever signals change
    effect(() => this.applyColorScheme(this.colorScheme()));
    effect(() => this.applyClass(this.body, 'theme-high-contrast', this.highContrast()));
    effect(() => this.applyClass(this.body, 'theme-compact', this.compact()));
    effect(() => this.applyClass(this.body, 'theme-reduce-motion', this.reduceMotion()));
  }

  private applyColorScheme(scheme: ColorScheme): void {
    this.html.classList.remove('theme-light', 'theme-dark');
    if (scheme !== 'system') {
      this.html.classList.add(`theme-${scheme}`);
    }
    // If 'system', no class is added — browser uses prefers-color-scheme naturally
  }

  private applyClass(el: HTMLElement, cls: string, active: boolean): void {
    active ? el.classList.add(cls) : el.classList.remove(cls);
  }
}
```

---

## Anti-patterns — never do these

```scss
// ❌ Targeting internal Angular Material selectors
.mat-mdc-button .mdc-button__label {
  color: red;
}

// ❌ Using ::ng-deep
::ng-deep .mat-mdc-card {
  background: blue;
}

// ❌ Using !important to force a style (outside reduced-motion suppression)
.app-my-button {
  background: purple !important;
}

// ❌ Using legacy M2 theming API
@include mat.define-light-theme(...);
@include mat.define-dark-theme(...);

// ❌ Hardcoding color values instead of using system tokens
.app-card {
  background: #1a1a2e; // use var(--mat-sys-surface) instead
}

// ❌ Defining separate full themes for light/dark (M2 pattern)
.dark-theme {
  @include mat.all-component-themes($dark-theme);
}
```

---

## Quick reference checklist

Before finalising any theming work, verify:

- [ ] Using `mat.define-theme()` / `mat.theme()` — no M2 API
- [ ] Colors reference `var(--mat-sys-*)` tokens, not hardcoded values
- [ ] Component overrides use the correct override mixin (e.g. `mat.button-overrides()`)
- [ ] No `::ng-deep` anywhere — use `:host` + override mixin instead
- [ ] No `!important` except in the `theme-reduce-motion` global suppression block
- [ ] Dark/light toggles `color-scheme` on `html`, not a full re-theme
- [ ] High contrast supported via both `prefers-contrast: more` and `.theme-high-contrast`
- [ ] Compact supported via `.theme-compact` applying `mat.all-component-densities()`
- [ ] Reduced motion supported via `prefers-reduced-motion` and `.theme-reduce-motion`
- [ ] `ThemeService` applies classes reactively; system preference is always the fallback
- [ ] Global component overrides in `_theme-overrides.scss`, scoped ones use `:host`
