import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * عنوان جهاز الكاشير على الشبكة المحلية — لعرض رابط «ماسح الموبايل» في الواجهة.
 *
 * ترتيب الأولوية:
 *  1) FATORA_LAN_HOST — يضبطه برنامج الويندوز تلقائياً (أدق عنوان للجهاز).
 *  2) اختيار عنوان IPv4 محلي من كروت الشبكة (192.168.x / 10.x أولاً).
 *  3) PUBLIC_BASE_URL — للنسخة السحابية (HTTPS).
 */
function pickLanIp(): string {
  const hint = (process.env.FATORA_LAN_HOST || "").trim();
  if (hint) return hint;
  const nets = os.networkInterfaces();
  const list: string[] = [];
  for (const name of Object.keys(nets)) {
    const arr = nets[name] ?? [];
    for (const net of arr) {
      if (net.internal) continue;
      if (String(net.family) !== "IPv4") continue;
      list.push(net.address);
    }
  }
  /**
   * ترتيب العناوين: نفضّل عناوين الشبكة المحلية الحقيقية ونستبعد 169.254 (link-local
   * — معناها الجهاز مش واخد IP من الراوتر، فمش هيفتح من الموبايل).
   */
  const rank = (a: string) =>
    a.startsWith("169.254.") ? 9 : a.startsWith("192.168.") ? 0 : a.startsWith("10.") ? 1 : a.startsWith("172.") ? 2 : 3;
  const usable = list.filter((a) => !a.startsWith("169.254."));
  const pool = usable.length ? usable : list;
  pool.sort((a, b) => rank(a) - rank(b));
  return pool[0] || "";
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const port = (process.env.PORT || (u.port ? u.port : "3000")).toString();
  const hostHeader = u.hostname;

  // الويندوز: البرنامج شغّال على 127.0.0.1 — لازم نعرض عنوان الشبكة مش localhost
  const isLocalHost = hostHeader === "127.0.0.1" || hostHeader === "localhost" || hostHeader === "0.0.0.0";
  const ip = pickLanIp();

  const httpsHost = (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  const isHttps = u.protocol === "https:" || httpsHost.startsWith("https://");

  let url = "";
  let hint = "";

  if (isHttps) {
    // النسخة السحابية: رابط HTTPS جاهز ويعمل على أي موبايل
    url = `${httpsHost || u.origin}/scan`;
    hint = "الموبايل بيفتح الرابط ده من أي شبكة (رابط سحابي آمن HTTPS).";
  } else if (ip) {
    url = `http://${ip}:${port}/scan`;
    hint = "الموبايل لازم يكون على نفس شبكة الواي فاي بتاعة الكاشير.";
  } else {
    hint = "الجهاز مش متصل بشبكة محلية — وصّله بالواي فاي أو استخدم نسخة السحابة.";
  }

  return NextResponse.json({
    url,
    ip,
    port,
    local: isLocalHost,
    secure: isHttps,
    httpsHost,
    hint,
    /** تنبيه: متصفحات الموبايل تمنع الكاميرا على http (غير آمن) */
    cameraWarning: !isHttps,
  });
}
