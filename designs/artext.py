"""
محرك رسم نصوص عربية صحيح لـ Pillow.

ليه الملف ده موجود؟
  خط Cairo (وكل الخطوط العربية الحديثة) مفيهوش "أشكال الحروف العربية"
  (Arabic Presentation Forms-B, U+FE70..U+FEFF). المكتبة الشائعة arabic_reshaper
  بتحوّل الحروف لهذه الأشكال، فبتطلع مربعات فاضية والحرف بيختفي تماماً.
  الحل الصحيح: HarfBuzz يشكّل النص بالـ GSUB/GPOS الحقيقية والخط بيرسم
  الجلايف الأصلية (من غير أي تحويل يونيكود).

  كمان HarfBuzz لوحده ما بيعملش bidi: لو أديتله "فاتورة #1042" كسلسلة RTL
  هيعكس الأرقام كمان فتطلع "2401#". فبنعمل تقسيم اتجاهات (UAX#9 مبسّط)
  ونشكّل كل مقطع باتجاهه، وبعدين نرتّب المقاطع بصرياً.

الاستخدام:
    from artext import ArabicText
    at = ArabicText("font.ttf")
    at.draw(img, (x, y), "رصيد العميل", size=14, weight=700, fill="#0b2545", anchor="rm")
    w = at.measure("رصيد العميل", size=14, weight=700)
"""
import unicodedata

import freetype
import uharfbuzz as hb
from PIL import Image, ImageFilter

# ---------- تصنيفات الاتجاه ----------
_R_STRONG = {"R", "AL"}
_L_STRONG = {"L"}
_NUM = {"EN", "AN"}
# الأقواس بتتعكس في السياق العربي
_MIRROR = {"(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<"}


def _cls(ch):
    """R = عربي قوي، L = لاتيني قوي، N = رقم، U = محايد"""
    b = unicodedata.bidirectional(ch)
    if b in _R_STRONG:
        return "R"
    if b in _L_STRONG:
        return "L"
    if b in _NUM:
        return "N"
    return "U"


def _strong_dir(c):
    """N1: الأرقام بتتعامل كـ R عند حل المحايدات"""
    if c in ("R", "N"):
        return "R"
    if c == "L":
        return "L"
    return None


def _paragraph_dir(s):
    """اتجاه الفقرة = أول حرف قوي (R أو L). الأرقام وحدها → LTR"""
    for ch in s:
        c = _cls(ch)
        if c == "R":
            return "R"
        if c == "L":
            return "L"
        if c == "N":
            return "N"
    return "L"


def _bidi_runs(s):
    """
    يرجّع [(نص المقطع, is_rtl)] بترتيب بصري من الشمال لليمين، جاهز للرسم.
    """
    if not s:
        return []
    pdir = _paragraph_dir(s)
    embed = "R" if pdir in ("R", "N") else "L"
    base_is_rtl = embed == "R"

    cls = [_cls(ch) for ch in s]
    n = len(s)

    # --- W4/W5: فاصل واحد (, . : /) بين رقمين يبقى جزء من الرقم ---
    for i in range(1, n - 1):
        if cls[i] == "U" and s[i] in ".,:/-" and s[i - 1].isdigit() and s[i + 1].isdigit():
            cls[i] = "N"

    # --- حل المحايدات (UAX#9 N1/N2 مبسّط) ---
    resolved = list(cls)
    i = 0
    while i < n:
        if cls[i] != "U":
            i += 1
            continue
        j = i
        while j < n and cls[j] == "U":
            j += 1
        before = None
        for k in range(i - 1, -1, -1):
            before = _strong_dir(cls[k])
            if before:
                break
        after = None
        for k in range(j, n):
            after = _strong_dir(cls[k])
            if after:
                break
        d = before or embed
        if before and after and before == after:
            d = before
        elif not before and not after:
            d = embed
        elif not before:
            d = after if after == embed else embed
        elif not after:
            d = before if before == embed else embed
        else:
            d = embed
        for k in range(i, j):
            resolved[k] = d
        i = j

    # --- تجميع مقاطع ---
    # R → مستوى 1 (RTL) | N → مستوى 2 (LTR أرقام) | L → مستوى 2 (LTR)
    def level_of(c):
        return 1 if c == "R" else 2

    segs = []           # [(text, level, is_rtl_rtlrun)]
    k = 0
    while k < n:
        lv = level_of(resolved[k])
        j = k
        while j < n and level_of(resolved[j]) == lv:
            j += 1
        segs.append([s[k:j], lv])
        k = j

    # --- الترتيب البصري (UAX#9 L2) ---
    if base_is_rtl:
        segs = segs[::-1]

    out = []
    for txt, lv in segs:
        if lv == 1:
            # في السياق العربي نعكس الأقواس
            txt = "".join(_MIRROR.get(c, c) for c in txt)
            out.append((txt, True))
        else:
            # الأرقام واللاتيني: نعكس ترتيب الأرقام داخل المقطع لو كان RTL
            out.append((txt, False))
    return out


class ArabicText:
    def __init__(self, font_path):
        self.path = font_path
        self._blob = hb.Blob.from_file_path(font_path)
        self._face = hb.Face(self._blob)
        self._hbfont_cache = {}
        self._ft = freetype.Face(font_path)
        self.upem = self._ft.units_per_EM
        self._cache = {}

    # ---------- HarfBuzz ----------
    def _hbfont(self, weight):
        if weight not in self._hbfont_cache:
            f = hb.Font(self._face)
            try:
                f.set_variations({"wght": float(weight)})
            except Exception:
                pass
            self._hbfont_cache[weight] = f
        return self._hbfont_cache[weight]

    def shape(self, s, weight=400, rtl=None):
        """يرجّع [(glyph_id, x_adv, y_adv, x_off, y_off)] بترتيب الرسم"""
        key = (s, weight, rtl)
        if key in self._cache:
            return self._cache[key]
        buf = hb.Buffer()
        buf.add_str(s)
        if rtl is None:
            buf.guess_segment_properties()
        else:
            buf.direction = "rtl" if rtl else "ltr"
            buf.script = "Arab" if any("\u0600" <= c <= "\u06ff" for c in s) else "Latn"
            buf.language = "ar" if buf.script == "Arab" else "en"
        hb.shape(self._hbfont(weight), buf,
                 {"kern": True, "liga": True, "calt": True, "mark": True})
        res = [
            (i.codepoint, p.x_advance, p.y_advance, p.x_offset, p.y_offset)
            for i, p in zip(buf.glyph_infos, buf.glyph_positions)
        ]
        self._cache[key] = res
        return res

    # ---------- FreeType ----------
    def _ft_set(self, size, weight):
        self._ft.set_char_size(int(round(size * 64)), 0, 72, 72)
        try:
            self._ft.set_var_design_coords([float(weight), 0.0])
        except Exception:
            try:
                self._ft.set_var_design_coords([float(weight)])
            except Exception:
                pass
        return self._ft

    def measure(self, s, size, weight=400):
        """عرض النص بالبكسل (بعد bidi)"""
        if not s:
            return 0.0
        scale = size / self.upem
        w = 0.0
        for txt, is_rtl in _bidi_runs(s):
            w += sum(g[1] for g in self.shape(txt, weight, rtl=is_rtl)) * scale
        return w

    # ---------- Drawing ----------
    def draw(self, img, xy, s, size, weight=400, fill=(0, 0, 0), anchor="ra"):
        """
        anchor: أول حرف = المحور الأفقي (l/c/r) والتاني = الرأسي (a/m/s/b/t)
        الافتراضي "ra" = يمين + خط الأساس (مناسب للعربي RTL).
        """
        if not s:
            return
        x, y = xy
        scale = size / self.upem

        runs = _bidi_runs(s)
        total_w = 0.0
        shaped = []
        for txt, is_rtl in runs:
            gl = self.shape(txt, weight, rtl=is_rtl)
            w = sum(g[1] for g in gl) * scale
            shaped.append((gl, w))
            total_w += w

        # المحور الأفقي
        hx = anchor[0] if anchor else "r"
        if hx == "r":
            penx = x - total_w
        elif hx in ("c", "m"):
            penx = x - total_w / 2.0
        else:
            penx = x

        # المحور الرأسي
        vy = anchor[1] if len(anchor) > 1 else "a"
        if vy in ("a",):
            baseline = y
        elif vy == "m":
            baseline = y + size * 0.355
        elif vy in ("s", "t"):
            baseline = y + size * 0.78
        elif vy == "b":
            baseline = y - size * 0.22
        else:
            baseline = y

        ft = self._ft_set(size, weight)
        ox = int(round(penx))
        oy = int(round(baseline))
        pen = 0.0

        for glyphs, _w in shaped:
            for gid, xa, ya, xo, yo in glyphs:
                try:
                    ft.load_glyph(gid, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_TARGET_NORMAL)
                except Exception:
                    pen += xa * scale
                    continue
                bmp = ft.glyph.bitmap
                if bmp.width and bmp.rows:
                    gx = ox + int(round(pen + xo * scale)) + ft.glyph.bitmap_left
                    gy = oy - int(round(yo * scale)) - ft.glyph.bitmap_top
                    cover = Image.frombytes("L", (bmp.width, bmp.rows), bytes(bmp.buffer))
                    img.paste(Image.new(img.mode, (bmp.width, bmp.rows), fill), (gx, gy), cover)
                pen += xa * scale

    def draw_ltr(self, img, xy, s, size, weight=400, fill=(0, 0, 0), anchor="lm"):
        """نص لاتيني/أرقام خالص — بدون bidi (الأرقام والسالب بترتيبها الصحيح)"""
        if not s:
            return
        x, y = xy
        scale = size / self.upem
        glyphs = self.shape(s, weight, rtl=False)
        total_w = sum(g[1] for g in glyphs) * scale
        hx = anchor[0] if anchor else "l"
        if hx == "r":
            penx = x - total_w
        elif hx in ("c", "m"):
            penx = x - total_w / 2.0
        else:
            penx = x
        vy = anchor[1] if len(anchor) > 1 else "m"
        if vy == "a":
            baseline = y
        elif vy == "m":
            baseline = y + size * 0.355
        elif vy in ("s", "t"):
            baseline = y + size * 0.78
        elif vy == "b":
            baseline = y - size * 0.22
        else:
            baseline = y
        ft = self._ft_set(size, weight)
        ox, oy = int(round(penx)), int(round(baseline))
        pen = 0.0
        for gid, xa, ya, xo, yo in glyphs:
            try:
                ft.load_glyph(gid, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_TARGET_NORMAL)
            except Exception:
                pen += xa * scale
                continue
            bmp = ft.glyph.bitmap
            if bmp.width and bmp.rows:
                gx = ox + int(round(pen + xo * scale)) + ft.glyph.bitmap_left
                gy = oy - int(round(yo * scale)) - ft.glyph.bitmap_top
                cover = Image.frombytes("L", (bmp.width, bmp.rows), bytes(bmp.buffer))
                img.paste(Image.new(img.mode, (bmp.width, bmp.rows), fill), (gx, gy), cover)
            pen += xa * scale

    def measure_ltr(self, s, size, weight=400):
        scale = size / self.upem
        return sum(g[1] for g in self.shape(s, weight, rtl=False)) * scale

    def draw_shadow(self, img, xy, s, size, weight=400, fill=(0, 0, 0),
                    shadow=(0, 0, 0), blur=2, offset=(0, 1), anchor="ra"):
        """نص بظل ناعم (للشرائط الغامقة)"""
        tmp = Image.new("RGBA", img.size, (0, 0, 0, 0))
        self.draw(tmp, (xy[0] + offset[0], xy[1] + offset[1]), s, size, weight,
                  tuple(shadow) + (255,), anchor)
        tmp = tmp.filter(ImageFilter.GaussianBlur(blur))
        img.paste(tmp, (0, 0), tmp)
        self.draw(img, xy, s, size, weight, fill, anchor)
