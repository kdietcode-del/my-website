/* ============================================================
   제품 컨셉보드

   제품 하나를 가로로 긴 한 장에 펼쳐 놓고, 그 자리에서 바로 고친다.
   글을 누르면 커서가 잡히고, 위쪽 막대에서 글꼴과 크기를 고를 수 있다.
   서식은 글자 단위가 아니라 '덩어리' 단위로 붙는다 — 그래야 나중에 봐도
   뒤죽박죽이 되지 않는다.
   ============================================================ */

const Concept = (() => {
  let activeId = null;
  let focused = null; // 지금 커서가 있는 글 덩어리

  function setActive(id) {
    activeId = id || null;
    focused = null;
  }

  function getActive() {
    return activeId;
  }

  /* ---------- 글 덩어리 ---------- */

  function fontCss(key) {
    const found = CONCEPT_FONTS.find((f) => f.key === key);
    return (found || CONCEPT_FONTS[0]).css;
  }

  function textStyle(part) {
    return "font-family:" + fontCss(part.font) + ";font-size:" + (Number(part.size) || 16) + "px";
  }

  function textHtml(path, part, placeholder, extraClass) {
    return (
      '<div class="ctext' + (extraClass ? " " + extraClass : "") + '" contenteditable="true" ' +
      'data-path="' + path + '" style="' + textStyle(part) + '" ' +
      'data-placeholder="' + UI.escapeHtml(placeholder) + '" role="textbox" aria-label="' +
      UI.escapeHtml(placeholder) + '">' +
      UI.escapeHtml(part.text || "") +
      "</div>"
    );
  }

  /* ---------- 위쪽 서식 막대 ---------- */

  function toolbarHtml() {
    const fonts = CONCEPT_FONTS.map(
      (f) => '<option value="' + f.key + '">' + UI.escapeHtml(f.label) + "</option>"
    ).join("");
    const sizes = CONCEPT_SIZES.map((s) => '<option value="' + s + '">' + s + "</option>").join("");
    return (
      '<div class="ctools" id="ctools">' +
      '<span class="ctools__label" id="ctools-target">글을 누르면 여기서 글꼴을 바꿀 수 있습니다</span>' +
      '<select class="select" id="ctools-font" disabled aria-label="글꼴">' + fonts + "</select>" +
      '<select class="select" id="ctools-size" disabled aria-label="글자 크기">' + sizes + "</select>" +
      "</div>"
    );
  }

  /* ---------- 칸들 ---------- */

  function panel(title, inner, extraClass) {
    return (
      '<section class="cpanel' + (extraClass ? " " + extraClass : "") + '">' +
      '<h3 class="cpanel__title">' + UI.escapeHtml(title) + "</h3>" +
      '<div class="cpanel__body">' + inner + "</div>" +
      "</section>"
    );
  }

  /* 5. 시장크기 — 키워드와 검색량을 줄로 쌓는다 */
  function keywordRows(path, rows, placeholder) {
    const list = (rows.length ? rows : [{ keyword: "", count: "" }])
      .map(
        (row, index) =>
          '<div class="krow" data-krow="' + index + '">' +
          '<input type="text" class="input krow__word" value="' + UI.escapeHtml(row.keyword || "") +
          '" placeholder="' + UI.escapeHtml(placeholder) + '" aria-label="키워드">' +
          '<input type="text" class="input krow__count" value="' + UI.escapeHtml(row.count || "") +
          '" placeholder="검색량" aria-label="검색량" inputmode="numeric">' +
          '<button type="button" class="icon-btn" data-krow-remove aria-label="이 줄 삭제">✕</button>' +
          "</div>"
      )
      .join("");
    return (
      '<div class="krows" data-keywords="' + path + '">' +
      list +
      '<button type="button" class="btn btn--ghost btn--sm" data-krow-add>+ 키워드 추가</button>' +
      "</div>"
    );
  }

  /* 7. 경쟁제품 — 브랜드 · 제품명 · 링크 */
  function rivalRows(rows) {
    const list = (rows.length ? rows : [{ brand: "", name: "", url: "" }])
      .map(
        (row, index) =>
          '<div class="rrow" data-rrow="' + index + '">' +
          '<input type="text" class="input" data-f="brand" value="' + UI.escapeHtml(row.brand || "") +
          '" placeholder="브랜드" aria-label="브랜드">' +
          '<input type="text" class="input" data-f="name" value="' + UI.escapeHtml(row.name || "") +
          '" placeholder="제품명" aria-label="제품명">' +
          '<input type="url" class="input" data-f="url" value="' + UI.escapeHtml(row.url || "") +
          '" placeholder="https://" aria-label="링크">' +
          (UI.safeUrl(row.url)
            ? '<a class="btn btn--sm btn--ghost" href="' + UI.escapeHtml(UI.safeUrl(row.url)) +
              '" target="_blank" rel="noopener noreferrer">열기</a>'
            : "") +
          '<button type="button" class="icon-btn" data-rrow-remove aria-label="이 줄 삭제">✕</button>' +
          "</div>"
      )
      .join("");
    return (
      '<div class="rrows" data-rivals>' +
      list +
      '<button type="button" class="btn btn--ghost btn--sm" data-rrow-add>+ 경쟁제품 추가</button>' +
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

  /* 이미지 구역 */
  function imageZone(path, images, label) {
    const thumbs = images
      .map(
        (image, index) =>
          '<div class="czone__item" data-image-index="' + index + '">' +
          (image.url
            ? '<img src="' + UI.escapeHtml(UI.safeUrl(image.url)) + '" alt="" loading="lazy">'
            : '<img data-img-id="' + UI.escapeHtml(image.id) + '" alt="" loading="lazy">') +
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
      '<input type="file" accept="image/*" multiple hidden data-image-file>' +
      "</div>"
    );
  }

  /* ---------- 한 장 짜기 ---------- */

  function boardHtml(product) {
    const c = product.concept;
    const blocks = {};
    CONCEPT_BLOCKS.forEach((b) => {
      blocks[b.key] = panel(b.title, textHtml(b.key, c[b.key], b.hint));
    });

    return (
      '<div class="cboard" data-product="' + product.id + '">' +

      /* 머리 — 제품명과 한 줄 컨셉, 오른쪽에 제품 사진 */
      '<header class="cboard__head">' +
      '<div class="cboard__title">' +
      '<p class="cboard__eyebrow">제품 컨셉보드</p>' +
      '<h2 class="cboard__name">' + UI.escapeHtml(product.name) + "</h2>" +
      textHtml("headline", c.headline, "부제 · 슬로건을 적어 보세요", "ctext--lead") +
      "</div>" +
      '<div class="cboard__shot">' + imageZone("images", c.images, "제품 이미지 넣기") + "</div>" +
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
        "cpanel--wide"
      ) +

      panel("경쟁제품", rivalRows(c.rivals), "cpanel--wide") +

      panel("상표 가능여부", checkHtml("trademark", c.trademark, "상표 가능여부")) +
      panel("비포애프터 가능여부", checkHtml("beforeAfter", c.beforeAfter, "비포애프터 가능여부")) +

      panel(
        "광고소재 예시",
        imageZone("ads.images", c.ads.images, "광고소재 넣기") +
          textHtml("ads.note", c.ads.note, "어떤 장면 · 어떤 카피로 갈지", "ctext--small"),
        "cpanel--full"
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

    if (product) {
      root.innerHTML =
        '<div class="view__head view__head--tight">' +
        "<div>" +
        '<button type="button" class="btn btn--ghost btn--sm" data-act="back">← 전체 제품</button>' +
        "</div>" +
        '<div class="view__actions">' +
        '<button type="button" class="btn btn--ghost" data-act="print">인쇄 · PDF</button>' +
        "</div>" +
        "</div>" +
        toolbarHtml() +
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
    root.querySelector('[data-act="print"]').addEventListener("click", () => window.print());

    bindToolbar(root, product);
    bindTexts(root, product);
    bindKeywords(root, product);
    bindRivals(root, product);
    bindChecks(root, product);
    bindImages(root, product);

    Images.hydrate(root);
  }

  function bindToolbar(root, product) {
    const fontSelect = root.querySelector("#ctools-font");
    const sizeSelect = root.querySelector("#ctools-size");
    const label = root.querySelector("#ctools-target");

    function apply() {
      if (!focused) return;
      const path = focused.dataset.path;
      const font = fontSelect.value;
      const size = Number(sizeSelect.value);
      focused.style.fontFamily = fontCss(font);
      focused.style.fontSize = size + "px";
      Store.setConcept(product.id, path, { font, size });
    }

    fontSelect.addEventListener("change", apply);
    sizeSelect.addEventListener("change", apply);

    root.addEventListener("focusin", (event) => {
      const node = event.target.closest(".ctext");
      if (!node) return;
      focused = node;
      const part = Store.getConcept(product.id);
      fontSelect.disabled = false;
      sizeSelect.disabled = false;
      /* 지금 덩어리에 붙어 있는 값을 막대에 비춰 준다. */
      const size = Math.round(parseFloat(getComputedStyle(node).fontSize));
      const family = node.style.fontFamily;
      const font = CONCEPT_FONTS.find((f) => f.css === family);
      fontSelect.value = font ? font.key : "sans";
      sizeSelect.value = CONCEPT_SIZES.reduce(
        (best, s) => (Math.abs(s - size) < Math.abs(best - size) ? s : best),
        CONCEPT_SIZES[0]
      );
      label.textContent = (node.dataset.placeholder || "글") + " 서식";
      void part;
    });
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

  function bindKeywords(root, product) {
    root.querySelectorAll("[data-keywords]").forEach((wrap) => {
      const path = wrap.dataset.keywords;

      const collect = () =>
        Array.from(wrap.querySelectorAll(".krow"))
          .map((row) => ({
            keyword: row.querySelector(".krow__word").value.trim(),
            count: row.querySelector(".krow__count").value.trim(),
          }))
          .filter((row) => row.keyword || row.count);

      const save = () => Store.setConcept(product.id, path, collect());

      wrap.addEventListener("change", save);
      wrap.addEventListener("click", (event) => {
        if (event.target.matches("[data-krow-add]")) {
          wrap
            .querySelector("[data-krow-add]")
            .insertAdjacentHTML(
              "beforebegin",
              '<div class="krow"><input type="text" class="input krow__word" placeholder="키워드" aria-label="키워드">' +
                '<input type="text" class="input krow__count" placeholder="검색량" aria-label="검색량" inputmode="numeric">' +
                '<button type="button" class="icon-btn" data-krow-remove aria-label="이 줄 삭제">✕</button></div>'
            );
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

    const collect = () =>
      Array.from(wrap.querySelectorAll(".rrow"))
        .map((row) => {
          const out = {};
          row.querySelectorAll("[data-f]").forEach((f) => (out[f.dataset.f] = f.value.trim()));
          return out;
        })
        .filter((row) => row.brand || row.name || row.url);

    wrap.addEventListener("change", () => Store.setConcept(product.id, "rivals", collect()));
    wrap.addEventListener("click", (event) => {
      if (event.target.matches("[data-rrow-add]")) {
        wrap
          .querySelector("[data-rrow-add]")
          .insertAdjacentHTML(
            "beforebegin",
            '<div class="rrow">' +
              '<input type="text" class="input" data-f="brand" placeholder="브랜드" aria-label="브랜드">' +
              '<input type="text" class="input" data-f="name" placeholder="제품명" aria-label="제품명">' +
              '<input type="url" class="input" data-f="url" placeholder="https://" aria-label="링크">' +
              '<button type="button" class="icon-btn" data-rrow-remove aria-label="이 줄 삭제">✕</button></div>'
          );
      }
      if (event.target.matches("[data-rrow-remove]")) {
        event.target.closest(".rrow").remove();
        Store.setConcept(product.id, "rivals", collect());
      }
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
      const fileInput = zone.querySelector("[data-image-file]");

      const current = () =>
        Array.from(grid.querySelectorAll(".czone__item")).map((item) => ({
          id: item.dataset.imageId || "",
          url: item.dataset.imageUrl || "",
        }));

      zone.querySelector("[data-image-add]").addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files || []);
        fileInput.value = "";
        if (!files.length) return;
        UI.toast(files.length + "장 넣는 중…");
        Promise.all(files.map((file) => Images.addFile(file).then((s) => s, () => null))).then(
          (results) => {
            const saved = Store.getConcept(product.id);
            const list = path === "images" ? saved.images.slice() : saved.ads.images.slice();
            results.forEach((r) => {
              if (r) list.push({ id: r.id, url: "" });
            });
            Store.setConcept(product.id, path, list);
            App.render();
          }
        );
      });

      grid.addEventListener("click", (event) => {
        if (!event.target.matches("[data-image-remove]")) return;
        const item = event.target.closest(".czone__item");
        const index = Number(item.dataset.imageIndex);
        const saved = Store.getConcept(product.id);
        const list = (path === "images" ? saved.images : saved.ads.images).slice();
        list.splice(index, 1);
        Store.setConcept(product.id, path, list);
        App.render();
      });

      void current;
    });
  }

  return { render, setActive, getActive };
})();
