/* ============================================================
   3) 경쟁제품 참고보드 — 런칭 중인 제품별로 경쟁 제품 자료를 모아 본다
   ============================================================ */

const Competitors = (() => {
  const filters = { productId: "", sort: "price" };

  function productOptions(includeAll) {
    const products = Store.state.products;
    const head = includeAll ? [{ value: "", label: "전체 제품" }] : [{ value: "", label: "연결 안 함" }];
    return head.concat(products.map((p) => ({ value: p.id, label: p.name })));
  }

  function fieldSpec() {
    return [
      {
        name: "productId",
        label: "어느 제품의 경쟁 상대인가요",
        type: "select",
        options: productOptions(false),
        span: 2,
        hint: "제품 런칭 상황보드에 있는 제품과 연결하면 제품별로 묶어서 볼 수 있습니다.",
      },
      { name: "brand", label: "브랜드", type: "text", required: true, placeholder: "라운드랩" },
      { name: "name", label: "제품명", type: "text", required: true, placeholder: "자작나무 수분 앰플" },
      { name: "price", label: "가격", type: "number", min: 0, step: 100, placeholder: "28000" },
      { name: "volume", label: "용량", type: "text", placeholder: "50ml" },
      {
        name: "ingredients",
        label: "핵심 성분",
        type: "textarea",
        rows: 2,
        span: 2,
        placeholder: "자작나무 수액, 히알루론산",
      },
      {
        name: "claims",
        label: "소구 포인트",
        type: "textarea",
        rows: 2,
        span: 2,
        placeholder: "이 제품이 내세우는 효능과 카피",
      },
      { name: "channel", label: "판매 채널", type: "text", placeholder: "올리브영 · 자사몰" },
      {
        name: "url",
        label: "상세페이지 링크",
        type: "url",
        span: 2,
        placeholder: "https://",
        hint: "주소를 넣고 아래 '링크에서 가져오기' 를 누르면 제품명 · 가격 · 썸네일을 자동으로 채웁니다.",
      },
      { name: "__fetch", label: "", type: "fetchmeta", span: 2 },
      {
        name: "images",
        label: "썸네일 · 이미지",
        type: "images",
        span: 2,
        hint: "상세페이지에서 이미지를 복사해 오거나, 이미지 주소를 붙여넣으세요.",
      },
      {
        name: "memo",
        label: "메모",
        type: "textarea",
        rows: 2,
        span: 2,
        placeholder: "우리가 어떻게 비켜갈지, 무엇을 배울지",
      },
    ];
  }

  function normalizeSubmit(data) {
    return Object.assign({}, data);
  }

  function openCreate() {
    UI.openForm({
      title: "경쟁 제품 추가",
      fields: fieldSpec(),
      values: { productId: filters.productId },
      submitLabel: "자료 추가",
      onSubmit: (data) => {
        Store.addCompetitor(normalizeSubmit(data));
        UI.toast("경쟁 제품을 추가했습니다.");
        App.render();
      },
    });
  }

  function openEdit(id) {
    const competitor = Store.state.competitors.find((c) => c.id === id);
    if (!competitor) return;
    UI.openForm({
      title: "경쟁 제품 수정",
      fields: fieldSpec(),
      values: Object.assign({}, competitor),
      submitLabel: "저장",
      onSubmit: (data) => {
        Store.updateCompetitor(id, normalizeSubmit(data));
        UI.toast("수정했습니다.");
        App.render();
      },
    });
  }

  function remove(id) {
    const competitor = Store.state.competitors.find((c) => c.id === id);
    if (!competitor) return;
    UI.confirmAction('"' + competitor.brand + " " + competitor.name + '" 자료를 지울까요?', () => {
      Store.removeCompetitor(id);
      UI.toast("지웠습니다.");
      App.render();
    });
  }

  /* ---------- 가격 비교 차트 ----------
     막대 하나가 제품 하나의 가격. 우리 목표가는 진한 색으로 구분하고,
     색만으로 읽지 않도록 범례와 막대 끝 값 표시를 함께 둔다. */

  function priceChartHtml(product, list) {
    const rows = list
      .filter((c) => Number(c.price) > 0)
      .map((c) => ({ label: c.brand + " " + c.name, value: Number(c.price), ours: false }));

    if (product && Number(product.targetPrice) > 0) {
      rows.push({ label: product.name + " (우리 목표가)", value: Number(product.targetPrice), ours: true });
    }
    if (rows.length < 2) return "";

    rows.sort((a, b) => b.value - a.value);
    const max = rows[0].value;
    const hasOurs = rows.some((row) => row.ours);

    const bars = rows
      .map((row) => {
        const width = Math.max((row.value / max) * 100, 1);
        return (
          '<div class="bar-row">' +
          '<span class="bar-row__label">' + UI.escapeHtml(row.label) + "</span>" +
          '<span class="bar-row__track">' +
          '<span class="bar-row__fill' + (row.ours ? " bar-row__fill--ours" : "") +
          '" style="width:' + width + '%"></span>' +
          "</span>" +
          '<span class="bar-row__value">' + UI.escapeHtml(UI.formatPrice(row.value)) + "</span>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<section class="panel">' +
      '<div class="panel__head">' +
      "<h3>가격 비교</h3>" +
      /* 범례는 화면에 실제로 그려진 막대만 설명한다 */
      '<div class="legend">' +
      (hasOurs
        ? '<span class="legend__item"><span class="legend__swatch legend__swatch--ours"></span>우리 목표가</span>'
        : "") +
      '<span class="legend__item"><span class="legend__swatch"></span>경쟁 제품</span>' +
      "</div>" +
      "</div>" +
      '<div class="bar-chart">' + bars + "</div>" +
      "</section>"
    );
  }

  /* ---------- 비교 표 ---------- */

  function tableHtml(list) {
    if (!list.length) return "";
    const rows = list
      .map((c) => {
        const href = UI.safeUrl(c.url);
        const product = c.productId ? Store.getProduct(c.productId) : null;
        return (
          '<tr data-id="' + c.id + '">' +
          '<td class="cell-thumb">' +
          (c.images && c.images.length
            ? UI.thumbsHtml(c.images, { limit: 1, size: "sm" })
            : '<span class="thumb thumb--empty" aria-hidden="true"></span>') +
          "</td>" +
          "<td>" +
          '<span class="cell-strong">' + UI.escapeHtml(c.brand) + "</span>" +
          '<span class="cell-sub">' + UI.escapeHtml(c.name) + "</span>" +
          (product ? '<span class="cell-link">vs ' + UI.escapeHtml(product.name) + "</span>" : "") +
          "</td>" +
          '<td class="num">' + UI.escapeHtml(UI.formatPrice(c.price)) + "</td>" +
          "<td>" + UI.escapeHtml(c.volume || "—") + "</td>" +
          "<td>" + UI.escapeHtml(c.ingredients || "—") + "</td>" +
          "<td>" + UI.escapeHtml(c.claims || "—") + "</td>" +
          "<td>" + UI.escapeHtml(c.channel || "—") + "</td>" +
          "<td>" +
          (c.memo ? '<span class="cell-memo">' + UI.escapeHtml(c.memo) + "</span>" : '<span class="muted">—</span>') +
          "</td>" +
          '<td class="actions">' +
          (href
            ? '<a class="btn btn--sm btn--ghost" href="' + UI.escapeHtml(href) +
              '" target="_blank" rel="noopener noreferrer">링크</a>'
            : "") +
          '<button type="button" class="btn btn--sm btn--ghost" data-act="edit">수정</button>' +
          '<button type="button" class="btn btn--sm btn--ghost" data-act="remove">삭제</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    return (
      '<section class="panel">' +
      '<div class="panel__head"><h3>비교 표</h3></div>' +
      '<div class="table-wrap">' +
      '<table class="table">' +
      "<thead><tr>" +
      "<th><span class=\"sr-only\">썸네일</span></th>" +
      "<th>제품</th><th class=\"num\">가격</th><th>용량</th><th>핵심 성분</th>" +
      "<th>소구 포인트</th><th>채널</th><th>메모</th><th></th>" +
      "</tr></thead>" +
      "<tbody>" + rows + "</tbody>" +
      "</table>" +
      "</div>" +
      "</section>"
    );
  }

  /* ---------- 렌더 ---------- */

  function sortList(list) {
    const sorted = list.slice();
    if (filters.sort === "price") sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    else if (filters.sort === "priceAsc")
      sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    else sorted.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return sorted;
  }

  /* 컨셉보드 안에 얹어 보여줄 때 쓴다. 제품이 이미 정해져 있으므로
     제품 고르는 칸을 숨기고, 돌아가는 버튼을 붙인다. */
  let embedded = null;

  function renderEmbedded(root, productId, onBack) {
    embedded = { productId, onBack };
    filters.productId = productId;
    render(root);
    embedded = null;
  }

  function render(root) {
    const products = Store.state.products;
    if (filters.productId && !Store.getProduct(filters.productId)) filters.productId = "";

    const list = sortList(Store.competitorsFor(filters.productId));
    const product = filters.productId ? Store.getProduct(filters.productId) : null;

    const productSelect =
      '<select class="select" data-filter-product aria-label="제품 필터">' +
      productOptions(true)
        .map(
          (opt) =>
            '<option value="' + UI.escapeHtml(opt.value) + '"' +
            (opt.value === filters.productId ? " selected" : "") + ">" +
            UI.escapeHtml(opt.label) + "</option>"
        )
        .join("") +
      "</select>";

    const sortSelect =
      '<select class="select" data-filter-sort aria-label="정렬">' +
      [
        { value: "price", label: "가격 높은 순" },
        { value: "priceAsc", label: "가격 낮은 순" },
        { value: "recent", label: "최근 추가 순" },
      ]
        .map(
          (opt) =>
            '<option value="' + opt.value + '"' + (opt.value === filters.sort ? " selected" : "") + ">" +
            UI.escapeHtml(opt.label) + "</option>"
        )
        .join("") +
      "</select>";

    const body = list.length
      ? priceChartHtml(product, list) + tableHtml(list)
      : '<div class="empty"><p class="empty__title">' +
        (Store.state.competitors.length
          ? "이 제품에 연결된 경쟁 제품이 없습니다."
          : "아직 모아둔 경쟁 제품 자료가 없습니다.") +
        "</p><p>" +
        (products.length
          ? "'경쟁 제품 추가'로 가격 · 성분 · 소구 포인트를 쌓아 두면 상세페이지 기획할 때 그대로 씁니다."
          : "먼저 제품 런칭 상황보드에 제품을 추가하면 제품별로 묶어서 관리할 수 있습니다.") +
        "</p></div>";

    const inBoard = !!embedded;

    root.innerHTML =
      '<div class="view__head">' +
      "<div>" +
      (inBoard
        ? '<button type="button" class="btn btn--ghost btn--sm" data-act="back">← 컨셉보드</button>'
        : "") +
      "<h2>🔍 경쟁제품 참고보드</h2>" +
      '<p class="view__sub">' +
      (inBoard && product
        ? UI.escapeHtml(product.name) + " 의 경쟁 상대를 가격 · 성분 · 소구 포인트로 나란히 놓고 봅니다."
        : "런칭 준비 중인 제품별로 경쟁 상대를 모아 가격 · 성분 · 소구 포인트를 나란히 놓고 봅니다.") +
      "</p>" +
      "</div>" +
      '<button type="button" class="btn btn--primary" data-act="create">+ 경쟁 제품 추가</button>' +
      "</div>" +
      '<div class="toolbar">' + (inBoard ? "" : productSelect) + sortSelect + "</div>" +
      (product
        ? '<p class="context-line">기준 제품 · <strong>' + UI.escapeHtml(product.name) + "</strong>" +
          (Number(product.targetPrice) > 0
            ? " · 목표 판매가 " + UI.escapeHtml(UI.formatPrice(product.targetPrice))
            : "") +
          "</p>"
        : "") +
      body;

    bind(root, embedded);
  }

  function bind(root, embed) {
    root.querySelector('[data-act="create"]').addEventListener("click", openCreate);

    const backBtn = root.querySelector('[data-act="back"]');
    if (backBtn && embed) backBtn.addEventListener("click", embed.onBack);

    const productFilter = root.querySelector("[data-filter-product]");
    if (productFilter) {
      productFilter.addEventListener("change", () => {
        filters.productId = productFilter.value;
        App.render();
      });
    }

    const sortFilter = root.querySelector("[data-filter-sort]");
    sortFilter.addEventListener("change", () => {
      filters.sort = sortFilter.value;
      App.render();
    });

    UI.bindThumbs(root, (group) => {
      const row = group.closest("tr");
      const competitor = Store.state.competitors.find((c) => c.id === row.dataset.id);
      return (competitor && competitor.images) || [];
    });

    root.querySelectorAll("tbody tr").forEach((row) => {
      const id = row.dataset.id;
      row.querySelectorAll("[data-act]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.act === "edit") openEdit(id);
          if (btn.dataset.act === "remove") remove(id);
        });
      });
    });
  }

  function focusProduct(productId) {
    filters.productId = productId || "";
  }

  return { render, renderEmbedded, focusProduct };
})();
