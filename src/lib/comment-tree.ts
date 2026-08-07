export function collectCommentSubtree(
  rootId: string,
  comments: { id: string; parentCommentId: string | null }[],
) {
  const childrenByParent = new Map<string, string[]>();
  for (const comment of comments) {
    if (!comment.parentCommentId) continue;
    const children = childrenByParent.get(comment.parentCommentId) ?? [];
    children.push(comment.id);
    childrenByParent.set(comment.parentCommentId, children);
  }

  const ids: string[] = [];
  const visited = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    ids.push(current);
    for (const childId of childrenByParent.get(current) ?? []) {
      queue.push(childId);
    }
  }

  return ids;
}
