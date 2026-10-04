import '../../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing';
import {
  CategoryEditSheetComponent,
  CategoryEditSheetData,
  CategoryEditSheetResult,
} from './category-edit-sheet.component';
import type { CategoryId, ShopId } from '../../../models/ids.model';

function setupWith(data: CategoryEditSheetData) {
  const dismiss = vi.fn<(r?: CategoryEditSheetResult) => void>();
  const sheetRef = { dismiss } as unknown as MatBottomSheetRef<
    CategoryEditSheetComponent,
    CategoryEditSheetResult
  >;
  TestBed.configureTestingModule({
    imports: [CategoryEditSheetComponent, provideTranslocoTesting()],
    providers: [
      { provide: MatBottomSheetRef, useValue: sheetRef },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
    ],
  });
  const fixture: ComponentFixture<CategoryEditSheetComponent> = TestBed.createComponent(
    CategoryEditSheetComponent,
  );
  fixture.detectChanges();
  return { fixture, dismiss };
}

describe('CategoryEditSheetComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('create mode does not render the shops fieldset or delete button', () => {
    const { fixture } = setupWith({ mode: 'create', existingNames: [] });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-category-edit-sheet__shops')).toBeFalsy();
    expect(el.querySelector('.app-category-edit-sheet__delete')).toBeFalsy();
  });

  it('edit mode renders shops fieldset and delete button', () => {
    const { fixture } = setupWith({
      mode: 'edit',
      categoryId: 'c1' as CategoryId,
      currentName: 'Dairy',
      currentColor: '#87b7d2',
      existingNames: ['Dairy'],
      shops: [
        { id: 's1' as ShopId, name: 'Tesco', includes: true },
        { id: 's2' as ShopId, name: 'ICA', includes: false },
      ],
    });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-category-edit-sheet__shops')).toBeTruthy();
    expect(el.querySelector('.app-category-edit-sheet__delete')).toBeTruthy();
    expect(el.querySelectorAll('.app-category-edit-sheet__shops-row').length).toBe(2);
  });

  it('save in create mode dismisses with create kind', () => {
    const { fixture, dismiss } = setupWith({ mode: 'create', existingNames: [] });
    fixture.componentInstance.name.set('Frozen');
    fixture.componentInstance.color.set('#9a93d6');
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({
      kind: 'create',
      name: 'Frozen',
      color: '#9a93d6',
    });
  });

  it('save in edit mode dismisses with added/removed shop diffs', () => {
    const { fixture, dismiss } = setupWith({
      mode: 'edit',
      categoryId: 'c1' as CategoryId,
      currentName: 'Dairy',
      currentColor: '#87b7d2',
      existingNames: ['Dairy'],
      shops: [
        { id: 's1' as ShopId, name: 'Tesco', includes: true },
        { id: 's2' as ShopId, name: 'ICA', includes: false },
        { id: 's3' as ShopId, name: 'Coop', includes: true },
      ],
    });
    fixture.componentInstance.toggleShop('s1' as ShopId, false);
    fixture.componentInstance.toggleShop('s2' as ShopId, true);
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledTimes(1);
    const result = dismiss.mock.calls[0]![0] as Extract<
      CategoryEditSheetResult,
      { kind: 'edit-save' }
    >;
    expect(result.kind).toBe('edit-save');
    expect(result.addedShops).toEqual(['s2']);
    expect(result.removedShops).toEqual(['s1']);
  });

  it('delete in edit mode dismisses with delete kind', () => {
    const { fixture, dismiss } = setupWith({
      mode: 'edit',
      categoryId: 'c1' as CategoryId,
      currentName: 'Dairy',
      currentColor: null,
      existingNames: [],
      shops: [],
    });
    fixture.componentInstance.onDelete();
    expect(dismiss).toHaveBeenCalledWith({ kind: 'delete' });
  });

  it('cancel dismisses without a result', () => {
    const { fixture, dismiss } = setupWith({ mode: 'create', existingNames: [] });
    fixture.componentInstance.onCancel();
    expect(dismiss).toHaveBeenCalledWith();
  });

  it('flags a name conflict in create mode', () => {
    const { fixture } = setupWith({ mode: 'create', existingNames: ['Dairy'] });
    fixture.componentInstance.name.set('dairy');
    expect(fixture.componentInstance.hasConflict()).toBe(true);
    expect(fixture.componentInstance.isValid()).toBe(false);
  });

  it('does not flag conflict when edit-mode name unchanged', () => {
    const { fixture } = setupWith({
      mode: 'edit',
      categoryId: 'c1' as CategoryId,
      currentName: 'Dairy',
      currentColor: null,
      existingNames: ['Dairy'],
      shops: [],
    });
    fixture.componentInstance.name.set('Dairy');
    expect(fixture.componentInstance.hasConflict()).toBe(false);
  });
});
