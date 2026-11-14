import { NextResponse } from "next/server";
import {
  GITHUB_OWNER,
  GITHUB_REPO,
  RELEASES_PAGE,
  WEB_VERSION,
  isNewer,
} from "@/lib/version";

// يقرأ من GitHub مباشرة - لا تُخزَّن النتيجة مؤقتاً في وقت البناء
export const dynamic = "force-dynamic";

interface GithubAsset {
  name?: string;
  browser_download_url?: string;
  size?: number;
}
interface GithubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  assets?: GithubAsset[];
}

/** جلب أحدث إصدار منشور على GitHub Releases (بدون الحاجة لتوكن لأنه مستودع عام) */
async function fetchLatestRelease(): Promise<GithubRelease | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "FATORA-Update" },
      // كاش قصير على مستوى الخادم لتقليل استدعاءات GitHub
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as GithubRelease;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const clientVersion = u.searchParams.get("current") || "";
  const platform = (u.searchParams.get("platform") || "").toLowerCase();

  const release = await fetchLatestRelease();
  const latest = String(release?.tag_name || "").replace(/^v/i, "");

  // اختيار الملف المناسب: نسخة التثبيت أولاً ثم المحمولة
  const assets = release?.assets ?? [];
  const pick =
    assets.find((a) => /setup.*\.exe$/i.test(a.name || "")) ||
    assets.find((a) => /portable.*\.exe$/i.test(a.name || "")) ||
    assets.find((a) => /\.exe$/i.test(a.name || ""));

  return NextResponse.json({
    webVersion: WEB_VERSION,
    latestDesktopVersion: latest || null,
    releaseName: release?.name || null,
    releaseNotes: release?.body || null,
    publishedAt: release?.published_at || null,
    downloadUrl: pick?.browser_download_url || RELEASES_PAGE,
    downloadSize: pick?.size || null,
    releasesPage: RELEASES_PAGE,
    // هل يوجد إصدار سطح مكتب أحدث من النسخة المرسلة من البرنامج؟
    desktopUpdateAvailable: Boolean(latest && clientVersion && isNewer(latest, clientVersion)),
    platform: platform || null,
    checkedAt: new Date().toISOString(),
  });
}
