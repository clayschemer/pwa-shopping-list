import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';

export type InactivityReminderResult = 'close' | 'continue';

@Component({
  selector: 'app-inactivity-reminder-dialog',
  imports: [
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    TranslocoPipe,
  ],
  templateUrl: './inactivity-reminder-dialog.component.html',
  styleUrl: './inactivity-reminder-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InactivityReminderDialogComponent {}
