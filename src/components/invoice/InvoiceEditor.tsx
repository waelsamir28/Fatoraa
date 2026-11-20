"use client";

import { useRouter } from "next/navigation";
import { parseScaleBarcode } from "@/lib/scaleBarcode";
import { ExcessPaymentModal } from "./ExcessPaymentModal";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  Banknote,
  BarChart3,
  CalendarDays,
  Camera,
  Cloud,
  CloudCheck,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  CreditCard,
  Eye,
  FileCheck2,
  FileClock,
  FilePlus2,
  Grid,
  Info,
  Landmark,
  LayoutGrid,
  List,
  MessageCircle,
  PencilLine,
  Plus,
  Printer,
  Save,
  ScanLine,
  Search,
  Tag,
  Trash2,
  Undo2,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useSalesLayout } from "@/lib/salesLayout";
import { PhoneScannerDialog } from "@/components/invoice/PhoneScannerDialog";
import { useGlobalScanner } from "@/lib/useGlobalScanner";
import { Dialog, Field, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { AddUserIcon, PdfIcon, UserAvatar } from "@/components/icons/AppIcons";
import { api, errMsg, isNetworkError } from "@/lib/client";
import { enqueueInvoice } from "@/lib/offline";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/constants";
import { dateInputToISO, fmt, fmtQty, fmtTime, isoToDateInput, round2, round3, todayInput, uid } from "@/lib/format";
import type { Invoice, InvoiceType, Party, PaymentType, Product, Settings } from "@/lib/types";
import { usePosSound } from "./posSound";
import { PriceInquiryDialog } from "./PriceInquiryDialog";
import { FloatingAddProductModal } from "./FloatingAddProductModal";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { ProductSearchModal } from "./ProductSearchModal";
import { resolveLogo } from "@/lib/logo";
import { QuickAddCategoryModal } from "./QuickAddCategoryModal";
import { DraftsPanel } from "./DraftsPanel";
import { ShareInvoiceDialog } from "./ShareInvoiceDialog";
import { CameraScan } from "./CameraScan";

interface Row {
  key: string;
  productId: number | null;
  productName: string;
  unit: string;
  qty: number;
  price: number;
  discount: number;
}
interface PartyRef {
  id: number | null;
  code: number | null;
  name: string;
  balance: number;
}
interface EditorState {
  invoiceId: number | null;
  number: number;
  originalDate: string | null;
  party: PartyRef;
  date: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethodKey;
  priceLevel: "retail" | "wholesale";
  rows: Row[];
  notes: string;
  extraDiscount: string;
  paid: string;
  taxRate: number;
}
type Entry = { product: Product | null; text: string; price: string; qty: string; discount: string };

type Cfg = {
  title: string;
  partyType: "customer" | "supplier";
  partyLabel: string;
  cashName: string;
  listHref: string;
  listLabel: string;
  partiesHref: string;
};
const CONFIG: Record<InvoiceType, Cfg> = {
  sale: { title: "فاتورة مبيعات", partyType: "customer", partyLabel: "العميل", cashName: "عميل نقدي", listHref: "/sales/list", listLabel: "عرض المبيعات", partiesHref: "/customers" },
  purchase: { title: "فاتورة مشتريات", partyType: "supplier", partyLabel: "المورد", cashName: "مورد نقدي", listHref: "/purchases/list", listLabel: "عرض المشتريات", partiesHref: "/suppliers" },
  sale_return: { title: "مرتجع مبيعات", partyType: "customer", partyLabel: "العميل", cashName: "عميل نقدي", listHref: "/returns/sales/list", listLabel: "سجل المرتجعات", partiesHref: "/customers" },
  purchase_return: { title: "مرتجع مشتريات", partyType: "supplier", partyLabel: "المورد", cashName: "مورد نقدي", listHref: "/returns/purchases/list", listLabel: "سجل المرتجعات", partiesHref: "/suppliers" },
};

const METHOD_ICONS: Record<PaymentMethodKey, ReactNode> = {
  cash: <Banknote className="h-6 w-6 text-green-600" />,
  installments: <CalendarDays className="h-5 w-5 text-blue-600" />,
  wallet: <Wallet className="h-5 w-5 text-amber-700" />,
  card: <CreditCard className="h-5 w-5 text-amber-500" />,
  transfer: <Landmark className="h-5 w-5 text-blue-700" />,
  cheque: <FileCheck2 className="h-5 w-5 text-green-700" />,
};

// طرق الدفع المسموح بها في الفاتورة (نقدي، أقساط، محفظة إلكترونية فقط)
const ALLOWED_PAYMENT_METHODS: Array<{ key: PaymentMethodKey; label: string }> = [
  { key: "cash", label: "نقدي" },
  { key: "installments", label: "أقساط" },
  { key: "wallet", label: "محفظة إلكترونية" },
];

// ألوان خانات المال الأربع — كل خانة بلون مختلف (نفس حجم ومستوى بروز)
const MONEY_COLORS: Record<string, { bg: string; border: string; ink: string }> = {
  gross:  { bg: "#e8f0fa", border: "#a9c6e4", ink: "#123a63" },  // إجمالي — أزرق فاتح
  paid:   { bg: "#dff6dd", border: "#9fd89f", ink: "#0f7b0f" },   // مدفوع — أخضر
  remain: { bg: "#fde7e9", border: "#f1aeb5", ink: "#c42b1c" },   // متبقي — أحمر
  due:    { bg: "#0067c0", border: "#005a9e", ink: "#ffffff" },  // مطلوب — أكسنت غامق
};

const EMPTY_ENTRY: Entry = { product: null, text: "", price: "", qty: "1", discount: "0" };

function priceFor(p: Product, type: InvoiceType, level: "retail" | "wholesale") {
  if (type === "purchase" || type === "purchase_return") return p.costPrice;
  return level === "wholesale" ? p.wholesalePrice || p.salePrice : p.salePrice;
}

const cashParty = (type: InvoiceType): PartyRef => ({ id: null, code: null, name: CONFIG[type].cashName, balance: 0 });

function blankState(type: InvoiceType, nextNumber: number, taxRate: number): EditorState {
  return {
    invoiceId: null,
    number: nextNumber,
    originalDate: null,
    party: cashParty(type),
    date: todayInput(),
    paymentType: "cash",
    paymentMethod: "cash",
    priceLevel: "retail",
    rows: [],
    notes: "",
    extraDiscount: "",
    paid: "",
    taxRate,
  };
}

function stateFromInvoice(inv: Invoice, party: Party | undefined): EditorState {
  const method = PAYMENT_METHODS.find((m) => m.key === inv.paymentMethod)?.key ?? "cash";
  return {
    invoiceId: inv.id,
    number: inv.number,
    originalDate: inv.date,
    party: inv.partyId
      ? { id: inv.partyId, code: party?.code ?? null, name: party?.name ?? inv.partyName, balance: party?.balance ?? 0 }
      : cashParty(inv.type),
    date: isoToDateInput(inv.date),
    paymentType: inv.paymentType,
    paymentMethod: method,
    priceLevel: inv.priceLevel === "wholesale" ? "wholesale" : "retail",
    rows: inv.items.map((it) => ({
      key: uid(),
      productId: it.productId,
      productName: it.productName,
      unit: it.unit,
      qty: it.qty,
      price: it.price,
      discount: it.discount,
    })),
    notes: inv.notes,
    extraDiscount: inv.extraDiscount ? String(inv.extraDiscount) : "",
    paid: inv.paymentType === "credit" && inv.paid ? String(inv.paid) : "",
    taxRate: inv.taxRate,
  };
}

const serialize = (s: EditorState) =>
  JSON.stringify({ ...s, party: s.party.id, rows: s.rows.map((r) => [r.productId, r.productName, r.qty, r.price, r.discount]) });

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function NumCell({ value, digits, onCommit }: { value: number; digits?: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      className="cell-input num"
      inputMode="decimal"
      value={text ?? (digits ? value.toFixed(digits) : fmtQty(value))}
      onFocus={(e) => {
        const el = e.currentTarget;
        setText(String(value));
        requestAnimationFrame(() => el.select());
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== null) {
          const n = Number(text);
          if (Number.isFinite(n) && n >= 0) onCommit(n);
          setText(null);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

function FRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-[32px] gap-1">
      <div className="f-label w-[130px] shrink-0 text-[13.5px]">{label}</div>
      <div className="flex min-w-0 flex-1 gap-1">{children}</div>
    </div>
  );
}

function TotRow({
  label,
  value,
  color,
  last,
  onLabelClick,
  title,
  subLabel,
}: {
  label: string;
  value: string;
  color: string;
  last?: boolean;
  onLabelClick?: () => void;
  title?: string;
  subLabel?: string;
}) {
  return (
    <div className={`flex flex-1 items-stretch ${last ? "" : "border-b border-[#c8d8ea]"}`}>
      <button
        type="button"
        onClick={onLabelClick}
        title={title}
        className={`flex w-[55%] items-center justify-between border-l border-[#c8d8ea] bg-gradient-to-b from-[#fbfcfe] to-[#e6eef7] px-2.5 text-[15.5px] font-black text-[#0c2340] ${
          onLabelClick ? "hover:bg-blue-50 cursor-pointer" : "cursor-default"
        }`}
      >
        <span>{label}</span>
        {subLabel && <span className="text-[11px] font-bold text-slate-500">{subLabel}</span>}
      </button>
      <div className={`num flex flex-1 items-center justify-center text-[21px] font-black ${color}`}>{value}</div>
    </div>
  );
}

export function InvoiceEditor({
  type,
  initialId,
  autoScan,
}: {
  type: InvoiceType;
  initialId: number | null;
  /** فتح ماسح باركود الفاتورة الأصلية تلقائياً (مرتجعات) */
  autoScan?: boolean;
}) {
  const cfg = CONFIG[type];
  const L = useSalesLayout();
  const router = useRouter();
  const { msg, confirm, toast, activeUser } = useDesktop();
  const { playAddItem, playSuccess, playError } = usePosSound();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [state, setState] = useState<EditorState>(() => blankState(type, 0, 0)); // الضريبة صفر افتراضياً
  const [saved, setSaved] = useState<EditorState>(() => blankState(type, 0, 0));
  const [selected, setSelected] = useState(-1);
  const [numberInput, setNumberInput] = useState("");
  const [partyCodeInput, setPartyCodeInput] = useState("");
  /** تليفون العميل المختار — يظهر تلقائياً في خانة «تليفون» */
  const [partyPhone, setPartyPhone] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [partiesList, setPartiesList] = useState<Party[]>([]);
  const [barcodeMode, setBarcodeMode] = useState(true);
  /** مسح فاتورة أصلية لتحميل أصنافها (مرتجعات) */
  const [scanOpen, setScanOpen] = useState(Boolean(autoScan));
  /** ماسح الموبايل (كاميرا الموبايل عبر الواي فاي) */
  const [phoneScanOpen, setPhoneScanOpen] = useState(false);
  const [mergeSame, setMergeSame] = useState(true);
  const [searchMode, setSearchMode] = useState<"name" | "code">("name");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [entry, setEntry] = useState<Entry>(EMPTY_ENTRY);
  const [showSuggest, setShowSuggest] = useState(false);
  const [hi, setHi] = useState(0);

  // النوافذ العائمة الذكية
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [showAddParty, setShowAddParty] = useState(false);
  const [showFloatingProduct, setShowFloatingProduct] = useState(false);
  const [showPriceInquiry, setShowPriceInquiry] = useState(false);
  const [showProductSearchModal, setShowProductSearchModal] = useState(false); // F3 نافذة عائمة
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [excessAction, setExcessAction] = useState<"deduct" | "refund">("deduct");
  const [excessPromptOpen, setExcessPromptOpen] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);
  const [clock, setClock] = useState("");
  /** الحفظ التلقائي: حالة + رقم المسودة + وقت آخر حفظ */
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved" | "off">("idle");
  const [autoAt, setAutoAt] = useState("");
  const draftIdRef = useRef(0);

  /**
   * بناء نفس البيانات اللي تتخزن — مشترك بين الحفظ اليدوي والحفظ التلقائي.
   * (يُستخدم داخل save و autoSave)
   */
  const buildPayload = () => {
    const keepTime = state.originalDate && isoToDateInput(state.originalDate) === state.date ? state.originalDate : null;
    return {
      type,
      partyId: state.party.id,
      partyName: state.party.name,
      date: dateInputToISO(state.date, keepTime),
      paymentType: state.paymentType,
      paymentMethod: state.paymentMethod,
      priceLevel: state.priceLevel,
      extraDiscount: Math.max(0, toNum(state.extraDiscount)),
      taxRate: 0,
      paid: Math.max(0, toNum(state.paid)),
      notes: state.notes,
      userName: activeUser || settings?.userName || "FATORA",
      template: settings?.invoiceTemplate || "template-modern-a5",
      items: state.rows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        unit: r.unit,
        qty: r.qty,
        price: r.price,
        discount: r.discount,
      })),
    };
  };

  const productRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});

  const dirty = useMemo(() => serialize(state) !== serialize(saved), [state, saved]);

  /**
   * الحفظ التلقائي كل 20 ثانية:
   * - يحفظ كمسودة (بدون خصم مخزون أو أرصدة) ⇒ لو الكهربا قطعت الفاتورة ترجع.
   * - أول مرة ننشئ مسودة، وبعد كده نحدّثها (مفيش تكرار).
   * - لا يعمل لو مفيش أصناف، أو الفاتورة محفوظة أصلاً، أو الاشتراك منتهي.
   */
  useEffect(() => {
    const id = setInterval(async () => {
      if (!state.rows.length || state.invoiceId || saving) return;
      setAutoState("saving");
      try {
        const r = await api<{ ok: boolean; id?: number; reason?: string }>("/api/invoices/autosave", {
          method: "POST",
          json: { ...buildPayload(), draftId: draftIdRef.current },
        });
        if (r?.ok && r.id) {
          draftIdRef.current = r.id;
          setAutoState("saved");
          setAutoAt(fmtTime(new Date()));
        } else if (r?.reason === "expired") {
          setAutoState("off");
        } else {
          setAutoState("idle");
        }
      } catch {
        setAutoState("idle");
      }
    }, 20000);
    return () => clearInterval(id);
  }, [state.rows.length, state.invoiceId, saving]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const loadProducts = useCallback(async () => {
    const r = await api<{ items: Product[]; categories: string[] }>("/api/products?limit=2000");
    setProducts(r.items);
    setCategories(r.categories);
  }, []);

  const loadParties = useCallback(async () => {
    const r = await api<{ items: Party[] }>(`/api/parties?type=${cfg.partyType}`);
    setPartiesList(r.items);
    return r.items;
  }, [cfg.partyType]);

  const applyState = useCallback((s: EditorState) => {
    // بداية فاتورة جديدة ⇒ مسودة تلقائية جديدة
    draftIdRef.current = 0;
    setState(s);
    setSaved(s);
    setSelected(s.rows.length ? 0 : -1);
    setNumberInput(String(s.number));
    setPartyCodeInput(s.party.code ? String(s.party.code) : "");
    setEntry(EMPTY_ENTRY);
  }, []);

  const loadInvoice = useCallback(
    (inv: Invoice, plist: Party[]) => {
      applyState(stateFromInvoice(inv, inv.partyId ? plist.find((x) => x.id === inv.partyId) : undefined));
    },
    [applyState],
  );

  const startNew = useCallback(
    async (taxRate?: number) => {
      const r = await api<{ nextNumber: number }>(`/api/invoices/find?type=${type}&dir=new`);
      applyState(blankState(type, r.nextNumber, taxRate ?? 0));
      setTimeout(() => productRef.current?.focus(), 50);
    },
    [applyState, type],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, plist] = await Promise.all([api<Settings>("/api/settings"), loadParties(), loadProducts()]);
        if (!alive) return;
        setSettings(s);
        if (initialId) {
          const inv = await api<Invoice>(`/api/invoices/${initialId}`);
          if (inv.type !== type) throw new Error("الفاتورة المطلوبة ليست من هذا النوع");
          if (alive) loadInvoice(inv, plist);
        } else {
          // فاتورة جديدة فارغة دائمًا (بدون تحميل أي فاتورة سابقة)
          await startNew(0);
        }
      } catch (e) {
        toast(errMsg(e), "error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialId, type, loadInvoice, loadParties, loadProducts, startNew, toast]);

  useEffect(() => {
    const t = () => setClock(fmtTime(new Date()));
    t();
    const i = setInterval(t, 30000);
    return () => clearInterval(i);
  }, []);

  const totals = useMemo(() => {
    const gross = round2(state.rows.reduce((s, r) => s + r.qty * r.price, 0));
    const itemsDiscount = round2(state.rows.reduce((s, r) => s + r.discount, 0));
    const discount = round2(itemsDiscount + Math.max(0, toNum(state.extraDiscount)));
    const total = Math.max(0, round2(gross - discount));
    const qty = round3(state.rows.reduce((s, r) => s + r.qty, 0));
    return { gross, discount, tax: 0, total, qty };
  }, [state.rows, state.extraDiscount]);

  const filtered = useMemo(() => {
    const q = entry.product ? "" : entry.text.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          (!category || p.category === category) &&
          (!q || (searchMode === "code" ? p.code.includes(q) : p.name.toLowerCase().includes(q) || p.code.includes(q))),
      )
      .slice(0, 300);
  }, [products, category, entry.text, entry.product, searchMode]);
  const suggestions = filtered.slice(0, 8);

  const patch = (p: Partial<EditorState>) => setState((s) => ({ ...s, ...p }));
  const updateRow = (i: number, p: Partial<Row>) =>
    setState((s) => ({ ...s, rows: s.rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)) }));
  const removeRow = (i: number) => {
    const newLen = state.rows.length - 1;
    setState((s) => ({ ...s, rows: s.rows.filter((_, idx) => idx !== i) }));
    setSelected(newLen <= 0 ? -1 : Math.min(i, newLen - 1));
  };

  const addProduct = (p: Product, qty = 1, price?: number, discount = 0) => {
    playAddItem();
    const unitPrice = price ?? priceFor(p, type, state.priceLevel);
    const rows = [...state.rows];
    const idx = mergeSame ? rows.findIndex((r) => r.productId === p.id && r.price === unitPrice) : -1;
    const newQty = idx >= 0 ? round3(rows[idx].qty + qty) : qty;
    if ((type === "sale" || type === "purchase_return") && p.stock < newQty) {
      toast(`تنبيه: الرصيد المتاح من "${p.name}" هو ${fmtQty(p.stock)} فقط`, "info");
    }
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], qty: newQty, discount: round2(rows[idx].discount + discount) };
      setSelected(idx);
    } else {
      rows.push({ key: uid(), productId: p.id, productName: p.name, unit: p.unit, qty, price: unitPrice, discount });
      setSelected(rows.length - 1);
    }
    setState({ ...state, rows });

    // انتقال المؤشر التلقائي لكتابة الكمية لتسريع الكاشير
    setTimeout(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    }, 20);
  };

  /**
   * قارئ الباركود العام: امسح في أي مكان في الشاشة — الصنف يتضاف للفاتورة
   * بدون الحاجة للضغط على خانة البحث أولاً.
   */
  useGlobalScanner((code) => {
    const found = products.find((p) => p.code === code) ?? products.find((p) => String(p.id) === code);
    if (found) {
      addProduct(found);
      toast(`تم إضافة «${found.name}» (${code})`);
    } else {
      // نعرض الكود في خانة البحث حتى يقدر ينشئ الصنف فوراً لو حب
      setEntry({ ...EMPTY_ENTRY, text: code });
      toast(`باركود غير موجود في الأصناف: ${code}`, "error");
    }
  });

  const pickProduct = (p: Product) => {
    playAddItem();
    setEntry({ product: p, text: p.name, price: String(priceFor(p, type, state.priceLevel)), qty: "1", discount: "0" });
    setShowSuggest(false);
    setTimeout(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    }, 10);
  };

  const commitEntry = () => {
    let p = entry.product;
    if (!p) {
      const q = entry.text.trim();
      if (!q) {
        productRef.current?.focus();
        return;
      }
      p = products.find((x) => x.code === q) ?? (suggestions.length === 1 ? suggestions[0] : null);
      if (!p) {
        playError();
        toast("الصنف غير موجود، اختر من القائمة", "error");
        return;
      }
    }
    const qty = round3(toNum(entry.qty) || 1);
    if (qty <= 0) {
      playError();
      toast("الكمية يجب أن تكون أكبر من صفر", "error");
      return;
    }
    const price = entry.price.trim() === "" ? undefined : round2(Math.max(0, toNum(entry.price)));
    addProduct(p, qty, price, round2(Math.max(0, toNum(entry.discount))));
    setEntry(EMPTY_ENTRY);
    setTimeout(() => productRef.current?.focus(), 0);
  };

  const onProductKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggest(true);
      setHi((h) => Math.min(h + 1, Math.max(0, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Escape") {
      setShowSuggest(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (entry.product) {
        commitEntry();
        return;
      }
      const q = entry.text.trim();
      if (!q) return;

      // فحص باركود الميزان الإلكتروني (EAN-13 يبدأ بـ 20..29)
      const scale = parseScaleBarcode(q);
      if (scale) {
        const scaleProd = products.find(
          (x) => x.code === scale.itemCode || x.code.endsWith(scale.itemCode),
        );
        if (scaleProd) {
          const qty =
            scale.mode === "weight"
              ? round2(scale.value)
              : scaleProd.salePrice > 0
                ? round2(scale.value / scaleProd.salePrice)
                : 1;
          addProduct(scaleProd, qty > 0 ? qty : 1);
          setEntry(EMPTY_ENTRY);
          setShowSuggest(false);
          return;
        }
      }

      const exact = products.find((x) => x.code === q);
      if (exact && barcodeMode) {
        addProduct(exact);
        setEntry(EMPTY_ENTRY);
        setShowSuggest(false);
        return;
      }
      if (exact) {
        pickProduct(exact);
        return;
      }
      const s = suggestions[hi] ?? suggestions[0];
      if (s) pickProduct(s);
      else {
        playError();
        toast("لا يوجد صنف بهذا الاسم أو الكود", "error");
      }
    }
  };

  const setParty = (p: Party | null) => {
    patch({ party: p ? { id: p.id, code: p.code, name: p.name, balance: p.balance } : cashParty(type) });
    setPartyCodeInput(p ? String(p.code) : "");
    // التليفون بيتعبّى تلقائياً بمجرد اختيار العميل
    setPartyPhone(p?.phone ?? "");
  };

  const lookupPartyCode = () => {
    if (!partyCodeInput.trim()) {
      setParty(null);
      return;
    }
    const p = partiesList.find((x) => x.code === Number(partyCodeInput));
    if (p) setParty(p);
    else void msg({ text: `لا يوجد ${cfg.partyLabel} بالرقم ${partyCodeInput}`, kind: "warning" });
  };

  const guard = async () =>
    !dirty ||
    (await confirm("توجد تعديلات غير محفوظة على الفاتورة الحالية.\nهل تريد تجاهلها والمتابعة؟", { title: "تنبيه" }));

  const newInvoice = async () => {
    if (!(await guard())) return;
    try {
      await startNew();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  /**
   * تحميل فاتورة أصلية من باركودها/رقمها (للمرتجعات).
   * يقبل: رقم الفاتورة فقط، أو رابط الفاتورة العامة /i/<id>-<number>-<token>،
   * أو صيغة INV-<number>.
   */
  const loadOriginalInvoice = useCallback(
    async (raw: string) => {
      setScanOpen(false);
      const text = String(raw || "").trim();
      if (!text) return;
      // استخراج الرقم من روابط QR أو الأكواد النصية
      let num = 0;
      const urlMatch = text.match(/\/i\/(\d+)-(\d+)-/);
      if (urlMatch) num = Number(urlMatch[2]);
      if (!num) {
        const digits = text.replace(/[^0-9]/g, "");
        num = Number(digits);
      }
      if (!Number.isInteger(num) || num <= 0) {
        toast("الباركود غير معروف — امسح باركود فاتورة أو اكتب رقمها", "error");
        return;
      }
      // المرتجع يُبنى على الفاتورة الأصلية من النوع المقابل
      const sourceType: InvoiceType =
        type === "sale_return" ? "sale" : type === "purchase_return" ? "purchase" : type;
      try {
        const r = await api<{ invoice: Invoice | null }>(
          `/api/invoices/find?type=${sourceType}&dir=exact&number=${num}`,
        );
        if (!r.invoice) {
          toast(`لا توجد فاتورة ${sourceType === "sale" ? "مبيعات" : "مشتريات"} رقم ${num}`, "error");
          return;
        }
        const original = r.invoice;
        // تحميل أصناف الفاتورة الأصلية في المحرّر الحالي (مع الحفاظ على نوع المستند الحالي)
        const loaded = stateFromInvoice(original, partiesList.find((x) => x.id === original.partyId));
        applyState({
          ...loaded,
          invoiceId: null, // مستند جديد (مرتجع) وليس تعديلاً على الأصل
          originalDate: null,
          rows: loaded.rows.map((rw) => ({ ...rw, key: uid() })),
        });
        const buyer = partiesList.find((x) => x.id === original.partyId);
        setPartyPhone(buyer?.phone || "");
        toast(
          `تم تحميل ${loaded.rows.length} صنف من الفاتورة الأصلية #${original.number}` +
            (original.partyName ? ` — ${original.partyName}` : ""),
          "success",
        );
        setTimeout(() => productRef.current?.focus(), 60);
      } catch (e) {
        toast(errMsg(e), "error");
      }
    },
    [applyState, partiesList, productRef, toast, type],
  );

  const navigate = async (dir: "first" | "prev" | "next" | "last" | "exact", number?: number) => {
    if (!(await guard())) return;
    try {
      const n = number ?? state.number;
      const r = await api<{ invoice: Invoice | null }>(`/api/invoices/find?type=${type}&dir=${dir}&number=${n}`);
      if (!r.invoice) {
        toast(dir === "exact" ? `لا توجد فاتورة بالرقم ${n}` : "لا توجد فواتير أخرى في هذا الاتجاه", "info");
        setNumberInput(String(state.number));
        return;
      }
      loadInvoice(r.invoice, partiesList);
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const save = async (forcedExcess?: "deduct" | "refund"): Promise<Invoice | null> => {
    if (!forcedExcess && state.party.id && paidNum > totals.total) {
      setExcessPromptOpen(true);
      return null;
    }
    if (saving) return null;
    if (!state.rows.length) {
      playError();
      await msg({ text: "لا يمكن حفظ فاتورة بدون أصناف.\nأضف صنفاً واحداً على الأقل.", kind: "warning" });
      return null;
    }
    if (state.paymentType === "credit" && !state.party.id) {
      playError();
      await msg({ text: `يجب اختيار ${cfg.partyLabel} في حالة الدفع الآجل`, kind: "warning" });
      return null;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const autoDraftId = draftIdRef.current;
      const inv = state.invoiceId
        ? await api<Invoice>(`/api/invoices/${state.invoiceId}`, { method: "PUT", json: payload })
        : autoDraftId > 0
          ? // فيه مسودة حفظ تلقائي ⇒ نحدّثها ونحوّلها لفاتورة معتمدة بنفس الرقم
            await api<Invoice>(`/api/invoices/${autoDraftId}`, { method: "PUT", json: { ...payload, isDraft: false } })
          : await api<Invoice>("/api/invoices", { method: "POST", json: payload }).catch((e: unknown) => {
            // أوفلاين: نحفظ الفاتورة في طابور المتصفح ونكملها عند عودة الشبكة
            // (نكتشف الانقطاع من نوع الخطأ مش من navigator.onLine فقط — لأن
            //  onLine قد تبقى true مع شبكة ضعيفة أو سيرفر متوقف)
            if (isNetworkError(e) || (typeof navigator !== "undefined" && navigator.onLine === false)) {
              enqueueInvoice(
                payload as Record<string, unknown>,
                `${type === "sale" ? "بيع" : "فاتورة"} — ${state.party.name || "عميل نقدي"}`,
              );
              toast(
                "لا يوجد اتصال — تم حفظ الفاتورة في طابور الأوفلاين وسيتم إرسالها تلقائياً عند عودة الإنترنت",
                "info",
              );
              return { ...(payload as unknown as Invoice), id: 0, number: 0, offline: true } as Invoice;
            }
            throw e;
            });

      playSuccess();
      // الفاتورة اتحفظت رسمياً ⇒ المسودة التلقائية خلصت دورها
      // (لو استكملنا مسودة تلقائية: التحديث بيحوّلها لفاتورة عادية بنفس الرقم — مفيش تكرار)
      draftIdRef.current = 0;
      setAutoState("idle");
      // فاتورة محفوظة محلياً (أوفلاين) — لا نُحمّلها كفاتورة محفوظة لأن رقمها لم يُصدر بعد
      if ((inv as { offline?: boolean }).offline) return inv;
      const [plist] = await Promise.all([loadParties(), loadProducts()]);
      loadInvoice(inv, plist);

      if (state.party.id) {
        const remainingOnCustomer = Math.max(0, inv.total - inv.paid);
        const updatedCust = plist.find((x) => x.id === state.party.id);
        const newBal = updatedCust?.balance ?? state.party.balance + remainingOnCustomer;
        toast(
          `تم حفظ الفاتورة #${inv.number} بنجاح!\nالرصيد الحالي للعميل: ${fmt(newBal)} ج.م`,
          "success",
        );
      } else {
        toast(`تم حفظ الفاتورة رقم ${inv.number} بنجاح ✓`);
      }
      return inv;
    } catch (e) {
      playError();
      await msg({ text: errMsg(e), kind: "error" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const printInFrame = (id: number) => {
    document.getElementById("print-frame")?.remove();
    const f = document.createElement("iframe");
    f.id = "print-frame";
    Object.assign(f.style, { position: "fixed", left: "-10000px", top: "0", width: "820px", height: "1100px", border: "0" });
    f.src = `/print/${id}?auto=1`;
    document.body.appendChild(f);
  };

  const print = async () => {
    if (state.invoiceId && !dirty) {
      printInFrame(state.invoiceId);
      return;
    }
    const inv = await save();
    if (inv) printInFrame(inv.id);
  };

  const pdf = async () => {
    if (state.invoiceId && !dirty) {
      window.open(`/print/${state.invoiceId}?auto=1`, "_blank");
      return;
    }
    const inv = await save();
    if (inv) {
      toast("اختر (حفظ كـ PDF) مقاس A5 من نافذة الطباعة", "info");
      printInFrame(inv.id);
    }
  };

  const remove = async () => {
    if (!state.invoiceId) {
      await msg({ text: "الفاتورة الحالية غير محفوظة بعد.", kind: "info" });
      return;
    }
    const ok = await confirm(
      `هل أنت متأكد من حذف الفاتورة رقم ${state.number}؟\nسيتم عكس تأثيرها على المخزون وأرصدة الحسابات.`,
      { title: "حذف فاتورة", danger: true, okText: "حذف", cancelText: "إلغاء", kind: "warning" },
    );
    if (!ok) return;
    try {
      await api(`/api/invoices/${state.invoiceId}`, { method: "DELETE" });
      toast(`تم حذف الفاتورة رقم ${state.number}`);
      await Promise.all([loadParties(), loadProducts()]);
      await startNew();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const undo = () => {
    if (!dirty) {
      toast("لا توجد تعديلات للتراجع عنها", "info");
      return;
    }
    applyState(saved);
    toast("تم التراجع عن التعديلات", "info");
  };

  /** تعليق الفاتورة الحالية كمسودة (بدون أي تأثير على المخزون والأرصدة) */
  const holdDraft = async () => {
    if (!state.rows.length) {
      playError();
      await msg({ text: "أضف صنفاً واحداً على الأقل قبل تعليق الفاتورة.", kind: "warning" });
      return;
    }
    setSaving(true);
    try {
      const keepTime = state.originalDate && isoToDateInput(state.originalDate) === state.date ? state.originalDate : null;
      const payload = {
        type,
        partyId: state.party.id,
        partyName: state.party.name,
        date: dateInputToISO(state.date, keepTime),
        paymentType: state.paymentType,
        paymentMethod: state.paymentMethod,
        priceLevel: state.priceLevel,
        extraDiscount: Math.max(0, toNum(state.extraDiscount)),
        taxRate: 0,
        paid: Math.max(0, toNum(state.paid)),
        notes: state.notes,
        userName: activeUser || settings?.userName || "FATORA",
        items: state.rows.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          unit: r.unit,
          qty: r.qty,
          price: r.price,
          discount: r.discount,
        })),
        isDraft: true,
      };
      const draft = state.invoiceId
        ? await api<Invoice>(`/api/invoices/${state.invoiceId}`, { method: "PUT", json: payload })
        : await api<Invoice>("/api/invoices", { method: "POST", json: payload });
      playSuccess();
      toast(`تم تعليق الفاتورة رقم ${draft.number} — يمكنك استكمالها لاحقاً من زر «المعلقة»`);
      await startNew();
    } catch (e) {
      playError();
      await msg({ text: errMsg(e), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  /** استكمال مسودة داخل شاشة الفاتورة */
  const resumeDraft = (draft: Invoice) => {
    loadInvoice(draft, partiesList);
    setShowDrafts(false);
    toast(`تم فتح المسودة رقم ${draft.number} — استكملها ثم اضغط «حفظ الفاتورة»`, "info");
  };

  const openDrafts = async () => {
    if (!(await guard())) return;
    setShowDrafts(true);
  };

  const cancelInvoice = async () => {
    if (!state.rows.length && !state.invoiceId) {
      productRef.current?.focus();
      return;
    }
    const ok = await confirm("هل تريد إلغاء الفاتورة الحالية وبدء فاتورة جديدة؟\n(لن يتم حفظ أي تعديلات غير محفوظة)", {
      title: "إلغاء الفاتورة",
    });
    if (!ok) return;
    try {
      await startNew();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  const goTo = async (href: string) => {
    if (await guard()) router.push(href);
  };

  const selectMethod = (k: PaymentMethodKey) => {
    if (k === "installments") {
      patch({ paymentMethod: k, paymentType: "credit" });
      if (!state.party.id) toast(`اختر ${cfg.partyLabel} للدفع بالأقساط (F4)`, "info");
    } else patch({ paymentMethod: k });
  };

  const setCredit = () => {
    patch({ paymentType: "credit" });
    if (!state.party.id) toast(`اختر ${cfg.partyLabel} للدفع الآجل (F4)`, "info");
  };

  const changePriceLevel = (level: "retail" | "wholesale") => {
    setState((s) => ({
      ...s,
      priceLevel: level,
      rows: s.rows.map((r) => {
        const p = r.productId ? productById.get(r.productId) : undefined;
        return p ? { ...r, price: priceFor(p, type, level) } : r;
      }),
    }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      if (document.querySelector(".win-dialog")) return;
      switch (e.key) {
        case "F1":
          e.preventDefault();
          setShowPriceInquiry(true);
          break;
        case "F2":
          e.preventDefault();
          void newInvoice();
          break;
        case "F3":
          e.preventDefault();
          setShowProductSearchModal(true);
          break;
        case "F4":
          e.preventDefault();
          setShowPartySearch(true);
          break;
        case "F7":
          e.preventDefault();
          setShowPreviewModal(true);
          break;
        case "F8":
          e.preventDefault();
          setShowFloatingProduct(true);
          break;
        case "F9":
          e.preventDefault();
          void save();
          break;
        case "F10":
          e.preventDefault();
          void print();
          break;
        case "Delete": {
          const t = e.target as HTMLElement | null;
          if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
          if (selected >= 0) {
            e.preventDefault();
            removeRow(selected);
          }
          break;
        }
      }
    };
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const selRow = selected >= 0 ? state.rows[selected] : undefined;
  const selProduct = entry.product ?? (selRow?.productId ? productById.get(selRow.productId) : undefined);
  const entryValue = entry.product ? Math.max(0, toNum(entry.qty) * toNum(entry.price) - toNum(entry.discount)) : 0;
  const paidNum = Math.max(0, toNum(state.paid));
  // المدفوع: لو المستخدم كتب مبلغ يستخدمه، غير كده في النقدي = المطلوب كامل
  const paidValue = state.paid.trim() ? paidNum : (state.paymentType === "credit" ? 0 : round2(totals.total));
  const change = state.paymentType === "credit" ? round2(totals.total - paidNum) : (paidNum > 0 ? round2(paidNum - totals.total) : 0);

  return (
    <Window
      title={cfg.title}
      onClose={() => void goTo("/")}
      statusBar={
        <>
          <span>الكاشير: <b className="text-blue-800 font-black">{activeUser || settings?.userName || "FATORA"}</b></span>
          <span className="sep" />
          <span className="font-black text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
            <span>{state.invoiceId ? (dirty ? "● فاتورة معدلة (غير محفوظة)" : "✓ فاتورة محفوظة") : "● فاتورة جديدة"}</span>
          </span>
          {/* حالة الحفظ التلقائي — تطمن الكاشير إن الشغل محفوظ */}
          {!state.invoiceId && state.rows.length > 0 && (
            <>
              <span className="sep" />
              <span
                className={`flex items-center gap-1 font-black ${
                  autoState === "saving" ? "text-amber-700" : autoState === "saved" ? "text-emerald-700" : "text-slate-500"
                }`}
                title="البرنامج بيحفظ نسخة احتياطية من الفاتورة كل 20 ثانية — لو الكهربا قطعت ترجع زي ما هي"
              >
                {autoState === "saving" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : autoState === "saved" ? (
                  <CloudCheck className="h-4 w-4" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                <span>
                  {autoState === "saving"
                    ? "جارٍ الحفظ التلقائي…"
                    : autoState === "saved"
                      ? `محفوظ تلقائياً ${autoAt}`
                      : autoState === "off"
                        ? "الحفظ التلقائي متوقف (الاشتراك)"
                        : "حفظ تلقائي كل 20 ثانية"}
                </span>
              </span>
            </>
          )}
          <span className={`ms-auto flex items-center gap-2 ${L.hints ? "" : "hidden"}`}>
            <span><span className="kbd">Del</span>حذف سطر</span>
            <span><span className="kbd">F10</span>طباعة</span>
            <span><span className="kbd">F9</span>حفظ</span>
            <span><span className="kbd">F8</span>إضافة صنف</span>
            <span><span className="kbd">F7</span>معاينة A5</span>
            <span><span className="kbd">F4</span>بحث {cfg.partyLabel}</span>
            <span><span className="kbd">F3</span>بحث صنف (عائم)</span>
            <span><span className="kbd">F2</span>جديد</span>
            <span><span className="kbd">F1</span>استعلام سعر</span>
          </span>
        </>
      }
    >
      <div className="relative flex h-full w-full flex-col gap-1.5 p-2 bg-[#eef4fb]">
        {/* ===== إطار شريط الأدوات العلوي ===== */}
        <div className={`shrink-0 rounded-lg border border-[#dce7f4] bg-white p-1.5 shadow-sm ${L.toolbar ? "" : "hidden"}`}>
          <div className="flex h-[40px] items-center gap-2">
            {/* مجموعة اليمين: تراجع ← رقم الفاتورة ← حذف */}
            <div className="flex items-center gap-1.5 rounded-md border border-[#c3d6ec] bg-white/70 p-1">
              <button
                type="button"
                className={`btn h-[32px] min-w-[86px] px-2.5 text-[14px] font-black ${L.undo ? "" : "hidden"}`}
                onClick={undo}
                title="تراجع عن التعديل"
              >
                <Undo2 className="h-4 w-4 text-blue-600" strokeWidth={3} />
                <span>تراجع</span>
              </button>

              <div className={`flex items-center gap-1 rounded border border-[#9fb4d2] bg-white px-1 ${L.numberBox ? "" : "hidden"}`}>
                <button
                  type="button"
                  className="btn h-[26px] w-[28px] shrink-0 p-0"
                  title="بحث برقم الفاتورة"
                  onClick={() => void navigate("exact", Number(numberInput) || state.number)}
                >
                  <Search className="h-3.5 w-3.5 text-blue-700" strokeWidth={3} />
                </button>
                <input
                  className="num h-[26px] w-[92px] border-0 bg-transparent text-center text-[17px] font-black text-[#d0190f] outline-none"
                  dir="ltr"
                  value={numberInput}
                  title="اكتب رقم الفاتورة واضغط Enter"
                  onChange={(e) => setNumberInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void navigate("exact", Number(numberInput) || state.number);
                  }}
                />
              </div>

              {(type === "sale_return" || type === "purchase_return") && (
                <button
                  type="button"
                  className={`btn h-[32px] min-w-[104px] px-2 text-[13.5px] font-black ${L.scanOriginal ? "" : "hidden"}`}
                  onClick={() => setScanOpen(true)}
                  title="امسح باركود الفاتورة الأصلية لتحميل أصنافها تلقائياً في المرتجع"
                >
                  <ScanLine className="h-4 w-4 text-blue-700" strokeWidth={3} />
                  <span>مسح الأصل</span>
                </button>
              )}

              <button
                type="button"
                className={`btn btn-red h-[32px] min-w-[80px] px-2.5 text-[14px] font-black ${L.delete ? "" : "hidden"}`}
                onClick={() => void remove()}
                title="حذف الفاتورة"
              >
                <Trash2 className="h-4 w-4" />
                <span>حذف</span>
              </button>

              {/* التاريخ والوقت — انتقلا هنا بجوار زر الحذف */}
              <div className={`flex items-center gap-1 rounded-md border border-[#c3d6ec] bg-white px-1 ${L.dateTime ? "" : "hidden"}`}>
                <input
                  type="date"
                  className="num h-[26px] w-[112px] border-0 bg-transparent text-center text-[12.5px] font-black text-[#0f2e5a] outline-none"
                  value={state.date}
                  onChange={(e) => patch({ date: e.target.value || todayInput() })}
                  title="تاريخ الفاتورة"
                />
                <div
                  className="num flex h-[26px] items-center gap-1 border-r border-[#dbe6f3] pl-1 pr-1.5 text-[12.5px] font-black text-[#0f2e5a]"
                  suppressHydrationWarning
                  title="الوقت الحالي"
                >
                  <Clock3 className="h-3 w-3 text-blue-700" />
                  {clock || "--:--"}
                </div>
              </div>
            </div>

            {/* كاميرا الموبايل — ماسح باركود بالواي فاي */}
            {L.cameraIcon && (
              <button
                type="button"
                className="btn h-[32px] w-[38px] shrink-0 p-0"
                title="كاميرا الموبايل — استخدم موبايلك كماسح باركود (واي فاي)"
                onClick={() => setPhoneScanOpen(true)}
              >
                <Camera className="h-4 w-4 text-emerald-700" />
              </button>
            )}

            {/* الشريط الأزرق الفاتح الذي يفصل بين المجموعتين */}
            <span className="h-[26px] flex-1 rounded-full bg-gradient-to-l from-[#cfe4ff] via-[#eaf4ff] to-[#cfe4ff]" />

            {/* مجموعة اليسار: طباعة الفاتورة + PDF */}
            <div className="flex items-center gap-1.5 rounded-md border border-[#c3d6ec] bg-white/70 p-1">
              <button
                type="button"
                className={`btn btn-blue h-[32px] px-3 text-[13.5px] font-black shadow-sm ${L.print ? "" : "hidden"}`}
                onClick={() => void print()}
                title="طباعة الفاتورة A5 فوراً (F10)"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة الفاتورة</span>
              </button>
              <button
                type="button"
                className={`btn h-[32px] w-[42px] p-0 ${L.pdf ? "" : "hidden"}`}
                title="تصدير / حفظ كـ PDF"
                onClick={() => void pdf()}
              >
                <PdfIcon className="h-6 w-6" />
              </button>

              <button
                type="button"
                className="btn btn-green h-[32px] px-2.5 text-[13px] font-black"
                title="إرسال الفاتورة على واتساب"
                onClick={async () => {
                  if (state.invoiceId && !dirty) {
                    try {
                      const inv = await api<Invoice>(`/api/invoices/${state.invoiceId}`);
                      setShareInvoice(inv);
                    } catch (e) {
                      toast(errMsg(e), "error");
                    }
                    return;
                  }
                  const saved = await save();
                  if (saved) setShareInvoice(saved);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>واتساب</span>
              </button>

              {/* المستخدم الحالي — بجوار زر الطباعة */}
              <div
                className="ms-1 flex h-[32px] items-center gap-1.5 rounded-full border border-[#8fb3e0] bg-white pe-1 ps-2.5 shadow-sm"
                title={`المستخدم الحالي: ${activeUser || settings?.userName || "FATORA"}`}
              >
                <User className="h-3.5 w-3.5 shrink-0 text-[#0f2942]" />
                <span className="max-w-[110px] truncate text-[12px] font-black text-[#0f2942]">
                  {activeUser || settings?.userName || "FATORA"}
                </span>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#fbbf24] to-[#d99a06] text-[11px] font-black text-[#3b2503]">
                  {(activeUser || settings?.userName || "F").trim().charAt(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== البيانات الأساسية: 3 كروت رئيسية متناسقة ومريحة للعين ===== */}
        <div className="flex shrink-0 items-stretch gap-2">
          
          {/* كارت 1 (اليمين): العميل ورصيده */}
          <div className={`flex w-[390px] min-w-[360px] shrink-0 rounded-xl border border-[#cfdff0] bg-white p-2.5 shadow-sm transition-all hover:shadow ${L.partyBox ? "" : "hidden"}`}>
            <div className="flex flex-1 flex-col justify-between gap-1.5 pe-2 border-l border-slate-200">
              {/* رقم العميل */}
              <div className="flex h-[32px] items-center gap-1.5">
                <span className="w-[68px] shrink-0 text-[12px] font-black text-[#274b74]">رقم {cfg.partyLabel}</span>
                <div className="flex flex-1 items-center gap-1">
                  <input
                    className="win-input num h-[32px] flex-1 text-center text-[15px] font-black text-[#d0190f] rounded-md border-[#cfdff0] focus:border-blue-500"
                    dir="ltr"
                    placeholder="نقدي"
                    value={partyCodeInput || (state.party.code ? String(state.party.code) : "")}
                    onChange={(e) => setPartyCodeInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") lookupPartyCode();
                    }}
                    title="اكتب رقم الحساب واضغط Enter"
                  />
                  <button
                    type="button"
                    className="btn btn-blue h-[32px] w-[32px] shrink-0 p-0 rounded-md shadow-xs hover:brightness-110 active:scale-95 transition-all"
                    title={`بحث عن ${cfg.partyLabel} (F4)`}
                    onClick={() => setShowPartySearch(true)}
                  >
                    <Search className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    className="btn h-[32px] w-[32px] shrink-0 p-0 rounded-md border-[#cfdff0] bg-slate-50 shadow-xs hover:bg-slate-100 active:scale-95 transition-all"
                    title={`إضافة ${cfg.partyLabel} جديد`}
                    onClick={() => setShowAddParty(true)}
                  >
                    <AddUserIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* اسم العميل — خانة عريضة ومريحة وواضحة جداً */}
              <div className="flex h-[34px] items-center gap-1.5">
                <span className="w-[68px] shrink-0 text-[12px] font-black text-[#274b74]">اسم {cfg.partyLabel}</span>
                <div className="win-input flex h-[34px] flex-1 items-center justify-center truncate rounded-md text-[15px] font-black text-amber-950 bg-[#fffbeb] border-amber-300 shadow-inner px-2">
                  {state.party.name}
                </div>
              </div>

              {/* تليفون العميل */}
              <div className="flex h-[32px] items-center gap-1.5">
                <span className="w-[68px] shrink-0 text-[12px] font-black text-[#274b74]">تليفون</span>
                <div className="flex flex-1 items-center gap-1">
                  <input
                    className="win-input num h-[32px] flex-1 text-center text-[14px] font-black text-[#0f2e5a] rounded-md border-[#cfdff0] focus:border-blue-500"
                    dir="ltr"
                    inputMode="tel"
                    placeholder="01xxxxxxxxx"
                    value={partyPhone}
                    onChange={(e) => setPartyPhone(e.target.value)}
                    readOnly={!state.party.id}
                    title={state.party.id ? "تليفون العميل — يمكن تعديله" : "اختر عميلاً أولاً"}
                  />
                  {state.party.id && (
                    <button
                      type="button"
                      className="btn h-[32px] w-[32px] shrink-0 p-0 rounded-md border-[#cfdff0] hover:bg-red-50 text-red-600 transition-all"
                      title="مسح رقم التليفون"
                      onClick={() => setPartyPhone("")}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* رصيد العميل — كارت ذهبي فخم بكامل الارتفاع بجانب بيانات العميل مباشرة */}
            <div className="flex w-[118px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-[#e6bf3a] bg-gradient-to-b from-[#ffe97a] via-[#ffd83d] to-[#f5b301] p-1.5 text-center shadow-inner">
              <span className="flex items-center gap-1 text-[12px] font-black text-[#3b2503]">
                <Wallet className="h-3.5 w-3.5" strokeWidth={2.6} />
                رصيد {cfg.partyLabel}
              </span>
              <span className="num text-[24px] font-black leading-none text-[#291a03] truncate max-w-full px-1" title={fmt(state.party.balance)}>
                {fmt(state.party.balance)}
              </span>
              <span className="text-[10px] font-bold text-[#6b4701]">
                {state.party.balance > 0 ? "له رصيد" : state.party.balance < 0 ? "عليه متبقي" : "خالص"}
              </span>
            </div>
          </div>

          {/* كارت 2 (الوسط): المجموعات والأقسام + طريقة الدفع + ملاحظات الفاتورة */}
          <div className="flex flex-1 min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-[#cfdff0] bg-white p-2.5 shadow-sm transition-all hover:shadow">
            
            {/* الصف 1: المجموعات والأقسام والبحث */}
            <div className="flex items-center gap-2">
              <span className="w-[85px] shrink-0 text-[12.5px] font-black text-[#274b74] whitespace-nowrap">المجموعة والقسم</span>
              
              <div className="relative flex-1 min-w-0">
                <select
                  className="win-input h-[32px] w-full appearance-none rounded-md pr-7 pl-6 text-[13px] font-bold text-[#12263f] border-[#cfdff0] bg-[#f8fbff] focus:border-blue-500"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  title="اختر المجموعة لعرض أصنافها"
                >
                  <option value="">كل المجموعات والأقسام</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px]">🗂️</span>
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-blue-700">▼</span>
              </div>

              <button
                type="button"
                className={`grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all shrink-0 ${L.addCategory ? "" : "hidden"}`}
                title="إضافة مجموعة جديدة"
                onClick={() => setShowAddCategoryModal(true)}
              >
                <Plus className="h-4 w-4 stroke-[3]" />
              </button>

              <div className="flex items-center gap-1.5 rounded-md border border-[#cfdff0] bg-[#f8fbff] px-2 py-1 text-[12px] font-black text-[#274b74] shrink-0">
                <span className="text-slate-400">بحث:</span>
                <label className="flex cursor-pointer items-center gap-1 text-blue-900">
                  <input type="radio" checked={searchMode === "name"} onChange={() => setSearchMode("name")} />
                  بالاسم
                </label>
                <label className="flex cursor-pointer items-center gap-1 text-blue-900">
                  <input type="radio" checked={searchMode === "code"} onChange={() => setSearchMode("code")} />
                  بالكود
                </label>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-900 border border-blue-200">
                  <span>أصناف:</span>
                  <span className="num font-black text-[13px] text-blue-700">{state.rows.length}</span>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-900 border border-emerald-200">
                  <span>كمية:</span>
                  <span className="num font-black text-[13px] text-emerald-700">{fmtQty(totals.qty)}</span>
                </div>
              </div>
            </div>

            {/* الصف 2: طريقة الدفع (أزرار أنيقة ومباشرة) */}
            <div className={`flex items-center gap-2 ${L.payment ? "" : "hidden"}`}>
              <span className="w-[85px] shrink-0 text-[12.5px] font-black text-[#274b74] whitespace-nowrap">طريقة الدفع</span>
              <div className="flex flex-1 items-center gap-1.5">
                {ALLOWED_PAYMENT_METHODS.map((m) => {
                  const active = state.paymentMethod === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      className={`flex h-[32px] flex-1 items-center justify-center gap-1.5 rounded-md border text-[12.5px] font-black transition-all ${
                        active
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs ring-1 ring-emerald-500 font-black"
                          : "border-[#cfdff0] bg-[#f8fbff] text-[#4a6484] hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      onClick={() => selectMethod(m.key)}
                    >
                      <span className="shrink-0">{METHOD_ICONS[m.key]}</span>
                      <span>{m.label}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-600 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* الصف 3: ملاحظات الفاتورة */}
            <div className={`flex items-center gap-2 ${L.notes ? "" : "hidden"}`}>
              <span className="w-[85px] shrink-0 text-[12.5px] font-black text-[#274b74] whitespace-nowrap">ملاحظات الفاتورة</span>
              <input
                className="win-input h-[32px] flex-1 rounded-md border-[#cfdff0] bg-[#f8fbff] text-[12.5px] text-[#0f2e5a] placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
                placeholder="اكتب أية ملاحظات للعميل هنا ..."
                value={state.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </div>
          </div>

          {/* كارت 3 (اليسار): مفاتيح التحكم والأزرار السريعة */}
          <div className="flex w-[320px] min-w-[300px] shrink-0 flex-col justify-between gap-1.5 rounded-xl border border-[#cfdff0] bg-white p-2.5 shadow-sm transition-all hover:shadow">
            
            {/* أزرار السويتشات (مصفوفة 2x2 أنيقة جداً) */}
            <div className="grid grid-cols-2 gap-1.5">
              
              {/* نقدي / أجل */}
              <div className="flex h-[30px] rounded-md border border-[#cfdff0] bg-[#f4f8fd] p-0.5">
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center rounded text-[12px] font-black transition-all ${
                    state.paymentType === "cash"
                      ? "bg-[#0067c0] text-white shadow-xs"
                      : "text-[#4a6484] hover:text-slate-900"
                  }`}
                  onClick={() => patch({ paymentType: "cash" })}
                >
                  نقدي
                </button>
                <button
                  type="button"
                  className={`flex flex-1 items-center justify-center rounded text-[12px] font-black transition-all ${
                    state.paymentType === "credit"
                      ? "bg-[#0067c0] text-white shadow-xs"
                      : "text-[#4a6484] hover:text-slate-900"
                  }`}
                  onClick={setCredit}
                >
                  أجل
                </button>
              </div>

              {/* قطاعي / جملة */}
              {type === "sale" ? (
                <div className="flex h-[30px] rounded-md border border-[#cfdff0] bg-[#f4f8fd] p-0.5">
                  <button
                    type="button"
                    onClick={() => changePriceLevel("retail")}
                    className={`flex flex-1 items-center justify-center rounded text-[12px] font-black transition-all ${
                      state.priceLevel === "retail"
                        ? "bg-[#5c2e91] text-white shadow-xs"
                        : "text-[#4a6484] hover:text-slate-900"
                    }`}
                  >
                    قطاعي
                  </button>
                  <button
                    type="button"
                    onClick={() => changePriceLevel("wholesale")}
                    className={`flex flex-1 items-center justify-center rounded text-[12px] font-black transition-all ${
                      state.priceLevel === "wholesale"
                        ? "bg-[#5c2e91] text-white shadow-xs"
                        : "text-[#4a6484] hover:text-slate-900"
                    }`}
                  >
                    جملة
                  </button>
                </div>
              ) : (
                <div className="flex h-[30px] items-center justify-center rounded-md border border-[#cfdff0] bg-slate-50 text-[12px] font-black text-slate-500">
                  شراء
                </div>
              )}

              {/* باركود Switch */}
              <button
                type="button"
                onClick={() => setBarcodeMode(!barcodeMode)}
                className={`flex h-[30px] items-center justify-between px-2 rounded-md border text-[12px] font-black transition-all ${
                  barcodeMode
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-[#cfdff0] bg-[#f4f8fd] text-[#4a6484]"
                }`}
              >
                <span>باركود</span>
                <span className={`relative inline-flex h-[16px] w-[28px] items-center rounded-full transition-colors ${barcodeMode ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`inline-block h-[12px] w-[12px] transform rounded-full bg-white transition-transform ${barcodeMode ? "translate-x-[-14px]" : "translate-x-[-2px]"}`} />
                </span>
              </button>

              {/* تجميع Switch */}
              <button
                type="button"
                onClick={() => setMergeSame(!mergeSame)}
                className={`flex h-[30px] items-center justify-between px-2 rounded-md border text-[12px] font-black transition-all ${
                  mergeSame
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-[#cfdff0] bg-[#f4f8fd] text-[#4a6484]"
                }`}
              >
                <span>تجميع</span>
                <span className={`relative inline-flex h-[16px] w-[28px] items-center rounded-full transition-colors ${mergeSame ? "bg-blue-600" : "bg-slate-300"}`}>
                  <span className={`inline-block h-[12px] w-[12px] transform rounded-full bg-white transition-transform ${mergeSame ? "translate-x-[-14px]" : "translate-x-[-2px]"}`} />
                </span>
              </button>
            </div>

            {/* الأزرار الكبيرة: إضافة صنف + كشف حساب */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="flex h-[36px] items-center justify-center gap-1.5 rounded-lg bg-emerald-700 text-white text-[13px] font-black shadow-xs hover:bg-emerald-800 hover:-translate-y-0.5 active:scale-95 transition-all"
                onClick={() => setShowFloatingProduct(true)}
                title="إضافة صنف جديد سريعاً للفاتورة والمخزن (F8)"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                <span>إضافة صنف</span>
              </button>

              <button
                type="button"
                className="flex h-[36px] items-center justify-center gap-1.5 rounded-lg bg-amber-700 text-white text-[13px] font-black shadow-xs hover:bg-amber-800 hover:-translate-y-0.5 active:scale-95 transition-all"
                onClick={() => void goTo(cfg.partiesHref)}
                title="كشف حساب العميل"
              >
                <Search className="h-3.5 w-3.5" strokeWidth={3} />
                <span>كشف حساب</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== شريط إدخال الصنف السريع + كشف أسعار الصنف المحدد ===== */}
        <div className={`flex shrink-0 items-center gap-2 rounded-xl border border-[#cfdff0] bg-white p-1.5 shadow-sm ${L.quickAdd ? "" : "hidden"}`}>
          {/* إدخال الصنف */}
          <div className="relative flex-1 min-w-[260px]">
            <input
              ref={productRef}
              className="win-input h-[34px] w-full rounded-md border-[#cfdff0] !text-right font-black text-[#0f2e5a] placeholder:text-slate-400 focus:border-blue-500"
              placeholder="اكتب اسم الصنف أو الباركود (F3 للبحث)..."
              value={entry.text}
              onChange={(e) => {
                setEntry({ ...entry, product: null, text: e.target.value });
                setShowSuggest(true);
                setHi(0);
              }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              onKeyDown={onProductKey}
            />
            {showSuggest && entry.text && !entry.product && suggestions.length > 0 && (
              <div className="suggest">
                {suggestions.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickProduct(p);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-right ${i === hi ? "bg-blue-600 text-white" : "hover:bg-blue-50"}`}
                  >
                    <span className="truncate font-extrabold text-[13.5px]">{p.name}</span>
                    <span className="num shrink-0 text-[11.5px] font-bold">
                      {fmt(priceFor(p, type, state.priceLevel))} | رصيد {fmtQty(p.stock)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* سعر الوحدة */}
          <div className="flex h-[34px] w-[95px] items-center rounded-md border border-[#cfdff0] bg-[#f8fbff] px-1.5 focus-within:border-blue-500">
            <span className="text-[10.5px] font-bold text-slate-500 shrink-0 ms-1">سعر:</span>
            <input
              className="num h-full w-full border-0 bg-transparent text-center text-[13.5px] font-black text-blue-900 outline-none"
              inputMode="decimal"
              value={entry.price}
              onChange={(e) => setEntry({ ...entry, price: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  qtyRef.current?.focus();
                  qtyRef.current?.select();
                }
              }}
            />
          </div>

          {/* الكمية */}
          <div className="flex h-[34px] w-[85px] items-center rounded-md border border-[#cfdff0] bg-[#f8fbff] px-1.5 focus-within:border-blue-500">
            <span className="text-[10.5px] font-bold text-slate-500 shrink-0 ms-1">كمية:</span>
            <input
              ref={qtyRef}
              className="num h-full w-full border-0 bg-transparent text-center text-[13.5px] font-black text-blue-900 outline-none"
              inputMode="decimal"
              value={entry.qty}
              onChange={(e) => setEntry({ ...entry, qty: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEntry();
                }
              }}
            />
          </div>

          {/* الخصم */}
          <div className="flex h-[34px] w-[85px] items-center rounded-md border border-[#cfdff0] bg-[#f8fbff] px-1.5 focus-within:border-red-500">
            <span className="text-[10.5px] font-bold text-red-500 shrink-0 ms-1">خصم:</span>
            <input
              className="num h-full w-full border-0 bg-transparent text-center text-[13.5px] font-black text-red-600 outline-none"
              inputMode="decimal"
              value={entry.discount}
              onChange={(e) => setEntry({ ...entry, discount: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEntry();
                }
              }}
            />
          </div>

          {/* القيمة */}
          <div className="flex h-[34px] w-[95px] items-center justify-center rounded-md bg-blue-50 border border-blue-200 px-1.5">
            <span className="num text-[14px] font-black text-blue-900">{fmt(entryValue)}</span>
          </div>

          {/* زر إضافة للفاتورة + */}
          <button
            type="button"
            className="flex h-[34px] w-[38px] shrink-0 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-xs transition-all"
            title="إضافة للفاتورة (Enter)"
            onClick={commitEntry}
          >
            <Plus className="h-5 w-5 stroke-[3]" />
          </button>

          {/* فاصل */}
          <span className="h-[24px] w-[1px] bg-slate-200 shrink-0 mx-1" />

          {/* شريط الأسعار والربحية للصنف المحدد */}
          <div className="flex h-[34px] items-center gap-1 rounded-md bg-amber-50/60 border border-amber-200 px-2 shrink-0">
            {[
              ["الرصيد", selProduct ? fmtQty(selProduct.stock) : "0.0"],
              ["سعر الشراء", selProduct ? fmt(selProduct.costPrice) : "0.0"],
              ["سعر الجملة", selProduct ? fmt(selProduct.wholesalePrice) : "0.0"],
              ["سعر البيع", selProduct ? fmt(selProduct.salePrice) : "0.0"],
              ["ربح الوحدة", selProduct ? fmt(selProduct.salePrice - selProduct.costPrice) : "0.0"],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center gap-1 px-1.5 border-l border-amber-200 last:border-0 leading-tight">
                <span className="text-[10px] font-bold text-slate-500">{l}:</span>
                <span className="num text-[11.5px] font-black text-[#8a2a2a]">{v}</span>
              </div>
            ))}
          </div>

          {/* صورة الصنف إن وجدت */}
          {L.itemImage && (
            <div className="flex h-[34px] items-center gap-1 rounded-md border border-[#cfdff0] bg-[#f8fbff] px-2 shrink-0">
              {selProduct?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selProduct.imageUrl} alt={selProduct.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <Camera className="h-4 w-4 text-slate-400" />
              )}
              <span className="truncate max-w-[80px] text-[10px] font-bold text-slate-600">
                {selProduct ? selProduct.name : "صورة"}
              </span>
            </div>
          )}
        </div>

        {/* ===== شريط المال الموحّد: 4 كروت إجماليات فخمة وعصرية ===== */}
        <div className={`grid grid-cols-4 gap-2 shrink-0 ${L.totals ? "" : "hidden"}`}>
          
          {/* كارت 1: المطلوب دفعه */}
          <div className="pos-money-card flex h-[88px] flex-col justify-between rounded-xl bg-gradient-to-l from-[#004b87] to-[#0067c0] p-2.5 text-white shadow-sm border border-[#003e73]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-black text-blue-100">
                <Wallet className="h-4 w-4 text-blue-200" strokeWidth={2.5} />
                المطلوب دفعه
              </span>
              <span className="text-[10px] font-bold text-blue-200 bg-white/10 px-2 py-0.5 rounded-full">صافي الفاتورة</span>
            </div>
            <div className="num truncate text-center text-[32px] font-black leading-none text-white drop-shadow-xs">
              {fmt(totals.total)}
            </div>
          </div>

          {/* كارت 2: المتبقي */}
          <div className="pos-money-card flex h-[88px] flex-col justify-between rounded-xl bg-[#fee2e2] p-2.5 shadow-sm border-2 border-[#fca5a5]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-black text-red-950">
                <CreditCard className="h-4 w-4 text-red-600" strokeWidth={2.5} />
                المتبقي
              </span>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                {change < 0 ? "باقي للعميل" : change > 0 ? "آجل على العميل" : "خالص"}
              </span>
            </div>
            <div className="num truncate text-center text-[32px] font-black leading-none text-[#dc2626]">
              {fmt(Math.abs(change))}
            </div>
          </div>

          {/* كارت 3: المدفوع (مع خانة إدخال مباشرة بالداخل!) */}
          <div className="pos-money-card flex h-[88px] flex-col justify-between rounded-xl bg-gradient-to-l from-[#15803d] to-[#16a34a] p-2 text-white shadow-sm border border-[#166534]">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-[13px] font-black text-emerald-100">
                <Banknote className="h-4 w-4 text-emerald-200" strokeWidth={2.5} />
                المدفوع
              </span>
              <button
                type="button"
                className="text-[10px] font-black bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded transition-colors"
                onClick={() => patch({ paid: String(totals.total) })}
                title="دفع المبلغ كاملاً"
              >
                دفع كامل
              </button>
            </div>
            <div className="relative w-full">
              <input
                className="num h-[40px] w-full rounded-lg bg-white text-center text-[26px] font-black text-emerald-950 shadow-inner outline-none focus:ring-2 focus:ring-yellow-400"
                inputMode="decimal"
                placeholder={fmt(totals.total)}
                value={state.paid}
                onChange={(e) => patch({ paid: e.target.value })}
                title="اكتب المبلغ المدفوع هنا"
              />
              {state.party.balance > 0 && paidNum > totals.total && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExcessAction("deduct")}
                    className={`rounded px-1.5 py-0.5 text-[9.5px] font-black transition ${
                      excessAction === "deduct"
                        ? "bg-emerald-700 text-white"
                        : "bg-white/80 text-emerald-900 border border-emerald-300"
                    }`}
                  >
                    تنزيل من الحساب
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcessAction("refund")}
                    className={`rounded px-1.5 py-0.5 text-[9.5px] font-black transition ${
                      excessAction === "refund"
                        ? "bg-amber-600 text-white"
                        : "bg-white/80 text-amber-900 border border-amber-300"
                    }`}
                  >
                    يستلم الباقي
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* كارت 4: إجمالي الأصناف */}
          <div className="pos-money-card flex h-[88px] flex-col justify-between rounded-xl bg-[#e0f2fe] p-2.5 shadow-sm border-2 border-[#bae6fd]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-black text-sky-950">
                <BarChart3 className="h-4 w-4 text-sky-700" strokeWidth={2.5} />
                إجمالي الأصناف
              </span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">قبل الخصم</span>
            </div>
            <div className="num truncate text-center text-[32px] font-black leading-none text-[#0369a1]">
              {fmt(totals.gross)}
            </div>
          </div>
        </div>

        {/* ===== الإضافات الثانوية: خصم إضافي + الضريبة + الخصم الكلي + عدد الأصناف (مخفية من الواجهة) ===== */}
        <div className="hidden grid-cols-4 gap-2 shrink-0">
          <div className="flex h-[36px] items-center gap-2 rounded-lg border border-[#cfdff0] bg-white px-2.5 shadow-2xs">
            <span className="whitespace-nowrap text-[12px] font-black text-[#9d5d00]">خصم إضافي:</span>
            <input
              className="win-input num h-[28px] w-full min-w-0 text-center text-[14px] font-black text-red-600 rounded border-slate-200"
              inputMode="decimal"
              placeholder="0"
              value={state.extraDiscount}
              onChange={(e) => patch({ extraDiscount: e.target.value })}
            />
          </div>
          <div className="flex h-[36px] items-center justify-between rounded-lg border border-[#cfdff0] bg-white px-3 shadow-2xs">
            <span className="text-[12px] font-bold text-slate-500">الخصم الكلي</span>
            <span className="num text-[14px] font-black text-red-600">{fmt(totals.discount)}</span>
          </div>
          <div className="flex h-[36px] items-center justify-between rounded-lg border border-[#cfdff0] bg-white px-3 shadow-2xs">
            <span className="text-[12px] font-bold text-slate-500">الضريبة</span>
            <span className="num text-[14px] font-black text-slate-700">{fmt(totals.tax)}</span>
          </div>
          <div className="flex h-[36px] items-center justify-between rounded-lg border border-[#cfdff0] bg-white px-3 shadow-2xs">
            <span className="text-[12px] font-bold text-slate-500">عدد الأصناف</span>
            <span className="num text-[14px] font-black text-[#0f2e5a]">{state.rows.length}</span>
          </div>
        </div>

        {/* ===== جدول الفاتورة + قائمة الأصناف السريعة ===== */}
        <div className="flex min-h-0 flex-1 w-full gap-2">
          
          {/* جدول الفاتورة (اليمين) */}
          <div className={`flex flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-[#cfdff0] bg-white shadow-sm ${L.grid ? "" : "hidden"}`}>
            <div className="overflow-auto flex-1">
              <table className="dgrid-invoice w-full text-center">
                <thead className="sticky top-0 z-10 bg-[#0f2e5a] text-white">
                  <tr className="h-[38px] text-[13px] font-black">
                    <th className="w-[45px] text-center border-l border-white/20">م</th>
                    <th className="text-right px-3 border-l border-white/20">اسم الصنف والبيان</th>
                    <th className="w-[85px] border-l border-white/20">العبوة</th>
                    <th className="w-[90px] border-l border-white/20">الكمية</th>
                    <th className="w-[105px] border-l border-white/20">سعر الوحدة</th>
                    <th className="w-[90px] border-l border-white/20">الخصم</th>
                    <th className="w-[115px] border-l border-white/20">الإجمالي</th>
                    <th className="w-[50px] text-center">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((r, i) => {
                    const sel = i === selected;
                    return (
                      <tr
                        key={r.key}
                        className={`clickable h-[36px] transition-colors ${
                          sel ? "sel !bg-blue-600 text-white" : "border-b border-[#e2edf8] hover:bg-blue-50/50"
                        }`}
                        onClick={() => setSelected(i)}
                      >
                        <td className={`num font-black ${sel ? "text-white" : "text-blue-900"}`}>{i + 1}</td>
                        <td className={`truncate text-right font-black px-3 ${sel ? "text-white" : "text-slate-900"}`}>
                          {r.productName}
                        </td>
                        <td className={sel ? "text-white" : "text-slate-600"}>{r.unit}</td>
                        <td className="p-0.5">
                          <NumCell value={r.qty} onCommit={(v) => (v > 0 ? updateRow(i, { qty: round3(v) }) : removeRow(i))} />
                        </td>
                        <td className="p-0.5">
                          <NumCell value={r.price} digits={2} onCommit={(v) => updateRow(i, { price: round2(v) })} />
                        </td>
                        <td className="p-0.5">
                          <NumCell value={r.discount} digits={2} onCommit={(v) => updateRow(i, { discount: round2(v) })} />
                        </td>
                        <td className={`num font-black ${sel ? "text-white" : "text-[#0f2e5a]"}`}>
                          {fmt(r.qty * r.price - r.discount)}
                        </td>
                        <td className="p-0 text-center">
                          <button
                            type="button"
                            className="del-row-btn mx-auto grid h-7 w-7 place-items-center rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 active:scale-90 transition-all"
                            title="حذف السطر"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRow(i);
                            }}
                          >
                            <XCircle className="h-5 w-5 fill-red-600 text-white" strokeWidth={2.4} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 8 - state.rows.length) }).map((_, i) => (
                    <tr key={`e${i}`} className="empty h-[34px] border-b border-slate-100">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j}>&nbsp;</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* قائمة الأصناف السريعة (اليسار) */}
          <div className={`flex w-[320px] min-w-[290px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#cfdff0] bg-white shadow-sm ${L.productCards ? "" : "hidden"}`}>
            <div className="flex h-[38px] items-center justify-between bg-[#0f2e5a] px-3 text-white">
              <span className="text-[13px] font-black">الأصناف السريعة ({filtered.length})</span>
              <div className="flex gap-1" dir="rtl">
                <button
                  type="button"
                  className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all ${
                    viewMode === "cards"
                      ? "bg-white text-[#0f2e5a] shadow-xs"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  onClick={() => setViewMode("cards")}
                >
                  كروت
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-0.5 rounded text-[11px] font-black transition-all ${
                    viewMode === "table"
                      ? "bg-white text-[#0f2e5a] shadow-xs"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  onClick={() => setViewMode("table")}
                >
                  جدول
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-2 bg-[#f8fbff]">
              {viewMode === "cards" ? (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="pos-product-card group flex flex-col justify-between rounded-lg border border-[#cfdff0] bg-white p-2 text-right shadow-2xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer overflow-hidden h-[96px]"
                      onClick={() => addProduct(p)}
                    >
                      <div className="flex items-start gap-1.5 w-full">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.name} className="h-8 w-8 rounded object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded bg-blue-50 text-blue-600 shrink-0 text-[12px] font-black">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[12px] font-black text-[#0f2e5a] group-hover:text-blue-700 leading-tight">
                            {p.name}
                          </div>
                          <div className="truncate text-[10px] font-bold text-slate-400">{p.category}</div>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between w-full pt-1 border-t border-slate-100">
                        <span className={`num text-[11px] font-bold ${p.stock <= p.minStock ? "text-red-600" : "text-slate-500"}`}>
                          رصيد: {fmtQty(p.stock)}
                        </span>
                        <span className="num shrink-0 text-[15px] font-black text-[#1d4ed8]">
                          {fmt(priceFor(p, type, state.priceLevel))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <table className="dgrid w-full text-center text-[12.5px] bg-white rounded-lg overflow-hidden border border-[#cfdff0]">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="text-right px-2 py-1">الصنف</th>
                      <th className="w-16 py-1">السعر</th>
                      <th className="w-14 py-1">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="clickable hover:bg-blue-50 border-b border-slate-100" onClick={() => addProduct(p)}>
                        <td className="truncate text-right font-black text-slate-800 px-2 py-1">{p.name}</td>
                        <td className="num font-black text-emerald-700">{fmt(priceFor(p, type, state.priceLevel))}</td>
                        <td className={`num ${p.stock <= p.minStock ? "text-red-600 font-black" : "text-slate-600"}`}>
                          {fmtQty(p.stock)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ===== الأزرار الستة: أزرار العمليات الرئيسية السريعة ===== */}
        <div className={`grid w-full shrink-0 grid-cols-6 gap-2 ${L.actions ? "" : "hidden"}`}>
          
          {/* فاتورة جديدة */}
          <button
            type="button"
            className="pos-action-btn flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#0067c0] text-white text-[15px] font-black shadow-sm hover:bg-[#005a9e] cursor-pointer"
            onClick={() => void newInvoice()}
          >
            <FilePlus2 className="h-5 w-5" strokeWidth={2.5} />
            <span>فاتورة جديدة</span>
          </button>

          {/* حفظ الفاتورة */}
          <button
            type="button"
            className="pos-action-btn flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#0f7b0f] text-white text-[15px] font-black shadow-sm hover:bg-[#0c660c] disabled:opacity-50 cursor-pointer"
            onClick={() => void save()}
            disabled={saving}
          >
            <Save className="h-5 w-5" strokeWidth={2.5} />
            <span>حفظ الفاتورة</span>
          </button>

          {/* عرض المبيعات */}
          <button
            type="button"
            className="pos-action-btn flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#0f6cbd] text-white text-[15px] font-black shadow-sm hover:bg-[#0d599b] cursor-pointer"
            onClick={() => void goTo(cfg.listHref)}
          >
            <BarChart3 className="h-5 w-5" strokeWidth={2.5} />
            <span>{cfg.listLabel}</span>
          </button>

          {/* إلغاء الفاتورة */}
          <button
            type="button"
            className="pos-action-btn flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#c42b1c] text-white text-[15px] font-black shadow-sm hover:bg-[#a52417] cursor-pointer"
            onClick={() => void cancelInvoice()}
          >
            <X className="h-5 w-5" strokeWidth={3} />
            <span>إلغاء الفاتورة</span>
          </button>

          {/* تعليق الفاتورة */}
          <button
            type="button"
            className="pos-action-btn flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#b45309] text-white text-[15px] font-black shadow-sm hover:bg-[#92400e] disabled:opacity-50 cursor-pointer"
            onClick={() => void holdDraft()}
            disabled={saving}
            title="حفظ الفاتورة معلقة بدون خصم من المخزون واستكمالها لاحقاً"
          >
            <FileClock className="h-5 w-5" strokeWidth={2.5} />
            <span>تعليق الفاتورة</span>
          </button>

          {/* الفواتير المعلقة */}
          <button
            type="button"
            className="pos-action-btn flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#5c2e91] text-white text-[15px] font-black shadow-sm hover:bg-[#4a2475] cursor-pointer"
            onClick={() => void openDrafts()}
            title="عرض الفواتير المعلقة واستكمالها"
          >
            <List className="h-5 w-5" strokeWidth={2.5} />
            <span>الفواتير المعلقة</span>
          </button>
        </div>
      </div>

      {/* النوافذ العائمة الذكية */}
      {showPartySearch && (
        <PartySearchDialog
          type={type}
          parties={partiesList}
          onClose={() => setShowPartySearch(false)}
          onPick={(p) => {
            setParty(p);
            setShowPartySearch(false);
          }}
        />
      )}

      {showAddParty && (
        <AddPartyDialog
          type={type}
          onClose={() => setShowAddParty(false)}
          onSaved={(p) => {
            setPartiesList((l) => [...l, p]);
            setParty(p);
            setShowAddParty(false);
            toast(`تم إضافة ${cfg.partyLabel} "${p.name}" برقم ${p.code}`);
          }}
        />
      )}

      {showFloatingProduct && (
        <FloatingAddProductModal
          categories={categories}
          onClose={() => setShowFloatingProduct(false)}
          onProductCreated={(p) => {
            setProducts((prev) => [p, ...prev]);
            addProduct(p);
          }}
        />
      )}

      {/* نافذة F3 العائمة للبحث عن صنف وإضافته للفاتورة مباشرة */}
      {showProductSearchModal && (
        <ProductSearchModal
          products={products}
          priceLevel={state.priceLevel}
          type={type}
          onClose={() => setShowProductSearchModal(false)}
          onSelectProduct={(p, q) => {
            addProduct(p, q);
          }}
        />
      )}

      {phoneScanOpen && (
        <PhoneScannerDialog
          onClose={() => setPhoneScanOpen(false)}
          onDetect={(code) => {
            const found = products.find((p) => p.code === code || String(p.id) === code);
            if (found) {
              addProduct(found);
              toast(`تم إضافة «${found.name}» من كاميرا الموبايل`);
            } else {
              toast(`باركود غير موجود في الأصناف: ${code}`, "error");
            }
          }}
        />
      )}

      {scanOpen && (
        <CameraScan
          title={`مسح باركود الفاتورة الأصلية — ${cfg.title}`}
          onDetect={(code) => void loadOriginalInvoice(code)}
          onClose={() => setScanOpen(false)}
        />
      )}

      {shareInvoice && <ShareInvoiceDialog invoice={shareInvoice} onClose={() => setShareInvoice(null)} />}

      {showDrafts && (
        <DraftsPanel type={type} onResume={resumeDraft} onClose={() => setShowDrafts(false)} />
      )}

      {showPriceInquiry && (
        <PriceInquiryDialog
          products={products}
          onClose={() => setShowPriceInquiry(false)}
        />
      )}

      {showPreviewModal && (
        <InvoicePreviewModal
          type={type}
          number={state.number}
          date={state.date}
          partyName={state.party.name}
          paymentType={state.paymentType}
          paymentMethod={state.paymentMethod}
          items={state.rows.map((r) => ({
            productId: r.productId,
            productName: r.productName,
            unit: r.unit,
            qty: r.qty,
            price: r.price,
            cost: 0,
            discount: r.discount,
            total: round2(r.qty * r.price - r.discount),
          }))}
          subtotal={totals.gross}
          discount={totals.discount}
          taxRate={state.taxRate}
          tax={totals.tax}
          total={totals.total}
          paid={paidNum}
          notes={state.notes}
          userName={activeUser || settings?.userName || "FATORA"}
          storeName={settings?.storeName || "برنامج FATORA"}
          phone={settings?.phone || "01222355769"}
          onClose={() => setShowPreviewModal(false)}
          onPrint={() => {
            setShowPreviewModal(false);
            void print();
          }}
        />
      )}

      {/* نافذة إضافة مجموعة جديدة السريعة من شريط الأصناف */}
      {showAddCategoryModal && (
        <QuickAddCategoryModal
          onClose={() => setShowAddCategoryModal(false)}
          onCategoryAdded={(catName) => {
            setCategories((prev) => Array.from(new Set([catName, ...prev])));
            setCategory(catName);
          }}
          onChanged={() => void loadProducts()}
        />
      )}
      {excessPromptOpen && (
        <ExcessPaymentModal
          netTotal={totals.total}
          paidAmount={paidNum}
          partyName={state.party.name}
          partyBalance={state.party.balance}
          currency={settings?.currency || "ج.م"}
          onRefundCash={() => {
            setExcessAction("refund");
            setExcessPromptOpen(false);
            void save("refund");
          }}
          onDeductAccount={() => {
            setExcessAction("deduct");
            setExcessPromptOpen(false);
            void save("deduct");
          }}
          onCancel={() => setExcessPromptOpen(false)}
        />
      )}
    </Window>
  );
}

function PartySearchDialog({
  type,
  parties,
  onPick,
  onClose,
}: {
  type: InvoiceType;
  parties: Party[];
  onPick: (p: Party | null) => void;
  onClose: () => void;
}) {
  const cfg = CONFIG[type];
  const [q, setQ] = useState("");
  const list = parties.filter((p) => !q || p.name.includes(q) || String(p.code).includes(q) || p.phone.includes(q));
  return (
    <Dialog
      title={`بحث عن ${cfg.partyLabel}`}
      onClose={onClose}
      width={700}
      footer={
        <button type="button" className="btn h-9 px-5 font-bold" onClick={onClose}>
          إغلاق
        </button>
      }
    >
      <input
        autoFocus
        className="win-input mb-3 w-full text-[15px]"
        placeholder="ابحث بالاسم أو الرقم أو الهاتف..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && list.length) onPick(list[0]);
        }}
      />
      <div className="max-h-[48vh] overflow-auto rounded-lg border border-[#b4c4dc] bg-white">
        <table className="dgrid text-center">
          <thead>
            <tr>
              <th className="w-[80px]">الرقم</th>
              <th className="text-right">الاسم</th>
              <th>الهاتف</th>
              <th>الرصيد</th>
            </tr>
          </thead>
          <tbody>
            <tr className="clickable" onClick={() => onPick(null)}>
              <td>-</td>
              <td className="text-right font-black text-blue-700">{cfg.cashName}</td>
              <td>-</td>
              <td>-</td>
            </tr>
            {list.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => onPick(p)}>
                <td className="num font-black">{p.code}</td>
                <td className="text-right font-extrabold">{p.name}</td>
                <td className="num" dir="ltr">{p.phone}</td>
                <td className={`num font-black ${p.balance > 0 ? "text-red-600" : ""}`}>{fmt(p.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}

function AddPartyDialog({ type, onSaved, onClose }: { type: InvoiceType; onSaved: (p: Party) => void; onClose: () => void }) {
  const cfg = CONFIG[type];
  const { toast } = useDesktop();
  const [f, setF] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.name.trim()) {
      toast("يجب إدخال الاسم", "error");
      return;
    }
    setBusy(true);
    try {
      const p = await api<Party>("/api/parties", { method: "POST", json: { ...f, type: cfg.partyType } });
      onSaved(p);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      title={`إضافة ${cfg.partyLabel} جديد`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <button type="button" className="btn btn-green h-9 px-5 font-bold" onClick={() => void submit()} disabled={busy}>
            <Save className="h-4 w-4" />
            حفظ
          </button>
          <button type="button" className="btn h-9 px-5 font-bold" onClick={onClose}>
            إلغاء
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="الاسم *">
          <input
            autoFocus
            className="win-input w-full font-bold"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </Field>
        <Field label="الهاتف">
          <input className="win-input num w-full" dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label="العنوان">
          <input className="win-input w-full" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  );
}
