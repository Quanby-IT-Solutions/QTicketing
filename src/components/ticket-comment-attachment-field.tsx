"use client";

import * as React from "react";
import { FileUpIcon, PaperclipIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type TicketCommentAttachmentFieldProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  inputId: string;
  disabled?: boolean;
  className?: string;
};

export function TicketCommentAttachmentField({
  files,
  onFilesChange,
  inputId,
  disabled = false,
  className,
}: TicketCommentAttachmentFieldProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    onFilesChange([...files, ...selected]);
    // Clear the input so the same file can be picked again later.
    event.target.value = "";
  }

  function removeFile(file: File) {
    onFilesChange(files.filter((candidate) => candidate !== file));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed bg-muted/20 p-3 transition-colors hover:bg-muted/50"
        htmlFor={inputId}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border">
          <FileUpIcon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">Attach files</span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            Images and documents.
          </span>
        </span>
      </label>
      <Input
        aria-label="Attach files"
        className="sr-only"
        disabled={disabled}
        id={inputId}
        multiple
        name="attachments"
        onChange={handleChange}
        type="file"
      />
      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              className="flex items-center gap-2 rounded-lg border bg-background py-1.5 pl-2.5 pr-1.5 text-sm"
              key={`${file.name}-${file.size}-${index}`}
            >
              <PaperclipIcon className="size-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </span>
              <Button
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => removeFile(file)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <XIcon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
