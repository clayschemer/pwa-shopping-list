import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { TranslocoPipe } from '@jsverse/transloco';
import { ThemeService } from '../../../core/theme/theme.service';
import { selectSelectedShopId } from '../../../store/ui/ui.selectors';

@Component({
  selector: 'app-plan-filter-sheet',
  imports: [MatIcon, MatSlideToggle, TranslocoPipe],
  templateUrl: './plan-filter-sheet.component.html',
  styleUrl: './plan-filter-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanFilterSheetComponent {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly sheetRef = inject(MatBottomSheetRef<PlanFilterSheetComponent>);

  private readonly selectedShopId = toSignal(
    this.store.select(selectSelectedShopId),
    { initialValue: null },
  );

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

  reorderCategories(): void {
    const layout = this.selectedShopId() ?? 'global';
    this.sheetRef.dismiss();
    this.router.navigate(['/categories'], { queryParams: { layout } });
  }
}
