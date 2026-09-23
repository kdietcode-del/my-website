/* ============================================================
   2) 런칭 상황판 — 9단계를 카테고리로 묶고 단계별 진행률을 보여준다
   ============================================================ */

const Pipeline = (() => {
  let activeId = null;          // 열려 있는 제품. null 이면 전체 목록
  const expanded = new Set();   // 펼쳐 둔 단계 (다시 그려도 유지)

  function setActive(id) {
    activeId = id || null;
    expanded.clear();
  }

  function getActive() {
    return activeId;
  }

  /* ---------- 제품 추가 / 수정 ---------- */

  function productFields() {
    return [
      { name: "name", label: "제품명", type: "text", required: true, span: 2 },
      {
        name: "category",
        label: "카테고리",
        type: "select",
        options: CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
      },
      { name: "owner", label: "담당자", type: "text", placeholder: "이름" },
      { name: "targetDate", label: "목표 런칭일", type: "date" },
      {
        name: "targetPrice",
        label: "목표 판매가",
        type: "number",
        min: 0,
        step: 100,
        placeholder: "32000",
        hint: "경쟁 제품 가격 비교 차트에 함께 표시됩니다.",
      },
      { name: "memo", label: "메모", type: "textarea", rows: 3, span: 2 },
    ];
  }

  function openCreate() {
    UI.openForm({
      title: "런칭 제품 추가",
      fields: productFields(),
      values: { category: "skincare" },
      submitLabel: "9단계 상황판 만들기",
      onSubmit: (data) => {
        const product = Store.addProduct(data);
        UI.toast("상황판을 만들었습니다.");
        setActive(product.id);
        App.render();
      },
    });
  }

  function openEdit(id) {
    const product = Store.getProduct(id);
    if (!product) return;
    UI.openForm({
      title: "제품 정보 수정",
      fields: productFields(),
      values: product,
      submitLabel: "저장",
      onSubmit: (data) => {
        Store.updateProduct(id, data);
        UI.toast("수정했습니다.");
        App.render();
      },
    });
  }

  function remove(id) {
    const product = Store.getProduct(id);
    if (!product) return;
    UI.confirmAction(
      '"' + product.name + '" 의 상황판을 지울까요? 9단계 진행 기록이 함께 사라집니다.',
      () => {
        Store.removeProduct(id);
        setActive(null);
        UI.toast("지웠습니다.");
        App.render();
      }
    );
  }

  /* ---------- 전체 목록 화면 ---------- */

  function productCardHtml(product) {
    const progress = Store.productProgress(product);
    const stageMeta = UI.stageMeta(progress.currentStage);
    const dday = UI.daysUntil(product.targetDate);
    let ddayHtml = "";
    if (dday !== null) {
      const text = dday === 0 ? "D-DAY" : dday > 0 ? "D-" + dday : "D+" + Math.abs(dday);
      ddayHtml = '<span class="chip ' + (dday < 0 ? "chip--late" : "") + '">' + text + "</span>";
    }

    return (
      '<article class="card product-card" data-id="' + product.id + '" tabindex="0" role="button" ' +
      'aria-label="' + UI.escapeHtml(product.name) + ' 상황판 열기">' +
      '<header class="card__head">' +
      UI.chip(UI.categoryLabel(product.category), "chip--cat chip--cat-" + UI.escapeHtml(product.category || "etc")) +
      ddayHtml +
      (product.sample ? '<span class="chip chip--sample">샘플</span>' : "") +
      "</header>" +
      '<h3 class="card__title">' + UI.escapeHtml(product.name) + "</h3>" +
      '<p class="product-card__stage">지금 단계 · <strong>' + UI.escapeHtml(stageMeta.name) + "</strong></p>" +
      UI.meter(progress.ratio, { size: "lg", label: product.name }) +
      '<p class="product-card__counts">' +
      "단계 " + progress.stagesDone + " / " + product.stages.length + " 완료" +
      '<span class="dot" aria-hidden="true">·</span>' +
      "할 일 " + progress.done + " / " + progress.total +
      "</p>" +
      UI.stageStrip(product) +
      "</article>"
    );
  }

  function overviewHtml() {
    const products = Store.state.products;
    if (!products.length) {
      return (
        '<div class="empty"><p class="empty__title">아직 런칭 준비 중인 제품이 없습니다.</p>' +
        "<p>아이디어 덤프에서 '런칭 준비로 →' 를 누르거나, 여기서 바로 추가하세요.</p></div>"
      );
    }

    const overall = Store.overallProgress();
    const totals = products.reduce(
      (acc, p) => {
        const progress = Store.productProgress(p);
        acc.done += progress.done;
        acc.total += progress.total;
        acc.stagesDone += progress.stagesDone;
        return acc;
      },
      { done: 0, total: 0, stagesDone: 0 }
    );

    const hero =
      '<section class="hero">' +
      '<div class="hero__figure">' +
      '<p class="hero__label">전체 평균 진행률</p>' +
      '<p class="hero__value">' + Math.round(overall * 100) + "%</p>" +
      UI.meter(overall, { size: "lg", hideValue: true, label: "전체 평균" }) +
      "</div>" +
      '<div class="tiles">' +
      tileHtml("런칭 준비 제품", products.length + "개") +
      tileHtml("완료한 단계", totals.stagesDone + " / " + products.length * STAGE_TEMPLATE.length) +
      tileHtml("남은 할 일", totals.total - totals.done + "개") +
      "</div>" +
      "</section>";

    return hero + '<div class="card-grid">' + products.map(productCardHtml).join("") + "</div>";
  }

  function tileHtml(label, value) {
    return (
      '<div class="tile"><p class="tile__label">' + UI.escapeHtml(label) + "</p>" +
      '<p class="tile__value">' + UI.escapeHtml(value) + "</p></div>"
    );
  }

  /* ---------- 단일 제품 상세 화면 ---------- */

  function summaryHtml(product) {
    const progress = Store.productProgress(product);
    const stageMeta = UI.stageMeta(progress.currentStage);
    return (
      '<div class="summary__left">' +
      '<p class="summary__label">전체 진행률</p>' +
      '<p class="summary__value">' + Math.round(progress.ratio * 100) + "%</p>" +
      UI.meter(progress.ratio, { size: "lg", hideValue: true, label: product.name }) +
      '<p class="summary__counts">할 일 ' + progress.done + " / " + progress.total +
      '<span class="dot" aria-hidden="true">·</span>단계 ' + progress.stagesDone + " / " +
      product.stages.length + " 완료</p>" +
      "</div>" +
      '<dl class="summary__meta">' +
      metaRow("지금 단계", stageMeta.name) +
      metaRow("담당자", product.owner || "—") +
      metaRow("목표 런칭일", UI.formatDate(product.targetDate) || "—") +
      metaRow("목표 판매가", UI.formatPrice(product.targetPrice)) +
      "</dl>"
    );
  }

  function metaRow(label, value) {
    return (
      "<div><dt>" + UI.escapeHtml(label) + "</dt><dd>" + UI.escapeHtml(value) + "</dd></div>"
    );
  }

  function stageHeaderHtml(product, stage) {
    const meta = UI.stageMeta(stage.key);
    const ratio = Store.stageProgress(stage);
    const done = stage.tasks.filter((t) => t.done).length;
    const index = product.stages.findIndex((s) => s.key === stage.key) + 1;
    return (
      '<span class="stage__no" aria-hidden="true">' + index + "</span>" +
      '<span class="stage__title">' +
      '<span class="stage__name">' + UI.escapeHtml(meta.name) + "</span>" +
      '<span class="stage__desc">' + UI.escapeHtml(meta.desc) + "</span>" +
      "</span>" +
      '<span class="stage__status">' +
      UI.statusBadge(ratio) +
      '<span class="stage__count">' + done + " / " + stage.tasks.length + "</span>" +
      "</span>" +
      '<span class="stage__meter">' + UI.meter(ratio, { size: "sm", label: meta.name }) + "</span>"
    );
  }

  function stageBodyHtml(product, stage) {
    const tasks = stage.tasks.length
      ? stage.tasks
          .map(
            (task) =>
              '<li class="task' + (task.done ? " task--done" : "") + '">' +
              '<label class="task__label">' +
              '<input type="checkbox" data-task="' + task.id + '"' + (task.done ? " checked" : "") + ">" +
              "<span>" + UI.escapeHtml(task.label) + "</span>" +
              "</label>" +
              '<button type="button" class="icon-btn icon-btn--quiet" data-task-remove="' + task.id +
              '" aria-label="' + UI.escapeHtml(task.label) + ' 항목 삭제">✕</button>' +
              "</li>"
          )
          .join("")
      : '<li class="muted">할 일이 없습니다. 아래에서 추가하세요.</li>';

    return (
      '<ul class="task-list">' + tasks + "</ul>" +
      '<div class="task-add">' +
      '<input type="text" class="input" data-task-input placeholder="이 단계에 할 일 추가" aria-label="할 일 추가">' +
      '<button type="button" class="btn btn--sm btn--ghost" data-task-add>추가</button>' +
      "</div>" +
      '<div class="stage__fields">' +
      '<label class="field field--wide"><span>이 단계 메모</span>' +
      '<textarea rows="2" data-stage-note placeholder="논의 내용, 걸림돌, 결정 사항">' +
      UI.escapeHtml(stage.note || "") + "</textarea></label>" +
      '<label class="field"><span>목표일</span>' +
      '<input type="date" data-stage-due value="' + UI.escapeHtml(stage.dueDate || "") + '"></label>' +
      "</div>" +
      '<div class="stage__actions">' +
      '<button type="button" class="btn btn--sm btn--ghost" data-stage-complete>전부 완료 표시</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-stage-reset>전부 해제</button>' +
      "</div>"
    );
  }

  function stageHtml(product, stage, currentKey) {
    const open = expanded.has(stage.key) || (!expanded.size && stage.key === currentKey);
    if (open) expanded.add(stage.key);
    const ratio = Store.stageProgress(stage);
    const status = UI.statusOf(ratio);
    return (
      '<details class="stage stage--' + status.key + '" data-stage="' + stage.key + '"' +
      (open ? " open" : "") + ">" +
      '<summary class="stage__head">' + stageHeaderHtml(product, stage) + "</summary>" +
      '<div class="stage__body">' + stageBodyHtml(product, stage) + "</div>" +
      "</details>"
    );
  }

  function detailHtml(product) {
    const progress = Store.productProgress(product);
    return (
      '<div class="view__head">' +
      "<div>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="back">← 전체 제품</button>' +
      "<h2>" + UI.escapeHtml(product.name) + "</h2>" +
      '<p class="view__sub">' +
      UI.escapeHtml(UI.categoryLabel(product.category)) +
      (product.memo ? " · " + UI.escapeHtml(product.memo) : "") +
      "</p>" +
      "</div>" +
      '<div class="view__actions">' +
      '<button type="button" class="btn btn--ghost" data-act="edit">정보 수정</button>' +
      '<button type="button" class="btn btn--ghost" data-act="remove">삭제</button>' +
      "</div>" +
      "</div>" +
      '<section class="summary" id="product-summary">' + summaryHtml(product) + "</section>" +
      '<div class="stage-list">' +
      product.stages.map((stage) => stageHtml(product, stage, progress.currentStage)).join("") +
      "</div>"
    );
  }

  /* ---------- 부분 갱신 ----------
     체크 하나 눌렀다고 화면 전체를 다시 그리면 펼친 단계와 스크롤이 튄다.
     바뀌는 곳만 손본다. */

  function refreshStage(root, product, stageKey) {
    const stage = product.stages.find((s) => s.key === stageKey);
    const node = root.querySelector('[data-stage="' + stageKey + '"]');
    if (!stage || !node) return;
    const ratio = Store.stageProgress(stage);
    const status = UI.statusOf(ratio);
    node.className = "stage stage--" + status.key;
    node.querySelector(".stage__head").innerHTML = stageHeaderHtml(product, stage);
  }

  function refreshSummary(root, product) {
    const node = root.querySelector("#product-summary");
    if (node) node.innerHTML = summaryHtml(product);
  }

  /* ---------- 렌더 ---------- */

  function render(root) {
    const product = activeId ? Store.getProduct(activeId) : null;
    if (activeId && !product) activeId = null;

    if (product) {
      root.innerHTML = detailHtml(product);
      bindDetail(root, product);
      return;
    }

    root.innerHTML =
      '<div class="view__head">' +
      "<div>" +
      "<h2>런칭 상황판</h2>" +
      '<p class="view__sub">제품마다 기획부터 생산까지 9단계를 따라갑니다. 진행률은 체크한 할 일 수에서 자동으로 계산됩니다.</p>' +
      "</div>" +
      '<button type="button" class="btn btn--primary" data-act="create">+ 제품 추가</button>' +
      "</div>" +
      overviewHtml();

    bindOverview(root);
  }

  function bindOverview(root) {
    const createBtn = root.querySelector('[data-act="create"]');
    if (createBtn) createBtn.addEventListener("click", openCreate);

    root.querySelectorAll(".product-card").forEach((card) => {
      const open = () => {
        setActive(card.dataset.id);
        App.render();
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
  }

  function bindDetail(root, product) {
    root.querySelector('[data-act="back"]').addEventListener("click", () => {
      setActive(null);
      App.render();
    });
    root.querySelector('[data-act="edit"]').addEventListener("click", () => openEdit(product.id));
    root.querySelector('[data-act="remove"]').addEventListener("click", () => remove(product.id));

    root.querySelectorAll(".stage").forEach((node) => {
      const stageKey = node.dataset.stage;

      node.addEventListener("toggle", () => {
        if (node.open) expanded.add(stageKey);
        else expanded.delete(stageKey);
      });

      node.querySelectorAll("[data-task]").forEach((box) => {
        box.addEventListener("change", () => {
          Store.toggleTask(product.id, stageKey, box.dataset.task);
          box.closest(".task").classList.toggle("task--done", box.checked);
          refreshStage(root, product, stageKey);
          refreshSummary(root, product);
        });
      });

      node.querySelectorAll("[data-task-remove]").forEach((btn) => {
        btn.addEventListener("click", () => {
          Store.removeTask(product.id, stageKey, btn.dataset.taskRemove);
          App.render();
        });
      });

      const input = node.querySelector("[data-task-input]");
      const addBtn = node.querySelector("[data-task-add]");
      const add = () => {
        if (!input.value.trim()) return;
        Store.addTask(product.id, stageKey, input.value);
        App.render();
      };
      addBtn.addEventListener("click", add);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          add();
        }
      });

      const note = node.querySelector("[data-stage-note]");
      note.addEventListener("change", () => {
        Store.setStageField(product.id, stageKey, "note", note.value);
      });

      const due = node.querySelector("[data-stage-due]");
      due.addEventListener("change", () => {
        Store.setStageField(product.id, stageKey, "dueDate", due.value);
      });

      node.querySelector("[data-stage-complete]").addEventListener("click", () => {
        Store.completeStage(product.id, stageKey);
        App.render();
      });
      node.querySelector("[data-stage-reset]").addEventListener("click", () => {
        Store.resetStage(product.id, stageKey);
        App.render();
      });
    });
  }

  return { render, setActive, getActive };
})();
