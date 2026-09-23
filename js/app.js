/* ============================================================
   앱 — 탭 전환, 테마, 백업(내보내기 · 가져오기), 초기화
   ============================================================ */

const App = (() => {
  const THEME_KEY = "beauty-launch-board.theme";

  const TABS = [
    { key: "ideas", label: "아이디어 덤프", view: () => Ideas },
    { key: "pipeline", label: "런칭 상황판", view: () => Pipeline },
    { key: "competitors", label: "경쟁 제품 리서치", view: () => Competitors },
  ];

  let activeTab = "ideas";

  /* ---------- 탭 ---------- */

  function go(tabKey, payload) {
    activeTab = tabKey;
    if (tabKey === "pipeline") Pipeline.setActive(payload || null);
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
  }

  /* ---------- 테마 ----------
     auto → light → dark 순환. 저장소를 못 쓰는 환경에서도 앱은 그대로 돈다. */

  function readTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || "auto";
    } catch (e) {
      return "auto";
    }
  }

  function applyTheme(mode) {
    if (mode === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      const label = mode === "auto" ? "시스템 설정" : mode === "light" ? "밝게" : "어둡게";
      btn.textContent = (mode === "auto" ? "◐" : mode === "light" ? "☀" : "☾") + " " + label;
      btn.setAttribute("aria-label", "화면 테마: " + label + ". 눌러서 변경");
    }
  }

  function cycleTheme() {
    const order = ["auto", "light", "dark"];
    const next = order[(order.indexOf(readTheme()) + 1) % order.length];
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      /* 저장은 실패해도 이번 세션 동안은 적용된다. */
    }
    applyTheme(next);
  }

  /* ---------- 백업 ---------- */

  function exportBackup() {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = "런칭상황판-백업-" + stamp + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast("백업 파일을 내려받았습니다.");
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(String(reader.result));
        Pipeline.setActive(null);
        UI.toast("백업을 불러왔습니다.");
        render();
      } catch (e) {
        UI.toast("불러오지 못했습니다. 내보내기로 만든 JSON 파일인지 확인해 주세요.", "warn");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- 시작 ---------- */

  function init() {
    applyTheme(readTheme());
    Store.load();

    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) themeBtn.addEventListener("click", cycleTheme);

    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) exportBtn.addEventListener("click", exportBackup);

    const importInput = document.getElementById("import-input");
    const importBtn = document.getElementById("import-btn");
    if (importBtn && importInput) {
      importBtn.addEventListener("click", () => importInput.click());
      importInput.addEventListener("change", () => {
        if (importInput.files && importInput.files[0]) importBackup(importInput.files[0]);
        importInput.value = "";
      });
    }

    const clearBtn = document.getElementById("clear-samples");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        UI.confirmAction(
          "예시로 들어 있는 샘플 데이터를 모두 지울까요? 직접 입력하거나 수정한 항목은 남습니다.",
          () => {
            Store.clearSamples();
            Pipeline.setActive(null);
            UI.toast("샘플을 지웠습니다.");
            render();
          },
          "샘플 지우기"
        );
      });
    }

    render();
  }

  return { init, render, go };
})();

document.addEventListener("DOMContentLoaded", App.init);
