import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shop',
  standalone: true,
  template: '<p>Shop mode — coming soon</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent {}
