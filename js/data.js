/* ============================================================
   도메인 데이터 — 분류 기준, 런칭 단계 정의, 초기 데이터
   ============================================================ */

/* 제형 기준 분류 */
const CATEGORIES = [
  { key: "ampoule", label: "앰플" },
  { key: "cleanser", label: "클렌저" },
  { key: "cream", label: "크림" },
  { key: "toner", label: "토너" },
  { key: "mask", label: "마스크팩" },
  { key: "body", label: "바디" },
];

/* 피부 고민 기준 분류 */
const EFFICACIES = [
  { key: "brightening", label: "미백" },
  { key: "firming", label: "탄력" },
  { key: "pore", label: "모공" },
  { key: "texture", label: "결" },
  { key: "trouble", label: "트러블" },
];

/* ---------- 제품 컨셉보드 ---------- */

/* 상표 · 비포애프터 같은 가부 판단 */
const CHECK_STATES = [
  { key: "", label: "확인 전" },
  { key: "yes", label: "가능" },
  { key: "checking", label: "확인 중" },
  { key: "no", label: "불가" },
];

/* 컨셉보드에 놓이는 칸들. 순서가 곧 화면 순서다. */
const CONCEPT_BLOCKS = [
  { key: "oneLiner", title: "한 줄 제품 컨셉", hint: "이 제품을 한 문장으로" },
  { key: "efficacy", title: "제품 효능 및 카테고리", hint: "어떤 고민을, 어떤 제형으로" },
  { key: "usp", title: "USP · 차별점", hint: "경쟁 제품 대신 이걸 골라야 하는 이유" },
  { key: "target", title: "타겟과 페인포인트", hint: "누가, 무엇 때문에 불편한가" },
];

/* 컨셉보드 머리에 붙는 한 줄짜리 제원. 이름도 내용도 고칠 수 있고, 줄을 더
   늘리거나 지워도 된다. 처음 열었을 때 어떤 칸인지 보이도록 기본 네 줄을
   깔아 둔다. */
const CONCEPT_SPECS = [
  { label: "카테고리", hint: "앰플" },
  { label: "효능", hint: "미백" },
  { label: "가격", hint: "미정" },
  { label: "용량", hint: "30ml" },
];

/* 아이디어가 지금 어디까지 왔는지 */
const STATUSES = [
  { key: "", label: "미정" },
  { key: "hold", label: "보류" },
  { key: "develop", label: "개발 진행" },
];

/* 예전 분류(스킨케어·메이크업 등)로 저장된 데이터를 위한 대응표.
   제형이 분명한 '바디'만 그대로 이어지고, 나머지는 다시 고르도록 비워 둔다. */
const LEGACY_CATEGORY_MAP = {
  body: "body",
  skincare: "",
  makeup: "",
  hair: "",
  inner: "",
  etc: "",
};

/* 런칭에 필요한 8단계. 각 단계는 기본 체크리스트를 가지며,
   체크된 비율이 그대로 해당 단계의 진행률이 된다. */
const STAGE_TEMPLATE = [
  {
    key: "planning",
    name: "제품 기획",
    desc: "무엇을, 누구에게, 왜 파는지 확정하는 단계",
    tasks: [
      "타깃 고객 정의",
      "컨셉 · 포지셔닝 확정",
      "핵심 효능 및 USP 정리",
      "경쟁사 벤치마킹",
      "예상 판매가 · 원가 구조 산정",
      "제품 기획서 작성",
    ],
  },
  {
    key: "manufacturer",
    name: "제조사 미팅",
    desc: "만들어 줄 파트너를 찾고 조건을 맞추는 단계",
    tasks: [
      "제조사 후보 리스트업",
      "견적 요청(RFQ) 발송",
      "미팅 진행 및 샘플 요청",
      "MOQ · 단가 · 리드타임 협의",
      "제조사 최종 선정",
      "계약 체결",
    ],
  },
  {
    key: "formula",
    name: "제형 확정",
    desc: "사용감과 전성분을 못 박고 상용화 가능한지 검증하는 단계",
    tasks: [
      "1차 샘플 수령 및 평가",
      "사용감 · 향 · 텍스처 피드백 정리",
      "수정 샘플 재요청",
      "전성분 확정",
      "용기 적합성(안정성) 확인",
      "제형 최종 컨펌",
    ],
  },
  {
    key: "clinical",
    name: "임상 진행",
    desc: "광고에 쓸 효능을 숫자로 증명하는 단계",
    tasks: [
      "임상 기관 선정",
      "시험 항목 확정 (보습 · 주름 · 미백 등)",
      "피험자 모집 및 IRB 승인",
      "임상 진행",
      "결과 리포트 수령",
      "표시광고 실증자료 확보",
    ],
  },
  {
    key: "design",
    name: "제품 디자인",
    desc: "손에 잡히는 용기와 패키지를 확정하는 단계",
    tasks: [
      "용기 · 구조 설계",
      "라벨 · 단상자 시안",
      "법정 표시사항 반영",
      "인쇄 감리용 교정",
      "디자인 최종 승인",
      "인쇄 발주",
    ],
  },
  {
    key: "production",
    name: "생산",
    desc: "실제로 물건을 찍어내고 창고에 넣는 단계",
    tasks: [
      "원부자재 발주",
      "생산 일정 확정",
      "본생산 진행",
      "품질 검사(QC)",
      "입고 및 재고 등록",
      "출고 · 판매 개시",
    ],
  },
  {
    key: "detailpage",
    name: "상세페이지 기획",
    desc: "고객을 설득할 문구와 구조를 짜는 단계",
    tasks: [
      "핵심 메시지 · 카피 설계",
      "페이지 구성안(와이어프레임)",
      "임상 결과 시각화 자료",
      "성분 스토리텔링 구성",
      "리뷰 · 후기 콘텐츠 계획",
      "최종 카피 법적 검수",
    ],
  },
  {
    key: "visual",
    name: "비주얼 기획",
    desc: "제품이 보여질 이미지와 톤을 만드는 단계",
    tasks: [
      "무드보드 · 톤앤매너 확정",
      "모델 · 촬영 컨셉 기획",
      "촬영 일정 및 스튜디오 예약",
      "제품컷 · 연출컷 촬영",
      "보정 및 에셋 정리",
      "채널별 이미지 리사이즈",
    ],
  },
];

/* 초기 데이터 — 일부러 비워 둔다.

   예전에는 실제 제품 아이디어와 배합 정보가 여기 들어 있었다. 그런데 이 파일은
   GitHub 저장소에서도, 사이트 주소(/js/data.js)로도 누구나 받아 볼 수 있다.
   사이트에 비밀번호를 걸어도 파일 주소를 직접 치면 그대로 읽힌다.

   그래서 회사 정보는 코드에 두지 않는다. 입력한 내용은 각자의 브라우저에만
   남고, 옮길 때는 [⚙ 설정] 의 백업 파일을 쓴다.

   처음 여는 브라우저에는 빈 보드가 뜬다. 백업 파일을 불러오면 채워진다. */
const SEED = {
  ideas: [],
  products: [],
  competitors: [],
};

/* 신제품·브랜드 기획 프로세스 v1.0 의 일곱 단계.

   앞에서부터 순서대로 답하면 기획서가 된다. 순서에 뜻이 있다 — 페인포인트가
   안 서면 비포애프터가 안 나오고, 비포애프터가 안 보이면 광고를 못 태운다.
   그래서 1·2 가 앞에 있고, 막히면 거기로 돌아간다. */
const PLAN_STEPS = [
  {
    key: "pain",
    n: 1,
    title: "페인포인트",
    ask: "누가 무엇 때문에 괴로운가?",
    need: "타겟을 특정한 한 문장",
    short: "무엇인가?",
  },
  {
    key: "visual",
    n: 2,
    title: "비포애프터",
    ask: "달라진 게 눈에 보이는가?",
    need: "비포 장면 · 애프터 장면",
    short: "보여줄 수 있니?",
  },
  {
    key: "market",
    n: 3,
    title: "시장 크기",
    ask: "사려는 사람이 충분히 많은가?",
    need: "네이버 검색량과 추세",
    short: "충분히 크니?",
  },
  {
    key: "solution",
    n: 4,
    title: "해결방안",
    ask: "문제 해결방안이 뾰족한가?",
    need: "알려진 원료 + 우리의 처리 + 근거 자료",
    short: "차별화되니?",
  },
  {
    key: "rivals",
    n: 5,
    title: "경쟁제품",
    ask: "누가 이미 하고 있는가?",
    need: "경쟁사 3개 + 차별화 축 1개",
    short: "이미 시장에 있니?",
  },
  {
    key: "mark",
    n: 6,
    title: "상표",
    ask: "이 이름을 쓸 수 있는가?",
    need: "키프리스 검색 결과 · 후보 3개",
    short: "상표 가능하니?",
  },
  {
    key: "ad",
    n: 7,
    title: "광고 소재",
    ask: "15초 영상이 그려지는가?",
    need: "서로 다른 3안",
    short: "어떻게 후킹해서 팔거니?",
  },
];

/* 대표가 항목별로 내리는 판정 */
const PLAN_VERDICTS = [
  { key: "", label: "판정 전", tone: "none" },
  { key: "o", label: "O 통과", tone: "good" },
  { key: "tri", label: "▲ 보완", tone: "warn" },
  { key: "x", label: "X 탈락", tone: "critical" },
];

/* 2단계 — 비포애프터를 보여줄 수 있는 정도 */
const VISUAL_GRADES = [
  { key: "", label: "미정" },
  { key: "direct", label: "직접 시각화 — 문제 부위를 그대로 촬영" },
  { key: "indirect", label: "간접 시각화 — 결과 행동을 대신 촬영" },
  { key: "none", label: "시각화 불가" },
];

/* 3단계 — 3년 추세의 방향 */
const TREND_DIRECTIONS = [
  { key: "", label: "미정" },
  { key: "up", label: "우상향 — 가산점" },
  { key: "flat", label: "평탄 — 무방" },
  { key: "down", label: "하락 — 고민" },
];

/* 5단계 — 골라야 할 차별화 축 하나 */
const RIVAL_AXES = [
  { key: "", label: "미정" },
  { key: "form", label: "제형 — 먹기 편함이 재구매를 가른다" },
  { key: "dose", label: "농도 — 업계 최고 함량" },
  { key: "mix", label: "원료 조합 — 새 이름을 만든다" },
  { key: "target", label: "타겟 세분화 — 특정 집단에만 조준" },
  { key: "price", label: "가격대 — 위나 아래로. 중간이 가장 위험" },
];

/* 6단계 — 니스분류. 같은 이름이라도 분류가 다르면 공존한다. */
const NICE_CLASSES = [
  { key: "", label: "미정" },
  { key: "3", label: "제3류 — 화장품" },
  { key: "5", label: "제5류 — 건강기능식품 · 영양보충제" },
  { key: "29", label: "제29류 — 가공식품" },
  { key: "30", label: "제30류 — 가공식품" },
  { key: "32", label: "제32류 — 음료 · 액상" },
];

/* 1단계 — 좋은 페인포인트의 3요건. 셋 다 되어야 O 다. */
const PAIN_CHECKS = [
  { key: "aware", label: "이미 자각하고 있다", hint: "설명 없이도 본인 문제를 안다" },
  { key: "spend", label: "이미 돈을 쓰고 있다", hint: "병원 · 시술 · 다른 제품 지출 이력" },
  { key: "search", label: "이미 검색해봤다", hint: "3단계에서 숫자로 확인한다" },
];

/* 6단계 — 상표가 비어 있어도 이게 막히면 운영이 불편해진다 */
const MARK_CHECKS = [
  { key: "naver", label: "네이버에 엉뚱한 게 나오지 않는지" },
  { key: "store", label: "스마트스토어 · 쿠팡 상품명 중복" },
  { key: "handle", label: "인스타그램 · 유튜브 핸들" },
];

/* 6단계 — 전체 이름만 검색하면 반드시 놓친다. 분해해서 본다. */
const MARK_VARIANTS = [
  { key: "full", label: "전체명", hint: "레몬타치온" },
  { key: "head", label: "앞마디", hint: "레몬타" },
  { key: "tail", label: "뒷마디", hint: "타치온" },
  { key: "mid", label: "중간 절단", hint: "몬타치온" },
  { key: "similar", label: "유사 발음", hint: "레모타치온, 레몬키오" },
];

/* 3단계 — 세부키워드가 더 중요하다. '탈모' 는 정보를 찾는 중이고
   '탈모에 좋은 음식' 은 이미 돈 쓸 준비가 된 사람이다. */
const MARKET_ROWS = ["대표", "세부 1", "세부 2", "세부 3", "세부 4", "세부 5"];

/* 5단계 — 경쟁사 비교표의 줄 */
const RIVAL_FIELDS = [
  { key: "name", label: "브랜드 · 제품명" },
  { key: "price", label: "가격 · 용량" },
  { key: "form", label: "제형" },
  { key: "pitch", label: "핵심 소구 한 줄" },
  { key: "reviews", label: "리뷰수", oursNA: true },
  { key: "adDays", label: "광고 집행 기간", oursNA: true },
];

/* 7단계 — 각 안은 이 네 칸이 전부다. 스토리보드는 필요 없다. */
const AD_FIELDS = [
  { key: "hook", label: "3초 후킹", hint: "첫 대사 · 장면" },
  { key: "ba", label: "비포애프터 표현", hint: "무엇을 어떻게 보여주는가" },
  { key: "who", label: "화자와 상황", hint: "누가, 어떤 상황에서" },
];
