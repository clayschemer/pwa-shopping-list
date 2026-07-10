import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, EMPTY } from 'rxjs';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { ShopBannerComponent } from './shop-banner.component';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: [] as CategoryId[],
  priceSearchUrl: null,
});

describe('ShopBannerComponent', () => {
  let fixture: ComponentFixture<ShopBannerComponent>;
  let component: ShopBannerComponent;
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => EMPTY }) };
    await TestBed.configureTestingModule({
      imports: [ShopBannerComponent, provideTranslocoTesting()],
      providers: [{ provide: MatDialog, useValue: dialog }],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopBannerComponent);
    component = fixture.componentInstance;
  });

  describe('plan/categories mode (isShopMode = false)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('shops', [shop('s1', 'Tesco'), shop('s2', 'Lidl')]);
      fixture.componentRef.setInput('selectedShopId', 's1');
      fixture.componentRef.setInput('isShopMode', false);
      fixture.detectChanges();
    });

    it('renders a trigger button showing the selected shop name', () => {
      const el: HTMLElement = fixture.nativeElement;
      const trigger = el.querySelector('.app-shop-banner__trigger');
      expect(trigger?.textContent).toContain('Tesco');
    });

    it('does not render a mat-select', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('mat-select')).toBeFalsy();
    });

    it('opens the shop-picker dialog when the trigger is clicked', () => {
      const el: HTMLElement = fixture.nativeElement;
      (el.querySelector('.app-shop-banner__trigger') as HTMLElement).click();
      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: {
            shops: [shop('s1', 'Tesco'), shop('s2', 'Lidl')],
            selectedShopId: 's1',
          },
        }),
      );
    });

    it('emits shopSelected with the dialog result when a shop is chosen', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of('s2' as ShopId) });
      let emitted: ShopId | null | undefined;
      component.shopSelected.subscribe((id) => (emitted = id));
      const el: HTMLElement = fixture.nativeElement;
      (el.querySelector('.app-shop-banner__trigger') as HTMLElement).click();
      expect(emitted).toBe('s2');
    });

    it('emits shopSelected with null when Global is chosen', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(null) });
      let emitted: ShopId | null | undefined;
      component.shopSelected.subscribe((id) => (emitted = id));
      const el: HTMLElement = fixture.nativeElement;
      (el.querySelector('.app-shop-banner__trigger') as HTMLElement).click();
      expect(emitted).toBe(null);
    });

    it('does not emit shopSelected when the dialog is dismissed without a choice', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      let emitted = false;
      component.shopSelected.subscribe(() => (emitted = true));
      const el: HTMLElement = fixture.nativeElement;
      (el.querySelector('.app-shop-banner__trigger') as HTMLElement).click();
      expect(emitted).toBe(false);
    });

    it('does not emit changeRequested when clicked', () => {
      let emitted = false;
      component.changeRequested.subscribe(() => (emitted = true));
      const el: HTMLElement = fixture.nativeElement;
      (el.querySelector('.app-shop-banner__trigger') as HTMLElement).click();
      expect(emitted).toBe(false);
    });
  });

  describe('shop mode (isShopMode = true)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('shops', [shop('s1', 'Tesco'), shop('s2', 'Lidl')]);
      fixture.componentRef.setInput('selectedShopId', 's1');
      fixture.componentRef.setInput('isShopMode', true);
      fixture.detectChanges();
    });

    it('renders a trigger button showing the selected shop name', () => {
      const el: HTMLElement = fixture.nativeElement;
      const trigger = el.querySelector('.app-shop-banner__trigger');
      expect(trigger?.textContent).toContain('Tesco');
    });

    it('shows the Global fallback when no shop is selected', () => {
      fixture.componentRef.setInput('selectedShopId', null);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const trigger = el.querySelector('.app-shop-banner__trigger');
      expect(trigger?.textContent).toContain('Global');
    });

    it('emits changeRequested when the trigger is clicked, without opening the dialog', () => {
      let emitted = false;
      component.changeRequested.subscribe(() => (emitted = true));
      const el: HTMLElement = fixture.nativeElement;
      (el.querySelector('.app-shop-banner__trigger') as HTMLElement).click();
      expect(emitted).toBe(true);
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('has an aria-label on the trigger for change-shop', () => {
      const el: HTMLElement = fixture.nativeElement;
      const trigger = el.querySelector('.app-shop-banner__trigger');
      expect(trigger?.getAttribute('aria-label')).toBe('Change shop');
    });
  });
});
