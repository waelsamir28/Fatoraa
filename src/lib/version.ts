import { APP_VERSION } from "./constants";

/**
 * إصدار الواجهة/الويب — نفس قيمة APP_VERSION.
 * يُحدَّث تلقائياً بأمر: npm run release 1.2.0
 */
export const WEB_VERSION = APP_VERSION;

/** اسم المالك والمستودع على GitHub (لتحميل إصدارات سطح المكتب) */
export const GITHUB_OWNER = "waelsamir28";
export const GITHUB_REPO = "Fatoraa";

export const RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export { APP_VERSION };

/** مقارنة إصدارات بسيطة: يرجّع 1 لو a أحدث، -1 لو b أحدث، 0 لو متساويان */
export function compareVersions(a: string, b: string): number {
  const pa = String(a).replace(/^v/i, "").split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).replace(/^v/i, "").split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export const isNewer = (candidate: string, current: string) => compareVersions(candidate, current) > 0;
