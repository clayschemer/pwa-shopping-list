import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { ShopModeChangeDialogComponent } from './shop-mode-change-dialog.component';

describe('ShopModeChangeDialogComponent', () => {
  let fixture: ComponentFixture<ShopModeChangeDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ShopModeChangeDialogComponent, provideTranslocoTesting()],
      providers: [{ provide: MatDialogRef, useValue: { close } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopModeChangeDialogComponent);
    fixture.detectChanges();
  });

  it('renders both action buttons and a cancel option', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-shop-mode-change-dialog__switch-to-plan')).toBeTruthy();
    expect(el.querySelector('.app-shop-mode-change-dialog__start-session')).toBeTruthy();
    expect(el.querySelector('.app-shop-mode-change-dialog__cancel')).toBeTruthy();
  });

  it('closes with "switch-to-plan" when that action is chosen', () => {
    const el: HTMLElement = fixture.nativeElement;
    (el.querySelector('.app-shop-mode-change-dialog__switch-to-plan') as HTMLElement).click();
    expect(close).toHaveBeenCalledWith('switch-to-plan');
  });

  it('closes with "start-session" when that action is chosen', () => {
    const el: HTMLElement = fixture.nativeElement;
    (el.querySelector('.app-shop-mode-change-dialog__start-session') as HTMLElement).click();
    expect(close).toHaveBeenCalledWith('start-session');
  });

  it('closes with undefined when cancelled', () => {
    const el: HTMLElement = fixture.nativeElement;
    (el.querySelector('.app-shop-mode-change-dialog__cancel') as HTMLElement).click();
    expect(close).toHaveBeenCalledWith(undefined);
  });
});
