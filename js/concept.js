/* ============================================================
   제품 컨셉보드

   제품 하나를 가로로 긴 한 장에 펼쳐 놓고, 그 자리에서 바로 고친다.
   글을 누르면 커서가 잡힌다. 글꼴과 크기는 고르게 하지 않는다 — 칸마다
   정해진 크기로 두어야 한 장짜리 문서로 읽힌다.
   ============================================================ */

const Concept = (() => {
  let activeId = null;
  /* "list" 제품 고르기 · "board" 컨셉보드 · "rivals" 그 제품의 경쟁제품 참고보드 */
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

  /* 7. 경쟁제품 — 썸네일이 붙은 작은 카드. 줄로 길게 늘어놓으면 가로가
     쓸데없이 길어지고, 정작 어떤 제품인지는 눈에 안 들어온다. */
  function rivalCard(row, index) {
    const link = UI.safeUrl(row.url);
    const shot = UI.safeUrl(row.image);
    return (
      '<div class="rcard" data-rcard="' + index + '">' +
      '<div class="rcard__shot">' +
      (shot
        ? '<img src="' + UI.escapeHtml(shot) + '" alt="" loading="lazy">'
        : '<span class="rcard__blank" aria-hidden="true">🔍</span>') +
      '<button type="button" class="img-thumb__x" data-rcard-remove aria-label="이 경쟁제품 삭제">✕</button>' +
      "</div>" +
      '<input type="text" class="input rcard__f" data-f="brand" value="' +
      UI.escapeHtml(row.brand || "") + '" placeholder="브랜드" aria-label="브랜드">' +
      '<input type="text" class="input rcard__f" data-f="name" value="' +
      UI.escapeHtml(row.name || "") + '" placeholder="제품명" aria-label="제품명">' +
      '<input type="url" class="input rcard__f" data-f="url" value="' +
      UI.escapeHtml(row.url || "") + '" placeholder="상세페이지 링크" aria-label="링크">' +
      /* 네이버처럼 자동 접근을 막는 곳은 '가져오기' 가 통하지 않는다.
         그럴 때 이미지 주소를 직접 붙여넣을 길을 열어 둔다. */
      '<input type="url" class="input rcard__f" data-f="image" value="' +
      UI.escapeHtml(row.image || "") + '" placeholder="이미지 주소 (직접 넣기)" aria-label="이미지 주소">' +
      '<div class="rcard__row">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-rcard-fetch>썸네일 가져오기</button>' +
      (link
        ? '<a class="btn btn--ghost btn--sm" href="' + UI.escapeHtml(link) +
          '" target="_blank" rel="noopener noreferrer">열기</a>'
        : "") +
      "</div>" +
      '<p class="rcard__msg" data-rcard-msg></p>' +
      "</div>"
    );
  }

  function rivalRows(rows) {
    const list = (rows.length ? rows : [{ brand: "", name: "", url: "", image: "" }])
      .map(rivalCard)
      .join("");
    return (
      '<div class="rcards" data-rivals>' +
      list +
      '<button type="button" class="rcard rcard--add" data-rcard-add>' +
      "<span>＋</span>경쟁제품 추가</button>" +
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

      /* 머리 — 왼쪽에 제품 사진, 그 옆에 제품명, 오른쪽에 한 줄 제원.
         사진은 잘라내지 않고 통째로 보여 준다. */
      '<header class="cboard__head">' +
      '<div class="cboard__shot">' + imageZone("images", c.images, "제품 이미지 넣기") + "</div>" +
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

    /* 이 제품의 경쟁제품 참고보드 — 컨셉보드 안에서 열린다 */
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
        '<button type="button" class="btn btn--ghost" data-act="rivals">🔍 경쟁제품 참고보드' +
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
    root.querySelector('[data-act="print"]').addEventListener("click", () => window.print());
    root.querySelector('[data-act="rivals"]').addEventListener("click", () => {
      mode = "rivals";
      App.render();
    });

    bindTexts(root, product);
    bindSpecs(root, product);
    bindKeywords(root, product);
    bindRivals(root, product);
    bindChecks(root, product);
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
      Array.from(wrap.querySelectorAll(".rcard:not(.rcard--add)"))
        .map((card) => {
          const out = {};
          card.querySelectorAll("[data-f]").forEach((f) => (out[f.dataset.f] = f.value.trim()));
          return out;
        })
        .filter((row) => row.brand || row.name || row.url || row.image);

    const save = () => Store.setConcept(product.id, "rivals", collect());

    /* 이미지 주소를 손으로 고치면 위쪽 썸네일도 따라 바뀌어야 한다. */
    function paintShot(card) {
      const value = UI.safeUrl(card.querySelector('[data-f="image"]').value);
      const shot = card.querySelector(".rcard__shot");
      const old = shot.querySelector("img, .rcard__blank");
      if (old) old.remove();
      shot.insertAdjacentHTML(
        "afterbegin",
        value
          ? '<img src="' + UI.escapeHtml(value) + '" alt="" loading="lazy">'
          : '<span class="rcard__blank" aria-hidden="true">🔍</span>'
      );
    }

    wrap.addEventListener("change", (event) => {
      if (event.target.matches('[data-f="image"]')) paintShot(event.target.closest(".rcard"));
      save();
    });

    wrap.addEventListener("click", (event) => {
      if (event.target.closest("[data-rcard-add]")) {
        wrap
          .querySelector("[data-rcard-add]")
          .insertAdjacentHTML("beforebegin", rivalCard({ brand: "", name: "", url: "", image: "" }, -1));
        return;
      }

      if (event.target.matches("[data-rcard-remove]")) {
        event.target.closest(".rcard").remove();
        save();
        return;
      }

      if (event.target.matches("[data-rcard-fetch]")) {
        const card = event.target.closest(".rcard");
        const msg = card.querySelector("[data-rcard-msg]");
        const url = UI.safeUrl(card.querySelector('[data-f="url"]').value);
        if (!url) {
          msg.textContent = "먼저 상세페이지 링크를 넣어 주세요.";
          return;
        }
        event.target.disabled = true;
        msg.textContent = "가져오는 중…";
        Meta.fetchMeta(App.proxyUrl(), url).then(
          (data) => {
            event.target.disabled = false;
            const brand = card.querySelector('[data-f="brand"]');
            const name = card.querySelector('[data-f="name"]');
            if (!brand.value.trim() && data.siteName) brand.value = data.siteName;
            if (!name.value.trim() && data.title) name.value = data.title;
            if (data.image) {
              card.querySelector('[data-f="image"]').value = data.image;
              paintShot(card);
              msg.textContent = "가져왔습니다. 값이 맞는지 확인해 주세요.";
            } else {
              msg.textContent = "이 페이지에는 대표 이미지가 없습니다. 아래 칸에 직접 넣어 주세요.";
            }
            save();
          },
          (error) => {
            event.target.disabled = false;
            /* 네이버 스마트스토어처럼 자동 접근을 막는 곳이 있다. 왜 안 되는지
               알려 주고, 손으로 넣는 길을 바로 안내한다. */
            msg.textContent =
              error.message +
              " 이 사이트가 막고 있다면, 상세페이지에서 사진을 우클릭 → '이미지 주소 복사' 해서 아래 칸에 넣으세요.";
          }
        );
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

  function showRivals() {
    mode = "rivals";
  }

  return { render, setActive, getActive, showRivals };
})();
