import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the whole app shell, shown while auth resolves and before any
 * feature route can mount.
 *
 * Geometry deliberately matches both the pre-bootstrap splash in `src/index.html`
 * and the plan-mode skeleton in `features/plan`, so the three hand off to each
 * other without a layout jump. See `app-shell-skeleton.component.spec.ts`.
 */
@Component({
  selector: 'app-shell-skeleton',
  templateUrl: './app-shell-skeleton.component.html',
  styleUrl: './app-shell-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellSkeletonComponent {
  /** Two placeholder category groups holding three and two rows respectively. */
  readonly groups: readonly (readonly number[])[] = [
    [1, 2, 3],
    [1, 2],
  ];
}
