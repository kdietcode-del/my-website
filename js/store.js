/* ============================================================
   저장소 — 상태 보관, localStorage 저장/복원, 파생 계산
   ============================================================ */

const STORAGE_KEY = "beauty-launch-board.v1";

/* 차기 신제품 아이디어 기본 목록의 판 번호. 올리면 이미 쓰고 있는 브라우저에도
   새 목록이 한 번 들어간다 (사용자가 직접 쓴 항목은 그대로 둔다). */
const SEED_VERSION = 3;

/* 한 번만 돌리는 정리 작업의 판 번호. 기본 목록을 '추가' 하는 SEED_VERSION 과
   따로 둔다. 정리 때문에 판 번호를 올렸다가, 사용자가 일부러 지운 항목까지
   되살아나는 일을 막기 위해서다. */
const CLEANUP_VERSION = 1;

const Store = (() => {
  let state = {
    ideas: [],
    products: [],
    competitors: [],
    seeded: false,
    cleanupVersion: 0,
    seedVersion: 0,
  };

  /* ---------- 유틸 ---------- */

  function uid() {
    return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  /* ---------- 저장 / 복원 ----------
     localStorage 는 시크릿 모드나 차단 설정에서 예외를 던질 수 있으므로
     읽기·쓰기를 모두 try/catch 로 감싸고, 실패해도 앱은 그대로 동작한다. */

  let storageWarned = false;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      if (!storageWarned) {
        storageWarned = true;
        console.warn("저장 실패 — 브라우저 저장소를 쓸 수 없습니다.", e);
        if (typeof UI !== "undefined" && UI.toast) {
          UI.toast("브라우저 저장소를 쓸 수 없습니다. 새로고침하면 사라지니 JSON으로 내보내 두세요.", "warn");
        }
      }
    }
  }

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      console.warn("불러오기 실패", e);
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        state = Object.assign(state, parsed);
        normalize();
        applySeedUpdate();
        applyCleanup();
        return;
      } catch (e) {
        console.warn("저장된 데이터가 손상되어 샘플로 시작합니다.", e);
      }
    }
    seed();
  }

  /* 예전 분류로 저장돼 있으면 새 분류로 바꾼다. 대응되는 게 없으면 비워서
     사용자가 다시 고르게 한다 — 엉뚱한 값을 넣는 것보다 낫다. */
  function migrateCategory(key) {
    if (!key) return "";
    if (CATEGORIES.some((c) => c.key === key)) return key;
    return Object.prototype.hasOwnProperty.call(LEGACY_CATEGORY_MAP, key)
      ? LEGACY_CATEGORY_MAP[key]
      : "";
  }

  /* 기본 목록의 이름 → seedId. 예전에 seedId 없이 저장된 항목을 알아보기 위한 것. */
  function seedIdForName(name) {
    const found = SEED.ideas.find((s) => s.name === name);
    return found ? found.seedId : "";
  }

  /* 저장된 데이터가 구버전이어도 화면이 깨지지 않도록 빠진 값을 채운다. */
  function normalize() {
    state.ideas = (state.ideas || []).map((i) => {
      const idea = Object.assign(
        {
          id: uid(),
          kind: "idea",
          tags: [],
          refs: [],
          images: [],
          efficacyType: "",
          ingredients: "",
          status: "",
          createdAt: nowISO(),
        },
        i
      );
      idea.category = migrateCategory(idea.category);
      /* seedId 는 나중에 생긴 필드다. 이름으로 되찾아 붙여 두지 않으면
         '이미 있는 항목' 검사가 빗나가 기본 목록이 한 번 더 들어간다. */
      if (!idea.seedId) {
        const found = seedIdForName(idea.name);
        if (found) idea.seedId = found;
      }
      return idea;
    });
    state.products = (state.products || []).map((p) => {
      const product = Object.assign(
        {
          id: uid(),
          stages: [],
          createdAt: nowISO(),
          memo: "",
          owner: "",
          targetDate: "",
          targetPrice: null,
          efficacyType: "",
        },
        p
      );
      product.category = migrateCategory(product.category);
      const previous = product.stages || [];
      product.stages = STAGE_TEMPLATE.map((tpl) => {
        const existing = previous.find((s) => s.key === tpl.key);
        const stage = Object.assign({ key: tpl.key, tasks: [], note: "", dueDate: "" }, existing);
        /* 항목별 메모는 나중에 추가된 필드라, 옛 데이터에는 빈 값을 채워 준다. */
        stage.tasks = stage.tasks.map((task) => Object.assign({ memo: "" }, task));
        return stage;
      });
      return product;
    });
    state.competitors = (state.competitors || []).map((c) =>
      Object.assign({ id: uid(), productId: "", rating: 0, images: [], createdAt: nowISO() }, c)
    );
  }

  /* 지금 어딘가에서 쓰이고 있는 이미지 열쇠 전부.
     기록에서 빠진 이미지 파일을 정리할 때 쓴다. */
  function usedImageIds() {
    const ids = [];
    const collect = (list) => {
      (list || []).forEach((item) => {
        (item.images || []).forEach((image) => {
          if (image && image.id && !image.url) ids.push(image.id);
        });
      });
    };
    collect(state.ideas);
    collect(state.competitors);
    return ids;
  }

  /* ---------- 샘플 데이터 ---------- */

  function makeStages(doneUpTo, partialRatio) {
    return STAGE_TEMPLATE.map((tpl, index) => {
      const tasks = tpl.tasks.map((label) => ({ id: uid(), label, done: false, memo: "" }));
      if (index < doneUpTo) {
        tasks.forEach((t) => (t.done = true));
      } else if (index === doneUpTo && partialRatio > 0) {
        const count = Math.round(tasks.length * partialRatio);
        tasks.slice(0, count).forEach((t) => (t.done = true));
      }
      return { key: tpl.key, tasks, note: "", dueDate: "" };
    });
  }

  /* 차기 신제품 아이디어 기본 목록. 샘플이 아니라 실제 데이터라 sample 표시를 달지 않는다. */
  function seedIdeas() {
    return SEED.ideas.map((i) => Object.assign({ id: uid(), createdAt: nowISO() }, i));
  }

  /* 이미 쓰고 있던 브라우저를 새 기본 목록에 맞춘다.
     - 예전 샘플은 걷어낸다
     - 기본 목록 중 아직 없는 것만 넣는다 (seedId 로 판별하므로 중복되지 않는다)
     - 이미 있는 항목의 내용은 건드리지 않는다. 직접 고친 값이 우선이다. */
  function applySeedUpdate() {
    if (state.seedVersion === SEED_VERSION) return;

    let ideas = (state.ideas || []).filter((i) => !i.sample);
    const present = new Set(ideas.map((i) => i.seedId).filter(Boolean));
    const missing = seedIdeas().filter((i) => !present.has(i.seedId));
    ideas = missing.concat(ideas);

    /* 겔 패치 마스크는 '마스크팩' 분류가 생기기 전에 들어가 미분류로 남아 있다.
       비어 있을 때만 채운다 — 직접 고른 값은 덮지 않는다. */
    ideas.forEach((idea) => {
      if (idea.seedId === "gel-patch-mask" && !idea.category) idea.category = "mask";
    });

    state.ideas = ideas;
    state.seedVersion = SEED_VERSION;
    save();
  }

  /* 같은 항목이 둘 있을 때 어느 쪽을 남길지 정하는 점수.
     '채워져 있는가' 가 아니라 '기본값에서 달라졌는가' 를 본다 — 둘 다 내용이
     차 있으면 채움 여부로는 구분이 되지 않고, 사용자가 고친 쪽이 밀려난다. */
  function editScore(idea) {
    const base = SEED.ideas.find((s) => s.seedId === idea.seedId);
    const fields = [
      "name",
      "efficacy",
      "ingredients",
      "usp",
      "memo",
      "category",
      "efficacyType",
      "status",
    ];
    let score = (idea.images || []).length * 100; // 직접 넣은 사진은 확실한 손질
    fields.forEach((field) => {
      const value = String(idea[field] || "");
      if (!base) {
        if (value) score += 1;
        return;
      }
      if (value !== String(base[field] || "")) score += 50;
      else if (value) score += 1;
    });
    score += (idea.tags || []).length;
    score += (idea.refs || []).length;
    return score;
  }

  /* 기본 목록이 두 번 들어간 브라우저를 정리한다.
     같은 항목이 여럿이면 내용이 가장 많이 찬 하나만 남긴다.
     기본 목록과 무관한 항목은 이름이 같아도 건드리지 않는다. */
  function dedupeSeedIdeas(ideas) {
    const kept = [];
    const slotByKey = new Map();

    ideas.forEach((idea) => {
      const key = idea.seedId || seedIdForName(idea.name);
      if (!key) {
        kept.push(idea);
        return;
      }
      idea.seedId = key;
      if (!slotByKey.has(key)) {
        slotByKey.set(key, kept.length);
        kept.push(idea);
        return;
      }
      const slot = slotByKey.get(key);
      if (editScore(idea) > editScore(kept[slot])) kept[slot] = idea;
    });

    return kept;
  }

  function applyCleanup() {
    if (state.cleanupVersion === CLEANUP_VERSION) return;
    const before = (state.ideas || []).length;
    state.ideas = dedupeSeedIdeas(state.ideas || []);
    const removed = before - state.ideas.length;
    state.cleanupVersion = CLEANUP_VERSION;
    save();
    if (removed > 0 && typeof UI !== "undefined" && UI.toast) {
      /* 화면이 다 뜬 뒤에 알린다. */
      setTimeout(() => UI.toast("중복으로 들어가 있던 아이디어 " + removed + "건을 정리했습니다."), 600);
    }
  }

  function seed() {
    state.ideas = seedIdeas();
    state.seedVersion = SEED_VERSION;
    state.cleanupVersion = CLEANUP_VERSION;
    state.products = SEED.products.map((p) => {
      const rest = Object.assign({}, p);
      const doneUpTo = rest.doneUpTo || 0;
      delete rest.doneUpTo;
      return Object.assign({ id: uid(), createdAt: nowISO(), sample: true }, rest, {
        stages: makeStages(doneUpTo, 0.5),
      });
    });
    const firstProductId = state.products.length ? state.products[0].id : "";
    state.competitors = SEED.competitors.map((c) =>
      Object.assign({ id: uid(), productId: firstProductId, createdAt: nowISO(), sample: true }, c)
    );
    state.seeded = true;
    save();
  }

  function clearSamples() {
    state.ideas = state.ideas.filter((i) => !i.sample);
    state.products = state.products.filter((p) => !p.sample);
    state.competitors = state.competitors.filter((c) => !c.sample);
    save();
  }

  function hasSamples() {
    return (
      state.ideas.some((i) => i.sample) ||
      state.products.some((p) => p.sample) ||
      state.competitors.some((c) => c.sample)
    );
  }

  /* ---------- 아이디어 ---------- */

  function addIdea(data) {
    const idea = Object.assign({ id: uid(), createdAt: nowISO(), tags: [], refs: [] }, data);
    state.ideas.unshift(idea);
    save();
    return idea;
  }

  function updateIdea(id, data) {
    const idea = state.ideas.find((i) => i.id === id);
    if (!idea) return null;
    Object.assign(idea, data);
    delete idea.sample;
    save();
    return idea;
  }

  function removeIdea(id) {
    state.ideas = state.ideas.filter((i) => i.id !== id);
    save();
  }

  /* ---------- 런칭 제품 ---------- */

  function addProduct(data) {
    const product = Object.assign(
      { id: uid(), createdAt: nowISO(), memo: "", owner: "", targetDate: "", targetPrice: null },
      data,
      { stages: makeStages(0, 0) }
    );
    state.products.unshift(product);
    save();
    return product;
  }

  function updateProduct(id, data) {
    const product = getProduct(id);
    if (!product) return null;
    Object.assign(product, data);
    delete product.sample;
    save();
    return product;
  }

  function removeProduct(id) {
    state.products = state.products.filter((p) => p.id !== id);
    /* 연결된 경쟁 제품은 지우지 않고 연결만 끊는다 — 리서치 자료는 남겨둘 가치가 있다. */
    state.competitors.forEach((c) => {
      if (c.productId === id) c.productId = "";
    });
    save();
  }

  function getProduct(id) {
    return state.products.find((p) => p.id === id) || null;
  }

  function getStage(productId, stageKey) {
    const product = getProduct(productId);
    if (!product) return null;
    return product.stages.find((s) => s.key === stageKey) || null;
  }

  function touchProduct(productId) {
    const product = getProduct(productId);
    if (product) delete product.sample;
  }

  function toggleTask(productId, stageKey, taskId) {
    const stage = getStage(productId, stageKey);
    if (!stage) return;
    const task = stage.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.done = !task.done;
    touchProduct(productId);
    save();
  }

  function addTask(productId, stageKey, label) {
    const stage = getStage(productId, stageKey);
    if (!stage || !label.trim()) return;
    stage.tasks.push({ id: uid(), label: label.trim(), done: false, memo: "" });
    touchProduct(productId);
    save();
  }

  function removeTask(productId, stageKey, taskId) {
    const stage = getStage(productId, stageKey);
    if (!stage) return;
    stage.tasks = stage.tasks.filter((t) => t.id !== taskId);
    save();
  }

  function setTaskMemo(productId, stageKey, taskId, memo) {
    const stage = getStage(productId, stageKey);
    if (!stage) return;
    const task = stage.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.memo = memo;
    touchProduct(productId);
    save();
  }

  function setStageField(productId, stageKey, field, value) {
    const stage = getStage(productId, stageKey);
    if (!stage) return;
    stage[field] = value;
    touchProduct(productId);
    save();
  }

  function resetStage(productId, stageKey) {
    const stage = getStage(productId, stageKey);
    if (!stage) return;
    stage.tasks.forEach((t) => (t.done = false));
    touchProduct(productId);
    save();
  }

  function completeStage(productId, stageKey) {
    const stage = getStage(productId, stageKey);
    if (!stage) return;
    stage.tasks.forEach((t) => (t.done = true));
    touchProduct(productId);
    save();
  }

  /* ---------- 경쟁 제품 ---------- */

  function addCompetitor(data) {
    const competitor = Object.assign(
      { id: uid(), createdAt: nowISO(), productId: "", rating: 0 },
      data
    );
    state.competitors.unshift(competitor);
    save();
    return competitor;
  }

  function updateCompetitor(id, data) {
    const competitor = state.competitors.find((c) => c.id === id);
    if (!competitor) return null;
    Object.assign(competitor, data);
    delete competitor.sample;
    save();
    return competitor;
  }

  function removeCompetitor(id) {
    state.competitors = state.competitors.filter((c) => c.id !== id);
    save();
  }

  /* ---------- 파생 계산 ----------
     진행률은 어디서도 손으로 입력하지 않는다. 체크된 항목 수에서만 나온다. */

  function stageProgress(stage) {
    if (!stage || !stage.tasks.length) return 0;
    const done = stage.tasks.filter((t) => t.done).length;
    return done / stage.tasks.length;
  }

  function productProgress(product) {
    if (!product || !product.stages.length) {
      return { ratio: 0, done: 0, total: 0, stagesDone: 0, currentStage: null };
    }
    let done = 0;
    let total = 0;
    let stagesDone = 0;
    let currentStage = null;
    product.stages.forEach((stage) => {
      const stageDone = stage.tasks.filter((t) => t.done).length;
      done += stageDone;
      total += stage.tasks.length;
      if (stage.tasks.length && stageDone === stage.tasks.length) {
        stagesDone += 1;
      } else if (!currentStage) {
        currentStage = stage.key;
      }
    });
    return {
      ratio: total ? done / total : 0,
      done,
      total,
      stagesDone,
      currentStage: currentStage || product.stages[product.stages.length - 1].key,
    };
  }

  function overallProgress() {
    if (!state.products.length) return 0;
    const sum = state.products.reduce((acc, p) => acc + productProgress(p).ratio, 0);
    return sum / state.products.length;
  }

  function competitorsFor(productId) {
    if (!productId) return state.competitors.slice();
    return state.competitors.filter((c) => c.productId === productId);
  }

  /* ---------- 내보내기 / 가져오기 ---------- */

  /* 백업 파일 하나로 다른 기기에 그대로 옮겨갈 수 있도록 이미지도 함께 싣는다.
     그래서 내보내기는 비동기다. */
  function exportJSON() {
    return Images.exportAll().then((images) =>
      JSON.stringify(
        {
          exportedAt: nowISO(),
          ideas: state.ideas,
          products: state.products,
          competitors: state.competitors,
          images,
        },
        null,
        2
      )
    );
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("형식이 올바르지 않습니다.");
    return Images.importAll(parsed.images).then(() => {
      state.ideas = parsed.ideas || [];
      state.products = parsed.products || [];
      state.competitors = parsed.competitors || [];
      normalize();
      save();
    });
  }

  return {
    uid,
    load,
    save,
    get state() {
      return state;
    },
    clearSamples,
    hasSamples,
    addIdea,
    updateIdea,
    removeIdea,
    addProduct,
    updateProduct,
    removeProduct,
    getProduct,
    getStage,
    toggleTask,
    addTask,
    removeTask,
    setTaskMemo,
    setStageField,
    resetStage,
    completeStage,
    addCompetitor,
    updateCompetitor,
    removeCompetitor,
    stageProgress,
    productProgress,
    overallProgress,
    competitorsFor,
    usedImageIds,
    exportJSON,
    importJSON,
  };
})();
