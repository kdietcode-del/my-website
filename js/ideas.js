/* ============================================================
   1) 신제품 아이디어 — 떠오른 제품 아이디어와 타사 레퍼런스를 쌓는 판
   ============================================================ */

const Ideas = (() => {
  const filters = { kind: "all", efficacyType: "all", category: "all", query: "" };

  const KIND_OPTIONS = [
    { value: "idea", label: "내 아이디어" },
    { value: "reference", label: "타사 레퍼런스" },
  ];

  function fieldSpec() {
    return [
      {
        name: "kind",
        label: "구분",
        type: "radio",
        options: KIND_OPTIONS,
        span: 2,
        hint: "내가 낸 아이디어인지, 참고하려고 모아둔 타사 사례인지 구분합니다.",
      },
      {
        name: "name",
        label: "제품명",
        type: "text",
        required: true,
        placeholder: "예) 무화과 시카 진정 앰플",
        span: 2,
      },
      {
        name: "efficacyType",
        label: "피부효능",
        type: "select",
        options: [{ value: "", label: "선택 안 함" }].concat(
          EFFICACIES.map((e) => ({ value: e.key, label: e.label }))
        ),
        hint: "어떤 피부 고민을 겨냥하는지",
      },
      {
        name: "category",
        label: "카테고리",
        type: "select",
        options: [{ value: "", label: "선택 안 함" }].concat(
          CATEGORIES.map((c) => ({ value: c.key, label: c.label }))
        ),
        hint: "어떤 제형으로 나올지",
      },
      {
        name: "status",
        label: "진행 상태",
        type: "select",
        options: STATUSES.map((s) => ({ value: s.key, label: s.label })),
      },
      {
        name: "tags",
        label: "태그",
        type: "text",
        placeholder: "잡티흔적, 톤업미백",
        hint: "쉼표로 구분합니다.",
      },
      {
        name: "efficacy",
        label: "한 줄 컨셉",
        type: "textarea",
        rows: 3,
        span: 2,
        placeholder: "어떤 피부 고민을 어떻게 해결하는 제품인지",
      },
      {
        name: "ingredients",
        label: "성분",
        type: "textarea",
        rows: 2,
        span: 2,
        placeholder: "Niacinamide 5% / Alpha-arbutin 2%",
      },
      {
        name: "usp",
        label: "광고 소구점",
        type: "textarea",
        rows: 3,
        span: 2,
        placeholder: "광고에서 무엇을 어떻게 보여줄지",
      },
      {
        name: "images",
        label: "이미지",
        type: "images",
        span: 2,
        hint: "제품 컷, 레퍼런스 스크린샷, 무드보드 등을 붙여 둡니다.",
      },
      {
        name: "refs",
        label: "참고 레퍼런스",
        type: "refs",
        span: 2,
        hint: "타사 제품, 아티클, 이미지 링크 등 근거가 되는 자료를 모아둡니다.",
      },
      /* 메모 칸은 뺐다. 여기 적히던 '아직 안 정해진 것' 은 기획서의
         '디벨롭 필요사항' 에서 적는다. 두 군데 두면 갈린다. */
    ];
  }

  function openCreate() {
    UI.openForm({
      title: "아이디어 추가",
      fields: fieldSpec(),
      values: { kind: "idea", category: "", efficacyType: "", status: "" },
      submitLabel: "판에 올리기",
      onSubmit: (data) => {
        Store.addIdea(data);
        UI.toast("아이디어를 판에 올렸습니다.");
        App.render();
      },
    });
  }

  function openEdit(id) {
    const idea = Store.state.ideas.find((i) => i.id === id);
    if (!idea) return;
    UI.openForm({
      title: "아이디어 수정",
      fields: fieldSpec(),
      values: Object.assign({}, idea, { tags: (idea.tags || []).join(", ") }),
      submitLabel: "저장",
      onSubmit: (data) => {
        Store.updateIdea(id, data);
        UI.toast("수정했습니다.");
        App.render();
      },
    });
  }

  /* 아이디어를 제품 런칭 상황보드로 넘긴다. 8단계 체크리스트가 함께 생성된다. */
  function promote(id) {
    const idea = Store.state.ideas.find((i) => i.id === id);
    if (!idea) return;
    UI.openForm({
      title: "런칭 준비로 넘기기",
      fields: [
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
          hint: "경쟁 제품 가격 비교에 쓰입니다.",
        },
        {
          name: "memo",
          label: "메모",
          type: "textarea",
          rows: 2,
          span: 2,
        },
      ],
      values: {
        name: idea.name,
        category: idea.category,
        efficacyType: idea.efficacyType,
        memo: [idea.usp, idea.ingredients, ((idea.plan || {}).develop || {}).text]
          .filter(Boolean)
          .join("\n\n"),
      },
      submitLabel: "8단계 보드 만들기",
      onSubmit: (data) => {
        const product = Store.addProduct(Object.assign({ fromIdeaId: id }, data));
        UI.toast("제품 런칭 상황보드에 추가했습니다. 8단계 체크리스트가 준비됐어요.");
        App.go("pipeline", product.id);
      },
    });
  }

  function remove(id) {
    const idea = Store.state.ideas.find((i) => i.id === id);
    if (!idea) return;
    UI.confirmAction('"' + idea.name + '" 을(를) 판에서 지울까요?', () => {
      Store.removeIdea(id);
      UI.toast("지웠습니다.");
      App.render();
    });
  }

  /* ---------- 렌더 ---------- */

  function visibleIdeas() {
    const query = filters.query.trim().toLowerCase();
    return Store.state.ideas.filter((idea) => {
      if (filters.kind !== "all" && idea.kind !== filters.kind) return false;
      if (filters.efficacyType !== "all" && idea.efficacyType !== filters.efficacyType) return false;
      if (filters.category !== "all" && idea.category !== filters.category) return false;
      if (!query) return true;
      const haystack = [
        idea.name,
        idea.efficacy,
        idea.ingredients,
        idea.usp,
        ((idea.plan || {}).develop || {}).text,
        (idea.tags || []).join(" "),
        (idea.refs || []).map((r) => r.label).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  function refsHtml(refs) {
    if (!refs || !refs.length) return "";
    const items = refs
      .map((ref) => {
        const href = UI.safeUrl(ref.url);
        const label = UI.escapeHtml(ref.label || ref.url);
        if (href) {
          return (
            '<li><a href="' + UI.escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' +
            label + ' <span class="link-arrow" aria-hidden="true">↗</span></a></li>'
          );
        }
        return "<li>" + label + "</li>";
      })
      .join("");
    return (
      '<div class="card__block">' +
      '<h4 class="card__label">참고 레퍼런스</h4>' +
      '<ul class="ref-list">' + items + "</ul>" +
      "</div>"
    );
  }

  function cardHtml(idea) {
    const isReference = idea.kind === "reference";
    const tags = (idea.tags || []).map((t) => UI.chip("#" + t)).join("");
    const efficacyName = UI.efficacyLabel(idea.efficacyType);
    const statusName = idea.status ? UI.statusLabel(idea.status) : "";

    /* 대부분이 내 아이디어라 '내 아이디어' 배지는 달지 않는다.
       예외인 타사 레퍼런스만 표시한다. */
    const head = [
      isReference ? '<span class="kind kind--ref">타사 레퍼런스</span>' : "",
      efficacyName ? UI.chip(efficacyName, "chip--eff") : "",
      idea.category
        ? UI.chip(
            UI.categoryLabel(idea.category),
            "chip--cat chip--cat-" + UI.escapeHtml(idea.category)
          )
        : "",
      statusName
        ? '<span class="chip chip--status chip--status-' + UI.escapeHtml(idea.status) + '">' +
          UI.escapeHtml(statusName) + "</span>"
        : "",
      idea.sample ? '<span class="chip chip--sample">샘플</span>' : "",
    ].filter(Boolean);

    return (
      '<article class="card idea-card" data-id="' + idea.id + '">' +
      '<button type="button" class="card__grip" data-idea-grip draggable="true" ' +
      'aria-label="' + UI.escapeHtml(idea.name) + ' 순서 바꾸기. 끌어서 옮기거나 좌·우 화살표를 누르세요">' +
      '<span aria-hidden="true">⠿</span></button>' +
      (head.length ? '<header class="card__head">' + head.join("") + "</header>" : "") +
      '<h3 class="card__title">' + UI.escapeHtml(idea.name) + "</h3>" +
      UI.thumbsHtml(idea.images, { limit: 4 }) +
      (idea.efficacy
        ? '<div class="card__block"><h4 class="card__label">한 줄 컨셉</h4><p>' +
          UI.escapeHtml(idea.efficacy) + "</p></div>"
        : "") +
      (idea.ingredients
        ? '<div class="card__block"><h4 class="card__label">성분</h4><p class="mono">' +
          UI.escapeHtml(idea.ingredients) + "</p></div>"
        : "") +
      (idea.usp
        ? '<div class="card__block"><h4 class="card__label">광고 소구점</h4><p>' +
          UI.escapeHtml(idea.usp) + "</p></div>"
        : "") +
      refsHtml(idea.refs) +
      /* 메모는 기획서의 '디벨롭 필요사항' 으로 옮겼다. 카드에서는 읽기만 한다 —
         고치는 곳이 둘이면 어느 쪽이 최신인지 알 수 없다. */
      (((idea.plan || {}).develop || {}).text
        ? '<div class="card__block card__block--memo"><h4 class="card__label">디벨롭 필요사항</h4><p>' +
          UI.escapeHtml(idea.plan.develop.text) + "</p></div>"
        : "") +
      (tags ? '<div class="chip-row">' + tags + "</div>" : "") +
      '<footer class="card__foot">' +
      '<button type="button" class="btn btn--sm btn--primary" data-act="plan">기획서 ' +
      Store.planFilled(idea) + " / " + PLAN_STEPS.length + "</button>" +
      '<button type="button" class="btn btn--sm btn--ghost" data-act="promote">런칭 준비로 →</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-act="edit">수정</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-act="remove">삭제</button>' +
      "</footer>" +
      "</article>"
    );
  }

  /* ---------- 지금 해야할 일 ----------

     어느 아이디어에도 안 붙는 일들이 있다. 제조사에 전화하기, 샘플 받아 보기
     같은 것. 적을 데가 없어 머리에만 있었다.

     끝낸 것은 지우지 않고 아래로 내린다 — 오늘 뭘 했는지가 남아야 한다. */
  function todoHtml() {
    const todos = Store.state.todos || [];
    const left = todos.filter((t) => !t.done).length;
    const done = todos.length - left;

    const rows = todos
      .map(
        (todo) =>
          '<li class="todo' + (todo.done ? " todo--done" : "") + '" data-todo="' +
          UI.escapeHtml(todo.id) + '">' +
          '<button type="button" class="todo__grip" data-todo-grip draggable="true" ' +
          'aria-label="' + UI.escapeHtml(todo.text || "이 할 일") +
          ' 순서 바꾸기. 끌어서 옮기거나 위·아래 화살표를 누르세요"><span aria-hidden="true">⠿</span></button>' +
          '<label class="todo__check"><input type="checkbox" data-todo-done' +
          (todo.done ? " checked" : "") + ' aria-label="끝냈는지 표시"></label>' +
          '<input type="text" class="todo__text" data-todo-text value="' +
          UI.escapeHtml(todo.text) + '" aria-label="할 일">' +
          '<button type="button" class="icon-btn" data-todo-remove aria-label="이 할 일 지우기">✕</button>' +
          "</li>"
      )
      .join("");

    return (
      '<section class="todos" data-todos>' +
      '<header class="todos__head">' +
      '<h3 class="todos__title">지금 해야할 일' +
      (left ? '<span class="todos__left">' + left + "</span>" : "") +
      "</h3>" +
      (done
        ? '<button type="button" class="btn btn--ghost btn--sm" data-todo-clear>끝낸 일 ' +
          done + "건 치우기</button>"
        : "") +
      "</header>" +
      (rows ? '<ul class="todos__list">' + rows + "</ul>" : "") +
      '<div class="todos__add">' +
      '<input type="text" class="input" data-todo-new placeholder="할 일을 적고 Enter" aria-label="할 일 추가">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-todo-add>추가</button>' +
      "</div>" +
      "</section>"
    );
  }

  function openPlan(id) {
    Plan.setActive(id);
    App.render();
  }

  function render(root) {
    /* 기획서가 열려 있으면 목록 대신 그것을 그린다 */
    const openId = Plan.getActive();
    if (openId) {
      const idea = Store.state.ideas.find((i) => i.id === openId);
      if (idea) {
        Plan.render(root, idea, () => {
          Plan.setActive(null);
          App.render();
        });
        return;
      }
      Plan.setActive(null);
    }

    const list = visibleIdeas();
    const total = Store.state.ideas.length;
    const ownCount = Store.state.ideas.filter((i) => i.kind !== "reference").length;
    const refCount = total - ownCount;

    const segments = [
      { key: "all", label: "전체 " + total },
      { key: "idea", label: "내 아이디어 " + ownCount },
      { key: "reference", label: "타사 레퍼런스 " + refCount },
    ]
      .map(
        (seg) =>
          '<button type="button" class="seg' + (filters.kind === seg.key ? " seg--on" : "") +
          '" data-kind="' + seg.key + '">' + UI.escapeHtml(seg.label) + "</button>"
      )
      .join("");

    const efficacyOptions =
      '<option value="all">피부효능 전체</option>' +
      EFFICACIES.map(
        (e) =>
          '<option value="' + e.key + '"' + (filters.efficacyType === e.key ? " selected" : "") + ">" +
          UI.escapeHtml(e.label) + "</option>"
      ).join("");

    const categoryOptions =
      '<option value="all">카테고리 전체</option>' +
      CATEGORIES.map(
        (c) =>
          '<option value="' + c.key + '"' + (filters.category === c.key ? " selected" : "") + ">" +
          UI.escapeHtml(c.label) + "</option>"
      ).join("");

    root.innerHTML =
      '<div class="view__head">' +
      "<div>" +
      "<h2>신제품 아이디어</h2>" +
      '<p class="view__sub">떠오른 제품 아이디어와 참고할 타사 사례를 아무렇게나 던져 두는 판입니다. 쓸 만해지면 런칭 준비로 넘기세요.</p>' +
      "</div>" +
      '<div class="view__actions">' +
      /* 화면을 안 쓰고 손으로 채우고 싶을 때. 기획서와 같은 일곱 칸이다. */
      '<a class="btn btn--ghost" href="%EC%8B%A0%EC%A0%9C%ED%92%88-%EA%B8%B0%ED%9A%8D-%EC%9E%A5%ED%91%9C.docx" download>기획 장표 양식 (Word)</a>' +
      '<button type="button" class="btn btn--primary" data-act="create">+ 아이디어 추가</button>' +
      "</div>" +
      "</div>" +
      todoHtml() +
      '<div class="toolbar">' +
      '<div class="segmented" role="group" aria-label="구분 필터">' + segments + "</div>" +
      '<select class="select" data-filter-efficacy aria-label="피부효능 필터">' + efficacyOptions + "</select>" +
      '<select class="select" data-filter-category aria-label="카테고리 필터">' + categoryOptions + "</select>" +
      '<input type="search" class="input" data-filter-query placeholder="제품명 · 한 줄 컨셉 · 성분 · 태그 검색" value="' +
      UI.escapeHtml(filters.query) + '" aria-label="검색">' +
      "</div>" +
      (list.length
        ? '<div class="card-grid">' + list.map(cardHtml).join("") + "</div>"
        : '<div class="empty"><p class="empty__title">' +
          (total ? "조건에 맞는 아이디어가 없습니다." : "아직 올라온 아이디어가 없습니다.") +
          "</p><p>" +
          (total ? "필터를 바꿔 보세요." : "오른쪽 위 '아이디어 추가'로 첫 아이디어를 던져 보세요.") +
          "</p></div>");

    bind(root);
  }

  /* ---------- 카드 순서 바꾸기 ----------
     손잡이(⠿)를 끌어서 옮긴다. 카드 전체를 끌리게 하면 안에 있는 링크와
     버튼을 누르기 어려워진다.
     끌기는 키보드로 못 하므로 손잡이에서 ← → 로도 옮길 수 있게 둔다. */
  function bindTodos(root) {
    const wrap = root.querySelector("[data-todos]");
    if (!wrap) return;
    const box = wrap.querySelector("[data-todo-new]");

    function add() {
      const text = box.value.trim();
      if (!text) return;
      Store.addTodo(text);
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
        const gone = Store.clearDoneTodos();
        App.render();
        UI.toast(gone + "건을 치웠습니다.");
      });
    }

    wrap.addEventListener("change", (event) => {
      const row = event.target.closest(".todo");
      if (!row) return;
      if (event.target.matches("[data-todo-done]")) {
        Store.updateTodo(row.dataset.todo, { done: event.target.checked });
        App.render();
        return;
      }
      if (event.target.matches("[data-todo-text]")) {
        Store.updateTodo(row.dataset.todo, { text: event.target.value.trim() });
      }
    });

    wrap.addEventListener("click", (event) => {
      if (!event.target.matches("[data-todo-remove]")) return;
      Store.removeTodo(event.target.closest(".todo").dataset.todo);
      App.render();
    });

    bindTodoReorder(wrap);
  }

  /* 순서 바꾸기 — 아이디어 카드와 같은 방식이다. 손잡이를 잡았을 때만
     끌리게 해서, 글자를 고르려다 줄이 딸려가지 않게 한다. */
  function bindTodoReorder(wrap) {
    const list = wrap.querySelector(".todos__list");
    if (!list) return;
    let dragging = null;

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
        save();
      });

      row.addEventListener("dragover", (event) => {
        if (!dragging || dragging === row) return;
        event.preventDefault();
        const box = row.getBoundingClientRect();
        const below = event.clientY > box.top + box.height / 2;
        list.insertBefore(dragging, below ? row.nextSibling : row);
      });

      /* 끌기는 키보드로 못 한다. 손잡이에 초점을 두고 ↑ ↓ 로도 옮긴다. */
      grip.addEventListener("keydown", (event) => {
        const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        const rows = Array.from(list.querySelectorAll(".todo"));
        const at = rows.indexOf(row);
        Store.moveTodo(row.dataset.todo, at + step);
        App.render();
        const moved = document.querySelector('.todo[data-todo="' + row.dataset.todo + '"]');
        if (moved) moved.querySelector("[data-todo-grip]").focus();
      });
    });

    function save() {
      Array.from(list.querySelectorAll(".todo")).forEach((row, index) => {
        Store.moveTodo(row.dataset.todo, index);
      });
    }

    list.addEventListener("drop", (event) => event.preventDefault());
  }

  function bindReorder(root) {
    const grid = root.querySelector(".card-grid");
    if (!grid) return;

    let dragging = null;

    const persist = () => {
      const ids = Array.from(grid.querySelectorAll(".idea-card")).map((c) => c.dataset.id);
      Store.setIdeaOrder(ids);
    };

    grid.querySelectorAll("[data-idea-grip]").forEach((grip) => {
      const card = grip.closest(".idea-card");

      grip.addEventListener("dragstart", (event) => {
        dragging = card;
        card.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.dataset.id);
        if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(card, 24, 24);
      });

      grip.addEventListener("dragend", () => {
        if (dragging) dragging.classList.remove("is-dragging");
        grid.querySelectorAll(".idea-card").forEach((c) => c.classList.remove("is-over"));
        dragging = null;
        persist();
      });

      grip.addEventListener("keydown", (event) => {
        const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        if (!Store.moveIdea(card.dataset.id, step)) return;
        const id = card.dataset.id;
        App.render();
        const fresh = document.querySelector('.idea-card[data-id="' + id + '"] [data-idea-grip]');
        if (fresh) fresh.focus();
      });
    });

    grid.addEventListener("dragover", (event) => {
      if (!dragging) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const over = event.target.closest(".idea-card");
      if (!over || over === dragging) return;
      /* 카드가 격자로 놓여 있어 좌우 위치로 앞뒤를 정한다. */
      const box = over.getBoundingClientRect();
      const after = event.clientX > box.left + box.width / 2;
      grid.querySelectorAll(".idea-card").forEach((c) => c.classList.remove("is-over"));
      over.classList.add("is-over");
      grid.insertBefore(dragging, after ? over.nextSibling : over);
    });

    grid.addEventListener("drop", (event) => {
      if (dragging) event.preventDefault();
    });
  }

  function bind(root) {
    const createBtn = root.querySelector('[data-act="create"]');
    if (createBtn) createBtn.addEventListener("click", openCreate);

    root.querySelectorAll("[data-kind]").forEach((btn) => {
      btn.addEventListener("click", () => {
        filters.kind = btn.dataset.kind;
        App.render();
      });
    });

    const efficacySelect = root.querySelector("[data-filter-efficacy]");
    if (efficacySelect) {
      efficacySelect.addEventListener("change", () => {
        filters.efficacyType = efficacySelect.value;
        App.render();
      });
    }

    const categorySelect = root.querySelector("[data-filter-category]");
    if (categorySelect) {
      categorySelect.addEventListener("change", () => {
        filters.category = categorySelect.value;
        App.render();
      });
    }

    const search = root.querySelector("[data-filter-query]");
    if (search) {
      search.addEventListener("input", () => {
        filters.query = search.value;
        App.render();
        /* 다시 그린 뒤에도 입력 위치를 유지한다. */
        const next = document.querySelector("[data-filter-query]");
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      });
    }

    UI.bindThumbs(root, (group) => {
      const card = group.closest(".idea-card");
      const idea = Store.state.ideas.find((i) => i.id === card.dataset.id);
      return (idea && idea.images) || [];
    });

    bindTodos(root);
    bindReorder(root);

    root.querySelectorAll(".idea-card").forEach((card) => {
      const id = card.dataset.id;

      /* 카드 본문 아무 데나 눌러도 기획서가 열린다. 단추 · 링크 · 손잡이 ·
         썸네일은 각자 할 일이 있으니 건드리지 않는다. */
      card.addEventListener("click", (event) => {
        if (event.target.closest("button, a, .img-thumb, .thumb")) return;
        openPlan(id);
      });
      card.querySelectorAll("[data-act]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.act;
          if (action === "edit") openEdit(id);
          if (action === "remove") remove(id);
          if (action === "promote") promote(id);
          if (action === "plan") openPlan(id);
        });
      });
    });
  }

  return { render };
})();
