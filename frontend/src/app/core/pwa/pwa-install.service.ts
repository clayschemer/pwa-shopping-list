import { computed, Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PwaInstallState = 'installable' | 'installed' | 'unsupported';

/**
 * Display modes a launched-from-home-screen app can report. `standalone` covers
 * the common case; the other two are reported by some desktop and Android
 * installs, and an app launched in either is just as installed.
 */
const INSTALLED_DISPLAY_MODES = ['standalone', 'minimal-ui', 'window-controls-overlay'];

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  readonly canInstall = signal(false);
  readonly state = signal<PwaInstallState>(this.detectInitialState());
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /**
   * Whether the app is running as an installed PWA. Gates features that only
   * work when the app is opened regularly — auto-add runs on app open, so in a
   * rarely-visited browser tab it would seldom fire at all.
   */
  readonly isInstalled = computed(() => this.state() === 'installed');

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
      this.state.set('installable');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.state.set('installed');
    });
  }

  get isIos(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  }

  async install(): Promise<boolean> {
    if (!this.deferredPrompt) return false;
    await this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
    if (outcome === 'accepted') {
      this.state.set('installed');
      return true;
    }
    this.state.set('unsupported');
    return false;
  }

  private detectInitialState(): PwaInstallState {
    if (typeof window === 'undefined') return 'unsupported';
    const byDisplayMode =
      typeof window.matchMedia === 'function' &&
      INSTALLED_DISPLAY_MODES.some(
        (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
      );
    // iOS Safari reports none of the display modes and exposes this instead.
    const iosStandalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return byDisplayMode || iosStandalone ? 'installed' : 'unsupported';
  }
}
