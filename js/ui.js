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

  const dialog = () => document.getElementById("modal");

  function closeModal() {
    const node = dialog();
    if (node && node.open) node.close();
  }

  function openModal(title, bodyHtml, footerHtml) {
    const node = dialog();
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
      btn.addEventListener("click", closeModal);
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

    const form = node.querySelector("#modal-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = {};
      config.fields.forEach((field) => {
        if (field.type === "refs") {
          data[field.name] = collectRefs(node);
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
    toast,
    openModal,
    closeModal,
    openForm,
    confirmAction,
  };
})();
