import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" }).defaultNow().notNull();

/** إعدادات البرنامج (صف واحد id = 1) مع تخصيص المظهر والثيمات واللوجو والخلفية */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  storeName: text("store_name").notNull().default("برنامج FATORA"),
  userName: text("user_name").notNull().default("FATORA"),
  phone: text("phone").notNull().default("01222355769"),
  address: text("address").notNull().default(""),
  taxRate: doublePrecision("tax_rate").notNull().default(14),
  currency: text("currency").notNull().default("ج.م"),
  branchName: text("branch_name").notNull().default("الفرع الرئيسي"),
  salesRep: text("sales_rep").notNull().default(""),
  invoiceFooter: text("invoice_footer").notNull().default(""),
  // تخصيص المظهر
  theme: text("theme").notNull().default("classic-blue"), // classic-blue | modern-dark | emerald-green | royal-purple | dark-gold
  buttonStyle: text("button_style").notNull().default("glossy-3d"), // glossy-3d | modern-flat | soft-rounded | pos-tactile
  fontFamily: text("font_family").notNull().default("cairo"), // cairo | tajawal | almarai | cairo-play
  tableHeaderColor: text("table_header_color").notNull().default("navy-dark"), // navy-dark | slate-deep | royal-blue | charcoal | forest
  customBgUrl: text("custom_bg_url").notNull().default(""),
  /** شعار مرفوع من الإعدادات (base64) — وإلا يُستخدم الشعار الافتراضي */
  customLogoUrl: text("custom_logo_url").notNull().default(""),
  /** رقم هاتف إضافي يظهر في الشاشة الرئيسية */
  phone2: text("phone2").notNull().default(""),
  showBigTitle: boolean("show_big_title").notNull().default(true),
  customBigTitle: text("custom_big_title").notNull().default("FATORA"),
  customTagline: text("custom_tagline").notNull().default("إدارة احترافية .. لمحل تجاري أكثر نجاحاً"),
  invoiceTemplate: text("invoice_template").notNull().default("template-modern-a5"),
  fontScale: doublePrecision("font_scale").notNull().default(100), // template-classic-a5 | template-modern-a5 | template-pos-thermal
  updatedAt: ts("updated_at"),
});

/** العملاء والموردين */
export const parties = pgTable(
  "parties",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(), // customer | supplier
    code: integer("code").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    balance: doublePrecision("balance").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("parties_type_idx").on(t.type),
    uniqueIndex("parties_type_code_idx").on(t.type, t.code),
  ],
);

/** الأصناف */
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("قطعة"),
    category: text("category").notNull().default("عام"),
    costPrice: doublePrecision("cost_price").notNull().default(0),
    salePrice: doublePrecision("sale_price").notNull().default(0),
    wholesalePrice: doublePrecision("wholesale_price").notNull().default(0),
    stock: doublePrecision("stock").notNull().default(0),
    minStock: doublePrecision("min_stock").notNull().default(0),
    imageUrl: text("image_url").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [uniqueIndex("products_code_idx").on(t.code), index("products_name_idx").on(t.name)],
);

/** الفواتير (مبيعات / مشتريات) */
export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(), // sale | purchase | sale_return | purchase_return
    number: integer("number").notNull(),
    partyId: integer("party_id"),
    partyName: text("party_name").notNull().default(""),
    date: ts("date"),
    paymentType: text("payment_type").notNull().default("cash"), // cash | credit
    paymentMethod: text("payment_method").notNull().default("cash"),
    priceLevel: text("price_level").notNull().default("retail"),
    subtotal: doublePrecision("subtotal").notNull().default(0),
    discount: doublePrecision("discount").notNull().default(0),
    extraDiscount: doublePrecision("extra_discount").notNull().default(0),
    taxRate: doublePrecision("tax_rate").notNull().default(0),
    tax: doublePrecision("tax").notNull().default(0),
    total: doublePrecision("total").notNull().default(0),
    paid: doublePrecision("paid").notNull().default(0),
    cost: doublePrecision("cost").notNull().default(0),
    notes: text("notes").notNull().default(""),
    userName: text("user_name").notNull().default(""),
    template: text("template").notNull().default("template-modern-a5"),
    shiftId: integer("shift_id"),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    uniqueIndex("invoices_type_number_idx").on(t.type, t.number),
    index("invoices_date_idx").on(t.date),
    index("invoices_party_idx").on(t.partyId),
  ],
);

/** أصناف الفاتورة */
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: integer("product_id"),
    productName: text("product_name").notNull(),
    unit: text("unit").notNull().default(""),
    qty: doublePrecision("qty").notNull().default(1),
    price: doublePrecision("price").notNull().default(0),
    cost: doublePrecision("cost").notNull().default(0),
    discount: doublePrecision("discount").notNull().default(0),
    total: doublePrecision("total").notNull().default(0),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)],
);

/** دفعات التحصيل / السداد */
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    partyId: integer("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount").notNull(),
    date: ts("date"),
    notes: text("notes").notNull().default(""),
    shiftId: integer("shift_id"),
    createdAt: ts("created_at"),
  },
  (t) => [index("payments_party_idx").on(t.partyId)],
);

/** المصروفات */
export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    date: ts("date"),
    category: text("category").notNull().default("أخرى"),
    amount: doublePrecision("amount").notNull(),
    notes: text("notes").notNull().default(""),
    shiftId: integer("shift_id"),
    createdAt: ts("created_at"),
  },
  (t) => [index("expenses_date_idx").on(t.date)],
);

/** حركات الخزينة اليدوية (إيداع / سحب) */
export const cashMoves = pgTable(
  "cash_moves",
  {
    id: serial("id").primaryKey(),
    date: ts("date"),
    kind: text("kind").notNull(), // in | out
    amount: doublePrecision("amount").notNull(),
    notes: text("notes").notNull().default(""),
    shiftId: integer("shift_id"),
    createdAt: ts("created_at"),
  },
  (t) => [index("cash_moves_date_idx").on(t.date)],
);

/** الأقساط (Installment Plans) */
export const installments = pgTable(
  "installments",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
    partyId: integer("party_id").notNull().references(() => parties.id, { onDelete: "cascade" }),
    partyName: text("party_name").notNull().default(""),
    installmentNo: integer("installment_no").notNull().default(1),
    totalInstallments: integer("total_installments").notNull().default(1),
    amount: doublePrecision("amount").notNull(),
    dueDate: ts("due_date"),
    paidDate: timestamp("paid_date", { withTimezone: true, mode: "date" }),
    status: text("status").notNull().default("pending"), // pending | paid | late
    notes: text("notes").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("installments_party_idx").on(t.partyId),
    index("installments_status_idx").on(t.status),
    index("installments_due_idx").on(t.dueDate),
  ],
);

/** ورديات الكاشير (Shifts) */
export const shifts = pgTable(
  "shifts",
  {
    id: serial("id").primaryKey(),
    shiftNumber: integer("shift_number").notNull(),
    cashierName: text("cashier_name").notNull().default("كاشير 1"),
    openedAt: ts("opened_at"),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    status: text("status").notNull().default("open"), // open | closed
    startingCash: doublePrecision("starting_cash").notNull().default(0),
    actualCash: doublePrecision("actual_cash"),
    expectedCash: doublePrecision("expected_cash"),
    difference: doublePrecision("difference"),
    notes: text("notes").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [
    index("shifts_status_idx").on(t.status),
    index("shifts_cashier_idx").on(t.cashierName),
  ],
);

/** طلبات الشراء الذكية (Smart Purchase Orders) */
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: integer("order_number").notNull(),
    date: ts("date"),
    supplierId: integer("supplier_id"),
    supplierName: text("supplier_name").notNull().default(""),
    status: text("status").notNull().default("draft"), // draft | sent | received | cancelled
    totalAmount: doublePrecision("total_amount").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [index("purchase_orders_supplier_idx").on(t.supplierId)],
);

/** عناصر طلب الشراء الذكي */
export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull(),
    productName: text("product_name").notNull(),
    currentStock: doublePrecision("current_stock").notNull().default(0),
    minStock: doublePrecision("min_stock").notNull().default(0),
    suggestedQty: doublePrecision("suggested_qty").notNull().default(0),
    orderedQty: doublePrecision("ordered_qty").notNull().default(0),
    unitCost: doublePrecision("unit_cost").notNull().default(0),
    total: doublePrecision("total").notNull().default(0),
  },
  (t) => [index("po_items_order_idx").on(t.orderId)],
);
