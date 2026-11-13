import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function ReturnBadge() {
  return (
    <g>
      <circle cx="48" cy="15" r="13" fill="url(#g-orange)" stroke="#fff" strokeWidth="2.5" />
      <path d="M54 19.5a7.5 7.5 0 1 1-1.2-10" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M55.5 4.5v6.5H49" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export function IconReturn(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M3 13h8l9.5 31H50" fill="none" stroke="url(#g-blue-dark)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 21h33l-5 19H20.5z" fill="#dcebff" stroke="url(#g-blue-dark)" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="24" cy="53" r="5.5" fill="url(#g-blue-dark)" />
      <circle cx="45" cy="53" r="5.5" fill="url(#g-blue-dark)" />
      <ReturnBadge />
    </svg>
  );
}

export function IconReturnBox(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M28 14 52 25 28 36 4 25z" fill="url(#g-orange-light)" />
      <path d="M4 25 28 36v25L4 50z" fill="url(#g-orange)" />
      <path d="M52 25 28 36v25l24-11z" fill="url(#g-orange-dark)" />
      <path d="M16 19.5 40 30.5v25" fill="none" stroke="#fbe2b4" strokeWidth="4" opacity=".9" />
      <ReturnBadge />
    </svg>
  );
}

export function IconExpense(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="14" y="6" width="40" height="16" rx="2" fill="url(#g-green)" transform="rotate(-10 34 14)" />
      <circle cx="34" cy="13" r="4" fill="#d9f7d4" transform="rotate(-10 34 14)" />
      <rect x="4" y="18" width="52" height="40" rx="7" fill="url(#g-wood)" />
      <rect x="4" y="18" width="52" height="9" rx="4" fill="#a86a32" />
      <rect x="38" y="31" width="22" height="15" rx="4" fill="url(#g-orange)" stroke="#8a5426" strokeWidth="1.2" />
      <circle cx="46" cy="38.5" r="3" fill="#fff" />
      <circle cx="13" cy="13" r="10" fill="url(#g-red)" stroke="#fff" strokeWidth="2.2" />
      <path d="M8 13h10" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconTreasury(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="6" y="6" width="52" height="48" rx="6" fill="url(#g-gray)" stroke="#6f809c" strokeWidth="1.6" />
      <rect x="11" y="11" width="42" height="38" rx="4" fill="url(#g-silver)" stroke="#8a97ab" />
      <circle cx="30" cy="30" r="11" fill="url(#g-blue)" stroke="#0a3a91" strokeWidth="1.6" />
      <circle cx="30" cy="30" r="3.8" fill="#fff" />
      <path d="M30 19.5v4.5M30 36v4.5M19.5 30H24M36 30h4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="45" y="23" width="4" height="14" rx="2" fill="#6f809c" />
      <rect x="10" y="54" width="9" height="6" rx="1.5" fill="#6f809c" />
      <rect x="45" y="54" width="9" height="6" rx="1.5" fill="#6f809c" />
      <circle cx="52" cy="12" r="9" fill="url(#g-yellow)" stroke="#a86b00" strokeWidth="1.4" />
      <text x="52" y="16" textAnchor="middle" fontSize="11" fontWeight="900" fill="#7a4a00" fontFamily="Arial">
        $
      </text>
    </svg>
  );
}

const BARS: Array<[number, number]> = [
  [10, 2.5], [14, 1.2], [17, 3.4], [22, 1.2], [25, 2.2], [29, 1.2], [32, 3.4], [37, 1.2], [40, 2.5], [44.5, 1.2], [47.5, 3.2], [52.5, 1.4],
];

export function IconBarcode(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M8 8h40l10 10v38H8z" fill="#fff" stroke="url(#g-blue-dark)" strokeWidth="3" strokeLinejoin="round" />
      <g fill="#1f2b3d">
        {BARS.map(([x, w]) => (
          <rect key={x} x={x} y="17" width={w} height="25" />
        ))}
      </g>
      <rect x="11" y="46" width="42" height="5" rx="2" fill="#9aabc4" />
      <path d="M2 30h60" stroke="#e1251b" strokeWidth="2" opacity=".85" />
    </svg>
  );
}

export function IconItemCard(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="10" y="8" width="42" height="52" rx="5" fill="url(#g-orange-light)" stroke="#a5561b" strokeWidth="1.6" />
      <rect x="21" y="3.5" width="20" height="9" rx="3" fill="url(#g-blue-dark)" />
      <path d="M18 24h26M18 32h26M18 40h17" stroke="#a5561b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="47" cy="48" r="10" fill="url(#g-green)" stroke="#fff" strokeWidth="2.2" />
      <path d="M42.5 48l3.2 3.2 5.5-6.4" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconInvoices(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <path d="M16 8h26l10 10v40H16z" fill="#e6eefb" stroke="#7f9cc9" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 4h28l12 12v44H10z" fill="#fff" stroke="url(#g-blue-dark)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 4v12h12" fill="#dcebff" stroke="url(#g-blue-dark)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 26h24M18 34h24M18 42h14" stroke="#3b82e6" strokeWidth="3" strokeLinecap="round" />
      <rect x="18" y="48" width="24" height="6" rx="2" fill="url(#g-green)" />
    </svg>
  );
}

export function IconCalculator(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="12" y="4" width="40" height="56" rx="7" fill="url(#g-navy)" />
      <rect x="17" y="9" width="30" height="12" rx="2" fill="#c9f2c7" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={17 + c * 10.5} y={26 + r * 10.5} width="8.5" height="8" rx="2" fill="#fff" />),
      )}
      <rect x="17" y="49" width="19" height="7" rx="2" fill="#fff" />
      <rect x="38" y="49" width="9" height="7" rx="2" fill="url(#g-orange)" />
    </svg>
  );
}

export function IconSmartOrders(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="8" y="14" width="48" height="42" rx="6" fill="url(#g-blue)" stroke="#0b3fa8" strokeWidth="2" />
      <circle cx="23" cy="30" r="5" fill="#fff" />
      <circle cx="41" cy="30" r="5" fill="#fff" />
      <path d="M22 42h20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 4v10" stroke="url(#g-yellow)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="4" r="4.5" fill="url(#g-yellow)" />
    </svg>
  );
}

export function IconShifts(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <circle cx="32" cy="32" r="26" fill="url(#g-navy)" stroke="#fff" strokeWidth="2" />
      <circle cx="32" cy="32" r="21" fill="url(#g-silver)" />
      <path d="M32 16v16l11 6" stroke="#0b3fa8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill="#e1251b" />
    </svg>
  );
}

export function IconInstallments(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="8" y="10" width="48" height="46" rx="5" fill="#fff" stroke="url(#g-blue-dark)" strokeWidth="2" />
      <rect x="8" y="10" width="48" height="13" rx="3" fill="url(#g-green)" />
      <path d="M19 6v8M45 6v8" stroke="#13439b" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 32l8 8 16-16" fill="none" stroke="url(#g-green)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCategories(p: P) {
  return (
    <svg viewBox="0 0 64 64" {...p}>
      <rect x="6" y="8" width="22" height="22" rx="4" fill="url(#g-blue)" />
      <rect x="36" y="8" width="22" height="22" rx="4" fill="url(#g-orange)" />
      <rect x="6" y="36" width="22" height="22" rx="4" fill="url(#g-green)" />
      <rect x="36" y="36" width="22" height="22" rx="4" fill="url(#g-yellow)" />
    </svg>
  );
}
