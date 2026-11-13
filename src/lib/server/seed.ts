import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cashMoves,
  expenses,
  installments,
  invoiceItems,
  invoices,
  parties,
  payments,
  products,
  purchaseOrderItems,
  purchaseOrders,
  settings,
  shifts,
} from "@/db/schema";
import { SCHEMA_SQL } from "@/db/bootstrap";
import { execRaw, isPglite } from "@/db";

export const DEFAULT_SETTINGS = {
  storeName: "برنامج FATORA",
  userName: "FATORA",
  phone: "01222355769",
  address: "جمهورية مصر العربية",
  taxRate: 14,
  currency: "ج.م",
  branchName: "الفرع الرئيسي",
  salesRep: "مكتب FATORA",
  invoiceFooter: "شكراً لتعاملكم معنا .. برنامج FATORA 01222355769",
  theme: "classic-blue",
  buttonStyle: "glossy-3d",
  fontFamily: "cairo",
  tableHeaderColor: "navy-dark",
  customBgUrl: "",
  customLogoUrl: "",
  phone2: "",
  showBigTitle: true,
  customBigTitle: "FATORA",
  customTagline: "إدارة احترافية .. لمحل تجاري أكثر نجاحاً",
  invoiceTemplate: "template-modern-a5",
  fontScale: 100,
};

type P = [
  code: string,
  name: string,
  unit: string,
  category: string,
  cost: number,
  sale: number,
  wholesale: number,
  stock: number,
  min: number,
  imageUrl?: string,
];

/** أصناف متخصصة: 50 صنف أدوات مدرسية ومكتبية + 20 صنف دعاية وإعلان + كروت أفراح وطباعة */
const PRODUCTS: P[] = [
  // ================= 50 صنف أدوات مدرسية ومكتبية =================
  ["6221001001", "كشكول سلك 100 ورقة مسطر فاخر 60 جم", "كشكول", "أدوات مدرسية", 18, 25, 22, 120, 20],
  ["6221001002", "كشكول سلك 80 ورقة مسطر غلاف كرتون مقوى", "كشكول", "أدوات مدرسية", 15, 22, 19, 100, 20],
  ["6221001003", "كشكول سلك 60 ورقة مربعات إنجليزي لغات", "كشكول", "أدوات مدرسية", 12, 18, 15, 90, 15],
  ["6221001004", "كشكول 60 ورقة مسطر عادي دبوس مدرسي", "كشكول", "أدوات مدرسية", 8, 12, 10, 180, 30],
  ["6221001005", "كشكول 40 ورقة 9 أسطر عربي أولي ابتدائي", "كشكول", "أدوات مدرسية", 6.5, 10, 8.5, 150, 25],
  ["6221001006", "كشكول 40 ورقة إنجليزي أسطر مزدوجة", "كشكول", "أدوات مدرسية", 6.5, 10, 8.5, 140, 20],
  ["6221001007", "كشكول رسم كانسون كبير سلك A4 فاخر", "كشكول", "أدوات مدرسية", 25, 38, 32, 60, 10],
  ["6221001008", "كشكول رسم مدرسي صغير 20 ورقة دبوس", "كشكول", "أدوات مدرسية", 10, 16, 13, 80, 15],
  ["6221001009", "كشكول تحضير دروس للمعلمين 100 ورقة A4", "كشكول", "أدوات مدرسية", 32, 45, 39, 40, 8],
  ["6221001010", "كشكول موسيقى مدرسي أسطر نوتة", "كشكول", "أدوات مدرسية", 9, 15, 12, 50, 10],
  ["6221001011", "باكت أقلام جاف بريما أزرق (12 قلم)", "باكت", "أدوات مدرسية", 45, 60, 52, 70, 15],
  ["6221001012", "باكت أقلام جاف بريما أسود (12 قلم)", "باكت", "أدوات مدرسية", 45, 60, 52, 60, 12],
  ["6221001013", "باكت أقلام جاف بريما أحمر (12 قلم)", "باكت", "أدوات مدرسية", 45, 60, 52, 50, 10],
  ["6221001014", "باكت أقلام جاف بريما أخضر (12 قلم)", "باكت", "أدوات مدرسية", 45, 60, 52, 40, 8],
  ["6221001015", "قلم جاف يوني بول جل ياباني أزرق 0.7", "قلم", "أدوات مدرسية", 20, 28, 24, 100, 15],
  ["6221001016", "قلم جاف يوني بول جل ياباني أسود 0.7", "قلم", "أدوات مدرسية", 20, 28, 24, 80, 15],
  ["6221001017", "قلم سنون روترنج تيكو معدني 0.5 مم", "قلم", "أدوات مدرسية", 38, 55, 47, 45, 8],
  ["6221001018", "قلم سنون روترنج تيكو معدني 0.7 مم", "قلم", "أدوات مدرسية", 38, 55, 47, 45, 8],
  ["6221001019", "علبة سنون رصاص روترنج 0.5 (12 سن)", "علبة", "أدوات مدرسية", 10, 16, 13, 120, 20],
  ["6221001020", "علبة سنون رصاص روترنج 0.7 (12 سن)", "علبة", "أدوات مدرسية", 10, 16, 13, 120, 20],
  ["6221001021", "علبة أقلام رصاص ستيدلر ألماني HB (12 قلم)", "علبة", "أدوات مدرسية", 65, 90, 78, 50, 10],
  ["6221001022", "قلم رصاص ستيدلر ألماني فوسفوري فردي", "قلم", "أدوات مدرسية", 6, 10, 8.5, 240, 40],
  ["6221001023", "قلم رصاص بأستيكة كرتوني ديزني للأطفال", "قلم", "أدوات مدرسية", 3.5, 6, 5, 200, 30],
  ["6221001024", "علبة ألوان خشب فابر كاستل 12 لون كلاسيك", "علبة", "أدوات مدرسية", 38, 52, 45, 60, 12],
  ["6221001025", "علبة ألوان خشب فابر كاستل 24 لون مائية", "علبة", "أدوات مدرسية", 75, 105, 90, 40, 8],
  ["6221001026", "علبة ألوان فلوماستر بريما 12 لون عريضة", "علبة", "أدوات مدرسية", 22, 32, 27, 70, 15],
  ["6221001027", "علبة ألوان شمع مابيد للأطفال 12 لون", "علبة", "أدوات مدرسية", 18, 28, 23, 65, 12],
  ["6221001028", "علبة ألوان جواش مائية 6 ألوان مع فرشاة", "علبة", "أدوات مدرسية", 28, 42, 35, 40, 8],
  ["6221001029", "بالتة ألوان مائية دائرية مسطحة للمبتدئين", "قطعة", "أدوات مدرسية", 8, 14, 11, 55, 10],
  ["6221001030", "طقم فرش رسم ألوان زيت ومائي (6 فرش)", "طقم", "أدوات مدرسية", 22, 34, 28, 45, 10],
  ["6221001031", "طقم هايلايتر فوسفوري 4 ألوان زاهية", "طقم", "أدوات مدرسية", 28, 40, 34, 60, 12],
  ["6221001032", "قلم كوريكتور مزيل سائل فاست ميت", "قلم", "أدوات مدرسية", 9, 15, 12, 100, 20],
  ["6221001033", "شريط كوريكتور مزيل جاف رول 5 مم", "قطعة", "أدوات مدرسية", 12, 18, 15, 80, 15],
  ["6221001034", "براية معدنية ألمانية بمخزن شفاف", "قطعة", "أدوات مدرسية", 8, 15, 12, 90, 15],
  ["6221001035", "براية مكتبية مانوال بذراع تدوير ومثبت", "قطعة", "أدوات مدرسية", 55, 80, 68, 25, 5],
  ["6221001036", "أستيكة روترنج كبيرة بيضاء بدون غبار", "قطعة", "أدوات مدرسية", 5, 9, 7.5, 160, 25],
  ["6221001037", "أستيكة فحم عجين للرسم الهندسي", "قطعة", "أدوات مدرسية", 8, 14, 11, 45, 10],
  ["6221001038", "مسطرة هندسية 30 سم فينيل مرنة ضد الكسر", "قطعة", "أدوات مدرسية", 4.5, 8, 6.5, 150, 25],
  ["6221001039", "مسطرة حديد ستانلس 30 سم مدرجة دقيقة", "قطعة", "أدوات مدرسية", 12, 20, 16, 70, 12],
  ["6221001040", "مسطرة أشكال هندسية وفينولية متعددة التجاويف", "قطعة", "أدوات مدرسية", 9, 15, 12, 60, 10],
  ["6221001041", "طقم هندسة أدوات برجل ومثلثات ومنقلة معدن", "طقم", "أدوات مدرسية", 35, 50, 42, 50, 12],
  ["6221001042", "برجل معدني احترافي بديل سن وسنون", "قطعة", "أدوات مدرسية", 22, 34, 28, 45, 8],
  ["6221001043", "صلصال طبي معجون أطفال 10 ألوان غير سام", "علبة", "أدوات مدرسية", 18, 28, 23, 50, 10],
  ["6221001044", "مقلمة مدرسية قماشية فاخرة 3 سوستة", "قطعة", "أدوات مدرسية", 35, 55, 45, 40, 8],
  ["6221001045", "لانش بوكس صحي مقسم 3 أجزاء خالي BPA", "قطعة", "أدوات مدرسية", 55, 75, 68, 30, 8],
  ["6221001046", "زمزمية مياه معدنية حافظة للحرارة 500 مل", "قطعة", "أدوات مدرسية", 85, 120, 105, 25, 6],
  ["6221001047", "جلاد كتب وكشاكيل كيس 10 قطع شفاف ملون", "باكت", "أدوات مدرسية", 12, 18, 15, 80, 15],
  ["6221001048", "تيكت ملصقات أسماء مدرسية كرتونية (5 أفرخ)", "باكت", "أدوات مدرسية", 6, 10, 8, 120, 20],
  ["6221001049", "لوحة كانسون بيضاء مقاس نصف فرخ 50×70", "فرخ", "أدوات مدرسية", 14, 22, 18, 90, 15],
  ["6221001050", "ورق فوم جليتر لاصق مقاس A4 ألوان متعددة (10 أفرخ)", "باكت", "أدوات مدرسية", 24, 36, 30, 65, 12],

  // ================= 20 صنف دعاية وإعلان =================
  ["6225005001", "طباعة يفطة بنر إعلاني خارجي مقوى 440 جم (بالمتر المربع)", "متر مربع", "دعاية وإعلان", 65, 110, 95, 500, 30],
  ["6225005002", "طباعة فلكس مضيء داخلي وخارجي للواجهات (بالمتر المربع)", "متر مربع", "دعاية وإعلان", 95, 160, 140, 300, 20],
  ["6225005003", "طباعة ستيكر فينيل واجهات ألماني ضد الشمس والماء", "متر مربع", "دعاية وإعلان", 75, 130, 115, 400, 25],
  ["6225005004", "طباعة ستيكر سيارات مقصوص كاتر بلوتر ديزاين", "متر مربع", "دعاية وإعلان", 110, 185, 160, 200, 15],
  ["6225005005", "طباعة سي ثرو زجاج واجهات خارجي مخرم", "متر مربع", "دعاية وإعلان", 85, 145, 125, 250, 20],
  ["6225005006", "استاند رول اب إعلاني 85×200 سم بقاعدة ألمونيوم وطباعة", "قطعة", "دعاية وإعلان", 320, 490, 440, 20, 5],
  ["6225005007", "استاند بوب اب إعلاني 3×3 منحني بالشنطة والطباعة", "طقم", "دعاية وإعلان", 2200, 3100, 2800, 4, 1],
  ["6225005008", "استاند إكس بنر X-Banner مقاس 60×160 سم مع الطباعة", "قطعة", "دعاية وإعلان", 140, 220, 190, 18, 4],
  ["6225005009", "كروت شخصية بيزنس كارد كوشيه 350 جم سلوفان مط وجهين (1000 كارت)", "علبة", "دعاية وإعلان", 140, 230, 200, 50, 10],
  ["6225005010", "كروت شخصية سبوت يو في بارز فاخر UV (1000 كارت)", "علبة", "دعاية وإعلان", 240, 360, 320, 25, 5],
  ["6225005011", "طباعة فلاير دعائي A5 ألوان 150 جم لميع (1000 فلاير)", "ألف", "دعاية وإعلان", 380, 580, 520, 30, 6],
  ["6225005012", "طباعة بروشور ومطوية 3 طيات مطوية A4 ألوان (1000 مطوية)", "ألف", "دعاية وإعلان", 550, 850, 750, 15, 3],
  ["6225005013", "فولدر حافظة أوراق مؤتمرات بجيب داخلي كوشيه (500 فولدر)", "طقم", "دعاية وإعلان", 950, 1450, 1250, 8, 2],
  ["6225005014", "أكياس بلاستيك مطبوعة لوجو مقاس 30×40 (1000 كيس)", "ألف", "دعاية وإعلان", 480, 720, 640, 12, 3],
  ["6225005015", "أكياس كرافت ورق كارتون فاخرة بحبل باللوجو (500 كيس)", "طقم", "دعاية وإعلان", 850, 1300, 1150, 10, 2],
  ["6225005016", "طباعة دروع تكريم كريستال محفورة بالليزر مع العلبة المخملية", "قطعة", "دعاية وإعلان", 180, 280, 250, 20, 4],
  ["6225005017", "مجات سحرية حرارية متغيرة اللون بالطباعة واللوجو", "قطعة", "دعاية وإعلان", 55, 85, 75, 50, 10],
  ["6225005018", "تيشيرت بولو مطبوع تطريز ديجيتال باللوجو للشركات", "قطعة", "دعاية وإعلان", 95, 150, 130, 40, 8],
  ["6225005019", "كاب قطن دعائي مطبوع تطريز بارز باللوجو", "قطعة", "دعاية وإعلان", 35, 60, 50, 60, 12],
  ["6225005020", "أقلام دعائية معدنية محفورة ليزر باللوجو (100 قلم)", "طقم", "دعاية وإعلان", 420, 650, 580, 15, 3],

  // ================= خردوات ومستلزمات مكتبية =================
  ["6222002001", "لاصق سولتيب شفاف عريض 5 سم", "بكرة", "خردوات", 14, 20, 17, 100, 20],
  ["6222002002", "سوبر جلو أمير أصلي فوري قوي", "أنبوبة", "خردوات", 6, 10, 8, 150, 30],
  ["6222002003", "مقص حاد ستانلس ستيل كبير 8 بوصة", "قطعة", "خردوات", 22, 35, 28, 40, 10],
  ["6222002004", "دباسة ورق كانجارو متوسطة 24/6 أصلية", "قطعة", "خردوات", 45, 65, 55, 35, 8],
  ["6222002005", "علبة دبابيس دباسة 1000 دبوس 24/6", "علبة", "خردوات", 7, 12, 9.5, 120, 25],
  ["6222002006", "متر قياس 5 متر شريط فولاذي متين", "قطعة", "خردوات", 28, 40, 34, 30, 6],
  ["6222002007", "كاتر معدني احترافي مع علبة غيار شفرات", "قطعة", "خردوات", 18, 30, 24, 60, 12],
  ["6222002008", "خيط مكرمية وحبال تغليف كراتين سميكة", "لفة", "خردوات", 25, 38, 32, 40, 10],

  // ================= طباعة وتصميم ومطبوعات =================
  ["6223003001", "باكو ورق تصوير A4 دبل إيه 80 جم (500 ورقة)", "باكو", "طباعة وتصميم", 155, 185, 175, 80, 15],
  ["6223003002", "ورق جلوسي كوشيه 300 جم للشهادات (100 فرخ)", "باكت", "طباعة وتصميم", 180, 230, 210, 25, 5],
  ["6223003003", "طباعة ديجيتال ملونة A4 فاخرة وجه واحد", "ورقة", "طباعة وتصميم", 2, 4, 3, 5000, 200],
  ["6223003004", "طباعة وتغليف حراري سلوفان مط A4", "ورقة", "طباعة وتصميم", 5, 9, 7.5, 1000, 50],
  ["6223003005", "طباعة كتب ومذكرات دراسية وجهين أبيض وأسود", "ورقة", "طباعة وتصميم", 0.35, 0.65, 0.5, 10000, 500],
  ["6223003006", "حبارة ليزر HP 85A متوافقة درجة أولى", "قطعة", "طباعة وتصميم", 160, 220, 195, 18, 4],
  ["6223003007", "تصميم شعار وهوية بصرية تجارية احترافية", "خدمة", "طباعة وتصميم", 250, 600, 500, 999, 10],

  // ================= كروت أفراح ومناسبات =================
  ["6224004001", "كارت أفراح ليزر مذهب مع ظرف كلاسيك (100 كارت)", "طقم", "كروت أفراح", 280, 420, 370, 25, 5],
  ["6224004002", "كارت دعوة أكريليك شفاف فاخر بحبر ذهبي بارز", "قطعة", "كروت أفراح", 16, 28, 24, 150, 20],
  ["6224004003", "كروت مناسبات وسبوع وتهنئة خاصة (100 كارت)", "طقم", "كروت أفراح", 140, 220, 190, 30, 6],
  ["6224004004", "أظرف شيك فاخرة مبطنة مقاس كروت 20×15", "دستة", "كروت أفراح", 35, 55, 45, 50, 10],
  ["6224004005", "ختم شمعي عثماني مع ملعقة وشمع ذهبي ومقبض خشب", "طقم", "كروت أفراح", 85, 130, 115, 15, 3],
];

const CUSTOMERS: Array<[string, string, string]> = [
  ["مكتبة الأمل الحديثة - الأستاذ طارق", "01001234567", "القاهرة - الفجالة"],
  ["أحمد محمد علي - محاماة واستشارات", "01114567890", "الجيزة - الهرم"],
  ["شركة النور للتجارة والتوريدات", "01223456789", "القاهرة - المعادي"],
  ["قاعة الماسة للأفراح والمناسبات", "01098765432", "الإسكندرية - سموحة"],
  ["سنتر الفاتح التعليمي", "01556677889", "المنصورة - شارع الجمهورية"],
  ["وكالة إبداع للدعاية والتسويق", "01287654321", "طنطا - الاستاد"],
];

const SUPPLIERS: Array<[string, string, string]> = [
  ["مصنع بريما للصناعات الكتابية والقرطاسية", "0238339100", "العاشر من رمضان"],
  ["شركة الأهرام للورق والكرتون", "0225297000", "القاهرة - العتبة"],
  ["مستودع الشرق لخامات البنر والفليكس", "01005544332", "القاهرة - باب الشعرية"],
  ["مطابع الدولية لكروت الأفراح والمطبوعات الفاخرة", "01112233445", "القاهرة - عابدين"],
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

let seeding: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = seedIfEmpty().catch((e) => {
      seeding = null;
      throw e;
    });
  }
  return seeding;
}

async function ensureSchema() {
  try {
    await execRaw(SCHEMA_SQL);
  } catch (e) {
    if (isPglite) throw e;
    console.warn("schema check skipped", e);
  }
}

async function seedIfEmpty() {
  await ensureSchema();
  const rows = await db.select({ id: settings.id }).from(settings).limit(1);
  if (rows.length) return;
  await insertDemoData();
}

export async function getSettings() {
  await ensureSchema();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  await db.insert(settings).values({ id: 1, ...DEFAULT_SETTINGS }).onConflictDoNothing();
  const [created] = await db.select().from(settings).where(eq(settings.id, 1));
  return created ?? { id: 1, ...DEFAULT_SETTINGS };
}

export async function truncateAll() {
  await db.execute(
    sql`TRUNCATE TABLE purchase_order_items, purchase_orders, installments, shifts, invoice_items, invoices, payments, parties, products, settings, expenses, cash_moves RESTART IDENTITY CASCADE`,
  );
}

export async function resetDemoData() {
  await truncateAll();
  await insertDemoData();
}

export async function clearAllData() {
  const current = await getSettings();
  await truncateAll();
  const { id: _id, updatedAt: _u, ...rest } = current;
  void _id;
  void _u;
  await db.insert(settings).values({ id: 1, ...rest });
}

type InvInsert = typeof invoices.$inferInsert;
type ItemInsert = Omit<typeof invoiceItems.$inferInsert, "invoiceId">;

export async function insertDemoData() {
  const rand = rng(1222355769);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  await db.transaction(async (tx) => {
    await tx.insert(settings).values({ id: 1, ...DEFAULT_SETTINGS }).onConflictDoNothing();

    const prodRows = await tx
      .insert(products)
      .values(
        PRODUCTS.map(([code, name, unit, category, costPrice, salePrice, wholesalePrice, stock, minStock]) => ({
          code,
          name,
          unit,
          category,
          costPrice,
          salePrice,
          wholesalePrice,
          stock,
          minStock,
        })),
      )
      .returning({ id: products.id });

    const custRows = await tx
      .insert(parties)
      .values(
        CUSTOMERS.map(([name, phone, address], i) => ({
          type: "customer",
          code: name.includes("سنتر الفاتح") ? 2366 : 10001 + i,
          name,
          phone,
          address,
        })),
      )
      .returning({ id: parties.id });

    const suppRows = await tx
      .insert(parties)
      .values(SUPPLIERS.map(([name, phone, address], i) => ({ type: "supplier", code: 20001 + i, name, phone, address })))
      .returning({ id: parties.id });

    const balances = new Map<number, number>();
    const addBalance = (id: number, v: number) => balances.set(id, r2((balances.get(id) ?? 0) + v));
    const now = new Date();

    // وردية كاشير مفتوحة
    await tx.insert(shifts).values({
      shiftNumber: 1,
      cashierName: "FATORA",
      openedAt: new Date(now.getTime() - 8 * 3600 * 1000),
      startingCash: 500,
      status: "open",
      notes: "وردية الصباح الافتتاحية",
    });

    // رأس مال افتتاحي في الخزينة
    const capitalDate = new Date(now);
    capitalDate.setDate(capitalDate.getDate() - 30);
    capitalDate.setHours(9, 0, 0, 0);
    await tx.insert(cashMoves).values({
      kind: "in",
      amount: 40000,
      notes: "رصيد افتتاحي - رأس مال البرنامج",
      date: capitalDate,
      createdAt: capitalDate,
    });

    // مصروفات تجريبية
    const EXP: Array<[number, string, number, string]> = [
      [22, "إيجار", 3500, "إيجار المحل والمخزن"],
      [16, "كهرباء", 480, "فاتورة كهرباء شهرية"],
      [12, "رواتب", 3000, "راتب فني الطباعة والمصمم"],
      [7, "نقل ومواصلات", 180, "نقل خامات الورق من الفجالة"],
      [4, "صيانة", 320, "صيانة ماكينة الطباعة الديجيتال"],
      [2, "مياه", 95, "فاتورة المياه"],
      [1, "بوفيه وضيافة", 140, "شاي وسكر ومستلزمات بوفيه"],
    ];
    await tx.insert(expenses).values(
      EXP.map(([d, category, amount, notes]) => {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - d);
        dt.setHours(13, 0, 0, 0);
        return { date: dt, category, amount, notes, createdAt: dt };
      }),
    );

    const gens: Array<{ inv: InvInsert; items: ItemInsert[] }> = [];
    const methods = ["cash", "cash", "cash", "card", "wallet", "transfer"];

    // فواتير مبيعات متنوعة
    const SALES = 36;
    for (let i = 0; i < SALES; i++) {
      const daysAgo = Math.floor(((SALES - 1 - i) * 20) / SALES);
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(9 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);

      const used = new Set<number>();
      const items: ItemInsert[] = [];

      if (i === 35) {
        // فاتورة رقم 1036 المطابقة لصورة المستخدم بالمللي
        const p1 = PRODUCTS[85];
        const p2 = PRODUCTS[86];
        const p3 = PRODUCTS[87];
        items.push(
          {
            productId: prodRows[85].id,
            productName: p1[1],
            unit: p1[2],
            qty: 3,
            price: 420,
            cost: p1[4],
            discount: 0,
            total: 1260,
          },
          {
            productId: prodRows[86].id,
            productName: p2[1],
            unit: p2[2],
            qty: 1,
            price: 28,
            cost: p2[4],
            discount: 0,
            total: 28,
          },
          {
            productId: prodRows[87].id,
            productName: p3[1],
            unit: p3[2],
            qty: 1,
            price: 220,
            cost: p3[4],
            discount: 0,
            total: 220,
          },
        );
        const fatehPartyId = custRows[4].id;
        const dFateh = new Date(now);
        gens.push({
          inv: {
            type: "sale",
            number: 1036,
            partyId: fatehPartyId,
            partyName: "سنتر الفاتح التعليمي",
            date: dFateh,
            paymentType: "credit",
            paymentMethod: "installments",
            priceLevel: "retail",
            subtotal: 1508,
            discount: 0,
            extraDiscount: 0,
            taxRate: 0,
            tax: 0,
            total: 1508,
            paid: 1000,
            cost: 3 * p1[4] + p2[4] + p3[4],
            notes: "",
            userName: "FATORA",
            template: "template-modern-a5",
            shiftId: 1,
            createdAt: dFateh,
            updatedAt: dFateh,
          },
          items,
        });
        continue;
      }

      const n = 1 + Math.floor(rand() * 4);
      for (let k = 0; k < n; k++) {
        const idx = Math.floor(rand() * PRODUCTS.length);
        if (used.has(idx)) continue;
        used.add(idx);
        const p = PRODUCTS[idx];
        const qty = 1 + Math.floor(rand() * 4);
        const discount = rand() < 0.15 ? 2 : 0;
        items.push({
          productId: prodRows[idx].id,
          productName: p[1],
          unit: p[2],
          qty,
          price: p[5],
          cost: p[4],
          discount,
          total: r2(qty * p[5] - discount),
        });
      }
      const credit = rand() < 0.25;
      const custIdx = credit || rand() < 0.4 ? Math.floor(rand() * CUSTOMERS.length) : -1;
      const partyId = custIdx >= 0 ? custRows[custIdx].id : null;
      const paymentType = credit && partyId ? "credit" : "cash";
      const subtotal = r2(items.reduce((s, it) => s + (it.qty ?? 0) * (it.price ?? 0), 0));
      const discount = r2(items.reduce((s, it) => s + (it.discount ?? 0), 0));
      const taxable = r2(subtotal - discount);
      const tax = r2(taxable * 0.14);
      const total = r2(taxable + tax);
      const paid = paymentType === "credit" ? (rand() < 0.5 ? 0 : r2(total / 2)) : total;
      if (partyId && total - paid > 0) addBalance(partyId, total - paid);

      gens.push({
        inv: {
          type: "sale",
          number: 1001 + i,
          partyId,
          partyName: custIdx >= 0 ? CUSTOMERS[custIdx][0] : "عميل نقدي",
          date: d,
          paymentType,
          paymentMethod: paymentType === "credit" ? "installments" : pick(methods),
          priceLevel: "retail",
          subtotal,
          discount,
          extraDiscount: 0,
          taxRate: 14,
          tax,
          total,
          paid,
          cost: r2(items.reduce((s, it) => s + (it.qty ?? 0) * (it.cost ?? 0), 0)),
          notes: "",
          userName: DEFAULT_SETTINGS.userName,
          template: "template-modern-a5",
          shiftId: 1,
          createdAt: d,
          updatedAt: d,
        },
        items,
      });
    }

    // فواتير مشتريات
    const PURCHASES = 6;
    for (let i = 0; i < PURCHASES; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (24 - i * 4));
      d.setHours(10 + Math.floor(rand() * 6), Math.floor(rand() * 60), 0, 0);
      const used = new Set<number>();
      const items: ItemInsert[] = [];
      const n = 3 + Math.floor(rand() * 4);
      for (let k = 0; k < n; k++) {
        const idx = Math.floor(rand() * PRODUCTS.length);
        if (used.has(idx)) continue;
        used.add(idx);
        const p = PRODUCTS[idx];
        const qty = 10 * (1 + Math.floor(rand() * 4));
        items.push({
          productId: prodRows[idx].id,
          productName: p[1],
          unit: p[2],
          qty,
          price: p[4],
          cost: p[4],
          discount: 0,
          total: r2(qty * p[4]),
        });
      }
      const sIdx = i % SUPPLIERS.length;
      const credit = rand() < 0.45;
      const subtotal = r2(items.reduce((s, it) => s + (it.qty ?? 0) * (it.price ?? 0), 0));
      const tax = r2(subtotal * 0.14);
      const total = r2(subtotal + tax);
      const paid = credit ? r2(total / 2) : total;
      if (total - paid > 0) addBalance(suppRows[sIdx].id, total - paid);
      gens.push({
        inv: {
          type: "purchase",
          number: 1001 + i,
          partyId: suppRows[sIdx].id,
          partyName: SUPPLIERS[sIdx][0],
          date: d,
          paymentType: credit ? "credit" : "cash",
          paymentMethod: credit ? "installments" : pick(["cash", "transfer", "cheque"]),
          priceLevel: "retail",
          subtotal,
          discount: 0,
          extraDiscount: 0,
          taxRate: 14,
          tax,
          total,
          paid,
          cost: subtotal,
          notes: "",
          userName: DEFAULT_SETTINGS.userName,
          template: "template-modern-a5",
          shiftId: 1,
          createdAt: d,
          updatedAt: d,
        },
        items,
      });
    }

    const invRows = await tx.insert(invoices).values(gens.map((g) => g.inv)).returning({ id: invoices.id });
    const allItems = gens.flatMap((g, gi) => g.items.map((it) => ({ ...it, invoiceId: invRows[gi].id })));
    await tx.insert(invoiceItems).values(allItems);

    // أقساط تجريبية لعميل عليه آجل
    const debtor = custRows[0];
    if (debtor) {
      const instDue1 = new Date(now);
      instDue1.setDate(instDue1.getDate() + 15);
      const instDue2 = new Date(now);
      instDue2.setDate(instDue2.getDate() + 45);

      await tx.insert(installments).values([
        {
          partyId: debtor.id,
          partyName: CUSTOMERS[0][0],
          installmentNo: 1,
          totalInstallments: 2,
          amount: 250,
          dueDate: instDue1,
          status: "pending",
          notes: "قسط كروت أفراح ومطبوعات",
        },
        {
          partyId: debtor.id,
          partyName: CUSTOMERS[0][0],
          installmentNo: 2,
          totalInstallments: 2,
          amount: 250,
          dueDate: instDue2,
          status: "pending",
          notes: "قسط كروت أفراح ومطبوعات",
        },
      ]);
    }

    // أمر شراء ذكي مقترح
    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        orderNumber: 5001,
        supplierId: suppRows[0].id,
        supplierName: SUPPLIERS[0][0],
        status: "draft",
        totalAmount: 1850,
        notes: "طلب شراء ذكي تلقائي للنواقص ومستلزمات الموسم المدرسي",
      })
      .returning();

    await tx.insert(purchaseOrderItems).values([
      {
        orderId: po.id,
        productId: prodRows[0].id,
        productName: PRODUCTS[0][1],
        currentStock: PRODUCTS[0][7],
        minStock: PRODUCTS[0][8],
        suggestedQty: 50,
        orderedQty: 50,
        unitCost: PRODUCTS[0][4],
        total: 50 * PRODUCTS[0][4],
      },
      {
        orderId: po.id,
        productId: prodRows[19].id,
        productName: PRODUCTS[19][1],
        currentStock: PRODUCTS[19][7],
        minStock: PRODUCTS[19][8],
        suggestedQty: 30,
        orderedQty: 30,
        unitCost: PRODUCTS[19][4],
        total: 30 * PRODUCTS[19][4],
      },
    ]);

    const fatehCust = custRows.find((_, i) => CUSTOMERS[i][0].includes("سنتر الفاتح"));
    if (fatehCust) balances.set(fatehCust.id, 2366);

    for (const [id, bal] of balances) {
      await tx.update(parties).set({ balance: bal }).where(eq(parties.id, id));
    }
  });
}
