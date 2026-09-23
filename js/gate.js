/* ============================================================
   잠금 화면

   비밀번호가 설정돼 있으면 앱을 그리기 전에 잠금 화면을 먼저 띄운다.
   비밀번호 원문은 어디에도 저장하지 않는다. PBKDF2 로 늘려 만든 값만
   gate-config.js 에 두고, 입력값을 같은 방식으로 바꿔 비교한다.

   한계: 이 검사는 방문자의 브라우저에서 돈다. 정적 사이트라 서버가 없기
   때문이다. 개발자 도구를 아는 사람은 우회할 수 있다.
   ============================================================ */

const Gate = (() => {
  const UNLOCK_KEY = "beauty-launch-board.unlocked";
  const KEEP_DAYS = 30;

  function configured() {
    return (
      typeof GATE_CONFIG !== "undefined" &&
      GATE_CONFIG &&
      typeof GATE_CONFIG.hash === "string" &&
      GATE_CONFIG.hash.length > 0 &&
      typeof GATE_CONFIG.salt === "string" &&
      GATE_CONFIG.salt.length > 0
    );
  }

  /* crypto.subtle 은 안전한 연결(https) 에서만 쓸 수 있다.
     못 쓰는 환경에서 잠가 버리면 주인도 못 들어오므로 그냥 통과시킨다. */
  function cryptoReady() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.subtle.importKey);
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function randomSaltHex() {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return toHex(bytes.buffer);
  }

  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  /* 같은 비밀번호라도 느리게 계산되도록 반복을 준다. 값을 훔쳐봐도
     원문을 되찾기 어렵게 하기 위한 것이다. */
  function derive(password, saltHex, iterations) {
    const encoder = new TextEncoder();
    return window.crypto.subtle
      .importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"])
      .then((key) =>
        window.crypto.subtle.deriveBits(
          {
            name: "PBKDF2",
            salt: hexToBytes(saltHex),
            iterations: iterations || 200000,
            hash: "SHA-256",
          },
          key,
          256
        )
      )
      .then(toHex);
  }

  /* ---------- 잠금 해제 상태 ---------- */

  function isUnlocked() {
    try {
      const until = Number(localStorage.getItem(UNLOCK_KEY) || 0);
      return until > Date.now();
    } catch (e) {
      return false;
    }
  }

  function markUnlocked() {
    try {
      localStorage.setItem(UNLOCK_KEY, String(Date.now() + KEEP_DAYS * 86400000));
    } catch (e) {
      /* 저장을 못 해도 이번 방문 동안은 열려 있다. */
    }
  }

  function lockAgain() {
    try {
      localStorage.removeItem(UNLOCK_KEY);
    } catch (e) {}
    location.reload();
  }

  /* ---------- 잠금 화면 ---------- */

  function showScreen(onPass) {
    const holder = document.createElement("div");
    holder.className = "gate";
    holder.innerHTML =
      '<form class="gate__box" autocomplete="off">' +
      '<span class="gate__mark" aria-hidden="true"></span>' +
      "<h1>제품 런칭 상황보드</h1>" +
      '<p class="gate__sub">비밀번호를 입력해 주세요.</p>' +
      '<input type="password" class="gate__input" id="gate-input" placeholder="비밀번호" ' +
      'autocomplete="current-password" aria-label="비밀번호">' +
      '<button type="submit" class="btn btn--primary gate__submit">들어가기</button>' +
      '<p class="gate__msg" id="gate-msg" role="status" aria-live="polite"></p>' +
      "</form>";
    document.body.appendChild(holder);
    document.body.classList.add("is-locked");

    const input = holder.querySelector("#gate-input");
    const message = holder.querySelector("#gate-msg");
    input.focus();

    holder.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value;
      if (!value) return;
      message.textContent = "확인 중…";
      derive(value, GATE_CONFIG.salt, GATE_CONFIG.iterations).then(
        (digest) => {
          if (digest === GATE_CONFIG.hash) {
            markUnlocked();
            holder.remove();
            document.body.classList.remove("is-locked");
            onPass();
          } else {
            message.textContent = "비밀번호가 맞지 않습니다.";
            input.value = "";
            input.focus();
          }
        },
        () => {
          message.textContent = "확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.";
        }
      );
    });
  }

  /* 앱을 그리기 전에 부른다. 통과해야 onPass 가 실행된다. */
  function require(onPass) {
    if (!configured() || !cryptoReady() || isUnlocked()) {
      onPass();
      return;
    }
    showScreen(onPass);
  }

  /* ---------- 설정 화면에서 쓰는 도구 ----------
     비밀번호를 받아 gate-config.js 파일 내용을 만들어 준다.
     원문은 이 함수 밖으로 나가지 않는다. */

  function buildConfig(password) {
    if (!cryptoReady()) {
      return Promise.reject(new Error("이 환경에서는 비밀번호를 만들 수 없습니다. https 주소로 열어 주세요."));
    }
    const salt = randomSaltHex();
    const iterations = 200000;
    return derive(password, salt, iterations).then((digest) => ({
      salt,
      hash: digest,
      iterations,
      fileText:
        "/* ============================================================\n" +
        "   비밀번호 설정 — 앱의 [설정] 에서 만들어진 파일입니다.\n" +
        "   hash 가 비어 있으면 잠금 없이 열립니다.\n" +
        "   비밀번호 원문은 들어 있지 않습니다.\n" +
        "   ============================================================ */\n\n" +
        "const GATE_CONFIG = {\n" +
        '  salt: "' + salt + '",\n' +
        '  hash: "' + digest + '",\n' +
        "  iterations: " + iterations + ",\n" +
        "};\n",
    }));
  }

  function clearConfigText() {
    return (
      "/* 비밀번호 없음 — 잠금 없이 열립니다. */\n\n" +
      "const GATE_CONFIG = {\n" +
      '  salt: "",\n' +
      '  hash: "",\n' +
      "  iterations: 200000,\n" +
      "};\n"
    );
  }

  return { require, configured, cryptoReady, buildConfig, clearConfigText, lockAgain };
})();
