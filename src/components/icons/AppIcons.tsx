import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** تعريفات التدرجات اللونية المشتركة لكل الأيقونات (تُرسم مرة واحدة) */
export function IconDefs() {
  const lg = (id: string, a: string, b: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
  return (
    <svg aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {lg("g-blue", "#62b0ff", "#0b57d0")}
        {lg("g-blue-dark", "#2f78e0", "#0a3a91")}
        {lg("g-orange", "#f6b45c", "#d9822b")}
        {lg("g-orange-dark", "#d9822b", "#a5561b")}
        {lg("g-orange-light", "#ffe3ad", "#f2b660")}
        {lg("g-green", "#7be36b", "#1f9d2b")}
        {lg("g-red", "#ff6b5e", "#d0190f")}
        {lg("g-yellow", "#ffe680", "#f4a900")}
        {lg("g-gray", "#f2f5f9", "#aab6c8")}
        {lg("g-silver", "#ffffff", "#d3dae4")}
        {lg("g-skin", "#ffdcc0", "#efb084")}
        {lg("g-wood", "#c98a4b", "#8a5426")}
        {lg("g-navy", "#36589f", "#142d66")}
        {lg("g-teal", "#5fd0e0", "#0b8a9c")}
      </defs>
    </svg>
  );
}

function gearPath(cx: number, cy: number, ro: number, ri: number, teeth: number) {
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const seq: Array<[number, number]> = [
      [ri, a - step * 0.27],
      [ro, a - step * 0.15],
      [ro, a + step * 0.15],
      [ri, a + step * 0.27],
    ];
    for (const [r, ang] of seq) pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)} ${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}
const GEAR = gearPath(32, 32, 29.5, 22, 8);

export function IconSales({ plus = true, ...p }: IconProps & { plus?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M18 17h40l-6 21H23z" fill="#dcebff" />
      <path d="M28.5 17v21M38.5 17v21M48 17v21M20.5 27.5h34.5" stroke="#3b82e6" strokeWidth="2" />
      <path d="M3 9h9l9.5 33H52" fill="none" stroke="url(#g-blue-dark)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17h41l-6 21H22.5" fill="none" stroke="url(#g-blue-dark)" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="25" cy="52" r="5.5" fill="url(#g-blue-dark)" />
      <circle cx="25" cy="52" r="2" fill="#fff" />
      <circle cx="48" cy="52" r="5.5" fill="url(#g-blue-dark)" />
      <circle cx="48" cy="52" r="2" fill="#fff" />
      {plus && (
        <g>
          <circle cx="50" cy="13" r="11" fill="url(#g-green)" stroke="#fff" strokeWidth="2.5" />
          <path d="M50 7.5v11M44.5 13h11" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export function IconBox(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M32 5 59 17.5 32 30 5 17.5z" fill="url(#g-orange-light)" />
      <path d="M5 17.5 32 30v29L5 46.5z" fill="url(#g-orange)" />
      <path d="M59 17.5 32 30v29l27-12.5z" fill="url(#g-orange-dark)" />
      <path d="M18.5 11.25 45.5 23.75v29" fill="none" stroke="#fbe2b4" strokeWidth="5" opacity=".9" />
      <path d="M5 17.5 32 30 59 17.5M32 30v29" fill="none" stroke="#fff4dc" strokeWidth="1" opacity=".6" />
    </svg>
  );
}

export function IconWarehouse(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M9 27 32 11l23 16v29H9z" fill="url(#g-silver)" stroke="#9aabc4" strokeWidth="1.2" />
      <path d="M3.5 28.5 32 8.5l28.5 20" fill="none" stroke="url(#g-blue)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="17" y="31" width="30" height="25" rx="1" fill="#33445f" />
      <rect x="19.5" y="44" width="12" height="12" fill="url(#g-orange)" stroke="#a5561b" strokeWidth=".8" />
      <rect x="32.5" y="44" width="12" height="12" fill="url(#g-orange)" stroke="#a5561b" strokeWidth=".8" />
      <rect x="26" y="33" width="12" height="11" fill="url(#g-orange-light)" stroke="#a5561b" strokeWidth=".8" />
      <path d="M25.5 44v4M38.5 44v4M32 33v4" stroke="#fff3d6" strokeWidth="1.6" />
      <rect x="5" y="55.5" width="54" height="3.5" rx="1.5" fill="#6f809c" />
    </svg>
  );
}

export function IconReports(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="5" y="40" width="10" height="19" rx="1.5" fill="url(#g-blue)" />
      <rect x="19" y="32" width="10" height="27" rx="1.5" fill="url(#g-blue)" />
      <rect x="33" y="24" width="10" height="35" rx="1.5" fill="url(#g-blue)" />
      <rect x="47" y="15" width="10" height="44" rx="1.5" fill="url(#g-yellow)" />
      <path d="M4 31 19 20l10 6 20-15.5" fill="none" stroke="url(#g-red)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M55.5 5.4 51.8 14.1 46.2 6.9z" fill="#e0261b" />
    </svg>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d={GEAR} fill="url(#g-blue)" stroke="#0a3a91" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="12.5" fill="url(#g-blue-dark)" />
      <circle cx="32" cy="32" r="8.5" fill="#fff" />
      <path d="M14.5 23a19 19 0 0 1 15-11" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IconCustomers(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M11 24c0-11 4.5-16 11-16s11 5 11 16v9H11z" fill="#8a4b22" />
      <circle cx="22" cy="21" r="8.5" fill="url(#g-skin)" />
      <path d="M13.5 19c1-6 4.5-9 8.5-9s7.5 3 8.5 9c-3-2.5-6-3.5-8.5-3.5S16.5 16.5 13.5 19z" fill="#8a4b22" />
      <path d="M4 58c0-12 7.5-20 18-20s18 8 18 20z" fill="url(#g-orange)" />
      <circle cx="42" cy="25" r="9.5" fill="url(#g-skin)" />
      <path d="M32.5 23.5c0-7.5 4-12 9.5-12s9.5 4.5 9.5 11c-2.5-2.5-5.5-3.5-9.5-3.5s-7 1.5-9.5 4.5z" fill="#3b2a1e" />
      <path d="M23 61c0-13.5 8.5-22 19-22s19 8.5 19 22z" fill="url(#g-navy)" />
      <path d="M42 39l-5.5 7L42 61l5.5-15z" fill="#fff" />
      <path d="M42 42.5l-2 4 2 10 2-10z" fill="#d0190f" />
    </svg>
  );
}

export function IconSuppliers(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="3" y="15" width="36" height="29" rx="2" fill="url(#g-orange)" />
      <path d="M12 15v29M3 29h36" stroke="#fbe2b4" strokeWidth="1.5" opacity=".8" />
      <path d="M39 23h12.5l9.5 10.5V44H39z" fill="url(#g-blue)" />
      <path d="M43 26.5h7l5.5 7H43z" fill="#dcebff" />
      <circle cx="14" cy="47" r="6.5" fill="#2b2f36" />
      <circle cx="14" cy="47" r="2.6" fill="#cfd6e0" />
      <circle cx="50" cy="47" r="6.5" fill="#2b2f36" />
      <circle cx="50" cy="47" r="2.6" fill="#cfd6e0" />
    </svg>
  );
}

export function IconBackup(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M7 12v32c0 4 9 7.5 20 7.5S47 48 47 44V12" fill="url(#g-gray)" stroke="#7f8ca3" strokeWidth="1.2" />
      <ellipse cx="27" cy="12" rx="20" ry="7" fill="url(#g-silver)" stroke="#7f8ca3" strokeWidth="1.2" />
      <path d="M7 23c0 4 9 7 20 7s20-3 20-7M7 34c0 4 9 7 20 7s20-3 20-7" fill="none" stroke="#7f8ca3" strokeWidth="1.2" />
      <circle cx="46" cy="46" r="15" fill="#fff" opacity=".95" />
      <path d="M36 46A10 10 0 0 1 53.07 38.93" fill="none" stroke="url(#g-green)" strokeWidth="4" strokeLinecap="round" />
      <path d="M56 46A10 10 0 0 1 38.93 53.07" fill="none" stroke="url(#g-green)" strokeWidth="4" strokeLinecap="round" />
      <path d="M56.6 42.5 49.6 41 55.2 35.4z" fill="#1f9d2b" />
      <path d="M35.4 49.5 42.5 51 36.8 56.6z" fill="#1f9d2b" />
    </svg>
  );
}

export function IconSupport(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M9 62c0-13 10.5-21 23-21s23 8 23 21z" fill="url(#g-blue)" />
      <path d="M32 41l-6.5 6.5L32 62l6.5-14.5z" fill="#fff" />
      <circle cx="32" cy="26" r="12" fill="url(#g-skin)" />
      <path d="M20 25c0-9 5-14.5 12-14.5S44 16 44 25c-2.5-5-6.5-7-12-7s-9.5 2-12 7z" fill="#3b2a1e" />
      <path d="M17.5 29a14.5 14.5 0 0 1 29 0" fill="none" stroke="#252a33" strokeWidth="3" />
      <rect x="13.5" y="25" width="7" height="12" rx="3" fill="#252a33" />
      <rect x="43.5" y="25" width="7" height="12" rx="3" fill="#252a33" />
      <path d="M17 36c0 5 4 8.5 10 8.5" fill="none" stroke="#252a33" strokeWidth="2.2" />
      <circle cx="28.5" cy="44.5" r="2.4" fill="#252a33" />
    </svg>
  );
}

export function IconInfo(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <circle cx="32" cy="32" r="28" fill="url(#g-blue)" stroke="#0a3a91" strokeWidth="1.5" />
      <ellipse cx="32" cy="17" rx="19" ry="9" fill="#fff" opacity=".22" />
      <circle cx="32" cy="18" r="4.5" fill="#fff" />
      <rect x="27.5" y="26" width="9" height="23" rx="2.5" fill="#fff" />
    </svg>
  );
}

export function IconHelp(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <circle cx="32" cy="32" r="28" fill="url(#g-blue)" stroke="#0a3a91" strokeWidth="1.5" />
      <ellipse cx="32" cy="17" rx="19" ry="9" fill="#fff" opacity=".22" />
      <path d="M23 25c0-6 4-9.5 9.5-9.5S42 19 42 24.5c0 7-9 7-9 13.5" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="33" cy="47.5" r="4" fill="#fff" />
    </svg>
  );
}

export function IconExit(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="25" y="5" width="32" height="54" rx="2" fill="#4a2a12" />
      <rect x="28" y="8" width="26" height="51" fill="#1d1208" opacity=".6" />
      <path d="M29 8.5 47 13v49l-18-3.5z" fill="url(#g-wood)" stroke="#5a3418" strokeWidth="1" />
      <circle cx="43" cy="37" r="2" fill="#ffd25e" />
      <path d="M3 28.5h15V21l13 11-13 11v-7.5H3z" fill="url(#g-red)" stroke="#a5120a" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M32 7 5 30h8v27h38V30h8z" fill="url(#g-yellow)" stroke="#a86b00" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 7 5 30h8l19-16 19 16h8z" fill="#e8590c" opacity=".85" />
      <rect x="26" y="37" width="12" height="20" rx="1" fill="#9a5b16" />
      <rect x="42" y="35" width="6" height="6" fill="#fff" opacity=".85" />
      <rect x="16" y="35" width="6" height="6" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** أيقونة شريط العنوان (عربة بيضاء) */
export function CartLogo(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M4 10h9l9 32h30" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17h41l-6 21H22.5z" fill="rgba(255,255,255,.22)" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <path d="M28 17v21M38.5 17v21M48 17v21M20 27.5h35" stroke="#fff" strokeWidth="2.5" />
      <circle cx="25" cy="52" r="5" fill="#fff" />
      <circle cx="48" cy="52" r="5" fill="#fff" />
    </svg>
  );
}

/** العربة الكبيرة في واجهة البرنامج */
export function BrandCart(p: IconProps) {
  return (
    <svg viewBox="0 0 240 160" {...p}>
      <g stroke="#e1251b" strokeWidth="8" strokeLinecap="round">
        <path d="M8 46h52M22 66h38M36 86h24" />
      </g>
      <path d="M232 14h-24l-22 86H92" fill="none" stroke="#1565c0" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M203 34H72l16 52h102" fill="#fff" stroke="#1565c0" strokeWidth="10" strokeLinejoin="round" />
      <path d="M102 34v52M132 34v52M162 34v52M80 60h116" stroke="#1565c0" strokeWidth="6" />
      <circle cx="108" cy="126" r="12" fill="#1565c0" />
      <circle cx="170" cy="126" r="12" fill="#1565c0" />
    </svg>
  );
}

export function UserAvatar(p: IconProps) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M7 64c0-14 10.5-22 25-22s25 8 25 22z" fill="#1f2b3d" />
      <path d="M24 43l8 21 8-21-8 4z" fill="#fff" />
      <path d="M30.5 47h3l1.5 3-3 12-3-12z" fill="#d0190f" />
      <rect x="27" y="34" width="10" height="10" fill="#e9a77c" />
      <ellipse cx="20.5" cy="25" rx="2.2" ry="3.2" fill="#e9a77c" />
      <ellipse cx="43.5" cy="25" rx="2.2" ry="3.2" fill="#e9a77c" />
      <ellipse cx="32" cy="24" rx="11" ry="13" fill="url(#g-skin)" />
      <path d="M20.5 22c0-10 5-15 11.5-15S43.5 12 43.5 22c-1-4-3-6-5-7-4 2-9 3-14 2-2 1-3 3-4 5z" fill="#2a1d14" />
    </svg>
  );
}

export function PdfIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...p}>
      <path d="M10 3h20l9 9v33H10z" fill="#fff" stroke="#8a97ab" strokeWidth="1.5" />
      <path d="M30 3v9h9" fill="#e6ebf2" stroke="#8a97ab" strokeWidth="1.5" />
      <rect x="4" y="9" width="26" height="12" rx="2" fill="#e1251b" />
      <text x="17" y="18.6" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#fff" fontFamily="Arial">
        PDF
      </text>
      <path d="M24.5 25v11" stroke="#e1251b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M18.5 32l6 7 6-7z" fill="#e1251b" />
    </svg>
  );
}

export function AddUserIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...p}>
      <path d="M3 44c0-10 7.5-17 17-17s17 7 17 17z" fill="url(#g-teal)" />
      <circle cx="20" cy="15" r="9" fill="url(#g-skin)" />
      <path d="M11 14c0-6 4-10 9-10s9 4 9 9c-2-2-5-3-9-3s-7 2-9 4z" fill="#3b2a1e" />
      <circle cx="37" cy="35" r="9" fill="url(#g-green)" stroke="#fff" strokeWidth="2" />
      <path d="M37 30.5v9M32.5 35h9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
