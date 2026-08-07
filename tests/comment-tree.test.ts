import { describe, expect, it } from "vitest";
import { collectCommentSubtree } from "@/lib/comment-tree";

describe("collectCommentSubtree", () => {
  const comments = [
    { id: "c1", parentCommentId: null },
    { id: "c2", parentCommentId: "c1" },
    { id: "c3", parentCommentId: "c1" },
    { id: "c4", parentCommentId: "c2" },
    { id: "c5", parentCommentId: "c4" },
    { id: "c6", parentCommentId: null },
    { id: "c7", parentCommentId: "c6" },
  ];

  it("collects the root comment and all of its nested replies", () => {
    const ids = collectCommentSubtree("c1", comments);
    expect(ids).toEqual(["c1", "c2", "c3", "c4", "c5"]);
  });

  it("collects a mid-tree comment and only its descendants", () => {
    const ids = collectCommentSubtree("c2", comments);
    expect(ids).toEqual(["c2", "c4", "c5"]);
  });

  it("returns only the comment itself when it has no replies", () => {
    expect(collectCommentSubtree("c3", comments)).toEqual(["c3"]);
  });

  it("returns only the root when the id is not present", () => {
    expect(collectCommentSubtree("missing", comments)).toEqual(["missing"]);
  });

  it("does not loop forever on a malformed parent cycle", () => {
    const cyclic = [
      { id: "a", parentCommentId: "b" },
      { id: "b", parentCommentId: "a" },
    ];
    expect(collectCommentSubtree("a", cyclic)).toEqual(["a", "b"]);
  });
});
