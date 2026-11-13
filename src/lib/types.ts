export type InvoiceType = "sale" | "purchase" | "sale_return" | "purchase_return";
export type PartyType = "customer" | "supplier";
export type PaymentType = "cash" | "credit";

export interface Settings {
  id: number;
  storeName: string;
  userName: string;
  phone: string;
  address: string;
  taxRate: number;
  currency: string;
  branchName: string;
  salesRep: string;
  invoiceFooter: string;
  // التخصيص والثيمات
  theme: string; // classic-blue | modern-dark | emerald-green | royal-purple | dark-gold
  buttonStyle: string; // glossy-3d | modern-flat | soft-rounded | pos-tactile
  fontFamily: string; // cairo | tajawal | almarai | cairo-play
  tableHeaderColor: string; // navy-dark | slate-deep | royal-blue | charcoal | forest
  customBgUrl: string;
  customLogoUrl: string;
  phone2: string;
  showBigTitle: boolean;
  customBigTitle: string;
  customTagline: string;
  invoiceTemplate: string; // template-classic-a5 | template-modern-a5 | template-pos-thermal
  fontScale: number; // 80 .. 130 (نسبة حجم الخط)
}

export interface Product {
  id: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  imageUrl: string;
}

export interface Party {
  id: number;
  type: PartyType;
  code: number;
  name: string;
  phone: string;
  address: string;
  balance: number;
  notes: string;
  createdAt: string;
}

export interface InvoiceItem {
  id?: number;
  productId: number | null;
  productName: string;
  unit: string;
  qty: number;
  price: number;
  cost: number;
  discount: number;
  total: number;
}

export interface Invoice {
  id: number;
  type: InvoiceType;
  number: number;
  partyId: number | null;
  partyName: string;
  date: string;
  paymentType: PaymentType;
  paymentMethod: string;
  priceLevel: string;
  subtotal: number;
  discount: number;
  extraDiscount: number;
  taxRate: number;
  tax: number;
  total: number;
  paid: number;
  cost: number;
  notes: string;
  userName: string;
  template?: string;
  shiftId?: number | null;
  items: InvoiceItem[];
  itemsCount?: number;
}

export interface StatementRow {
  kind: "invoice" | "payment";
  id: number;
  ref: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Installment {
  id: number;
  invoiceId: number | null;
  partyId: number;
  partyName: string;
  installmentNo: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: "pending" | "paid" | "late";
  notes: string;
  createdAt: string;
}

export interface Shift {
  id: number;
  shiftNumber: number;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  status: "open" | "closed";
  startingCash: number;
  actualCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  notes: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id?: number;
  orderId?: number;
  productId: number;
  productName: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  orderedQty: number;
  unitCost: number;
  total: number;
}

export interface PurchaseOrder {
  id: number;
  orderNumber: number;
  date: string;
  supplierId: number | null;
  supplierName: string;
  status: "draft" | "sent" | "received" | "cancelled";
  totalAmount: number;
  notes: string;
  items?: PurchaseOrderItem[];
  itemsCount?: number;
  createdAt: string;
}
