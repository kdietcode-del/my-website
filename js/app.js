/* ============================================================
   앱 — 탭 전환, 테마, 백업(내보내기 · 가져오기), 초기화
   ============================================================ */

const App = (() => {
  const THEME_KEY = "beauty-launch-board.theme";
  const PROXY_KEY = "beauty-launch-board.proxy";

  /* 썸네일 가져오기 서버 주소. 비어 있으면 그 기능만 쉬고 나머지는 그대로 돈다. */
  function proxyUrl() {
    try {
      return localStorage.getItem(PROXY_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setProxyUrl(value) {
    try {
      if (value) localStorage.setItem(PROXY_KEY, value);
      else localStorage.removeItem(PROXY_KEY);
    } catch (e) {
      /* 저장을 못 해도 이번 방문 동안은 쓸 수 있게 둔다. */
    }
  }

  /* 지금 진행 중인 일이 먼저 오고, 아직 시작 안 한 아이디어가 마지막에 온다. */
  const TABS = [
    { key: "pipeline", label: "🚀 제품 런칭 상황보드", view: () => Pipeline },
    { key: "concept", label: "🎨 제품 컨셉보드", view: () => Concept },
    { key: "competitors", label: "🔍 경쟁제품 참고보드", view: () => Competitors },
    { key: "ideas", label: "💡 차기 신제품 아이디어", view: () => Ideas },
  ];

  let activeTab = "pipeline";

  /* ---------- 탭 ---------- */

  function go(tabKey, payload) {
    activeTab = tabKey;
    if (tabKey === "pipeline") Pipeline.setActive(payload || null);
    if (tabKey === "concept") Concept.setActive(payload || null);
    if (tabKey === "competitors" && payload) Competitors.focusProduct(payload);
    render();
  }

  function render() {
    const nav = document.getElementById("tabs");
    if (nav) {
      nav.innerHTML = TABS.map(
        (tab) =>
          '<button type="button" role="tab" class="tab' + (tab.key === activeTab ? " tab--on" : "") +
          '" data-tab="' + tab.key + '" aria-selected="' + (tab.key === activeTab) + '">' +
          UI.escapeHtml(tab.label) + "</button>"
      ).join("");
      nav.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => go(btn.dataset.tab));
      });
    }

    const root = document.getElementById("view");
    if (!root) return;
    const tab = TABS.find((t) => t.key === activeTab) || TABS[0];
    root.className = "view view--" + tab.key;
    tab.view().render(root);

    const clearBtn = document.getElementById("clear-samples");
    if (clearBtn) clearBtn.hidden = !Store.hasSamples();

    /* 기록에서 빠진 이미지 파일은 저장소에 남아 자리만 차지한다. 화면을 다시
       그릴 때마다 한 번씩 훑어 정리한다. */
    if (Images.isAvailable()) Images.pruneUnused(Store.usedImageIds());
  }

  /* ---------- 밝기 ----------
     처음 열면 밝게. PC 가 다크모드라고 해서 덩달아 어두워지지 않는다.
     버튼을 누르면 밝게 → 어둡게 → 시스템 설정 순으로 돈다. */

  const THEME_ORDER = ["light", "dark", "auto"];

  const THEME_LABEL = {
    light: { icon: "☀", name: "밝게" },
    dark: { icon: "☾", name: "어둡게" },
    auto: { icon: "◐", name: "시스템 설정" },
  };

  function readTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || "light";
    } catch (e) {
      return "light";
    }
  }

  function applyTheme(mode) {
    if (mode === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      const meta = THEME_LABEL[mode] || THEME_LABEL.light;
      btn.textContent = meta.icon + " 밝기 설정";
      /* 버튼에는 이름만 두고, 지금 어떤 상태인지는 읽어 주는 쪽에 담는다. */
      btn.title = "지금: " + meta.name;
      btn.setAttribute("aria-label", "밝기 설정. 지금 " + meta.name + ". 눌러서 변경");
    }
  }

  function cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(readTheme()) + 1) % THEME_ORDER.length];
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      /* 저장은 실패해도 이번 방문 동안은 적용된다. */
    }
    applyTheme(next);
    UI.toast("밝기: " + (THEME_LABEL[next] || THEME_LABEL.light).name);
  }

  /* ---------- 백업 ---------- */

  /* 이미지까지 함께 싣느라 시간이 걸릴 수 있어 진행 상황을 알려 준다. */
  function exportBackup() {
    UI.toast("백업 파일을 만드는 중…");
    Store.exportJSON().then(
      (json) => {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = "런칭상황보드-백업-" + stamp + ".json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        const mb = (blob.size / 1048576).toFixed(1);
        UI.toast("백업 파일을 내려받았습니다. (" + mb + "MB)");
      },
      () => UI.toast("백업 파일을 만들지 못했습니다.", "warn")
    );
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let result;
      try {
        result = Store.importJSON(String(reader.result));
      } catch (e) {
        UI.toast("불러오지 못했습니다. 내보내기로 만든 JSON 파일인지 확인해 주세요.", "warn");
        return;
      }
      Promise.resolve(result).then(
        () => {
          Pipeline.setActive(null);
          UI.toast("백업을 불러왔습니다.");
          render();
        },
        () => UI.toast("불러오지 못했습니다.", "warn")
      );
    };
    reader.readAsText(file);
  }

  /* ---------- 설정 ----------
     데이터를 지우거나 덮어쓰는 기능은 전부 여기 모아 둔다.
     상단 막대에 그대로 두면 잘못 눌렀을 때 되돌릴 수 없다. */

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openSettings() {
    const locked = Gate.configured();
    const body =
      '<section class="settings">' +
      '<h3 class="settings__title">백업</h3>' +
      '<p class="settings__note">입력한 내용은 이 브라우저에만 있습니다. 가끔 백업 파일을 내려받아 두세요. 이미지도 함께 담깁니다.</p>' +
      '<div class="settings__row">' +
      '<button type="button" class="btn btn--ghost" data-set="export">백업 파일 내려받기</button>' +
      '<button type="button" class="btn btn--ghost" data-set="import">백업 파일 불러오기</button>' +
      "</div>" +
      '<p class="settings__warn">불러오기는 <strong>지금 내용을 모두 덮어씁니다.</strong> 누르면 한 번 더 확인합니다.</p>' +

      '<h3 class="settings__title">공유 서버</h3>' +
      '<p class="settings__note">' +
      (Remote.configured()
        ? "연결됨 · 이 주소로 들어오는 누구나 같은 내용을 봅니다." +
          (Remote.who() ? " 내 이름: <strong>" + UI.escapeHtml(Remote.who()) + "</strong>" : "")
        : "설정하면 어느 기기에서 열어도 같은 내용이 보입니다. 지금은 이 브라우저에만 저장됩니다. 만드는 방법은 저장소의 worker/BOARD-SETUP.md 에 있습니다.") +
      "</p>" +
      '<div class="settings__row">' +
      '<input type="url" class="input" id="set-server" placeholder="https://board.계정이름.workers.dev" value="' +
      UI.escapeHtml(Remote.baseUrl()) + '">' +
      '<button type="button" class="btn btn--ghost" data-set="server-save">저장</button>' +
      '<button type="button" class="btn btn--ghost" data-set="server-test">연결 확인</button>' +
      "</div>" +
      '<div class="settings__row">' +
      '<input type="text" class="input" id="set-who" placeholder="내 이름 (누가 고쳤는지 표시용)" value="' +
      UI.escapeHtml(Remote.who()) + '">' +
      '<button type="button" class="btn btn--ghost" data-set="who-save">이름 저장</button>' +
      (Remote.signedIn()
        ? '<button type="button" class="btn btn--ghost" data-set="server-logout">로그아웃</button>'
        : "") +
      "</div>" +
      '<p class="settings__note" id="set-server-msg"></p>' +
      (Remote.configured()
        ? '<p class="settings__warn">공유 서버를 쓰는 동안에는 아래 \'비밀번호\' 설정을 쓰지 않습니다. 비밀번호는 서버에서 관리합니다.</p>'
        : "") +

      '<h3 class="settings__title">썸네일 가져오기 서버</h3>' +
      '<p class="settings__note">경쟁제품 링크에서 제품명 · 가격 · 썸네일을 자동으로 받아오려면 주소가 필요합니다. 만드는 방법은 저장소의 worker/README.md 에 있습니다.</p>' +
      '<div class="settings__row">' +
      '<input type="url" class="input" id="set-proxy" placeholder="https://thumbnail.계정이름.workers.dev" value="' +
      UI.escapeHtml(proxyUrl()) + '">' +
      '<button type="button" class="btn btn--ghost" data-set="proxy-save">저장</button>' +
      '<button type="button" class="btn btn--ghost" data-set="proxy-test">연결 확인</button>' +
      "</div>" +
      '<p class="settings__note" id="set-proxy-msg"></p>' +

      '<h3 class="settings__title">비밀번호</h3>' +
      '<p class="settings__note">지금 상태 · <strong>' +
      (locked ? "설정됨" : "없음 (누구나 열람 가능)") + "</strong></p>" +
      '<div class="settings__row">' +
      '<input type="password" class="input" id="set-pass" placeholder="새 비밀번호" autocomplete="new-password">' +
      '<button type="button" class="btn btn--ghost" data-set="pass-make">설정 파일 만들기</button>' +
      (locked ? '<button type="button" class="btn btn--ghost" data-set="pass-clear">비밀번호 없애기</button>' : "") +
      "</div>" +
      '<p class="settings__note" id="set-pass-msg"></p>' +
      '<p class="settings__warn">정적 사이트의 비밀번호는 <strong>지나가는 사람을 막는 수준</strong>입니다. 브라우저 개발자 도구를 아는 사람은 우회할 수 있습니다.</p>' +

      '<h3 class="settings__title">샘플 데이터</h3>' +
      '<div class="settings__row">' +
      '<button type="button" class="btn btn--ghost" data-set="clear-samples"' +
      (Store.hasSamples() ? "" : " disabled") + ">예시로 들어 있는 샘플 지우기</button>" +
      "</div>" +
      '<p class="settings__note">' +
      (Store.hasSamples() ? "직접 입력하거나 수정한 항목은 남습니다." : "남아 있는 샘플이 없습니다.") +
      "</p>" +
      "</section>";

    const node = UI.openModal(
      "설정",
      body,
      '<button type="button" class="btn btn--ghost" data-close>닫기</button>'
    );
    if (!node) return;
    bindSettings(node);
  }

  function bindSettings(node) {
    const serverInput = node.querySelector("#set-server");
    const serverMsg = node.querySelector("#set-server-msg");
    const whoInput = node.querySelector("#set-who");
    const proxyInput = node.querySelector("#set-proxy");
    const proxyMsg = node.querySelector("#set-proxy-msg");
    const passInput = node.querySelector("#set-pass");
    const passMsg = node.querySelector("#set-pass-msg");

    node.addEventListener("click", (event) => {
      const action = event.target.dataset ? event.target.dataset.set : "";
      if (!action) return;

      if (action === "export") {
        exportBackup();
      }

      if (action === "import") {
        UI.closeModal();
        UI.confirmAction(
          "백업 파일을 불러오면 지금 들어 있는 내용이 모두 사라지고 파일 내용으로 바뀝니다. 계속할까요?",
          () => document.getElementById("import-input").click(),
          "덮어쓰기"
        );
      }

      if (action === "server-test") {
        const value = UI.safeUrl(serverInput.value.trim());
        if (!value) {
          serverMsg.textContent = "먼저 주소를 넣어 주세요.";
          return;
        }
        serverMsg.textContent = "확인 중…";
        Remote.ping(value.replace(/\/+$/, "")).then(
          () => (serverMsg.textContent = "서버가 응답했습니다. 저장을 누르세요."),
          (error) => (serverMsg.textContent = "연결 실패 — " + error.message)
        );
      }

      if (action === "server-save") {
        const raw = serverInput.value.trim();
        if (raw && !UI.safeUrl(raw)) {
          serverMsg.textContent = "주소를 알아볼 수 없습니다. https:// 로 시작해야 합니다.";
          return;
        }
        const next = raw ? UI.safeUrl(raw).replace(/\/+$/, "") : "";
        const before = Remote.baseUrl();
        if (next === before) {
          serverMsg.textContent = "이미 같은 주소입니다.";
          return;
        }
        /* 주소가 바뀌면 이전 로그인은 쓸 수 없다. */
        Remote.logout();
        Remote.setBaseUrl(next);
        UI.closeModal();
        UI.toast(next ? "공유 서버를 연결했습니다. 비밀번호를 다시 입력해 주세요." : "공유 서버 연결을 해제했습니다.");
        setTimeout(() => location.reload(), 900);
      }

      if (action === "who-save") {
        Remote.setWho(whoInput.value.trim());
        serverMsg.textContent = whoInput.value.trim()
          ? "이름을 저장했습니다. 다음 저장부터 표시됩니다."
          : "이름을 지웠습니다.";
      }

      if (action === "server-logout") {
        Remote.logout();
        UI.closeModal();
        UI.toast("로그아웃했습니다.");
        setTimeout(() => location.reload(), 600);
      }

      if (action === "proxy-save") {
        const value = proxyInput.value.trim();
        if (value && !UI.safeUrl(value)) {
          proxyMsg.textContent = "주소를 알아볼 수 없습니다. https:// 로 시작해야 합니다.";
          return;
        }
        setProxyUrl(value ? UI.safeUrl(value).replace(/\/+$/, "") : "");
        proxyMsg.textContent = value ? "저장했습니다." : "지웠습니다.";
      }

      if (action === "proxy-test") {
        const value = UI.safeUrl(proxyInput.value.trim());
        if (!value) {
          proxyMsg.textContent = "먼저 주소를 넣어 주세요.";
          return;
        }
        proxyMsg.textContent = "확인 중…";
        Meta.fetchMeta(value.replace(/\/+$/, ""), "https://example.com").then(
          () => (proxyMsg.textContent = "연결됐습니다."),
          (error) => (proxyMsg.textContent = "연결 실패 — " + error.message)
        );
      }

      if (action === "pass-make") {
        const value = passInput.value;
        if (!value || value.length < 4) {
          passMsg.textContent = "4자 이상으로 정해 주세요.";
          return;
        }
        passMsg.textContent = "만드는 중…";
        Gate.buildConfig(value).then(
          (result) => {
            passInput.value = "";
            downloadText("gate-config.js", result.fileText);
            passMsg.textContent =
              "gate-config.js 파일을 내려받았습니다. 이 파일로 프로젝트의 js/gate-config.js 를 덮어쓰고 GitHub 에 올리면 잠깁니다.";
          },
          (error) => (passMsg.textContent = error.message)
        );
      }

      if (action === "pass-clear") {
        downloadText("gate-config.js", Gate.clearConfigText());
        passMsg.textContent =
          "잠금 없는 gate-config.js 를 내려받았습니다. 이 파일로 덮어쓰고 올리면 비밀번호가 없어집니다.";
      }

      if (action === "clear-samples") {
        UI.closeModal();
        UI.confirmAction(
          "예시로 들어 있는 샘플 데이터를 지울까요? 직접 입력하거나 수정한 항목은 남습니다.",
          () => {
            Store.clearSamples();
            Pipeline.setActive(null);
            UI.toast("샘플을 지웠습니다.");
            render();
          },
          "샘플 지우기"
        );
      }
    });
  }

  /* ---------- 시작 ---------- */

  function start() {
    /* 브라우저에 있던 내용을 먼저 그려 바로 보이게 하고, 공유 서버가 있으면
       곧바로 서버 내용으로 맞춘다. */
    Store.load();
    render();

    Sync.init({
      onChange: () => {
        Pipeline.setActive(Pipeline.getActive());
        render();
      },
    });

    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) settingsBtn.addEventListener("click", openSettings);

    const importInput = document.getElementById("import-input");
    if (importInput) {
      importInput.addEventListener("change", () => {
        if (importInput.files && importInput.files[0]) importBackup(importInput.files[0]);
        importInput.value = "";
      });
    }

    render();
  }

  /* 밝기는 잠금 화면에도 적용돼야 하므로 먼저 건다.
     버튼 연결도 여기서 해야 한다 — 잠겨 있는 동안에도 눌리는 버튼이라,
     잠금 해제 후에 연결하면 눌러도 아무 일이 없다. */
  function init() {
    applyTheme(readTheme());

    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) themeBtn.addEventListener("click", cycleTheme);

    Gate.require(start);
  }

  return { init, render, go, proxyUrl, openSettings };
})();

document.addEventListener("DOMContentLoaded", App.init);
