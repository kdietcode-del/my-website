/* ============================================================
   타사 레퍼런스 — 보고 모으는 판

   다른 브랜드의 상세페이지, 광고 영상, 패키지 사진을 그냥 쭉 늘어놓고
   눈으로 훑는 자리다. 분류도 점수도 없다 — 거기까지 할 것은 참고제품
   보드에 적는다. 여기는 "이거 괜찮네" 하고 던져 두는 곳이다.

   한 칸에 들어가는 것은 셋 중 하나다.

     image  그림 한 장        붙여넣기 · 파일 · 이미지 주소
     video  영상 파일         첫 장면을 따로 떠서 격자에 보여 준다
     link   남의 페이지 주소  그 페이지 대표 그림을 받아 와 보여 준다

   어느 쪽이든 격자에 보이는 그림은 항상 한 군데(image) 에 둔다. 종류마다
   다른 자리를 보게 하면 화면을 그릴 때마다 종류를 따져야 한다.
   ============================================================ */

const Refs = (() => {
  const esc = (value) => UI.escapeHtml(value);

  /* 영상에서 뜬 장면은 격자에 들어갈 그림이라 크게 뜰 일이 없다. */
  const POSTER_SIDE = 900;
  const POSTER_WAIT_MS = 8000;

  /* ---------- 작은 도우미 ---------- */

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  /* 격자와 크게 보기가 같은 그림을 쓴다. 브라우저에 담아 둔 것은 나중에
     Images.hydrate 가 채우므로 여기서는 자리만 잡아 둔다. */
  function picTag(image, className) {
    if (!image) return "";
    if (image.url) {
      return '<img class="' + className + '" src="' + esc(UI.safeUrl(image.url)) + '" alt="" loading="lazy">';
    }
    return '<img class="' + className + '" data-img-id="' + esc(image.id) + '" alt="" loading="lazy">';
  }

  /* 그림이 없을 때. 링크는 어디 것인지라도 보여 준다 — 빈 네모만 있으면
     뭘 담아 뒀는지 알 수가 없다. */
  const BLANK_WHY = {
    video: "장면을 뜨지 못했습니다",
    link: "대표 이미지가 없습니다",
    image: "그림이 없습니다",
  };

  function blankHtml(item, inDetail) {
    const mark = item.kind === "video" ? "▶" : item.kind === "link" ? "🔗" : "🖼";
    /* 격자에서는 어디 것인지라도 보여 준다 — 빈 네모만 있으면 뭘 담아 뒀는지
       알 수가 없다. 크게 본 화면에는 주소가 이미 적혀 있으니, 같은 말을 두 번
       쓰지 않고 왜 비었는지만 알려 준다. */
    const say = inDetail
      ? BLANK_WHY[item.kind] || BLANK_WHY.image
      : (item.kind === "link" ? hostOf(item.url) : "") || item.title || BLANK_WHY.image;
    /* span 으로 짠다 — 이 덩어리가 단추(button) 안에 들어가는데, 거기에
       div 를 넣으면 규격에 어긋난다. */
    return (
      '<span class="refblank">' +
      '<span class="refblank__mark" aria-hidden="true">' + mark + "</span>" +
      '<span class="refblank__say">' + esc(say) + "</span>" +
      "</span>"
    );
  }

  /* ---------- 격자 ---------- */

  function cardHtml(item) {
    const badge =
      item.kind === "video"
        ? '<span class="refcard__badge" aria-hidden="true">▶</span>'
        : item.kind === "link"
        ? '<span class="refcard__badge refcard__badge--link" aria-hidden="true">↗</span>'
        : "";
    /* 그림이 없는 칸에는 자리표시가 이미 주소를 적고 있다. 그 아래 같은
       글자를 한 번 더 붙이지 않는다. */
    const caption = item.image
      ? item.title || (item.kind === "link" ? hostOf(item.url) : "")
      : item.title;

    return (
      '<article class="refcard" data-id="' + esc(item.id) + '">' +
      '<button type="button" class="refcard__open" data-ref-open aria-label="' +
      esc((caption || "레퍼런스") + " 크게 보기") + '">' +
      (item.image ? picTag(item.image, "refcard__img") : blankHtml(item)) +
      badge +
      "</button>" +
      (caption ? '<p class="refcard__cap">' + esc(caption) + "</p>" : "") +
      '<button type="button" class="card__grip" data-ref-grip draggable="true" ' +
      'title="끌어서 순서 바꾸기" aria-label="순서 바꾸기. 끌어다 놓으세요">⠿</button>' +
      "</article>"
    );
  }

  function listHtml() {
    const items = Store.state.references || [];
    if (!items.length) {
      return (
        '<div class="empty"><p class="empty__title">아직 모아 둔 레퍼런스가 없습니다.</p>' +
        "<p>오른쪽 위 '레퍼런스 추가' 로 이미지 · 영상 · 링크를 던져 넣으세요.</p></div>"
      );
    }
    return '<div class="refgrid">' + items.map(cardHtml).join("") + "</div>";
  }

  /* ---------- 추가 ---------- */

  function openAdd() {
    const one = (kind, mark, title, say) =>
      '<button type="button" class="refpick" data-add="' + kind + '">' +
      '<span class="refpick__mark" aria-hidden="true">' + mark + "</span>" +
      '<span class="refpick__body"><strong>' + title + "</strong>" +
      "<span>" + say + "</span></span>" +
      "</button>";

    const node = UI.openModal(
      "레퍼런스 추가",
      '<div class="refpicks">' +
        one("image", "🖼", "이미지 붙여넣기", "캡처한 그림을 붙여넣기(Ctrl+V). 파일이나 이미지 주소도 됩니다.") +
        one("video", "▶", "영상 올리기", "영상 파일을 올립니다. 첫 장면이 판에 보입니다. " +
          esc(Images.mediaLimitText()) + " 이하.") +
        one("link", "🔗", "링크 넣기", "주소를 넣으면 그 페이지의 대표 이미지와 제목을 받아 옵니다.") +
        "</div>",
      '<button type="button" class="btn btn--ghost" data-close>닫기</button>'
    );
    if (!node) return;

    node.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.add;
        UI.closeModal();
        if (kind === "image") addImage();
        if (kind === "video") addVideo();
        if (kind === "link") addLink();
      });
    });
  }

  /* 이미지 — 창을 먼저 띄우고 그 안에서 붙여넣기를 받는다. 파일 고르는 창이
     먼저 뜨면 초점이 그쪽으로 가 Ctrl+V 할 자리가 없어진다.

     onPick 을 넘기면 판에 새로 담지 않고 그 그림을 넘겨준다. 썸네일을
     바꿀 때 같은 창을 그대로 쓰기 위해서다. */
  function addImage(onPick) {
    UI.openImagePicker({
      title: onPick ? "썸네일 바꾸기" : "이미지 레퍼런스 넣기",
      onFiles: (files) => {
        let saved = 0;
        const next = (index) => {
          if (index >= files.length) {
            if (!saved) {
              UI.toast("이미지를 담지 못했습니다.", "warn");
              return;
            }
            if (onPick) return;
            UI.closeModal("picker");
            UI.toast("이미지 " + saved + "장을 담았습니다.");
            App.render();
            return;
          }
          Images.addFile(files[index]).then(
            (result) => {
              saved += 1;
              /* 썸네일을 바꾸는 중이면 한 장이면 된다. 여러 장을 붙여넣어도
                 첫 장만 쓰고 끝낸다 — 안 그러면 창이 몇 번씩 다시 열린다. */
              if (onPick) {
                onPick({ id: result.id, url: "" });
                return;
              }
              Store.addReference({ kind: "image", image: { id: result.id, url: "" } });
              next(index + 1);
            },
            () => next(index + 1)
          );
        };
        next(0);
        return "담는 중…";
      },
      onUrl: (url) => {
        if (onPick) {
          onPick({ id: "", url });
          return "";
        }
        Store.addReference({ kind: "image", image: { id: "", url } });
        UI.closeModal("picker");
        UI.toast("이미지를 담았습니다.");
        App.render();
        return "";
      },
    });
  }

  /* 영상 — 붙여넣기로 들어오는 일이 거의 없어 파일만 받는다. */
  function addVideo() {
    const node = UI.openModal(
      "영상 올리기",
      '<div class="vdrop" tabindex="0" data-vdrop>' +
        '<p class="vdrop__mark" aria-hidden="true">▶</p>' +
        '<p class="vdrop__say">영상 파일을 여기에 끌어다 놓으세요</p>' +
        '<p class="vdrop__sub">누르면 파일 고르는 창이 열립니다 · ' +
        esc(Images.mediaLimitText()) + " 이하</p>" +
        "</div>" +
        '<div class="ipick__rest">' +
        '<button type="button" class="btn btn--ghost btn--sm" data-vfile>파일에서 고르기</button>' +
        "</div>" +
        '<p class="ipick__msg" data-vmsg></p>' +
        '<input type="file" accept="video/*" hidden data-vinput>',
      '<button type="button" class="btn btn--ghost" data-close>닫기</button>',
      { id: "picker" }
    );
    if (!node) return;

    const drop = node.querySelector("[data-vdrop]");
    const msg = node.querySelector("[data-vmsg]");
    const input = node.querySelector("[data-vinput]");
    drop.focus();

    const take = (file) => {
      if (!file) return;
      if (String(file.type).indexOf("video/") !== 0) {
        msg.textContent = "영상 파일이 아닙니다.";
        return;
      }
      msg.textContent = "담는 중… 영상은 조금 걸립니다.";
      saveVideo(file).then(
        () => {
          UI.closeModal("picker");
          UI.toast("영상을 담았습니다.");
          App.render();
        },
        (error) => (msg.textContent = (error && error.message) || "담지 못했습니다.")
      );
    };

    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("is-drag-over");
    });
    ["dragleave", "dragend", "drop"].forEach((name) => {
      drop.addEventListener(name, () => drop.classList.remove("is-drag-over"));
    });
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      take((event.dataTransfer.files || [])[0]);
    });
    drop.addEventListener("click", () => input.click());
    node.querySelector("[data-vfile]").addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const file = (input.files || [])[0];
      input.value = "";
      take(file);
    });
  }

  /* 영상을 판에 그대로 띄울 수는 없다 — 열 칸이 한꺼번에 돌면 느려진다.
     그래서 한 장면을 떠 그림으로 담아 두고 그걸 격자에 보여 준다.
     못 떠도 영상 자체는 담는다. 그 칸은 ▶ 자리표시로 나온다. */
  function posterFrom(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      let settled = false;

      const give = (blob) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve(blob);
      };

      const shoot = () => {
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) {
            give(null);
            return;
          }
          const scale = Math.min(1, POSTER_SIDE / Math.max(w, h));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => give(blob), "image/jpeg", 0.82);
        } catch (e) {
          give(null);
        }
      };

      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.addEventListener("loadeddata", () => {
        /* 맨 앞이 까맣게 시작하는 영상이 많다. 조금 뒤로 가서 뜬다. */
        const at = Math.min(1, (video.duration || 4) / 4);
        if (at > 0.05) video.currentTime = at;
        else shoot();
      });
      video.addEventListener("seeked", shoot);
      video.addEventListener("error", () => give(null));
      setTimeout(() => give(null), POSTER_WAIT_MS);
      video.src = url;
    });
  }

  function saveVideo(file) {
    return Images.addMedia(file).then((media) =>
      posterFrom(file)
        .then((poster) => (poster ? Images.addFile(poster).catch(() => null) : null))
        .then((shot) => {
          Store.addReference({
            kind: "video",
            title: String(file.name || "").replace(/\.[^.]+$/, "").slice(0, 60),
            media: { id: media.id, type: media.type, name: file.name || "" },
            image: shot ? { id: shot.id, url: "" } : null,
          });
        })
    );
  }

  /* 링크 — 가져오기 서버가 그 페이지를 대신 읽어 제목과 대표 그림을 준다.
     서버가 없거나 그 사이트가 막아 두면 주소만 담는다. 썸네일은 크게 보기에서
     직접 붙여 넣으면 된다. */
  function addLink() {
    const node = UI.openModal(
      "링크 넣기",
      '<div class="field field--wide">' +
        '<label for="f_reflink">주소</label>' +
        '<input id="f_reflink" type="url" placeholder="https://…" data-lurl>' +
        '<p class="field__hint">유튜브 · 인스타그램 · 쇼핑몰 주소를 넣으면 그 페이지의 대표 이미지와 제목을 받아 옵니다.</p>' +
        "</div>" +
        '<p class="ipick__msg" data-lmsg></p>',
      '<button type="button" class="btn btn--ghost" data-close>취소</button>' +
        '<button type="button" class="btn btn--primary" data-lgo>넣기</button>',
      { id: "picker" }
    );
    if (!node) return;

    const input = node.querySelector("[data-lurl]");
    const msg = node.querySelector("[data-lmsg]");
    const go = node.querySelector("[data-lgo]");
    input.focus();

    const done = (item, say) => {
      UI.closeModal("picker");
      UI.toast(say);
      App.render();
      openItem(item.id);
    };

    const submit = () => {
      const url = UI.safeUrl(input.value.trim());
      if (!url) {
        msg.textContent = "주소를 알아볼 수 없습니다. http:// 또는 https:// 로 시작해야 합니다.";
        return;
      }
      msg.textContent = "페이지를 읽는 중…";
      go.disabled = true;

      Meta.fetchMeta(App.proxyUrl(), url).then(
        (data) => {
          /* 제목이 없으면 비워 둔다. 주소만 다시 적어 넣으면 판에도 크게 본
             화면에도 같은 글자가 두 번씩 나온다. */
          const item = Store.addReference({
            kind: "link",
            url,
            title: String(data.title || "").slice(0, 120),
            siteName: String(data.siteName || hostOf(url)).slice(0, 60),
            image: data.image ? { id: "", url: data.image } : null,
          });
          done(item, data.image ? "링크를 담았습니다." : "링크를 담았습니다. 대표 이미지는 없었습니다.");
        },
        () => {
          const item = Store.addReference({
            kind: "link",
            url,
            siteName: hostOf(url),
          });
          done(item, "링크만 담았습니다. 썸네일은 크게 보기에서 넣을 수 있습니다.");
        }
      );
    };

    go.addEventListener("click", submit);
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      submit();
    });
  }

  /* ---------- 크게 보기 ---------- */

  const KIND_TITLE = { image: "이미지", video: "영상", link: "링크" };

  function openItem(id) {
    const item = Store.getReference(id);
    if (!item) return;

    const big =
      item.kind === "video" && item.media
        ? '<video class="lightbox__video" controls playsinline preload="metadata" ' +
          'data-media-id="' + esc(item.media.id) + '" ' +
          'data-media-type="' + esc(item.media.type) + '"></video>'
        : item.image
        ? picTag(item.image, "lightbox__img")
        : blankHtml(item, true);

    /* 그림 자체가 알맹이인 이미지 칸은 바꿀 것이 없다. 영상과 링크는
       장면을 못 뜨거나 대표 그림이 없는 경우가 있어 손으로 넣게 둔다. */
    const canSwap = item.kind !== "image";

    const body =
      '<div class="lightbox lightbox--big">' + big + "</div>" +
      (item.kind === "link"
        ? '<p class="refdetail__host">' + esc(item.siteName || hostOf(item.url)) + "</p>"
        : "") +
      (item.title ? '<p class="refdetail__title">' + esc(item.title) + "</p>" : "") +
      (item.note ? '<p class="refdetail__note">' + esc(item.note) + "</p>" : "") +
      (canSwap
        ? '<p class="refdetail__swap"><button type="button" class="linkish" data-ref-swap>썸네일 바꾸기</button></p>'
        : "");

    const footer =
      '<button type="button" class="btn btn--ghost" data-ref-del>삭제</button>' +
      '<button type="button" class="btn btn--ghost" data-ref-edit>수정</button>' +
      (item.kind === "link"
        ? '<a class="btn btn--primary" href="' + esc(UI.safeUrl(item.url)) +
          '" target="_blank" rel="noopener noreferrer">바로가기 ↗</a>'
        : '<a class="btn btn--primary" data-ref-save>저장</a>') +
      '<button type="button" class="btn btn--ghost" data-close>닫기</button>';

    const node = UI.openModal(KIND_TITLE[item.kind] || "레퍼런스", body, footer);
    if (!node) return;

    Images.hydrate(node);
    bindSave(node, item);

    const swap = node.querySelector("[data-ref-swap]");
    if (swap) {
      swap.addEventListener("click", () => {
        UI.closeModal();
        addImage((image) => {
          Store.updateReference(item.id, { image });
          UI.closeModal("picker");
          UI.toast("썸네일을 바꿨습니다.");
          App.render();
          openItem(item.id);
        });
      });
    }

    node.querySelector("[data-ref-edit]").addEventListener("click", () => {
      UI.closeModal();
      openEdit(item.id);
    });

    node.querySelector("[data-ref-del]").addEventListener("click", () => {
      UI.closeModal();
      UI.confirmAction("이 레퍼런스를 지울까요? 되돌릴 수 없습니다.", () => {
        Store.removeReference(item.id);
        UI.toast("지웠습니다.");
        App.render();
      });
    });
  }

  /* 저장 — 브라우저에 담아 둔 것은 바로 내려받아진다. 남의 사이트 주소로
     걸어 둔 그림은 브라우저가 내려받게 두지 않으므로 새 탭에서 연다.

     주소는 그려진 뒤에 붙으므로 몇 번 다시 확인한다. */
  function bindSave(node, item) {
    const save = node.querySelector("[data-ref-save]");
    if (!save) return;
    const media = node.querySelector(".lightbox__video, .lightbox__img");
    const base = String(item.title || "레퍼런스").replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "레퍼런스";

    const point = () => {
      const src = media ? media.getAttribute("src") || "" : "";
      save.hidden = !src;
      if (!src) return;
      save.href = src;
      if (/^(blob:|data:)/.test(src)) {
        save.setAttribute("download", base + extOf(item, src));
        save.removeAttribute("target");
        save.textContent = "저장";
      } else {
        save.removeAttribute("download");
        save.target = "_blank";
        save.rel = "noopener noreferrer";
        save.textContent = "새 탭에서 열기";
      }
    };

    point();
    if (media) media.addEventListener("loadeddata", point);
    setTimeout(point, 400);
    setTimeout(point, 1200);
  }

  function extOf(item, src) {
    if (item.kind === "video") {
      const type = String((item.media || {}).type || "video/mp4");
      const tail = type.split("/")[1] || "mp4";
      return "." + tail.split(";")[0];
    }
    return /^data:image\/png/.test(src) ? ".png" : ".jpg";
  }

  function openEdit(id) {
    const item = Store.getReference(id);
    if (!item) return;

    const fields = [
      { name: "title", label: "제목", type: "text", span: 2, placeholder: "안 적어도 됩니다" },
      { name: "note", label: "메모", type: "textarea", rows: 3, span: 2, placeholder: "왜 담아 뒀는지" },
    ];
    if (item.kind === "link") {
      fields.push({ name: "url", label: "주소", type: "url", span: 2 });
    }

    UI.openForm({
      title: "레퍼런스 수정",
      fields,
      values: { title: item.title, note: item.note, url: item.url },
      submitLabel: "저장",
      onSubmit: (data) => {
        const patch = { title: data.title, note: data.note };
        if (item.kind === "link" && data.url) patch.url = UI.safeUrl(data.url) || item.url;
        Store.updateReference(item.id, patch);
        UI.toast("고쳤습니다.");
        App.render();
        openItem(item.id);
      },
    });
  }

  /* ---------- 순서 바꾸기 ----------
     판이 세로로 흐르므로 위아래 위치로 앞뒤를 정한다. */

  function bindReorder(root) {
    const grid = root.querySelector(".refgrid");
    if (!grid) return;

    let dragging = null;

    const persist = () => {
      Store.setReferenceOrder(
        Array.from(grid.querySelectorAll(".refcard")).map((card) => card.dataset.id)
      );
    };

    grid.querySelectorAll("[data-ref-grip]").forEach((grip) => {
      const card = grip.closest(".refcard");

      grip.addEventListener("dragstart", (event) => {
        dragging = card;
        card.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.dataset.id);
        if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(card, 24, 24);
      });

      grip.addEventListener("dragend", () => {
        if (dragging) dragging.classList.remove("is-dragging");
        grid.querySelectorAll(".refcard").forEach((c) => c.classList.remove("is-over"));
        dragging = null;
        persist();
      });
    });

    grid.addEventListener("dragover", (event) => {
      if (!dragging) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const over = event.target.closest(".refcard");
      if (!over || over === dragging) return;
      const box = over.getBoundingClientRect();
      const after = event.clientY > box.top + box.height / 2;
      grid.querySelectorAll(".refcard").forEach((c) => c.classList.remove("is-over"));
      over.classList.add("is-over");
      grid.insertBefore(dragging, after ? over.nextSibling : over);
    });

    grid.addEventListener("drop", (event) => {
      if (dragging) event.preventDefault();
    });
  }

  /* ---------- 렌더 ---------- */

  function render(root) {
    const count = (Store.state.references || []).length;

    root.innerHTML =
      '<div class="view__head">' +
      "<div>" +
      "<h2>타사 레퍼런스</h2>" +
      '<p class="view__sub">다른 브랜드의 이미지 · 영상 · 링크를 모아 두는 판입니다. 눌러서 크게 봅니다.' +
      (count ? " 지금 " + count + "개." : "") +
      "</p>" +
      "</div>" +
      '<button type="button" class="btn btn--primary" data-act="create">+ 레퍼런스 추가</button>' +
      "</div>" +
      listHtml();

    const createBtn = root.querySelector('[data-act="create"]');
    if (createBtn) createBtn.addEventListener("click", openAdd);

    root.querySelectorAll("[data-ref-open]").forEach((btn) => {
      btn.addEventListener("click", () => openItem(btn.closest(".refcard").dataset.id));
    });

    bindReorder(root);
    Images.hydrate(root);
  }

  /* 다른 탭과 모양을 맞추기 위한 자리. 이 판은 하나뿐이라 따로 열어 둘
     것이 없다. */
  function setActive() {}

  return { render, setActive, openAdd };
})();
