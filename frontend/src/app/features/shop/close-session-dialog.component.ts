import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export interface CloseSessionData {
  allChecked: boolean;
}

export type CloseSessionResult = 'close' | 'discard';

@Component({
  selector: 'app-close-session-dialog',
  imports: [
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    TranslocoPipe,
  ],
  template: `
    <h2 mat-dialog-title>
      {{
        (data.allChecked
          ? 'closeSession.allDoneTitle'
          : 'closeSession.remainingTitle'
        ) | transloco
      }}
    </h2>
    <mat-dialog-content>
      {{
        (data.allChecked
          ? 'closeSession.allDoneMessage'
          : 'closeSession.remainingMessage'
        ) | transloco
      }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        {{
          (data.allChecked
            ? 'closeSession.notYet'
            : 'closeSession.keepShopping'
          ) | transloco
        }}
      </button>
      <button mat-button color="warn" [mat-dialog-close]="'discard'">
        {{ 'closeSession.discard' | transloco }}
      </button>
      <button mat-button color="primary" [mat-dialog-close]="'close'">
        {{ 'closeSession.close' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloseSessionDialogComponent {
  readonly data = inject<CloseSessionData>(MAT_DIALOG_DATA);
}
