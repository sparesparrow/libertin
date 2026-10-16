import { describe, expect, it } from 'vitest';

import { directContactRecipients, type SyntheticDirectedContactEdge } from './contactReach';

const edge = (ownerId: string, contactId: string): SyntheticDirectedContactEdge => ({ ownerId, contactId });

describe('directContactRecipients (synthetic fixtures only)', () => {
  it('returns only a direct outgoing author-to-recipient edge', () => {
    expect(directContactRecipients('A', [edge('A', 'B')])).toEqual(['B']);
  });

  it('does not infer the reciprocal edge', () => {
    expect(directContactRecipients('A', [edge('B', 'A')])).toEqual([]);
  });

  it('does not traverse a two-edge path', () => {
    expect(directContactRecipients('A', [edge('A', 'B'), edge('B', 'C')])).toEqual(['B']);
  });

  it('does not infer a shared-contact intersection', () => {
    const edges = [edge('A', 'X'), edge('B', 'X')];
    expect(directContactRecipients('A', edges)).toEqual(['X']);
    expect(directContactRecipients('A', edges)).not.toContain('B');
  });

  it('deduplicates contacts, excludes self-edges, and sorts deterministically', () => {
    const edges = [edge('A', 'C'), edge('A', 'A'), edge('A', 'B'), edge('A', 'C')];
    expect(directContactRecipients('A', edges)).toEqual(['B', 'C']);
  });

  it('does not return edges owned by a different account', () => {
    expect(directContactRecipients('A', [edge('B', 'C')])).toEqual([]);
  });
});
