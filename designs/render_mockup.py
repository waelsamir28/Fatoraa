"""
رسم شاشة المبيعات كصورة PNG عالية الدقة (1920×1200 ثم تصغير).

- النص العربي: artext.ArabicText (HarfBuzz + FreeType + bidi) — تشكيل صحيح
  بدون أي تحويل لأشكال العرض اللي مش موجودة في خط Cairo.
- الأيقونات: مرسومة بالكود (مفيش إيموجي، لأن Cairo مالوش جلايفات إيموجي).
- كل النصوص مأخوذة حرفياً من src/components/invoice/InvoiceEditor.tsx
  (انظر designs/sales-elements.txt).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artext import ArabicText  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = os.path.join(ROOT, "public", "fonts", "cairo-variable.ttf")
LOGO_PATH = os.path.join(ROOT, "public", "images", "mock-logo.png")

AT = ArabicText(FONT_PATH)

# ---------- الألوان ----------
C = {
    "blue": "#1d6ff2", "blue_l": "#2f8bff", "blue_d": "#0e4494",
    "navy": "#0b2545", "navy2": "#08243d", "navy3": "#12406f",
    "line": "#dbe7f5", "line2": "#c7dbf0",
    "page": "#eaf1f9", "surface": "#ffffff", "surface2": "#f6fafe",
    "amber": "#ffd83d", "amber_l": "#ffe97a", "amber_line": "#e8c25a",
    "green": "#0f8a4d", "green_l": "#17ae66",
    "red": "#c8382f", "ink2": "#274b74", "ink3": "#6b82a3",
    "rail1": "#10508f",
}

SS = 2                    # مضاعف الدقة
W, H = 1920, 1200         # المقاس المنطقي


def S(v):
    return int(round(v * SS))


# ======================================================================
# أدوات رسم
# ======================================================================
def rr(d, box, r=8, fill=None, outline=None, width=1):
    d.rounded_rectangle([S(box[0]), S(box[1]), S(box[2]), S(box[3])],
                        radius=S(r) or 1, fill=fill, outline=outline, width=S(width) or 1)


def vgrad(size, c1, c2, horizontal=False):
    w, h = size
    n = w if horizontal else h
    a = tuple(int(c1[i:i + 2], 16) for i in (1, 3, 5))
    b = tuple(int(c2[i:i + 2], 16) for i in (1, 3, 5))
    if n <= 1:
        return Image.new("RGB", (max(1, w), max(1, h)), a)
    base = Image.new("RGB", (n, 1) if horizontal else (1, n))
    px = base.load()
    for i in range(n):
        t = i / (n - 1)
        col = tuple(int(a[j] + (b[j] - a[j]) * t) for j in range(3))
        if horizontal:
            px[i, 0] = col
        else:
            px[0, i] = col
    return base.resize((w, h), Image.BILINEAR)


def grad_box(img, box, r, c1, c2, outline=None, ow=1, horizontal=False):
    x0, y0, x1, y1 = [S(v) for v in box]
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        return
    g = vgrad((w, h), c1, c2, horizontal)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=S(r) or 1, fill=255)
    img.paste(g, (x0, y0), mask)
    if outline:
        ImageDraw.Draw(img).rounded_rectangle([x0, y0, x1, y1], radius=S(r) or 1,
                                              outline=outline, width=S(ow) or 1)


def T(img, xy, s, size=12, w=700, fill="#0b2545", anchor="rm"):
    """نص عربي — إحداثيات منطقية"""
    AT.draw(img, (S(xy[0]), S(xy[1])), s, size=size * SS, weight=w, fill=fill, anchor=anchor)


def TL(img, xy, s, size=12, w=700, fill="#0b2545", anchor="lm"):
    """نص لاتيني/أرقام — اتجاه LTR إجباري (بدون bidi)"""
    AT.draw_ltr(img, (S(xy[0]), S(xy[1])), s, size=size * SS, weight=w, fill=fill, anchor=anchor)


def tlw(s, size=12, w=700):
    return AT.measure_ltr(s, size * SS, w) / SS


def tw(s, size=12, w=700):
    """عرض النص بالوحدات المنطقية"""
    return AT.measure(s, size * SS, w) / SS


# ======================================================================
# أيقونات مرسومة
# ======================================================================
def icon(d, name, cx, cy, sz=16, color="#ffffff", lw=1.8):
    """أيقونة خطية بسيطة — كل المقاسات منطقية"""
    def L(pts):
        d.line([(S(x), S(y)) for x, y in pts], fill=color, width=S(lw) or 1, joint="curve")

    def E(box, fill=None, outline=None):
        d.ellipse([S(box[0]), S(box[1]), S(box[2]), S(box[3])],
                  fill=fill, outline=outline, width=S(lw) or 1)

    h = sz / 2.0
    x0, y0, x1, y1 = cx - h, cy - h, cx + h, cy + h
    if name == "home":
        L([(x0, cy), (cx, y0), (x1, cy), (x1, y1), (x0, y1), (x0, cy)])
        L([(cx - h * 0.32, y1), (cx - h * 0.32, cy + h * 0.12),
           (cx + h * 0.32, cy + h * 0.12), (cx + h * 0.32, y1)])
    elif name == "menu":
        for i, fy in enumerate((y0 + h * 0.25, cy, y1 - h * 0.25)):
            L([(x0, fy), (x1, fy)])
    elif name == "cart":
        L([(x0, y0 + h * 0.1), (x0 + h * 0.42, y0 + h * 0.1),
           (x0 + h * 0.85, y1 - h * 0.55), (x1, y1 - h * 0.55)])
        L([(x0 + h * 0.55, y0 + h * 0.42), (x1 - h * 0.05, y0 + h * 0.42)])
        E([cx - h * 0.75, y1 - h * 0.18, cx - h * 0.28, y1 + h * 0.29], fill=color)
        E([cx + h * 0.15, y1 - h * 0.18, cx + h * 0.62, y1 + h * 0.29], fill=color)
    elif name == "box":
        L([(cx, y0), (x1, cy - h * 0.35), (x1, y1 - h * 0.25), (cx, y1),
           (x0, y1 - h * 0.25), (x0, cy - h * 0.35), (cx, y0)])
        L([(x0, cy - h * 0.35), (cx, cy + h * 0.15), (x1, cy - h * 0.35)])
        L([(cx, cy + h * 0.15), (cx, y1)])
    elif name == "layers":
        for k in range(2):
            oy = y0 + k * h * 0.62
            L([(cx, oy), (x1, oy + h * 0.42), (cx, oy + h * 0.84), (x0, oy + h * 0.42), (cx, oy)])
    elif name == "gear":
        E([x0 + h * 0.15, y0 + h * 0.15, x1 - h * 0.15, y1 - h * 0.15], outline=color)
        E([cx - h * 0.28, cy - h * 0.28, cx + h * 0.28, cy + h * 0.28], outline=color)
        for ang in range(0, 360, 45):
            import math
            a = math.radians(ang)
            L([(cx + math.cos(a) * h * 0.82, cy + math.sin(a) * h * 0.82),
               (cx + math.cos(a) * h * 1.02, cy + math.sin(a) * h * 1.02)])
    elif name == "undo":
        d.arc([S(x0), S(y0), S(x1), S(y1)], start=200, end=20, fill=color, width=S(lw) or 1)
        L([(x0 + h * 0.02, cy - h * 0.42), (x0 - h * 0.28, cy + h * 0.02), (x0 + h * 0.28, cy + h * 0.2)])
    elif name == "eraser":
        L([(x0 + h * 0.3, y1), (x0, y1 - h * 0.3), (cx + h * 0.2, y0), (x1, y0 + h * 0.4),
           (x0 + h * 0.3, y1)])
        L([(cx - h * 0.2, y0 + h * 0.35), (cx + h * 0.85, y1 - h * 0.25)])
    elif name == "trash":
        L([(x0 + h * 0.1, y0 + h * 0.28), (x1 - h * 0.1, y0 + h * 0.28)])
        L([(cx - h * 0.22, y0), (cx + h * 0.22, y0)])
        L([(x0 + h * 0.25, y0 + h * 0.28), (x0 + h * 0.4, y1), (x1 - h * 0.4, y1),
           (x1 - h * 0.25, y0 + h * 0.28)])
        L([(cx - h * 0.2, y0 + h * 0.5), (cx - h * 0.15, y1 - h * 0.2)])
        L([(cx + h * 0.2, y0 + h * 0.5), (cx + h * 0.15, y1 - h * 0.2)])
    elif name == "printer":
        rr(d, [cx - h * 0.45, y0, cx + h * 0.45, y0 + h * 0.5], 1, outline=color, width=lw)
        rr(d, [x0, y0 + h * 0.42, x1, y1 - h * 0.25], 2, outline=color, width=lw)
        rr(d, [cx - h * 0.45, y1 - h * 0.5, cx + h * 0.45, y1], 1, outline=color, width=lw)
        d.ellipse([S(x1 - h * 0.35), S(y0 + h * 0.58), S(x1 - h * 0.15), S(y0 + h * 0.78)], fill=color)
    elif name == "phone":
        d.rounded_rectangle([S(cx - h * 0.28), S(y0), S(cx + h * 0.28), S(y1)],
                            radius=S(h * 0.22), outline=color, width=S(lw) or 1)
        d.ellipse([S(cx - h * 0.07), S(y1 - h * 0.28), S(cx + h * 0.07), S(y1 - h * 0.14)], fill=color)
    elif name == "search":
        E([x0, y0, cx + h * 0.15, cy + h * 0.15], outline=color)
        L([(cx + h * 0.18, cy + h * 0.18), (x1, y1)])
    elif name == "save":
        rr(d, [x0, y0, x1, y1], 2, outline=color, width=lw)
        rr(d, [cx - h * 0.42, y0, cx + h * 0.42, cy - h * 0.1], 1, outline=color, width=lw)
        rr(d, [cx - h * 0.55, cy + h * 0.3, cx + h * 0.55, y1], 1, outline=color, width=lw)
    elif name == "plus":
        L([(cx, y0), (cx, y1)])
        L([(x0, cy), (x1, cy)])
    elif name == "chev":
        L([(cx - h * 0.55, cy - h * 0.2), (cx, cy + h * 0.3), (cx + h * 0.55, cy - h * 0.2)])
    elif name == "print2":
        icon(d, "printer", cx, cy, sz, color, lw)
    elif name == "user":
        E([cx - h * 0.38, y0 + h * 0.05, cx + h * 0.38, y0 + h * 0.81], outline=color)
        d.arc([S(x0 + h * 0.05), S(cy + h * 0.15), S(x1 - h * 0.05), S(y1 + h * 1.1)],
              start=180, end=360, fill=color, width=S(lw) or 1)
    elif name == "wallet":
        rr(d, [x0, cy - h * 0.55, x1, cy + h * 0.55], 2, outline=color, width=lw)
        L([(x0, cy - h * 0.15), (x1, cy - h * 0.15)])
        d.ellipse([S(cx + h * 0.25), S(cy - h * 0.08), S(cx + h * 0.55), S(cy + h * 0.22)], fill=color)
    elif name == "close":
        L([(x0 + h * 0.25, y0 + h * 0.25), (x1 - h * 0.25, y1 - h * 0.25)])
        L([(x1 - h * 0.25, y0 + h * 0.25), (x0 + h * 0.25, y1 - h * 0.25)])
    elif name == "min":
        L([(x0 + h * 0.2, cy), (x1 - h * 0.2, cy)])
    elif name == "max":
        rr(d, [x0 + h * 0.22, y0 + h * 0.22, x1 - h * 0.22, y1 - h * 0.22], 1, outline=color, width=lw)
    elif name == "chevdown":
        L([(cx - h * 0.5, cy - h * 0.18), (cx, cy + h * 0.32), (cx + h * 0.5, cy - h * 0.18)])
    elif name == "grid":
        for gx in (0, 1):
            for gy in (0, 1):
                rr(d, [x0 + gx * h * 0.98, y0 + gy * h * 0.98,
                       x0 + gx * h * 0.98 + h * 0.68, y0 + gy * h * 0.98 + h * 0.68],
                   1, outline=color, width=lw)
    elif name == "cards":
        for k in (0, 1):
            rr(d, [x0, y0 + k * h * 0.85, x1, y0 + k * h * 0.85 + h * 0.6],
               1.5, outline=color, width=lw)


def labeled(img, d, cx, cy, label, size=12, w=900, color="#0b2545",
            icon_name=None, icon_sz=None, gap=7, lw=None):
    """نص بوسط أفقي cx، مع أيقونة على يمينه (اتجاه عربي). يرجّع العرض الكلي."""
    lw_ = tw(label, size, w)
    isz = icon_sz if icon_sz else size * 1.05
    if not icon_name:
        T(img, (cx, cy), label, size=size, w=w, fill=color, anchor="mm")
        return lw_
    total = lw_ + gap + isz
    x0 = cx - total / 2.0
    # الأيقونة على اليمين (بداية القراءة)
    icon(d, icon_name, x0 + total - isz / 2.0, cy, isz, color, lw or max(1.5, isz / 8.0))
    T(img, (x0 + total - isz - gap, cy), label, size=size, w=w, fill=color, anchor="rm")
    return total


# ======================================================================
# البناء
# ======================================================================
def build():
    img = Image.new("RGB", (W * SS, H * SS), "#b9c9dc")
    d = ImageDraw.Draw(img)

    # ---------- هالة خلفية للنافذة ----------
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [S(30), S(28), S(W - 26), S(H - 22)], radius=S(16), fill=(10, 30, 55, 90))
    img.paste(shadow.filter(ImageFilter.GaussianBlur(S(10))), (0, 0), shadow)
    d = ImageDraw.Draw(img)

    AX0, AY0, AX1, AY1 = 34, 30, W - 34, H - 26
    rr(d, [AX0, AY0, AX1, AY1], 14, fill=C["page"], outline="#a9bed6", width=1)

    # ---------- شريط العنوان ----------
    TB = 46
    tbg = vgrad((S(AX1 - AX0), S(TB)), "#11529a", "#08243d")
    m = Image.new("L", (S(AX1 - AX0), S(TB)), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, S(AX1 - AX0) - 1, S(TB) - 1], radius=S(14), fill=255)
    ImageDraw.Draw(m).rectangle([0, S(TB) // 2, S(AX1 - AX0), S(TB)], fill=255)
    img.paste(tbg, (S(AX0), S(AY0)), m)

    logo = Image.open(LOGO_PATH).convert("RGBA")
    lg = logo.resize((S(30), S(30)), Image.LANCZOS)
    img.paste(lg, (S(AX1 - 46), S(AY0 + 8)), lg)
    T(img, (AX1 - 58, AY0 + TB / 2), "فواتير مبيعات", size=14, w=800,
      fill="#e6f1ff", anchor="rm")
    T(img, (AX1 - 58 - tw("فواتير مبيعات", 14, 800) - 8, AY0 + TB / 2), "FATORA", size=11.5, w=900,
      fill="#7fa9db", anchor="rm")

    # أزرار النافذة
    for i, (nm, col) in enumerate([("close", "#c93a30"), ("max", "#1b4571"), ("min", "#1b4571")]):
        bx = AX0 + 14 + i * 36
        rr(d, [bx, AY0 + 12, bx + 28, AY0 + 34], 6, fill=col)
        icon(d, nm, bx + 14, AY0 + 23, 9, "#d6e6ff", 1.6)

    BY0 = AY0 + TB
    BY1 = AY1

    # ---------- الأعمدة ----------
    RAIL_W, LEFT_W, CUST_W = 78, 324, 306
    rail_x0 = AX1 - RAIL_W
    cust_x1, cust_x0 = rail_x0, rail_x0 - CUST_W
    left_x0, left_x1 = AX0, AX0 + LEFT_W
    mid_x0, mid_x1 = left_x1, cust_x0

    # الشريط الأيقوني
    railg = vgrad((S(RAIL_W), S(BY1 - BY0)), C["rail1"], C["navy2"])
    rm = Image.new("L", (S(RAIL_W), S(BY1 - BY0)), 0)
    ImageDraw.Draw(rm).rounded_rectangle([0, 0, S(RAIL_W) - 1, S(BY1 - BY0) - 1], radius=S(14), fill=255)
    ImageDraw.Draw(rm).rectangle([0, 0, S(RAIL_W), S(20)], fill=255)
    img.paste(railg, (S(rail_x0), S(BY0)), rm)
    d = ImageDraw.Draw(img)

    rl = logo.resize((S(44), S(44)), Image.LANCZOS)
    img.paste(rl, (S(rail_x0 + (RAIL_W - 44) / 2), S(BY0 + 14)), rl)

    nav = [("home", False), ("menu", False), ("cart", True), ("box", False),
           ("layers", False), ("gear", False)]
    iy = BY0 + 74
    for i, (nm, on) in enumerate(nav):
        bx0 = rail_x0 + (RAIL_W - 48) / 2
        by0 = iy + i * 54
        if on:
            grad_box(img, [bx0, by0, bx0 + 48, by0 + 46], 11, C["blue_l"], C["blue"],
                     outline="#1450b8", ow=1)
        else:
            rr(d, [bx0, by0, bx0 + 48, by0 + 46], 11, fill="#174170")
        icon(d, nm, bx0 + 24, by0 + 23, 20, "#ffffff" if on else "#9dc0e8", 1.9)

    # خلفيات الجانبين
    d.rectangle([S(cust_x0), S(BY0), S(cust_x1), S(BY1)], fill=C["surface2"])
    d.rectangle([S(left_x0), S(BY0), S(left_x1), S(BY1)], fill=C["surface2"])
    d.line([(S(cust_x0), S(BY0)), (S(cust_x0), S(BY1))], fill=C["line"], width=S(1))
    d.line([(S(left_x1), S(BY0)), (S(left_x1), S(BY1))], fill=C["line"], width=S(1))

    def card(box, r=12):
        rr(d, box, r, fill=C["surface"], outline=C["line"], width=1)

    def card_head(x0, x1, y, title, ic=None):
        T(img, (x1 - 12, y), title, size=11, w=800, fill=C["ink3"], anchor="rm")
        wtext = tw(title, 11, 800)
        lx = x1 - 12 - wtext - 9
        if ic:
            icon(d, ic, lx - 8, y, 11, C["ink3"], 1.5)
            lx -= 18
        d.line([(S(x0 + 12), S(y)), (S(lx), S(y))], fill=C["line"], width=S(1))

    # ================================================================
    # العمود الأيمن — العميل
    # ================================================================
    px0, px1 = cust_x0 + 12, cust_x1 - 12
    py = BY0 + 12
    CW = px1 - px0

    # --- كارت العميل ---
    ch = 104
    card([px0, py, px1, py + ch])
    card_head(px0, px1, py + 20, "العميل", "user")
    av = 42
    ax = px1 - 14 - av
    grad_box(img, [ax, py + 42, ax + av, py + 42 + av], av / 2, "#2f8bff", "#0e4494",
             outline="#0b3d78", ow=1)
    T(img, (ax + av / 2, py + 42 + av / 2), "ع", size=16, w=900, fill="#ffffff", anchor="mm")
    T(img, (ax - 12, py + 60), "عميل نقدي", size=15, w=900, fill=C["navy"], anchor="rm")
    TL(img, (ax - 12, py + 84), "01000000000", size=11, w=700, fill=C["ink3"], anchor="rm")
    # زر تبديل
    rr(d, [px0 + 12, py + 44, px0 + 12 + 34, py + 88], 9, fill="#eef5fe", outline=C["line2"])
    icon(d, "chev", px0 + 29, py + 66, 12, C["ink2"], 1.7)
    py += ch + 10

    # --- رصيد العميل ---
    bh = 84
    grad_box(img, [px0, py, px1, py + bh], 12, "#fff3b0", "#ffd83d",
             outline=C["amber_line"], ow=1.5)
    T(img, (px1 - 14, py + 22), "رصيد العميل", size=12, w=900, fill="#5c4700", anchor="rm")
    TL(img, (px1 - 14, py + 58), "1,250.00", size=30, w=900, fill=C["navy"], anchor="rm")
    T(img, (px0 + 14, py + 58), "جنيه", size=12, w=800, fill="#7a5f00", anchor="lm")
    py += bh + 10

    # --- طريقة البيع ---
    pb = 244
    card([px0, py, px1, py + pb])
    card_head(px0, px1, py + 20, "طريقة البيع", "wallet")
    gx0, gx1 = px0 + 12, px1 - 12
    gap = 8
    half = (gx1 - gx0 - gap) / 2
    gy = py + 32

    def btn(box, label, c1=None, c2=None, fill=None, outline=None, tcol="#0b2545",
            size=13, w=900, ic=None):
        if c1:
            grad_box(img, box, 9, c1, c2, outline=outline, ow=1)
        else:
            rr(d, box, 9, fill=fill, outline=outline, width=1)
        cx = (box[0] + box[2]) / 2
        cyv = (box[1] + box[3]) / 2
        labeled(img, d, cx, cyv, label, size=size, w=w, color=tcol,
                icon_name=ic, icon_sz=size * 0.95, gap=6, lw=1.8)

    btn([gx0, gy, gx1, gy + 50], "نقدي", "#1cb06b", "#0c7a45", outline="#0a6b3c",
        tcol="#ffffff", size=15, w=900)
    gy += 50 + gap
    btn([gx0, gy, gx1, gy + 44], "أجل", "#ffeaa8", "#ffd05c", outline=C["amber_line"],
        tcol="#4a3600", size=13.5)
    gy += 44 + gap
    btn([gx1 - half, gy, gx1, gy + 44], "قطاعي", "#3f95f8", "#1d6ff2", outline="#1450b8",
        tcol="#ffffff", size=13)
    btn([gx0, gy, gx0 + half, gy + 44], "جملة", fill="#ffffff", outline=C["line2"],
        tcol=C["ink2"], size=13)
    gy += 44 + gap
    btn([gx1 - half, gy, gx1, gy + 42], "كشف حساب", fill="#ffffff", outline=C["line2"],
        tcol=C["ink2"], size=12)
    btn([gx0, gy, gx0 + half, gy + 42], "إضافة صنف", "#3f95f8", "#1d6ff2",
        outline="#1450b8", tcol="#ffffff", size=12, ic="plus")
    py += pb + 10

    # --- آخر العمليات ---
    lh = BY1 - py - 12
    if lh > 90:
        card([px0, py, px1, py + lh])
        card_head(px0, px1, py + 20, "آخر العمليات")
        rows = [("فاتورة #1042", "320.00", C["navy"]),
                ("فاتورة #1041", "185.50", C["navy"]),
                ("فاتورة #1040", "90.00", C["navy"]),
                ("مرتجع #1038", "-45.00", C["red"]),
                ("فاتورة #1037", "412.75", C["navy"]),
                ("فاتورة #1036", "78.00", C["navy"])]
        ry = py + 50
        for lbl, val, col in rows:
            if ry + 18 > py + lh - 8:
                break
            rr(d, [px0 + 10, ry - 14, px1 - 10, ry + 14], 7, fill="#f7fbff")
            T(img, (px1 - 18, ry), lbl, size=12, w=700, fill=C["ink2"], anchor="rm")
            TL(img, (px0 + 18, ry), val, size=12, w=900, fill=col, anchor="lm")
            ry += 34

    # ================================================================
    # العمود الأوسط
    # ================================================================
    mx0, mx1 = mid_x0 + 14, mid_x1 - 14
    my = BY0 + 12
    MW = mx1 - mx0

    # ---------- شريط الأدوات ----------
    th = 40
    tx = mx1
    tools = [("تراجع", "undo", False), ("مسح الأصل", "eraser", False),
             ("حذف", "trash", False), ("طباعة الفاتورة", "printer", True),
             ("واتساب", "phone", False)]
    for label, ic, primary in tools:
        bwid = tw(label, 12, 900) + 30 + 13 + 7
        box = [tx - bwid, my, tx, my + th]
        col = "#ffffff" if primary else (C["red"] if label == "حذف" else C["ink2"])
        if primary:
            grad_box(img, box, 9, "#2f8bff", "#1d6ff2", outline="#1450b8", ow=1)
        else:
            rr(d, box, 9, fill="#ffffff", outline=C["line2"])
        labeled(img, d, tx - bwid / 2, my + th / 2, label, size=12, w=900,
                color=col, icon_name=ic, icon_sz=13, lw=1.7)
        tx -= bwid + 7

    # ---------- بيانات الفاتورة ----------
    di_w = tx - mx0 - 10
    di_x = mx0
    rr(d, [di_x, my, di_x + di_w, my + th], 9, fill="#ffffff", outline=C["line"])
    # شارة جديدة
    badge_w = 62
    rr(d, [di_x + 10, my + 8, di_x + 10 + badge_w, my + th - 8], 99, fill="#dff5e9")
    T(img, (di_x + 10 + badge_w / 2, my + th / 2), "جديدة", size=10.5, w=900,
      fill="#0a6b3c", anchor="mm")
    cw_start = di_x + 10 + badge_w + 12
    T(img, (cw_start, my + th / 2), "فاتورة رقم #1043", size=12.5, w=900,
      fill=C["navy"], anchor="lm")
    # التاريخ والوقت على اليسار
    time_w = tw("02:41 م", 11.5, 800)
    date_w = tlw("2026/11/17", 11.5, 800)
    TL(img, (di_x + di_w - 14, my + th / 2), "2026/11/17", size=11.5, w=800,
       fill=C["ink2"], anchor="rm")
    T(img, (di_x + di_w - 22 - date_w, my + th / 2), "02:41 م", size=11.5, w=800,
      fill=C["ink3"], anchor="rm")
    my += th + 12

    # ---------- البحث ----------
    sh = 66
    rr(d, [mx0, my, mx1, my + sh], 13, fill="#ffffff", outline=C["line"])
    fx = mx1 - 10
    sq = 46
    # زر +
    box = [fx - sq, my + 10, fx, my + 10 + sq]
    grad_box(img, box, 10, "#3f95f8", "#1d6ff2", outline="#1450b8", ow=1)
    icon(d, "plus", box[0] + sq / 2, box[1] + sq / 2, 19, "#ffffff", 2.3)
    fx -= sq + 9
    # شرائح أصناف / كمية
    for plabel, pval in [("كمية", "12"), ("أصناف", "12")]:
        pw = max(tw(plabel, 12, 900) + tw(pval, 17, 900), 12) + 26
        box = [fx - pw, my + 10, fx, my + 10 + sq]
        grad_box(img, box, 10, "#2f8bff", "#1155c0", outline="#0d4099", ow=1)
        T(img, (box[0] + pw / 2, my + 10 + 13), plabel, size=11.5, w=800,
          fill="#cfe3ff", anchor="mm")
        TL(img, (box[0] + pw / 2, my + 10 + 31), pval, size=16, w=900,
           fill="#ffffff", anchor="mm")
        fx -= pw + 9
    # شرائح
    for label, on, icv in [("بالكود", False, None), ("بالاسم", True, None),
                           ("كل المجموعات والأقسام", True, "chevdown")]:
        cwid = tw(label, 12.5, 900) + 26 + (11 + 7 if icv else 0)
        box = [fx - cwid, my + 10, fx, my + 10 + sq]
        rr(d, box, 10, fill="#e8f1fe" if on else "#ffffff",
           outline=C["blue"] if on else C["line2"], width=1)
        tcol = C["blue_d"] if on else C["ink2"]
        labeled(img, d, fx - cwid / 2, my + 10 + sq / 2, label, size=12.5, w=900,
                color=tcol, icon_name=icv, icon_sz=11, gap=7, lw=1.7)
        fx -= cwid + 9
    # حقل البحث
    sbox = [mx0 + 10, my + 10, fx - 6, my + 10 + sq]
    rr(d, sbox, 10, fill="#f5f9fe", outline=C["line2"], width=2)
    icon(d, "search", sbox[0] + 26, my + 10 + sq / 2, 17, "#8aa6c6", 1.8)
    T(img, (sbox[0] + 46, my + 10 + sq / 2), "اكتب اسم الصنف أو الباركود (F3 للبحث)...",
      size=13.5, w=600, fill="#9db3cd", anchor="lm")
    my += sh + 12

    # ---------- صف الإدخال السريع ----------
    eh = 66
    rr(d, [mx0, my, mx1, my + eh], 12, fill="#ffffff", outline=C["line"])
    # العمود المرن: الصنف + placeholder
    fld = [mx0 + 8, my + 8, mx1 - 8, my + eh - 8]
    right_x = fld[2]
    # الصنف (مرن — ياخد كل المساحة الفاضلة)
    small_tot = 92 + 78 + 82 + 92 + 4 * 6 + 34 + 6
    name_fw = (fld[2] - fld[0]) - small_tot
    rr(d, [right_x - name_fw, fld[1], right_x, fld[3]], 8, fill="#f9fcff", outline=C["line2"])
    T(img, (right_x - 10, fld[1] + 14), "الصنف", size=10.5, w=800, fill=C["ink3"], anchor="rm")
    T(img, (right_x - 10, fld[1] + 38), "اكتب اسم الصنف أو الباركود (F3 للبحث)...",
      size=11.5, w=700, fill="#9db3cd", anchor="rm")
    right_x -= name_fw + 6
    # خانات صغيرة: سعر الوحدة / كمية / الخصم / القيمة
    small_fields = [("سعر الوحدة", "48.00", 92), ("كمية", "2", 78),
                    ("الخصم", "0.00", 82), ("القيمة", "96.00", 92)]
    for lbl, val, fw in small_fields:
        rr(d, [right_x - fw, fld[1], right_x, fld[3]], 8, fill="#f9fcff", outline=C["line2"])
        T(img, (right_x - 8, fld[1] + 14), lbl, size=10, w=800, fill=C["ink3"], anchor="rm")
        TL(img, (right_x - 8, fld[1] + 38), val, size=13, w=900,
           fill=C["red"] if lbl == "الخصم" else (C["blue_d"] if lbl == "القيمة" else C["navy"]),
           anchor="rm")
        right_x -= fw + 6
    # زر + الإضافة
    if right_x - 34 > mx0 + 8:
        grad_box(img, [right_x - 34, fld[1], right_x, fld[3]], 8, "#3f95f8", "#1d6ff2",
                 outline="#1450b8", ow=1)
        icon(d, "plus", right_x - 17, (fld[1] + fld[3]) / 2, 17, "#ffffff", 2.3)
    my += eh + 8

    # ---------- الشريط الوردي (بيانات الصنف المحدد) ----------
    pbh = 34
    rr(d, [mx0, my, mx1, my + pbh], 9, fill="#ffe8f2", outline="#f6bcd8")
    pinfo = [("الرصيد", "24.0"), ("سعر الشراء", "38.00"), ("سعر الجملة", "44.00"),
             ("سعر البيع", "48.00"), ("ربح الوحدة", "10.00")]
    seg_w = (mx1 - mx0 - 20) / len(pinfo)
    for i, (lbl, val) in enumerate(pinfo):
        cxv = mx1 - 10 - seg_w * (i + 0.5)
        T(img, (cxv, my + 12), lbl, size=10, w=800, fill="#9d2f63", anchor="mm")
        TL(img, (cxv, my + 25), val, size=11.5, w=900, fill="#7a1f4d", anchor="mm")
        if i:
            d.line([(S(cxv + seg_w / 2), S(my + 7)), (S(cxv + seg_w / 2), S(my + pbh - 7))],
                   fill="#f0a8c8", width=S(1))
    my += pbh + 10

    # ---------- الجدول ----------
    totals_h = 84
    tbl_y1 = BY1 - 12 - totals_h - 12
    rr(d, [mx0, my, mx1, tbl_y1], 13, fill="#ffffff", outline=C["line"])

    THB = 30
    rr(d, [mx0, my, mx1, my + THB], 10, fill="#0e2f5c")
    T(img, (mx1 - 14, my + THB / 2), "الأصناف (12)", size=11.5, w=800,
      fill="#cfe2f8", anchor="rm")
    for k2, (vlbl, von) in enumerate([("كروت", False), ("جدول", True)]):
        vx = mx0 + 10 + k2 * (52 + 4)
        rr(d, [vx, my + 5, vx + 52, my + THB - 5], 6,
           fill="#2f7fe0" if not von else "#ffffff",
           outline="#ffffff" if not von else "#93b8e6", width=1)
        T(img, (vx + 26, my + THB / 2), vlbl, size=10.5, w=900,
          fill="#ffffff" if not von else "#0e2f5c", anchor="mm")
    my += THB + 8

    HH = 50
    grad_box(img, [mx0, my, mx1, my + HH], 13, "#2f8bff", "#0e4494")
    d.rectangle([S(mx0), S(my + HH - 14), S(mx1), S(my + HH)], fill="#0e4494")
    d.rectangle([S(mx0), S(my + HH - 3), S(mx1), S(my + HH)], fill="#0d3f88")

    headers = ["م", "اسم الصنف والبيان", "العبوة", "الكمية", "سعر الوحدة",
               "الخصم", "الإجمالي", "حذف"]
    # 0=م 1=الاسم(مرن) 2=العبوة 3=الكمية 4=سعر الوحدة 5=الخصم 6=الإجمالي 7=حذف
    NUM_W = 46
    fixed = [92, 100, 118, 104, 128, 54]
    name_w = (mx1 - mx0) - NUM_W - sum(fixed)
    widths = [NUM_W, name_w] + fixed
    cx = mx1
    cols = []
    for i, h_ in enumerate(headers):
        w_ = widths[i]
        cols.append((cx - w_, cx))
        if i == 1:
            T(img, (cx - 16, my + HH / 2 - 3), h_, size=12.5, w=900, fill="#ffffff", anchor="rm")
        elif i == len(headers) - 1:
            icon(d, "trash", cx - w_ / 2, my + HH / 2 - 3, 15, "#ffffff", 1.8)
        else:
            T(img, (cx - w_ / 2, my + HH / 2 - 3), h_, size=12.5, w=900,
              fill="#ffffff", anchor="mm")
        if i > 0:
            d.line([(S(cx - w_), S(my + 10)), (S(cx - w_), S(my + HH - 12))],
                   fill="#2f7fe0", width=S(1))
        cx -= w_

    data = [
        ("شاي العروسة 250 جرام", "علبة", "2", "48.00", "0.00", "96.00"),
        ("سكر الأسرة 1 كجم", "كيس", "3", "32.50", "5.00", "92.50"),
        ("زيت عافية 1 لتر", "زجاجة", "1", "89.00", "0.00", "89.00"),
        ("أرز مصري فاخر 5 كجم", "شيكارة", "1", "210.00", "10.00", "200.00"),
        ("لبن جهينة 1 لتر", "كرتونة", "6", "38.00", "0.00", "228.00"),
        ("مكرونة الملكة 400 جم", "كيس", "4", "14.00", "0.00", "56.00"),
        ("جبنة بيضاء كيلو", "كيلو", "1", "120.00", "0.00", "120.00"),
        ("صابون سائل 1 لتر", "زجاجة", "2", "45.00", "5.00", "85.00"),
        ("مياه معدنية 1.5 لتر", "كرتونة", "2", "26.00", "0.00", "52.00"),
        ("نسكافيه كلاسيك 200 جم", "برطمان", "1", "185.00", "0.00", "185.00"),
        ("دقيق فاخر 1 كجم", "كيس", "3", "22.00", "0.00", "66.00"),
        ("سمن روابي 2 كجم", "علبة", "1", "340.00", "15.00", "325.00"),
    ]
    RH = 46
    ry = my + HH
    while ry + RH <= tbl_y1:
        r = int((ry - my - HH) // RH)
        if r % 2 == 0:
            d.rectangle([S(mx0 + 1), S(ry), S(mx1 - 1), S(ry + RH)], fill="#f7fbff")
        if r < len(data):
            nm, pkg, qty, price, disc, tot = data[r]
            TL(img, (cols[0][0] + widths[0] / 2, ry + RH / 2), str(r + 1), size=11.5,
               w=800, fill=C["ink3"], anchor="mm")
            T(img, (cols[1][1] - 14, ry + RH / 2), nm, size=13, w=800, fill=C["navy"], anchor="rm")
            T(img, (cols[2][0] + widths[2] / 2, ry + RH / 2), pkg, size=12, w=700,
              fill=C["ink3"], anchor="mm")
            TL(img, (cols[3][0] + widths[3] / 2, ry + RH / 2), qty, size=13, w=800,
               fill=C["ink2"], anchor="mm")
            TL(img, (cols[4][0] + widths[4] / 2, ry + RH / 2), price, size=13, w=800,
               fill=C["ink2"], anchor="mm")
            TL(img, (cols[5][0] + widths[5] / 2, ry + RH / 2), disc, size=13, w=800,
               fill=C["ink3"] if disc == "0.00" else C["red"], anchor="mm")
            TL(img, (cols[6][0] + widths[6] / 2, ry + RH / 2), tot, size=13.5, w=900,
               fill=C["navy"], anchor="mm")
            icon(d, "trash", cols[7][0] + widths[7] / 2, ry + RH / 2, 14, "#c8382f", 1.7)
        d.line([(S(mx0 + 1), S(ry + RH)), (S(mx1 - 1), S(ry + RH))],
               fill="#edf3fa", width=S(1))
        ry += RH

    # ---------- شريط الإجماليات ----------
    ty = tbl_y1 + 12
    rr(d, [mx0, ty, mx1, ty + totals_h], 13, fill="#ffffff", outline=C["line"])
    tots = [("عدد الأصناف", "12", C["navy"]), ("إجمالي الأصناف", "1,594.50", C["navy"]),
            ("الخصومات", "-30.00", C["red"]), ("خصم إضافي", "-0.00", C["ink3"]),
            ("الضريبة (0%)", "0.00", C["ink3"])]
    txx = mx1 - 20
    for k, v, col in tots:
        T(img, (txx, ty + 26), k, size=11, w=800, fill=C["ink3"], anchor="rm")
        TL(img, (txx, ty + 56), v, size=17, w=900, fill=col, anchor="rm")
        txx -= 122
    gw = 300
    grad_box(img, [mx0 + 12, ty + 12, mx0 + 12 + gw, ty + totals_h - 12], 11,
             C["navy3"], C["navy2"])
    T(img, (mx0 + 12 + gw - 20, ty + totals_h / 2), "الصافي المطلوب", size=13, w=800,
      fill="#a9caee", anchor="rm")
    TL(img, (mx0 + 30, ty + totals_h / 2), "1,564.50", size=29, w=900, fill="#ffffff", anchor="lm")

    # ================================================================
    # العمود الأيسر — الدفع
    # ================================================================
    lx0, lx1 = left_x0 + 12, left_x1 - 12
    ly = BY0 + 12
    LW = lx1 - lx0

    # --- المطلوب دفعه ---
    dh = 128
    card([lx0, ly, lx1, ly + dh])
    card_head(lx0, lx1, ly + 20, "طريقة الدفع", "wallet")
    due = [lx0 + 12, ly + 32, lx1 - 12, ly + dh - 12]
    grad_box(img, due, 12, "#f3f9ff", "#e2effd", outline="#b9d5f4", ow=1.5)
    T(img, ((due[0] + due[2]) / 2, due[1] + 26), "المطلوب دفعه",
      size=11.5, w=900, fill=C["ink2"], anchor="mm")
    TL(img, ((due[0] + due[2]) / 2, due[1] + 60), "1,564.50", size=27, w=900,
       fill=C["blue_d"], anchor="mm")
    ly += dh + 10

    # --- الكيبورد ---
    _KH = 14 + 4 * 40 + 3 * 7 + 9 + 40 + 14   # = 278
    card([lx0, ly, lx1, ly + _KH])
    keys = ["7", "8", "9", "مسح", "4", "5", "6", "الكل", "1", "2", "3", "0"]
    kgap = 7
    kw = (LW - 24 - 3 * kgap) / 4
    kx_start = lx1 - 12
    ky0 = ly + 14
    key_h = 40
    for idx, k in enumerate(keys):
        r_, c_ = divmod(idx, 4)
        bx = kx_start - (c_ + 1) * kw - c_ * kgap
        by = ky0 + r_ * (key_h + kgap)
        fn = k in ("مسح", "الكل")
        rr(d, [bx, by, bx + kw, by + key_h], 9,
           fill="#e8f1fe" if fn else "#f6faff", outline=C["line2"])
        T(img, (bx + kw / 2, by + key_h / 2), k, size=17 if not fn else 12.5, w=900,
          fill=C["blue_d"] if fn else C["navy"], anchor="mm")
    by = ky0 + 3 * (key_h + kgap) + key_h + kgap
    grad_box(img, [lx0 + 12, by + 4, lx1 - 12, by + 4 + 40], 9, "#1cb06b", "#0c7a45",
             outline="#0a6b3c", ow=1)
    labeled(img, d, (lx0 + lx1) / 2, by + 24, "دفع المبلغ كاملاً", size=13, w=900,
            color="#ffffff", icon_name="wallet", icon_sz=15, gap=7, lw=1.7)
    ly += _KH + 10

    # --- خصم إضافي ---
    xh = 104
    card([lx0, ly, lx1, ly + xh])
    card_head(lx0, lx1, ly + 20, "خصم إضافي")
    box = [lx0 + 12, ly + 32, lx1 - 12, ly + xh - 12]
    ab_w = 74
    # الحقل على اليمين (بداية القراءة) وزر التطبيق على الشمال
    rr(d, [box[0], box[1], box[0] + ab_w, box[3]], 9, fill="#e8f1fe", outline=C["blue"])
    T(img, (box[0] + ab_w / 2, (box[1] + box[3]) / 2), "تطبيق", size=12.5, w=900,
      fill=C["blue_d"], anchor="mm")
    rr(d, [box[0] + ab_w + 8, box[1], box[2], box[3]], 9, fill="#f9fcff", outline=C["line2"])
    TL(img, (box[2] - 14, (box[1] + box[3]) / 2), "0.00", size=15, w=900,
       fill=C["navy"], anchor="rm")
    ly += xh + 10

    # --- الملاحظات ---
    nh = 132
    card([lx0, ly, lx1, ly + nh])
    card_head(lx0, lx1, ly + 20, "ملاحظات الفاتورة والبيان")
    nb = [lx0 + 12, ly + 32, lx1 - 12, ly + nh - 12]
    rr(d, nb, 9, fill="#f9fcff", outline=C["line2"])
    T(img, (nb[2] - 12, nb[1] + 20), "اكتب أية ملاحظات للعميل هنا ...", size=12,
      w=600, fill="#9db3cd", anchor="rm")
    ly += nh + 12

    # --- حفظ الفاتورة ---
    grad_box(img, [lx0, ly, lx1, ly + 54], 11, "#1cb06b", "#0c7a45",
             outline="#0a6b3c", ow=1)
    labeled(img, d, (lx0 + lx1) / 2, ly + 27, "حفظ الفاتورة", size=16, w=900,
            color="#ffffff", icon_name="save", icon_sz=17, gap=9, lw=1.9)
    ly += 54 + 9

    # --- أزرار العمليات ---
    small = [("فاتورة جديدة", False, "plus"), ("تعليق الفاتورة", False, None),
             ("الفواتير المعلقة", False, None), ("إلغاء الفاتورة", True, None)]
    bw = (LW - 8) / 2
    for r_, pair in enumerate([small[:2], small[2:]]):
        for c_, (lbl, danger, icv) in enumerate(pair):
            bx = lx1 - (c_ + 1) * bw - c_ * 8
            by = ly + r_ * (42 + 8)
            rr(d, [bx, by, bx + bw, by + 42], 10, fill="#ffffff",
               outline="#f0c0bb" if danger else C["line2"])
            tcol = C["red"] if danger else C["navy"]
            fsz = 11.5 if tw(lbl, 12, 900) + 17 > bw - 20 else 12
            labeled(img, d, bx + bw / 2, by + 21, lbl, size=fsz, w=900, color=tcol,
                    icon_name=icv, icon_sz=11, gap=5, lw=1.8)
    ly += 2 * 42 + 8 + 9

    # --- إغلاق ---
    if ly + 44 <= BY1 - 12:
        rr(d, [lx0, ly, lx1, ly + 44], 10, fill="#ffffff", outline=C["line2"])
        labeled(img, d, (lx0 + lx1) / 2, ly + 22, "إغلاق", size=13, w=900,
                color=C["ink2"], icon_name="close", icon_sz=12, gap=8, lw=1.9)

    # ---------- تصغير ----------
    out = img.resize((W, H), Image.LANCZOS)
    path = os.path.join(ROOT, "designs", "sales-screen-preview.png")
    out.save(path, optimize=True)
    print("saved:", path, out.size)
    return path


if __name__ == "__main__":
    build()
