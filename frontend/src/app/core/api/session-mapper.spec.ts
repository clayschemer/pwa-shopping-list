import '../../../testing/init-testbed';
import { describe, it, expect } from 'vitest';
import type { QueryDocumentSnapshot } from '@angular/fire/firestore';
import { mapSession } from './session-mapper';
import type { AccountId } from '../../models/ids.model';

function fakeSnap(id: string, data: Record<string, unknown>): QueryDocumentSnapshot {
  return {
    id,
    data: () => data,
  } as unknown as QueryDocumentSnapshot;
}

describe('mapSession', () => {
  it('reads nameSnapshot off each checked item', () => {
    const snap = fakeSnap('s1', {
      shopId: 'shop-1',
      participants: ['u1'],
      startedBy: 'u1',
      startedAt: 100,
      completedAt: null,
      checkedItems: [
        {
          itemId: 'i1',
          checkedBy: 'u1',
          checkedAt: 150,
          priceSnapshot: 1.5,
          priceQuantitySnapshot: 1,
          priceUnitSnapshot: 'pcs',
          nameSnapshot: 'Milk',
        },
      ],
    });

    const session = mapSession(snap, 'a1' as AccountId);
    expect(session.checkedItems[0].nameSnapshot).toBe('Milk');
  });

  it('defaults nameSnapshot to null when missing on legacy data', () => {
    const snap = fakeSnap('s1', {
      shopId: null,
      participants: ['u1'],
      startedBy: 'u1',
      startedAt: 1,
      completedAt: null,
      checkedItems: [
        {
          itemId: 'i1',
          checkedBy: 'u1',
          checkedAt: 1,
          priceSnapshot: null,
          priceQuantitySnapshot: null,
          priceUnitSnapshot: null,
        },
      ],
    });

    const session = mapSession(snap, 'a1' as AccountId);
    expect(session.checkedItems[0].nameSnapshot).toBeNull();
  });
});
