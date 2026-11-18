"""
معاينة شاشة المستخدمين العائمة (Owner Users Gate) — مقترح تصميم.

- النص العربي: artext.ArabicText (HarfBuzz + bidi) — تشكيل صحيح.
- النصوص مأخوذة من LoginGate.tsx / UsersView.tsx / constants.
- نافذة 1040×620 في منتصف شاشة 1600×1000، خلفية كحلية، كروت أفاتار.
- كل الأيقونات مرسومة بأشكال (مفيش رموز يونيكود = مفيش مربعات فاضية).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artext import ArabicText  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_PATH = os.path.join(ROOT, "public", "fonts", "cairo-variable.ttf")
LOGO_PATH = os.path.join(ROOT, "public", "images", "logo-fatora.png")
AVATAR_PATH = os.path.join(ROOT, "public", "images", "avatar-user.png")

AT = ArabicText(FONT_PATH)

SS = 2
W, H = 1600, 1000
MW, MH = 1040, 620


def S(v):
    return int(round(v * SS))


C = {
    "bg1": "#0f2942", "bg2": "#081a2b",
    "win": "#f2f7fd", "white": "#ffffff",
    "title": "#123a63", "title2": "#0e2e50",
    "line": "#c9d8ee", "soft": "#eaf2fc",
    "text": "#0b2350", "muted": "#5a7593",
    "accent": "#0067c0", "teal": "#2fb3a6", "green": "#0f7b0f",
    "gold": "#9d5d00", "violet": "#5c2e91", "red": "#c42b1c",
}


def hx(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def rgba(c, a=255):
    return hx(c) + (a,)


def mix(a, b, t):
    ca, cb = hx(a), hx(b)
    return tuple(int(round(ca[i] + (cb[i] - ca[i]) * t)) for i in range(3))


def grad_layer(size, box, c1, c2):
    """طبقة تدرّج رأسي بحجم الصورة"""
    lay = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    x0, y0, x1, y1 = [S(v) for v in box]
    h = max(1, y1 - y0)
    for i in range(h):
        d.line([(x0, y0 + i), (x1, y0 + i)], fill=mix(c1, c2, i / h) + (255,))
    return lay


def rrect(d, box, r, fill=None, outline=None, width=1.0):
    d.rounded_rectangle([S(v) for v in box], radius=S(r), fill=fill, outline=outline, width=max(1, S(width)))


def shadow(img, box, r, blur=10, alpha=90, offset=8):
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(lay).rounded_rectangle(
        [S(x0), S(y0 + offset), S(x1), S(y1 + offset)], radius=S(r), fill=(3, 15, 32, alpha)
    )
    img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(S(blur))))


def T(img, x, y, s, size, weight=700, fill="#0b2350", anchor="rm"):
    AT.draw(img, (S(x), S(y)), s, size * SS, weight, rgba(fill), anchor)


def TL(img, x, y, s, size, weight=700, fill="#0b2350", anchor="lm"):
    AT.draw_ltr(img, (S(x), S(y)), s, size * SS, weight, rgba(fill), anchor)


def tw(s, size, weight):
    return AT.measure(s, size * SS, weight) / SS


# ---------------- أيقونات مرسومة ----------------
def ico_plus(d, cx, cy, r, col, w=2.2):
    d.line([S(cx - r), S(cy), S(cx + r), S(cy)], fill=rgba(col), width=S(w))
    d.line([S(cx), S(cy - r), S(cx), S(cy + r)], fill=rgba(col), width=S(w))


def ico_x(d, cx, cy, r, col, w=2.0):
    d.line([S(cx - r), S(cy - r), S(cx + r), S(cy + r)], fill=rgba(col), width=S(w))
    d.line([S(cx + r), S(cy - r), S(cx - r), S(cy + r)], fill=rgba(col), width=S(w))


def ico_minus(d, cx, cy, r, col, w=2.0):
    d.line([S(cx - r), S(cy), S(cx + r), S(cy)], fill=rgba(col), width=S(w))


def ico_square(d, cx, cy, r, col, w=1.8):
    d.rectangle([S(cx - r), S(cy - r), S(cx + r), S(cy + r)], outline=rgba(col), width=S(w))


def ico_arrow_left(d, cx, cy, r, col, w=2.2):
    d.line([S(cx + r), S(cy), S(cx - r), S(cy)], fill=rgba(col), width=S(w))
    d.line([S(cx - r), S(cy), S(cx - r + 6), S(cy - 5)], fill=rgba(col), width=S(w))
    d.line([S(cx - r), S(cy), S(cx - r + 6), S(cy + 5)], fill=rgba(col), width=S(w))


def ico_user(d, cx, cy, r, col, w=1.8):
    d.ellipse([S(cx - r * .45), S(cy - r * .95), S(cx + r * .45), S(cy - r * .05)], outline=rgba(col), width=S(w))
    d.arc([S(cx - r), S(cy - r * .1), S(cx + r), S(cy + r * 1.5)], 200, 340, fill=rgba(col), width=S(w))


def ico_lock(d, cx, cy, r, col, w=1.8):
    d.arc([S(cx - r * .7), S(cy - r), S(cx + r * .7), S(cy + r * .5)], 180, 360, fill=rgba(col), width=S(w))
    d.rounded_rectangle([S(cx - r * .85), S(cy - r * .1), S(cx + r * .85), S(cy + r)],
                        radius=S(2.5), outline=rgba(col), width=S(w))


def ico_eye(d, cx, cy, r, col, w=1.7):
    d.arc([S(cx - r), S(cy - r * .75), S(cx + r), S(cy + r * .75)], 20, 160, fill=rgba(col), width=S(w))
    d.arc([S(cx - r), S(cy - r * .75), S(cx + r), S(cy + r * .75)], 200, 340, fill=rgba(col), width=S(w))
    d.ellipse([S(cx - 2.6), S(cy - 2.6), S(cx + 2.6), S(cy + 2.6)], fill=rgba(col))


def ico_shield(d, cx, cy, r, col, w=1.7):
    d.polygon([(S(cx), S(cy - r)), (S(cx + r * .8), S(cy - r * .55)), (S(cx + r * .8), S(cy + r * .1)),
               (S(cx), S(cy + r)), (S(cx - r * .8), S(cy + r * .1)), (S(cx - r * .8), S(cy - r * .55))],
              outline=rgba(col), width=S(w))


def ico_key(d, cx, cy, r, col, w=1.7):
    cy = cy - r * 0.15
    d.ellipse([S(cx - r * .95), S(cy - r * .5), S(cx - r * .25), S(cy + r * .2)],
              outline=rgba(col), width=S(w))
    d.line([S(cx - r * .3), S(cy - r * .15), S(cx + r * .55), S(cy - r * .15)], fill=rgba(col), width=S(w))
    d.line([S(cx + r * .2), S(cy - r * .15), S(cx + r * .2), S(cy + r * .35)], fill=rgba(col), width=S(w))
    d.line([S(cx + r * .5), S(cy - r * .15), S(cx + r * .5), S(cy + r * .25)], fill=rgba(col), width=S(w))


def ico_search(d, cx, cy, r, col, w=1.7):
    d.ellipse([S(cx - r), S(cy - r), S(cx + r * .25), S(cy + r * .25)], outline=rgba(col), width=S(w))
    d.line([S(cx + r * .2), S(cy + r * .2), S(cx + r), S(cy + r)], fill=rgba(col), width=S(w))


# ==================== الخلفية ====================
img = Image.new("RGBA", (S(W), S(H)), rgba(C["bg1"]))
img.alpha_composite(grad_layer(img.size, (0, 0, W, H), C["bg1"], C["bg2"]))

glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([S(-240), S(-360), S(720), S(440)], fill=rgba(C["accent"], 52))
gd.ellipse([S(980), S(560), S(1900), S(1400)], fill=rgba(C["teal"], 42))
img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S(160))))

# ==================== النافذة ====================
wx0, wy0 = (W - MW) / 2, (H - MH) / 2
wx1, wy1 = wx0 + MW, wy0 + MH
R = 18
TB = 46

shadow(img, (wx0, wy0, wx1, wy1), R, blur=30, alpha=150, offset=16)
d = ImageDraw.Draw(img)
rrect(d, (wx0, wy0, wx1, wy1), R, fill=rgba(C["win"]))

# شريط العنوان بتدرّج + زوايا علوية دائرية فقط
tbar = grad_layer(img.size, (wx0, wy0, wx1, wy0 + TB), C["title"], C["title2"])
mask = Image.new("L", img.size, 0)
ImageDraw.Draw(mask).rounded_rectangle(
    [S(wx0), S(wy0), S(wx1), S(wy0 + TB)], radius=S(R), fill=255, corners=(True, True, False, False)
)
tbar.putalpha(mask)
img.alpha_composite(tbar)

d = ImageDraw.Draw(img)

# الشعار (يمين)
lx = wx1 - 20
if os.path.exists(LOGO_PATH):
    lg = Image.open(LOGO_PATH).convert("RGBA")
    lh = S(26)
    lg = lg.resize((int(lg.width * lh / lg.height), lh), Image.LANCZOS)
    img.alpha_composite(lg, (S(lx) - lg.width, S(wy0 + 10)))
    d = ImageDraw.Draw(img)
    lx -= lg.width / SS + 12

T(img, lx, wy0 + TB / 2 + 8, "إدارة المستخدمين والصلاحيات", 15, 900, C["white"], "rm")
T(img, lx, wy0 + TB / 2 - 9, "نظام فاتورة", 9, 700, "#9fc0e2", "rm")

# أزرار التحكم (شمال)
for i, fn in enumerate([ico_x, ico_square, ico_minus]):
    cx = wx0 + 26 + i * 34
    cy = wy0 + TB / 2
    if i == 0:
        rrect(d, (cx - 13, cy - 13, cx + 13, cy + 13), 5, fill=rgba(C["red"]))
        ico_x(d, cx, cy, 5, "#ffffff", 1.9)
    else:
        fn(d, cx, cy, 5, "#c4dbf2", 1.8)

# ==================== المحتوى ====================
PAD = 14
CY = wy0 + TB + 12
CH_PANEL = wy1 - CY - 58

LEFT_W = 372
lx0 = wx0 + PAD
lx1 = lx0 + LEFT_W
rx0 = lx1 + 14
rx1 = wx1 - PAD

# ---------- لوحة الدخول (شمال) ----------
rrect(d, (lx0, CY, lx1, CY + CH_PANEL), 12, fill=rgba(C["white"]), outline=rgba(C["line"]), width=1.4)

y = CY + 16
# شعار في أعلى لوحة الدخول
if os.path.exists(LOGO_PATH):
    lg2 = Image.open(LOGO_PATH).convert("RGBA")
    h2 = S(52)
    lg2 = lg2.resize((int(lg2.width * h2 / lg2.height), h2), Image.LANCZOS)
    img.alpha_composite(lg2, (S((lx0 + lx1) / 2) - lg2.width // 2, S(y)))
    d = ImageDraw.Draw(img)
T(img, (lx0 + lx1) / 2, y + 66, "نظام فاتورة — إدارة المستخدمين", 10.5, 900, C["muted"], "mm")
y += 84

T(img, lx1 - 18, y + 9, "بيانات الدخول", 16, 900, C["text"], "rm")
T(img, lx1 - 18, y + 27, "ادخل باسم المستخدم وكلمة المرور", 10.5, 700, C["muted"], "rm")
y += 50

# حقل اسم المستخدم
T(img, lx1 - 18, y, "اسم المستخدم", 11, 900, C["muted"], "rm")
y += 18
rrect(d, (lx0 + 18, y, lx1 - 18, y + 40), 8, fill=rgba("#f8fbff"), outline=rgba(C["line"]), width=1.4)
ico_user(d, lx0 + 34, y + 20, 8, C["accent"], 1.6)
T(img, lx1 - 30, y + 21, "wael", 13.5, 700, "#7f95b0", "rm")
y += 54

# حقل كلمة المرور (مُركّز)
T(img, lx1 - 18, y, "كلمة المرور", 11, 900, C["muted"], "rm")
y += 18
rrect(d, (lx0 + 18, y, lx1 - 18, y + 40), 8, fill=rgba("#ffffff"), outline=rgba(C["teal"]), width=2)
# هالة تركيز
halo = Image.new("RGBA", img.size, (0, 0, 0, 0))
ImageDraw.Draw(halo).rounded_rectangle(
    [S(lx0 + 14), S(y - 4), S(lx1 - 14), S(y + 44)], radius=S(11), fill=rgba(C["teal"], 40)
)
img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(S(6))))
d = ImageDraw.Draw(img)
rrect(d, (lx0 + 18, y, lx1 - 18, y + 40), 8, fill=rgba("#ffffff"), outline=rgba(C["teal"]), width=2)
for i in range(9):
    d.ellipse([S(lx1 - 34 - i * 13), S(y + 17.5), S(lx1 - 28 - i * 13), S(y + 22.5)], fill=rgba(C["text"]))
ico_eye(d, lx0 + 34, y + 20, 8, C["muted"])
y += 56

# زر الدخول
shadow(img, (lx0 + 18, y, lx1 - 18, y + 46), 9, blur=8, alpha=70, offset=4)
d = ImageDraw.Draw(img)
rrect(d, (lx0 + 18, y, lx1 - 18, y + 46), 9, fill=rgba(C["accent"]))
T(img, lx1 - 34, y + 24, "دخول", 15.5, 900, "#ffffff", "rm")
ico_arrow_left(d, lx0 + 36, y + 23, 7, "#ffffff", 2.1)
y += 58

# تذكّرني + نسيت كلمة المرور
d.rectangle([S(lx1 - 34), S(y - 6), S(lx1 - 22), S(y + 6)], outline=rgba(C["accent"]), width=S(1.6))
d.line([S(lx1 - 32), S(y), S(lx1 - 29), S(y + 4), S(lx1 - 24), S(y - 3)], fill=rgba(C["accent"]), width=S(1.8))
T(img, lx1 - 42, y, "تذكّر اسم المستخدم", 10, 700, C["muted"], "rm")
T(img, lx0 + 22, y, "نسيت كلمة المرور؟", 10, 900, C["accent"], "lm")
y += 22

d.line([S(lx0 + 18), S(y), S(lx1 - 18), S(y)], fill=rgba("#e3edf8"), width=S(1.2))
y += 14

# دخول سريع PIN
rrect(d, (lx0 + 18, y, lx1 - 18, y + 36), 8, fill=rgba(C["soft"]))
ico_key(d, lx0 + 36, y + 18, 7, C["gold"], 1.6)
T(img, lx1 - 30, y + 18, "دخول سريع برمز PIN (كاشير)", 11, 900, C["text"], "rm")
y += 48

# تنبيه خطأ (Toast)
rrect(d, (lx0 + 18, y, lx1 - 18, y + 34), 8, fill=rgba("#fdeceb"), outline=rgba("#f0b5b0"), width=1.2)
d.ellipse([S(lx0 + 28), S(y + 12), S(lx0 + 38), S(y + 22)], outline=rgba(C["red"]), width=S(1.6))
T(img, lx0 + 33, y + 18, "!", 7.5, 900, C["red"], "mm")
T(img, lx1 - 30, y + 18, "اسم المستخدم أو كلمة المرور غلط", 10, 900, "#a01a10", "rm")
y += 44

# ملاحظة أمان (أسفل اللوحة)
sy = CY + CH_PANEL - 42
rrect(d, (lx0 + 18, sy, lx1 - 18, sy + 28), 7, fill=rgba("#eef7fd"))
ico_shield(d, lx0 + 34, sy + 14, 7, C["teal"], 1.5)
T(img, lx1 - 30, sy + 14, "اتصال آمن — كلمة المرور مشفّرة (scrypt)", 9.5, 700, "#3f6f9e", "rm")

# ---------- لوحة المستخدمين (يمين) ----------
rrect(d, (rx0, CY, rx1, CY + CH_PANEL), 12, fill=rgba(C["white"]), outline=rgba(C["line"]), width=1.4)

y = CY + 18
T(img, rx1 - 18, y + 9, "المستخدمون", 16, 900, C["text"], "rm")
T(img, rx1 - 18, y + 27, "دوس على اسم المستخدم لجلب بيانات دخوله", 10, 700, C["muted"], "rm")

# زر مستخدم جديد (يسار الهيدر)
btn_w = 112
rrect(d, (rx0 + 18, y + 2, rx0 + 18 + btn_w, y + 34), 8, fill=rgba(C["green"]))
ico_plus(d, rx0 + 34, y + 18, 5, "#ffffff", 2.0)
T(img, rx0 + 18 + btn_w - 12, y + 18, "مستخدم جديد", 10.5, 900, "#ffffff", "rm")
y += 46

# بحث في سطر مستقل (عرض كامل)
rrect(d, (rx0 + 18, y, rx1 - 18, y + 32), 8, fill=rgba("#f8fbff"), outline=rgba(C["line"]), width=1.2)
ico_search(d, rx0 + 34, y + 16, 6, C["muted"], 1.5)
T(img, rx1 - 30, y + 16, "بحث بالاسم أو اسم الدخول...", 10, 700, "#a3b6cd", "rm")
y += 44

# ---- كروت المستخدمين ----
USERS = [
    ("وائل الجمال", "wael", "مالك", C["gold"], "#fff6e3", "أنت", True, True, "اليوم"),
    ("محمد أحمد", "mohamed", "مدير", C["accent"], "#eaf2fc", "", True, True, "أمس"),
    ("سارة علي", "sara", "كاشير", C["violet"], "#f2edfa", "", True, False, "١٥ نوفمبر"),
    ("أحمد سمير", "ahmed", "كاشير", C["violet"], "#f2edfa", "", False, False, "موقوف"),
    ("منى حسن", "mona", "كاشير", C["violet"], "#f2edfa", "", True, True, "١٢ نوفمبر"),
    ("خالد فؤاد", "khaled", "مدير", C["accent"], "#eaf2fc", "", True, False, "١٠ نوفمبر"),
]

GW = 10
CW_ = (rx1 - rx0 - 36 - GW) / 2
CH_ = 92

for idx, (name, uname, role, rcol, rbg, badge, active, has_pin, last) in enumerate(USERS):
    col, row = idx % 2, idx // 2
    cx1 = rx1 - 18 - col * (CW_ + GW)
    cx0 = cx1 - CW_
    cy0 = y + row * (CH_ + GW)
    cy1 = cy0 + CH_

    sel = idx == 0
    rrect(d, (cx0, cy0, cx1, cy1), 10, fill=rgba("#f4f8fd" if sel else "#ffffff"),
          outline=rgba(C["accent"] if sel else C["line"]), width=2 if sel else 1.2)
    if sel:
        shadow(img, (cx0, cy0, cx1, cy1), 10, blur=6, alpha=26, offset=2)
        d = ImageDraw.Draw(img)
        rrect(d, (cx0, cy0, cx1, cy1), 10, fill=rgba("#f4f8fd"), outline=rgba(C["accent"]), width=2)

    ar = 21
    acx, acy = cx1 - 34, cy0 + 35
    if os.path.exists(AVATAR_PATH):
        av = Image.open(AVATAR_PATH).convert("RGBA")
        sz = S(ar * 2)
        av = av.resize((sz, sz), Image.LANCZOS)
        if not active:
            av = av.convert("L").convert("RGBA")
        m = Image.new("L", (sz, sz), 0)
        ImageDraw.Draw(m).ellipse([0, 0, sz, sz], fill=255)
        out = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        out.paste(av, (0, 0), m)
        img.alpha_composite(out, (S(acx - ar), S(acy - ar)))
    d = ImageDraw.Draw(img)
    d.ellipse([S(acx - ar), S(acy - ar), S(acx + ar), S(acy + ar)], outline=rgba(rcol), width=S(2.4))
    # نقطة الحالة
    d.ellipse([S(acx - ar + 2), S(acy + ar - 13), S(acx - ar + 14), S(acy + ar - 1)],
              fill=rgba(C["green"] if active else "#b8c6d6"), outline=rgba("#ffffff"), width=S(2))

    tx = acx - ar - 10
    T(img, tx, cy0 + 26, name, 12, 900, C["text"] if active else "#8496ab", "rm")

    # شريط الدور
    rw = tw(role, 9, 900) + 16
    rx_ = tx
    rrect(d, (rx_ - rw, cy0 + 36, rx_, cy0 + 52), 4, fill=rgba(rbg))
    T(img, rx_ - rw / 2, cy0 + 44, role, 8.8, 900, rcol, "mm")

    if badge:
        bw = tw(badge, 8.5, 900) + 12
        bx = rx_ - rw - 5
        rrect(d, (bx - bw, cy0 + 37, bx, cy0 + 51), 4, fill=rgba("#dbe9fb"))
        T(img, bx - bw / 2, cy0 + 44, badge, 8, 900, C["accent"], "mm")

    # آخر دخول (تحت شريط الدور، محاذاة يمين)
    T(img, tx, cy0 + 71, f"آخر دخول: {last}", 8.5, 700, "#94a9c4", "rm")

    # اسم الدخول (شمال) + PIN
    TL(img, cx0 + 12, cy1 - 13, uname, 9.5, 700, "#94a9c4", "lm")
    if has_pin:
        pw = 22
        rrect(d, (cx0 + 10, cy0 + 10, cx0 + 10 + pw, cy0 + 24), 4, fill=rgba("#fff4e0"))
        T(img, cx0 + 10 + pw / 2, cy0 + 17, "PIN", 7.2, 900, C["gold"], "mm")

# ملاحظة أسفل لوحة المستخدمين
fy = CY + CH_PANEL - 44
rrect(d, (rx0 + 18, fy, rx1 - 18, fy + 30), 7, fill=rgba("#eef7fd"))
ico_shield(d, rx0 + 34, fy + 15, 7, C["teal"], 1.5)
T(img, rx1 - 30, fy + 15, "الصور والأسماء فقط — التحقق من كلمة المرور يتم على الخادم", 9.5, 700, "#3f6f9e", "rm")

# ---- الشريط السفلي ----
BY = wy1 - 42
bw = 96
rrect(d, (wx0 + PAD, BY, wx0 + PAD + bw, BY + 30), 8, fill=rgba(C["white"]), outline=rgba(C["line"]), width=1.3)
T(img, wx0 + PAD + bw / 2, BY + 15, "إغلاق", 10.5, 900, C["muted"], "mm")

T(img, wx0 + PAD + bw + 16, BY + 15, "٦ مستخدمين — ٥ مفعّلين", 9.5, 700, "#94a9c4", "lm")
T(img, wx1 - PAD, BY + 15, "نسخة 1.9.1  •  نظام فاتورة", 9.5, 700, "#94a9c4", "rm")

OUT = os.path.join(ROOT, "designs", "users-gate-preview.png")
img.convert("RGB").save(OUT)
print("saved:", OUT)
