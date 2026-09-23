/* ============================================================
   이미지 보관 — IndexedDB

   이미지는 localStorage(약 5MB) 에 넣으면 금방 한도를 넘기고, 저장할 때마다
   전체 데이터를 문자열로 만드느라 느려진다. 그래서 이미지만 IndexedDB 에
   따로 담고, 아이디어·경쟁 제품 기록에는 그 열쇠(id)만 남긴다.
   ============================================================ */

const Images = (() => {
  const DB_NAME = "beauty-launch-board-images";
  const STORE = "images";
  const MAX_SIDE = 1400;   // 긴 변 기준 축소 한계
  const QUALITY = 0.82;

  let dbPromise = null;
  let unavailableReason = "";
  const urlCache = new Map();

  /* ---------- 저장소 열기 ---------- */

  const OPEN_TIMEOUT_MS = 6000;

  function open() {
    if (dbPromise) return dbPromise;
    const opening = new Promise((resolve, reject) => {
      let request;
      try {
        request = indexedDB.open(DB_NAME, 1);
      } catch (e) {
        unavailableReason = "이 브라우저에서 이미지 저장소를 쓸 수 없습니다.";
        reject(e);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => {
        const db = request.result;
        /* 다른 탭이 저장소를 지우거나 바꾸려 하면 이 연결이 길을 막는다.
           붙들고 있지 말고 놓아 준다 — 안 그러면 양쪽 다 멈춘다. */
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      /* 열기 자체가 막히는 경우에도 영영 기다리지 않는다. */
      request.onblocked = () => {
        unavailableReason = "다른 탭이 이미지 저장소를 쓰고 있습니다. 그 탭을 닫고 새로고침해 주세요.";
        dbPromise = null;
        reject(new Error(unavailableReason));
      };
      request.onerror = () => {
        unavailableReason = "이미지 저장소를 열지 못했습니다. 시크릿 모드에서는 제한될 수 있습니다.";
        dbPromise = null;
        reject(request.error);
      };
    });

    /* 저장소가 응답하지 않는 경우가 있다 (다른 탭이 붙들고 있거나 브라우저가
       막아 둔 경우). 영영 기다리면 사진 담기 버튼이 멈춘 것처럼 보이므로,
       일정 시간이 지나면 실패로 끝내 이유를 알려 준다. */
    dbPromise = Promise.race([
      opening,
      new Promise((_, reject) =>
        setTimeout(() => {
          unavailableReason =
            "이미지 저장소가 응답하지 않습니다. 이 사이트의 다른 탭을 닫고 새로고침해 주세요.";
          dbPromise = null;
          reject(new Error(unavailableReason));
        }, OPEN_TIMEOUT_MS)
      ),
    ]);
    return dbPromise;
  }

  function tx(mode, run) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE, mode);
          const store = transaction.objectStore(STORE);
          let result;
          try {
            result = run(store);
          } catch (e) {
            reject(e);
            return;
          }
          transaction.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        })
    );
  }

  function isAvailable() {
    return typeof indexedDB !== "undefined";
  }

  function whyUnavailable() {
    return unavailableReason || "이미지 저장소를 쓸 수 없습니다.";
  }

  /* ---------- 줄이기 ----------
     원본을 그대로 담으면 사진 한 장에 수 MB 라 금방 감당이 안 된다.
     긴 변을 1400px 로 줄이고 JPEG 로 다시 굽는다. */

  function compress(file) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) {
        reject(new Error("이미지 파일이 아닙니다."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("이미지를 열지 못했습니다."));
        img.onload = () => {
          const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          /* JPEG 는 투명을 담지 못한다. 투명한 PNG 가 검게 나오지 않도록 흰 바탕을 먼저 깐다. */
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("이미지를 변환하지 못했습니다."))),
            "image/jpeg",
            QUALITY
          );
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function newId() {
    return "im" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- 쓰기 / 읽기 ---------- */

  /* 담을 때는 이 브라우저와 공유 서버 양쪽에 넣는다. 서버에 올라가야 다른
     사람 화면에도 사진이 뜬다. 서버가 없으면 이 브라우저에만 담긴다. */
  function addFile(file) {
    return compress(file).then((blob) => {
      const id = newId();
      return tx("readwrite", (store) => store.put(blob, id))
        .then(() => {
          if (typeof Remote !== "undefined" && Remote.signedIn()) {
            return Remote.putImage(id, blob).catch(() => {
              if (typeof UI !== "undefined" && UI.toast) {
                UI.toast("사진을 서버에 올리지 못했습니다. 다른 사람에게는 안 보일 수 있습니다.", "warn");
              }
            });
          }
        })
        .then(() => ({ id, size: blob.size }));
    });
  }

  function putRaw(id, blob) {
    return tx("readwrite", (store) => store.put(blob, id));
  }

  function get(id) {
    return tx("readonly", (store) => store.get(id));
  }

  function remove(id) {
    const cached = urlCache.get(id);
    if (cached) {
      URL.revokeObjectURL(cached);
      urlCache.delete(id);
    }
    return tx("readwrite", (store) => store.delete(id)).catch(() => {});
  }

  function listAll() {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE, "readonly");
          const store = transaction.objectStore(STORE);
          const out = [];
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              out.push({ id: cursor.key, blob: cursor.value });
              cursor.continue();
            }
          };
          cursorRequest.onerror = () => reject(cursorRequest.error);
          transaction.oncomplete = () => resolve(out);
          transaction.onerror = () => reject(transaction.error);
        })
    );
  }

  /* 이 브라우저에 받아 둔 사본 중 쓰이지 않는 것을 지운다.
     서버 쪽은 건드리지 않는다 — 다른 사람이 방금 올린 사진을, 그 내용이
     아직 내게 도착하기 전에 지워 버릴 수 있기 때문이다. */
  function pruneUnused(usedIds) {
    const keep = new Set(usedIds);
    return listAll()
      .then((items) => Promise.all(items.filter((i) => !keep.has(i.id)).map((i) => remove(i.id))))
      .catch(() => {});
  }

  /* ---------- 화면에 붙이기 ----------
     읽기가 비동기라 HTML 을 만들 때는 자리만 잡아 두고,
     그려진 뒤에 이 함수가 실제 그림을 채운다. */

  function hold(id, blob) {
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  }

  /* 이 브라우저에 없으면 서버에서 받아 와 담아 둔다. 다른 사람이 올린 사진을
     내 화면에서도 보려면 이 경로가 필요하다. */
  function fetchFromServer(id) {
    if (typeof Remote === "undefined" || !Remote.signedIn()) return Promise.resolve("");
    return Remote.getImage(id)
      .then((blob) => putRaw(id, blob).then(() => hold(id, blob)))
      .catch(() => "");
  }

  function objectUrl(id) {
    if (urlCache.has(id)) return Promise.resolve(urlCache.get(id));
    return get(id)
      .then((blob) => (blob ? hold(id, blob) : fetchFromServer(id)))
      .catch(() => fetchFromServer(id));
  }

  function hydrate(scope) {
    const root = scope || document;
    const nodes = root.querySelectorAll("img[data-img-id]:not([data-img-done])");
    nodes.forEach((node) => {
      const id = node.dataset.imgId;
      node.dataset.imgDone = "1";
      objectUrl(id).then((url) => {
        if (url) {
          node.src = url;
        } else {
          node.remove();
        }
      });
    });
  }

  /* ---------- 백업 ----------
     백업 파일 하나로 옮길 수 있도록 이미지도 함께 싣는다. */

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then((r) => r.blob());
  }

  function exportAll() {
    return listAll()
      .then((items) =>
        Promise.all(
          items.map((item) => blobToDataUrl(item.blob).then((dataUrl) => [item.id, dataUrl]))
        )
      )
      .then((pairs) => Object.fromEntries(pairs))
      .catch(() => ({}));
  }

  function importAll(map) {
    const entries = Object.entries(map || {});
    if (!entries.length) return Promise.resolve(0);
    return Promise.all(
      entries.map(([id, dataUrl]) => dataUrlToBlob(dataUrl).then((blob) => putRaw(id, blob)))
    )
      .then(() => entries.length)
      .catch(() => 0);
  }

  return {
    isAvailable,
    whyUnavailable,
    addFile,
    get,
    remove,
    listAll,
    pruneUnused,
    objectUrl,
    hydrate,
    exportAll,
    importAll,
  };
})();
