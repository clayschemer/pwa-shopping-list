import { describe, it, expect } from 'vitest';
import {
  categoryGroupsReducer,
  initialCategoryGroupsState,
  categoryGroupsAdapter,
} from './category-groups.reducer';
import { categoryGroupsActions } from './category-groups.actions';
import type { CategoryGroup } from '../../models/category-group.model';
import type { AccountId, CategoryGroupId } from '../../models/ids.model';

const group = (id: string, name: string): CategoryGroup => ({
  id: id as CategoryGroupId,
  accountId: 'a1' as AccountId,
  name,
});

const all = (state: ReturnType<typeof categoryGroupsReducer>) =>
  categoryGroupsAdapter.getSelectors().selectAll(state);

describe('categoryGroupsReducer', () => {
  it('starts empty and not loaded', () => {
    expect(all(initialCategoryGroupsState)).toEqual([]);
    expect(initialCategoryGroupsState.loaded).toBe(false);
  });

  it('sets all groups and marks loaded', () => {
    const state = categoryGroupsReducer(
      initialCategoryGroupsState,
      categoryGroupsActions.categoryGroupsLoaded({
        groups: [group('g2', 'Furniture'), group('g1', 'Grocery')],
      }),
    );

    expect(state.loaded).toBe(true);
    // Adapter sorts by name, not insertion order.
    expect(all(state).map((g) => g.name)).toEqual(['Furniture', 'Grocery']);
  });

  it('adds a group', () => {
    const state = categoryGroupsReducer(
      initialCategoryGroupsState,
      categoryGroupsActions.categoryGroupAdded({ group: group('g1', 'Grocery') }),
    );
    expect(all(state)).toHaveLength(1);
  });

  it('renames a group and keeps it sorted by name', () => {
    const loaded = categoryGroupsReducer(
      initialCategoryGroupsState,
      categoryGroupsActions.categoryGroupsLoaded({
        groups: [group('g1', 'Grocery'), group('g2', 'Furniture')],
      }),
    );
    const state = categoryGroupsReducer(
      loaded,
      categoryGroupsActions.categoryGroupRenamed({ group: group('g1', 'Aisles') }),
    );
    expect(all(state).map((g) => g.name)).toEqual(['Aisles', 'Furniture']);
  });

  it('deletes a group', () => {
    const loaded = categoryGroupsReducer(
      initialCategoryGroupsState,
      categoryGroupsActions.categoryGroupsLoaded({ groups: [group('g1', 'Grocery')] }),
    );
    const state = categoryGroupsReducer(
      loaded,
      categoryGroupsActions.categoryGroupDeleted({ id: 'g1' as CategoryGroupId }),
    );
    expect(all(state)).toEqual([]);
  });

  it('applies a change batch — removals then upserts', () => {
    const loaded = categoryGroupsReducer(
      initialCategoryGroupsState,
      categoryGroupsActions.categoryGroupsLoaded({
        groups: [group('g1', 'Grocery'), group('g2', 'Furniture')],
      }),
    );
    const state = categoryGroupsReducer(
      loaded,
      categoryGroupsActions.categoryGroupChangesReceived({
        groups: [group('g3', 'Hardware')],
        removed: ['g2' as CategoryGroupId],
      }),
    );
    expect(all(state).map((g) => g.name)).toEqual(['Grocery', 'Hardware']);
  });
});
