/* ============================================================
   저장소 — 상태 보관, localStorage 저장/복원, 파생 계산
   ============================================================ */

const STORAGE_KEY = "beauty-launch-board.v1";

const Store = (() => {
  let state = {
    ideas: [],
    products: [],
    competitors: [],
    seeded: false,
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
        return;
      } catch (e) {
        console.warn("저장된 데이터가 손상되어 샘플로 시작합니다.", e);
      }
    }
    seed();
  }

  /* 저장된 데이터가 구버전이어도 화면이 깨지지 않도록 빠진 값을 채운다. */
  function normalize() {
    state.ideas = (state.ideas || []).map((i) =>
      Object.assign({ id: uid(), kind: "idea", tags: [], refs: [], createdAt: nowISO() }, i)
    );
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
        },
        p
      );
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
      Object.assign({ id: uid(), productId: "", rating: 0, createdAt: nowISO() }, c)
    );
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

  function seed() {
    state.ideas = SEED.ideas.map((i) =>
      Object.assign({ id: uid(), createdAt: nowISO(), sample: true }, i)
    );
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

  function exportJSON() {
    return JSON.stringify(
      {
        exportedAt: nowISO(),
        ideas: state.ideas,
        products: state.products,
        competitors: state.competitors,
      },
      null,
      2
    );
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("형식이 올바르지 않습니다.");
    state.ideas = parsed.ideas || [];
    state.products = parsed.products || [];
    state.competitors = parsed.competitors || [];
    normalize();
    save();
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
    exportJSON,
    importJSON,
  };
})();
