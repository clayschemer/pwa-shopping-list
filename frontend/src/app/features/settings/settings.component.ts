import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ThemeService, Language, Currency } from '../../core/theme/theme.service';
import { PwaInstallService } from '../../core/pwa/pwa-install.service';
import { selectCurrentUser } from '../../store/account/account.selectors';
import { authActions } from '../../store/account/account.actions';
import { V } from '@angular/cdk/keycodes';

@Component({
  selector: 'app-settings',
  imports: [
    MatIconButton,
    MatIcon,
    MatSlideToggle,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatSelect,
    MatOption,
    TranslocoPipe,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent {
  private readonly store = inject(Store);
  private readonly location = inject(Location);
  private readonly themeService = inject(ThemeService);
  readonly pwaInstall = inject(PwaInstallService);

  readonly settings = this.themeService.settings;
  readonly effectiveDarkMode = this.themeService.effectiveDarkMode;
  readonly effectiveReduceMotion = this.themeService.effectiveReduceMotion;
  readonly effectiveHighContrast = this.themeService.effectiveHighContrast;
  readonly user = toSignal(this.store.select(selectCurrentUser));

  readonly languages: Language[] = ['EN', 'NO', 'SV', 'DE', 'FR'];
  readonly languageLabels: Record<Language, string> = {
    EN: 'English',
    NO: 'Norsk',
    SV: 'Svenska',
    DE: 'Deutsch',
    FR: 'Français',
  };
  readonly currencies: Currency[] = ['GBP', 'USD', 'EUR', 'NOK', 'SEK', 'DKK'];

  goBack(): void {
    this.location.back();
  }

  onDarkModeToggle(checked: boolean): void {
    this.themeService.update({ darkMode: checked });
  }

  onCompactToggle(checked: boolean): void {
    this.themeService.update({ compact: checked });
  }

  onReduceMotionToggle(checked: boolean): void {
    this.themeService.update({ reduceMotion: checked });
  }

  onHighContrastToggle(checked: boolean): void {
    this.themeService.update({ highContrast: checked });
  }

  onLeftHandedToggle(checked: boolean): void {
    this.themeService.update({ leftHanded: checked });
  }

  onKeepScreenAwakeToggle(checked: boolean): void {
    this.themeService.update({ keepScreenAwake: checked });
  }

  onLanguageChange(value: string): void {
    this.themeService.update({ language: value as Language });
  }

  onCurrencyChange(value: string): void {
    this.themeService.update({ currency: value as Currency });
  }

  signOut(): void {
    this.store.dispatch(authActions.signOutRequested());
  }

  installApp(): void {
    this.pwaInstall.install();
  }
}
