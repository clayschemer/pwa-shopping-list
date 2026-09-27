import type { ItemId } from './ids.model';
import type { ApiFailureKind } from '../core/diagnostics/api-failure';

export interface NameConflictError {
  type: 'NAME_CONFLICT';
  entityKind: 'item' | 'category' | 'categoryGroup' | 'shop';
  name: string;
}

export interface CheckConflictError {
  type: 'CHECK_CONFLICT';
  itemId: ItemId;
}

export interface SessionConflictError {
  type: 'SESSION_CONFLICT';
}

export interface NotFoundError {
  type: 'NOT_FOUND';
  entityKind: 'item' | 'category' | 'categoryGroup' | 'shop' | 'session';
  id: string;
}

export interface AccessDeniedError {
  type: 'ACCESS_DENIED';
}

export interface PendingVerificationError {
  type: 'PENDING_VERIFICATION';
}

export interface AuthError {
  type: 'AUTH_FAILED';
  code: string;
}

export interface AiUnavailableError {
  type: 'AI_UNAVAILABLE';
}

export interface StreamError {
  type: 'AUTH_REVOKED' | 'ACCOUNT_NOT_FOUND' | 'STREAM_FAILED';
  /**
   * The classified cause, carried alongside `type` because `type` says what the
   * app must do and this says what the user must be told. A listener dying takes
   * live updates down for the rest of the session, so it is the one failure that
   * absolutely cannot be silent — and it was: the message went into the store and
   * no selector or template ever read it.
   */
  kind: ApiFailureKind;
  message: string;
}
