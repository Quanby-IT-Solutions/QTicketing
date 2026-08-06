ALTER TABLE "ticket_comments" ADD COLUMN "parent_comment_id" uuid;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_parent_comment_id_ticket_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."ticket_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_comments_ticket_idx" ON "ticket_comments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_comments_parent_idx" ON "ticket_comments" USING btree ("parent_comment_id");