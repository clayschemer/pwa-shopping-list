import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  vibrate(pattern: number | number[]): void {
    if (typeof navigator === 'undefined') return;
    const fn = (
      navigator as Navigator & {
        vibrate?: (p: number | number[]) => boolean;
      }
    ).vibrate;
    if (typeof fn !== 'function') return;
    const arrayPattern = Array.isArray(pattern) ? pattern : [pattern];
    try {
      fn.call(navigator, arrayPattern);
    } catch {
      // Some browsers throw when called outside a user gesture; ignore.
    }
  }

  checkConfirm(): void {
    this.vibrate(100);
  }
}
