"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, MessageSquarePlusIcon, ReplyIcon, SendIcon } from "lucide-react";
import { addCommentAction } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CommentTicket = {
  id: string;
  ticketNumber: number;
  title: string;
};

type ParentComment = {
  id: string;
  authorName: string;
};

type TicketCommentDialogProps = {
  ticket: CommentTicket;
  parentComment?: ParentComment | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerLabel?: string;
  className?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Your comment could not be posted. Please try again.";
}

export function TicketCommentDialog({
  ticket,
  parentComment,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  triggerLabel = "Add comment",
  className,
}: TicketCommentDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const textareaId = React.useId();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
      formRef.current?.reset();
    }
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await addCommentAction(formData);
        setOpen(false);
        router.refresh();
      } catch (submitError) {
        setError(getErrorMessage(submitError));
      }
    });
  }

  const isReply = Boolean(parentComment);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      {!hideTrigger ? (
        <DialogTrigger
          render={
            <Button className={className} type="button" />
          }
        >
          <MessageSquarePlusIcon data-icon="inline-start" />
          {triggerLabel}
        </DialogTrigger>
      ) : null}

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
          <DialogTitle>
            {isReply ? `Reply to ${parentComment?.authorName}` : "Add a comment"}
          </DialogTitle>
          <DialogDescription>
            {isReply
              ? `Continue the conversation on TKT-${ticket.ticketNumber}.`
              : `Share an update or question about TKT-${ticket.ticketNumber}: ${ticket.title}`}
          </DialogDescription>
        </DialogHeader>

        <form aria-busy={isPending} className="space-y-5 p-4 sm:p-5" onSubmit={handleSubmit} ref={formRef}>
          <input name="ticketId" type="hidden" value={ticket.id} />
          {parentComment ? (
            <input name="parentCommentId" type="hidden" value={parentComment.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={textareaId}>{isReply ? "Reply" : "Comment"}</Label>
            <Textarea
              autoFocus
              className="min-h-32 resize-y"
              disabled={isPending}
              id={textareaId}
              maxLength={3000}
              name="body"
              placeholder={isReply ? `Reply to ${parentComment?.authorName}...` : "Share an update or ask a question..."}
              required
            />
            <p className="text-xs text-muted-foreground">
              Everyone with access to this ticket can see this message.
            </p>
          </div>

          {error ? (
            <div
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <DialogFooter className="mx-0 -mb-5 -ml-5 -mr-5 rounded-none">
            <Button disabled={isPending} onClick={() => setOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <LoaderCircleIcon aria-hidden="true" className="animate-spin" data-icon="inline-start" />
              ) : isReply ? (
                <ReplyIcon data-icon="inline-start" />
              ) : (
                <SendIcon data-icon="inline-start" />
              )}
              {isPending ? "Posting..." : isReply ? "Post reply" : "Post comment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
