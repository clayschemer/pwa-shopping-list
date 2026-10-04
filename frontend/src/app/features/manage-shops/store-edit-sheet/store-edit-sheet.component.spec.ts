import '../../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing';
import {
  StoreEditSheetComponent,
  StoreEditSheetData,
  StoreEditSheetResult,
} from './store-edit-sheet.component';

function setupWith(data: StoreEditSheetData) {
  const dismiss = vi.fn<(r?: StoreEditSheetResult) => void>();
  TestBed.configureTestingModule({
    imports: [StoreEditSheetComponent, provideTranslocoTesting()],
    providers: [
      { provide: MatBottomSheetRef, useValue: { dismiss } },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
    ],
  });
  const fixture: ComponentFixture<StoreEditSheetComponent> = TestBed.createComponent(
    StoreEditSheetComponent,
  );
  fixture.detectChanges();
  return { fixture, dismiss };
}

describe('StoreEditSheetComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('create mode does not render the delete button', () => {
    const { fixture } = setupWith({ mode: 'create', existingNames: [] });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-store-edit-sheet__delete')).toBeFalsy();
  });

  it('edit mode renders the delete button', () => {
    const { fixture } = setupWith({
      mode: 'edit',
      currentName: 'Tesco',
      currentPriceSearchUrl: 'https://tesco.com/search?q={query}',
      existingNames: ['Tesco'],
    });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-store-edit-sheet__delete')).toBeTruthy();
  });

  it('save in create mode emits the create result', () => {
    const { fixture, dismiss } = setupWith({ mode: 'create', existingNames: [] });
    fixture.componentInstance.name.set('Tesco');
    fixture.componentInstance.priceSearchUrl.set('https://tesco.com/?q={query}');
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({
      kind: 'create',
      name: 'Tesco',
      priceSearchUrl: 'https://tesco.com/?q={query}',
    });
  });

  it('save in create mode with empty URL passes null', () => {
    const { fixture, dismiss } = setupWith({ mode: 'create', existingNames: [] });
    fixture.componentInstance.name.set('Coop');
    fixture.componentInstance.onSave();
    expect(dismiss).toHaveBeenCalledWith({
      kind: 'create',
      name: 'Coop',
      priceSearchUrl: null,
    });
  });

  it('save in edit mode flags which fields changed', () => {
    const { fixture, dismiss } = setupWith({
      mode: 'edit',
      currentName: 'Tesco',
      currentPriceSearchUrl: 'https://old/?q={query}',
      existingNames: ['Tesco'],
    });
    fixture.componentInstance.name.set('Tesco');
    fixture.componentInstance.priceSearchUrl.set('https://new/?q={query}');
    fixture.componentInstance.onSave();
    const result = dismiss.mock.calls[0]![0] as Extract<
      StoreEditSheetResult,
      { kind: 'edit-save' }
    >;
    expect(result.nameChanged).toBe(false);
    expect(result.priceSearchUrlChanged).toBe(true);
  });

  it('clearing the URL in edit mode persists as null', () => {
    const { fixture, dismiss } = setupWith({
      mode: 'edit',
      currentName: 'Tesco',
      currentPriceSearchUrl: 'https://old/?q={query}',
      existingNames: ['Tesco'],
    });
    fixture.componentInstance.priceSearchUrl.set('');
    fixture.componentInstance.onSave();
    const result = dismiss.mock.calls[0]![0] as Extract<
      StoreEditSheetResult,
      { kind: 'edit-save' }
    >;
    expect(result.priceSearchUrl).toBeNull();
    expect(result.priceSearchUrlChanged).toBe(true);
  });

  it('delete in edit mode emits a delete result', () => {
    const { fixture, dismiss } = setupWith({
      mode: 'edit',
      currentName: 'Tesco',
      currentPriceSearchUrl: null,
      existingNames: [],
    });
    fixture.componentInstance.onDelete();
    expect(dismiss).toHaveBeenCalledWith({ kind: 'delete' });
  });

  it('flags a name conflict in create mode', () => {
    const { fixture } = setupWith({ mode: 'create', existingNames: ['Tesco'] });
    fixture.componentInstance.name.set('tesco');
    expect(fixture.componentInstance.hasConflict()).toBe(true);
    expect(fixture.componentInstance.isValid()).toBe(false);
  });
});
