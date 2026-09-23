/* ============================================================
   상황보드 공유 서버 — Cloudflare Workers + KV

   지금까지는 입력한 내용이 각자 브라우저에만 남아, 공유받은 사람은 빈 화면을
   봤다. 이 서버가 내용을 한 벌만 들고 있으면서 모두에게 같은 화면을 준다.

   함께 해결되는 것: 비밀번호 확인이 서버에서 이뤄진다. 브라우저 안에서
   검사하던 예전 방식과 달리 개발자 도구로 우회할 수 없다.

   필요한 설정 (worker/BOARD-SETUP.md 참고)
     KV 네임스페이스 바인딩 : BOARD
     시크릿                 : BOARD_PASSWORD   (공유할 비밀번호)
                              TOKEN_SECRET     (아무 긴 무작위 문자열)
   ============================================================ */

const ALLOWED_ORIGINS = [
  "https://by.phb.kr",
  "https://kdietcode-del.github.io",
  "http://localhost:8765",
];

const TOKEN_DAYS = 30;
const MAX_STATE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/* ---------- 응답 만들기 ---------- */

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign(
      { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      corsHeaders(origin)
    ),
  });
}

/* ---------- 토큰 ----------
   서버가 서명한 쪽지를 준다. 저장해 둘 필요가 없고, 위조하면 서명이 어긋난다. */

function base64url(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

async function makeToken(env) {
  const expires = Date.now() + TOKEN_DAYS * 86400000;
  const body = String(expires);
  return body + "." + (await sign(body, env.TOKEN_SECRET || env.BOARD_PASSWORD));
}

async function tokenValid(token, env) {
  if (!token || token.indexOf(".") < 0) return false;
  const [body, signature] = token.split(".");
  const expires = Number(body);
  if (!isFinite(expires) || expires < Date.now()) return false;
  const expected = await sign(body, env.TOKEN_SECRET || env.BOARD_PASSWORD);
  return timingSafeEqual(signature, expected);
}

/* 길이와 내용을 한 번에 훑어 비교한다. 빨리 끝나는 정도로 정답을 추측하지
   못하게 하기 위한 것이다. */
function timingSafeEqual(a, b) {
  const left = String(a);
  const right = String(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

async function authed(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  return tokenValid(token, env);
}

/* ---------- 본체 ---------- */

const EMPTY_STATE = {
  version: 0,
  updatedAt: null,
  updatedBy: "",
  data: { ideas: [], products: [], competitors: [] },
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ ok: false, error: "허용되지 않은 주소에서의 요청입니다." }, 403, origin);
    }
    if (!env.BOARD) {
      return json({ ok: false, error: "KV 저장소(BOARD)가 연결되지 않았습니다." }, 500, origin);
    }
    if (!env.BOARD_PASSWORD) {
      return json({ ok: false, error: "비밀번호(BOARD_PASSWORD)가 설정되지 않았습니다." }, 500, origin);
    }

    /* 연결 확인용 — 인증 없이 열어 둔다. 알려 주는 정보가 없다. */
    if (path === "/ping") {
      return json({ ok: true, service: "board" }, 200, origin);
    }

    /* 로그인 */
    if (path === "/auth" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ ok: false, error: "요청을 읽지 못했습니다." }, 400, origin);
      }
      if (!timingSafeEqual(String(body.password || ""), env.BOARD_PASSWORD)) {
        /* 맞히기를 늦추기 위해 잠깐 지연시킨다. */
        await new Promise((r) => setTimeout(r, 700));
        return json({ ok: false, error: "비밀번호가 맞지 않습니다." }, 401, origin);
      }
      return json({ ok: true, token: await makeToken(env), days: TOKEN_DAYS }, 200, origin);
    }

    /* 여기부터는 로그인이 필요하다 */
    if (!(await authed(request, env))) {
      return json({ ok: false, error: "로그인이 필요합니다." }, 401, origin);
    }

    /* 내용 읽기 */
    if (path === "/state" && request.method === "GET") {
      const stored = await env.BOARD.get("state", "json");
      return json({ ok: true, state: stored || EMPTY_STATE }, 200, origin);
    }

    /* 내용 저장 — 버전이 어긋나면 거절한다.
       다른 사람이 먼저 저장한 것을 모르고 덮어쓰는 일을 막기 위해서다. */
    if (path === "/state" && request.method === "PUT") {
      const raw = await request.text();
      if (raw.length > MAX_STATE_BYTES) {
        return json({ ok: false, error: "내용이 너무 큽니다." }, 413, origin);
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch (e) {
        return json({ ok: false, error: "요청을 읽지 못했습니다." }, 400, origin);
      }

      const current = (await env.BOARD.get("state", "json")) || EMPTY_STATE;
      if (Number(body.version) !== Number(current.version)) {
        return json(
          { ok: false, conflict: true, error: "다른 사람이 먼저 저장했습니다.", state: current },
          409,
          origin
        );
      }

      const next = {
        version: Number(current.version) + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: String(body.by || "").slice(0, 40),
        data: body.data,
      };
      await env.BOARD.put("state", JSON.stringify(next));
      return json({ ok: true, version: next.version, updatedAt: next.updatedAt }, 200, origin);
    }

    /* 이미지 — 하나씩 따로 담는다. 본문과 같이 담으면 저장할 때마다 사진까지
       통째로 오가게 된다. */
    const imageMatch = path.match(/^\/image\/([A-Za-z0-9_-]{1,64})$/);
    if (imageMatch) {
      const key = "img:" + imageMatch[1];

      if (request.method === "GET") {
        const blob = await env.BOARD.get(key, "arrayBuffer");
        if (!blob) return json({ ok: false, error: "없는 이미지입니다." }, 404, origin);
        return new Response(blob, {
          headers: Object.assign(
            { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
            corsHeaders(origin)
          ),
        });
      }

      if (request.method === "PUT") {
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength > MAX_IMAGE_BYTES) {
          return json({ ok: false, error: "이미지가 너무 큽니다." }, 413, origin);
        }
        await env.BOARD.put(key, bytes);
        return json({ ok: true }, 200, origin);
      }

      if (request.method === "DELETE") {
        await env.BOARD.delete(key);
        return json({ ok: true }, 200, origin);
      }
    }

    return json({ ok: false, error: "없는 주소입니다." }, 404, origin);
  },
};
