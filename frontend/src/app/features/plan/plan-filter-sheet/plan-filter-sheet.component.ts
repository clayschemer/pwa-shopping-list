import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-plan-filter-sheet',
  imports: [TranslocoPipe],
  templateUrl: './plan-filter-sheet.component.html',
  styleUrl: './plan-filter-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanFilterSheetComponent {}
