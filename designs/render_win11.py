"""
معاينة شاشة المبيعات بأسلوب Windows 11 (Fluent Design) — أزرق فاتح.

- النص العربي: artext.ArabicText (HarfBuzz + bidi) — تشكيل صحيح.
- كل النصوص مأخوذة حرفياً من src/components/invoice/InvoiceEditor.tsx.
- الألوان: Fluent 2 / Windows 11 (light) — accent #0067c0.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artext import ArabicText  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = os.path.join(ROOT, "public", "fonts", "cairo-variable.ttf")

AT = ArabicText(FONT_PATH)

SS = 2
W, H = 1600, 1000


def S(v):
    return int(round(v * SS))


# ---------------- Fluent 2 / Windows 11 (Light — أزرق فاتح) ----------------
F = {
    "mica":       "#eef4fb",
    "mica_alt":   "#e4edf8",
    "card":       "#fbfdff",
    "card_soft":  "#f2f7fd",
    "stroke":     "#dce7f4",
    "stroke_2":   "#cfdff0",
    "stroke_3":   "#bfd4e9",
    "text":       "#12263f",
    "text_2":     "#4a6484",
    "text_3":     "#7a94b3",
    "accent":     "#0067c0",
    "accent_h":   "#1975c5",
    "accent_d":   "#005a9e",
    "accent_l":   "#e5f1fb",
    "accent_s":   "#a8cdea",
    "green":      "#0f7b0f", "green_l": "#dff6dd", "green_s": "#9fd89f",
    "red":        "#c42b1c", "red_l":   "#fde7e9", "red_s":   "#f1aeb5",
    "amber":      "#9d5d00", "amber_l": "#fff4ce", "amber_s": "#f2c744",
    "violet":     "#5c2e91", "violet_l": "#f0e6fa", "violet_s": "#c7a8e5",
    "teal":       "#0f6cbd", "teal_l":  "#e0f2f1", "teal_s":  "#7fd1cc",
    "slate":      "#4a5568", "slate_l": "#eef0f3", "slate_s": "#c3cad4",
}

# أزرار الشاشة الستة — كل زر بلونه (مطابق للكود)
ACTION_COLORS = [
    ("فاتورة جديدة",    "save",   "accent"),
    ("حفظ الفاتورة",    "save",   "green"),
    ("عرض المبيعات",    "layers", "teal"),
    ("إلغاء الفاتورة",  "close",  "red"),
    ("تعليق الفاتورة",  "eraser", "amber"),
    ("الفواتير المعلقة", "cards", "violet"),
]


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(c1, c2, t):
    a, b = hexrgb(c1), hexrgb(c2)
    return "#%02x%02x%02x" % tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rr(d, box, r=6, fill=None, outline=None, width=1):
    d.rounded_rectangle([S(box[0]), S(box[1]), S(box[2]), S(box[3])],
                        radius=max(1, S(r)), fill=fill, outline=outline,
                        width=max(1, S(width)))


def vgrad(size, c1, c2):
    return _vgrad_px(max(1, S(size[0])), max(1, S(size[1])), c1, c2)


def _vgrad_px(w, h, c1, c2):
    base = Image.new("RGB", (1, h))
    px = base.load()
    a, b = hexrgb(c1), hexrgb(c2)
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return base.resize((w, h), Image.BILINEAR)


def grad_box(img, box, r, c1, c2, outline=None, ow=1):
    x0, y0, x1, y1 = [S(v) for v in box]
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        return
    g = _vgrad_px(w, h, c1, c2)
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=max(1, S(r)), fill=255)
    img.paste(g, (x0, y0), m)
    d = ImageDraw.Draw(img)
    if outline:
        rr(d, box, r, outline=outline, width=ow)


def T(img, xy, s, size=12, w=600, fill=None, anchor="rm"):
    AT.draw(img, (S(xy[0]), S(xy[1])), s, size=size * SS, weight=w,
            fill=hexrgb(fill or F["text"]), anchor=anchor)


def TL(img, xy, s, size=12, w=600, fill=None, anchor="lm"):
    AT.draw_ltr(img, (S(xy[0]), S(xy[1])), s, size=size * SS, weight=w,
                fill=hexrgb(fill or F["text"]), anchor=anchor)


def tw(s, size=12, w=600):
    return AT.measure(s, size * SS, w) / SS


def tlw(s, size=12, w=600):
    return AT.measure_ltr(s, size * SS, w) / SS


# ---------------- Fluent icons ----------------
def icon(d, name, cx, cy, sz=14, color="#12263f", lw=1.6):
    def L(pts, close=False):
        p = [(S(x), S(y)) for x, y in pts]
        if close:
            p.append(p[0])
        d.line(p, fill=color, width=max(1, S(lw)), joint="curve")

    def E(box, fill=None, outline=None):
        d.ellipse([S(box[0]), S(box[1]), S(box[2]), S(box[3])],
                  fill=fill, outline=outline, width=max(1, S(lw)))

    def A(box, a0, a1):
        d.arc([S(box[0]), S(box[1]), S(box[2]), S(box[3])], a0, a1,
              fill=color, width=max(1, S(lw)))

    h = sz / 2.0
    x0, y0, x1, y1 = cx - h, cy - h, cx + h, cy + h

    if name == "save":
        L([(x0, y0), (x1 - h * .35, y0), (x1, y0 + h * .35), (x1, y1), (x0, y1)], True)
        rr(d, [cx - h * .42, y0 + h * .06, cx + h * .42, cy - h * .18], 1, fill=color)
        rr(d, [cx - h * .5, cy + h * .18, cx + h * .5, y1 - h * .04], 1, outline=color, width=1)
    elif name == "close":
        L([(x0, y0), (x1, y1)]); L([(x1, y0), (x0, y1)])
    elif name == "plus":
        L([(cx, y0), (cx, y1)]); L([(x0, cy), (x1, cy)])
    elif name == "minus":
        L([(x0, cy), (x1, cy)])
    elif name == "square":
        rr(d, [x0, y0, x1, y1], 1, outline=color, width=1)
    elif name == "eraser":
        L([(x0 + h * .1, y1 - h * .1), (cx - h * .05, y1 - h * .1),
           (x1 - h * .1, cy + h * .1), (cx + h * .45, y0 + h * .1)], True)
    elif name == "undo":
        A([x0, y0 + h * .1, x1, y1 + h * .1], 200, 20)
        L([(x0, cy - h * .05), (x0, cy - h * .62)])
        L([(x0, cy - h * .05), (x0 + h * .6, cy - h * .05)])
    elif name == "trash":
        L([(x0, y0 + h * .28), (x1, y0 + h * .28)])
        L([(cx - h * .35, y0 + h * .28), (cx - h * .28, y0),
           (cx + h * .28, y0), (cx + h * .35, y0 + h * .28)])
        L([(x0 + h * .18, y0 + h * .28), (x0 + h * .3, y1),
           (x1 - h * .3, y1), (x1 - h * .18, y0 + h * .28)])
    elif name == "printer":
        rr(d, [cx - h * .42, y0, cx + h * .42, y0 + h * .55], 1, outline=color, width=1)
        rr(d, [x0, cy - h * .1, x1, y1 - h * .3], 2, outline=color, width=1)
        rr(d, [cx - h * .42, cy + h * .35, cx + h * .42, y1], 1, fill=color)
    elif name == "phone":
        rr(d, [cx - h * .32, y0, cx + h * .32, y1], 3, outline=color, width=1)
        L([(cx - h * .12, y1 - h * .2), (cx + h * .12, y1 - h * .2)])
    elif name == "search":
        E([x0, y0, cx + h * .2, cy + h * .2], outline=color)
        L([(cx + h * .12, cy + h * .12), (x1, y1)])
    elif name == "user":
        E([cx - h * .38, y0, cx + h * .38, y0 + h * .76], outline=color)
        A([x0, cy + h * .28, x1, y1 + h * .55], 180, 360)
    elif name == "wallet":
        rr(d, [x0, y0 + h * .18, x1, y1 - h * .18], 2, outline=color, width=1)
        E([x1 - h * .55, cy - h * .2, x1 - h * .05, cy + h * .2], fill=color)
    elif name == "cart":
        L([(x0, y0 + h * .05), (x0 + h * .4, y0 + h * .05),
           (cx + h * .1, cy + h * .45), (x1, cy + h * .45)])
        L([(cx - h * .1, cy - h * .1), (x1 - h * .12, cy - h * .1)])
        E([cx - h * .5, y1 - h * .42, cx - h * .12, y1 - h * .04], fill=color)
        E([cx + h * .34, y1 - h * .42, cx + h * .72, y1 - h * .04], fill=color)
    elif name == "box":
        L([(cx, y0), (x1, cy - h * .3), (x1, y1 - h * .2), (cx, y1),
           (x0, y1 - h * .2), (x0, cy - h * .3)], True)
        L([(x0, cy - h * .3), (cx, cy + h * .15), (x1, cy - h * .3)])
        L([(cx, cy + h * .15), (cx, y1)])
    elif name == "layers":
        L([(cx, y0), (x1, cy - h * .25), (cx, cy + h * .1), (x0, cy - h * .25)], True)
        L([(x0, cy + h * .2), (cx, cy + h * .55), (x1, cy + h * .2)])
        L([(x0, cy + h * .55), (cx, cy + h * .9), (x1, cy + h * .55)])
    elif name == "cards":
        rr(d, [x0, y0 + h * .1, cx + h * .3, y1 - h * .1], 2, outline=color, width=1)
        rr(d, [cx - h * .3, y0 + h * .35, x1, y1 - h * .35], 2, outline=color, width=1)
    else:
        E([x0, y0, x1, y1], outline=color)


def labeled(img, d, cx, cy, label, size=11, w=600, color=None, icon_name=None,
            icon_sz=13, gap=6, lw=1.6):
    color = color or F["text"]
    wt = tw(label, size, w)
    total = wt + (icon_sz + gap if icon_name else 0)
    x = cx - total / 2
    if icon_name:
        icon(d, icon_name, x + icon_sz / 2, cy, icon_sz, color, lw)
        x += icon_sz + gap
    T(img, (x + wt, cy - size * 0.06), label, size=size, w=w, fill=color, anchor="rm")


# ======================================================================
def build(out="sales-win11-blue.png"):
    img = Image.new("RGB", (W * SS, H * SS), F["mica_alt"])
    d = ImageDraw.Draw(img)

    img.paste(vgrad((W, H), "#d5e5f7", "#c2d6ee"), (0, 0))
    d = ImageDraw.Draw(img)

    AX0, AY0, AX1, AY1 = 18, 16, W - 18, H - 16
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [S(AX0 + 3), S(AY0 + 9), S(AX1 - 3), S(AY1 - 2)], radius=S(9),
        fill=(20, 45, 85, 68))
    img.paste(sh.filter(ImageFilter.GaussianBlur(S(9))), (0, 0), sh)
    d = ImageDraw.Draw(img)

    rr(d, [AX0, AY0, AX1, AY1], 9, fill=F["mica"], outline=F["stroke_2"], width=1)

    # ============ شريط العنوان ============
    TB = 34
    grad_box(img, [AX0 + 1, AY0 + 1, AX1 - 1, AY0 + TB], 8, "#123a63", "#0e2e50")
    d = ImageDraw.Draw(img)
    d.rectangle([S(AX0 + 2), S(AY0 + TB - 9), S(AX1 - 2), S(AY0 + TB)], fill="#0e2e50")
    d.line([(S(AX0 + 1), S(AY0 + TB)), (S(AX1 - 1), S(AY0 + TB))],
           fill=F["stroke"], width=1)

    # RTL: الشعار والعنوان على اليمين
    ax = AX1 - 26
    rr(d, [ax - 8, AY0 + 9, ax + 8, AY0 + 25], 4, fill=F["accent"])
    icon(d, "cart", ax, AY0 + 17, 10, "#ffffff", 1.4)
    T(img, (ax - 18, AY0 + TB / 2), "فواتير مبيعات", size=11, w=600, fill="#ffffff")

    # أزرار النافذة على اليسار (Windows 11)
    for i, (nm, hov) in enumerate([("minus", 0), ("square", 0), ("close", 1)]):
        bx = AX0 + 3 + i * 44
        if hov:
            rr(d, [bx, AY0 + 1, bx + 44, AY0 + TB - 1], 0, fill="#c42b1c")
            col = "#ffffff"
        else:
            col = "#dbe8f6"
        icon(d, nm, bx + 22, AY0 + TB / 2, 7.5 if nm != "square" else 8.5, col, 1.4)

    BY0 = AY0 + TB + 1
    ST_H = 28
    BOT = AY1 - ST_H
    PAD, GAP = 8, 8
    x_left, x_right = AX0 + PAD, AX1 - PAD

    # ============ التولبار ============
    TBAR = 58
    tb_y0 = BY0 + PAD
    tb_y1 = tb_y0 + TBAR
    rr(d, [x_left, tb_y0, x_right, tb_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)

    # مجموعة يمين: تراجع + رقم الفاتورة + حذف
    gi_y0, gi_y1 = tb_y0 + 8, tb_y1 - 8
    gx = x_right - 8
    # تراجع
    gw = tw("تراجع", 11, 700) + 26
    rr(d, [gx - gw, gi_y0, gx, gi_y1], 5, fill="#ffffff", outline=F["stroke_2"], width=1)
    labeled(img, d, gx - gw / 2, (gi_y0 + gi_y1) / 2, "تراجع", 11, 700, F["text"], "undo", 11, 5, 1.5)
    gx -= gw + 5
    # رقم الفاتورة
    nw = 116
    rr(d, [gx - nw, gi_y0, gx, gi_y1], 5, fill="#ffffff", outline=F["stroke_2"], width=1)
    TL(img, (gx - 8, (gi_y0 + gi_y1) / 2), "000123", size=12, w=700,
       fill=F["accent"], anchor="rm")
    gx -= nw + 5
    # حذف
    dw = tw("حذف", 11, 700) + 26
    rr(d, [gx - dw, gi_y0, gx, gi_y1], 5, fill="#ffffff", outline=F["stroke_2"], width=1)
    labeled(img, d, gx - dw / 2, (gi_y0 + gi_y1) / 2, "حذف", 11, 700, F["text"], "trash", 11, 5, 1.5)

    # مجموعة يسار: طباعة + واتساب + PDF
    gx = x_left + 8
    for lbl, ic in [("طباعة الفاتورة", "printer"), ("واتساب", "phone")]:
        gw = tw(lbl, 11, 600) + 28
        rr(d, [gx, gi_y0, gx + gw, gi_y1], 5, fill="#ffffff", outline=F["stroke_2"], width=1)
        labeled(img, d, gx + gw / 2, (gi_y0 + gi_y1) / 2, lbl, 11, 600, F["text"], ic, 11, 5, 1.5)
        gx += gw + 5

    # ============ صف 1 (178px): العميل + الأسعار + الصورة ============
    ROW1 = 172
    r1_y0 = tb_y1 + GAP
    r1_y1 = r1_y0 + ROW1

    w_cust = 380
    cust_x1 = x_right
    cust_x0 = cust_x1 - w_cust
    img_x0 = x_left
    img_x1 = img_x0 + 122
    mid_x0 = img_x1 + GAP
    mid_x1 = cust_x0 - GAP

    # --- بطاقة العميل ---
    rr(d, [cust_x0, r1_y0, cust_x1, r1_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    fy = r1_y0 + 6
    flds = [("رقم العميل", "1001", False), ("اسم العميل", "عميل نقدي", False),
            ("تليفون", "01xxxxxxxxx", True)]
    for lbl, val, ph in flds:
        T(img, (cust_x1 - 8, fy + 14), lbl, size=10, w=600, fill=F["text_2"])
        lw_ = tw(lbl, 10, 600)
        ix1 = cust_x1 - 8 - lw_ - 6
        rr(d, [cust_x0 + 8, fy, ix1, fy + 28], 5, fill="#ffffff",
           outline=F["stroke_2"], width=1)
        TL(img, (ix1 - 7, fy + 14), val, size=11, w=600,
           fill=F["text_3"] if ph else F["text"], anchor="rm")
        fy += 32

    # شرائح نقدي/أجل
    fy += 2
    segs = ["نقدي", "أجل"]
    sw = (w_cust - 16 - 4) / 2
    for i, s_ in enumerate(segs):
        sx1 = cust_x1 - 8 - i * (sw + 4)
        sx0 = sx1 - sw
        act = (i == 0)
        rr(d, [sx0, fy, sx1, fy + 26], 5,
           fill=F["accent"] if act else "#f4f8fd",
           outline=None if act else F["stroke_2"], width=1)
        labeled(img, d, (sx0 + sx1) / 2, fy + 13, s_, 10.5, 700,
                "#ffffff" if act else F["text_2"])
    fy += 30

    # قطاعي/جملة + رصيد
    qbw = (w_cust - 16 - 4) / 2
    rr(d, [cust_x1 - 8 - qbw, fy, cust_x1 - 8, fy + 26], 5,
       fill="#f4f8fd", outline=F["stroke_2"], width=1)
    labeled(img, d, cust_x1 - 8 - qbw / 2, fy + 13, "قطاعي", 10.5, 600, F["text_2"])
    rr(d, [cust_x1 - 12 - qbw * 2, fy, cust_x1 - 12 - qbw, fy + 26], 5,
       fill="#f4f8fd", outline=F["stroke_2"], width=1)
    labeled(img, d, cust_x1 - 12 - qbw * 1.5, fy + 13, "جملة", 10.5, 600, F["text_2"])

    # --- صورة الصنف ---
    rr(d, [img_x0, r1_y0, img_x1, r1_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    px0, py0 = img_x0 + 14, r1_y0 + 16
    px1, py1 = img_x1 - 14, r1_y1 - 30
    rr(d, [px0, py0, px1, py1], 6, fill="#f4f8fd", outline=F["stroke_2"], width=1)
    icon(d, "box", (px0 + px1) / 2, (py0 + py1) / 2, 26, "#a9c6e4", 1.8)
    T(img, ((px0 + px1) / 2, r1_y1 - 14), "لا توجد صورة", size=8.5, w=600,
      fill=F["text_3"], anchor="mm")

    # --- بطاقة الأسعار ---
    rr(d, [mid_x0, r1_y0, mid_x1, r1_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    T(img, (mid_x1 - 10, r1_y0 + 15), "رصيد العميل", size=9.5, w=700, fill=F["text_3"])
    icon(d, "wallet", mid_x1 - 10 - tw("رصيد العميل", 9.5, 700) - 8, r1_y0 + 15,
         10, F["text_3"], 1.4)
    # رصيد بارز
    rr(d, [mid_x0 + 10, r1_y0 + 28, mid_x1 - 10, r1_y0 + 60], 6,
       fill=F["accent_l"], outline=F["accent_s"], width=1)
    TL(img, (mid_x1 - 20, r1_y0 + 44), "0.00", size=17, w=800,
       fill=F["accent_d"], anchor="rm")
    T(img, (mid_x0 + 20, r1_y0 + 44), "ج.م", size=9.5, w=600, fill=F["accent"], anchor="lm")

    # الأسعار الأربعة
    boxes = [("سعر الشراء", "slate"), ("سعر الجملة", "violet"),
             ("سعر البيع", "green"), ("ربح الوحدة", "teal")]
    bw = (mid_x1 - mid_x0 - 20 - 3 * 5) / 4
    for i, (lbl, col) in enumerate(boxes):
        bx1 = mid_x1 - 10 - i * (bw + 5)
        bx0 = bx1 - bw
        rr(d, [bx0, r1_y0 + 68, bx1, r1_y0 + 106], 5, fill=F[col + "_l"],
           outline=F[col + "_s"], width=1)
        T(img, ((bx0 + bx1) / 2, r1_y0 + 80), lbl, size=8.5, w=700,
          fill=F[col], anchor="mm")
        TL(img, ((bx0 + bx1) / 2, r1_y0 + 95), "0.00", size=11.5, w=800,
           fill=F[col], anchor="mm")

    # أزرار: كشف حساب + إضافة صنف
    qy0 = r1_y0 + 114
    qy1 = r1_y1 - 8
    ab = [("كشف حساب", "cards", "accent"), ("إضافة صنف", "plus", "green")]
    qw = (mid_x1 - mid_x0 - 20 - 6) / 2
    for i, (lbl, ic, col) in enumerate(ab):
        bx1 = mid_x1 - 10 - i * (qw + 6)
        bx0 = bx1 - qw
        rr(d, [bx0, qy0, bx1, qy1], 5, fill=F[col + "_l"],
           outline=F[col + "_s"], width=1)
        labeled(img, d, (bx0 + bx1) / 2, (qy0 + qy1) / 2, lbl, 10, 700,
                F[col], ic, 12, 5, 1.6)

    # ============ الإدخال السريع ============
    qa_y0 = r1_y1 + GAP
    qa_h = 40
    rr(d, [x_left, qa_y0, x_right, qa_y0 + qa_h], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    # من اليمين: [+][القيمة][الخصم][سعر الوحدة][الكمية][الصنف — البحث]
    qx = x_right - 8
    # زر +
    rr(d, [qx - 34, qa_y0 + 6, qx, qa_y0 + qa_h - 6], 5, fill=F["accent"],
       outline=F["accent_d"], width=1)
    icon(d, "plus", qx - 17, qa_y0 + qa_h / 2, 12, "#ffffff", 2.0)
    qx -= 34 + 5
    # القيمة
    for lbl, wid in [("القيمة", 86), ("الخصم", 72), ("سعر الوحدة", 92),
                     ("الكمية", 66)]:
        rr(d, [qx - wid, qa_y0 + 6, qx, qa_y0 + qa_h - 6], 5, fill="#ffffff",
           outline=F["stroke_2"], width=1)
        T(img, (qx - 7, qa_y0 + qa_h / 2), lbl, size=9, w=600,
          fill=F["text_3"], anchor="rm")
        qx -= wid + 5
    # حقل الصنف (البحث)
    rr(d, [x_left + 8, qa_y0 + 6, qx, qa_y0 + qa_h - 6], 16, fill="#ffffff",
       outline=F["stroke_2"], width=1)
    icon(d, "search", qx - 18, qa_y0 + qa_h / 2, 13, F["text_3"], 1.6)
    T(img, (qx - 34, qa_y0 + qa_h / 2),
      "اكتب اسم الصنف أو الباركود (F3 للبحث)...", size=10.5, w=600, fill=F["text_3"])

    # ============ صف 2: الجدول + كروت الأصناف ============
    r2_y0 = qa_y0 + qa_h + GAP
    r3_h = 190
    r2_y1 = BOT - PAD - r3_h - GAP

    # RTL: الجدول على اليمين (المحتوى الأساسي) وكروت الأصناف على الشمال
    cards_w = 268
    cards_x0, cards_x1 = x_left, x_left + cards_w
    grid_x0, grid_x1 = cards_x1 + GAP, x_right

    # --- الجدول ---
    rr(d, [grid_x0, r2_y0, grid_x1, r2_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    TH = 32
    grad_box(img, [grid_x0 + 1, r2_y0 + 1, grid_x1 - 1, r2_y0 + TH], 7, "#16375c", "#0f2a47")
    d = ImageDraw.Draw(img)
    d.rectangle([S(grid_x0 + 1), S(r2_y0 + TH - 7), S(grid_x1 - 1), S(r2_y0 + TH)],
                fill="#0f2a47")
    d.line([(S(grid_x0 + 1), S(r2_y0 + TH)), (S(grid_x1 - 1), S(r2_y0 + TH))],
           fill="#0b2138", width=1)
    cols = [("اسم الصنف والبيان", 0.32), ("العبوة", 0.09), ("الكمية", 0.09),
            ("سعر الوحدة", 0.12), ("الخصم", 0.10), ("الإجمالي", 0.12),
            ("حذف", 0.10)]
    avail = (grid_x1 - grid_x0) - 16
    xx = grid_x1 - 8
    for nm, frac in cols:
        wc = avail * frac
        T(img, (xx - wc / 2, r2_y0 + TH / 2), nm, size=9.5, w=700,
          fill="#ffffff", anchor="mm")
        xx -= wc
    ry = r2_y0 + TH
    RH = 29
    i = 0
    while ry + RH <= r2_y1 - 4:
        if i % 2 == 1:
            d.rectangle([S(grid_x0 + 1), S(ry), S(grid_x1 - 1), S(ry + RH)],
                        fill="#fafcff")
        d.line([(S(grid_x0 + 1), S(ry + RH)), (S(grid_x1 - 1), S(ry + RH))],
               fill="#edf3fa", width=1)
        ry += RH
        i += 1
    T(img, (grid_x1 - 18, r2_y0 + TH + 15),
      "لا توجد أصناف — ابدأ بالبحث أو امسح الباركود", size=10.5, w=600,
      fill=F["text_3"])

    # --- كروت الأصناف ---
    rr(d, [cards_x0, r2_y0, cards_x1, r2_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    hh = 30
    grad_box(img, [cards_x0 + 1, r2_y0 + 1, cards_x1 - 1, r2_y0 + hh], 7, "#16375c", "#0f2a47")
    d = ImageDraw.Draw(img)
    d.rectangle([S(cards_x0 + 1), S(r2_y0 + hh - 8), S(cards_x1 - 1), S(r2_y0 + hh)],
                fill="#0f2a47")
    T(img, (cards_x1 - 10, r2_y0 + hh / 2), "الأصناف (90)", size=10.5, w=700,
      fill="#ffffff")
    # شرائح جدول | كروت
    ch = tw("جدول | كروت", 8.5, 600) + 22
    rr(d, [cards_x0 + 8, r2_y0 + hh + 6, cards_x0 + 8 + ch, r2_y0 + hh + 26], 4,
       fill="#f4f8fd", outline=F["stroke_2"], width=1)
    labeled(img, d, cards_x0 + 8 + ch / 2, r2_y0 + hh + 16, "جدول | كروت", 8.5, 600,
            F["text_2"])
    # كروت مصغرة
    cw_ = (cards_x1 - cards_x0 - 16 - 2 * 5) / 3
    gy = r2_y0 + hh + 34
    while gy + 30 <= r2_y1 - 8:
        for gj in range(3):
            gx1 = cards_x1 - 8 - gj * (cw_ + 5)
            gx0 = gx1 - cw_
            rr(d, [gx0, gy, gx1, gy + 28], 4, fill="#ffffff",
               outline=F["stroke_2"], width=1)
            rr(d, [gx0 + 7, gy + 8, gx1 - 7, gy + 12], 1, fill="#dfe9f5")
            rr(d, [gx0 + 7, gy + 17, gx1 - 15, gy + 21], 1, fill="#eaf1fa")
        gy += 33

    # ============ صف 3: الأزرار + الملاحظات + الدفع + الإجماليات ============
    # ترتيب RTL: (يمين) الأزرار → الملاحظات → طرق الدفع → الإجماليات (شمال)
    r3_y0 = r2_y1 + GAP
    r3_y1 = BOT - PAD

    ACT_W, TOT_W, PAY_W = 292, 282, 232
    act_x1 = x_right
    act_x0 = act_x1 - ACT_W
    tot_x1 = act_x0 - GAP
    tot_x0 = tot_x1 - TOT_W
    notes_x1 = tot_x0 - GAP
    pay_x1 = x_left + PAY_W
    pay_x0 = x_left
    notes_x0 = pay_x1 + GAP

    # --- الأزرار الستة (شبكة 2×3) — كل زر بلونه ---
    bh = (r3_y1 - r3_y0 - 2 * 5) / 3
    bwid = (ACT_W - 5) / 2
    for idx, (lbl, ic, col) in enumerate(ACTION_COLORS):
        row_, col_ = idx // 2, idx % 2
        bx1 = act_x1 - col_ * (bwid + 5)
        bx0 = bx1 - bwid
        by0 = r3_y0 + row_ * (bh + 5)
        grad_box(img, [bx0, by0, bx1, by0 + bh], 7,
                 mix(F[col], "#ffffff", 0.10), F[col],
                 outline=mix(F[col], "#000000", 0.18))
        d = ImageDraw.Draw(img)
        icon(d, ic, (bx0 + bx1) / 2, by0 + bh / 2 - 8, 16, "#ffffff", 1.9)
        T(img, ((bx0 + bx1) / 2, by0 + bh / 2 + 13), lbl, size=9.5, w=700,
          fill="#ffffff", anchor="mm")

    # --- الملاحظات + شريط المبالغ الثلاثة ---
    rr(d, [notes_x0, r3_y0, notes_x1, r3_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    T(img, (notes_x1 - 10, r3_y0 + 14), "ملاحظات الفاتورة والبيان", size=9.5, w=700,
      fill=F["text_3"])
    amt_h = 64
    am_y1 = r3_y1 - 6
    am_y0 = am_y1 - amt_h
    rr(d, [notes_x0 + 8, r3_y0 + 26, notes_x1 - 8, am_y0 - 6], 5,
       fill="#ffffff", outline=F["stroke_2"], width=1)
    T(img, (notes_x1 - 16, r3_y0 + 42), "اكتب أية ملاحظات للعميل هنا ...", size=10,
      w=600, fill=F["text_3"])
    d.line([(S(notes_x0 + 1), S(am_y0 - 4)), (S(notes_x1 - 1), S(am_y0 - 4))],
           fill=F["stroke"], width=1)
    amts = [("خصم إضافي", "amber"), ("المبلغ المستلم", "green"),
            ("الباقي للعميل", "teal")]
    aw = (notes_x1 - notes_x0 - 16 - 2 * 6) / 3
    for i, (lbl, col) in enumerate(amts):
        ax1 = notes_x1 - 8 - i * (aw + 6)
        ax0 = ax1 - aw
        T(img, ((ax0 + ax1) / 2, am_y0 + 10), lbl, size=8.8, w=700,
          fill=F["text_2"], anchor="mm")
        rr(d, [ax0, am_y0 + 19, ax1, am_y0 + 49], 5, fill=F[col + "_l"],
           outline=F[col + "_s"], width=1)
        TL(img, ((ax0 + ax1) / 2, am_y0 + 34), "0.00", size=12, w=800,
           fill=F[col], anchor="mm")

    # --- طرق الدفع ---
    rr(d, [pay_x0, r3_y0, pay_x1, r3_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    T(img, (pay_x1 - 10, r3_y0 + 14), "طريقة الدفع", size=9.5, w=700, fill=F["text_3"])
    pays = [("نقدي", "wallet", "accent"), ("أقساط", "cards", "amber"),
            ("محفظة إلكترونية", "wallet", "violet")]
    ph_ = (r3_y1 - r3_y0 - 26 - 8 - 2 * 6) / 3
    py = r3_y0 + 26
    for i, (lbl, ic, col) in enumerate(pays):
        act = (i == 0)
        if act:
            grad_box(img, [pay_x0 + 8, py, pay_x1 - 8, py + ph_], 6,
                     "#eaf4fd", "#d8ecfb", outline=F["accent"], ow=1)
            d = ImageDraw.Draw(img)
        else:
            rr(d, [pay_x0 + 8, py, pay_x1 - 8, py + ph_], 6, fill="#f4f8fd",
               outline=F["stroke_2"], width=1)
        rr(d, [pay_x1 - 15, py + 6, pay_x1 - 11, py + ph_ - 6], 2, fill=F[col])
        icon(d, ic, pay_x1 - 28, py + ph_ / 2, 12, F[col], 1.6)
        T(img, (pay_x1 - 41, py + ph_ / 2), lbl, size=10.5, w=700,
          fill=F["accent_d"] if act else F["text"])
        py += ph_ + 6

    # --- الإجماليات + المطلوب دفعه ---
    rr(d, [tot_x0, r3_y0, tot_x1, r3_y1], 8, fill="#ffffff",
       outline=F["stroke"], width=1)
    tots = [("إجمالي الأصناف", "0.00", F["text"]), ("الخصم الكلي", "0.00", F["red"]),
            ("الضريبة", "0.00", F["text_2"]), ("عدد الأصناف", "0", F["text"])]
    tw_ = TOT_W - 16
    for i, (lbl, val, col) in enumerate(tots):
        sx1 = tot_x1 - 8 - i * (tw_ / 4)
        sx0 = sx1 - tw_ / 4 + 6
        T(img, ((sx0 + sx1) / 2, r3_y0 + 16), lbl, size=8.5, w=600,
          fill=F["text_3"], anchor="mm")
        TL(img, ((sx0 + sx1) / 2, r3_y0 + 34), val, size=12, w=800,
           fill=col, anchor="mm")
    due_y0 = r3_y0 + 50
    due_y1 = r3_y1 - 8
    grad_box(img, [tot_x0 + 8, due_y0, tot_x1 - 8, due_y1], 7,
             F["accent_h"], F["accent_d"])
    d = ImageDraw.Draw(img)
    T(img, (tot_x1 - 18, due_y0 + 15), "المطلوب دفعه", size=10, w=600,
      fill="#d9ecfb", anchor="rm")
    TL(img, (tot_x1 - 18, due_y1 - 16), "0.00", size=21, w=900,
       fill="#ffffff", anchor="rm")

    # ============ شريط الحالة ============
    st_y = AY1 - ST_H
    rr(d, [AX0 + 1, st_y, AX1 - 1, AY1 - 1], 8, fill="#f4f8fd")
    d.rectangle([S(AX0 + 1), S(st_y), S(AX1 - 1), S(st_y + 7)], fill="#f4f8fd")
    d.line([(S(AX0 + 1), S(st_y)), (S(AX1 - 1), S(st_y))], fill=F["stroke"], width=1)
    sx = AX1 - 12
    for k, lbl in [("F10", "طباعة"), ("F8", "صنف جديد"), ("F4", "بحث عميل"),
                   ("F3", "بحث صنف"), ("F2", "حفظ")]:
        wl = tw(lbl, 9.5, 600)
        T(img, (sx, st_y + ST_H / 2), lbl, size=9.5, w=600, fill=F["text_2"])
        sx -= wl + 5
        kx1 = sx
        kx0 = kx1 - (tlw(k, 8.5, 700) + 9)
        rr(d, [kx0, st_y + 6, kx1, st_y + ST_H - 6], 4, fill="#ffffff",
           outline=F["stroke_2"], width=1)
        TL(img, ((kx0 + kx1) / 2, st_y + ST_H / 2), k, size=8.5, w=700,
           fill=F["text_2"], anchor="mm")
        sx = kx0 - 12
    T(img, (AX0 + 14, st_y + ST_H / 2), "الكاشير: FATORA", size=9.5, w=600,
      fill=F["text_2"], anchor="lm")

    out_img = img.resize((W, H), Image.LANCZOS)
    path = os.path.join(ROOT, "designs", out)
    out_img.save(path, optimize=True)
    print("saved:", path, out_img.size)
    return path


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "sales-win11-blue.png")
