/* ============================================================
   공유 서버와 주고받기

   서버 주소가 설정돼 있으면 내용을 서버에 한 벌로 두고, 어느 기기에서 열어도
   같은 화면을 본다. 설정돼 있지 않으면 예전처럼 이 브라우저에만 담긴다 —
   서버 없이도 앱은 그대로 돈다.
   ============================================================ */

const Remote = (() => {
  const BASE_KEY = "beauty-launch-board.server";
  const TOKEN_KEY = "beauty-launch-board.token";
  const NAME_KEY = "beauty-launch-board.who";

  /* ---------- 설정값 ---------- */

  function read(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (e) {
      return "";
    }
  }

  function write(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (e) {
      /* 저장을 못 해도 이번 방문 동안은 쓸 수 있다. */
    }
  }

  const baseUrl = () => read(BASE_KEY);
  const setBaseUrl = (value) => write(BASE_KEY, value ? String(value).replace(/\/+$/, "") : "");
  const token = () => read(TOKEN_KEY);
  const setToken = (value) => write(TOKEN_KEY, value);
  const who = () => read(NAME_KEY);
  const setWho = (value) => write(NAME_KEY, String(value || "").slice(0, 40));

  const configured = () => !!baseUrl();
  const signedIn = () => !!(baseUrl() && token());

  /* ---------- 요청 ---------- */

  function call(path, options) {
    const opts = options || {};
    if (!configured()) return Promise.reject(new Error("서버 주소가 설정되지 않았습니다."));

    const headers = Object.assign({}, opts.headers);
    if (token()) headers.Authorization = "Bearer " + token();

    return fetch(baseUrl() + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body,
    }).then(
      (response) => {
        if (response.status === 401) {
          setToken("");
          const error = new Error("로그인이 필요합니다.");
          error.needsLogin = true;
          throw error;
        }
        if (opts.raw) {
          if (!response.ok) throw new Error("서버가 " + response.status + " 를 돌려줬습니다.");
          return response.arrayBuffer();
        }
        return response.json().then(
          (body) => {
            if (response.ok && body.ok !== false) return body;
            const error = new Error(body.error || "서버가 " + response.status + " 를 돌려줬습니다.");
            if (response.status === 409) {
              error.conflict = true;
              error.state = body.state;
            }
            throw error;
          },
          () => {
            throw new Error("서버 응답을 읽지 못했습니다. 주소가 맞는지 확인해 주세요.");
          }
        );
      },
      () => {
        throw new Error("서버에 닿지 못했습니다.");
      }
    );
  }

  /* ---------- 기능 ---------- */

  function ping(url) {
    const target = (url || baseUrl()).replace(/\/+$/, "");
    return fetch(target + "/ping").then(
      (r) => r.json().then((b) => {
        if (!b.ok) throw new Error(b.error || "서버가 준비되지 않았습니다.");
        return b;
      }),
      () => {
        throw new Error("서버에 닿지 못했습니다. 주소를 확인해 주세요.");
      }
    );
  }

  function login(password) {
    return fetch(baseUrl() + "/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).then(
      (response) =>
        response.json().then(
          (body) => {
            if (!response.ok || !body.ok) throw new Error(body.error || "로그인하지 못했습니다.");
            setToken(body.token);
            return body;
          },
          () => {
            throw new Error("서버 응답을 읽지 못했습니다.");
          }
        ),
      () => {
        throw new Error("서버에 닿지 못했습니다.");
      }
    );
  }

  function logout() {
    setToken("");
  }

  function getState() {
    return call("/state").then((body) => body.state);
  }

  function putState(version, data) {
    return call("/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, data, by: who() }),
    });
  }

  function getImage(id) {
    return call("/image/" + encodeURIComponent(id), { raw: true }).then(
      (bytes) => new Blob([bytes], { type: "image/jpeg" })
    );
  }

  function putImage(id, blob) {
    return call("/image/" + encodeURIComponent(id), {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
  }

  function deleteImage(id) {
    return call("/image/" + encodeURIComponent(id), { method: "DELETE" }).catch(() => {});
  }

  return {
    baseUrl,
    setBaseUrl,
    who,
    setWho,
    configured,
    signedIn,
    ping,
    login,
    logout,
    getState,
    putState,
    getImage,
    putImage,
    deleteImage,
  };
})();
