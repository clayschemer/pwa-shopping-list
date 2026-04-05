import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: '<p>Settings — coming soon</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
