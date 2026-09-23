/* ============================================================
   링크에서 제품 정보 가져오기

   브라우저는 다른 사이트를 직접 읽지 못한다(CORS). 그래서 worker/ 폴더의
   중계 서버에 대신 읽어 달라고 부탁하고, 돌아온 값을 입력칸에 채운다.

   서버 주소가 없거나 그 사이트가 막혀 있으면 이유를 알려 주고 끝낸다.
   직접 입력하는 기존 방식은 그대로 쓸 수 있다.
   ============================================================ */

const Meta = (() => {
  const TIMEOUT_MS = 15000;

  function fetchMeta(proxyBase, targetUrl) {
    if (!proxyBase) {
      return Promise.reject(
        new Error("썸네일 가져오기 서버 주소가 설정되지 않았습니다. [⚙ 설정] 에서 넣어 주세요.")
      );
    }

    const endpoint = proxyBase.replace(/\/+$/, "") + "/?url=" + encodeURIComponent(targetUrl);

    /* 응답이 없을 때 하염없이 기다리지 않도록 시간 제한을 둔다. */
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

    return fetch(endpoint, controller ? { signal: controller.signal } : {})
      .then(
        (response) => {
          if (timer) clearTimeout(timer);
          return response.json().then(
            (body) => {
              if (!response.ok || !body.ok) {
                throw new Error(body.error || "서버가 " + response.status + " 를 돌려줬습니다.");
              }
              return body;
            },
            () => {
              throw new Error("서버 응답을 읽지 못했습니다. 주소가 맞는지 확인해 주세요.");
            }
          );
        },
        (error) => {
          if (timer) clearTimeout(timer);
          if (error && error.name === "AbortError") {
            throw new Error("시간이 너무 오래 걸려 멈췄습니다.");
          }
          throw new Error("서버에 닿지 못했습니다. 주소와 배포 상태를 확인해 주세요.");
        }
      );
  }

  /* 가져온 값을 경쟁 제품 입력 화면에 채운다.
     이미 적어 둔 값은 덮지 않는다 — 사람이 쓴 게 우선이다. */
  function applyToForm(node, data) {
    const filled = [];

    const setIfEmpty = (name, value) => {
      if (!value) return;
      const field = node.querySelector('[name="' + name + '"]');
      if (!field || field.value.trim()) return;
      field.value = value;
      filled.push(name);
    };

    setIfEmpty("name", data.title);
    setIfEmpty("brand", data.siteName);
    setIfEmpty("claims", data.description);
    if (data.price) {
      const priceField = node.querySelector('[name="price"]');
      if (priceField && !priceField.value.trim()) {
        priceField.value = String(data.price).replace(/[^0-9]/g, "");
        filled.push("price");
      }
    }

    let imageAdded = false;
    if (data.image) {
      const list = node.querySelector("[data-image-list]");
      const already = list
        ? Array.from(list.querySelectorAll(".img-thumb")).some(
            (thumb) => thumb.dataset.imageUrl === data.image
          )
        : true;
      if (list && !already) {
        list.insertAdjacentHTML(
          "beforeend",
          '<div class="img-thumb" data-image-id="url' + Date.now().toString(36) +
            '" data-image-url="' + UI.escapeHtml(data.image) + '">' +
            '<img src="' + UI.escapeHtml(data.image) + '" alt="" loading="lazy">' +
            '<button type="button" class="img-thumb__x" data-image-remove aria-label="이미지 빼기">✕</button>' +
            "</div>"
        );
        imageAdded = true;
      }
    }

    return { filled, imageAdded };
  }

  const LABELS = {
    name: "제품명",
    brand: "브랜드",
    claims: "소구 포인트",
    price: "가격",
  };

  function describe(result) {
    const parts = result.filled.map((key) => LABELS[key] || key);
    if (result.imageAdded) parts.push("썸네일");
    if (!parts.length) return "새로 채울 항목이 없었습니다. 이미 적혀 있는 값은 덮지 않습니다.";
    return parts.join(" · ") + " 을(를) 채웠습니다. 값이 맞는지 확인해 주세요.";
  }

  return { fetchMeta, applyToForm, describe };
})();
