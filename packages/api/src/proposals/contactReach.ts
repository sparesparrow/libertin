/**
 * Synthetic contact reach for proposal development only.
 *
 * Values are opaque fixture account IDs, never telephone numbers or imported
 * contacts. A directed edge A -> B means address-book owner A lists recipient
 * B. This helper evaluates only A's direct outgoing edges: it does not infer
 * reciprocal edges, multi-hop paths, or shared-contact intersections. It is
 * not used by an API route or production contact-processing service.
 */
export interface SyntheticDirectedContactEdge {
  readonly ownerId: string;
  readonly contactId: string;
}

export function directContactRecipients(
  authorId: string,
  edges: readonly SyntheticDirectedContactEdge[],
): string[] {
  const recipients = new Set<string>();

  for (const edge of edges) {
    if (edge.ownerId === authorId && edge.contactId !== authorId) {
      recipients.add(edge.contactId);
    }
  }

  return [...recipients].sort();
}
