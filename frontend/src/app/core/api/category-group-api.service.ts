import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  addDoc,
  arrayRemove,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import type { CategoryGroup } from '../../models/category-group.model';
import type { AccountId, CategoryGroupId } from '../../models/ids.model';
import type { NameConflictError, NotFoundError } from '../../models/errors.model';
import { AccountContext } from './account-context';
import { StreamErrorService } from './stream-error.service';
import { paths } from './firestore-paths';
import { snapshotChanges, type EntityChangeBatch } from './change-stream';

function mapCategoryGroup(
  snap: QueryDocumentSnapshot,
  accountId: AccountId,
): CategoryGroup {
  const data = snap.data();
  return {
    id: snap.id as CategoryGroupId,
    accountId,
    name: (data['name'] ?? '') as string,
  };
}

@Injectable({ providedIn: 'root' })
export class CategoryGroupApiService {
  private readonly db = inject(Firestore);
  private readonly context = inject(AccountContext);
  private readonly streamError = inject(StreamErrorService);
  private readonly injector = inject(Injector);

  async fetchAllCategoryGroups(): Promise<CategoryGroup[]> {
    const { accountId } = this.context.require();
    const snap = await runInInjectionContext(this.injector, () =>
      getDocs(query(paths.categoryGroups(this.db, accountId), orderBy('name'))),
    );
    return snap.docs.map((d) => mapCategoryGroup(d, accountId));
  }

  async addCategoryGroup(
    name: string,
  ): Promise<CategoryGroup | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = name.trim();
      const existing = await getDocs(
        query(paths.categoryGroups(this.db, accountId), where('name', '==', trimmed)),
      );
      if (!existing.empty) {
        return { type: 'NAME_CONFLICT', entityKind: 'categoryGroup', name: trimmed };
      }

      const ref = await addDoc(paths.categoryGroups(this.db, accountId), {
        name: trimmed,
      });

      return { id: ref.id as CategoryGroupId, accountId, name: trimmed };
    });
  }

  async renameCategoryGroup(
    id: CategoryGroupId,
    name: string,
  ): Promise<CategoryGroup | NotFoundError | NameConflictError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const trimmed = name.trim();
      const conflict = await getDocs(
        query(paths.categoryGroups(this.db, accountId), where('name', '==', trimmed)),
      );
      if (conflict.docs.some((d) => d.id !== id)) {
        return { type: 'NAME_CONFLICT', entityKind: 'categoryGroup', name: trimmed };
      }
      try {
        await updateDoc(paths.categoryGroupDoc(this.db, accountId, id), {
          name: trimmed,
        });
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'categoryGroup', id };
      }
      return { id, accountId, name: trimmed };
    });
  }

  /**
   * Deletes the group and detaches it from its members. Categories are never
   * deleted — they simply stop belonging to the group.
   */
  async deleteCategoryGroup(id: CategoryGroupId): Promise<void | NotFoundError> {
    const { accountId } = this.context.require();
    return runInInjectionContext(this.injector, async () => {
      const members = await getDocs(
        query(
          paths.categories(this.db, accountId),
          where('groupIds', 'array-contains', id),
        ),
      );

      const batch = writeBatch(this.db);
      for (const memberDoc of members.docs) {
        batch.update(memberDoc.ref, { groupIds: arrayRemove(id) });
      }
      batch.delete(paths.categoryGroupDoc(this.db, accountId, id));

      try {
        await batch.commit();
      } catch {
        return { type: 'NOT_FOUND', entityKind: 'categoryGroup', id };
      }
      return;
    });
  }

  categoryGroupChanges$(): Observable<EntityChangeBatch<CategoryGroup>> {
    const ctx = this.context.current();
    if (!ctx) {
      return new Observable<EntityChangeBatch<CategoryGroup>>();
    }
    return snapshotChanges(
      paths.categoryGroups(this.db, ctx.accountId),
      (snap) => mapCategoryGroup(snap, ctx.accountId),
      this.streamError,
    );
  }
}
