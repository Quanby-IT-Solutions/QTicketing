"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, FileTextIcon, MessageSquareTextIcon, MoreHorizontalIcon, PencilIcon, ReplyIcon, Trash2Icon } from "lucide-react";
import { addCommentAction, deleteCommentAction, updateCommentAction } from "@/app/actions/tickets";
import { TicketCommentAttachmentField, formatFileSize } from "@/components/ticket-comment-attachment-field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ConversationTicket = {
  id: string;
  ticketNumber: number;
  title: string;
};

export type TicketConversationCommentAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
};

export type TicketConversationComment = {
  id: string;
  parentCommentId: string | null;
  authorName: string;
  body: string;
  canManage?: boolean;
  createdAt: string;
  createdAtLabel: string;
  attachments: TicketConversationCommentAttachment[];
};

type CommentNode = TicketConversationComment & {
  replies: CommentNode[];
};

type ReplyTarget = {
  authorName: string;
  id: string;
  submitParentCommentId: string;
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
  activeReplyId,
  comment,
  onCancelReply,
  onRefresh,
  onReply,
  ticket,
}: {
  activeReplyId: string | null;
  comment: CommentNode;
  onCancelReply: () => void;
  onRefresh?: () => Promise<void> | void;
  onReply: (comment: ReplyTarget) => void;
  ticket: ConversationTicket;
}) {
  const headingId = `comment-author-${comment.id}`;
  const showReplyForm = activeReplyId === comment.id;
  const [editing, setEditing] = React.useState(false);

  return (
    <div className="min-w-0 space-y-3" role="listitem">
      <article aria-labelledby={headingId} className="flex min-w-0 gap-3">
        <Avatar className="mt-0.5" size="sm">
          <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border bg-muted/35 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-medium" id={headingId}>{comment.authorName}</p>
            <div className="flex items-center gap-1">
              <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
                {comment.createdAtLabel}
              </time>
              {comment.canManage ? (
                <CommentActionsMenu
                  commentId={comment.id}
                  onDelete={async () => {
                    if (!window.confirm("Delete this comment?")) return;
                    const formData = new FormData();
                    formData.set("ticketId", ticket.id);
                    formData.set("commentId", comment.id);
                    await deleteCommentAction(formData);
                    if (onRefresh) await onRefresh();
                  }}
                  onEdit={() => {
                    onCancelReply();
                    setEditing(true);
                  }}
                />
              ) : null}
            </div>
          </div>
          {editing ? (
            <InlineEditCommentForm
              comment={comment}
              onCancel={() => setEditing(false)}
              onRefresh={onRefresh}
              ticket={ticket}
            />
          ) : (
            <>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                {comment.body}
              </p>
              {comment.attachments.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {comment.attachments.map((attachment) => (
                    <a
                      className="group flex min-w-0 items-center gap-2 rounded-lg border bg-background py-1.5 pl-2.5 pr-2 text-xs transition-colors hover:bg-muted/50"
                      href={attachment.url}
                      key={attachment.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <FileTextIcon className="size-3.5 shrink-0 text-primary" />
                      <span className="block max-w-52 truncate font-medium">
                        {attachment.filename}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </span>
                      <DownloadIcon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </a>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex justify-end">
                <Button
                  aria-label={`Reply to ${comment.authorName}`}
                  onClick={() => {
                    if (showReplyForm) onCancelReply();
                    else onReply({
                      authorName: comment.authorName,
                      id: comment.id,
                      submitParentCommentId: comment.parentCommentId ?? comment.id,
                    });
                  }}
                  size="xs"
                  type="button"
                  variant="ghost"
                >
                  <ReplyIcon data-icon="inline-start" />
                  Reply
                </Button>
              </div>
            </>
          )}
        </div>
      </article>

      {showReplyForm ? (
        <InlineReplyForm
          onCancel={onCancelReply}
          onRefresh={onRefresh}
          parentComment={{
            authorName: comment.authorName,
            id: comment.id,
            submitParentCommentId: comment.parentCommentId ?? comment.id,
          }}
          ticket={ticket}
        />
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="ml-3 space-y-3 border-l border-border/80 pl-3 sm:ml-8 sm:pl-5" role="list">
          {comment.replies.map((reply) => (
            <CommentBranch
              activeReplyId={activeReplyId}
              comment={reply}
              key={reply.id}
              onCancelReply={onCancelReply}
              onRefresh={onRefresh}
              onReply={onReply}
              ticket={ticket}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommentActionsMenu({
  commentId,
  onDelete,
  onEdit,
}: {
  commentId: string;
  onDelete: () => Promise<void> | void;
  onEdit: () => void;
}) {
  const [isDeleting, startDeleting] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open comment actions for comment ${commentId}`}
            disabled={isDeleting}
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon data-icon="inline-start" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            startDeleting(async () => {
              await onDelete();
            });
          }}
          variant="destructive"
        >
          <Trash2Icon data-icon="inline-start" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Your reply could not be posted. Please try again.";
}

function InlineReplyForm({
  onCancel,
  onRefresh,
  parentComment,
  ticket,
}: {
  onCancel: () => void;
  onRefresh?: () => Promise<void> | void;
  parentComment: ReplyTarget;
  ticket: ConversationTicket;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const textareaId = React.useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    for (const file of files) formData.append("attachments", file);

    startTransition(async () => {
      try {
        await addCommentAction(formData);
        formRef.current?.reset();
        onCancel();
        if (onRefresh) await onRefresh();
        else router.refresh();
      } catch (submitError) {
        setError(getErrorMessage(submitError));
      }
    });
  }

  return (
    <form
      aria-busy={isPending}
      className="ml-11 space-y-3 rounded-xl border bg-background p-3 shadow-sm sm:ml-12"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="ticketId" type="hidden" value={ticket.id} />
      <input name="parentCommentId" type="hidden" value={parentComment.submitParentCommentId} />
      <div className="space-y-2">
        <Label htmlFor={textareaId}>Reply to {parentComment.authorName}</Label>
        <Textarea
          autoFocus
          className="min-h-24 resize-y"
          disabled={isPending}
          id={textareaId}
          maxLength={3000}
          name="body"
          placeholder={`Reply to ${parentComment.authorName}...`}
          required
        />
        <p className="text-xs text-muted-foreground">
          Everyone with access to this ticket can see this message.
        </p>
      </div>
      <TicketCommentAttachmentField
        disabled={isPending}
        files={files}
        inputId={`${textareaId}-attachments`}
        onFilesChange={setFiles}
      />
      {error ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={isPending} type="submit">
          <ReplyIcon data-icon="inline-start" />
          {isPending ? "Posting..." : "Post reply"}
        </Button>
      </div>
    </form>
  );
}

function InlineEditCommentForm({
  comment,
  onCancel,
  onRefresh,
  ticket,
}: {
  comment: CommentNode;
  onCancel: () => void;
  onRefresh?: () => Promise<void> | void;
  ticket: ConversationTicket;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const textareaId = React.useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateCommentAction(formData);
        onCancel();
        if (onRefresh) await onRefresh();
        else router.refresh();
      } catch (submitError) {
        setError(getErrorMessage(submitError));
      }
    });
  }

  return (
    <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
      <input name="ticketId" type="hidden" value={ticket.id} />
      <input name="commentId" type="hidden" value={comment.id} />
      <div className="space-y-2">
        <Label className="sr-only" htmlFor={textareaId}>
          Edit comment
        </Label>
        <Textarea
          autoFocus
          className="min-h-24 resize-y bg-background"
          defaultValue={comment.body}
          disabled={isPending}
          id={textareaId}
          maxLength={3000}
          name="body"
          required
        />
      </div>
      {error ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function TicketConversation({
  ticket,
  comments,
  onRefresh,
}: {
  ticket: ConversationTicket;
  comments: TicketConversationComment[];
  onRefresh?: () => Promise<void> | void;
}) {
  const router = useRouter();
  const [replyTarget, setReplyTarget] = React.useState<ReplyTarget | null>(null);
  const commentTree = React.useMemo(() => buildCommentTree(comments), [comments]);
  const refreshConversation = React.useCallback(async () => {
    if (onRefresh) await onRefresh();
    else router.refresh();
  }, [onRefresh, router]);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshConversation();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [refreshConversation]);

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
    <div className="space-y-5" role="list">
      {commentTree.map((comment) => (
        <CommentBranch
          activeReplyId={replyTarget?.id ?? null}
          comment={comment}
          key={comment.id}
          onCancelReply={() => setReplyTarget(null)}
          onRefresh={refreshConversation}
          onReply={setReplyTarget}
          ticket={ticket}
        />
      ))}
    </div>
  );
}
