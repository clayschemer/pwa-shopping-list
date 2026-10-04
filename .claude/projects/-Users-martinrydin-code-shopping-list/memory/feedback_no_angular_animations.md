---
name: No Angular Animations
description: Never use @angular/animations or NoopAnimationsModule — use pure CSS animations/transitions instead
type: feedback
---

Never use `@angular/animations` package or `NoopAnimationsModule` in this project. Angular animations are being deprecated.

**Why:** Angular animations is deprecated. The project should not take a dependency on it.

**How to apply:** All animations and transitions must be done with pure CSS (`transition`, `@keyframes`, `animation`). In tests, there is no need for `NoopAnimationsModule` — CSS animations don't interfere with Angular's change detection. If Material components require animation providers, find an alternative approach.
