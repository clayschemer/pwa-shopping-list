import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { TranslocoPipe } from '@jsverse/transloco';
import { itemsApiActions } from '../../store/items/items.actions';
import { MoneyPipe } from '../../core/format/money.pipe';
import type { ItemId } from '../../models/ids.model';

export interface PriceProductDialogData {
  itemId: ItemId;
  itemName: string;
  productName: string | null;
  productUrl: string | null;
  searchUrl: string | null;
  shopName: string | null;
  price: number | null;
  priceQuantity: number | null;
  priceUnit: string | null;
  priceUpdatedAt: number | null;
}

@Component({
  selector: 'app-price-product-dialog',
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    TranslocoPipe,
    MoneyPipe,
  ],
  templateUrl: './price-product-dialog.component.html',
  styleUrl: './price-product-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceProductDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PriceProductDialogComponent>);
  private readonly store = inject(Store);
  readonly data = inject<PriceProductDialogData>(MAT_DIALOG_DATA);

  readonly feedbackOpen = signal(false);
  readonly feedbackSubmitted = signal(false);
  readonly reason = signal('');

  onClose(): void {
    this.dialogRef.close();
  }

  openFeedback(): void {
    this.feedbackOpen.set(true);
  }

  cancelFeedback(): void {
    this.feedbackOpen.set(false);
    this.reason.set('');
  }

  submitFeedback(): void {
    const trimmed = this.reason().trim();
    if (!trimmed) return;
    this.store.dispatch(
      itemsApiActions.submitPriceFeedbackRequested({
        id: this.data.itemId,
        reason: trimmed,
      }),
    );
    this.feedbackSubmitted.set(true);
  }
}
