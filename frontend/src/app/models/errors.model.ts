import type { ItemId } from './ids.model';

export interface NameConflictError {
  type: 'NAME_CONFLICT';
  entityKind: 'item' | 'category' | 'shop';
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
  entityKind: 'item' | 'category' | 'shop' | 'session';
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
  message: string;
}
