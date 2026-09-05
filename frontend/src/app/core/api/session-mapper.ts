import { QueryDocumentSnapshot, Timestamp } from '@angular/fire/firestore';
import type { Session, SessionCheckedItem } from '../../models/session.model';
import type {
  AccountId,
  ItemId,
  SessionId,
  ShopId,
  UserId,
} from '../../models/ids.model';

function toMillis(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return null;
}

function mapCheckedItem(raw: unknown): SessionCheckedItem {
  const r = raw as Record<string, unknown>;
  return {
    itemId: (r['itemId'] ?? '') as ItemId,
    checkedBy: (r['checkedBy'] ?? '') as UserId,
    checkedAt: toMillis(r['checkedAt']) ?? 0,
    priceSnapshot: (r['priceSnapshot'] ?? null) as number | null,
    priceQuantitySnapshot: (r['priceQuantitySnapshot'] ?? null) as number | null,
    priceUnitSnapshot: (r['priceUnitSnapshot'] ?? null) as string | null,
    nameSnapshot: (r['nameSnapshot'] ?? null) as string | null,
    quantitySnapshot: (r['quantitySnapshot'] ?? null) as number | null,
    unitSnapshot: (r['unitSnapshot'] ?? null) as string | null,
  };
}

export function mapSession(
  snap: QueryDocumentSnapshot,
  accountId: AccountId,
): Session {
  const data = snap.data();
  return {
    id: snap.id as SessionId,
    accountId,
    shopId: (data['shopId'] ?? null) as ShopId | null,
    participants: ((data['participants'] ?? []) as string[]).map(
      (u) => u as UserId,
    ),
    startedBy: (data['startedBy'] ?? '') as UserId,
    startedAt: toMillis(data['startedAt']) ?? 0,
    completedAt: toMillis(data['completedAt']),
    checkedItems: ((data['checkedItems'] ?? []) as unknown[]).map(mapCheckedItem),
  };
}
