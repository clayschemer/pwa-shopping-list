import '../../../testing/init-testbed';
import { describe, it, expect, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';
import { ShopPickerDialogComponent, ShopPickerData } from './shop-picker-dialog.component';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: [] as CategoryId[],
  priceSearchUrl: null,
});

describe('ShopPickerDialogComponent', () => {
  let fixture: ComponentFixture<ShopPickerDialogComponent>;
  let component: ShopPickerDialogComponent;
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  function setup(data: ShopPickerData) {
    dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ShopPickerDialogComponent, provideTranslocoTesting()],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopPickerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const shops = [shop('s1', 'Tesco'), shop('s2', 'Lidl')];

  it('renders every shop plus a Global option', () => {
    setup({ shops, selectedShopId: 's1' as ShopId });
    const el: HTMLElement = fixture.nativeElement;
    const options = el.querySelectorAll('.app-shop-picker-dialog__option');
    expect(options.length).toBe(3);
    expect(el.textContent).toContain('Tesco');
    expect(el.textContent).toContain('Lidl');
  });

  it('marks the currently selected shop', () => {
    setup({ shops, selectedShopId: 's1' as ShopId });
    const el: HTMLElement = fixture.nativeElement;
    const selected = el.querySelector('.app-shop-picker-dialog__option--selected');
    expect(selected?.textContent).toContain('Tesco');
  });

  it('marks Global as selected when selectedShopId is null', () => {
    setup({ shops, selectedShopId: null });
    const el: HTMLElement = fixture.nativeElement;
    const selected = el.querySelector('.app-shop-picker-dialog__option--selected');
    expect(selected?.textContent).toContain('Global');
  });

  it('closes the dialog with the chosen shop id when an option is clicked', () => {
    setup({ shops, selectedShopId: 's1' as ShopId });
    const el: HTMLElement = fixture.nativeElement;
    const lidl = Array.from(el.querySelectorAll('.app-shop-picker-dialog__option')).find((o) =>
      o.textContent?.includes('Lidl'),
    ) as HTMLElement;
    lidl.click();
    expect(dialogRef.close).toHaveBeenCalledWith('s2' as ShopId);
  });

  it('closes the dialog with null when Global is chosen', () => {
    setup({ shops, selectedShopId: 's1' as ShopId });
    const el: HTMLElement = fixture.nativeElement;
    const global = el.querySelector('.app-shop-picker-dialog__option--global') as HTMLElement;
    global.click();
    expect(dialogRef.close).toHaveBeenCalledWith(null);
  });

  it('isSelected reflects data.selectedShopId', () => {
    setup({ shops, selectedShopId: 's2' as ShopId });
    expect(component.isSelected('s2' as ShopId)).toBe(true);
    expect(component.isSelected('s1' as ShopId)).toBe(false);
    expect(component.isSelected(null)).toBe(false);
  });
});
