/* ============================================================
   공통 UI — 이스케이프, 진행률 막대, 상태 배지, 모달 폼, 토스트
   ============================================================ */

const UI = (() => {
  /* ---------- 문자열 ---------- */

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* 사용자가 입력한 URL 을 그대로 href 에 넣지 않는다.
     javascript: 같은 스킴은 버리고 http/https 만 통과시킨다. */
  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const withScheme = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
    try {
      const parsed = new URL(withScheme);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.href;
    } catch (e) {
      return "";
    }
  }

  function categoryLabel(key) {
    const found = CATEGORIES.find((c) => c.key === key);
    return found ? found.label : "미분류";
  }

  function efficacyLabel(key) {
    const found = EFFICACIES.find((e) => e.key === key);
    return found ? found.label : "";
  }

  function statusLabel(key) {
    const found = STATUSES.find((s) => s.key === (key || ""));
    return found ? found.label : "";
  }

  function stageMeta(key) {
    return STAGE_TEMPLATE.find((s) => s.key === key) || { key, name: key, desc: "", tasks: [] };
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!isFinite(number)) return "—";
    return number.toLocaleString("ko-KR") + "원";
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  }

  function daysUntil(value) {
    if (!value) return null;
    const target = new Date(value + "T00:00:00");
    if (isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  /* ---------- 진행률 막대 ----------
     채움은 강조색 한 가지, 트랙은 같은 램프의 옅은 단계.
     숫자는 색이 아니라 글자로도 읽히도록 항상 옆에 붙인다. */

  function meter(ratio, options) {
    const opts = options || {};
    const percent = Math.round((ratio || 0) * 100);
    const size = opts.size === "sm" ? " meter--sm" : opts.size === "lg" ? " meter--lg" : "";
    const label = opts.label ? escapeHtml(opts.label) + " " : "";
    const valueText = opts.hideValue ? "" : '<span class="meter__value">' + percent + "%</span>";
    return (
      '<div class="meter' + size + '" role="img" aria-label="' + label + "진행률 " + percent + '퍼센트">' +
      '<div class="meter__track"><div class="meter__fill" style="width:' + percent + '%"></div></div>' +
      valueText +
      "</div>"
    );
  }

  /* 8단계를 한 줄로 압축해 보여주는 미니 지표. 각 칸이 그 단계의 진행률이다. */
  function stageStrip(product) {
    const cells = product.stages
      .map((stage) => {
        const percent = Math.round(Store.stageProgress(stage) * 100);
        const meta = stageMeta(stage.key);
        return (
          '<span class="strip__cell" title="' + escapeHtml(meta.name) + " " + percent + '%">' +
          '<span class="strip__fill" style="height:' + Math.max(percent, 3) + '%"></span>' +
          "</span>"
        );
      })
      .join("");
    return '<div class="strip" aria-hidden="true">' + cells + "</div>";
  }

  /* ---------- 상태 배지 ----------
     색만으로 상태를 전달하지 않는다. 항상 기호 + 글자가 함께 간다. */

  function statusOf(ratio) {
    if (ratio >= 1) return { key: "done", label: "완료", icon: "●" };
    if (ratio > 0) return { key: "doing", label: "진행중", icon: "◑" };
    return { key: "todo", label: "대기", icon: "○" };
  }

  function statusBadge(ratio) {
    const status = statusOf(ratio);
    return (
      '<span class="badge badge--' + status.key + '">' +
      '<span class="badge__icon" aria-hidden="true">' + status.icon + "</span>" +
      escapeHtml(status.label) +
      "</span>"
    );
  }

  function chip(text, extraClass) {
    return '<span class="chip ' + (extraClass || "") + '">' + escapeHtml(text) + "</span>";
  }

  function stars(rating) {
    const value = Number(rating) || 0;
    if (!value) return '<span class="muted">—</span>';
    let out = '<span class="stars" aria-label="' + value + '점 / 5점">';
    for (let i = 1; i <= 5; i += 1) {
      out += '<span aria-hidden="true" class="' + (i <= value ? "on" : "off") + '">★</span>';
    }
    return out + "</span>";
  }

  /* ---------- 토스트 ---------- */

  let toastTimer = null;

  function toast(message, tone) {
    const node = document.getElementById("toast");
    if (!node) return;
    node.textContent = message;
    node.className = "toast toast--visible" + (tone ? " toast--" + tone : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      node.className = "toast";
    }, 3600);
  }

  /* ---------- 모달 ---------- */

  /* 창이 둘이다. 기본은 "modal", 그 위에 겹쳐 뜨는 작은 창이 "picker".
     하나로 돌려 쓰면 위에 창을 띄우는 순간 아래에 적던 내용이 날아간다. */
  const dialog = (id) => document.getElementById(id || "modal");

  function closeModal(id) {
    const node = dialog(id);
    if (node && node.open) node.close();
  }

  function openModal(title, bodyHtml, footerHtml, options) {
    const opts = options || {};
    const node = dialog(opts.id);
    if (!node) return null;
    node.innerHTML =
      '<form method="dialog" class="modal__form" id="modal-form">' +
      '<header class="modal__head">' +
      "<h2>" + escapeHtml(title) + "</h2>" +
      '<button type="button" class="icon-btn" data-close aria-label="닫기">✕</button>' +
      "</header>" +
      '<div class="modal__body">' + bodyHtml + "</div>" +
      '<footer class="modal__foot">' + footerHtml + "</footer>" +
      "</form>";
    node.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(opts.id));
    });
    node.showModal();
    const firstField = node.querySelector("input, textarea, select");
    if (firstField) firstField.focus();
    return node;
  }

  /* ---------- 폼 생성기 ----------
     필드 정의만 넘기면 입력 화면과 값 수집을 대신 처리한다. */

  function fieldHtml(field, value) {
    const id = "f_" + field.name;
    const required = field.required ? " required" : "";
    const span = field.span === 2 ? " field--wide" : "";
    let control = "";

    if (field.type === "textarea") {
      control =
        '<textarea id="' + id + '" name="' + field.name + '" rows="' + (field.rows || 3) +
        '" placeholder="' + escapeHtml(field.placeholder || "") + '"' + required + ">" +
        escapeHtml(value || "") + "</textarea>";
    } else if (field.type === "select") {
      const options = (field.options || [])
        .map(
          (opt) =>
            '<option value="' + escapeHtml(opt.value) + '"' +
            (String(opt.value) === String(value || "") ? " selected" : "") +
            ">" + escapeHtml(opt.label) + "</option>"
        )
        .join("");
      control = '<select id="' + id + '" name="' + field.name + '"' + required + ">" + options + "</select>";
    } else if (field.type === "radio") {
      control =
        '<div class="radio-row">' +
        (field.options || [])
          .map((opt, index) => {
            const checked = value ? String(opt.value) === String(value) : index === 0;
            return (
              '<label class="radio">' +
              '<input type="radio" name="' + field.name + '" value="' + escapeHtml(opt.value) + '"' +
              (checked ? " checked" : "") + ">" +
              "<span>" + escapeHtml(opt.label) + "</span>" +
              "</label>"
            );
          })
          .join("") +
        "</div>";
    } else if (field.type === "refs") {
      control = refsControl(value || []);
    } else if (field.type === "images") {
      control = imagesControl(value || []);
    } else if (field.type === "fetchmeta") {
      /* 라벨 없이 버튼 한 줄만 놓는다 */
      return (
        '<div class="field field--wide fetchmeta" data-fetchmeta>' +
        '<button type="button" class="btn btn--ghost" data-fetch-go>링크에서 가져오기</button>' +
        '<p class="field__hint" data-fetch-msg></p>' +
        "</div>"
      );
    } else {
      const type = field.type || "text";
      control =
        '<input id="' + id + '" name="' + field.name + '" type="' + type + '" value="' +
        escapeHtml(value === null || value === undefined ? "" : value) + '" placeholder="' +
        escapeHtml(field.placeholder || "") + '"' +
        (field.min !== undefined ? ' min="' + field.min + '"' : "") +
        (field.max !== undefined ? ' max="' + field.max + '"' : "") +
        (field.step !== undefined ? ' step="' + field.step + '"' : "") +
        required + ">";
    }

    return (
      '<div class="field' + span + '">' +
      '<label for="' + id + '">' + escapeHtml(field.label) +
      (field.required ? ' <span class="req" aria-hidden="true">*</span>' : "") + "</label>" +
      control +
      (field.hint ? '<p class="field__hint">' + escapeHtml(field.hint) + "</p>" : "") +
      "</div>"
    );
  }

  function refRowHtml(ref) {
    return (
      '<div class="ref-row">' +
      '<input type="text" class="ref-label" placeholder="브랜드 · 제품명 · 메모" value="' +
      escapeHtml((ref && ref.label) || "") + '">' +
      '<input type="url" class="ref-url" placeholder="https://" value="' +
      escapeHtml((ref && ref.url) || "") + '">' +
      '<button type="button" class="icon-btn" data-ref-remove aria-label="이 참고자료 삭제">✕</button>' +
      "</div>"
    );
  }

  function refsControl(refs) {
    const rows = (refs.length ? refs : [{ label: "", url: "" }]).map(refRowHtml).join("");
    return (
      '<div class="refs" data-refs>' +
      '<div data-ref-list>' + rows + "</div>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-ref-add>+ 참고자료 한 줄 더</button>' +
      "</div>"
    );
  }

  /* ---------- 이미지 입력칸 ----------
     파일은 줄여서 IndexedDB 에 담고, 인터넷 주소는 그대로 들고 있는다.
     둘 다 한 줄에 썸네일로 늘어놓고 각각 뺄 수 있게 한다. */

  const MAX_IMAGES = 8;

  function imageThumbHtml(image) {
    const src = image.url ? escapeHtml(safeUrl(image.url)) : "";
    const inner = src
      ? '<img src="' + src + '" alt="" loading="lazy">'
      : '<img data-img-id="' + escapeHtml(image.id) + '" alt="" loading="lazy">';
    return (
      '<div class="img-thumb" data-image-id="' + escapeHtml(image.id) + '"' +
      (image.url ? ' data-image-url="' + escapeHtml(image.url) + '"' : "") + ">" +
      inner +
      '<button type="button" class="img-thumb__x" data-image-remove aria-label="이미지 빼기">✕</button>' +
      "</div>"
    );
  }

  function imagesControl(images) {
    const available = Images.isAvailable();
    return (
      '<div class="images" data-images>' +
      '<div class="images__list" data-image-list>' + images.map(imageThumbHtml).join("") + "</div>" +
      '<div class="images__add">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-image-pick>+ 이미지 넣기</button>' +
      "</div>" +
      '<p class="field__hint" data-image-status>' +
      (available
        ? "최대 " + MAX_IMAGES + "장. 누르면 붙여넣기 · 파일 고르기 · 주소 넣기를 고를 수 있습니다."
        : escapeHtml(Images.whyUnavailable()) + " 이미지 주소만 넣을 수 있습니다.") +
      "</p>" +
      "</div>"
    );
  }

  function collectImages(root) {
    const wrap = root.querySelector("[data-images]");
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll(".img-thumb")).map((node) => ({
      id: node.dataset.imageId,
      url: node.dataset.imageUrl || "",
    }));
  }

  /* ---------- 지금 해야할 일 ----------

     아이디어 판과 제품 보드가 같은 모양을 쓴다. 한쪽만 고치면 두 화면이
     달라지므로 여기 한 벌만 둔다. 어디에 저장하느냐만 부르는 쪽이 정한다.

     api = { list, add, update, remove, clearDone, move } */

  function todosHtml(todos, options) {
    const o = options || {};
    const list = todos || [];
    const left = list.filter((t) => !t.done).length;
    const done = list.length - left;

    const rows = list
      .map(
        (todo) =>
          '<li class="todo' + (todo.done ? " todo--done" : "") + '" data-todo="' +
          escapeHtml(todo.id) + '">' +
          '<button type="button" class="todo__grip" data-todo-grip draggable="true" ' +
          'aria-label="' + escapeHtml(todo.text || "이 할 일") +
          ' 순서 바꾸기. 끌어서 옮기거나 위·아래 화살표를 누르세요"><span aria-hidden="true">⠿</span></button>' +
          '<label class="todo__check"><input type="checkbox" data-todo-done' +
          (todo.done ? " checked" : "") + ' aria-label="끝냈는지 표시"></label>' +
          '<input type="text" class="todo__text" data-todo-text value="' +
          escapeHtml(todo.text) + '" aria-label="할 일">' +
          '<button type="button" class="icon-btn" data-todo-remove aria-label="이 할 일 지우기">✕</button>' +
          "</li>"
      )
      .join("");

    return (
      '<section class="todos" data-todos>' +
      '<header class="todos__head">' +
      '<h3 class="todos__title">' + escapeHtml(o.title || "지금 해야할 일") +
      (left ? '<span class="todos__left">' + left + "</span>" : "") +
      "</h3>" +
      (done
        ? '<button type="button" class="btn btn--ghost btn--sm" data-todo-clear>끝낸 일 ' +
          done + "건 치우기</button>"
        : "") +
      "</header>" +
      (rows ? '<ul class="todos__list">' + rows + "</ul>" : "") +
      '<div class="todos__add">' +
      '<input type="text" class="input" data-todo-new placeholder="' +
      escapeHtml(o.placeholder || "할 일을 적고 Enter") + '" aria-label="할 일 추가">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-todo-add>추가</button>' +
      "</div>" +
      "</section>"
    );
  }

  function bindTodos(root, api) {
    const wrap = root.querySelector("[data-todos]");
    if (!wrap) return;
    const box = wrap.querySelector("[data-todo-new]");

    function add() {
      const text = box.value.trim();
      if (!text) return;
      api.add(text);
      box.value = "";
      App.render();
      const fresh = document.querySelector("[data-todo-new]");
      if (fresh) fresh.focus();
    }

    box.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      add();
    });
    wrap.querySelector("[data-todo-add]").addEventListener("click", add);

    const clear = wrap.querySelector("[data-todo-clear]");
    if (clear) {
      clear.addEventListener("click", () => {
        const gone = api.clearDone();
        App.render();
        toast(gone + "건을 치웠습니다.");
      });
    }

    wrap.addEventListener("change", (event) => {
      const row = event.target.closest(".todo");
      if (!row) return;
      if (event.target.matches("[data-todo-done]")) {
        api.update(row.dataset.todo, { done: event.target.checked });
        App.render();
        return;
      }
      if (event.target.matches("[data-todo-text]")) {
        api.update(row.dataset.todo, { text: event.target.value.trim() });
      }
    });

    wrap.addEventListener("click", (event) => {
      if (!event.target.matches("[data-todo-remove]")) return;
      api.remove(event.target.closest(".todo").dataset.todo);
      App.render();
    });

    bindTodoReorder(wrap, api);
  }

  /* 순서 바꾸기 — 손잡이를 잡았을 때만 끌리게 해서, 글자를 고르려다 줄이
     딸려가지 않게 한다. 끌기는 키보드로 못 하므로 ↑ ↓ 도 받는다. */
  function bindTodoReorder(wrap, api) {
    const list = wrap.querySelector(".todos__list");
    if (!list) return;
    let dragging = null;

    function saveOrder() {
      Array.from(list.querySelectorAll(".todo")).forEach((row, index) => {
        api.move(row.dataset.todo, index);
      });
    }

    list.querySelectorAll(".todo").forEach((row) => {
      const grip = row.querySelector("[data-todo-grip]");
      if (!grip) return;

      grip.addEventListener("dragstart", (event) => {
        dragging = row;
        row.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        try {
          event.dataTransfer.setData("text/plain", row.dataset.todo);
        } catch (e) {
          /* 일부 브라우저는 비어 있으면 끌기를 시작하지 않는다 */
        }
      });

      grip.addEventListener("dragend", () => {
        if (dragging) dragging.classList.remove("is-dragging");
        dragging = null;
        saveOrder();
      });

      row.addEventListener("dragover", (event) => {
        if (!dragging || dragging === row) return;
        event.preventDefault();
        const box = row.getBoundingClientRect();
        const below = event.clientY > box.top + box.height / 2;
        list.insertBefore(dragging, below ? row.nextSibling : row);
      });

      grip.addEventListener("keydown", (event) => {
        const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        const rows = Array.from(list.querySelectorAll(".todo"));
        api.move(row.dataset.todo, rows.indexOf(row) + step);
        App.render();
        const moved = document.querySelector('.todo[data-todo="' + row.dataset.todo + '"]');
        if (moved) moved.querySelector("[data-todo-grip]").focus();
      });
    });

    list.addEventListener("drop", (event) => event.preventDefault());
  }

  /* ---------- 제품 사진 칸 ----------

     사진 아래에 '넣기' 단추를 따로 두지 않는다. 사진 자체가 누르는 자리이고,
     누르면 크게 뜨면서 바꾸기 · 빼기 · 저장이 거기 다 있다. 한 장 더 넣는
     자리는 사진과 같은 크기의 빈 칸으로 뒤에 붙는다.

     런칭 보드 · 기획서 · 컨셉보드가 같은 것을 쓴다. 세 벌을 따로 두면
     한쪽만 고쳐져 갈린다. */

  function photoZone(images, options) {
    const o = options || {};
    const list = images || [];
    const label = o.label || "제품 이미지 넣기";

    const thumbs = list
      .map(
        (image, index) =>
          '<div class="czone__item" data-image-index="' + index + '">' +
          '<button type="button" class="czone__zoom" data-image-zoom ' +
          'aria-label="' + escapeHtml(o.title || "사진") + ' — 눌러서 크게 보기 · 바꾸기 · 저장">' +
          (image.url
            ? '<img src="' + escapeHtml(safeUrl(image.url)) + '" alt="" loading="lazy">'
            : '<img data-img-id="' + escapeHtml(image.id) + '" alt="" loading="lazy">') +
          "</button></div>"
      )
      .join("");

    /* 사진이 없으면 빈 칸이 곧 넣는 자리다. 있으면 뒤에 작게 붙는다. */
    const add =
      '<button type="button" class="photo__add' + (list.length ? " photo__add--more" : "") +
      '" data-image-add aria-label="' + escapeHtml(label) + '">' +
      '<span aria-hidden="true">＋</span>' +
      (list.length ? "" : escapeHtml(label)) +
      "</button>";

    return (
      '<div class="photos czone" data-photos>' +
      '<div class="czone__grid">' + thumbs + add + "</div>" +
      "</div>"
    );
  }

  /* api = { list, save, title } — 어디에 담아 두는지는 부르는 쪽이 안다. */
  function bindPhotoZone(root, api) {
    const zone = root.querySelector("[data-photos]");
    if (!zone) return;

    /* 갈아 끼울 자리. -1 이면 뒤에 붙인다. */
    let slot = -1;

    function put(entries) {
      const list = api.list();
      if (slot >= 0 && list[slot]) list.splice(slot, 1, entries[0]);
      else entries.forEach((entry) => list.push(entry));
      api.save(list);
    }

    function takeFiles(files) {
      if (!files.length) return "";
      Promise.all(files.map((file) => Images.addFile(file).then((s) => s, () => null))).then(
        (results) => {
          const made = results.filter(Boolean).map((r) => ({ id: r.id, url: "" }));
          if (made.length) put(made);
          const msg = document.querySelector("[data-ipick-msg]");
          if (msg) msg.textContent = made.length + "장 담았습니다.";
        }
      );
      return files.length + "장 줄이는 중…";
    }

    function pick(at) {
      slot = at;
      openImagePicker({
        title: at >= 0 ? "사진 바꾸기" : api.label || "제품 이미지 넣기",
        onFiles: takeFiles,
        onUrl: (safe) => {
          put([{ id: "url" + Date.now().toString(36), url: safe }]);
          return "주소를 넣었습니다.";
        },
      });
    }

    zone.addEventListener("click", (event) => {
      if (event.target.closest("[data-image-add]")) {
        pick(-1);
        return;
      }
      const item = event.target.closest(".czone__item");
      if (!item || !event.target.closest("[data-image-zoom]")) return;

      const index = Number(item.dataset.imageIndex);
      const image = api.list()[index];
      if (!image) return;

      openImage(image, {
        title: api.title,
        name: api.title,
        onReplace: () => pick(index),
        onRemove: () => {
          const list = api.list();
          list.splice(index, 1);
          api.save(list);
        },
      });
    });

    Images.hydrate(zone);
  }

  /* ---------- 이미지 넣는 창 ----------

     버튼을 누르면 곧바로 파일 고르는 창이 떴다. 그러면 초점이 그쪽으로 가
     버려서, 캡처한 그림을 Ctrl+V 로 넣을 자리가 아예 없었다.

     그래서 우리 창을 먼저 띄운다. 이 창 안에서 붙여넣기 · 끌어다 놓기 ·
     파일 고르기 · 주소 넣기를 다 받는다. 파일 고르는 창은 그걸 고른
     사람에게만 뜬다. */

  function imageFilesFrom(transfer) {
    if (!transfer) return [];
    const out = [];
    Array.from(transfer.files || []).forEach((file) => {
      if (file && String(file.type).indexOf("image/") === 0) out.push(file);
    });
    if (out.length) return out;
    Array.from(transfer.items || []).forEach((item) => {
      if (item.kind === "file" && String(item.type).indexOf("image/") === 0) {
        const file = item.getAsFile();
        if (file) out.push(file);
      }
    });
    return out;
  }

  /* 지금 창에 붙어 있는 붙여넣기 처리기. 새로 열 때 옛것을 뗀다. */
  let pickerPaste = null;

  function openImagePicker(options) {
    const config = options || {};
    const onFiles = config.onFiles || function () {};
    const onUrl = config.onUrl || null;
    const allowFile = config.allowFile !== false && Images.isAvailable();

    const node = openModal(
      config.title || "이미지 넣기",
      '<div class="ipick" tabindex="0" data-ipick>' +
        '<p class="ipick__keys"><span>Ctrl</span><span>V</span></p>' +
        '<p class="ipick__say">캡처한 그림을 여기에 붙여넣으세요</p>' +
        '<p class="ipick__sub">그림 파일을 끌어다 놓아도 됩니다</p>' +
        "</div>" +
        '<div class="ipick__rest">' +
        (allowFile
          ? '<button type="button" class="btn btn--ghost btn--sm" data-ipick-file>파일에서 고르기</button>'
          : "") +
        (onUrl
          ? '<input type="url" class="input" placeholder="또는 이미지 주소 (https://…)" data-ipick-url>' +
            '<button type="button" class="btn btn--ghost btn--sm" data-ipick-url-add>주소로 넣기</button>'
          : "") +
        "</div>" +
        '<p class="ipick__msg" data-ipick-msg></p>' +
        '<input type="file" accept="image/*" multiple hidden data-ipick-input>',
      '<button type="button" class="btn btn--ghost" data-close>닫기</button>',
      { id: "picker" }
    );
    if (!node) return null;

    const drop = node.querySelector("[data-ipick]");
    const msg = node.querySelector("[data-ipick-msg]");
    const fileInput = node.querySelector("[data-ipick-input]");
    const urlInput = node.querySelector("[data-ipick-url]");
    const say = (text) => {
      msg.textContent = text || "";
    };

    /* 초점을 붙여넣는 자리에 둔다. 창이 열리자마자 Ctrl+V 가 먹어야 한다. */
    drop.focus();

    const takeFiles = (files) => {
      if (!files.length) return;
      say(onFiles(files) || "");
    };

    const takeUrl = (raw) => {
      if (!onUrl) return false;
      const safe = safeUrl(String(raw || "").trim());
      if (!safe) return false;
      say(onUrl(safe) || "");
      if (urlInput) urlInput.value = "";
      return true;
    };

    /* 이 창 안에서 붙여넣으면 여기로 들어온다. 그림이면 그림으로, 이미지
       주소를 복사해 왔으면 주소로 받는다.

       처리기는 창(dialog) 에 붙인다. 안쪽 내용은 열 때마다 새로 그려지지만
       창은 그대로 남는다. 떼지 않고 붙이기만 하면 지난번 창의 처리기가 같이
       살아 있어, 아이디어에 넣은 그림이 컨셉보드에도 들어가 버린다. */
    if (pickerPaste) node.removeEventListener("paste", pickerPaste);
    pickerPaste = (event) => {
      const files = imageFilesFrom(event.clipboardData);
      if (files.length) {
        event.preventDefault();
        takeFiles(files);
        return;
      }
      if (event.target === urlInput) return;
      const text = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
      if (!text) return;
      event.preventDefault();
      if (!takeUrl(text)) say("그림도 이미지 주소도 아닙니다.");
    };
    node.addEventListener("paste", pickerPaste);

    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("is-drag-over");
    });
    ["dragleave", "dragend", "drop"].forEach((name) => {
      drop.addEventListener(name, () => drop.classList.remove("is-drag-over"));
    });
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      takeFiles(imageFilesFrom(event.dataTransfer));
    });
    drop.addEventListener("click", () => drop.focus());

    if (allowFile) {
      node.querySelector("[data-ipick-file]").addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files || []);
        fileInput.value = "";
        takeFiles(files);
        drop.focus();
      });
    }

    if (onUrl) {
      const tryUrl = () => {
        if (!takeUrl(urlInput.value)) {
          say("주소를 알아볼 수 없습니다. http:// 또는 https:// 로 시작해야 합니다.");
        }
      };
      node.querySelector("[data-ipick-url-add]").addEventListener("click", tryUrl);
      urlInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        tryUrl();
      });
    }

    return node;
  }

  function bindImages(node) {
    const wrap = node.querySelector("[data-images]");
    if (!wrap) return;
    const list = wrap.querySelector("[data-image-list]");
    const status = wrap.querySelector("[data-image-status]");

    const count = () => list.querySelectorAll(".img-thumb").length;
    const roomLeft = () => MAX_IMAGES - count();

    /* 창이 떠 있으면 거기에도 결과를 알려 준다. 창에 가려 뒤쪽 안내가
       안 보이기 때문이다. */
    function tell(text) {
      status.textContent = text;
      const open = document.querySelector("[data-ipick-msg]");
      if (open) open.textContent = text;
    }

    function addFiles(files) {
      const room = roomLeft();
      if (room <= 0) return "이미지는 " + MAX_IMAGES + "장까지 넣을 수 있습니다.";
      const picked = files.slice(0, room);
      Promise.all(
        picked.map((file) =>
          Images.addFile(file).then(
            (saved) => ({ ok: true, saved }),
            () => ({ ok: false })
          )
        )
      ).then((results) => {
        let added = 0;
        results.forEach((result) => {
          if (!result.ok) return;
          list.insertAdjacentHTML("beforeend", imageThumbHtml({ id: result.saved.id, url: "" }));
          added += 1;
        });
        Images.hydrate(list);
        const failed = results.length - added;
        tell(
          added + "장 담았습니다." +
            (failed ? " " + failed + "장은 실패했습니다." : "") +
            (files.length > picked.length ? " (" + MAX_IMAGES + "장 제한)" : "")
        );
      });
      return picked.length + "장 줄이는 중…";
    }

    function addUrl(safe) {
      if (roomLeft() <= 0) return "이미지는 " + MAX_IMAGES + "장까지 넣을 수 있습니다.";
      list.insertAdjacentHTML(
        "beforeend",
        imageThumbHtml({ id: "url" + Date.now().toString(36), url: safe })
      );
      status.textContent = "주소를 넣었습니다.";
      return "주소를 넣었습니다.";
    }

    wrap.querySelector("[data-image-pick]").addEventListener("click", () => {
      openImagePicker({ onFiles: addFiles, onUrl: addUrl });
    });

    list.addEventListener("click", (event) => {
      if (!event.target.matches("[data-image-remove]")) return;
      /* 여기서는 화면에서만 뺀다. 실제 파일은 저장 후 쓰이지 않는 것만 정리한다. */
      event.target.closest(".img-thumb").remove();
      status.textContent = "뺐습니다. 저장을 눌러야 반영됩니다.";
    });

    Images.hydrate(list);
    markBrokenImages(list);
  }

  /* '링크에서 가져오기' 버튼 */
  function bindFetchMeta(node) {
    const wrap = node.querySelector("[data-fetchmeta]");
    if (!wrap) return;
    const button = wrap.querySelector("[data-fetch-go]");
    const message = wrap.querySelector("[data-fetch-msg]");

    button.addEventListener("click", () => {
      const urlField = node.querySelector('[name="url"]');
      const target = safeUrl(urlField ? urlField.value : "");
      if (!target) {
        message.textContent = "먼저 상세페이지 링크를 넣어 주세요.";
        return;
      }
      button.disabled = true;
      message.textContent = "가져오는 중…";
      Meta.fetchMeta(App.proxyUrl(), target).then(
        (data) => {
          button.disabled = false;
          const result = Meta.applyToForm(node, data);
          message.textContent = Meta.describe(result);
          markBrokenImages(node);
        },
        (error) => {
          button.disabled = false;
          message.textContent = error.message + " 직접 입력하셔도 됩니다.";
        }
      );
    });
  }

  function collectRefs(root) {
    const wrap = root.querySelector("[data-refs]");
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll(".ref-row"))
      .map((row) => ({
        label: row.querySelector(".ref-label").value.trim(),
        url: row.querySelector(".ref-url").value.trim(),
      }))
      .filter((ref) => ref.label || ref.url);
  }

  function openForm(config) {
    const values = config.values || {};
    const body =
      '<div class="form-grid">' +
      config.fields.map((field) => fieldHtml(field, values[field.name])).join("") +
      "</div>";
    const footer =
      '<button type="button" class="btn btn--ghost" data-close>취소</button>' +
      '<button type="submit" class="btn btn--primary">' +
      escapeHtml(config.submitLabel || "저장") + "</button>";

    const node = openModal(config.title, body, footer);
    if (!node) return;

    /* 참고자료 줄 추가 / 삭제 */
    node.addEventListener("click", (event) => {
      if (event.target.matches("[data-ref-add]")) {
        const list = node.querySelector("[data-ref-list]");
        list.insertAdjacentHTML("beforeend", refRowHtml({ label: "", url: "" }));
      }
      if (event.target.matches("[data-ref-remove]")) {
        const rows = node.querySelectorAll(".ref-row");
        if (rows.length > 1) {
          event.target.closest(".ref-row").remove();
        } else {
          event.target.closest(".ref-row").querySelectorAll("input").forEach((i) => (i.value = ""));
        }
      }
    });

    bindImages(node);
    bindFetchMeta(node);

    const form = node.querySelector("#modal-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = {};
      config.fields.forEach((field) => {
        if (field.type === "refs") {
          data[field.name] = collectRefs(node);
          return;
        }
        if (field.type === "images") {
          data[field.name] = collectImages(node);
          return;
        }
        if (field.type === "radio") {
          const checked = form.querySelector('input[name="' + field.name + '"]:checked');
          data[field.name] = checked ? checked.value : "";
          return;
        }
        const control = form.elements[field.name];
        let raw = control ? control.value : "";
        if (typeof raw === "string") raw = raw.trim();
        if (field.type === "number") {
          data[field.name] = raw === "" ? null : Number(raw);
        } else if (field.name === "tags") {
          data[field.name] = raw
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          data[field.name] = raw;
        }
      });
      closeModal();
      config.onSubmit(data);
    });
  }

  /* ---------- 카드 · 표에 보이는 썸네일 ---------- */

  function thumbsHtml(images, options) {
    const list = images || [];
    if (!list.length) return "";
    const opts = options || {};
    const limit = opts.limit || list.length;
    const shown = list.slice(0, limit);
    const rest = list.length - shown.length;
    const cells = shown
      .map((image, index) => {
        const src = image.url ? escapeHtml(safeUrl(image.url)) : "";
        const img = src
          ? '<img src="' + src + '" alt="" loading="lazy">'
          : '<img data-img-id="' + escapeHtml(image.id) + '" alt="" loading="lazy">';
        return (
          '<button type="button" class="thumb" data-zoom-index="' + index +
          '" aria-label="이미지 크게 보기">' + img + "</button>"
        );
      })
      .join("");
    return (
      '<div class="thumbs' + (opts.size === "sm" ? " thumbs--sm" : "") + '" data-thumbs>' +
      cells +
      (rest > 0 ? '<span class="thumbs__more">+' + rest + "</span>" : "") +
      "</div>"
    );
  }

  /* 인터넷 주소로 넣은 이미지는 주소가 죽거나 바뀔 수 있다.
     깨진 그림 아이콘 대신 자리 표시로 바꿔 둔다. */
  function markBrokenImages(scope) {
    scope.querySelectorAll("img[src]:not([data-broken-watch])").forEach((node) => {
      node.dataset.brokenWatch = "1";
      const fail = () => {
        const holder = node.closest(".thumb, .img-thumb");
        if (holder) holder.classList.add("is-broken");
        node.remove();
      };
      if (node.complete && node.naturalWidth === 0) fail();
      else node.addEventListener("error", fail);
    });
  }

  /* 썸네일을 누르면 원본을 크게 띄운다. */
  function bindThumbs(scope, getImages) {
    scope.querySelectorAll("[data-thumbs]").forEach((group) => {
      group.addEventListener("click", (event) => {
        const button = event.target.closest("[data-zoom-index]");
        if (!button) return;
        const images = getImages(group);
        const image = images[Number(button.dataset.zoomIndex)];
        if (image) openImage(image);
      });
    });
    Images.hydrate(scope);
    markBrokenImages(scope);
  }

  /* 크게 보기. 내려받는 단추도 같이 둔다 — 보드에 올려 둔 그림을 다시 쓰려고
     원본 파일을 찾아 헤매는 일이 잦다.

     브라우저 안에 담아 둔 그림은 바로 내려받아진다. 남의 사이트 주소로 걸어
     둔 그림은 브라우저가 내려받게 두지 않으므로, 새 탭에서 열어 준다. */
  function openImage(image, options) {
    const o = options || {};
    const body = image.url
      ? '<img class="lightbox__img" src="' + escapeHtml(safeUrl(image.url)) + '" alt="">'
      : '<img class="lightbox__img" data-img-id="' + escapeHtml(image.id) + '" alt="">';
    const node = openModal(
      o.title || "이미지",
      '<div class="lightbox">' + body + "</div>",
      (o.onRemove ? '<button type="button" class="btn btn--ghost" data-image-drop>빼기</button>' : "") +
        (o.onReplace ? '<button type="button" class="btn btn--ghost" data-image-swap>바꾸기</button>' : "") +
        '<a class="btn btn--primary" data-image-save>저장</a>' +
        '<button type="button" class="btn btn--ghost" data-close>닫기</button>'
    );
    if (!node) return;

    Images.hydrate(node);
    markBrokenImages(node);

    const img = node.querySelector(".lightbox__img");
    const save = node.querySelector("[data-image-save]");
    const base = String(o.name || "이미지").replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "이미지";

    function point() {
      const src = img.getAttribute("src") || "";
      if (!src) {
        save.hidden = true;
        return;
      }
      save.hidden = false;
      save.href = src;
      if (/^(blob:|data:)/.test(src)) {
        const ext = /^data:image\/png/.test(src) ? ".png" : ".jpg";
        save.setAttribute("download", base + ext);
        save.removeAttribute("target");
        save.textContent = "저장";
      } else {
        save.removeAttribute("download");
        save.target = "_blank";
        save.rel = "noopener noreferrer";
        save.textContent = "새 탭에서 열기";
      }
    }

    if (o.onReplace) {
      node.querySelector("[data-image-swap]").addEventListener("click", () => {
        closeModal();
        o.onReplace();
      });
    }
    if (o.onRemove) {
      node.querySelector("[data-image-drop]").addEventListener("click", () => {
        closeModal();
        o.onRemove();
      });
    }

    /* 브라우저 안에 담아 둔 그림은 주소가 나중에 붙는다. */
    point();
    img.addEventListener("load", point);
    setTimeout(point, 400);
  }

  /* ---------- 확인 대화상자 ---------- */

  function confirmAction(message, onConfirm, confirmLabel) {
    const node = openModal(
      "확인",
      '<p class="confirm-text">' + escapeHtml(message) + "</p>",
      '<button type="button" class="btn btn--ghost" data-close>취소</button>' +
        '<button type="submit" class="btn btn--danger">' +
        escapeHtml(confirmLabel || "삭제") +
        "</button>"
    );
    if (!node) return;
    node.querySelector("#modal-form").addEventListener("submit", (event) => {
      event.preventDefault();
      closeModal();
      onConfirm();
    });
  }

  return {
    escapeHtml,
    safeUrl,
    categoryLabel,
    efficacyLabel,
    statusLabel,
    stageMeta,
    formatPrice,
    formatDate,
    daysUntil,
    meter,
    stageStrip,
    statusOf,
    statusBadge,
    chip,
    stars,
    thumbsHtml,
    bindThumbs,
    openImage,
    toast,
    openModal,
    closeModal,
    openForm,
    confirmAction,
    openImagePicker,
    todosHtml,
    bindTodos,
    photoZone,
    bindPhotoZone,
    imagesControl,
    bindImages,
    collectImages,
  };
})();
