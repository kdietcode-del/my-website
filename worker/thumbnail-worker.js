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

export default {
  async fetch(request) {
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
