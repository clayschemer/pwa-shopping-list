---
name: scss-conventions
description: >
  Apply this skill whenever writing, reviewing, or generating SCSS or CSS in an Angular project.
  Enforces BEM naming (using the Angular component selector as the Block), flat specificity,
  rem-based units, WCAG 2.1 AA accessibility, reduced-motion safety, and proper flexbox/grid
  layout. Use this skill any time the user asks to style a component, write SCSS, create a
  stylesheet, fix layout issues, or review CSS/SCSS for quality. Even if the user just says
  "add some styles" or "make this look right", apply these conventions.
---

# SCSS Conventions Skill

## Core principles (apply always, without exception)

1. **SCSS only** — never write plain CSS. All stylesheets use `.scss` extension.
2. **BEM naming** — Block = Angular component selector. Flat structure, no nested BEM blocks.
3. **Relative units** — `rem` for all sizing. Exceptions: `%` for fluid widths, `vw`/`vh` when truly viewport-relative, `px` only for borders and 1px hairlines.
4. **Low specificity** — avoid nesting beyond what BEM requires. No `&__element { &--modifier {} }` chains. No ID selectors.
5. **Layout via alignment properties** — never use margins/paddings to visually place elements relative to siblings. Use flexbox or grid.
6. **WCAG 2.1 AA** — accessibility is non-negotiable, not an afterthought.
7. **Prettier-compatible** — formatting must not conflict with Prettier's SCSS output.

---

## BEM naming convention

### Structure
```
[component-selector]__[element]--[modifier]
```

### Block = Angular component selector
The component's selector is always the BEM Block. This makes it immediately clear in DevTools which Angular component owns a style.

```scss
// Component selector: app-user-card
.app-user-card { }
.app-user-card__avatar { }
.app-user-card__name { }
.app-user-card__name--highlighted { }
.app-user-card__actions { }
.app-user-card__actions--hidden { }
```

### Rules
- **No nested BEM blocks.** If a child component appears inside a parent component's template, do NOT style it with the parent's BEM block. Each component styles only its own elements.
- **No deep nesting in SCSS.** BEM elements are written at the root level of the file, not nested inside the block selector.
- **Modifiers are always on the element they modify**, not a wrapper.

```scss
// ✅ Correct — flat, low specificity
.app-user-card { }
.app-user-card__avatar { }
.app-user-card__avatar--large { }

// ❌ Wrong — nested BEM block
.app-user-card {
  .app-avatar { }       // this is another component's block
}

// ❌ Wrong — SCSS nesting that inflates specificity
.app-user-card {
  &__avatar {
    &--large { }        // generates .app-user-card__avatar--large, but buried in nesting
  }
}
```

### When nesting IS acceptable
Only use SCSS nesting for:
- Pseudo-classes/elements on the same element: `&:hover`, `&::before`
- State selectors that Angular adds: `&.ng-invalid`, `&.active`
- The `@media`, `@supports` blocks
- `prefers-reduced-motion` and other `@media` feature queries

```scss
// ✅ Acceptable nesting
.app-user-card__avatar {
  width: 3rem;
  height: 3rem;

  &:hover {
    opacity: 0.85;
  }

  &--large {
    width: 5rem;
    height: 5rem;
  }
}
```

---

## Units

| Use case | Unit |
|---|---|
| Font size | `rem` |
| Spacing (margin, padding, gap) | `rem` |
| Width / height (fixed) | `rem` |
| Width / height (fluid) | `%` or `vw`/`vh` |
| Border width | `px` (hairlines) |
| Border radius | `rem` |
| Line height | Unitless ratio (e.g. `1.5`) |
| Media query breakpoints | `rem` (scales with user font size prefs) |

```scss
// ✅ Correct
.app-card__body {
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid currentColor;
  line-height: 1.5;
}

// ❌ Wrong
.app-card__body {
  padding: 16px 24px;
  font-size: 14px;
}
```

---

## Layout

**Always use flexbox or grid to align and distribute elements.** Never use margin or padding as a positioning hack to push elements into place visually.

### Flexbox (for 1D alignment)
```scss
.app-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

// ✅ Space between items
.app-toolbar__nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// ❌ Margin hack — don't do this
.app-toolbar__action-button {
  margin-left: 8px; // just to push it away from the previous button
}
```

### Grid (for 2D layout)
```scss
.app-dashboard__layout {
  display: grid;
  grid-template-columns: 16rem 1fr;
  gap: 1.5rem;
}
```

### Rules
- Use `gap` for spacing between flex/grid children, not margins on children.
- Use `align-items` / `justify-content` / `align-self` / `justify-self` for positioning within a container.
- Use `margin: auto` only as an intentional centering or push technique (e.g. `margin-inline-start: auto` to push the last item to the end), not to compensate for missing layout.

---

## WCAG 2.1 AA accessibility

Apply these rules whenever they are applicable to the component being styled.

### Focus indicators
Every interactive element must have a visible focus indicator. Never `outline: none` without providing a custom replacement.

```scss
// ✅ Custom focus style
.app-button {
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
}

// ❌ Removing focus with no replacement
.app-button:focus {
  outline: none;
}
```

Use `:focus-visible` (not `:focus`) to avoid showing focus rings on mouse click while still showing them for keyboard users.

### Color contrast
- Normal text: minimum 4.5:1 contrast ratio against its background.
- Large text (≥ 1.5rem bold or ≥ 2rem regular): minimum 3:1.
- UI components and graphical elements: minimum 3:1.

Do not hardcode colors that may fail contrast. Prefer using design tokens or CSS custom properties that are verified at the theme level.

### Touch target size
Interactive elements should be at least `2.75rem × 2.75rem` (44×44px equivalent) in size or have equivalent spacing around them.

```scss
.app-icon-button {
  min-width: 2.75rem;
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Hiding content accessibly
```scss
// ✅ Visually hidden but accessible to screen readers
.app-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// ❌ Hides from screen readers too
.app-label--hidden {
  display: none;
  visibility: hidden;
}
```

---

## Transitions and animations

**All transitions and animations must be wrapped in `prefers-reduced-motion: no-preference`.**

This means: transitions are opt-in for users who are okay with motion, not opt-out for those who aren't.

```scss
// ✅ Correct pattern — motion only when the user has no preference for reduced motion
.app-card {
  @media (prefers-reduced-motion: no-preference) {
    transition: box-shadow 200ms ease-out, transform 200ms ease-out;
  }

  &:hover {
    box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 15%);
    transform: translateY(-2px);
  }
}

// ✅ For Angular animations — guard at the animation definition level
// In the component, use AnimationBuilder or check the media query before triggering.

// ❌ Wrong — animation plays for everyone, including users who need reduced motion
.app-card {
  transition: transform 200ms ease;
}
```

If an animation conveys information or state (e.g. a loading spinner), provide a non-animated fallback or ensure the information is also conveyed by other means (text, ARIA).

---

## File structure

Each Angular component gets its own `.scss` file (Angular's default). Within that file:

```scss
// 1. Host element styles (if needed)
:host { }

// 2. Block (component root)
.app-component-name { }

// 3. Elements — in the order they appear in the template
.app-component-name__header { }
.app-component-name__body { }
.app-component-name__footer { }

// 4. Modifiers — immediately after the element they modify
.app-component-name__body--expanded { }

// 5. Responsive overrides at the bottom
@media (max-width: 48rem) {
  .app-component-name { }
}
```

---

## Prettier compatibility

Follow these formatting rules to avoid conflicts with Prettier's SCSS formatter:

- Single quotes for strings: `content: ''`
- No trailing semicolons debates — Prettier adds them, leave them
- Properties in the order Prettier/Stylelint expects: positioning → display → box model → typography → visual → misc
- One blank line between rule blocks
- No space before `{`, space after `:` in declarations

---

## Quick reference checklist

Before finalising any SCSS, verify:

- [ ] File is `.scss`, not `.css`
- [ ] Block name matches the Angular component selector exactly
- [ ] No nested BEM blocks (each component owns only its own elements)
- [ ] No pixel units except `border` hairlines
- [ ] No margin/padding used to position elements relative to siblings
- [ ] Flexbox or grid used for all layout
- [ ] All transitions/animations inside `prefers-reduced-motion: no-preference`
- [ ] Focus indicators present on interactive elements (using `:focus-visible`)
- [ ] Touch targets ≥ 2.75rem on interactive elements
- [ ] Specificity kept flat — no deep SCSS nesting
