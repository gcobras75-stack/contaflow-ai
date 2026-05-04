CREATE TYPE "public"."lead_channel" AS ENUM('whatsapp', 'email', 'ml');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('ml', 'maps', 'manual');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'responded', 'converted', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."lead_temperature" AS ENUM('hot', 'warm', 'cold');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "lead_source" DEFAULT 'ml' NOT NULL,
	"seller_id" text NOT NULL,
	"seller_name" text NOT NULL,
	"seller_nickname" text,
	"product_name" text NOT NULL,
	"product_url" text,
	"product_thumbnail" text,
	"product_price" integer DEFAULT 0 NOT NULL,
	"estimated_sales" integer DEFAULT 0 NOT NULL,
	"ml_level" text,
	"city" text,
	"phone" text,
	"email" text,
	"lead_score" integer DEFAULT 0 NOT NULL,
	"lead_temperature" "lead_temperature" DEFAULT 'cold' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"contact_channel" "lead_channel",
	"trend_keyword" text,
	"proposal_text" text,
	"proposal_sent_at" timestamp,
	"response_text" text,
	"response_at" timestamp,
	"vendor_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reachback_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"vendor_id" uuid,
	"config" jsonb,
	"metrics" jsonb,
	"last_updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid,
	"phone_to" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"twilio_sid" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitors" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "competitors" ADD COLUMN "weekly_changes" jsonb;--> statement-breakpoint
ALTER TABLE "competitors" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ml_thumbnail" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "contract_status" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "contract_submission_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reachback_configs" ADD CONSTRAINT "reachback_configs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reachback_configs" ADD CONSTRAINT "reachback_configs_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_seller_id_idx" ON "leads" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_score_idx" ON "leads" USING btree ("lead_score");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reachback_campaign_idx" ON "reachback_configs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "reachback_vendor_idx" ON "reachback_configs" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "wa_messages_vendor_idx" ON "whatsapp_messages" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "wa_messages_created_idx" ON "whatsapp_messages" USING btree ("created_at");