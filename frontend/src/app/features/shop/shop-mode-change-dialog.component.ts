import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export type ShopModeChangeResult = 'switch-to-plan' | 'start-session' | undefined;

@Component({
  selector: 'app-shop-mode-change-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, TranslocoPipe],
  templateUrl: './shop-mode-change-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopModeChangeDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<ShopModeChangeDialogComponent, ShopModeChangeResult>,
  );

  switchToPlanMode(): void {
    this.dialogRef.close('switch-to-plan');
  }

  startAnotherSession(): void {
    this.dialogRef.close('start-session');
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
