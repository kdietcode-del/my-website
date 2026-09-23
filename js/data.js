/* ============================================================
   도메인 데이터 — 분류 기준, 런칭 단계 정의, 초기 데이터
   ============================================================ */

/* 제형 기준 분류 */
const CATEGORIES = [
  { key: "ampoule", label: "앰플" },
  { key: "cleanser", label: "클렌저" },
  { key: "cream", label: "크림" },
  { key: "toner", label: "토너" },
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
];

/* 아이디어 덤프 초기 내용 — 구글 스프레드시트 '뷰티 제품 아이디어 리스트' 를 옮긴 것.
   샘플이 아니라 실제 데이터라 '샘플 지우기' 로 지워지지 않는다. */
const SEED = {
  ideas: [
    {
      kind: "idea",
      name: "Advanced Dark Spot Ampoule — Tone Recovery Complex",
      category: "ampoule",
      efficacyType: "brightening",
      efficacy: "잡티 색소침착 흔적을 깨끗하게 없애는 스포이드 앰플",
      ingredients:
        "Niancinamide 5% / Alpha-albutin 2% / 3-O-Ethyl Ascorbic Acid 1% / Cica-Panthenol 20,000ppm",
      usp: "매일 앰플 바르는 것을 속도감 있게 보여주고, 잡티가 연해지는 것",
      tags: ["잡티흔적"],
      refs: [
        { label: "기능 참고 — Teashell 앰플", url: "" },
        { label: "디자인 참고 — 에스티로더 갈색병 + Teashell 앰플", url: "" },
      ],
      status: "develop",
      memo: "레몬타치온 다크 스팟 앰플로 진행중",
    },
    {
      kind: "idea",
      name: "Lemo-Toning Double Capsule Serum",
      category: "ampoule",
      efficacyType: "brightening",
      efficacy: "두 가지 미백 캡슐로 흔적부터 톤업까지 잡는 미백 세럼",
      ingredients:
        "VITA C + LEMON COMPLEX™ 7% / NIACINAMIDE 5% / TRANEXAMIC ACID 1% / CICA-PANTHENOL 10,000ppm",
      usp:
        "2가지 색의 캡슐이 얼굴 위에서 으깨지며 펴바르면 자연스러운 톤업이 되는 모습, " +
        "그리고 하루하루 바르면서 점점 환해지는 얼굴",
      tags: ["톤업미백"],
      refs: [],
      status: "hold",
      memo: "",
    },
    {
      kind: "idea",
      name: "Wash-off Body Treatment",
      category: "body",
      efficacyType: "texture",
      efficacy:
        "바디워시 후 샤워 중에 바른 다음 씻어내면 보습이 완료되는, 바디로션이 필요 없는 바디 트리트먼트",
      ingredients: "계면활성제 없는 보습 성분",
      usp: "",
      tags: ["바디"],
      refs: [{ label: "닥터포포 올인원 워시 & 컨디셔너", url: "" }],
      status: "hold",
      memo: "",
    },
    {
      kind: "idea",
      name: "Air Bubble Body Lotion",
      category: "body",
      efficacyType: "firming",
      efficacy:
        "공기처럼 가벼운 버블 폼이 피부에 닿는 순간 부드럽게 녹아드는 바디로션. " +
        "기존 바디크림 특유의 미끄러움과 유분감을 최소화하고, 쿨링감을 더해 붓고 지친 듯한 " +
        "바디 피부를 산뜻하게 관리하는 데일리 바디 탄력 케어.",
      ingredients: "멘톨 또는 쿨링 성분 / 히알루론산 / 나이아신아마이드 / PDRN 등",
      usp:
        "에어버블 제형이라 적은 롤링으로 빠르고 가볍게 흡수되고 마무리가 산뜻함. " +
        "셀룰라이트 완화 · 피부 탄력 개선 · 피부 진정.",
      tags: ["바디"],
      refs: [
        { label: "신신제약 레그핏 에어버블 (다리 붓기 꿀템)", url: "" },
        { label: "가쉬 에어버블팩", url: "" },
      ],
      status: "",
      memo: "",
    },
    {
      kind: "idea",
      name: "PORE OUT BHA BALM",
      category: "cream",
      efficacyType: "pore",
      efficacy:
        "피지 연화 밤. 세안 후 코 옆 등 피지 많은 부위에 발라주면 체온에 녹으며 피지를 열어주고, " +
        "롤링하면 피지가 뽑혀 나오는 제품.",
      ingredients: "",
      usp: "",
      tags: ["피지 요철"],
      refs: [],
      status: "",
      memo: "보통 클렌징 오일로 관리하라고 하는데, 클렌징 오일은 호불호가 있어서.",
    },
    {
      kind: "idea",
      name: "POST-TROUBLE RECOVERY GEL",
      category: "cream",
      efficacyType: "trouble",
      efficacy: "트러블 애프터 케어 제품. 압출 후 흉터가 남지 않도록 하는 진정 재생 겔.",
      ingredients: "",
      usp: "",
      tags: ["트러블진정"],
      refs: [],
      status: "",
      memo: "'재생' 이라는 단어를 쓸 수 없어서 워딩 개발이 필요함.",
    },
    {
      kind: "idea",
      name: "Lemon-Tathione Dark Spot Cream",
      category: "cream",
      efficacyType: "brightening",
      efficacy: "",
      ingredients: "",
      usp: "",
      tags: ["잡티흔적"],
      refs: [],
      status: "",
      memo: "",
    },
    {
      kind: "idea",
      name: "Lemo-Toning Gel Patch Mask",
      category: "",
      efficacyType: "brightening",
      efficacy:
        "열감 완화 + 피부 진정 + 피부 톤업 + 모공 탄력 패치(겔 마스크). " +
        "떼어내자마자 즉각적으로 안색이 맑아지는 제품.",
      ingredients: "미네랄 워터, 카라기난, 피브이비, 알지네이트 콤플렉스",
      usp: "",
      tags: ["톤업미백"],
      refs: [
        { label: "디자인 참고 — 릴스", url: "" },
        { label: "스킨시딘 멀티 토닝 마스크 — 아쿠아겔 멸균 마스크", url: "" },
      ],
      status: "",
      memo: "",
    },
  ],
  products: [
    {
      name: "무화과 시카 진정 앰플 30ml",
      category: "ampoule",
      owner: "kdietcode",
      targetDate: "",
      targetPrice: 32000,
      memo: "1차 목표: 자사몰 선런칭 후 올리브영 입점 제안.",
      doneUpTo: 2, // 앞의 2개 단계는 완료, 3번째는 절반 진행된 상태로 생성
    },
  ],
  competitors: [
    {
      brand: "라운드랩",
      name: "자작나무 수분 앰플",
      price: 28000,
      volume: "50ml",
      ingredients: "자작나무 수액, 히알루론산",
      claims: "수분 충전, 저자극",
      channel: "올리브영 · 자사몰",
      url: "",
      rating: 4,
      memo: "용량 대비 가격이 강점. 우리는 30ml라 단가 설명이 필요함.",
    },
    {
      brand: "닥터지",
      name: "레드 블레미쉬 클리어 수딩 앰플",
      price: 25000,
      volume: "30ml",
      ingredients: "센텔라아시아티카, 판테놀",
      claims: "민감 진정, 붉은기 완화",
      channel: "올리브영",
      url: "",
      rating: 5,
      memo: "진정 카테고리 1위. 정면 승부보다 향 · 감성으로 비켜가야 함.",
    },
  ],
};
