import { describe, expect, it } from 'vitest';
import {
  completeFeedLoad,
  nextStepAfterLogin,
  supportsFrozenContractNetwork,
} from '../src/authFlowLogic';

describe('supportsFrozenContractNetwork', () => {
  it('allows the frozen JSON/bearer client only in explicit mock mode', () => {
    expect(supportsFrozenContractNetwork('mock')).toBe(true);
    expect(supportsFrozenContractNetwork('live')).toBe(false);
  });
});

describe('nextStepAfterLogin', () => {
  it('continues verified users in either network mode', () => {
    expect(nextStepAfterLogin(true, 'mock')).toBe('success');
    expect(nextStepAfterLogin(true, 'live')).toBe('success');
  });

  it('allows the email-verification simulator only in explicit mock mode', () => {
    expect(nextStepAfterLogin(false, 'mock')).toBe('verify');
    expect(nextStepAfterLogin(false, 'live')).toBe('blocked');
  });
});

describe('completeFeedLoad', () => {
  it('returns the feed transition only after a successful network result', async () => {
    await expect(
      completeFeedLoad(async () => ({
        items: [
          {
            id: 'post-1',
            author: { displayName: 'Demo' },
            content: 'Hello',
          },
        ],
      })),
    ).resolves.toEqual({
      step: 'feed',
      items: [{ id: 'post-1', author: 'Demo', content: 'Hello' }],
    });
  });

  it('propagates a failed feed request instead of returning a successful transition', async () => {
    await expect(
      completeFeedLoad(async () => {
        throw new Error('network failed');
      }),
    ).rejects.toThrow('network failed');
  });
});
