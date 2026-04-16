---
name: Angular Code Style Rules
description: Angular component code style requirements for this project — separate files, no standalone flag, curly braces
type: feedback
---

Never use inline `template` or `styles` in `@Component`. Every component must use `templateUrl` and `styleUrl` pointing to separate `.component.html` and `.component.scss` files.

**Why:** Project convention — inline templates/styles were flagged as bad coding style by the user.

**How to apply:** All components, always. Three files per component: `.ts`, `.html`, `.scss`.

---

Do not include `standalone: true` in `@Component`. All components are standalone by default in Angular 19+ and the flag is redundant noise.

**Why:** User flagged this as redundant after upgrade.

**How to apply:** Omit the property entirely from every `@Component` decorator.

---

Always use curly braces for `if`/`else` bodies, even single-line.

**Why:** User flagged one-line if statements as bad style.

**How to apply:** `if (condition) { return; }` not `if (condition) return;`
