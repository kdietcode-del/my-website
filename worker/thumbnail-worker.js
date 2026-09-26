/* ============================================================
   썸네일 · 제품정보 가져오기 — Cloudflare Workers 용

   브라우저는 다른 사이트의 내용을 직접 읽지 못한다(CORS). 그래서 이 작은
   중계 서버가 대신 상세페이지를 받아 와, 필요한 값만 뽑아 돌려준다.

   쓰는 법:  GET https://<워커주소>/?url=https://example.com/product/1
   돌려주는 값: { ok, title, image, price, description, siteName, source }

   배포 방법은 저장소의 worker/README.md 를 보세요.
   ============================================================ */

/* 이 목록에 있는 주소에서 온 요청만 받는다. 남들이 공짜 프록시로 갖다 쓰는 것을
   막기 위한 것이다. 사이트 주소가 또 바뀌면 여기에 한 줄 더 넣으면 된다. */
const ALLOWED_ORIGINS = [
  "https://by.phb.kr",               // 지금 쓰는 주소
  "https://kdietcode-del.github.io", // 예전 주소 (아직 살아 있음)
  "http://localhost:8765",           // 내 PC에서 시험할 때
];

/* 가져올 수 있는 최대 크기. 상세페이지가 아주 큰 경우를 대비한 안전장치. */
const MAX_BYTES = 2 * 1024 * 1024;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign(
      { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      corsHeaders(origin)
    ),
  });
}

/* <meta property="og:image" content="..."> 같은 태그에서 값을 꺼낸다.
   속성 순서가 뒤바뀐 경우도 있어 양쪽 다 본다. */
function readMeta(html, key) {
  const patterns = [
    new RegExp(
      '<meta[^>]+(?:property|name)\\s*=\\s*["\']' + key + '["\'][^>]*content\\s*=\\s*["\']([^"\']*)["\']',
      "i"
    ),
    new RegExp(
      '<meta[^>]+content\\s*=\\s*["\']([^"\']*)["\'][^>]*(?:property|name)\\s*=\\s*["\']' + key + '["\']',
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const found = html.match(pattern);
    if (found && found[1]) return decodeEntities(found[1].trim());
  }
  return "";
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/* 상품 구조화 정보(JSON-LD)가 있으면 가격·이름이 가장 정확하다. */
function readJsonLd(html) {
  const out = {};
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const body = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      continue;
    }
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      const type = String(item["@type"] || "").toLowerCase();
      if (type !== "product") continue;
      if (item.name && !out.title) out.title = String(item.name);
      if (item.image && !out.image) {
        out.image = Array.isArray(item.image) ? String(item.image[0]) : String(item.image);
      }
      const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
      if (offers && offers.price && !out.price) out.price = String(offers.price);
    }
  }
  return out;
}

/* 본문에서 '28,000원' 같은 표기를 찾아 고른다. JSON-LD 도 메타 태그도 없을 때
   쓰는 마지막 수단이라 확실하지 않다.

   그냥 '가장 자주 나온 값' 으로 뽑으면 배송비에 걸린다. 3,000원 같은 금액이
   안내 문구마다 반복돼 실제 판매가보다 많이 나오기 때문이다. 그래서 배송비로
   보기 어려운 금액이 하나라도 있으면 그 안에서만 고른다. */
function guessPrice(html) {
  const text = html.replace(/<[^>]+>/g, " ");
  const matches = text.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*원/g) || [];
  if (!matches.length) return "";

  const counts = new Map();
  matches.forEach((raw) => {
    const value = raw.replace(/[^0-9]/g, "");
    const number = Number(value);
    if (number < 1000 || number > 10000000) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  if (!counts.size) return "";

  const all = Array.from(counts.entries());
  const SHIPPING_CEILING = 5000;
  const real = all.filter(([value]) => Number(value) >= SHIPPING_CEILING);
  const pool = real.length ? real : all;

  /* 같은 횟수면 큰 쪽을 고른다. 할인가와 정가가 나란히 나오는 경우가 많은데,
     둘 중 무엇이든 배송비보다는 낫다. */
  pool.sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]));
  return pool[0][0];
}

function absolute(candidate, base) {
  if (!candidate) return "";
  try {
    return new URL(candidate, base).href;
  } catch (e) {
    return "";
  }
}

/* ============================================================
   키워드 검색량 — 네이버가 공식으로 여는 두 창구를 합친다.

   · 검색광고 API   지난 한 달 PC·모바일 검색수 (실제 숫자)
   · 데이터랩 API   최근 6개월 검색 추이 (제일 높은 달을 100 으로 둔 비율)

   데이터랩은 비율만 주고, 검색광고는 최근 한 달 숫자만 준다. 그래서 마지막
   달의 비율을 그 숫자에 맞춰 놓고 나머지 달을 같은 배율로 편다. 지난 달들의
   숫자는 어디까지나 추정이라, 화면에도 그렇게 적어 둔다.

   쓰는 법:  GET https://<워커주소>/keyword?q=기미크림
   ============================================================ */

/* 검색광고 API 는 "시각.메서드.경로" 를 비밀키로 서명한 값을 요구한다. */
async function signSearchAd(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  let binary = "";
  new Uint8Array(signed).forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary);
}

/* 검색수가 10 미만이면 숫자가 아니라 "< 10" 이라는 글자가 온다. */
function toCount(value) {
  if (typeof value === "number") return value;
  const digits = String(value == null ? "" : value).replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function ymd(date) {
  const pad = (n) => (n < 10 ? "0" + n : String(n));
  return date.getUTCFullYear() + "-" + pad(date.getUTCMonth() + 1) + "-" + pad(date.getUTCDate());
}

/* 지난 한 달 검색수 */
async function fetchSearchAd(env, word) {
  const path = "/keywordstool";
  const timestamp = String(Date.now());
  const signature = await signSearchAd(env.NAVER_AD_SECRET_KEY, timestamp + ".GET." + path);

  const response = await fetch(
    "https://api.searchad.naver.com" + path +
      "?hintKeywords=" + encodeURIComponent(word) + "&showDetail=1",
    {
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": env.NAVER_AD_API_KEY,
        "X-Customer": String(env.NAVER_AD_CUSTOMER_ID),
        "X-Signature": signature,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );
  if (!response.ok) {
    throw new Error("검색광고 API 가 " + response.status + " 를 돌려줬습니다. 열쇠 세 개를 확인해 주세요.");
  }

  const data = await response.json();
  const list = (data && data.keywordList) || [];

  /* 검색광고는 띄어쓰기를 없앤 대문자로 돌려준다. 넣은 말과 똑같은 줄을
     먼저 찾고, 없으면 가장 가까운 첫 줄을 쓴다. */
  const want = word.replace(/\s+/g, "").toUpperCase();
  const hit =
    list.find((row) => String(row.relKeyword || "").replace(/\s+/g, "").toUpperCase() === want) ||
    list[0];
  if (!hit) return null;

  const pc = toCount(hit.monthlyPcQcCnt);
  const mobile = toCount(hit.monthlyMobileQcCnt);
  return { matched: hit.relKeyword || word, pc, mobile, total: pc + mobile, comp: hit.compIdx || "" };
}

/* 최근 6개월 추이 */
async function fetchTrend(env, word) {
  const now = new Date();
  /* 오늘 것은 아직 안 쌓였을 수 있어 어제까지만 본다. */
  const end = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));

  const response = await fetch("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: {
      "X-Naver-Client-Id": env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": env.NAVER_CLIENT_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: ymd(start),
      endDate: ymd(end),
      timeUnit: "month",
      keywordGroups: [{ groupName: word, keywords: [word] }],
    }),
  });
  if (!response.ok) {
    throw new Error("데이터랩 API 가 " + response.status + " 를 돌려줬습니다. 열쇠 두 개를 확인해 주세요.");
  }

  const data = await response.json();
  const points = (((data && data.results) || [])[0] || {}).data || [];
  return points.map((point) => ({ period: String(point.period || "").slice(0, 7), ratio: Number(point.ratio) || 0 }));
}

async function keywordResponse(request, env, origin) {
  const word = (new URL(request.url).searchParams.get("q") || "").trim();
  if (!word) return json({ ok: false, error: "q 값이 없습니다." }, 400, origin);
  if (word.length > 40) return json({ ok: false, error: "키워드가 너무 깁니다." }, 400, origin);

  const hasAd = env.NAVER_AD_API_KEY && env.NAVER_AD_SECRET_KEY && env.NAVER_AD_CUSTOMER_ID;
  const hasLab = env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET;
  if (!hasAd && !hasLab) {
    return json(
      { ok: false, error: "네이버 열쇠가 아직 안 들어갔습니다. 워커 설정의 Variables and Secrets 를 확인해 주세요." },
      503,
      origin
    );
  }

  /* 한쪽이 막혀도 다른 쪽 값은 보여 준다. */
  const [adResult, trendResult] = await Promise.all([
    hasAd ? fetchSearchAd(env, word).catch((e) => ({ error: e.message })) : Promise.resolve(null),
    hasLab ? fetchTrend(env, word).catch((e) => ({ error: e.message })) : Promise.resolve(null),
  ]);

  const notes = [];
  const volume = adResult && !adResult.error ? adResult : null;
  if (adResult && adResult.error) notes.push(adResult.error);
  if (hasAd && !adResult) notes.push("검색광고에 이 키워드 기록이 없습니다.");

  let trend = Array.isArray(trendResult) ? trendResult : [];
  if (trendResult && trendResult.error) notes.push(trendResult.error);

  /* 비율을 지난 달 실제 숫자에 맞춰 편다. 마지막 달 비율이 0 이면 기준이
     없으므로 숫자는 붙이지 않고 모양만 남긴다. */
  const last = trend.length ? trend[trend.length - 1].ratio : 0;
  if (volume && last > 0) {
    trend = trend.map((point) => ({
      period: point.period,
      ratio: point.ratio,
      count: Math.round((point.ratio / last) * volume.total),
    }));
  }

  return json(
    {
      ok: true,
      keyword: word,
      matched: volume ? volume.matched : "",
      pc: volume ? volume.pc : null,
      mobile: volume ? volume.mobile : null,
      total: volume ? volume.total : null,
      comp: volume ? volume.comp : "",
      trend,
      note: notes.join(" "),
    },
    200,
    origin
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") {
      return json({ ok: false, error: "GET 만 받습니다." }, 405, origin);
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ ok: false, error: "허용되지 않은 주소에서의 요청입니다." }, 403, origin);
    }

    if (new URL(request.url).pathname === "/keyword") {
      return keywordResponse(request, env, origin);
    }

    const target = new URL(request.url).searchParams.get("url");
    if (!target) return json({ ok: false, error: "url 값이 없습니다." }, 400, origin);

    let parsed;
    try {
      parsed = new URL(target);
    } catch (e) {
      return json({ ok: false, error: "주소를 알아볼 수 없습니다." }, 400, origin);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return json({ ok: false, error: "http · https 주소만 받습니다." }, 400, origin);
    }

    let response;
    try {
      response = await fetch(parsed.href, {
        headers: {
          /* 일반 브라우저처럼 보이게 한다. 이렇게 해도 막는 사이트가 있다. */
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        cf: { cacheTtl: 3600, cacheEverything: true },
      });
    } catch (e) {
      return json({ ok: false, error: "상세페이지를 불러오지 못했습니다." }, 502, origin);
    }

    if (!response.ok) {
      return json(
        { ok: false, error: "상세페이지가 " + response.status + " 를 돌려줬습니다. 봇 차단일 수 있습니다." },
        502,
        origin
      );
    }

    const buffer = await response.arrayBuffer();
    const sliced = buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(sliced);

    const ld = readJsonLd(html);
    const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";

    const title = ld.title || readMeta(html, "og:title") || decodeEntities(titleTag.trim());
    const image = absolute(
      ld.image || readMeta(html, "og:image") || readMeta(html, "twitter:image"),
      parsed.href
    );
    /* 가격은 믿을 만한 순서로 찾는다. 구조화 정보 → 메타 태그 → 본문 짐작. */
    const price =
      ld.price ||
      readMeta(html, "product:price:amount") ||
      readMeta(html, "og:price:amount") ||
      guessPrice(html);
    const description = readMeta(html, "og:description") || readMeta(html, "description");
    const siteName = readMeta(html, "og:site_name") || parsed.hostname;

    return json(
      {
        ok: true,
        title,
        image,
        price,
        description,
        siteName,
        source: ld.title || ld.price ? "json-ld" : "og",
      },
      200,
      origin
    );
  },
};
