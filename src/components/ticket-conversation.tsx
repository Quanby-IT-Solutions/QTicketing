"use client";

import * as React from "react";
import { MessageSquareTextIcon, ReplyIcon } from "lucide-react";
import { TicketCommentDialog } from "@/components/ticket-comment-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type ConversationTicket = {
  id: string;
  ticketNumber: number;
  title: string;
};

export type TicketConversationComment = {
  id: string;
  parentCommentId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  createdAtLabel: string;
};

type CommentNode = TicketConversationComment & {
  replies: CommentNode[];
};

type ReplyTarget = {
  id: string;
  authorName: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildCommentTree(comments: TicketConversationComment[]) {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    const parent = comment.parentCommentId ? nodes.get(comment.parentCommentId) : undefined;

    if (!node || !parent || parent.id === node.id) {
      if (node) roots.push(node);
      continue;
    }

    // A malformed parent chain must not make recursive rendering loop forever.
    const visited = new Set([node.id]);
    let ancestor: CommentNode | undefined = parent;
    let hasCycle = false;
    while (ancestor) {
      if (visited.has(ancestor.id)) {
        hasCycle = true;
        break;
      }
      visited.add(ancestor.id);
      ancestor = ancestor.parentCommentId ? nodes.get(ancestor.parentCommentId) : undefined;
    }

    if (hasCycle) roots.push(node);
    else parent.replies.push(node);
  }

  return roots;
}

function CommentBranch({
  comment,
  onReply,
}: {
  comment: CommentNode;
  onReply: (comment: ReplyTarget) => void;
}) {
  const headingId = `comment-author-${comment.id}`;

  return (
    <div className="min-w-0 space-y-3" role="listitem">
      <article aria-labelledby={headingId} className="flex min-w-0 gap-3">
        <Avatar className="mt-0.5" size="sm">
          <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border bg-muted/35 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-medium" id={headingId}>{comment.authorName}</p>
            <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
              {comment.createdAtLabel}
            </time>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
            {comment.body}
          </p>
          <div className="mt-2 flex justify-end">
            <Button
              aria-label={`Reply to ${comment.authorName}`}
              onClick={() => onReply({ id: comment.id, authorName: comment.authorName })}
              size="xs"
              type="button"
              variant="ghost"
            >
              <ReplyIcon data-icon="inline-start" />
              Reply
            </Button>
          </div>
        </div>
      </article>

      {comment.replies.length > 0 ? (
        <div className="ml-3 space-y-3 border-l border-border/80 pl-3 sm:ml-8 sm:pl-5" role="list">
          {comment.replies.map((reply) => (
            <CommentBranch comment={reply} key={reply.id} onReply={onReply} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TicketConversation({
  ticket,
  comments,
}: {
  ticket: ConversationTicket;
  comments: TicketConversationComment[];
}) {
  const [replyTarget, setReplyTarget] = React.useState<ReplyTarget | null>(null);
  const commentTree = React.useMemo(() => buildCommentTree(comments), [comments]);

  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
        <MessageSquareTextIcon className="mb-3 size-7 text-muted-foreground/60" />
        <p className="text-sm font-medium">No comments yet</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Add the first comment to share an update or ask a question.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5" role="list">
        {commentTree.map((comment) => (
          <CommentBranch comment={comment} key={comment.id} onReply={setReplyTarget} />
        ))}
      </div>

      <TicketCommentDialog
        hideTrigger
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setReplyTarget(null);
        }}
        open={replyTarget !== null}
        parentComment={replyTarget}
        ticket={ticket}
      />
    </>
  );
}
