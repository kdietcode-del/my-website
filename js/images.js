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

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        unavailableReason = "이미지 저장소를 열지 못했습니다. 시크릿 모드에서는 제한될 수 있습니다.";
        reject(request.error);
      };
    });
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

  function addFile(file) {
    return compress(file).then((blob) => {
      const id = newId();
      return tx("readwrite", (store) => store.put(blob, id)).then(() => ({ id, size: blob.size }));
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

  /* 쓰이지 않는 이미지를 지운다. 기록에서 사진을 빼도 파일은 남아 있기 때문이다. */
  function pruneUnused(usedIds) {
    const keep = new Set(usedIds);
    return listAll()
      .then((items) => Promise.all(items.filter((i) => !keep.has(i.id)).map((i) => remove(i.id))))
      .catch(() => {});
  }

  /* ---------- 화면에 붙이기 ----------
     읽기가 비동기라 HTML 을 만들 때는 자리만 잡아 두고,
     그려진 뒤에 이 함수가 실제 그림을 채운다. */

  function objectUrl(id) {
    if (urlCache.has(id)) return Promise.resolve(urlCache.get(id));
    return get(id)
      .then((blob) => {
        if (!blob) return "";
        const url = URL.createObjectURL(blob);
        urlCache.set(id, url);
        return url;
      })
      .catch(() => "");
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
