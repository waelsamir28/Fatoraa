"use client";

import { useRouter } from "next/navigation";
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  CreditCard,
  Eye,
  FileCheck2,
  FilePlus2,
  Grid,
  Info,
  Landmark,
  LayoutGrid,
  List,
  PencilLine,
  Plus,
  Printer,
  Save,
  Search,
  Tag,
  Trash2,
  Undo2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { Dialog, Field, Window } from "@/components/win/Window";
import { useDesktop } from "@/components/win/DesktopProvider";
import { AddUserIcon, PdfIcon, UserAvatar } from "@/components/icons/AppIcons";
import { api, errMsg } from "@/lib/client";
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

export function InvoiceEditor({ type, initialId }: { type: InvoiceType; initialId: number | null }) {
  const cfg = CONFIG[type];
  const router = useRouter();
  const { msg, confirm, toast, activeUser } = useDesktop();
  const { playAddItem, playSuccess, playError } = usePosSound();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [state, setState] = useState<EditorState>(() => blankState(type, 0, 0)); // الضريبة صفر افتراضياً
  const [saved, setSaved] = useState<EditorState>(() => blankState(type, 0, 0));
  const [selected, setSelected] = useState(-1);
  const [numberInput, setNumberInput] = useState("");
  const [partyCodeInput, setPartyCodeInput] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [partiesList, setPartiesList] = useState<Party[]>([]);
  const [barcodeMode, setBarcodeMode] = useState(true);
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
  const [clock, setClock] = useState("");

  const productRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});

  const dirty = useMemo(() => serialize(state) !== serialize(saved), [state, saved]);
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
          try {
            const findExact = await api<{ invoice: Invoice | null }>(`/api/invoices/find?type=${type}&dir=exact&number=1036`);
            if (findExact?.invoice && alive) {
              loadInvoice(findExact.invoice, plist);
              setCategory("كروت أفراح");
              return;
            }
          } catch {
            // fallback
          }
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

  const save = async (): Promise<Invoice | null> => {
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
      const inv = state.invoiceId
        ? await api<Invoice>(`/api/invoices/${state.invoiceId}`, { method: "PUT", json: payload })
        : await api<Invoice>("/api/invoices", { method: "POST", json: payload });

      playSuccess();
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
          <span className="ms-auto flex items-center gap-2">
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
      <div className="flex h-full w-full flex-col gap-1.5 p-2 bg-[#edf2f8]">
        {/* ===== إطار شريط الأدوات العلوي ===== */}
        <div className="shrink-0 rounded-lg border-2 border-[#a9c3e2] bg-gradient-to-b from-white to-[#eaf2fc] p-1.5 shadow-sm">
          <div className="flex h-[40px] items-center gap-2">
            {/* مجموعة اليمين: تراجع ← رقم الفاتورة ← حذف */}
            <div className="flex items-center gap-1.5 rounded-md border border-[#c3d6ec] bg-white/70 p-1">
              <button
                type="button"
                className="btn h-[32px] min-w-[86px] px-2.5 text-[14px] font-black"
                onClick={undo}
                title="تراجع عن التعديل"
              >
                <Undo2 className="h-4 w-4 text-blue-600" strokeWidth={3} />
                <span>تراجع</span>
              </button>

              <div className="flex items-center gap-1 rounded border border-[#9fb4d2] bg-white px-1">
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

              <button
                type="button"
                className="btn btn-red h-[32px] min-w-[80px] px-2.5 text-[14px] font-black"
                onClick={() => void remove()}
                title="حذف الفاتورة"
              >
                <Trash2 className="h-4 w-4" />
                <span>حذف</span>
              </button>
            </div>

            {/* الشريط الأزرق الفاتح الذي يفصل بين المجموعتين */}
            <span className="h-[26px] flex-1 rounded-full bg-gradient-to-l from-[#cfe4ff] via-[#eaf4ff] to-[#cfe4ff]" />

            {/* مجموعة اليسار: طباعة الفاتورة + PDF */}
            <div className="flex items-center gap-1.5 rounded-md border border-[#c3d6ec] bg-white/70 p-1">
              <button
                type="button"
                className="btn btn-blue h-[32px] px-3 text-[13.5px] font-black shadow-sm"
                onClick={() => void print()}
                title="طباعة الفاتورة A5 فوراً (F10)"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة الفاتورة</span>
              </button>
              <button
                type="button"
                className="btn h-[32px] w-[42px] p-0"
                title="تصدير / حفظ كـ PDF"
                onClick={() => void pdf()}
              >
                <PdfIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* ===== إطار بيانات العميل + إطار أزرار الفاتورة + كارت الصنف ===== */}
        <div className="flex h-[172px] shrink-0 gap-2">
          {/* إطار بيانات العميل */}
          <div className="panel flex w-[31%] min-w-[318px] max-w-[364px] shrink-0 flex-col overflow-hidden border-2 border-[#a9c3e2] shadow-sm">
            <div className="panel-head flex h-[22px] shrink-0 items-center justify-between px-2 text-[11.5px]">
              <span className="font-black text-[#0f2e5a]">بيانات {cfg.partyLabel}</span>
              <span className="num rounded bg-blue-100 px-1.5 text-[10.5px] font-black text-blue-800">
                {cfg.partyType === "customer" ? "حساب عميل" : "حساب مورد"}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-1 p-1.5">
              <FRow label={`رقم ${cfg.partyLabel}`}>
                <input
                  className="win-input num h-full flex-1 text-center text-[16px] font-black text-[#d0190f]"
                  dir="ltr"
                  placeholder="نقدي"
                  value={partyCodeInput || (state.party.code ? String(state.party.code) : "")}
                  onChange={(e) => setPartyCodeInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") lookupPartyCode();
                  }}
                  title="اكتب رقم الحساب واضغط Enter"
                />
                <button type="button" className="btn btn-blue h-full w-[32px] shrink-0 p-0" title={`بحث عن ${cfg.partyLabel} (F4)`} onClick={() => setShowPartySearch(true)}>
                  <Search className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <button type="button" className="btn h-full w-[32px] shrink-0 p-0" title={`إضافة ${cfg.partyLabel} جديد`} onClick={() => setShowAddParty(true)}>
                  <AddUserIcon className="h-5 w-5" />
                </button>
              </FRow>

              <FRow label={`اسم ${cfg.partyLabel}`}>
                <div className="win-input flex h-full flex-1 items-center justify-center truncate text-[15.5px] font-black text-amber-950 bg-[#fffbeb] border-amber-300 shadow-xs">
                  {state.party.name}
                </div>
              </FRow>

              <FRow label="التاريخ والوقت">
                <input
                  type="date"
                  className="win-input num h-full flex-1 text-center text-[14px] font-black"
                  value={state.date}
                  onChange={(e) => patch({ date: e.target.value || todayInput() })}
                />
                <div
                  className="win-input num flex h-full w-[92px] shrink-0 items-center justify-center gap-1 text-[13.5px] font-black text-[#0f2e5a]"
                  suppressHydrationWarning
                  title="الوقت الحالي"
                >
                  <Clock3 className="h-3.5 w-3.5 text-blue-700" />
                  {clock || "--:--"}
                </div>
              </FRow>
            </div>
          </div>

          {/* إطار أزرار الفاتورة والأسعار */}
          <div className="panel flex min-w-0 flex-1 flex-col justify-between gap-1.5 overflow-hidden border-2 border-[#a9c3e2] p-1.5 shadow-sm">
            {/* الصف الأول: باركود وتجميع (يمين) + شريط رصيد العميل العريض (يسار) */}
            <div className="flex w-full items-stretch gap-1.5">
              <div className="flex shrink-0 items-center gap-1">
                {(
                  [
                    ["باركود", barcodeMode, setBarcodeMode, "إضافة الصنف المباشرة عند مسح الباركود"],
                    ["تجميع", mergeSame, setMergeSame, "تجميع الصنف المكرر في نفس السطر"],
                  ] as Array<[string, boolean, (v: boolean) => void, string]>
                ).map(([label, on, setter, title]) => (
                  <button
                    key={label}
                    type="button"
                    title={title}
                    onClick={() => setter(!on)}
                    className={`panel flex h-[46px] shrink-0 items-center gap-1.5 px-2 shadow-sm ${
                      on ? "!border-[#2563eb] !bg-[#eaf2fe]" : ""
                    }`}
                  >
                    <span className="whitespace-nowrap text-[12px] font-black text-[#0c2340]">{label}</span>
                    <span
                      className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full border transition ${
                        on ? "border-[#15459b] bg-[#1f6ede]" : "border-slate-400 bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-[1px] h-[16px] w-[16px] rounded-full bg-white shadow transition-all ${
                          on ? "left-[18px]" : "left-[1px]"
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>

              {/* شريط رصيد العميل العريض — بنفس ارتفاع أزرار باركود وتجميع */}
              <div className="due-box flex min-w-0 flex-1 items-center justify-between gap-2 px-3">
                <span className="whitespace-nowrap text-[14px] font-black leading-none text-white">رصيد العميل</span>
                <span className="num text-[27px] font-black leading-none text-[#ffe600] drop-shadow-[0_2px_0_#6b5200]">
                  {fmt(state.party.balance)}
                </span>
              </div>
            </div>

            {/* الصف الثاني: نقدي | أجل | قطاعي/جملة + كشف حساب */}
            <div className="flex w-full items-stretch gap-1.5">
              <div className="grid w-[262px] shrink-0 grid-cols-3 gap-1.5">
                <button
                  type="button"
                  className={`btn h-[42px] w-full justify-center px-1 text-[14px] font-black ${
                    state.paymentType === "cash" ? "btn-blue" : ""
                  }`}
                  onClick={() => patch({ paymentType: "cash" })}
                >
                  نقدي
                </button>
                <button
                  type="button"
                  className={`btn h-[42px] w-full justify-center px-1 text-[14px] font-black ${
                    state.paymentType === "credit" ? "btn-blue" : ""
                  }`}
                  onClick={setCredit}
                >
                  أجل
                </button>
                {type === "sale" ? (
                  <div className="flex h-[42px] w-full flex-col gap-[3px]">
                    <button
                      type="button"
                      onClick={() => changePriceLevel("retail")}
                      title="البيع بسعر القطاعي"
                      className={`flex flex-1 items-center justify-center rounded-[5px] border text-[12px] font-black leading-none transition ${
                        state.priceLevel === "retail"
                          ? "border-[#0b45a6] bg-gradient-to-b from-[#6bb0ff] to-[#1f6ede] text-white shadow-sm"
                          : "border-[#9fb4d2] bg-gradient-to-b from-white to-[#e8eef7] text-[#0f2e5a] hover:border-blue-500"
                      }`}
                    >
                      قطاعي
                    </button>
                    <button
                      type="button"
                      onClick={() => changePriceLevel("wholesale")}
                      title="البيع بسعر الجملة"
                      className={`flex flex-1 items-center justify-center rounded-[5px] border text-[12px] font-black leading-none transition ${
                        state.priceLevel === "wholesale"
                          ? "border-[#0b45a6] bg-gradient-to-b from-[#6bb0ff] to-[#1f6ede] text-white shadow-sm"
                          : "border-[#9fb4d2] bg-gradient-to-b from-white to-[#e8eef7] text-[#0f2e5a] hover:border-blue-500"
                      }`}
                    >
                      جملة
                    </button>
                  </div>
                ) : (
                  <div className="win-input flex h-[42px] w-full items-center justify-center text-[12px] font-black text-slate-500">
                    شراء
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-blue h-[42px] min-w-0 flex-1 justify-center gap-2 px-3 text-[14.5px] font-black shadow-sm"
                onClick={() => void goTo(cfg.partiesHref)}
                title="كشف حساب العميل"
              >
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/25">
                  <Search className="h-3.5 w-3.5 stroke-[3] text-amber-300" />
                </div>
                <span>كشف حساب</span>
              </button>
            </div>

            {/* الصف الثالث: الشريط الوردي ممتد حتى زر إضافة صنف */}
            <div className="flex w-full items-stretch gap-1.5">
              <div className="pink-bar grid h-[40px] min-w-0 flex-1 grid-cols-5 items-center text-center shadow-inner px-1">
                {(
                  [
                    ["الرصيد", selProduct ? fmtQty(selProduct.stock) : "0.0"],
                    ["سعر الشراء", selProduct ? fmt(selProduct.costPrice) : "0.0"],
                    ["سعر الجملة", selProduct ? fmt(selProduct.wholesalePrice) : "0.0"],
                    ["سعر البيع", selProduct ? fmt(selProduct.salePrice) : "0.0"],
                    ["ربح الوحدة", selProduct ? fmt(selProduct.salePrice - selProduct.costPrice) : "0.0"],
                  ] as const
                ).map(([l, v]) => (
                  <div key={l} className="leading-tight px-0.5">
                    <div className="text-[10px] font-bold text-[#8a2a2a]">{l}</div>
                    <div className="num text-[12.5px] font-black text-[#c0170e] truncate">{v}</div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-green h-[40px] shrink-0 gap-1.5 px-3 text-[13.5px] font-black shadow-sm"
                onClick={() => setShowFloatingProduct(true)}
                title="إضافة صنف جديد سريعاً للفاتورة والمخزن (F8)"
              >
                <div className="grid h-6 w-6 place-items-center rounded bg-black/20">
                  <Plus className="h-4 w-4 stroke-[3] text-white" />
                </div>
                <span>إضافة صنف</span>
              </button>
            </div>
          </div>

          {/* كارت صورة الصنف على اليسار كما في الصورة */}
          <div className="panel flex w-[11%] min-w-[130px] max-w-[158px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden bg-gradient-to-b from-[#ffffff] to-[#e4ecf7] p-2 text-center shadow-sm">
            {selProduct?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selProduct.imageUrl} alt={selProduct.name} className="max-h-[82px] max-w-full object-contain" />
            ) : (
              <Camera className="h-10 w-10 text-[#8094ae]" strokeWidth={1.8} />
            )}
            <div className="line-clamp-2 text-[12.5px] font-extrabold text-[#0b2350] leading-tight text-center">
              {selProduct ? selProduct.name : "صورة الصنف"}
            </div>
            {selProduct && <div className="num text-[11px] font-bold text-slate-500">{selProduct.code}</div>}
          </div>
        </div>

        {/* ===== سطر الإدخال السريع للأصناف مع زر إضافة مجموعة جديدة ➕ المضاف بجانب المجموعات ===== */}
        <div className="flex h-[50px] shrink-0 items-end gap-1.5">
          <div className="flex h-[38px] items-center gap-1.5">
            {/* القائمة المنسدلة الاحترافية للمجموعات */}
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 text-[13px]">🗂️</span>
              <select
                className="win-input h-full w-[186px] appearance-none rounded-md border-2 border-[#8fb3e0] bg-gradient-to-b from-white to-[#e8f1fc] pr-7 pl-6 text-[13px] font-black text-[#0f2e5a] shadow-sm"
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
              <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-blue-700">▼</span>
            </div>

            {/* الأيقونة الخضراء لإضافة مجموعة جديدة بجانب المجموعات مباشرة */}
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-[#22c55e] to-[#15803d] text-white shadow-sm hover:brightness-110 shrink-0"
              title="إضافة مجموعة جديدة"
              onClick={() => setShowAddCategoryModal(true)}
            >
              <Plus className="h-5 w-5 stroke-[3]" />
            </button>

            <div className="panel flex h-full items-center gap-2 px-2 text-[12.5px] font-extrabold shadow-sm">
              <label className="flex cursor-pointer items-center gap-1">
                <input type="radio" checked={searchMode === "name"} onChange={() => setSearchMode("name")} />
                بالاسم
              </label>
              <label className="flex cursor-pointer items-center gap-1">
                <input type="radio" checked={searchMode === "code"} onChange={() => setSearchMode("code")} />
                بالكود
              </label>
            </div>
            <div className="pill-blue h-[34px] px-3">
              <span className="text-[12px]">أصناف</span>
              <span className="num text-[17px]">{state.rows.length}</span>
            </div>
            <div className="pill-blue h-[34px] px-3">
              <span className="text-[12px]">كمية</span>
              <span className="num text-[17px]">{fmtQty(totals.qty)}</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-end gap-1">
            <div className="etab relative min-w-[170px] flex-1">
              <span>الصنف</span>
              <input
                ref={productRef}
                className="win-input h-[30px] !text-right font-extrabold"
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

            <div className="etab w-[86px]">
              <span>سعر الوحدة</span>
              <input
                className="win-input num h-[30px] font-black"
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

            <div className="etab w-[78px]">
              <span>الكمية</span>
              <input
                ref={qtyRef}
                className="win-input num h-[30px] font-black"
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

            <div className="etab red w-[75px]">
              <span>الخصم</span>
              <input
                className="win-input num h-[30px] font-black text-red-600"
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

            <div className="etab w-[88px]">
              <span>القيمة</span>
              <input readOnly tabIndex={-1} className="win-input num h-[30px] font-black text-blue-800" value={fmt(entryValue)} />
            </div>

            <button type="button" className="btn btn-blue h-[30px] w-[36px] shrink-0 p-0" title="إضافة للفاتورة (Enter)" onClick={commitEntry}>
              <Plus className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* ===== هيكل جدول الفاتورة (مطابق تماماً لهيكل جدول الأصناف) + قائمة الأصناف الكروت ===== */}
        <div className="flex min-h-0 flex-1 gap-2">
          {/* جدول الفاتورة - هيكل كحلي داكن عالي التباين وواضح تماماً مثل جدول الأصناف */}
          <div className="panel min-w-0 flex-1 overflow-auto p-0 shadow-md border-2 border-[#15459b] bg-[#ffffff]">
            <table className="dgrid-invoice text-center">
              <thead>
                <tr>
                  <th className="w-[40px]">م</th>
                  <th className="text-right">اسم الصنف والبيان</th>
                  <th className="w-[80px]">العبوة</th>
                  <th className="w-[85px]">الكمية</th>
                  <th className="w-[100px]">سعر الوحدة</th>
                  <th className="w-[85px]">الخصم</th>
                  <th className="w-[110px]">الإجمالي</th>
                  <th className="w-[48px]">حذف</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r, i) => {
                  const sel = i === selected;
                  return (
                    <tr key={r.key} className={`clickable ${sel ? "sel !bg-blue-600 text-white" : "border-b border-[#c2d3e8]"}`} onClick={() => setSelected(i)}>
                      <td className={`num font-black ${sel ? "text-white" : "text-blue-900"}`}>{i + 1}</td>
                      <td className="max-w-[260px] truncate text-right font-black text-slate-900">{r.productName}</td>
                      <td>{r.unit}</td>
                      <td className="p-0.5">
                        <NumCell value={r.qty} onCommit={(v) => (v > 0 ? updateRow(i, { qty: round3(v) }) : removeRow(i))} />
                      </td>
                      <td className="p-0.5">
                        <NumCell value={r.price} digits={2} onCommit={(v) => updateRow(i, { price: round2(v) })} />
                      </td>
                      <td className="p-0.5">
                        <NumCell value={r.discount} digits={2} onCommit={(v) => updateRow(i, { discount: round2(v) })} />
                      </td>
                      <td className="num font-black">{fmt(r.qty * r.price - r.discount)}</td>
                      <td className="p-0">
                        <button
                          type="button"
                          className="mx-auto grid place-items-center"
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
                  <tr key={`e${i}`} className="empty border-b border-slate-200">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* قائمة الأصناف الجانبية (كروت مربعة أو جدول) */}
          <div className="w-[33%] min-w-[290px] max-w-[480px] shrink-0 flex flex-col overflow-hidden rounded-lg border border-[#8ba3c4] bg-[#f0f4f9] shadow-sm">
            <div className="navy-head flex items-center justify-between px-3 py-1.5 text-[13px]">
              <span>الأصناف ({filtered.length})</span>
              <div className="flex gap-1" dir="rtl">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[11.5px] font-black transition ${
                    viewMode === "table"
                      ? "bg-[#0f2e5a] text-white border border-white/50 shadow-xs"
                      : "bg-[#2563eb]/60 text-white hover:bg-[#2563eb]/80"
                  }`}
                  onClick={() => setViewMode("table")}
                >
                  جدول
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded text-[11.5px] font-black transition ${
                    viewMode === "cards"
                      ? "bg-[#0f2e5a] text-white border border-white/50 shadow-xs"
                      : "bg-[#2563eb]/60 text-white hover:bg-[#2563eb]/80"
                  }`}
                  onClick={() => setViewMode("cards")}
                >
                  كروت
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-1.5">
              {viewMode === "cards" ? (
                <div className="grid grid-cols-2 gap-1.5 content-start">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="group flex flex-col justify-between h-[66px] rounded-md border border-[#c5d7ed] bg-white p-1.5 text-right shadow-2xs hover:border-blue-500 hover:shadow-xs transition"
                      onClick={() => addProduct(p)}
                    >
                      <div>
                        <div className="w-full truncate text-[12.5px] font-black text-[#0f2e5a] group-hover:text-blue-700 leading-tight">
                          {p.name}
                        </div>
                        <div className="text-[10px] font-bold text-sky-600 truncate">{p.category}</div>
                      </div>
                      <div className="flex items-baseline justify-between w-full pt-0.5 border-t border-slate-100">
                        <span className={`num text-[11px] font-bold ${p.stock <= p.minStock ? "text-red-600" : "text-slate-500"}`}>
                          رصيد: {fmtQty(p.stock)}
                        </span>
                        <span className="num text-[15px] font-black text-[#1d4ed8]">
                          {fmt(priceFor(p, type, state.priceLevel))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <table className="dgrid text-center text-[13px] bg-white">
                  <thead>
                    <tr>
                      <th className="text-right">الصنف</th>
                      <th className="w-16">السعر</th>
                      <th className="w-14">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="clickable" onClick={() => addProduct(p)}>
                        <td className="max-w-[190px] truncate text-right font-black text-slate-800">{p.name}</td>
                        <td className="num font-bold text-green-700">{fmt(priceFor(p, type, state.priceLevel))}</td>
                        <td className={`num ${p.stock <= p.minStock ? "text-red-600 font-black" : ""}`}>{fmtQty(p.stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ===== الجزء السفلي: أزرار العمليات + الملاحظات والحسابات + طرق الدفع + الإجماليات ===== */}
        <div className="flex h-[180px] shrink-0 gap-2">
          {/* أزرار العمليات */}
          <div className="grid w-[22%] min-w-[240px] max-w-[320px] shrink-0 grid-cols-2 grid-rows-2 gap-1.5">
            <button type="button" className="btn btn-blue btn-big" onClick={() => void newInvoice()}>
              <FilePlus2 />
              <span>فاتورة جديدة</span>
            </button>

            {/* تم وضع زر حفظ الفاتورة هنا مكان زر طباعة الفاتورة */}
            <button type="button" className="btn btn-green btn-big" onClick={() => void save()} disabled={saving}>
              <Save />
              <span>حفظ الفاتورة</span>
            </button>

            <button type="button" className="btn btn-blue btn-big" onClick={() => void goTo(cfg.listHref)}>
              <BarChart3 />
              <span>{cfg.listLabel}</span>
            </button>

            <button type="button" className="btn btn-red btn-big" onClick={() => void cancelInvoice()}>
              <X strokeWidth={4} />
              <span>إلغاء الفاتورة</span>
            </button>
          </div>

          {/* الملاحظات مع نصوص الحسابات بدون (ج.م) والمتبقي (آجل) بدون على العميل */}
          <div className="panel flex min-w-[220px] flex-1 flex-col overflow-hidden shadow-sm">
            <div className="panel-head flex h-[32px] shrink-0 items-center justify-center gap-1.5 text-[14px]">
              <PencilLine className="h-3.5 w-3.5 text-blue-600" />
              ملاحظات الفاتورة والبيان
            </div>
            <textarea
              className="win-input m-1.5 mb-1 min-h-0 flex-1 text-[13px]"
              placeholder="اكتب أية ملاحظات للعميل هنا ..."
              value={state.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
            {/* شريط المبالغ بحجم مكبر وبدون (ج.م) والأخير: المتبقي (آجل) */}
            <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-[#c8d8ea] p-2 bg-white/80">
              <label className="text-[12px] font-black text-[#1e3a6a]">
                خصم إضافي
                <input
                  className="win-input num mt-0.5 h-[34px] w-full text-center text-[17px] font-black text-red-600"
                  inputMode="decimal"
                  placeholder="0"
                  value={state.extraDiscount}
                  onChange={(e) => patch({ extraDiscount: e.target.value })}
                />
              </label>

              <label className="text-[12px] font-black text-[#1e3a6a]">
                {state.paymentType === "credit" ? "المدفوع مقدماً" : "المبلغ المستلم"}
                <input
                  className="win-input num mt-0.5 h-[34px] w-full text-center text-[20px] font-black text-green-700 bg-green-50/60 border-green-400"
                  inputMode="decimal"
                  placeholder="0"
                  value={state.paid}
                  onChange={(e) => patch({ paid: e.target.value })}
                />
              </label>

              <div className="text-[12px] font-black text-[#1e3a6a]">
                {state.paymentType === "credit" ? "المتبقي ( آجل )" : "الباقي للعميل"}
                <div
                  className={`win-input num mt-0.5 flex h-[34px] items-center justify-center text-[20px] font-black ${
                    change < 0 ? "text-red-600 bg-red-50/60 border-red-300" : "text-blue-800 bg-blue-50/60 border-blue-300"
                  }`}
                >
                  {fmt(change)}
                </div>
              </div>
            </div>
          </div>

          {/* طرق الدفع (نقدي وأقساط ومحفظة إلكترونية فقط) */}
          <div className="panel flex w-[28%] min-w-[290px] max-w-[390px] shrink-0 flex-col overflow-hidden shadow-sm">
            <div className="navy-head flex h-[32px] shrink-0 items-center justify-center text-[16px]">طريقة الدفع</div>
            <div className="flex flex-1 flex-col justify-around gap-1.5 p-2 bg-white/50">
              {ALLOWED_PAYMENT_METHODS.map((m) => {
                const active = state.paymentMethod === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    className={`pay-btn flex-1 h-[38px] ${active ? "active !border-green-600 !bg-amber-50" : ""}`}
                    onClick={() => selectMethod(m.key)}
                  >
                    <span className="text-[15px] font-black">{m.label}</span>
                    <span className="flex items-center gap-2">
                      {METHOD_ICONS[m.key]}
                      {active && <CheckCircle2 className="h-4.5 w-4.5 fill-green-600 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* الإجماليات والمطلوب دفعه */}
          <div className="flex w-[23%] min-w-[260px] max-w-[380px] shrink-0 flex-col gap-1.5">
            <div className="panel flex flex-1 flex-col justify-around overflow-hidden shadow-sm">
              <TotRow label="إجمالي الأصناف" value={fmt(totals.gross)} color="text-blue-700" />
              <TotRow label="الخصم الكلي" value={fmt(totals.discount)} color="text-red-600" last />
            </div>
            <div className="due-box flex h-[62px] shrink-0 items-center justify-between gap-2 px-3.5">
              <span className="text-[19px] font-black text-white">المطلوب دفعه</span>
              <span className="due-value num text-[36px] leading-none">{fmt(totals.total)}</span>
            </div>
          </div>
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
