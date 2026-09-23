/* ============================================================
   동기화 — 서버와 화면을 같은 상태로 유지

   흐름
     열 때      브라우저에 있던 내용을 먼저 그려 바로 보이게 하고,
                곧바로 서버 내용을 받아 덮어쓴다.
     고칠 때    잠깐 모아 두었다가(연달아 저장하지 않도록) 서버로 보낸다.
     보는 동안  주기적으로 서버를 확인해, 누가 바꿨으면 받아 온다.

   한계 — 같은 순간에 두 사람이 같은 곳을 고치면, 나중에 저장한 쪽이 이긴다.
   서버가 버전을 확인해 조용히 덮어쓰는 일은 막고, 최신 내용을 받아와 다시
   그린 뒤 알려 준다. 밀린 쪽의 마지막 몇 초치 입력은 사라질 수 있다.
   ============================================================ */

const Sync = (() => {
  const PUSH_DELAY_MS = 900;    // 타이핑이 멈추길 기다리는 시간
  const POLL_MS = 20000;        // 서버 확인 주기 (화면을 보고 있을 때만)

  let version = 0;
  let pushTimer = null;
  let pollTimer = null;
  let pushing = false;
  let pendingWhileBusy = false;
  let lastPushedJson = "";
  let onChange = () => {};

  function active() {
    return Remote.configured() && Remote.signedIn();
  }

  function setStatus(text, tone) {
    const node = document.getElementById("sync-status");
    if (!node) return;
    node.textContent = text;
    node.className = "sync" + (tone ? " sync--" + tone : "");
  }

  /* ---------- 받아오기 ---------- */

  function pull(options) {
    const opts = options || {};
    if (!active()) return Promise.resolve(false);
    return Remote.getState().then(
      (state) => {
        const incoming = Number(state.version) || 0;
        if (!opts.force && incoming === version) return false;
        version = incoming;
        if (state.data) {
          Store.replaceAll(state.data);
          lastPushedJson = JSON.stringify(state.data);
        }
        const when = state.updatedAt ? new Date(state.updatedAt) : null;
        setStatus(
          when
            ? "최신 상태 · " + when.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) +
                (state.updatedBy ? " " + state.updatedBy : "")
            : "최신 상태"
        );
        onChange();
        return true;
      },
      (error) => {
        if (error.needsLogin) {
          setStatus("다시 로그인이 필요합니다", "warn");
          location.reload();
          return false;
        }
        setStatus("서버와 연결되지 않음", "warn");
        return false;
      }
    );
  }

  /* ---------- 보내기 ---------- */

  function push() {
    if (!active() || pushing) {
      if (pushing) pendingWhileBusy = true;
      return Promise.resolve();
    }

    const data = Store.snapshot();
    const json = JSON.stringify(data);
    /* 내용이 그대로면 보내지 않는다. 서버 쓰기 횟수를 아끼기 위해서다. */
    if (json === lastPushedJson) {
      setStatus("최신 상태");
      return Promise.resolve();
    }

    pushing = true;
    setStatus("저장 중…");

    return Remote.putState(version, data).then(
      (body) => {
        pushing = false;
        version = Number(body.version) || version + 1;
        lastPushedJson = json;
        setStatus("저장됨");
        if (pendingWhileBusy) {
          pendingWhileBusy = false;
          schedule();
        }
        return true;
      },
      (error) => {
        pushing = false;
        if (error.conflict) {
          /* 남이 먼저 저장했다. 최신을 받아 화면을 맞추고 알려 준다. */
          setStatus("다른 사람이 먼저 저장했습니다", "warn");
          return pull({ force: true }).then(() => {
            UI.toast("다른 사람이 먼저 저장해서 최신 내용을 불러왔습니다. 방금 입력은 다시 확인해 주세요.", "warn");
          });
        }
        if (error.needsLogin) {
          location.reload();
          return false;
        }
        setStatus("저장하지 못함 — 연결 확인", "warn");
        return false;
      }
    );
  }

  /* 연달아 저장하지 않도록 잠깐 모은다. */
  function schedule() {
    if (!active()) return;
    clearTimeout(pushTimer);
    setStatus("저장 대기…");
    pushTimer = setTimeout(push, PUSH_DELAY_MS);
  }

  /* ---------- 주기 확인 ---------- */

  function startPolling() {
    clearInterval(pollTimer);
    if (!active()) return;
    pollTimer = setInterval(() => {
      /* 화면을 보고 있지 않으면 건너뛴다. 서버 읽기 횟수를 아낀다. */
      if (document.hidden || pushing) return;
      pull();
    }, POLL_MS);

    /* 탭으로 돌아오면 바로 한 번 확인한다. */
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) pull();
    });

    /* 창을 닫기 전에 밀린 저장을 밀어 넣는다. */
    window.addEventListener("beforeunload", () => {
      if (pushTimer) {
        clearTimeout(pushTimer);
        push();
      }
    });
  }

  function init(handlers) {
    onChange = (handlers && handlers.onChange) || (() => {});
    if (!active()) {
      setStatus("");
      return Promise.resolve(false);
    }
    setStatus("불러오는 중…");
    return pull({ force: true }).then((changed) => {
      startPolling();
      return changed;
    });
  }

  return { init, pull, push, schedule, active, setStatus };
})();
