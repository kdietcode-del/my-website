/* ============================================================
   2) 제품 런칭 상황보드 — 8단계를 카테고리로 묶고 단계별 진행률을 보여준다
   ============================================================ */

const Pipeline = (() => {
  let activeId = null;          // 열려 있는 제품. null 이면 전체 목록

  function setActive(id) {
    activeId = id || null;
  }

  function getActive() {
    return activeId;
  }

  /* ---------- 제품 추가 / 수정 ---------- */

  function productFields() {
    return [
      { name: "name", label: "제품명", type: "text", required: true, span: 2 },
      {
        name: "efficacyType",
        label: "피부효능",
        type: "select",
        options: [{ value: "", label: "선택 안 함" }].concat(
          EFFICACIES.map((e) => ({ value: e.key, label: e.label }))
        ),
      },
      {
        name: "category",
        label: "카테고리",
        type: "select",
        options: [{ value: "", label: "선택 안 함" }].concat(
          CATEGORIES.map((c) => ({ value: c.key, label: c.label }))
        ),
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
      values: { category: "", efficacyType: "" },
      submitLabel: "8단계 보드 만들기",
      onSubmit: (data) => {
        const product = Store.addProduct(data);
        UI.toast("보드를 만들었습니다.");
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
      '"' + product.name + '" 의 보드를 지울까요? 8단계 진행 기록이 함께 사라집니다.',
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
      'aria-label="' + UI.escapeHtml(product.name) + ' 보드 열기">' +
      '<header class="card__head">' +
      (UI.efficacyLabel(product.efficacyType)
        ? UI.chip(UI.efficacyLabel(product.efficacyType), "chip--eff")
        : "") +
      (product.category
        ? UI.chip(
            UI.categoryLabel(product.category),
            "chip--cat chip--cat-" + UI.escapeHtml(product.category)
          )
        : "") +
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
        "<p>차기 신제품 아이디어에서 '런칭 준비로 →' 를 누르거나, 여기서 바로 추가하세요.</p></div>"
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
              '<li class="task' + (task.done ? " task--done" : "") +
              '" data-task-id="' + task.id + '">' +
              '<button type="button" class="task__grip" data-task-grip draggable="true" ' +
              'aria-label="' + UI.escapeHtml(task.label) + ' 순서 바꾸기. 끌어서 옮기거나 위·아래 화살표를 누르세요">' +
              '<span aria-hidden="true">⠿</span></button>' +
              '<label class="task__label">' +
              '<input type="checkbox" data-task="' + task.id + '"' + (task.done ? " checked" : "") + ">" +
              "<span>" + UI.escapeHtml(task.label) + "</span>" +
              "</label>" +
              /* 항목별 메모는 접지 않고 항상 펼쳐 둔다 — 내용이 길어지면 칸이 따라 늘어난다. */
              '<textarea class="task__memo" rows="1" data-task-memo="' + task.id +
              '" placeholder="메모" aria-label="' + UI.escapeHtml(task.label) + ' 메모">' +
              UI.escapeHtml(task.memo || "") + "</textarea>" +
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

  /* 8단계는 접히는 목록이 아니라 각각 독립된 블록으로 항상 펼쳐 둔다. */
  function stageHtml(product, stage) {
    const ratio = Store.stageProgress(stage);
    const status = UI.statusOf(ratio);
    return (
      '<section class="stage stage--' + status.key + '" data-stage="' + stage.key + '">' +
      '<header class="stage__head">' + stageHeaderHtml(product, stage) + "</header>" +
      '<div class="stage__body">' + stageBodyHtml(product, stage) + "</div>" +
      "</section>"
    );
  }

  function detailHtml(product) {
    return (
      '<div class="view__head">' +
      "<div>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="back">← 전체 제품</button>' +
      "<h2>" + UI.escapeHtml(product.name) + "</h2>" +
      '<p class="view__sub">' +
      UI.escapeHtml(
        [UI.efficacyLabel(product.efficacyType), UI.categoryLabel(product.category)]
          .filter(Boolean)
          .join(" · ")
      ) +
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
      product.stages.map((stage) => stageHtml(product, stage)).join("") +
      "</div>"
    );
  }

  /* 메모 칸이 내용만큼 늘어나게 한다. */
  function autoGrow(area) {
    area.style.height = "auto";
    area.style.height = area.scrollHeight + "px";
  }

  function growAll(scope) {
    scope.querySelectorAll("[data-task-memo]").forEach(autoGrow);
  }

  /* ---------- 부분 갱신 ----------
     체크 하나 눌렀다고 화면 전체를 다시 그리면 펼친 단계와 스크롤이 튄다.
     바뀌는 곳만 손본다. */

  /* 체크만 바뀌었을 때 — 머리말(상태·진행률)만 손본다. */
  function refreshStage(root, product, stageKey) {
    const stage = product.stages.find((s) => s.key === stageKey);
    const node = root.querySelector('[data-stage="' + stageKey + '"]');
    if (!stage || !node) return;
    const ratio = Store.stageProgress(stage);
    const status = UI.statusOf(ratio);
    node.className = "stage stage--" + status.key;
    node.querySelector(".stage__head").innerHTML = stageHeaderHtml(product, stage);
  }

  /* 할 일이 늘거나 줄었을 때 — 그 블록만 통째로 다시 그린다.
     화면 전체를 다시 그리면 보고 있던 위치가 튄다. */
  function refreshStageBlock(root, product, stageKey) {
    const stage = product.stages.find((s) => s.key === stageKey);
    const node = root.querySelector('[data-stage="' + stageKey + '"]');
    if (!stage || !node) return;
    node.outerHTML = stageHtml(product, stage);
    const fresh = root.querySelector('[data-stage="' + stageKey + '"]');
    bindStage(root, product, fresh);
    growAll(fresh);
    refreshSummary(root, product);
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
      "<h2>제품 런칭 상황보드</h2>" +
      '<p class="view__sub">제품마다 기획부터 생산까지 8단계를 따라갑니다. 진행률은 체크한 할 일 수에서 자동으로 계산됩니다.</p>' +
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

    root.querySelectorAll(".stage").forEach((node) => bindStage(root, product, node));
    growAll(root);
  }

  /* ---------- 할 일 순서 바꾸기 ----------
     손잡이(⠿)를 끌어서 옮긴다. 메모 칸의 글자 선택을 방해하지 않도록,
     손잡이를 잡았을 때만 그 줄이 끌리게 한다.
     끌기는 키보드로 못 하므로 손잡이에 포커스를 두고 ↑ ↓ 로도 옮길 수 있다. */
  function bindTaskReorder(root, product, node) {
    const stageKey = node.dataset.stage;
    const list = node.querySelector(".task-list");
    if (!list) return;

    let dragging = null;

    const persist = () => {
      const ids = Array.from(list.querySelectorAll(".task")).map((li) => li.dataset.taskId);
      Store.setTaskOrder(product.id, stageKey, ids);
    };

    list.querySelectorAll("[data-task-grip]").forEach((grip) => {
      const row = grip.closest(".task");

      grip.addEventListener("dragstart", (event) => {
        dragging = row;
        row.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        /* 파이어폭스는 데이터가 없으면 끌기를 시작하지 않는다. */
        event.dataTransfer.setData("text/plain", row.dataset.taskId);
        if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(row, 20, 16);
      });

      grip.addEventListener("dragend", () => {
        if (dragging) dragging.classList.remove("is-dragging");
        list.querySelectorAll(".task").forEach((li) => li.classList.remove("is-over"));
        dragging = null;
        persist();
      });

      grip.addEventListener("keydown", (event) => {
        const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        if (!Store.moveTask(product.id, stageKey, row.dataset.taskId, step)) return;
        refreshStageBlock(root, product, stageKey);
        /* 다시 그린 뒤에도 같은 손잡이에 포커스를 돌려준다. */
        const fresh = root.querySelector(
          '[data-stage="' + stageKey + '"] [data-task-id="' + row.dataset.taskId + '"] [data-task-grip]'
        );
        if (fresh) fresh.focus();
      });
    });

    list.addEventListener("dragover", (event) => {
      if (!dragging) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const over = event.target.closest(".task");
      if (!over || over === dragging) return;
      const box = over.getBoundingClientRect();
      const after = event.clientY > box.top + box.height / 2;
      list.querySelectorAll(".task").forEach((li) => li.classList.remove("is-over"));
      over.classList.add("is-over");
      list.insertBefore(dragging, after ? over.nextSibling : over);
    });

    list.addEventListener("drop", (event) => {
      if (!dragging) return;
      event.preventDefault();
    });
  }

  function bindStage(root, product, node) {
    if (!node) return;
    const stageKey = node.dataset.stage;

    /* 항목별 메모 — 타이핑이 멈추면 저장한다. */
    node.querySelectorAll("[data-task-memo]").forEach((area) => {
      let timer = null;
      autoGrow(area);
      area.addEventListener("input", () => {
        autoGrow(area);
        clearTimeout(timer);
        timer = setTimeout(() => {
          Store.setTaskMemo(product.id, stageKey, area.dataset.taskMemo, area.value);
        }, 250);
      });
      area.addEventListener("blur", () => {
        clearTimeout(timer);
        Store.setTaskMemo(product.id, stageKey, area.dataset.taskMemo, area.value);
      });
    });

    bindTaskReorder(root, product, node);

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
        refreshStageBlock(root, product, stageKey);
      });
    });

    const input = node.querySelector("[data-task-input]");
    const addBtn = node.querySelector("[data-task-add]");
    const add = () => {
      if (!input.value.trim()) return;
      Store.addTask(product.id, stageKey, input.value);
      refreshStageBlock(root, product, stageKey);
      /* 연달아 여러 개 적을 수 있도록 입력칸에 커서를 돌려준다. */
      const nextInput = root.querySelector(
        '[data-stage="' + stageKey + '"] [data-task-input]'
      );
      if (nextInput) nextInput.focus();
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
      refreshStageBlock(root, product, stageKey);
    });
    node.querySelector("[data-stage-reset]").addEventListener("click", () => {
      Store.resetStage(product.id, stageKey);
      refreshStageBlock(root, product, stageKey);
    });
  }

  return { render, setActive, getActive };
})();
