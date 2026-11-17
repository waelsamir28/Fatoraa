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


ACTION_COLORS2 = [
    ("فاتورة جديدة",    "save",   "accent"),
    ("حفظ الفاتورة",    "save",   "green"),
    ("عرض المبيعات",    "layers", "teal"),
    ("إلغاء الفاتورة",  "close",  "red"),
    ("تعليق الفاتورة",  "eraser", "amber"),
    ("الفواتير المعلقة", "cards", "violet"),
]
MONEY = [("إجمالي الأصناف","#e8f0fa","#a9c6e4","#123a63"),
         ("المدفوع","#dff6dd","#9fd89f","#0f7b0f"),
         ("المتبقي","#fde7e9","#f1aeb5","#c42b1c"),
         ("المطلوب دفعه","#0067c0","#005a9e","#ffffff")]

# ======================================================================
def build(out="sales-win11-blue.png"):
    img = Image.new("RGB", (W * SS, H * SS), F["mica_alt"])
    d = ImageDraw.Draw(img)
    img.paste(vgrad((W, H), "#d5e5f7", "#c2d6ee"), (0, 0))
    d = ImageDraw.Draw(img)

    AX0, AY0, AX1, AY1 = 18, 16, W - 18, H - 16
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([S(AX0+3), S(AY0+9), S(AX1-3), S(AY1-2)],
                                          radius=S(9), fill=(20, 45, 85, 68))
    img.paste(sh.filter(ImageFilter.GaussianBlur(S(9))), (0, 0), sh)
    d = ImageDraw.Draw(img)
    rr(d, [AX0, AY0, AX1, AY1], 9, fill=F["mica"], outline=F["stroke_2"], width=1)

    # ===== شريط عنوان غامق =====
    TB = 34
    grad_box(img, [AX0+1, AY0+1, AX1-1, AY0+TB], 8, "#123a63", "#0e2e50")
    d = ImageDraw.Draw(img)
    d.rectangle([S(AX0+2), S(AY0+TB-9), S(AX1-2), S(AY0+TB)], fill="#0e2e50")
    d.line([(S(AX0+1), S(AY0+TB)), (S(AX1-1), S(AY0+TB))], fill="#0b2b52", width=1)
    ax = AX1 - 26
    rr(d, [ax-8, AY0+9, ax+8, AY0+25], 4, fill="#2f8bff")
    icon(d, "cart", ax, AY0+17, 10, "#ffffff", 1.4)
    T(img, (ax-18, AY0+TB/2), "فواتير مبيعات", size=11, w=600, fill="#ffffff")
    for i,(nm,hov) in enumerate([("minus",0),("square",0),("close",1)]):
        bx = AX0+3+i*44
        if hov:
            rr(d, [bx, AY0+1, bx+44, AY0+TB-1], 0, fill="#c42b1c"); col="#ffffff"
        else: col="#dbe8f6"
        icon(d, nm, bx+22, AY0+TB/2, 7.5 if nm!="square" else 8.5, col, 1.4)

    BY0 = AY0+TB+1; ST_H=28; BOT=AY1-ST_H
    PAD, GAP = 8, 7
    x_left, x_right = AX0+PAD, AX1-PAD

    # ===== التولبار =====
    tb_y0=BY0+PAD; tb_y1=tb_y0+48
    rr(d, [x_left, tb_y0, x_right, tb_y1], 8, fill="#ffffff", outline=F["stroke"], width=1)
    gi_y0, gi_y1 = tb_y0+8, tb_y1-8
    gx = x_right-8
    for lbl, ic, nw in [("تراجع","undo",None),("000123",None,112),("حذف","trash",None)]:
        gw = nw if nw else tw(lbl,11,700)+30
        rr(d, [gx-gw, gi_y0, gx, gi_y1], 5, fill="#ffffff", outline=F["stroke_2"], width=1)
        if ic: labeled(img,d,gx-gw/2,(gi_y0+gi_y1)/2,lbl,11,700,F["text"],ic,11,5,1.5)
        else: TL(img,(gx-8,(gi_y0+gi_y1)/2),lbl,size=12,w=700,fill=F["accent"],anchor="rm")
        gx -= gw+5
    gx = x_left+8
    for lbl, ic in [("مسح الأصل","eraser"),("طباعة الفاتورة","printer"),("واتساب","phone")]:
        gw = tw(lbl,11,600)+32
        rr(d,[gx,gi_y0,gx+gw,gi_y1],5,fill="#ffffff",outline=F["stroke_2"],width=1)
        labeled(img,d,gx+gw/2,(gi_y0+gi_y1)/2,lbl,11,600,F["text"],ic,11,5,1.5)
        gx += gw+5

    # ===== صف البيانات الأساسية =====
    R1 = 196
    r1_y0 = tb_y1+GAP; r1_y1 = r1_y0+R1

    # (1) العميل شمال
    CUST_W = 268
    cx0, cx1 = x_left, x_left+CUST_W
    rr(d, [cx0, r1_y0, cx1, r1_y1], 8, fill="#ffffff", outline=F["stroke"], width=1)
    fy = r1_y0+5
    for lbl,val,ph in [("رقم العميل","1001",False),("اسم العميل","عميل نقدي",False),("تليفون","01xxxxxxxxx",True)]:
        T(img,(cx1-8,fy+13),lbl,size=9.5,w=600,fill=F["text_2"])
        lw_=tw(lbl,9.5,600)
        ix1=cx1-8-lw_-5
        rr(d,[cx0+8,fy,ix1,fy+24],5,fill="#ffffff",outline=F["stroke_2"],width=1)
        TL(img,(ix1-6,fy+12),val,size=10.5,w=600,
           fill=F["text_3"] if ph else F["text"],anchor="rm")
        fy += 26
    # رصيد العميل — بنفس العرض ورقم كبير
    ry0 = fy+2; ry1 = max(ry0+52, r1_y1-6)
    rr(d,[cx0+8,ry0,cx1-8,ry1],7,fill="#ffd83d",outline="#e6bf3a",width=2)
    T(img,(cx1-16,ry0+13),"رصيد العميل",size=10.5,w=700,fill="#0f2942")
    icon(d,"wallet",cx1-16-tw("رصيد العميل",10.5,700)-9,ry0+13,11,"#0f2942",1.5)
    TL(img,((cx0+8+cx1-8)/2, ry0+(ry1-ry0)*0.66),"0.00",size=26,w=900,fill="#0f2942",anchor="mm")

    # (2) الوسط: إدخال سريع + طرق دفع + ملاحظات
    MID_X0 = cx1+GAP
    RIGHT_W = 318
    MID_X1 = x_right-RIGHT_W-GAP
    fy = r1_y0
    # إدخال سريع
    qh=34
    rr(d,[MID_X0,fy,MID_X1,fy+qh],8,fill="#ffffff",outline=F["stroke"],width=1)
    qx = MID_X1-6
    rr(d,[qx-28,fy+5,qx,fy+qh-5],5,fill=F["accent"])
    icon(d,"plus",qx-14,fy+qh/2,11,"#ffffff",2.0)
    qx -= 33
    for lbl,w_ in [("القيمة",60),("الخصم",52),("سعر الوحدة",66),("الكمية",50)]:
        rr(d,[qx-w_,fy+5,qx,fy+qh-5],5,fill="#ffffff",outline=F["stroke_2"],width=1)
        T(img,(qx-5,fy+qh/2),lbl,size=8,w=600,fill=F["text_3"],anchor="rm")
        qx -= w_+4
    rr(d,[MID_X0+6,fy+5,qx,fy+qh-5],14,fill="#ffffff",outline=F["stroke_2"],width=1)
    icon(d,"search",qx-13,fy+qh/2,11,F["text_3"],1.5)
    T(img,(qx-26,fy+qh/2),"اكتب اسم الصنف أو الباركود...",size=9,w=600,fill=F["text_3"])
    fy += qh+GAP

    # طرق الدفع — 3 جنب بعض
    ph_h = 40
    rr(d,[MID_X0,fy,MID_X1,fy+ph_h+18],8,fill="#ffffff",outline=F["stroke"],width=1)
    grad_box(img,[MID_X0+1,fy+1,MID_X1-1,fy+20],7,"#16375c","#0f2a47")
    d=ImageDraw.Draw(img)
    T(img,((MID_X0+MID_X1)/2,fy+10),"طريقة الدفع",size=10,w=700,fill="#ffffff",anchor="mm")
    pw=(MID_X1-MID_X0-14-2*5)/3
    for i,(lbl,ic,col) in enumerate([("نقدي","wallet","accent"),("أقساط","cards","amber"),("محفظة إلكترونية","wallet","violet")]):
        px1 = MID_X1-7-i*(pw+5); px0=px1-pw
        act=(i==0)
        if act: grad_box(img,[px0,fy+24,px1,fy+24+ph_h-8],5,"#eaf4fd","#d8ecfb",outline=F["accent"],ow=1); d=ImageDraw.Draw(img)
        else: rr(d,[px0,fy+24,px1,fy+24+ph_h-8],5,fill="#f4f8fd",outline=F["stroke_2"],width=1)
        icon(d,ic,(px0+px1)/2,fy+34,11,F[col],1.5)
        T(img,((px0+px1)/2,fy+50),lbl,size=8.5,w=700,fill=F["accent_d"] if act else F["text"],anchor="mm")
    fy += ph_h+18+GAP

    # ملاحظات
    rr(d,[MID_X0,fy,MID_X1,r1_y1],8,fill="#ffffff",outline=F["stroke"],width=1)
    T(img,(MID_X1-10,fy+13),"ملاحظات الفاتورة والبيان",size=9.5,w=700,fill=F["text_3"])
    rr(d,[MID_X0+7,fy+24,MID_X1-7,r1_y1-7],5,fill="#ffffff",outline=F["stroke_2"],width=1)
    T(img,(MID_X1-15,fy+38),"اكتب أية ملاحظات للعميل هنا ...",size=9.5,w=600,fill=F["text_3"])

    # (3) يمين: نقدي/أجل · قطاعي/جملة · باركود/تجميع · كشف حساب · وردي · إضافة صنف · صورة
    RX0 = MID_X1+GAP; RX1 = x_right
    yy = r1_y0
    def duo(labels, colors, h=28):
        nonlocal yy, d
        bw=(RX1-RX0-5)/2
        for i,(lbl,col,act) in enumerate(zip(labels,colors,[True,False])):
            bx1 = RX1-i*(bw+5); bx0=bx1-bw
            if act: rr(d,[bx0,yy,bx1,yy+h],5,fill=F[col],outline=mix(F[col],"#000000",0.2),width=1)
            else: rr(d,[bx0,yy,bx1,yy+h],5,fill="#f4f8fd",outline=F["stroke_2"],width=1)
            labeled(img,d,(bx0+bx1)/2,yy+h/2,lbl,10,700,
                    "#ffffff" if act else F["text_2"],None,0,0)
        yy += h+5
    duo(["نقدي","أجل"],["accent","accent"])
    duo(["قطاعي","جملة"],["violet","violet"])
    duo(["باركود","تجميع"],["teal","teal"])
    # كشف حساب
    rr(d,[RX0,yy,RX1,yy+30],5,fill="#9d5d00",outline="#7a4600",width=1)
    labeled(img,d,(RX0+RX1)/2,yy+15,"كشف حساب",11,700,"#ffffff","search",11,5,1.6)
    yy += 35
    # الشريط الوردي
    rr(d,[RX0,yy,RX1,yy+36],5,fill="#fde7f3",outline="#ecc0d8",width=1)
    sw=(RX1-RX0-8)/5
    for i,(lbl,v) in enumerate([("الرصيد","0.0"),("شراء","0.0"),("جملة","0.0"),("بيع","0.0"),("ربح","0.0")]):
        sx1=RX1-4-i*sw; sx0=sx1-sw
        T(img,((sx0+sx1)/2,yy+11),lbl,size=7.5,w=700,fill="#8a2a2a",anchor="mm")
        TL(img,((sx0+sx1)/2,yy+25),v,size=10,w=800,fill="#c0170e",anchor="mm")
    yy += 41
    # إضافة صنف
    rr(d,[RX0,yy,RX1,yy+30],5,fill="#0f7b0f",outline="#0c5f0c",width=1)
    labeled(img,d,(RX0+RX1)/2,yy+15,"إضافة صنف",11,700,"#ffffff","plus",11,5,1.8)
    yy += 35
    # صورة الصنف
    if yy+34 < r1_y1:
        rr(d,[RX0,yy,RX1,r1_y1],7,fill="#ffffff",outline=F["stroke"],width=1)
    icon(d,"box",(RX0+RX1)/2-40,(yy+r1_y1)/2,20,"#a9c6e4",1.7)
    T(img,((RX0+RX1)/2+18,(yy+r1_y1)/2),"صورة الصنف",size=9,w=700,fill=F["text_2"],anchor="mm")

    # ===== شريط المال الأربع =====
    my0 = r1_y1+GAP; my1 = my0+92
    mw = (x_right-x_left-3*GAP)/4
    for i,(lbl,bg,bd,ink) in enumerate(MONEY):
        mx1 = x_right-i*(mw+GAP); mx0=mx1-mw
        rr(d,[mx0,my0,mx1,my1],10,fill=bg,outline=bd,width=2)
        T(img,(mx1-12,my0+18),lbl,size=11,w=700,fill=ink)
        TL(img,((mx0+mx1)/2,my1-28),"0.00",size=27,w=900,fill=ink,anchor="mm")

    # ===== خصم إضافي + ضريبة + إجمالي خصم + عدد =====
    ey0 = my1+GAP; ey1 = ey0+38
    ew = (x_right-x_left-3*GAP)/4
    for i,(lbl,val,col) in enumerate([("خصم إضافي","0.00","#9d5d00"),("الخصم الكلي","0.00","#c42b1c"),
                                       ("الضريبة","0.00","#4a6484"),("عدد الأصناف","0","#12263f")]):
        ex1 = x_right-i*(ew+GAP); ex0=ex1-ew
        rr(d,[ex0,ey0,ex1,ey1],7,fill="#ffffff",outline=F["stroke"],width=1)
        T(img,(ex1-10,ey0+19),lbl,size=9.5,w=700,fill=F["text_3"])
        TL(img,(ex0+10,ey0+19),val,size=12,w=800,fill=col,anchor="lm")

    # ===== الجدول + الأصناف =====
    gy0 = ey1+GAP
    ab_h = 62
    ab_y0 = BOT-PAD-ab_h
    ab_y1 = BOT-PAD
    gy1 = ab_y0-GAP

    CARDS_W = 292
    cards_x0, cards_x1 = x_left, x_left+CARDS_W
    grid_x0, grid_x1 = cards_x1+GAP, x_right

    # الجدول
    rr(d,[grid_x0,gy0,grid_x1,gy1],8,fill="#ffffff",outline=F["stroke"],width=1)
    TH=32
    grad_box(img,[grid_x0+1,gy0+1,grid_x1-1,gy0+TH],7,"#16375c","#0f2a47")
    d=ImageDraw.Draw(img)
    d.rectangle([S(grid_x0+1),S(gy0+TH-7),S(grid_x1-1),S(gy0+TH)],fill="#0f2a47")
    d.line([(S(grid_x0+1),S(gy0+TH)),(S(grid_x1-1),S(gy0+TH))],fill="#0b2138",width=1)
    cols=[("م",0.05),("اسم الصنف والبيان",0.36),("العبوة",0.10),("الكمية",0.10),
          ("سعر الوحدة",0.13),("الخصم",0.09),("الإجمالي",0.12),("حذف",0.05)]
    avail=(grid_x1-grid_x0)-16; xx=grid_x1-8
    for nm,fr in cols:
        wc=avail*fr
        T(img,(xx-wc/2,gy0+TH/2),nm,size=9.5,w=700,fill="#ffffff",anchor="mm")
        xx-=wc
    ry=gy0+TH; RH=28; i=0
    while ry+RH<=gy1-4:
        if i%2==1: d.rectangle([S(grid_x0+1),S(ry),S(grid_x1-1),S(ry+RH)],fill="#fafcff")
        d.line([(S(grid_x0+1),S(ry+RH)),(S(grid_x1-1),S(ry+RH))],fill="#edf3fa",width=1)
        ry+=RH; i+=1
    T(img,(grid_x1-18,gy0+TH+14),"لا توجد أصناف — ابدأ بالبحث أو امسح الباركود",size=10,w=600,fill=F["text_3"])

    # الأصناف السريعة
    rr(d,[cards_x0,gy0,cards_x1,gy1],8,fill="#ffffff",outline=F["stroke"],width=1)
    hh=30
    grad_box(img,[cards_x0+1,gy0+1,cards_x1-1,gy0+hh],7,"#16375c","#0f2a47")
    d=ImageDraw.Draw(img)
    d.rectangle([S(cards_x0+1),S(gy0+hh-8),S(cards_x1-1),S(gy0+hh)],fill="#0f2a47")
    T(img,(cards_x1-10,gy0+hh/2),"الأصناف (90)",size=10.5,w=700,fill="#ffffff")
    cw_=(cards_x1-cards_x0-16-2*5)/3; gyy=gy0+hh+7
    while gyy+30<=gy1-7:
        for gj in range(3):
            gx1=cards_x1-8-gj*(cw_+5); gx0=gx1-cw_
            rr(d,[gx0,gyy,gx1,gyy+28],4,fill="#ffffff",outline=F["stroke_2"],width=1)
            rr(d,[gx0+7,gyy+8,gx1-7,gyy+12],1,fill="#dfe9f5")
            rr(d,[gx0+7,gyy+17,gx1-15,gyy+21],1,fill="#eaf1fa")
        gyy+=33

    # ===== الأزرار الستة جنب بعض =====
    bw=(x_right-x_left-5*GAP)/6
    for i,(lbl,ic,col) in enumerate(ACTION_COLORS2):
        bx1=x_right-i*(bw+GAP); bx0=bx1-bw
        grad_box(img,[bx0,ab_y0,bx1,ab_y1],7,mix(F[col],"#ffffff",0.10),F[col],
                 outline=mix(F[col],"#000000",0.18))
        d=ImageDraw.Draw(img)
        icon(d,ic,(bx0+bx1)/2,ab_y0+22,17,"#ffffff",1.9)
        T(img,((bx0+bx1)/2,ab_y1-14),lbl,size=9.5,w=700,fill="#ffffff",anchor="mm")

    # ===== شريط الحالة =====
    st_y=AY1-ST_H
    rr(d,[AX0+1,st_y,AX1-1,AY1-1],8,fill="#eaf1f9")
    d.rectangle([S(AX0+1),S(st_y),S(AX1-1),S(st_y+7)],fill="#eaf1f9")
    d.line([(S(AX0+1),S(st_y)),(S(AX1-1),S(st_y))],fill=F["stroke_2"],width=1)
    sx=AX1-12
    for k,lbl in [("F10","طباعة"),("F8","صنف جديد"),("F4","بحث عميل"),("F3","بحث صنف"),("F2","حفظ")]:
        wl=tw(lbl,9,600)
        T(img,(sx,st_y+ST_H/2),lbl,size=9,w=600,fill=F["text_2"])
        sx-=wl+5
        kx1=sx; kx0=kx1-(tlw(k,8,700)+8)
        rr(d,[kx0,st_y+6,kx1,st_y+ST_H-6],4,fill="#ffffff",outline=F["stroke_2"],width=1)
        TL(img,((kx0+kx1)/2,st_y+ST_H/2),k,size=8,w=700,fill=F["text_2"],anchor="mm")
        sx=kx0-11
    T(img,(AX0+14,st_y+ST_H/2),"الكاشير: FATORA",size=9,w=600,fill=F["text_2"],anchor="lm")

    out_img = img.resize((W, H), Image.LANCZOS)
    path = os.path.join(ROOT, "designs", out)
    out_img.save(path, optimize=True)
    print("saved:", path)
    return path

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv)>1 else "sales-win11-blue.png")
