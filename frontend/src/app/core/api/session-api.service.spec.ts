import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SessionApiService } from './session-api.service';
import type { SessionId, ShopId } from '../../models/ids.model';

describe('SessionApiService', () => {
  let service: SessionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SessionApiService] });
    service = TestBed.inject(SessionApiService);
  });

  it('returns no active sessions by default', async () => {
    expect(await service.fetchActiveSessions()).toEqual([]);
  });

  it('starts a new session with the given shop', async () => {
    const result = await service.startSession('shop-1' as ShopId);
    expect(result).toMatchObject({
      shopId: 'shop-1',
      completedAt: null,
      checkedItems: [],
    });
  });

  it('starts a new global session when shopId is null', async () => {
    const result = await service.startSession(null);
    expect(result).toMatchObject({ shopId: null, completedAt: null });
  });

  it('joinSession returns the session', async () => {
    const result = await service.joinSession('s1' as SessionId);
    expect(result).toMatchObject({ id: 's1', completedAt: null });
  });

  it('closeSession resolves to void', async () => {
    await expect(service.closeSession('s1' as SessionId)).resolves.toBeUndefined();
  });

  it('sessionChanges$ is observable (empty by default)', () => {
    const obs = service.sessionChanges$();
    let emitted = false;
    obs.subscribe(() => (emitted = true));
    expect(emitted).toBe(false);
  });
});
