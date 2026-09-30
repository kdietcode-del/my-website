/* ============================================================
   아이디어 기획서 — 신제품·브랜드 기획 프로세스 v1.0

   아이디어 카드를 누르면 열리는 상세 화면이다. 일곱 개 질문에 순서대로
   답하면 그대로 기획서가 된다.

   맨 위에 한 줄 요약과 일곱 줄짜리 제출 양식을 두고, 아래에 각 단계의
   근거를 펼쳐 둔다. 요약만 보면 A4 한 장이고, 펼치면 조사 내용이다.

   일곱 단계 어디에도 안 들어가는 것은 아래 디벨롭 필요사항에 적는다.
   ============================================================ */

const Plan = (() => {
  let activeId = null;

  function setActive(id) {
    activeId = id || null;
  }

  const getActive = () => activeId;

  /* ---------- 조각 ---------- */

  /* 눌러서 바로 고치는 글. 컨셉보드와 같은 방식이다. */
  function text(path, part, placeholder, extraClass) {
    return (
      '<div class="ptext' + (extraClass ? " " + extraClass : "") + '" contenteditable="true" ' +
      'data-path="' + path + '" data-placeholder="' + UI.escapeHtml(placeholder) + '" ' +
      'role="textbox" aria-label="' + UI.escapeHtml(placeholder) + '">' +
      UI.escapeHtml((part || {}).text || "") +
      "</div>"
    );
  }

  function line(path, value, placeholder, extraClass) {
    return (
      '<input type="text" class="input' + (extraClass ? " " + extraClass : "") + '" ' +
      'data-line="' + path + '" value="' + UI.escapeHtml(value || "") +
      '" placeholder="' + UI.escapeHtml(placeholder) + '" aria-label="' +
      UI.escapeHtml(placeholder) + '">'
    );
  }

  function pick(path, value, options, label) {
    const opts = options
      .map(
        (o) =>
          '<option value="' + UI.escapeHtml(o.key) + '"' +
          (o.key === (value || "") ? " selected" : "") + ">" + UI.escapeHtml(o.label) + "</option>"
      )
      .join("");
    return (
      '<select class="select" data-pick="' + path + '" aria-label="' + UI.escapeHtml(label) + '">' +
      opts + "</select>"
    );
  }

  function checkRow(path, on, label, hint) {
    return (
      '<label class="pcheck"><input type="checkbox" data-check="' + path + '"' +
      (on ? " checked" : "") + ">" +
      "<span><strong>" + UI.escapeHtml(label) + "</strong>" +
      (hint ? '<em>' + UI.escapeHtml(hint) + "</em>" : "") + "</span></label>"
    );
  }

  function field(label, inner, hint) {
    return (
      '<div class="pfield"><p class="pfield__label">' + UI.escapeHtml(label) + "</p>" +
      (hint ? '<p class="pfield__hint">' + UI.escapeHtml(hint) + "</p>" : "") +
      inner + "</div>"
    );
  }

  function shots(path, images, label) {
    const thumbs = images
      .map(
        (image, index) =>
          '<div class="czone__item" data-image-index="' + index + '">' +
          (image.url
            ? '<img src="' + UI.escapeHtml(UI.safeUrl(image.url)) + '" alt="" loading="lazy">'
            : '<img data-img-id="' + UI.escapeHtml(image.id) + '" alt="" loading="lazy">') +
          '<button type="button" class="img-thumb__x" data-image-remove aria-label="캡처 빼기">✕</button>' +
          "</div>"
      )
      .join("");
    return (
      '<div class="czone" data-images="' + path + '">' +
      '<div class="czone__grid">' + thumbs + "</div>" +
      '<button type="button" class="czone__add" data-image-add>' +
      "<span>＋</span>" + UI.escapeHtml(label) + "</button>" +
      "</div>"
    );
  }

  /* ---------- 단계별 속내용 ---------- */

  function painBody(s) {
    return (
      field(
        "작성 문장",
        text("steps.pain.sentence", s.sentence, "40~50대 남성은 아침·관계 시 기능이 예전 같지 않아 괴로워서, 지금까지 비뇨병원 처방에 돈을 써왔다"),
        "[연령·성별·상황]은 [언제] [어떤 상태] 때문에 괴로워서, 지금까지 [어떤 대안]에 돈을 써왔다"
      ) +
      field(
        "좋은 페인포인트의 3요건",
        '<div class="pchecks">' +
          PAIN_CHECKS.map((c) =>
            checkRow("steps.pain.checks." + c.key, s.checks[c.key], c.label, c.hint)
          ).join("") +
          "</div>",
        "셋 다 충족해야 O 입니다. 면역력 · 피로회복 · 활력은 자각 시점이 없어 2단계에서 막힙니다"
      )
    );
  }

  function visualBody(s) {
    const refs = s.refs
      .map(
        (ref, i) =>
          '<div class="prow" data-prow="steps.visual.refs" data-index="' + i + '">' +
          line("", ref.label, "무엇을 참고했는지", "prow__a") +
          line("", ref.url, "https://", "prow__b") +
          '<button type="button" class="icon-btn" data-prow-remove aria-label="이 줄 삭제">✕</button>' +
          "</div>"
      )
      .join("");
    return (
      field("등급", pick("steps.visual.grade", s.grade, VISUAL_GRADES, "시각화 등급"),
        "촬영이 안 되면, 그 기능이 살아나면 생기는 일상의 변화를 대신 찍습니다") +
      field("비포 장면", text("steps.visual.before", s.before, "무엇을 어떻게 찍는지 한 줄")) +
      field("애프터 장면", text("steps.visual.after", s.after, "무엇을 어떻게 찍는지 한 줄")) +
      field(
        "참고 영상",
        '<div class="prows" data-prows="steps.visual.refs">' + refs +
          '<button type="button" class="btn btn--ghost btn--sm" data-prow-add>+ 링크 추가</button></div>',
        "경쟁사나 해외 브랜드의 실제 영상 1개 이상"
      )
    );
  }

  function marketBody(s) {
    const rows = s.rows
      .map(
        (row, i) =>
          '<tr><th scope="row">' + UI.escapeHtml(MARKET_ROWS[i] || "세부") + "</th>" +
          "<td>" + line("steps.market.rows." + i + ".keyword", row.keyword, i === 0 ? "탈모" : "탈모에좋은음식") + "</td>" +
          '<td class="num">' + line("steps.market.rows." + i + ".count", row.count, "월간 검색수", "num") + "</td>" +
          "<td>" + line("steps.market.rows." + i + ".note", row.note, i === 1 ? "구매 의도 높음" : "비고") + "</td></tr>"
      )
      .join("");
    return (
      field(
        "키워드와 월간 검색수",
        '<table class="ptable"><thead><tr><th>구분</th><th>키워드</th><th class="num">월간 검색수</th><th>비고</th></tr></thead>' +
          "<tbody>" + rows + "</tbody></table>",
        "세부키워드가 더 중요합니다. '탈모' 는 정보를 찾는 중이고, '탈모에 좋은 음식' 은 이미 돈 쓸 준비가 된 사람입니다. PC와 모바일을 합산해 적으세요"
      ) +
      field("추세 방향", pick("steps.market.direction", s.direction, TREND_DIRECTIONS, "추세 방향"),
        "줄어드는 시장에서 신규가 자리를 잡기는 어렵습니다") +
      field("계절성", text("steps.market.season", s.season, "언제 오르고 언제 내리는지")) +
      field("캡처", shots("steps.market.images", s.images, "데이터랩 · 검색광고 캡처 넣기"),
        "데이터랩에서 최근 3년 그래프를 보고 캡처를 붙입니다")
    );
  }

  function solutionBody(s) {
    return (
      field("알려진 원료", line("steps.solution.material", s.material, "레몬 + 글루타치온"),
        "이미 잘 알려진 원료를 쓰면 설득 비용이 0 입니다") +
      field("기존 인식", line("steps.solution.known", s.known, "미백에 좋다")) +
      field("우리의 처리", line("steps.solution.ours", s.ours, "고농축 조합")) +
      field(
        "원료+효능 조합 키워드",
        '<div class="pcombo">' +
          line("steps.solution.comboKeyword", s.comboKeyword, "서리태콩물두유") +
          line("steps.solution.comboCount", s.comboCount, "월 검색량", "num") +
          "</div>",
        "느낌이 아니라 숫자로. 이 원료가 그 효능으로 알려져 있다는 증거입니다"
      ) +
      field("근거 자료", text("steps.solution.proof", s.proof, "논문 · 시험성적서 · 특허 · 기능성 원료 인정 — 링크와 함께"),
        "상세페이지와 광고 소재의 근거로 그대로 쓰일 수 있는 자료 최소 1건")
    );
  }

  function rivalsBody(s) {
    const heads = ["경쟁 A", "경쟁 B", "경쟁 C", "우리(예정)"];
    const body = RIVAL_FIELDS.map((f) => {
      const cells = s.table
        .map((col, i) => {
          if (f.oursNA && i === 3) return '<td class="muted">—</td>';
          return "<td>" + line("steps.rivals.table." + i + "." + f.key, col[f.key], f.label) + "</td>";
        })
        .join("");
      return '<tr><th scope="row">' + UI.escapeHtml(f.label) + "</th>" + cells + "</tr>";
    }).join("");
    return (
      field(
        "경쟁사 3개 비교",
        '<table class="ptable ptable--rivals"><thead><tr><th>구분</th>' +
          heads.map((h) => "<th>" + UI.escapeHtml(h) + "</th>").join("") +
          "</tr></thead><tbody>" + body + "</tbody></table>",
        "같은 소재를 3개월 이상 돌리고 있다면 성과가 나오는 소재입니다. 메타 광고 라이브러리에서 게재 시작일을 보세요"
      ) +
      field("차별화 축", pick("steps.rivals.axis", s.axis, RIVAL_AXES, "차별화 축"), "하나만 고릅니다") +
      field("캡처", shots("steps.rivals.images", s.images, "경쟁사 · 광고 라이브러리 캡처 넣기"))
    );
  }

  function markBody(s) {
    const rows = s.candidates
      .map(
        (c, i) =>
          '<tr><th scope="row">' + (i + 1) + "순위</th>" +
          "<td>" + line("steps.mark.candidates." + i + ".name", c.name, "이름 후보") + "</td>" +
          "<td>" + line("steps.mark.candidates." + i + ".result", c.result, "키프리스 결과 — 걸림 없음 / 5류 선등록 등") + "</td></tr>"
      )
      .join("");
    return (
      field("상품분류", pick("steps.mark.niceClass", s.niceClass, NICE_CLASSES, "니스분류"),
        "같은 이름이라도 분류가 다르면 공존합니다. 제조사 · OEM 담당자에게 확인받으세요") +
      field(
        "후보 3개",
        '<table class="ptable"><thead><tr><th>순위</th><th>이름</th><th>키프리스 결과</th></tr></thead>' +
          "<tbody>" + rows + "</tbody></table>",
        "1순위가 막힐 것을 전제로 준비합니다. 원료명 + 어미가 우리 공식입니다"
      ) +
      field(
        "분해 검색",
        text("steps.mark.variants", s.variants,
          MARK_VARIANTS.map((v) => v.label + " (" + v.hint + ")").join(" · ")),
        "전체 이름만 검색하면 반드시 놓칩니다. 상표는 유사해도 거절됩니다"
      ) +
      field(
        "동시에 확인할 것",
        '<div class="pchecks">' +
          MARK_CHECKS.map((c) => checkRow("steps.mark.checks." + c.key, s.checks[c.key], c.label, "")).join("") +
          "</div>",
        "상표가 비어 있어도 이게 막히면 운영이 불편해집니다"
      ) +
      field("캡처", shots("steps.mark.images", s.images, "키프리스 결과 캡처 넣기"),
        "키프리스는 1차 걸러내기입니다. 출원 전에 변리사 검토를 받으세요")
    );
  }

  function adBody(s) {
    const cols = s.plans
      .map(
        (plan, i) =>
          '<div class="pad"><h5 class="pad__title">안 ' + (i + 1) + "</h5>" +
          AD_FIELDS.map(
            (f) =>
              '<p class="pad__label">' + UI.escapeHtml(f.label) + "</p>" +
              line("steps.ad.plans." + i + "." + f.key, plan[f.key], f.hint)
          ).join("") +
          "</div>"
      )
      .join("");
    return field(
      "서로 다른 3안",
      '<div class="pads">' + cols + "</div>",
      "페인포인트로 후킹하고, 비포애프터로 보여주고, 해결방안으로 납득시킵니다. 소재가 안 그려지면 1·2단계로 돌아가세요"
    );
  }

  const BODIES = {
    pain: painBody,
    visual: visualBody,
    market: marketBody,
    solution: solutionBody,
    rivals: rivalsBody,
    mark: markBody,
    ad: adBody,
  };

  /* ---------- 한 장 짜기 ---------- */

  function summaryTable(plan) {
    const rows = PLAN_STEPS.map((step) => {
      const s = plan.steps[step.key];
      const answered = (s.answer.text || "").trim();
      return (
        '<tr><th scope="row"><span class="pnum">' + step.n + "</span>" +
        UI.escapeHtml(step.title) + "</th>" +
        '<td class="psum__ask">' + UI.escapeHtml(step.short) + "</td>" +
        '<td><a class="psum__jump" href="#pstep-' + step.key + '">' +
        (answered ? UI.escapeHtml(answered) : '<span class="muted">아직 답이 없습니다</span>') +
        "</a></td></tr>"
      );
    }).join("");
    return (
      '<table class="ptable psum"><thead><tr><th>STEP</th><th>한 줄 질문</th><th>답변</th></tr></thead>' +
      "<tbody>" + rows + "</tbody></table>"
    );
  }

  function stepSection(step, s) {
    return (
      '<section class="pstep" id="pstep-' + step.key + '" data-step="' + step.key + '">' +
      '<header class="pstep__head">' +
      '<div><h3 class="pstep__title"><span class="pnum">' + step.n + "</span>" +
      UI.escapeHtml(step.title) + "</h3>" +
      '<p class="pstep__ask">' + UI.escapeHtml(step.ask) + "</p></div>" +
      "</header>" +
      '<p class="pstep__need">' + UI.escapeHtml(step.need) + " 로 답합니다</p>" +
      field("한 줄 답변", text("steps." + step.key + ".answer", s.answer, step.short),
        "위의 제출 양식에 그대로 들어갑니다") +
      '<div class="pstep__body">' + BODIES[step.key](s) + "</div>" +
      "</section>"
    );
  }

  /* 일곱 단계 어디에도 안 들어가는 것들. 요약표 바로 아래에 둔다 — 무엇이
     아직 안 정해졌는지가 답변과 나란히 보여야 한다. */
  function developHtml(plan) {
    return (
      '<section class="pdev">' +
      '<h3 class="pdev__title">디벨롭 필요사항</h3>' +
      '<p class="pdev__hint">아직 안 정해진 것, 더 알아봐야 할 것, 고민 중인 갈림길을 적어 두세요.</p>' +
      text("develop", plan.develop, "엉덩이 볼륨업으로 갈지 탄력업으로 갈지 · 골반도 가능성 있을지", "ptext--dev") +
      "</section>"
    );
  }

  function sheetHtml(idea) {
    const plan = idea.plan;
    return (
      '<div class="psheet" data-idea="' + idea.id + '">' +
      '<header class="psheet__head">' +
      '<p class="psheet__eyebrow">신제품·브랜드 기획 프로세스 v1.0</p>' +
      '<h2 class="psheet__name">' + UI.escapeHtml(idea.name) + "</h2>" +
      '<p class="psheet__star">★ 한 줄로 무엇인가?</p>' +
      text("oneLine", plan.oneLine, "디톡스로 잘 알려진 레몬. 레몬 대명사인 미국산 레몬을 고농축으로 담은 식품", "ptext--lead") +
      '<p class="psheet__note">이 한 줄이 안 나오면 7단계를 채울 필요도 없습니다.</p>' +
      "</header>" +
      '<div class="ptop">' +
      UI.photoZone(idea.images || [], { title: idea.name }) +
      summaryTable(plan) + "</div>" +
      developHtml(plan) +
      '<div class="psteps">' +
      PLAN_STEPS.map((step) => stepSection(step, plan.steps[step.key])).join("") +
      "</div>" +
      "</div>"
    );
  }

  /* ---------- 렌더 ---------- */

  function render(root, idea, onBack) {
    const filled = Store.planFilled(idea);
    root.innerHTML =
      '<div class="view__head view__head--tight">' +
      "<div>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="back">← 아이디어 목록</button>' +
      "</div>" +
      '<div class="view__actions">' +
      '<span class="psheet__count">답한 항목 ' + filled + " / " + PLAN_STEPS.length + "</span>" +
      '<button type="button" class="btn btn--ghost" data-act="print">인쇄 · PDF</button>' +
      "</div></div>" +
      sheetHtml(idea);

    bind(root, idea, onBack);
    Images.hydrate(root);
  }

  /* ---------- 묶기 ---------- */

  function bind(root, idea, onBack) {
    root.querySelector('[data-act="back"]').addEventListener("click", onBack);
    root.querySelector('[data-act="print"]').addEventListener("click", () => window.print());

    /* 눌러서 고치는 글 */
    root.querySelectorAll(".ptext").forEach((node) => {
      node.addEventListener("paste", (event) => {
        event.preventDefault();
        const value = (event.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, value);
      });
      node.addEventListener("blur", () => {
        Store.setPlan(idea.id, node.dataset.path, {
          text: node.innerText.replace(/ /g, " ").trim(),
        });
      });
    });

    /* 한 줄 입력칸 */
    root.addEventListener("change", (event) => {
      const target = event.target;
      if (target.dataset && target.dataset.line) {
        Store.setPlan(idea.id, target.dataset.line, target.value.trim());
        return;
      }
      if (target.dataset && target.dataset.pick) {
        Store.setPlan(idea.id, target.dataset.pick, target.value);
        App.render();
        return;
      }
      if (target.dataset && target.dataset.check) {
        Store.setPlan(idea.id, target.dataset.check, target.checked);
      }
    });

    UI.bindPhotoZone(root, {
      title: idea.name,
      list: () => ((Store.state.ideas.find((i) => i.id === idea.id) || {}).images || []).slice(),
      save: (list) => {
        Store.updateIdea(idea.id, { images: list });
        App.render();
      },
    });
    bindRows(root, idea);
    bindShots(root, idea);
  }

  /* 참고 영상처럼 줄을 늘렸다 줄였다 하는 칸 */
  function bindRows(root, idea) {
    root.querySelectorAll("[data-prows]").forEach((wrap) => {
      const path = wrap.dataset.prows;

      const collect = () =>
        Array.from(wrap.querySelectorAll(".prow"))
          .map((row) => ({
            label: row.querySelector(".prow__a").value.trim(),
            url: row.querySelector(".prow__b").value.trim(),
          }))
          .filter((row) => row.label || row.url);

      const save = () => Store.setPlan(idea.id, path, collect());

      wrap.addEventListener("change", save);
      wrap.addEventListener("click", (event) => {
        if (event.target.matches("[data-prow-add]")) {
          wrap.querySelector("[data-prow-add]").insertAdjacentHTML(
            "beforebegin",
            '<div class="prow">' +
              '<input type="text" class="input prow__a" placeholder="무엇을 참고했는지" aria-label="설명">' +
              '<input type="text" class="input prow__b" placeholder="https://" aria-label="링크">' +
              '<button type="button" class="icon-btn" data-prow-remove aria-label="이 줄 삭제">✕</button></div>'
          );
          return;
        }
        if (event.target.matches("[data-prow-remove]")) {
          event.target.closest(".prow").remove();
          save();
        }
      });
    });
  }

  /* 캡처 붙이는 칸. 컨셉보드와 같은 창을 쓴다. */
  function bindShots(root, idea) {
    root.querySelectorAll("[data-images]").forEach((zone) => {
      const path = zone.dataset.images;
      const grid = zone.querySelector(".czone__grid");
      const label = (zone.querySelector("[data-image-add]").textContent || "캡처 넣기")
        .replace("＋", "")
        .trim();

      const listOf = () => {
        const plan = Store.getPlan(idea.id) || { steps: {} };
        const keys = path.split(".");
        let node = plan;
        keys.forEach((key) => {
          node = (node || {})[key];
        });
        return Array.isArray(node) ? node.slice() : [];
      };

      function append(entries) {
        Store.setPlan(idea.id, path, listOf().concat(entries));
        App.render();
      }

      function takeFiles(files) {
        if (!files.length) return "";
        Promise.all(files.map((file) => Images.addFile(file).then((s) => s, () => null))).then(
          (results) => {
            const made = results.filter(Boolean).map((r) => ({ id: r.id, url: "" }));
            if (made.length) append(made);
            const msg = document.querySelector("[data-ipick-msg]");
            if (msg) msg.textContent = made.length + "장 담았습니다.";
          }
        );
        return files.length + "장 줄이는 중…";
      }

      zone.querySelector("[data-image-add]").addEventListener("click", () => {
        UI.openImagePicker({
          title: label,
          onFiles: takeFiles,
          onUrl: (safe) => {
            append([{ id: "url" + Date.now().toString(36), url: safe }]);
            return "주소를 넣었습니다.";
          },
        });
      });

      grid.addEventListener("click", (event) => {
        if (!event.target.matches("[data-image-remove]")) return;
        const index = Number(event.target.closest(".czone__item").dataset.imageIndex);
        const list = listOf();
        list.splice(index, 1);
        Store.setPlan(idea.id, path, list);
        App.render();
      });
    });
  }

  return { render, setActive, getActive };
})();
