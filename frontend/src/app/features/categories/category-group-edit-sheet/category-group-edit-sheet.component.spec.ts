import '../../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing';
import {
  CategoryGroupEditSheetComponent,
  CategoryGroupEditSheetData,
  CategoryGroupEditSheetResult,
} from './category-group-edit-sheet.component';
import type { CategoryGroupId, ShopId } from '../../../models/ids.model';

function setupWith(data: CategoryGroupEditSheetData) {
  const dismiss = vi.fn<(r?: CategoryGroupEditSheetResult) => void>();
  const sheetRef = { dismiss } as unknown as MatBottomSheetRef<
    CategoryGroupEditSheetComponent,
    CategoryGroupEditSheetResult
  >;
  TestBed.configureTestingModule({
    imports: [CategoryGroupEditSheetComponent, provideTranslocoTesting()],
    providers: [
      { provide: MatBottomSheetRef, useValue: sheetRef },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
    ],
  });
  const fixture: ComponentFixture<CategoryGroupEditSheetComponent> =
    TestBed.createComponent(CategoryGroupEditSheetComponent);
  fixture.detectChanges();
  return { fixture, dismiss };
}

function edit(
  overrides: Partial<Extract<CategoryGroupEditSheetData, { mode: 'edit' }>> = {},
): CategoryGroupEditSheetData {
  return {
    mode: 'edit',
    groupId: 'g1' as CategoryGroupId,
    currentName: 'Grocery',
    existingNames: ['Grocery', 'Furniture'],
    memberCount: 3,
    shops: [
      { id: 's1' as ShopId, name: 'Tesco', state: 'all' },
      { id: 's2' as ShopId, name: 'ICA', state: 'some' },
      { id: 's3' as ShopId, name: 'IKEA', state: 'none' },
    ],
    ...overrides,
  };
}

describe('CategoryGroupEditSheetComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('create mode renders neither the shops fieldset nor the delete button', () => {
    const { fixture } = setupWith({ mode: 'create', existingNames: [] });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-category-group-edit-sheet__shops')).toBeFalsy();
    expect(el.querySelector('.app-category-group-edit-sheet__delete')).toBeFalsy();
  });

  it('create mode dismisses with the trimmed name', () => {
    const { fixture, dismiss } = setupWith({ mode: 'create', existingNames: [] });
    fixture.componentInstance.name.set('  Furniture  ');
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({ kind: 'create', name: 'Furniture' });
  });

  it('blocks saving a name that already exists', () => {
    const { fixture, dismiss } = setupWith({
      mode: 'create',
      existingNames: ['Grocery'],
    });
    fixture.componentInstance.name.set('grocery');
    expect(fixture.componentInstance.hasConflict()).toBe(true);
    fixture.componentInstance.onSave();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('allows an edit that keeps the group its own name', () => {
    const { fixture } = setupWith(edit());
    expect(fixture.componentInstance.hasConflict()).toBe(false);
    expect(fixture.componentInstance.isValid()).toBe(true);
  });

  it('renders a partially available shop as indeterminate, not checked', () => {
    const { fixture } = setupWith(edit());
    const rows = fixture.componentInstance.shopRows();
    expect(rows.map((r) => r.state)).toEqual(['all', 'some', 'none']);
  });

  it('ticking a partially available shop adds it — all members become available', () => {
    const { fixture, dismiss } = setupWith(edit());
    fixture.componentInstance.toggleShop('s2' as ShopId);
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({
      kind: 'edit-save',
      name: 'Grocery',
      addedShops: ['s2' as ShopId],
      removedShops: [],
    });
  });

  it('unticking a fully available shop removes it', () => {
    const { fixture, dismiss } = setupWith(edit());
    fixture.componentInstance.toggleShop('s1' as ShopId);
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({
      kind: 'edit-save',
      name: 'Grocery',
      addedShops: [],
      removedShops: ['s1' as ShopId],
    });
  });

  it('a shop left partially available appears in neither list', () => {
    const { fixture, dismiss } = setupWith(edit());
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({
      kind: 'edit-save',
      name: 'Grocery',
      addedShops: [],
      removedShops: [],
    });
  });

  it('toggling a partial shop twice returns it to none, not to partial', () => {
    const { fixture, dismiss } = setupWith(edit());
    fixture.componentInstance.toggleShop('s2' as ShopId); // some -> all
    fixture.componentInstance.toggleShop('s2' as ShopId); // all  -> none
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({
      kind: 'edit-save',
      name: 'Grocery',
      addedShops: [],
      removedShops: ['s2' as ShopId],
    });
  });

  it('shows a hint instead of inert controls when the group has no categories', () => {
    const { fixture } = setupWith(edit({ memberCount: 0 }));
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-category-group-edit-sheet__no-members')).toBeTruthy();
  });

  it('dismisses with a delete intent', () => {
    const { fixture, dismiss } = setupWith(edit());
    fixture.componentInstance.onDelete();
    expect(dismiss).toHaveBeenCalledWith({ kind: 'delete' });
  });
});
