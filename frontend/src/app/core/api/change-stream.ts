import { Observable } from 'rxjs';
import {
  onSnapshot,
  Query,
  QueryDocumentSnapshot,
  DocumentChange,
} from '@angular/fire/firestore';
import type { StreamError } from '../../models/errors.model';
import type { StreamErrorService } from './stream-error.service';

export interface EntityChange<T> {
  entity: T;
  changeType: 'added' | 'modified' | 'removed';
}

export type EntityChangeBatch<T> = EntityChange<T>[];

export function snapshotChanges<T>(
  query: Query,
  map: (snap: QueryDocumentSnapshot) => T,
  streamError: StreamErrorService,
): Observable<EntityChangeBatch<T>> {
  return new Observable<EntityChangeBatch<T>>((subscriber) => {
    const unsub = onSnapshot(
      query,
      { includeMetadataChanges: false },
      (snap) => {
        const batch: EntityChangeBatch<T> = snap
          .docChanges()
          .map((change: DocumentChange) => ({
            entity: map(change.doc),
            changeType: change.type,
          }));
        if (batch.length > 0) {
          subscriber.next(batch);
        }
      },
      (err: unknown) => {
        const error: StreamError = {
          type: classifyStreamError(err),
          message: (err as { message?: string })?.message ?? 'Unknown stream error',
        };
        streamError.emit(error);
      },
    );
    return unsub;
  });
}

function classifyStreamError(err: unknown): StreamError['type'] {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'permission-denied' || code === 'unauthenticated') {
    return 'AUTH_REVOKED';
  }
  if (code === 'not-found') {
    return 'ACCOUNT_NOT_FOUND';
  }
  return 'STREAM_FAILED';
}
