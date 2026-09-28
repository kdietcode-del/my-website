/* ============================================================
   제품 컨셉보드

   제품 하나를 가로로 긴 한 장에 펼쳐 놓고, 그 자리에서 바로 고친다.
   글을 누르면 커서가 잡힌다. 글꼴과 크기는 고르게 하지 않는다 — 칸마다
   정해진 크기로 두어야 한 장짜리 문서로 읽힌다.
   ============================================================ */

const Concept = (() => {
  let activeId = null;
  /* "list" 제품 고르기 · "board" 컨셉보드 · "rivals" 그 제품의 참고제품 보드 */
  let mode = "list";

  function setActive(id) {
    activeId = id || null;
    mode = id ? "board" : "list";
  }

  function getActive() {
    return activeId;
  }

  /* ---------- 글 덩어리 ---------- */

  /* 글꼴과 크기는 고르게 하지 않는다. 칸마다 정해진 크기로만 두어야
     보드가 한 장짜리 문서로 읽힌다. */
  function textHtml(path, part, placeholder, extraClass) {
    return (
      '<div class="ctext' + (extraClass ? " " + extraClass : "") + '" contenteditable="true" ' +
      'data-path="' + path + '" ' +
      'data-placeholder="' + UI.escapeHtml(placeholder) + '" role="textbox" aria-label="' +
      UI.escapeHtml(placeholder) + '">' +
      UI.escapeHtml(part.text || "") +
      "</div>"
    );
  }

  /* ---------- 칸들 ---------- */

  function panel(title, inner, extraClass, key) {
    return (
      '<section class="cpanel' + (extraClass ? " " + extraClass : "") + '"' +
      (key ? ' data-panel="' + key + '"' : "") + ">" +
      '<h3 class="cpanel__title">' + UI.escapeHtml(title) + "</h3>" +
      '<div class="cpanel__body">' + inner + "</div>" +
      "</section>"
    );
  }

  /* 5. 시장크기 — 키워드 한 줄에 검색량과 추이를 나란히 놓는다.

     키워드는 '잡티앰플' 네 자면 끝이라 칸이 넓을 이유가 없다. 남는 폭은
     추이가 가져간다. 숫자 하나만으로는 뜨는 말인지 지는 말인지 알 수 없고,
     화장품은 계절을 타서 열두 달을 봐야 한다.

     막대에 얹히는 지난 달 숫자는 추정이다. 데이터랩이 비율만 주기 때문에
     마지막 달 실제값에 맞춰 편 값이다. */
  const TREND_MONTHS = 12;

  /* 오래된 달부터 차례로, 끝이 이번 달 */
  function monthKeys(count) {
    const now = new Date();
    const out = [];
    for (let back = count - 1; back >= 0; back -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      out.push(d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"));
    }
    return out;
  }

  /* 붙여넣은 숫자 뭉치를 칸별로 쪼갠다.

     '1,200' 의 쉼표는 자릿수 구분이지 칸 구분이 아니다. 무턱대고 쉼표로
     자르면 1 과 200 두 칸이 된다. 그래서 줄바꿈·탭이 있으면 그것으로 자르고,
     없으면 쉼표가 천 단위인지부터 본다. */
  function splitNumbers(text) {
    const raw = String(text || "");
    let pieces;
    if (/[\r\n\t]/.test(raw)) {
      pieces = raw.split(/[\r\n\t]+/);
    } else if (/,\d{3}(?!\d)/.test(raw)) {
      pieces = raw.split(/\s+/);
    } else {
      pieces = raw.split(/[,;\s]+/);
    }
    return pieces.map((piece) => piece.replace(/[^0-9]/g, "")).filter((piece) => piece !== "");
  }

  /* 손으로 적은 숫자를 막대가 읽을 수 있는 모양으로 바꾼다. 비율은 가장 큰
     달을 100 으로 두고 계산한다. 어디서 온 값인지 표시를 남긴다 — 가져온
     값과 적어 넣은 값이 같아 보이면 안 된다. */
  function trendFromCounts(counts) {
    const keys = monthKeys(counts.length);
    const top = Math.max.apply(null, counts.map((c) => c || 0));
    if (!top) return [];
    return counts.map((count, i) => ({
      period: keys[i],
      count: count || 0,
      ratio: Math.round(((count || 0) / top) * 100),
      manual: true,
    }));
  }

  function sparkline(trend) {
    if (!trend || trend.length < 2) {
      return '<span class="spark__add">＋ 추이</span>';
    }
    const top = Math.max.apply(null, trend.map((p) => p.ratio || 0));
    if (!top) return '<span class="spark__add">＋ 추이</span>';
    const bars = trend
      .map((point) => {
        const height = Math.max(2, Math.round(((point.ratio || 0) / top) * 100));
        const label =
          point.period +
          (point.count != null ? " · " + Number(point.count).toLocaleString("ko-KR") + "회" : "");
        return (
          '<span class="spark__bar"><span style="height:' + height + '%" title="' +
          UI.escapeHtml(label) + '"></span></span>'
        );
      })
      .join("");
    const hand = trend.some((p) => p.manual);
    return (
      '<span class="spark" aria-label="' +
      UI.escapeHtml(trend[0].period + " 부터 " + trend[trend.length - 1].period + " 까지 검색 추이") +
      '">' + bars + "</span>" +
      '<span class="spark__cap">' + trend.length + "개월" +
      (hand ? ' <span class="spark__hand">직접 입력</span>' : "") + "</span>"
    );
  }

  function keywordRow(row, index, placeholder) {
    const trend = Array.isArray(row.trend) ? row.trend : [];
    return (
      '<div class="krow" data-krow="' + index + '" data-trend="' +
      UI.escapeHtml(trend.length ? JSON.stringify(trend) : "") + '">' +
      '<input type="text" class="input krow__word" value="' + UI.escapeHtml(row.keyword || "") +
      '" placeholder="' + UI.escapeHtml(placeholder || "키워드") + '" aria-label="키워드">' +
      '<input type="text" class="input krow__count" value="' + UI.escapeHtml(row.count || "") +
      '" placeholder="검색량" aria-label="월 검색량" inputmode="numeric">' +
      '<button type="button" class="krow__trend" data-krow-trend ' +
      'title="눌러서 월별 검색량 적기">' + sparkline(trend) + "</button>" +
      '<button type="button" class="icon-btn" data-krow-look aria-label="검색량 다시 가져오기" ' +
      'title="검색량 다시 가져오기">↻</button>' +
      '<button type="button" class="icon-btn" data-krow-remove aria-label="이 줄 삭제">✕</button>' +
      "</div>"
    );
  }

  function keywordRows(path, rows, placeholder) {
    const list = (rows.length ? rows : [{ keyword: "", count: "" }])
      .map((row, index) => keywordRow(row, index, placeholder))
      .join("");
    return (
      '<div class="krows" data-keywords="' + path + '" data-hint="' +
      UI.escapeHtml(placeholder) + '">' +
      list +
      '<button type="button" class="btn btn--ghost btn--sm" data-krow-add>+ 키워드 추가</button>' +
      "</div>"
    );
  }

  /* 7. 참고제품 — 참고제품 보드와 같은 기록을 본다. 두 군데 따로 적으면
     같은 제품이 두 번 들어가고, 어느 쪽이 최신인지 알 수 없게 된다.

     카드에는 이름만 두고, 썸네일을 누르면 USP · 주요 성분 · 참고 영상이
     열린다. 더 자세한 값(가격 · 용량 · 판매 채널)은 참고보드에서 적는다. */
  function rivalShot(row) {
    const image = (row.images || [])[0];
    if (!image) return '<span class="rcard__blank" aria-hidden="true">🔍</span>';
    return image.url
      ? '<img src="' + UI.escapeHtml(UI.safeUrl(image.url)) + '" alt="" loading="lazy">'
      : '<img data-img-id="' + UI.escapeHtml(image.id) + '" alt="" loading="lazy">';
  }

  function rivalCard(row) {
    const link = UI.safeUrl(row.url);
    const title = [row.brand, row.name].filter(Boolean).join(" ") || "이 참고제품";
    const noted = row.claims || row.ingredients || row.video;
    return (
      '<div class="rcard" data-cid="' + UI.escapeHtml(row.id) + '">' +
      '<div class="rcard__shot">' +
      '<button type="button" class="rcard__open" data-rcard-open ' +
      'aria-label="' + UI.escapeHtml(title) + ' 자세히 보기" ' +
      'title="눌러서 USP · 주요 성분 · 참고 영상 적기">' +
      rivalShot(row) +
      '<span class="rcard__mark' + (noted ? " rcard__mark--on" : "") + '" aria-hidden="true">✎</span>' +
      "</button>" +
      '<button type="button" class="img-thumb__x" data-rcard-remove aria-label="이 참고제품 삭제">✕</button>' +
      "</div>" +
      '<input type="text" class="input rcard__f" data-f="brand" value="' +
      UI.escapeHtml(row.brand || "") + '" placeholder="브랜드" aria-label="브랜드">' +
      '<input type="text" class="input rcard__f" data-f="name" value="' +
      UI.escapeHtml(row.name || "") + '" placeholder="제품명" aria-label="제품명">' +
      '<input type="url" class="input rcard__f" data-f="url" value="' +
      UI.escapeHtml(row.url || "") + '" placeholder="상세페이지 링크" aria-label="링크">' +
      (link
        ? '<a class="rcard__link" href="' + UI.escapeHtml(link) +
          '" target="_blank" rel="noopener noreferrer">상세페이지 열기 ↗</a>'
        : "") +
      '<p class="rcard__msg" data-rcard-msg></p>' +
      "</div>"
    );
  }

  function rivalRows(productId) {
    return (
      '<div class="rcards" data-rivals>' +
      Store.competitorsFor(productId).map(rivalCard).join("") +
      '<button type="button" class="rcard rcard--add" data-rcard-add>' +
      "<span>＋</span>참고제품 추가</button>" +
      "</div>"
    );
  }

  /* 8 · 9. 가부 판단 */
  function checkHtml(path, value, label) {
    const options = CHECK_STATES.map(
      (s) =>
        '<option value="' + s.key + '"' + (s.key === value.state ? " selected" : "") + ">" +
        UI.escapeHtml(s.label) + "</option>"
    ).join("");
    return (
      '<div class="ccheck">' +
      '<select class="select" data-check="' + path + '" aria-label="' + UI.escapeHtml(label) + '">' +
      options + "</select>" +
      '<span class="ccheck__dot ccheck__dot--' + (value.state || "none") + '" aria-hidden="true"></span>' +
      "</div>" +
      textHtml(path + ".note", value.note, "근거 · 메모", "ctext--small")
    );
  }

  /* 머리에 붙는 제원 줄 — 카테고리 · 효능 · 가격 · 용량처럼 한 줄로 끝나는 값.
     이름 칸도 입력칸이라, 다른 항목이 필요하면 그 자리에서 바꿔 쓰면 된다. */
  function specRow(row, index) {
    const hint = (CONCEPT_SPECS.find((s) => s.label === row.label) || {}).hint || "내용";
    return (
      '<div class="cspec" data-spec="' + index + '">' +
      '<input type="text" class="cspec__label" data-sf="label" value="' +
      UI.escapeHtml(row.label || "") + '" placeholder="항목" aria-label="항목 이름">' +
      '<input type="text" class="cspec__value" data-sf="value" value="' +
      UI.escapeHtml(row.value || "") + '" placeholder="' + UI.escapeHtml(hint) +
      '" aria-label="' + UI.escapeHtml(row.label || "내용") + '">' +
      '<button type="button" class="icon-btn" data-spec-remove aria-label="이 줄 삭제">✕</button>' +
      "</div>"
    );
  }

  function specsHtml(rows) {
    return (
      '<div class="cspecs" data-specs>' +
      rows.map(specRow).join("") +
      '<button type="button" class="btn btn--ghost btn--sm" data-spec-add>+ 항목 추가</button>' +
      "</div>"
    );
  }

  /* 이미지 구역 */
  function imageZone(path, images, label) {
    const thumbs = images
      .map(
        (image, index) =>
          '<div class="czone__item" data-image-index="' + index + '">' +
          '<button type="button" class="czone__zoom" data-image-zoom aria-label="크게 보기">' +
          (image.url
            ? '<img src="' + UI.escapeHtml(UI.safeUrl(image.url)) + '" alt="" loading="lazy">'
            : '<img data-img-id="' + UI.escapeHtml(image.id) + '" alt="" loading="lazy">') +
          "</button>" +
          '<button type="button" class="img-thumb__x" data-image-remove aria-label="사진 빼기">✕</button>' +
          "</div>"
      )
      .join("");
    return (
      '<div class="czone" data-images="' + path + '">' +
      '<div class="czone__grid">' + thumbs + "</div>" +
      '<button type="button" class="czone__add" data-image-add>' +
      "<span>＋</span>" + UI.escapeHtml(label) +
      "</button>" +
      "</div>"
    );
  }

  /* ---------- 인쇄 준비 ----------

     화면은 빈 칸도 눌러 채울 수 있어야 하니 다 보여 준다. 종이는 다르다.
     안 채운 칸이 자리만 차지하면 정작 채운 것이 두 장으로 밀린다.

     그래서 인쇄 직전에 빈 것에 표시를 달고, USP 를 제품명 아래로 옮긴다.
     끝나면 그대로 되돌린다 — 화면은 건드리지 않는다. */
  let printBack = null;

  function preparePrint(root) {
    const blank = (node, yes) => node.classList.toggle("is-blank", !!yes);

    /* 글 칸이 비었으면 그 칸째로 뺀다 */
    root.querySelectorAll(".cpanel").forEach((pane) => {
      const texts = Array.from(pane.querySelectorAll(".ctext"));
      const fields = Array.from(pane.querySelectorAll("input, textarea, select"));
      const hasText = texts.some((t) => t.innerText.trim());
      const hasField = fields.some((f) => (f.value || "").trim());
      const hasImage = pane.querySelector(".czone__item, .img-thumb");
      blank(pane, !hasText && !hasField && !hasImage);
    });

    root.querySelectorAll(".krow").forEach((row) => {
      const word = row.querySelector(".krow__word");
      const count = row.querySelector(".krow__count");
      blank(row, !word.value.trim() && !count.value.trim());
    });

    root.querySelectorAll(".rcard").forEach((card) => {
      const filled = Array.from(card.querySelectorAll("[data-f]")).some((f) => f.value.trim());
      blank(card, !filled);
    });

    root.querySelectorAll(".cspec").forEach((row) => {
      const value = row.querySelector('[data-sf="value"]');
      blank(row, !value || !value.value.trim());
    });

    root.querySelectorAll(".ctext").forEach((node) => blank(node, !node.innerText.trim()));

    /* USP 는 제품 이름 바로 아래에 붙는다. 따로 칸을 차지할 만큼 긴 글이
       아니고, 이름 · 부제와 이어 읽어야 뜻이 산다. */
    const usp = root.querySelector('[data-panel="usp"]');
    const title = root.querySelector(".cboard__title");
    if (usp && title && !printBack) {
      printBack = { node: usp, parent: usp.parentNode, next: usp.nextSibling };
      usp.classList.add("cpanel--inhead");
      title.appendChild(usp);
    }
  }

  function restorePrint(root) {
    root.querySelectorAll(".is-blank").forEach((node) => node.classList.remove("is-blank"));
    if (printBack) {
      printBack.node.classList.remove("cpanel--inhead");
      printBack.parent.insertBefore(printBack.node, printBack.next);
      printBack = null;
    }
  }

  /* ---------- 한 장 짜기 ---------- */

  function boardHtml(product) {
    const c = product.concept;
    const blocks = {};
    CONCEPT_BLOCKS.forEach((b) => {
      blocks[b.key] = panel(b.title, textHtml(b.key, c[b.key], b.hint), "", b.key);
    });

    return (
      '<div class="cboard" data-product="' + product.id + '">' +

      /* 머리 — 왼쪽에 제품 사진, 그 옆에 제품명, 오른쪽에 한 줄 제원.
         사진은 잘라내지 않고 통째로 보여 준다. */
      '<header class="cboard__head">' +
      '<div class="cboard__shot">' +
      UI.photoZone(c.images, { title: product.name }) +
      "</div>" +
      '<div class="cboard__title">' +
      '<p class="cboard__eyebrow">제품 컨셉보드</p>' +
      '<h2 class="cboard__name">' + UI.escapeHtml(product.name) + "</h2>" +
      textHtml("headline", c.headline, "부제 · 슬로건을 적어 보세요", "ctext--lead") +
      "</div>" +
      specsHtml(c.specs) +
      "</header>" +

      '<div class="cboard__grid">' +
      blocks.oneLiner +
      blocks.efficacy +
      blocks.usp +
      blocks.target +

      panel(
        "시장크기",
        '<p class="cpanel__hint">메인 키워드</p>' +
          keywordRows("market.main", c.market.main, "메인 키워드") +
          '<p class="cpanel__hint">경쟁 키워드</p>' +
          keywordRows("market.rivals", c.market.rivals, "경쟁 키워드") +
          textHtml("market.note", c.market.note, "조사 출처 · 해석", "ctext--small"),
        "cpanel--wide",
        "market"
      ) +

      panel("참고제품", rivalRows(product.id), "cpanel--wide", "rivals") +

      panel("상표 가능여부", checkHtml("trademark", c.trademark, "상표 가능여부"), "", "trademark") +
      panel("비포애프터 가능여부", checkHtml("beforeAfter", c.beforeAfter, "비포애프터 가능여부"), "", "beforeAfter") +

      panel(
        "광고소재 예시",
        imageZone("ads.images", c.ads.images, "광고소재 넣기") +
          textHtml("ads.note", c.ads.note, "어떤 장면 · 어떤 카피로 갈지", "ctext--small"),
        "cpanel--full",
        "ads"
      ) +
      "</div>" +
      "</div>"
    );
  }

  /* ---------- 제품 목록 ---------- */

  function listHtml() {
    const products = Store.state.products;
    if (!products.length) {
      return (
        '<div class="empty"><p class="empty__title">아직 진행 중인 제품이 없습니다.</p>' +
        "<p>제품 런칭 상황보드에서 제품을 먼저 추가하세요. 여기에 자동으로 나타납니다.</p></div>"
      );
    }
    const cards = products
      .map((product) => {
        const c = product.concept || {};
        const filled = CONCEPT_BLOCKS.filter((b) => (c[b.key] || {}).text).length;
        const shots = (c.images || []).length;
        return (
          '<article class="card product-card" data-id="' + product.id + '" tabindex="0" role="button" ' +
          'aria-label="' + UI.escapeHtml(product.name) + ' 컨셉보드 열기">' +
          '<header class="card__head">' +
          (UI.efficacyLabel(product.efficacyType)
            ? UI.chip(UI.efficacyLabel(product.efficacyType), "chip--eff")
            : "") +
          (product.category
            ? UI.chip(UI.categoryLabel(product.category), "chip--cat chip--cat-" + UI.escapeHtml(product.category))
            : "") +
          "</header>" +
          '<h3 class="card__title">' + UI.escapeHtml(product.name) + "</h3>" +
          ((c.headline || {}).text
            ? '<p class="product-card__stage">' + UI.escapeHtml(c.headline.text) + "</p>"
            : '<p class="product-card__stage muted">부제가 아직 없습니다</p>') +
          (shots ? UI.thumbsHtml((c.images || []).slice(0, 3), { limit: 3, size: "sm" }) : "") +
          '<p class="product-card__counts">채운 항목 ' + filled + " / " + CONCEPT_BLOCKS.length +
          '<span class="dot" aria-hidden="true">·</span>사진 ' + shots + "장</p>" +
          "</article>"
        );
      })
      .join("");
    return '<div class="card-grid">' + cards + "</div>";
  }

  /* ---------- 렌더 ---------- */

  function render(root) {
    const product = activeId ? Store.getProduct(activeId) : null;
    if (activeId && !product) activeId = null;

    /* 이 제품의 참고제품 보드 — 컨셉보드 안에서 열린다 */
    if (product && mode === "rivals") {
      Competitors.renderEmbedded(root, product.id, () => {
        mode = "board";
        App.render();
      });
      return;
    }

    if (product) {
      const rivalCount = Store.competitorsFor(product.id).length;
      root.innerHTML =
        '<div class="view__head view__head--tight">' +
        "<div>" +
        '<button type="button" class="btn btn--ghost btn--sm" data-act="back">← 전체 제품</button>' +
        "</div>" +
        '<div class="view__actions">' +
        '<button type="button" class="btn btn--ghost" data-act="rivals">🔍 참고제품 보드' +
        (rivalCount ? " (" + rivalCount + ")" : "") + "</button>" +
        '<button type="button" class="btn btn--ghost" data-act="print">인쇄 · PDF</button>' +
        "</div>" +
        "</div>" +
        boardHtml(product);
      bindBoard(root, product);
      return;
    }

    root.innerHTML =
      '<div class="view__head">' +
      "<div>" +
      "<h2>제품 컨셉보드</h2>" +
      '<p class="view__sub">진행 중인 제품을 한 장으로 정리합니다. 제품을 누르면 가로로 펼쳐진 보드가 열리고, 그 자리에서 바로 고칠 수 있습니다.</p>' +
      "</div>" +
      "</div>" +
      listHtml();

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
    UI.bindThumbs(root, (group) => {
      const card = group.closest(".product-card");
      const product = Store.getProduct(card.dataset.id);
      return (product && product.concept && product.concept.images) || [];
    });
  }

  /* ---------- 묶기 ---------- */

  function bindBoard(root, product) {
    root.querySelector('[data-act="back"]').addEventListener("click", () => {
      setActive(null);
      App.render();
    });
    root.querySelector('[data-act="print"]').addEventListener("click", () => {
      preparePrint(root);
      window.print();
      /* afterprint 가 안 오는 브라우저가 있어 한 번 더 되돌린다 */
      setTimeout(() => restorePrint(root), 1000);
    });

    /* Ctrl+P 로 눌러도 같아야 한다 */
    const onBefore = () => preparePrint(root);
    const onAfter = () => restorePrint(root);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    root.querySelector('[data-act="rivals"]').addEventListener("click", () => {
      mode = "rivals";
      App.render();
    });

    bindTexts(root, product);
    bindSpecs(root, product);
    bindKeywords(root, product);
    bindRivals(root, product);
    bindChecks(root, product);
    UI.bindPhotoZone(root, {
      title: product.name,
      list: () => (((Store.getConcept(product.id) || {}).images) || []).slice(),
      save: (list) => {
        Store.setConcept(product.id, "images", list);
        App.render();
      },
    });
    bindImages(root, product);

    Images.hydrate(root);
  }

  function bindTexts(root, product) {
    root.querySelectorAll(".ctext").forEach((node) => {
      const path = node.dataset.path;

      /* 붙여넣기는 글자만 받는다. 남의 서식이 섞여 들어오면 보드가 무너진다. */
      node.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
      });

      node.addEventListener("blur", () => {
        Store.setConcept(product.id, path, { text: node.innerText.replace(/ /g, " ").trim() });
      });
    });
  }

  function bindSpecs(root, product) {
    const wrap = root.querySelector("[data-specs]");
    if (!wrap) return;

    const collect = () =>
      Array.from(wrap.querySelectorAll(".cspec"))
        .map((row) => ({
          label: row.querySelector('[data-sf="label"]').value.trim(),
          value: row.querySelector('[data-sf="value"]').value.trim(),
        }))
        .filter((row) => row.label || row.value);

    const save = () => Store.setConcept(product.id, "specs", collect());

    wrap.addEventListener("change", save);
    wrap.addEventListener("click", (event) => {
      if (event.target.matches("[data-spec-add]")) {
        wrap
          .querySelector("[data-spec-add]")
          .insertAdjacentHTML("beforebegin", specRow({ label: "", value: "" }, 0));
        wrap.querySelector(".cspec:last-of-type [data-sf=\"label\"]").focus();
      }
      if (event.target.matches("[data-spec-remove]")) {
        event.target.closest(".cspec").remove();
        save();
      }
    });
  }

  function bindKeywords(root, product) {
    root.querySelectorAll("[data-keywords]").forEach((wrap) => {
      const path = wrap.dataset.keywords;
      const hint = wrap.dataset.hint || "키워드";

      const trendOf = (row) => {
        try {
          return JSON.parse(row.dataset.trend || "[]");
        } catch (e) {
          return [];
        }
      };

      const collect = () =>
        Array.from(wrap.querySelectorAll(".krow"))
          .map((row) => {
            const out = {
              keyword: row.querySelector(".krow__word").value.trim(),
              count: row.querySelector(".krow__count").value.trim(),
            };
            const trend = trendOf(row);
            if (trend.length) out.trend = trend;
            return out;
          })
          .filter((row) => row.keyword || row.count);

      const save = () => Store.setConcept(product.id, path, collect());

      /* 검색량을 물어보고 칸을 채운다. 사람이 손으로 적어 둔 숫자는 덮지
         않는다 — 🔄 를 눌렀을 때만 덮어쓴다. */
      function look(row, overwrite) {
        const word = row.querySelector(".krow__word").value.trim();
        const count = row.querySelector(".krow__count");
        const trend = row.querySelector("[data-krow-trend]");
        if (!word) return;
        if (count.value.trim() && !overwrite) return;

        row.classList.add("krow--busy");
        trend.textContent = "검색량 가져오는 중…";
        Meta.fetchKeyword(App.proxyUrl(), word, TREND_MONTHS).then(
          (data) => {
            row.classList.remove("krow--busy");
            if (data.total != null) count.value = String(data.total);
            /* 가져온 추이가 없으면 손으로 적어 둔 값을 그대로 둔다.
               빈손으로 돌아왔다고 사람이 적은 걸 지우면 안 된다. */
            const had = trendOf(row);
            const fetched = data.trend || [];
            const keep = fetched.length ? fetched : had;
            row.dataset.trend = keep.length ? JSON.stringify(keep) : "";
            trend.innerHTML = sparkline(keep);

            /* 막대가 왜 안 나오는지 말해 주지 않으면, 눌러 놓고 고장인 줄
               안다. 직접 누른 때만 알린다 — 줄마다 뜨면 잔소리가 된다. */
            const notes = [];
            if (data.note) notes.push(data.note);
            if (overwrite && data.total == null) {
              notes.push("검색광고에 이 키워드 기록이 없습니다.");
            }
            if (overwrite && !fetched.length && !had.length) {
              notes.push("월별 추이는 검색광고가 주지 않습니다. 막대를 눌러 직접 적어 넣으세요.");
            }
            if (notes.length) {
              trend.insertAdjacentHTML(
                "beforeend",
                '<span class="spark__cap">' + UI.escapeHtml(notes.join(" ")) + "</span>"
              );
            }
            save();
          },
          (error) => {
            row.classList.remove("krow--busy");
            trend.innerHTML = '<span class="spark__cap">' + UI.escapeHtml(error.message) + "</span>";
          }
        );
      }

      /* 월별 검색량을 손으로 적는 창.

         검색광고는 지난 한 달 숫자만 준다. 여러 달치는 API 로 오지 않는다.
         그래서 화면에서 보고 옮겨 적을 길을 연다. 첫 칸에 숫자 열두 개를
         한꺼번에 붙여넣으면 알아서 나눠 담는다 — 표에서 세로로 복사해 오면
         줄바꿈으로 붙는다. */
      function openTrend(row) {
        const word = row.querySelector(".krow__word").value.trim() || "이 키워드";
        const saved = trendOf(row);
        const keys = monthKeys(TREND_MONTHS);
        const byPeriod = {};
        saved.forEach((p) => {
          byPeriod[p.period] = p.count;
        });

        const cells = keys
          .map(
            (key, i) =>
              '<label class="tmonth"><span>' + key + "</span>" +
              '<input type="text" class="input" inputmode="numeric" data-tm="' + i +
              '" value="' + UI.escapeHtml(byPeriod[key] != null ? String(byPeriod[key]) : "") +
              '" aria-label="' + key + " 검색량\"></label>"
          )
          .join("");

        const node = UI.openModal(
          word + " — 월별 검색량",
          '<p class="settings__note">네이버 검색광고나 블랙키위 화면에서 본 월별 숫자를 옮겨 적으세요. ' +
            "PC와 모바일을 더한 값입니다. 첫 칸에 숫자 여러 개를 한꺼번에 붙여넣으면 아래로 자동으로 채워집니다. " +
            "오래된 달이 왼쪽 위입니다.</p>" +
            '<div class="tmonths">' + cells + "</div>",
          '<button type="button" class="btn btn--ghost" data-trend-clear>비우기</button>' +
            '<button type="button" class="btn btn--ghost" data-close>닫기</button>' +
            '<button type="button" class="btn btn--primary" data-trend-save>저장</button>'
        );
        if (!node) return;

        const boxes = Array.from(node.querySelectorAll("[data-tm]"));
        boxes[0].focus();

        /* 표에서 세로로 복사해 온 숫자 뭉치를 나눠 담는다. */
        node.addEventListener("paste", (event) => {
          const from = boxes.indexOf(event.target);
          if (from < 0) return;
          const text = (event.clipboardData || window.clipboardData).getData("text/plain") || "";
          const numbers = splitNumbers(text);
          if (numbers.length < 2) return;
          event.preventDefault();
          numbers.forEach((value, i) => {
            if (boxes[from + i]) boxes[from + i].value = value;
          });
        });

        node.querySelector("[data-trend-clear]").addEventListener("click", () => {
          boxes.forEach((box) => (box.value = ""));
        });

        node.querySelector("[data-trend-save]").addEventListener("click", () => {
          const counts = boxes.map((box) => Number(box.value.replace(/[^0-9]/g, "")) || 0);
          const made = counts.some((c) => c > 0) ? trendFromCounts(counts) : [];
          row.dataset.trend = made.length ? JSON.stringify(made) : "";
          row.querySelector("[data-krow-trend]").innerHTML = sparkline(made);
          save();
          UI.closeModal();
        });
      }

      wrap.addEventListener("change", (event) => {
        const row = event.target.closest(".krow");
        if (row && event.target.matches(".krow__word")) look(row, false);
        save();
      });

      wrap.addEventListener("click", (event) => {
        if (event.target.matches("[data-krow-add]")) {
          wrap
            .querySelector("[data-krow-add]")
            .insertAdjacentHTML("beforebegin", keywordRow({ keyword: "", count: "" }, -1, hint));
          return;
        }
        if (event.target.matches("[data-krow-look]")) {
          look(event.target.closest(".krow"), true);
          return;
        }
        const trendBtn = event.target.closest("[data-krow-trend]");
        if (trendBtn) {
          openTrend(trendBtn.closest(".krow"));
          return;
        }
        if (event.target.matches("[data-krow-remove]")) {
          event.target.closest(".krow").remove();
          save();
        }
      });
    });
  }

  function bindRivals(root, product) {
    const wrap = root.querySelector("[data-rivals]");
    if (!wrap) return;

    /* 참고보드의 어느 칸에 담기는지 그대로 쓴다. 이름만 달리 부르면 같은 값을
       두 군데 들고 있게 된다. */
    const NOTE_FIELDS = [
      { key: "claims", label: "USP · 차별점", hint: "이 제품이 내세우는 한 가지" },
      { key: "ingredients", label: "주요 성분", hint: "성분명과 함량" },
      { key: "video", label: "참고 영상", hint: "링크와, 어떤 장면이 쓸 만했는지" },
    ];

    const idOf = (card) => card.dataset.cid;
    const recordOf = (card) => Store.state.competitors.find((c) => c.id === idOf(card));
    const field = (card, name) => card.querySelector('[data-f="' + name + '"]');

    const saveCard = (card) => {
      const patch = {};
      card.querySelectorAll("[data-f]").forEach((f) => (patch[f.dataset.f] = f.value.trim()));
      Store.updateCompetitor(idOf(card), patch);
    };

    function paintShot(card) {
      const record = recordOf(card);
      const open = card.querySelector(".rcard__open");
      const old = open.querySelector("img, .rcard__blank");
      if (old) old.remove();
      open.insertAdjacentHTML("afterbegin", rivalShot(record || {}));
      Images.hydrate(card);
    }

    function paintMark(card) {
      const record = recordOf(card) || {};
      const any = NOTE_FIELDS.some((f) => String(record[f.key] || "").trim());
      card.querySelector(".rcard__mark").classList.toggle("rcard__mark--on", any);
    }

    /* 링크를 넣으면 썸네일은 알아서 가져온다. 버튼을 따로 누르게 하면
       비어 있는 카드만 남는다. 막힌 사이트면 왜 안 됐는지 알려 준다. */
    function grabShot(card) {
      const url = UI.safeUrl(field(card, "url").value);
      const msg = card.querySelector("[data-rcard-msg]");
      if (!url) return;
      msg.textContent = "썸네일 가져오는 중…";
      Meta.fetchMeta(App.proxyUrl(), url).then(
        (data) => {
          const brand = field(card, "brand");
          const name = field(card, "name");
          if (!brand.value.trim() && data.siteName) brand.value = data.siteName;
          if (!name.value.trim() && data.title) name.value = data.title;
          saveCard(card);
          if (data.image) {
            Store.updateCompetitor(idOf(card), {
              images: [{ id: "url" + Date.now().toString(36), url: data.image }],
            });
            paintShot(card);
            msg.textContent = "";
          } else {
            msg.textContent = "이 페이지에는 대표 이미지가 없습니다. 참고제품 보드에서 직접 넣을 수 있습니다.";
          }
        },
        (error) => {
          /* 네이버 스마트스토어처럼 자동 접근을 막는 곳이 있다. */
          msg.textContent = error.message;
        }
      );
    }

    /* 썸네일을 누르면 열리는 칸. 적는 칸과 함께 사진도 여기서 넣는다 —
       카드에는 사진을 갈아 끼울 자리가 없다. */
    function openNotes(card) {
      const record = recordOf(card);
      if (!record) return;
      const title = [record.brand, record.name].filter(Boolean).join(" ") || "참고제품";
      const body = NOTE_FIELDS.map((f) => {
        const id = "rnote_" + f.key;
        return (
          '<div class="field field--wide">' +
          '<label for="' + id + '">' + UI.escapeHtml(f.label) + "</label>" +
          '<textarea id="' + id + '" rows="4" data-note="' + f.key + '" placeholder="' +
          UI.escapeHtml(f.hint) + '">' + UI.escapeHtml(record[f.key] || "") + "</textarea>" +
          "</div>"
        );
      }).join("");
      const shots =
        '<div class="field field--wide">' +
        "<label>썸네일 · 이미지</label>" +
        UI.imagesControl(record.images || []) +
        "</div>";
      const node = UI.openModal(
        title,
        '<div class="form-grid">' + body + shots + "</div>",
        '<button type="button" class="btn btn--ghost" data-close>닫기</button>' +
          '<button type="button" class="btn btn--primary" data-note-save>저장</button>'
      );
      if (!node) return;
      UI.bindImages(node);
      node.querySelector("[data-note-save]").addEventListener("click", () => {
        const patch = { images: UI.collectImages(node) };
        NOTE_FIELDS.forEach((f) => {
          patch[f.key] = node.querySelector('[data-note="' + f.key + '"]').value.trim();
        });
        Store.updateCompetitor(idOf(card), patch);
        paintMark(card);
        paintShot(card);
        UI.closeModal();
        UI.toast("저장했습니다. 참고제품 보드에서도 보입니다.");
      });
    }

    wrap.addEventListener("change", (event) => {
      const card = event.target.closest(".rcard");
      if (!card || !card.dataset.cid) return;
      const record = recordOf(card);
      const needShot = !((record && record.images) || []).length;
      saveCard(card);
      /* 링크를 새로 넣었고 아직 썸네일이 없으면 그때 가져온다. */
      if (event.target.matches('[data-f="url"]') && needShot) grabShot(card);
    });

    wrap.addEventListener("click", (event) => {
      if (event.target.closest("[data-rcard-add]")) {
        const made = Store.addCompetitor({
          productId: product.id,
          brand: "",
          name: "",
          url: "",
          images: [],
        });
        App.render();
        const fresh = document.querySelector('.rcard[data-cid="' + made.id + '"] [data-f="brand"]');
        if (fresh) fresh.focus();
        return;
      }

      if (event.target.matches("[data-rcard-remove]")) {
        const card = event.target.closest(".rcard");
        UI.confirmAction("이 참고제품을 지웁니다. 참고제품 보드에서도 없어집니다.", () => {
          Store.removeCompetitor(idOf(card));
          App.render();
        }, "지우기");
        return;
      }

      const open = event.target.closest("[data-rcard-open]");
      if (open) openNotes(open.closest(".rcard"));
    });
  }

  function bindChecks(root, product) {
    root.querySelectorAll("[data-check]").forEach((select) => {
      select.addEventListener("change", () => {
        Store.setConcept(product.id, select.dataset.check, { state: select.value });
        const dot = select.parentElement.querySelector(".ccheck__dot");
        if (dot) dot.className = "ccheck__dot ccheck__dot--" + (select.value || "none");
      });
    });
  }

  function bindImages(root, product) {
    root.querySelectorAll("[data-images]").forEach((zone) => {
      const path = zone.dataset.images;
      const grid = zone.querySelector(".czone__grid");
      const label = (zone.querySelector("[data-image-add]").textContent || "이미지 넣기")
        .replace("＋", "")
        .trim();

      const current = () =>
        Array.from(grid.querySelectorAll(".czone__item")).map((item) => ({
          id: item.dataset.imageId || "",
          url: item.dataset.imageUrl || "",
        }));

      /* 넣은 것을 기록에 붙인다. 창은 그대로 두어 여러 장을 이어서 붙여넣을
         수 있게 한다. */
      function append(entries) {
        const saved = Store.getConcept(product.id);
        const list = (path === "images" ? saved.images : saved.ads.images).slice();
        entries.forEach((entry) => list.push(entry));
        Store.setConcept(product.id, path, list);
        App.render();
      }

      function takeFiles(files) {
        if (!files.length) return "";
        Promise.all(files.map((file) => Images.addFile(file).then((s) => s, () => null))).then(
          (results) => {
            const made = results.filter(Boolean).map((r) => ({ id: r.id, url: "" }));
            if (made.length) append(made);
            const msg = document.querySelector("[data-ipick-msg]");
            const failed = results.length - made.length;
            if (msg) {
              msg.textContent =
                made.length + "장 담았습니다." + (failed ? " " + failed + "장은 실패했습니다." : "");
            }
          }
        );
        return files.length + "장 줄이는 중…";
      }

      function takeUrl(safe) {
        append([{ id: "url" + Date.now().toString(36), url: safe }]);
        return "주소를 넣었습니다.";
      }

      /* 버튼을 누르면 파일 고르는 창이 아니라 우리 창이 뜬다. 거기서 Ctrl+V
         로 붙여넣는다. 파일 창이 먼저 뜨면 초점을 뺏겨 붙여넣기가 안 된다. */
      zone.querySelector("[data-image-add]").addEventListener("click", () => {
        UI.openImagePicker({ title: label, onFiles: takeFiles, onUrl: takeUrl });
      });

      grid.addEventListener("click", (event) => {
        const item = event.target.closest(".czone__item");
        if (!item) return;
        const index = Number(item.dataset.imageIndex);

        /* 사진을 누르면 크게 뜨고, 거기서 내려받을 수 있다 */
        if (event.target.closest("[data-image-zoom]")) {
          const c = Store.getConcept(product.id);
          const list = path === "images" ? c.images : c.ads.images;
          if (list[index]) UI.openImage(list[index], { title: product.name, name: product.name });
          return;
        }
        if (!event.target.matches("[data-image-remove]")) return;
        const saved = Store.getConcept(product.id);
        const list = (path === "images" ? saved.images : saved.ads.images).slice();
        list.splice(index, 1);
        Store.setConcept(product.id, path, list);
        App.render();
      });

      void current;
    });
  }

  function showRivals() {
    mode = "rivals";
  }

  return { render, setActive, getActive, showRivals };
})();
