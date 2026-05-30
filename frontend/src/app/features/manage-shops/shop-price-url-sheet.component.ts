import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export interface ShopPriceUrlSheetData {
  shopName: string;
  currentUrl: string | null;
}

export interface ShopPriceUrlSheetResult {
  url: string | null;
}

@Component({
  selector: 'app-shop-price-url-sheet',
  imports: [
    FormsModule,
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
    MatButton,
    TranslocoPipe,
  ],
  templateUrl: './shop-price-url-sheet.component.html',
  styleUrl: './shop-price-url-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopPriceUrlSheetComponent {
  private readonly sheetRef = inject(MatBottomSheetRef<ShopPriceUrlSheetComponent>);
  private readonly data = inject<ShopPriceUrlSheetData>(MAT_BOTTOM_SHEET_DATA);

  readonly shopName = this.data.shopName;
  readonly url = signal(this.data.currentUrl ?? '');

  readonly hasUrl = computed(() => this.url().trim().length > 0);

  onCancel(): void {
    this.sheetRef.dismiss();
  }

  onSubmit(): void {
    const trimmed = this.url().trim();
    this.sheetRef.dismiss({
      url: trimmed.length > 0 ? trimmed : null,
    } satisfies ShopPriceUrlSheetResult);
  }
}
