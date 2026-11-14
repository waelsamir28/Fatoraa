// مُولّد تلقائياً من مخطط Drizzle - أوامر آمنة للتكرار (IF NOT EXISTS)
// تُنفذ عند تشغيل البرنامج لإنشاء/تحديث الجداول تلقائياً (خاصة نسخة الويندوز exe)
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "cash_moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"amount" double precision NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"shift_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"category" text DEFAULT 'أخرى' NOT NULL,
	"amount" double precision NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"shift_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "installments" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer,
	"party_id" integer NOT NULL,
	"party_name" text DEFAULT '' NOT NULL,
	"installment_no" integer DEFAULT 1 NOT NULL,
	"total_installments" integer DEFAULT 1 NOT NULL,
	"amount" double precision NOT NULL,
	"due_date" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_date" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"qty" double precision DEFAULT 1 NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"discount" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"number" integer NOT NULL,
	"party_id" integer,
	"party_name" text DEFAULT '' NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_type" text DEFAULT 'cash' NOT NULL,
	"payment_method" text DEFAULT 'cash' NOT NULL,
	"price_level" text DEFAULT 'retail' NOT NULL,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"discount" double precision DEFAULT 0 NOT NULL,
	"extra_discount" double precision DEFAULT 0 NOT NULL,
	"tax_rate" double precision DEFAULT 0 NOT NULL,
	"tax" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"paid" double precision DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"user_name" text DEFAULT '' NOT NULL,
	"template" text DEFAULT 'template-modern-a5' NOT NULL,
	"shift_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"code" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"amount" double precision NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"shift_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'قطعة' NOT NULL,
	"category" text DEFAULT 'عام' NOT NULL,
	"cost_price" double precision DEFAULT 0 NOT NULL,
	"sale_price" double precision DEFAULT 0 NOT NULL,
	"wholesale_price" double precision DEFAULT 0 NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL,
	"min_stock" double precision DEFAULT 0 NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"current_stock" double precision DEFAULT 0 NOT NULL,
	"min_stock" double precision DEFAULT 0 NOT NULL,
	"suggested_qty" double precision DEFAULT 0 NOT NULL,
	"ordered_qty" double precision DEFAULT 0 NOT NULL,
	"unit_cost" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" integer NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"supplier_id" integer,
	"supplier_name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_amount" double precision DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'cashier' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"branch_id" integer,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'auto' NOT NULL,
	"location" text DEFAULT 'local' NOT NULL,
	"file_name" text DEFAULT '' NOT NULL,
	"size_bytes" double precision DEFAULT 0 NOT NULL,
	"counts" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"store_name" text DEFAULT 'برنامج FATORA' NOT NULL,
	"user_name" text DEFAULT 'FATORA' NOT NULL,
	"phone" text DEFAULT '01222355769' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"tax_rate" double precision DEFAULT 14 NOT NULL,
	"currency" text DEFAULT 'ج.م' NOT NULL,
	"branch_name" text DEFAULT 'الفرع الرئيسي' NOT NULL,
	"sales_rep" text DEFAULT '' NOT NULL,
	"invoice_footer" text DEFAULT '' NOT NULL,
	"theme" text DEFAULT 'classic-blue' NOT NULL,
	"button_style" text DEFAULT 'glossy-3d' NOT NULL,
	"font_family" text DEFAULT 'cairo' NOT NULL,
	"table_header_color" text DEFAULT 'navy-dark' NOT NULL,
	"custom_bg_url" text DEFAULT '' NOT NULL,
	"custom_logo_url" text DEFAULT '' NOT NULL,
	"phone2" text DEFAULT '' NOT NULL,
	"show_big_title" boolean DEFAULT true NOT NULL,
	"custom_big_title" text DEFAULT 'FATORA' NOT NULL,
	"custom_tagline" text DEFAULT 'إدارة احترافية .. لمحل تجاري أكثر نجاحاً' NOT NULL,
	"invoice_template" text DEFAULT 'template-modern-a5' NOT NULL,
	"font_scale" double precision DEFAULT 100 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"shift_number" integer NOT NULL,
	"cashier_name" text DEFAULT 'كاشير 1' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"starting_cash" double precision DEFAULT 0 NOT NULL,
	"actual_cash" double precision,
	"expected_cash" double precision,
	"difference" double precision,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN ALTER TABLE "installments" ADD CONSTRAINT "installments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "installments" ADD CONSTRAINT "installments_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "cash_moves_date_idx" ON "cash_moves" USING btree ("date");
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" USING btree ("date");
CREATE INDEX IF NOT EXISTS "installments_party_idx" ON "installments" USING btree ("party_id");
CREATE INDEX IF NOT EXISTS "installments_status_idx" ON "installments" USING btree ("status");
CREATE INDEX IF NOT EXISTS "installments_due_idx" ON "installments" USING btree ("due_date");
CREATE INDEX IF NOT EXISTS "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_type_number_idx" ON "invoices" USING btree ("type","number");
CREATE INDEX IF NOT EXISTS "invoices_date_idx" ON "invoices" USING btree ("date");
CREATE INDEX IF NOT EXISTS "invoices_party_idx" ON "invoices" USING btree ("party_id");
CREATE INDEX IF NOT EXISTS "parties_type_idx" ON "parties" USING btree ("type");
CREATE UNIQUE INDEX IF NOT EXISTS "parties_type_code_idx" ON "parties" USING btree ("type","code");
CREATE INDEX IF NOT EXISTS "payments_party_idx" ON "payments" USING btree ("party_id");
CREATE UNIQUE INDEX IF NOT EXISTS "products_code_idx" ON "products" USING btree ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "branches_code_idx" ON "branches" USING btree ("code");
CREATE INDEX IF NOT EXISTS "backups_created_idx" ON "backups" USING btree ("created_at");

CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" USING btree ("name");
CREATE INDEX IF NOT EXISTS "po_items_order_idx" ON "purchase_order_items" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "purchase_orders_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");
CREATE INDEX IF NOT EXISTS "shifts_status_idx" ON "shifts" USING btree ("status");
CREATE INDEX IF NOT EXISTS "shifts_cashier_idx" ON "shifts" USING btree ("cashier_name");

-- ترقية آمنة للأعمدة الجديدة في النسخ القديمة
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "font_scale" double precision DEFAULT 100 NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "theme" text DEFAULT 'classic-blue' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "button_style" text DEFAULT 'glossy-3d' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "font_family" text DEFAULT 'cairo' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "table_header_color" text DEFAULT 'navy-dark' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "custom_bg_url" text DEFAULT '' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "custom_logo_url" text DEFAULT '' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "phone2" text DEFAULT '' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "show_big_title" boolean DEFAULT true NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "custom_big_title" text DEFAULT 'FATORA' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "custom_tagline" text DEFAULT 'إدارة احترافية .. لمحل تجاري أكثر نجاحاً' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "invoice_template" text DEFAULT 'template-modern-a5' NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "template" text DEFAULT 'template-modern-a5' NOT NULL;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "shift_id" integer;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "shift_id" integer;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "shift_id" integer;
ALTER TABLE "cash_moves" ADD COLUMN IF NOT EXISTS "shift_id" integer;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "branch_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branch_id" integer;

`;
