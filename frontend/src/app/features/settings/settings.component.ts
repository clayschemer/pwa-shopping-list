import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SettingsService, Language, Currency } from '../../core/settings/settings.service';
import { selectCurrentUser, selectAccount } from '../../store/account/account.selectors';
import { authActions } from '../../store/account/account.actions';
import { toSignal } from '@angular/core/rxjs-interop';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'no', label: 'Norsk' },
  { value: 'sv', label: 'Svenska' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'NOK', label: 'NOK (kr)' },
  { value: 'SEK', label: 'SEK (kr)' },
  { value: 'DKK', label: 'DKK (kr)' },
];

/**
 * Settings screen. Device-local settings read/written via SettingsService (localStorage).
 * AI auto-add is account-level — dispatched to the store.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatSlideToggle,
    MatSelect,
    MatOption,
    MatFormField,
    MatLabel,
    MatButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings">
      <h1 class="settings__title">Settings</h1>

      <!-- Appearance -->
      <section class="settings__section">
        <h2 class="settings__section-title">Appearance</h2>
        <div class="settings__row">
          <span>Dark mode</span>
          <mat-slide-toggle
            aria-label="Dark mode"
            [checked]="settings().darkMode"
            (change)="setSetting('darkMode', $event.checked)"
          />
        </div>
        <div class="settings__row">
          <span>Compact mode</span>
          <mat-slide-toggle
            aria-label="Compact mode"
            [checked]="settings().compactMode"
            (change)="setSetting('compactMode', $event.checked)"
          />
        </div>
      </section>

      <!-- Accessibility -->
      <section class="settings__section">
        <h2 class="settings__section-title">Accessibility</h2>
        <div class="settings__row">
          <span>Reduce motion</span>
          <mat-slide-toggle
            aria-label="Reduce motion"
            [checked]="settings().reduceMotion"
            (change)="setSetting('reduceMotion', $event.checked)"
          />
        </div>
        <div class="settings__row">
          <span>High contrast</span>
          <mat-slide-toggle
            aria-label="High contrast"
            [checked]="settings().highContrast"
            (change)="setSetting('highContrast', $event.checked)"
          />
        </div>
        <div class="settings__row">
          <span>Left-handed mode</span>
          <mat-slide-toggle
            aria-label="Left-handed mode"
            [checked]="settings().leftHandedMode"
            (change)="setSetting('leftHandedMode', $event.checked)"
          />
        </div>
      </section>

      <!-- Language & Region -->
      <section class="settings__section">
        <h2 class="settings__section-title">Language & Region</h2>
        <div class="settings__row settings__row--select">
          <mat-form-field>
            <mat-label>Language</mat-label>
            <mat-select
              [value]="settings().language"
              (selectionChange)="setSetting('language', $event.value)"
              aria-label="Language"
            >
              @for (lang of languages; track lang.value) {
                <mat-option [value]="lang.value">{{ lang.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <div class="settings__row settings__row--select">
          <mat-form-field>
            <mat-label>Currency</mat-label>
            <mat-select
              [value]="settings().currency"
              (selectionChange)="setSetting('currency', $event.value)"
              aria-label="Currency"
            >
              @for (cur of currencies; track cur.value) {
                <mat-option [value]="cur.value">{{ cur.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </section>

      <!-- Display -->
      <section class="settings__section">
        <h2 class="settings__section-title">Display</h2>
        <div class="settings__row">
          <span>Keep screen awake</span>
          <mat-slide-toggle
            aria-label="Keep screen awake"
            [checked]="settings().keepScreenAwake"
            (change)="setSetting('keepScreenAwake', $event.checked)"
          />
        </div>
      </section>

      <!-- Account -->
      <section class="settings__section">
        <h2 class="settings__section-title">Account</h2>
        @if (currentUser()) {
          <p class="settings__email">Signed in as {{ currentUser()!.email }}</p>
        }
        <button
          mat-stroked-button
          color="warn"
          class="settings__sign-out"
          (click)="signOut()"
        >
          Sign out
        </button>
      </section>
    </div>
  `,
  styles: [`
    .settings {
      padding: 1rem;
      max-width: 40rem;
      margin: 0 auto;
    }

    .settings__title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
    }

    .settings__section {
      margin-bottom: 2rem;
    }

    .settings__section-title {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 0.75rem;
    }

    .settings__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }

    .settings__row:last-child {
      border-bottom: none;
    }

    .settings__row--select {
      justify-content: flex-start;
      mat-form-field {
        width: 100%;
      }
    }

    .settings__email {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .settings__sign-out {
      width: 100%;
    }
  `],
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly store = inject(Store);

  readonly settings = this.settingsService.settings;
  readonly currentUser = toSignal(this.store.select(selectCurrentUser), {
    initialValue: null,
  });

  readonly languages = LANGUAGES;
  readonly currencies = CURRENCIES;

  setSetting<K extends keyof ReturnType<typeof this.settings>>(
    key: K,
    value: ReturnType<typeof this.settings>[K],
  ): void {
    this.settingsService.set(key, value);
  }

  signOut(): void {
    this.store.dispatch(authActions.signOutRequested());
  }
}
