import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-plan',
  imports: [TranslocoPipe],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanComponent {}
