/**
 * أيقونات الشاشة الرئيسية — على نمط أيقونات الصورة المرجعية (تدرّجات لونية + بريق)
 * كل أيقونة SVG على شبكة 48×48 وتتدرّج مع حجم الحاوية.
 */

type P = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 48 48",
  className,
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
});

/** تدرّج مشترك */
function G({ id, from, to, x2 = "0", y2 = "1" }: { id: string; from: string; to: string; x2?: string; y2?: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

const gloss = (id: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
  </linearGradient>
);

/* ============ العمليات ============ */

export function IcCartPlus({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="c1" from="#3ea8ff" to="#1668d6" />
        <G id="c2" from="#5fe07a" to="#12a03a" />
        {gloss("c3")}
      </defs>
      <path d="M6 9h4.2l1.4 4h27.6l-4 16.5H15.6L10 11" stroke="url(#c1)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.6 17h25.3l-3.4 14H16.4z" fill="url(#c1)" opacity="0.28" />
      <circle cx="17.5" cy="36.5" r="2.8" fill="#1c5fbf" />
      <circle cx="32.5" cy="36.5" r="2.8" fill="#1c5fbf" />
      <g>
        <circle cx="37" cy="12" r="8.5" fill="url(#c2)" stroke="#fff" strokeWidth="1.6" />
        <path d="M37 8v8M33 12h8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function IcReturnBox({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="r1" from="#f7c04a" to="#e0900e" />
        <G id="r2" from="#ff8a65" to="#e03131" />
      </defs>
      <path d="M8 16 24 8l16 8v18l-16 8-16-8z" fill="url(#r1)" />
      <path d="M8 16 24 24l16-8" stroke="#b9710a" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 24v18" stroke="#b9710a" strokeWidth="2.2" />
      <path d="M8 16 24 8l16 8-16 8z" fill="#fff" opacity="0.22" />
      <g>
        <circle cx="35" cy="34" r="9" fill="url(#r2)" stroke="#fff" strokeWidth="1.8" />
        <path d="M31 34h8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function IcClipboardCheck({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="k1" from="#6ec1f5" to="#1d74c9" />
        <G id="k2" from="#63dd7d" to="#12a03a" />
      </defs>
      <rect x="10" y="8" width="28" height="34" rx="4" fill="url(#k1)" />
      <rect x="17" y="4.5" width="14" height="7" rx="3" fill="#e9f4ff" stroke="#2b7cc9" strokeWidth="1.8" />
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.95">
        <path d="M16 18h10M16 25h16M16 32h9" />
      </g>
      <g>
        <circle cx="34" cy="34" r="9.5" fill="url(#k2)" stroke="#fff" strokeWidth="1.8" />
        <path d="m30 34 3 3 5.5-6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function IcBoxStack({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="b1" from="#f8c95a" to="#dd8c07" />
        <G id="b2" from="#fbe08e" to="#eaa81c" />
      </defs>
      <rect x="5" y="22" width="19" height="17" rx="2.5" fill="url(#b2)" stroke="#b9710a" strokeWidth="1.6" />
      <rect x="9" y="26" width="11" height="4" rx="1.4" fill="#fff" opacity="0.55" />
      <rect x="24" y="22" width="19" height="17" rx="2.5" fill="url(#b1)" stroke="#b9710a" strokeWidth="1.6" />
      <rect x="28" y="26" width="11" height="4" rx="1.4" fill="#fff" opacity="0.55" />
      <rect x="10" y="6" width="17" height="14" rx="2.5" fill="url(#b1)" stroke="#b9710a" strokeWidth="1.6" />
      <rect x="14" y="9.5" width="9" height="3.4" rx="1.2" fill="#fff" opacity="0.55" />
    </svg>
  );
}

export function IcCustomers({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="u1" from="#5aa9ee" to="#1a63b8" />
        <G id="u2" from="#8fc8f5" to="#3d84cf" />
        <G id="u3" from="#f6c88a" to="#d99a52" />
      </defs>
      <circle cx="17" cy="15" r="7.2" fill="url(#u3)" />
      <path d="M4 40c0-7.2 5.8-12.5 13-12.5S30 32.8 30 40z" fill="url(#u1)" />
      <circle cx="33.5" cy="17.5" r="6" fill="url(#u3)" />
      <path d="M24.5 40c0-6 4.6-10.5 10.5-10.5S45.5 34 45.5 40z" fill="url(#u2)" />
      <path d="M4 40c0-5.6 3.5-10.2 8.5-11.9" stroke="#fff" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}

export function IcReportDoc({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="d1" from="#ffffff" to="#dbe9f7" />
        <G id="d2" from="#3ec3a5" to="#13897a" />
        <G id="d3" from="#7ec4f7" to="#2076c8" />
      </defs>
      <rect x="7" y="6" width="26" height="32" rx="3.5" fill="url(#d1)" stroke="#9dc0e2" strokeWidth="1.8" />
      <rect x="12" y="13" width="16" height="3" rx="1.5" fill="#b9d3ea" />
      <rect x="12" y="19" width="11" height="3" rx="1.5" fill="#b9d3ea" />
      <g>
        <rect x="18" y="20" width="24" height="22" rx="3" fill="url(#d3)" />
        <rect x="22" y="30" width="3.6" height="8" rx="1.2" fill="#fff" />
        <rect x="28" y="26" width="3.6" height="12" rx="1.2" fill="#fff" />
        <rect x="34" y="22" width="3.6" height="16" rx="1.2" fill="#fff" />
      </g>
      <circle cx="9" cy="40" r="5.5" fill="url(#d2)" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

/* ============ المخزون ============ */

export function IcWarehouse({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="w1" from="#7fc4f2" to="#2a6fb5" />
        <G id="w2" from="#f6cf73" to="#d99211" />
      </defs>
      <path d="M6 20 24 9l18 11v20H6z" fill="url(#w1)" />
      <path d="M6 20 24 9l18 11-4 3-14-8.6L10 23z" fill="#fff" opacity="0.35" />
      <rect x="13" y="26" width="10" height="8" rx="1.8" fill="url(#w2)" stroke="#a86c07" strokeWidth="1.2" />
      <rect x="25" y="26" width="10" height="8" rx="1.8" fill="url(#w2)" stroke="#a86c07" strokeWidth="1.2" />
      <rect x="18" y="34" width="12" height="6" rx="1.8" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export function IcAddBox({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="a1" from="#f9d071" to="#dd8c07" />
        <G id="a2" from="#63dd7d" to="#12a03a" />
      </defs>
      <path d="M7 16 24 8l17 8v17l-17 8-17-8z" fill="url(#a1)" />
      <path d="M7 16 24 24l17-8" stroke="#b9710a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 24v18" stroke="#b9710a" strokeWidth="2" />
      <path d="M7 16 24 8l17 8-17 8z" fill="#fff" opacity="0.25" />
      <circle cx="36" cy="34" r="9" fill="url(#a2)" stroke="#fff" strokeWidth="1.8" />
      <path d="M36 30v8M32 34h8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function IcEditBox({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="e1" from="#f9d071" to="#dd8c07" />
        <G id="e2" from="#ffcf5c" to="#e08c00" />
        <G id="e3" from="#8fa6bd" to="#5a7391" />
      </defs>
      <path d="M7 16 24 8l17 8v17l-17 8-17-8z" fill="url(#e1)" />
      <path d="M7 16 24 24l17-8" stroke="#b9710a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 24v18" stroke="#b9710a" strokeWidth="2" />
      <g transform="rotate(38 34 33)">
        <rect x="31.5" y="20" width="6" height="20" rx="1.6" fill="url(#e2)" stroke="#a86c07" strokeWidth="1.2" />
        <path d="M31.5 40h6l-3 5z" fill="url(#e3)" />
        <rect x="31.5" y="16" width="6" height="5" rx="1.4" fill="#e26a6a" />
      </g>
    </svg>
  );
}

export function IcDeleteBox({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="x1" from="#f9d071" to="#dd8c07" />
        <G id="x2" from="#ff8a80" to="#d92f2f" />
      </defs>
      <path d="M7 16 24 8l17 8v17l-17 8-17-8z" fill="url(#x1)" />
      <path d="M7 16 24 24l17-8" stroke="#b9710a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 24v18" stroke="#b9710a" strokeWidth="2" />
      <circle cx="36" cy="34" r="9" fill="url(#x2)" stroke="#fff" strokeWidth="1.8" />
      <path d="M32.5 34h7" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function IcBarcodeScan({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="s1" from="#8ea6bf" to="#41586f" />
        <G id="s2" from="#3ea8ff" to="#1668d6" />
      </defs>
      <g transform="rotate(-14 24 24)">
        <rect x="14" y="8" width="20" height="11" rx="3" fill="url(#s1)" />
        <rect x="17" y="11" width="14" height="4" rx="1.5" fill="#dff0ff" />
        <path d="M20 19h8l2 10-6 5-6-5z" fill="url(#s1)" />
        <path d="M21 24h6l-1 6-2 2-2-2z" fill="#233b52" />
      </g>
      <g stroke="url(#s2)" strokeWidth="3" strokeLinecap="round">
        <path d="M6 14V8h6M42 14V8h-6M6 34v6h6M42 34v6h-6" />
      </g>
      <g stroke="#1a63b8" strokeWidth="2">
        <path d="M18 20v8M22 20v8M26 20v8M30 20v8" />
      </g>
    </svg>
  );
}

export function IcChartBars({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="h1" from="#8fd9ff" to="#2183d6" />
        <G id="h2" from="#63dd7d" to="#12a03a" />
        <G id="h3" from="#ffd166" to="#e09500" />
      </defs>
      <rect x="5" y="6" width="38" height="34" rx="4" fill="url(#h1)" opacity="0.18" stroke="#9dc0e2" strokeWidth="1.6" />
      <rect x="10" y="26" width="6" height="10" rx="1.6" fill="url(#h1)" />
      <rect x="20" y="18" width="6" height="18" rx="1.6" fill="url(#h2)" />
      <rect x="30" y="12" width="6" height="24" rx="1.6" fill="url(#h3)" />
      <path d="M10 20l7-6 7 3 9-9" stroke="#e03131" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* ============ إعدادات النظام ============ */

export function IcGear({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="g1" from="#8ea6bf" to="#3d5570" />
      </defs>
      <path
        d="M24 5.5l3.2 4.4 5.2-1.6 1 5.4 5.3 1.4-2 5 3.6 4-3.6 4 2 5-5.3 1.4-1 5.4-5.2-1.6L24 42.5l-3.2-4.4-5.2 1.6-1-5.4-5.3-1.4 2-5-3.6-4 3.6-4-2-5L14.6 8.7l1-5.4L20.8 5z"
        fill="url(#g1)"
      />
      <circle cx="24" cy="24" r="7.4" fill="#eaf3fb" />
      <circle cx="24" cy="24" r="3.6" fill="#6c8399" />
    </svg>
  );
}

export function IcUserGear({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="ug1" from="#5aa9ee" to="#1a63b8" />
        <G id="ug2" from="#f6c88a" to="#d99a52" />
        <G id="ug3" from="#8ea6bf" to="#3d5570" />
      </defs>
      <circle cx="19" cy="17" r="7.6" fill="url(#ug2)" />
      <path d="M5 40c0-7.7 6.3-13.4 14-13.4S33 32.3 33 40z" fill="url(#ug1)" />
      <circle cx="36" cy="32" r="6.4" fill="url(#ug3)" />
      <circle cx="36" cy="32" r="2.6" fill="#eaf3fb" />
      <path d="M36 24.5V27M36 37v2.5M28.8 32H31M41 32h2.4" stroke="#4a637c" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IcShieldCheck({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="sh1" from="#6fb4f5" to="#1a5fae" />
      </defs>
      <path d="M24 5 40 11v13c0 10.5-7 17.5-16 20-9-2.5-16-9.5-16-20V11z" fill="url(#sh1)" />
      <path d="M24 5 40 11v13c0 10.5-7 17.5-16 20z" fill="#fff" opacity="0.13" />
      <path d="m16.5 24 5 5 10-10.5" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IcDatabase({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="db1" from="#79c1f7" to="#1c6cc0" />
        <G id="db2" from="#8ea6bf" to="#42596f" />
      </defs>
      <ellipse cx="20" cy="11" rx="12" ry="5" fill="#a9d6f7" />
      <path d="M8 11v22c0 2.8 5.4 5 12 5s12-2.2 12-5V11" fill="url(#db1)" />
      <ellipse cx="20" cy="11" rx="12" ry="5" fill="#cfe8fb" />
      <path d="M8 19c0 2.8 5.4 5 12 5s12-2.2 12-5M8 27c0 2.8 5.4 5 12 5" stroke="#fff" strokeWidth="1.8" opacity="0.8" fill="none" />
      <circle cx="35.5" cy="34" r="7" fill="url(#db2)" />
      <circle cx="35.5" cy="34" r="2.8" fill="#eaf3fb" />
    </svg>
  );
}

export function IcBackup({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="bk1" from="#79c1f7" to="#1a6ac0" />
      </defs>
      <path d="M11 22a13 13 0 0 1 22.5-8.7L37 17" stroke="url(#bk1)" strokeWidth="4.4" strokeLinecap="round" fill="none" />
      <path d="M37 26a13 13 0 0 1-22.5 8.7L11 31" stroke="url(#bk1)" strokeWidth="4.4" strokeLinecap="round" fill="none" />
      <path d="M37 8v9h-9" stroke="url(#bk1)" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M11 40v-9h9" stroke="url(#bk1)" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IcInfo({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="in1" from="#6fb4f5" to="#1668d6" />
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#in1)" />
      <circle cx="24" cy="24" r="18" fill="none" stroke="#0f4f9e" strokeWidth="1.6" />
      <circle cx="24" cy="15.5" r="2.6" fill="#fff" />
      <path d="M24 21v13" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

export function IcBuilding({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="bd1" from="#8fc8f5" to="#2a6fb5" />
      </defs>
      <rect x="10" y="7" width="28" height="34" rx="3" fill="url(#bd1)" />
      <g fill="#fff" opacity="0.85">
        <rect x="15" y="12" width="6" height="6" rx="1.2" />
        <rect x="27" y="12" width="6" height="6" rx="1.2" />
        <rect x="15" y="22" width="6" height="6" rx="1.2" />
        <rect x="27" y="22" width="6" height="6" rx="1.2" />
        <rect x="19" y="32" width="10" height="9" rx="1.4" />
      </g>
    </svg>
  );
}

export function IcClockUsers({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="cl1" from="#5aa9ee" to="#1a63b8" />
        <G id="cl2" from="#ffd166" to="#e09500" />
      </defs>
      <circle cx="18" cy="14" r="5.6" fill="#f6c88a" />
      <path d="M7 33c0-6 5-10.6 11-10.6S29 27 29 33z" fill="url(#cl1)" />
      <circle cx="33" cy="30" r="11" fill="url(#cl2)" stroke="#fff" strokeWidth="2" />
      <path d="M33 24v6.5l4.5 3" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IcPower({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="pw1" from="#ff9d9d" to="#d92f2f" />
      </defs>
      <path d="M24 7v15" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M34.5 13a13.5 13.5 0 1 1-21 0" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="24" r="20" fill="url(#pw1)" opacity="0.0" />
    </svg>
  );
}

export function IcItemCard({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="it1" from="#7ec3f7" to="#1f6cc4" />
        <G id="it2" from="#ffd166" to="#dd8f00" />
      </defs>
      <rect x="8" y="9" width="32" height="30" rx="4" fill="url(#it1)" />
      <rect x="12" y="14" width="9" height="9" rx="1.6" fill="#fff" opacity="0.9" />
      <g fill="#fff" opacity="0.92">
        <rect x="24" y="14.5" width="12" height="2.6" rx="1.3" />
        <rect x="24" y="19.5" width="9" height="2.6" rx="1.3" />
        <rect x="12" y="27" width="24" height="2.6" rx="1.3" />
        <rect x="12" y="32" width="17" height="2.6" rx="1.3" />
      </g>
      <circle cx="35" cy="34" r="7.5" fill="url(#it2)" stroke="#fff" strokeWidth="2" />
      <path d="M35 30.5v7M31.5 34h7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function IcTrendUp({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="tr1" from="#7ee6a6" to="#13a04f" />
      </defs>
      <rect x="7" y="7" width="34" height="34" rx="6" fill="url(#tr1)" />
      <g fill="#fff" opacity="0.9">
        <rect x="13" y="26" width="5" height="9" rx="1.4" />
        <rect x="21.5" y="21" width="5" height="14" rx="1.4" />
        <rect x="30" y="15" width="5" height="20" rx="1.4" />
      </g>
      <path d="M12 18l7-5 6 4 9-8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M30 8.5h6v6" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IcContract({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="ct1" from="#9d8df5" to="#5335c9" />
      </defs>
      <path d="M24 6.5l13 4.2v11.6c0 8.2-5.4 14.2-13 17.2-7.6-3-13-9-13-17.2V10.7z" fill="url(#ct1)" stroke="#3f2499" strokeWidth="1.5" />
      <path d="M17.5 23.5l4.6 4.6 9-9.4" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IcCards({ className }: P) {
  return (
    <svg {...base(className)}>
      <defs>
        <G id="cd1" from="#ffd08a" to="#e08a00" />
      </defs>
      <rect x="5" y="13" width="30" height="21" rx="4" fill="url(#cd1)" stroke="#b06d00" strokeWidth="1.4" />
      <rect x="5" y="18.5" width="30" height="4.4" fill="#fff" opacity="0.85" />
      <rect x="9" y="27" width="9" height="3.2" rx="1.4" fill="#fff" opacity="0.9" />
      <rect x="21" y="6" width="22" height="15" rx="3.4" fill="#ffffff" stroke="#e08a00" strokeWidth="1.6" />
      <g fill="#e08a00" opacity="0.75">
        <rect x="24.5" y="10" width="15" height="2.4" rx="1.2" />
        <rect x="24.5" y="14.6" width="10" height="2.4" rx="1.2" />
      </g>
    </svg>
  );
}

/* ============ أيقونات القائمة الجانبية (بيضاء) ============ */

export function RailHome({ className }: P) {
  return (
    <svg {...base(className)}>
      <path d="M6 23 24 8l18 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M11 22v18h26V22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M20 40v-9h8v9" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function RailUsers({ className }: P) {
  return (
    <svg {...base(className)}>
      <circle cx="18" cy="16" r="7" stroke="currentColor" strokeWidth="3.6" fill="none" />
      <path d="M6 39c0-7 5.4-12 12-12s12 5 12 12" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="19" r="5.2" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <path d="M33 30.5c5.5 0 9.5 3.8 9.5 8.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function RailShifts({ className }: P) {
  return (
    <svg {...base(className)}>
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3.6" fill="none" />
      <path d="M24 13v11l8 5.5" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function RailSettings({ className }: P) {
  return (
    <svg {...base(className)}>
      <path
        d="M20 6h8l1.4 4.6 4.2 1.7 4.3-2 4 6.9-3.5 3.2.3 2.6 3.2 3.5-4 6.9-4.3-2-4.2 1.7L28 38h-8l-1.4-4.6-4.2-1.7-4.3 2-4-6.9 3.5-3.2-.3-2.6L6.1 18l4-6.9 4.3 2 4.2-1.7z"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
        transform="translate(0,2)"
      />
      <circle cx="24" cy="24" r="5.6" stroke="currentColor" strokeWidth="3.2" fill="none" />
    </svg>
  );
}

export function RailDatabase({ className }: P) {
  return (
    <svg {...base(className)}>
      <ellipse cx="24" cy="11" rx="13" ry="5.2" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <path d="M11 11v26c0 2.9 5.8 5.2 13 5.2s13-2.3 13-5.2V11" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <path d="M11 20c0 2.9 5.8 5.2 13 5.2S37 22.9 37 20M11 29c0 2.9 5.8 5.2 13 5.2S37 31.9 37 29" stroke="currentColor" strokeWidth="2.6" fill="none" opacity="0.75" />
    </svg>
  );
}

export function RailBackup({ className }: P) {
  return (
    <svg {...base(className)}>
      <rect x="7" y="9" width="34" height="11" rx="2.6" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <rect x="7" y="28" width="34" height="11" rx="2.6" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <circle cx="14" cy="14.5" r="2" fill="currentColor" />
      <circle cx="14" cy="33.5" r="2" fill="currentColor" />
    </svg>
  );
}

export function RailSupport({ className }: P) {
  return (
    <svg {...base(className)}>
      <path d="M9 28v-4a15 15 0 0 1 30 0v4" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <rect x="5" y="26" width="8" height="12" rx="3.5" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <rect x="35" y="26" width="8" height="12" rx="3.5" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <path d="M39 38c0 3-3 5-8 5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function RailInfo({ className }: P) {
  return (
    <svg {...base(className)}>
      <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="3.4" fill="none" />
      <circle cx="24" cy="15.5" r="2.4" fill="currentColor" />
      <path d="M24 21v13" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

/** درع بعلامة صح — حالة الاشتراك */
export function RailShield({ className }: P) {
  return (
    <svg {...base(className)}>
      <path
        d="M24 6l14 5v11c0 9-6 15-14 18-8-3-14-9-14-18V11l14-5z"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M17 23l5 5 10-10" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** بطاقة ترخيص — لوحة التراخيص */
export function RailCard({ className }: P) {
  return (
    <svg {...base(className)}>
      <rect x="5" y="11" width="38" height="26" rx="5" stroke="currentColor" strokeWidth="3.2" fill="none" />
      <path d="M5 20h38" stroke="currentColor" strokeWidth="3.2" />
      <path d="M12 30h9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
