import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BootProgressService } from '../../core/boot/boot-progress.service';

/**
 * Centred card overlaying the boot skeleton, reporting what the app is currently
 * waiting on. See `core/boot/boot-progress.service.ts` for how progress is derived.
 */
@Component({
  selector: 'app-boot-progress',
  imports: [TranslocoPipe],
  templateUrl: './boot-progress.component.html',
  styleUrl: './boot-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BootProgressComponent {
  private readonly bootProgress = inject(BootProgressService);

  readonly percent = this.bootProgress.percent;
  readonly phaseKey = this.bootProgress.phaseKey;
  readonly detail = this.bootProgress.detail;
  readonly counter = this.bootProgress.counter;
}
