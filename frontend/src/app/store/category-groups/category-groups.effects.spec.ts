import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject, of } from 'rxjs';
import { CategoryGroupsEffects } from './category-groups.effects';
import { categoryGroupsActions, categoryGroupsApiActions } from './category-groups.actions';
import { accountActions } from '../account/account.actions';
import { CategoryGroupApiService } from '../../core/api/category-group-api.service';
import type { CategoryGroup } from '../../models/category-group.model';
import type { AccountId, CategoryGroupId } from '../../models/ids.model';

const mockGroups: CategoryGroup[] = [
  { id: 'g1' as CategoryGroupId, accountId: 'a1' as AccountId, name: 'Grocery' },
  { id: 'g2' as CategoryGroupId, accountId: 'a1' as AccountId, name: 'Furniture' },
];

const mockAccount = {
  id: 'a1' as AccountId,
  name: 'Test',
  shopOrder: [],
  aiConfig: null,
};

const accountLoaded = () =>
  accountActions.accountLoaded({ account: mockAccount, selectedShopId: null });

describe('CategoryGroupsEffects', () => {
  let effects: CategoryGroupsEffects;
  let actions$: Subject<unknown>;
  let api: {
    fetchAllCategoryGroups: ReturnType<typeof vi.fn>;
    addCategoryGroup: ReturnType<typeof vi.fn>;
    renameCategoryGroup: ReturnType<typeof vi.fn>;
    deleteCategoryGroup: ReturnType<typeof vi.fn>;
    categoryGroupChanges$: ReturnType<typeof vi.fn>;
  };

  const flush = () => new Promise<void>((r) => setTimeout(r));

  beforeEach(() => {
    actions$ = new Subject();
    api = {
      fetchAllCategoryGroups: vi.fn(),
      addCategoryGroup: vi.fn(),
      renameCategoryGroup: vi.fn(),
      deleteCategoryGroup: vi.fn(),
      categoryGroupChanges$: vi.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        CategoryGroupsEffects,
        provideMockActions(() => actions$),
        { provide: CategoryGroupApiService, useValue: api },
      ],
    });

    effects = TestBed.inject(CategoryGroupsEffects);
  });

  it('fetches all groups on accountLoaded', async () => {
    api.fetchAllCategoryGroups.mockResolvedValue(mockGroups);
    const results: unknown[] = [];
    effects.fetchAllCategoryGroups$.subscribe((a) => results.push(a));

    actions$.next(accountLoaded());
    await flush();

    expect(results).toEqual([
      categoryGroupsActions.categoryGroupsLoaded({ groups: mockGroups }),
    ]);
  });

  it('partitions the change stream into upserts and removals', async () => {
    api.categoryGroupChanges$.mockReturnValue(
      of([
        { entity: mockGroups[0], changeType: 'added' as const },
        { entity: mockGroups[1], changeType: 'removed' as const },
      ]),
    );
    const results: unknown[] = [];
    effects.watchCategoryGroupChanges$.subscribe((a) => results.push(a));

    actions$.next(accountLoaded());
    await flush();

    expect(results).toEqual([
      categoryGroupsActions.categoryGroupChangesReceived({
        groups: [mockGroups[0]],
        removed: ['g2' as CategoryGroupId],
      }),
    ]);
  });

  it('dispatches categoryGroupAdded on a successful add', async () => {
    api.addCategoryGroup.mockResolvedValue(mockGroups[0]);
    const results: unknown[] = [];
    effects.addCategoryGroup$.subscribe((a) => results.push(a));

    actions$.next(categoryGroupsApiActions.addCategoryGroupRequested({ name: 'Grocery' }));
    await flush();

    expect(api.addCategoryGroup).toHaveBeenCalledWith('Grocery');
    expect(results).toEqual([
      categoryGroupsActions.categoryGroupAdded({ group: mockGroups[0] }),
    ]);
  });

  it('does not add on a name conflict', async () => {
    api.addCategoryGroup.mockResolvedValue({
      type: 'NAME_CONFLICT',
      entityKind: 'categoryGroup',
      name: 'Grocery',
    });
    const results: unknown[] = [];
    effects.addCategoryGroup$.subscribe((a) => results.push(a));

    actions$.next(categoryGroupsApiActions.addCategoryGroupRequested({ name: 'Grocery' }));
    await flush();

    expect(results).toHaveLength(1);
    expect((results[0] as { type: string }).type).not.toContain('Category Group Added');
  });

  it('dispatches categoryGroupRenamed on a successful rename', async () => {
    api.renameCategoryGroup.mockResolvedValue({ ...mockGroups[0], name: 'Aisles' });
    const results: unknown[] = [];
    effects.renameCategoryGroup$.subscribe((a) => results.push(a));

    actions$.next(
      categoryGroupsApiActions.renameCategoryGroupRequested({
        id: 'g1' as CategoryGroupId,
        name: 'Aisles',
      }),
    );
    await flush();

    expect(results).toEqual([
      categoryGroupsActions.categoryGroupRenamed({
        group: { ...mockGroups[0], name: 'Aisles' },
      }),
    ]);
  });

  it('dispatches categoryGroupDeleted on a successful delete', async () => {
    api.deleteCategoryGroup.mockResolvedValue(undefined);
    const results: unknown[] = [];
    effects.deleteCategoryGroup$.subscribe((a) => results.push(a));

    actions$.next(
      categoryGroupsApiActions.deleteCategoryGroupRequested({ id: 'g1' as CategoryGroupId }),
    );
    await flush();

    expect(results).toEqual([
      categoryGroupsActions.categoryGroupDeleted({ id: 'g1' as CategoryGroupId }),
    ]);
  });

  describe('failure resilience', () => {
    it('addCategoryGroup$ dispatches categoryGroupSaveFailed and survives a rejected call', async () => {
      api.addCategoryGroup
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(mockGroups[0]);
      const results: unknown[] = [];
      let errored = false;
      effects.addCategoryGroup$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoryGroupsApiActions.addCategoryGroupRequested({ name: 'Grocery' });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        categoryGroupsActions.categoryGroupSaveFailed({ id: null }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Category Group Added');
    });

    it('renameCategoryGroup$ dispatches categoryGroupSaveFailed and survives a rejected call', async () => {
      api.renameCategoryGroup
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce({ ...mockGroups[0], name: 'Aisles' });
      const results: unknown[] = [];
      let errored = false;
      effects.renameCategoryGroup$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoryGroupsApiActions.renameCategoryGroupRequested({
        id: 'g1' as CategoryGroupId,
        name: 'Aisles',
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        categoryGroupsActions.categoryGroupSaveFailed({ id: 'g1' as CategoryGroupId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Category Group Renamed');
    });

    it('deleteCategoryGroup$ dispatches categoryGroupSaveFailed and survives a rejected call', async () => {
      api.deleteCategoryGroup
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.deleteCategoryGroup$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = categoryGroupsApiActions.deleteCategoryGroupRequested({
        id: 'g1' as CategoryGroupId,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        categoryGroupsActions.categoryGroupSaveFailed({ id: 'g1' as CategoryGroupId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Category Group Deleted');
    });

    // Groups are a fourth gate on selectListDataLoaded — a rejected fetch that
    // failed closed would hang the list skeleton for the rest of the session.
    it('fetchAllCategoryGroups$ fails open to an empty categoryGroupsLoaded', async () => {
      api.fetchAllCategoryGroups.mockRejectedValueOnce(new Error('client is offline'));
      const results: unknown[] = [];
      let errored = false;
      effects.fetchAllCategoryGroups$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });

      actions$.next(accountLoaded());
      await flush();

      expect(errored).toBe(false);
      expect(results).toEqual([
        categoryGroupsActions.categoryGroupsLoaded({ groups: [] }),
      ]);
    });
  });
});
