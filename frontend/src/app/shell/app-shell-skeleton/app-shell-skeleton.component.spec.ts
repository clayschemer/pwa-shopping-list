import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppShellSkeletonComponent } from './app-shell-skeleton.component';

/**
 * These counts are duplicated as static markup in `src/index.html` so the pre-bootstrap
 * splash and this component paint identical geometry. Changing them here means changing
 * the splash too, or the hand-off flashes a layout jump.
 */
const SPLASH_GROUP_COUNT = 2;
const SPLASH_ROW_COUNT = 5;

describe('AppShellSkeletonComponent', () => {
  let fixture: ComponentFixture<AppShellSkeletonComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellSkeletonComponent);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('hides the whole placeholder tree from assistive technology', () => {
    expect(el.querySelector('.app-shell-skeleton')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('renders a top bar silhouette so the shell does not shift when it mounts', () => {
    expect(el.querySelector('.app-shell-skeleton__top-bar')).toBeTruthy();
  });

  it('renders the same group and row counts as the index.html splash', () => {
    expect(el.querySelectorAll('.app-shell-skeleton__group')).toHaveLength(
      SPLASH_GROUP_COUNT,
    );
    expect(el.querySelectorAll('.app-shell-skeleton__item')).toHaveLength(
      SPLASH_ROW_COUNT,
    );
  });

  it('contains no text, so it needs no translation', () => {
    expect(el.textContent?.trim()).toBe('');
  });
});
