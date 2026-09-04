CREATE INDEX "disclaimer_logs_document_id_idx" ON "disclaimer_logs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_template_id_idx" ON "documents" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "uploads_project_id_idx" ON "uploads" USING btree ("project_id");