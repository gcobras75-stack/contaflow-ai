CREATE TYPE "public"."campaign_status" AS ENUM('green', 'yellow', 'red', 'paused');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending', 'paid');--> statement-breakpoint
CREATE TYPE "public"."creative_type" AS ENUM('image', 'video', 'carousel');--> statement-breakpoint
CREATE TYPE "public"."influencer_status" AS ENUM('contacted', 'active', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('despegue', 'piloto', 'comandante', 'flota');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('meta', 'tiktok', 'both');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'vendor');--> statement-breakpoint
CREATE TYPE "public"."trend_source" AS ENUM('google', 'mercadolibre', 'tiktok');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "ad_creatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"vendor_id" uuid,
	"type" "creative_type" DEFAULT 'image' NOT NULL,
	"headline" text NOT NULL,
	"body_copy" text NOT NULL,
	"cta" text NOT NULL,
	"image_url" text,
	"platform" text,
	"all_headlines" jsonb,
	"all_descriptions" jsonb,
	"cta_options" jsonb,
	"audience_data" jsonb,
	"performance_score" integer,
	"is_winner" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"vendor_id" uuid,
	"name" text,
	"platform" "platform" DEFAULT 'meta' NOT NULL,
	"status" "campaign_status" DEFAULT 'yellow' NOT NULL,
	"semaphore_color" "campaign_status" DEFAULT 'yellow' NOT NULL,
	"budget_total" integer DEFAULT 0 NOT NULL,
	"budget_spent" integer DEFAULT 0 NOT NULL,
	"budget_fund" integer DEFAULT 0 NOT NULL,
	"sales_generated" integer DEFAULT 0 NOT NULL,
	"commissions_earned" integer DEFAULT 0 NOT NULL,
	"audience_data" jsonb,
	"ab_variants" jsonb,
	"pause_reason" text,
	"ai_suggestions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paused_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"vendor_id" uuid,
	"sale_amount" integer NOT NULL,
	"commission_rate" numeric(5, 4) NOT NULL,
	"commission_amount" integer NOT NULL,
	"growth_fund_amount" integer NOT NULL,
	"platform_earning" integer NOT NULL,
	"status" "commission_status" DEFAULT 'pending' NOT NULL,
	"mercadopago_transfer_id" text,
	"product_name" text,
	"vendor_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"platform_url" text,
	"estimated_vendors" integer,
	"active_campaigns" integer,
	"top_products" jsonb,
	"last_analyzed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "influencers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"handle" text NOT NULL,
	"followers" integer DEFAULT 0 NOT NULL,
	"engagement_rate" numeric(5, 2),
	"niche" text,
	"contact_email" text,
	"status" "influencer_status" DEFAULT 'contacted' NOT NULL,
	"products_promoted" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer DEFAULT 0 NOT NULL,
	"category" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"product_score" integer,
	"score_breakdown" jsonb,
	"scored_at" timestamp,
	"status" "product_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"trend_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'vendor' NOT NULL,
	"vendor_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword" text NOT NULL,
	"category" text,
	"trend_score" integer DEFAULT 0 NOT NULL,
	"source" "trend_source" NOT NULL,
	"historical_data" jsonb,
	"is_early_signal" boolean DEFAULT false NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"whatsapp_number" text,
	"product_type" text,
	"trust_score" integer DEFAULT 50 NOT NULL,
	"status" "vendor_status" DEFAULT 'pending' NOT NULL,
	"growth_fund_balance" integer DEFAULT 0 NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"total_commissions_paid" integer DEFAULT 0 NOT NULL,
	"plan" "plan_type" DEFAULT 'despegue' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_creatives_campaign_idx" ON "ad_creatives" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_vendor_idx" ON "campaigns" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("semaphore_color");--> statement-breakpoint
CREATE INDEX "commissions_vendor_idx" ON "commissions" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "commissions_status_idx" ON "commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_vendor_idx" ON "products" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "trends_keyword_idx" ON "trends" USING btree ("keyword");--> statement-breakpoint
CREATE INDEX "trends_score_idx" ON "trends" USING btree ("trend_score");--> statement-breakpoint
CREATE INDEX "trends_detected_idx" ON "trends" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "vendors_email_idx" ON "vendors" USING btree ("email");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");