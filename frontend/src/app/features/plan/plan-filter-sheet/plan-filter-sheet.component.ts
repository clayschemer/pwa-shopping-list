import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { TranslocoPipe } from '@jsverse/transloco';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-plan-filter-sheet',
  imports: [MatSlideToggle, TranslocoPipe],
  templateUrl: './plan-filter-sheet.component.html',
  styleUrl: './plan-filter-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanFilterSheetComponent {
  private readonly themeService = inject(ThemeService);

  readonly hideCategoryGrouping = computed(
    () => this.themeService.settings().hideCategoryGrouping,
  );
  readonly showCheckedItems = computed(
    () => this.themeService.settings().showCheckedItems,
  );
  readonly hidePrices = computed(
    () => this.themeService.settings().hidePrices,
  );

  toggleHideGrouping(value: boolean): void {
    this.themeService.update({ hideCategoryGrouping: value });
  }

  toggleShowChecked(value: boolean): void {
    this.themeService.update({ showCheckedItems: value });
  }

  toggleHidePrices(value: boolean): void {
    this.themeService.update({ hidePrices: value });
  }
}
