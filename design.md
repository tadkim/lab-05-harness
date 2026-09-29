# design.md — lab-05-harness 디자인 시스템

> 출처: Figma [`lab-05-harness`](https://www.figma.com/design/gy48ZiX9VkuKiQiKvm7DZd/lab-05-harness?node-id=0-1) (fileKey `gy48ZiX9VkuKiQiKvm7DZd`)
> 기준 시점: 2026-09-29 로컬 Variables(6 컬렉션, 213개) + 참고 사례 `10:4015`, `5:318`
> 코드: [`tokens/tokens.css`](tokens/tokens.css) — [`tokens/figma-variables.json`](tokens/figma-variables.json)에서 `node tokens/build.mjs`로 생성
>
> 이 문서는 UI를 만들거나 고칠 때 **값을 하드코딩하지 않고 토큰을 고르기 위한 기준**이다. Figma 값이 바뀌면 JSON을 다시 내보내고 CSS와 이 문서를 갱신한다.
>
> **근거 표기** — `[변수]` Figma 로컬 Variables · `[사례]` 이미지 슬라이드 참고 예시 `10:4015` · `[슬라이드]` 모풍 이미지 슬라이드 `5:318` · `[원칙]` 허들링 가이드에서 가져온 원칙 · `[PRD]` [prd.md](prd.md)

---

## 0. 에이전트 작업 규칙

1. 색·간격·radius·크기·타이포는 **반드시 토큰으로** 쓴다. Figma에서는 변수 바인딩, 코드에서는 `var(--…)`. hex/px 직접 입력 금지.
2. **먼저 맥락(§2 레벨)을 고른다.** 콘텐츠를 보여 주는 섹션이면 `editorial`, 폼·다이얼로그·버튼 같은 조작 화면이면 UI 레벨.
3. 토큰 선택 우선순위: `component/*` → `editorial/*`(해당 맥락일 때) → `semantic/*` → `scale/*`. `primitive/*`는 직접 쓰지 않는다(새 primitive는 Figma 피커에서도 숨김).
4. 필요한 토큰이 없으면 임의 값을 만들지 말고 §13 공백 표의 임시값 + `TODO(token)`으로 표시하고 보고한다.
5. 언어 모드 기본값은 `ko`, 영문 전용 화면만 `en`. 에디토리얼 모드 기본값은 `mobile`, 1024px 이상에서 `desktop`.
6. 값이 이 문서와 Figma 사이에서 다르면 **Figma 변수가 이긴다.** 문서와 `tokens/`를 갱신하고 차이를 보고한다.

---

## 1. Overview

lab-05-harness는 발달장애인이 일상에서 겪는 "어려운 정보"(약 봉투, 카페 키오스크, 화장품 성분, 여권 신청서 등)를 사진과 짧은 글로 보여 주는 콘텐츠 화면이다. 인터페이스는 **밝은 무채색 바탕 위에 사진이 색을 담당**하는 구조이고, 계층은 그림자가 아니라 **굵기 대비와 여백**으로 만든다. `[사례]` 사용자가 현재 상태와 다음 행동을 쉽게 이해하는 것이 시각적 표현보다 먼저다. `[PRD]`

**핵심 특징**
- **무채색 크롬, 사진이 유일한 채도** — 배경·텍스트·컨트롤은 회색 단계만 쓰고, 색은 콘텐츠 사진에서 나온다. `[사례]` `[원칙]`
- **굵기 대비로 위계** — 제목 Bold ↔ 설명 Regular. `[사례]`
- **자간 0, 넉넉한 행간** (에디토리얼 레벨) — 행간 125~160%. `[사례]`
- **그림자 없음** — 면의 명도 차이와 얇은 선으로만 구분. `[사례]` `[원칙]`
- **가로로 넘기는 갤러리** — 다음 카드 일부가 보이게 해서 "더 있음"을 알린다. `[사례]`
- **원형 컨트롤 + 숫자 인덱스** — 이전/다음은 흰 원형 버튼, 현재 위치는 `1/5` 숫자로. 점(dot) 색만으로 위치를 알리지 않는다. `[사례]` `[PRD]`
- **브랜드 초록은 모풍 콘텐츠 흐름에서만** — `action/brand`는 콘텐츠 진행 CTA에 한정. `[슬라이드]`

---

## 2. 레벨 구조 `[변수]`

두 가지 맥락을 **둘 다 유지**하되, 같은 역할에서 값만 조금 어긋난 것은 하나로 합쳤다(§2.3).

```
L1 Foundation   primitive/*  scale/*  radius/scale/*  icon/*  font-weight/*  font-family/*
      │
L2 Semantic     semantic/*  (text · bg · border · action · page · section · grid)   ← 맥락 공통
      │
      ├── L3a UI 맥락          텍스트 스타일 14종 (display/title/body/label), semantic/page/x/mobile 16
      │                        폼 · 다이얼로그 · 버튼 · 입력창
      │
      └── L3b Editorial 맥락   DS-local/editorial  (mode: mobile / desktop)
                               editorial/layout/*  editorial/type/*
                               콘텐츠 섹션 · 갤러리 · 사진 카드
      │
L4 Component    component/button/*  component/input/*  component/chip/*          (UI)
                component/gallery-card/*  component/tag/*  component/paginator/*
                component/icon-button/*                                            (Editorial)
```

### 2.1 컬렉션

| 컬렉션 | 모드 | 변수 수 | 레벨 |
|---|---|---|---|
| `DS-local/color` | Mode 1 | 63 | L1 primitive · L2 semantic · L4 component 색 |
| `DS-local/spacing` | Mode 1 | 31 | L1 scale · L2 page/section/grid · L4 button/input/tag padding |
| `DS-local/radius` | Mode 1 | 10 | L1 scale · L4 chip/tag/icon-button |
| `DS-local/sizing` | Mode 1 | 11 | L1 icon · control 높이 · hit area · focus ring |
| `DS-local/typography` | `ko`, `en` | 64 | L1 폰트·굵기 · L3a UI 타입 스케일 |
| `DS-local/editorial` | `mobile`, `desktop` | 34 | L3b 에디토리얼 레이아웃·타입 · L4 갤러리 컴포넌트 크기 |

텍스트 스타일 14종(UI 레벨)이 있고, paint / effect style은 없다. 모든 로컬 변수에 WEB code syntax(`var(--이름)`)가 설정되어 있어 Dev Mode에서 CSS 변수명이 보인다.

### 2.2 맥락 고르기

| 만드는 것 | 레벨 | 페이지 여백 | 타입 |
|---|---|---|---|
| 콘텐츠 소개 섹션, 사진 갤러리, 이미지 슬라이더 본문 | Editorial | `editorial/layout/page-x` (24 / 120) | `editorial/type/*` (자간 0, Bold/Regular) |
| 다이얼로그, 폼, 설정, 버튼 영역 | UI | `semantic/page/x/mobile` (16) | 텍스트 스타일 14종 (음수 자간, Medium/Semibold) |
| 한 화면에 둘 다 | 섹션 단위로 나눈다 | 섹션마다 자기 레벨 | 섞지 않는다 |

### 2.3 "둘 다 유지" 검토 결과

| 구분 | 항목 | 결정 | 이유 |
|---|---|---|---|
| **유지 (맥락 차이)** | 페이지 좌우 여백 16 vs 24 | 둘 다: UI 16, Editorial 24 | 조작 화면은 폭이 필요하고, 콘텐츠 섹션은 여백이 읽기 리듬을 만든다 |
| | 자간 음수 vs 0 | 둘 다: UI 음수, Editorial 0 | 짧은 UI 라벨은 촘촘하게, 긴 한글 설명은 자연 자간이 더 잘 읽힌다 |
| | 굵기 Medium/Semibold vs Bold/Regular | 둘 다. `font-weight/regular` 추가 | Editorial은 대비로 위계를 만든다 |
| | 모바일/데스크톱 값 | Editorial 컬렉션 모드로 | 같은 이름의 토큰이 화면 크기만 따라 바뀌게 |
| **통합 (같은 역할, 값만 어긋남)** | `#000000` → `text/primary` `#111111` | 통합 | 체감 차이 없음 |
| | `#595959`·`#666666` → `neutral/600` `#595959` | 통합 | 같은 역할(설명 텍스트). canvas 위 대비가 더 높은 쪽(6.04:1)을 택함 |
| | `#454545` → `text/secondary` `#444444` | 통합 | 체감 차이 없음 |
| | 사진 radius 18 → 16 | 통합 | 기존 `radius/scale/lg` |
| | 페이지네이터 gap 30 → 32, 헤드→갤러리 33/59 → 32/64 | 통합 | 기존 scale |
| | 원형 버튼 radius 17.07 / 21.33 → full | 통합 | 원형이 의도 |
| | 원형 버튼 외곽선 검정 0.36px → 1px `border/default` | 통합 | 반 픽셀 이하 선은 기기마다 다르게 보인다. 버튼 식별 대비는 화살표 아이콘이 담당 |

---

## 3. Color `[변수]`

### 3.1 Primitive (직접 사용 금지)

| 토큰 | 값 | 메모 |
|---|---|---|
| `primitive/neutral/0` | `#FFFFFF` | |
| `primitive/neutral/50` | `#FAFAFA` | |
| `primitive/neutral/100` | `#F5F5F5` | subtle surface |
| `primitive/neutral/150` | `#EEEEEE` | **신규** · 에디토리얼 캔버스 (scope 숨김) |
| `primitive/neutral/200` | `#EDEDED` | subtle surface |
| `primitive/neutral/300` | `#D9D9D9` | |
| `primitive/neutral/500` | `#8A8A8A` | muted / disabled text |
| `primitive/neutral/600` | `#595959` | **신규** · 부제·설명 (scope 숨김) |
| `primitive/neutral/700` | `#444444` | |
| `primitive/neutral/900` | `#111111` | |
| `primitive/brand/light` | `#EAF1F1` | 연초록. 보조 버튼·탭 영역 배경 (운영 `$proj-lightgreen`) |
| `primitive/brand/700` | `#325253` | 풍속도 기준 초록 (운영 `$proj-darkgreen`) |
| `primitive/brand/sky` | `#B4D0E3` | 인트로·바깥 하늘 배경 (운영 `$proj-skyblue`) |
| `primitive/status/error` | `#FFECEC` | 에러 연분홍 |
| `primitive/status/disabled` | `#DFDFDF` | 비활성 회색 |
| `primitive/system/red` | `#E5474D` | 오류 빨강 |
| `primitive/system/blue` | `#2563EB` | 초점 테두리 파랑 |

### 3.2 Semantic

**Text** (scope: TEXT_FILL)

| 토큰 | 참조 | 값 | 용도 |
|---|---|---|---|
| `semantic/text/primary` | neutral/900 | `#111111` | 제목, 카드 제목, 인덱스 |
| `semantic/text/secondary` | neutral/700 | `#444444` | 보조 텍스트, 태그 텍스트 |
| `semantic/text/tertiary` | neutral/600 | `#595959` | **신규** · 섹션 부제, 카드 설명 |
| `semantic/text/accent` | brand/700 | `#325253` | 초록 강조 텍스트 (운영 `$text-secondary`) |
| `semantic/text/muted` | neutral/500 | `#8A8A8A` | 캡션, 메타 정보 — **흰 배경에서만** (canvas 위 2.98:1 미달) |
| `semantic/text/disabled` | neutral/500 | `#8A8A8A` | 비활성 텍스트 |
| `semantic/text/inverse` | neutral/0 | `#FFFFFF` | 어두운 배경 위 텍스트 |

**Background** (scope: FRAME_FILL, SHAPE_FILL)

| 토큰 | 참조 | 값 | 용도 |
|---|---|---|---|
| `semantic/bg/default` | neutral/0 | `#FFFFFF` | 기본 배경, 태그·원형 버튼 면 |
| `semantic/bg/canvas` | neutral/150 | `#EEEEEE` | **신규** · 에디토리얼 섹션 바탕 |
| `semantic/bg/subtle` | neutral/50 | `#FAFAFA` | 약한 배경 |
| `semantic/bg/muted` | neutral/100 | `#F5F5F5` | UI 화면의 카드 밖 배경, 구분 영역 |
| `semantic/bg/inverse` | neutral/900 | `#111111` | 어두운 배경 |
| `semantic/bg/brand-light` | brand/light | `#EAF1F1` | 연초록 면 (보조 버튼 배경 등) |
| `semantic/bg/brand-sky` | brand/sky | `#B4D0E3` | 탭 테마 배경 — 리워드 |
| `semantic/bg/status-error` | status/error | `#FFECEC` | 에러/경고 배경 |
| `semantic/bg/status-disabled` | status/disabled | `#DFDFDF` | 비활성 컨테이너 |

**Border** (scope: STROKE_COLOR)

| 토큰 | 참조 | 값 | 용도 |
|---|---|---|---|
| `semantic/border/strong` | neutral/700 | `#444444` | 강조 외곽선 |
| `semantic/border/default` | neutral/300 | `#D9D9D9` | 기본 외곽선, 원형 버튼 외곽선 |
| `semantic/border/subtle` | neutral/200 | `#EDEDED` | 약한 외곽선 |
| `semantic/border/focus` | system/blue | `#2563EB` | 키보드 포커스 링 (흰 배경 5.17:1, canvas 4.45:1) |

**Action** (scope: FRAME_FILL, SHAPE_FILL, STROKE_COLOR)

| 토큰 | 참조 | 값 | 용도 |
|---|---|---|---|
| `semantic/action/primary` | neutral/900 | `#111111` | 기본 주요 액션 (검정 CTA) |
| `semantic/action/primary-hover` | neutral/700 | `#444444` | hover |
| `semantic/action/primary-pressed` | neutral/900 | `#111111` | pressed |
| `semantic/action/brand` | brand/700 | `#325253` | 브랜드 CTA (초록) |
| `semantic/action/disabled` | neutral/300 | `#D9D9D9` | 비활성 액션 |

### 3.3 Component

**Button** (UI)

| 토큰 | 값 |
|---|---|
| `component/button/primary/bg/default` · `hover` · `pressed` · `disabled` | → action/primary · primary-hover · primary-pressed · disabled |
| `component/button/primary/border/focus` | → border/focus |
| `component/button/secondary/bg/default` | → bg/brand-light `#EAF1F1` |
| `component/button/secondary/bg/hover` · `pressed` | `#FAFAFA` · `#F5F5F5` (하드코딩, §14-2) |
| `component/button/secondary/text/default` | → text/accent |
| `component/button/secondary/border/focus` | → border/focus |

**Input** (UI)

| 토큰 | 값 | 메모 |
|---|---|---|
| `component/input/bg/default` · `filled` | → bg/default | |
| `component/input/bg/disabled` | → bg/muted | |
| `component/input/text/default` | → text/primary | |
| `component/input/border/focus` | → border/focus | |
| `component/input/border/error` | → system/red | |

**Tag / Icon button** (Editorial, 신규)

| 토큰 | 값 | 메모 |
|---|---|---|
| `component/tag/bg` | → bg/default | |
| `component/tag/text` | → text/secondary | |
| `component/icon-button/bg` | → bg/default | |
| `component/icon-button/border` | → border/default | 1px |
| `component/icon-button/icon` | → text/primary | 비텍스트 대비 담당 |

### 3.4 색 사용 원칙
- 바탕은 밝은 무채색, 텍스트는 거의 검정. 채도는 사진에만. `[사례]`
- 초록(`action/brand`, `text/accent`, `bg/brand-light`)은 모풍/풍속도 콘텐츠 진행 액션에만. `[슬라이드]`
- `bg/canvas` 위에는 `text/primary` · `secondary` · `tertiary`만. `text/muted`는 대비 미달. `[변수]`
- 상태(현재 위치·재생 여부)를 색 하나로만 전달하지 않는다. 숫자·아이콘·텍스트를 함께 쓴다. `[PRD]`
- 새 강조색을 추가하지 않는다. `[원칙]`

---

## 4. Layout & Responsive

### 4.1 화면 기준

| 이름 | 프레임 | Editorial 모드 | 코드 조건 |
|---|---|---|---|
| Mobile | 360 × 674 `[사례]` | `mobile` | 기본값 |
| Desktop | 1440 × 900 `[사례]` | `desktop` | `@media (min-width: 1024px)` |

- **1024px 경계는 코드 쪽 결정**이다. Figma에는 breakpoint 변수가 없고 사례 프레임은 360과 1440뿐이다. 태블릿(600~1023)은 모바일 값으로 동작한다.
- Figma에서 데스크톱 프레임을 만들 때는 프레임에 `DS-local/editorial` 모드를 `desktop`으로 지정한다.
- 가로 스크롤은 갤러리 트랙 안에서만 허용한다.

### 4.2 Editorial 레이아웃 토큰

| 토큰 | mobile | desktop | 구간 |
|---|---|---|---|
| `editorial/layout/page-x` | 24 (→`scale/24`) | 120 | 페이지 좌우 여백 |
| `editorial/layout/page-top` | 56 | 112 | 프레임 상단 → 섹션 제목 |
| `editorial/layout/head-gap` | 10 (→`scale/10`) | 12 (→`scale/12`) | 제목 → 부제 |
| `editorial/layout/head-to-content` | 32 (→`section/y/sm`) | 64 (→`section/y/lg`) | 섹션 헤드 → 갤러리 |
| `editorial/layout/card-gap` | 12 (→`grid/gap/sm`) | 24 (→`scale/24`) | 카드 사이 |

### 4.3 반응형 전략 `[사례]`
- **갤러리는 접지 않고 넘긴다.** 카드 트랙이 오른쪽 가장자리를 넘어 이어지고 다음 카드가 일부 보인다. 카드 수가 아니라 크기와 여백이 바뀐다.
- 모바일 카드 너비 288 = 360 − 왼쪽 여백 24 − 다음 카드 노출 48.
- 모바일 페이지네이터는 `현재/전체` 인덱스를 보여 준다. 데스크톱 사례에는 인덱스가 없지만, PRD 기준 현재 위치 표시는 필수이므로 **데스크톱에도 인덱스를 둔다**. `[PRD]`
- 섹션 부제는 화면 크기별로 문구가 다르다. 좁은 화면에서는 조작 안내("옆으로 넘기며 하나씩 살펴보세요.")를 우선한다.
- 모바일에서는 버튼과 함께 swipe로도 넘길 수 있게 한다. `[PRD]`

### 4.4 여백 철학 `[원칙]`
구분선 대신 여백으로 묶는다. 섹션 사이에는 선을 긋지 않고 `section/y/*` 간격을 둔다.

---

## 5. Typography

### 5.1 폰트 `[변수]`
- 패밀리: 모든 역할 `NeutronicHangeul`. 코드 fallback: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
- 굵기 토큰: `font-weight/regular` 400(**신규**) · `medium` 500 · `semibold` 600 · `bold` 700 (Figma 스타일명은 `Semibold`, 띄어쓰기 없음)

### 5.2 UI 레벨 — 텍스트 스타일 14종 (`ko` 기준)

| 스타일 | 굵기 | size | line-height | letter-spacing | `en` 모드 차이 |
|---|---|---|---|---|---|
| `display/lg` | Semibold | 48 | 62.4 | -2 | 38 / 41.8 / -1 |
| `display/md` | Medium | 20 | 26 | -0.8 | 16 / 20.8 / -0.5 |
| `title/lg` | Semibold | 22 | 33 | -0.5 | 20 / 26 |
| `title/md` | Semibold | 20 | 30 | -0.5 | lh 26 |
| `title/sm` | Medium | 16 | 24 | -0.5 | ls 0 |
| `title/xs` | Semibold | 14 | 21 | -0.5 | 12 / 18 / 0, **Medium** |
| `body/lg` | Medium | 22 | 30.8 | -0.5 | 21 / 29.4 / -0.3 |
| `body/md` | Medium | 18 | 23.4 | 0 | — |
| `body/sm` | Medium | 14 | 22.4 | -0.3 | lh 21 |
| `body/xs` | Medium | 12 | 19.2 | -0.3 | — |
| `label/lg` | Medium | 24 | 31.2 | 0 | — |
| `label/md` | Medium | 18 | 23.4 | 0 | — |
| `label/sm` | Medium | 16 | 20.8 | 0 | 15 / 15 |
| `label/xs` | Medium | 13 | 20.8 | -0.3 | 12 / 15.6 / 0 |

용도: `display` 히어로 · `title` 화면/다이얼로그 제목 · `body` 본문 · `label` 버튼·탭·chip (버튼 기본 `label/sm`)

### 5.3 Editorial 레벨 — `editorial/type/*` (신규)

자간은 모두 `editorial/type/letter-spacing` = 0, 패밀리는 `editorial/type/font-family` → `font-family/body`.

| 역할 | 토큰 접두어 | 굵기 | mobile size / lh | desktop size / lh | 비율 |
|---|---|---|---|---|---|
| 섹션 제목 | `editorial/type/heading/*` | Bold | 30 / 39 | 48 / 60 | 130% / 125% |
| 섹션 부제 | `editorial/type/subtitle/*` | Regular | 15 / 22.5 | 18 / 27 | 150% |
| 카드 제목 | `editorial/type/card-title/*` | Bold | 17 / 27.2 | 20 / 32 | 160% |
| 카드 설명 | `editorial/type/card-body/*` | Regular | 15 / 24 | 16 / 25.6 | 160% |
| 태그 | `editorial/type/tag/*` | Bold | 13 / 16.9 | 14 / 18.2 | 130% |
| 페이지 인덱스 | `editorial/type/index/*` | Medium | 16 / 20.8 | 16 / 20.8 | 130% |

각 역할마다 `size` · `line-height` · `weight` 3개 변수가 있다. 행간은 Figma가 px만 받으므로 비율을 px로 환산해 저장했다.

### 5.4 타이포 원칙
- **굵기 대비가 위계를 만든다.** Editorial은 Bold ↔ Regular. `[사례]`
- **레벨을 섞지 않는다.** 한 섹션 안에서 UI 텍스트 스타일과 `editorial/type/*`를 함께 쓰지 않는다.
- 카드 제목은 따옴표로 감싼 **당사자의 질문**("10정이 뭐예요?"), 설명은 2~3줄의 구어체. `[사례]`
- 숫자 인덱스는 장식이 아니라 상태 정보다. `[PRD]`

---

## 6. Spacing `[변수]`

**Scale:** `scale/0` 0 · `2` · `4` · `6` · `8` · `10` · `12` · `16` · `20` · `24` · `32` · `40` · `48` · `64`

| 토큰 | 값 | 용도 |
|---|---|---|
| `semantic/page/x/mobile` | 16 | UI 화면 좌우 여백 |
| `semantic/page/y/mobile` | 24 | UI 화면 상하 여백 |
| `semantic/section/y/sm` · `md` · `lg` | 32 · 48 · 64 | 섹션 사이 |
| `semantic/grid/gap/sm` · `md` | 12 · 16 | 카드 사이 |
| `component/button/x/lg` · `md` · `sm` | 20 · 16 · 12 | 버튼 좌우 padding |
| `component/button/y/lg` · `md` · `sm` | 12 · 10 · 8 | 버튼 상하 padding |
| `component/input/x` · `y` | 16 · 12 | 입력 padding |
| `component/tag/x` · `y` | 10 · 4 (→scale) | **신규** · 태그 padding |
| `component/gallery-card/gap` | 16 | **신규** · 사진 → 본문 |
| `component/gallery-card/body-gap` | 10 | **신규** · 태그 → 카드 텍스트 |
| `component/gallery-card/body-x` | 4 | **신규** · 카드 본문 좌우 |
| `component/paginator/gap` | 24 / 32 (mobile / desktop) | **신규** · 페이지네이터 요소 사이 |

---

## 7. Shapes

### 7.1 Radius `[변수]`

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius/scale/none` | 0 | 각진 박스, 전체 프레임 |
| `radius/scale/sm` | 4 | 작은 이미지 |
| `radius/scale/md` | 8 | 버튼, input, chip |
| `radius/scale/lg` | 16 | 카드, 다이얼로그, 모바일 갤러리 사진 |
| `radius/scale/xl` | 24 | 큰 패널, 데스크톱 갤러리 사진 |
| `radius/scale/full` | 9999 | 원형 버튼 |
| `component/chip/radius/default` · `soft` | 9999 · 8 | chip |
| `component/tag/radius` | 6 | **신규** · target-tag |
| `component/icon-button/radius` | → full | **신규** · 원형 버튼 |
| `component/gallery-card/photo-radius` | → lg / → xl | **신규** · mobile / desktop |

### 7.2 사진 형태 `[사례]`
- 갤러리 사진은 **4:3 고정**, 잘라서 채우기(`object-fit: cover`).
- 사진에 테두리·그림자·오버레이를 넣지 않는다. 텍스트는 사진 **아래**에 둔다.
- 사진에는 대체 텍스트(`alt`)를 붙인다. 캡션이 같은 내용을 말하면 중복을 피한다. `[PRD]`

---

## 8. Sizing, Touch & Focus

| 토큰 | 값 | 용도 |
|---|---|---|
| `control/height/lg` | 48 | 메인 CTA, 큰 검색창 |
| `control/hit-area/min` | 44 | **신규** · 최소 터치 영역 |
| `focus/ring/width` | 2 | **신규** · 키보드 포커스 링 두께 (색 `semantic/border/focus`) |
| `icon/lg` · `md` · `sm` · `xs` | 32 · 24 · 16 · 12 | 아이콘 |
| `component/icon-button/size` | 32 / 40 | **신규** · 원형 버튼 보이는 크기 (mobile / desktop) |
| `component/icon-button/icon-size` | 16 / 20 | **신규** · 화살표 |
| `component/gallery-card/width` | 288 / 400 | **신규** |
| `component/gallery-card/photo-height` | 216 / 300 | **신규** · 4:3 |
| `component/chip/icon/height/md` · `sm` | 32 · 32 | chip 높이 |
| `component/chip/icon/md` · `sm` | 16 · 12 | chip 내부 아이콘 |

- **보이는 크기 < 터치 영역.** 32·40 원형 버튼도 실제 누르는 영역은 `control/hit-area/min`(44) 이상으로 잡는다(투명 padding 또는 `::before`). `[PRD]`
- **포커스는 항상 보인다.** 모든 인터랙티브 요소에 `focus/ring/width` 두께의 `border/focus` 링을 `:focus-visible`로 준다. 포커스 링이 다른 요소나 `overflow: hidden`에 가려지지 않게 한다. `[PRD]`

---

## 9. Elevation & Depth

| 레벨 | 처리 | 쓰임 |
|---|---|---|
| 0 | `semantic/bg/canvas` | 에디토리얼 섹션 바탕 |
| 1 | `semantic/bg/default` 흰 면, 외곽선 없음 | 태그, 다이얼로그 |
| 2 | 흰 면 + 1px `component/icon-button/border` | 원형 이전/다음 버튼 |
| 반전 | `semantic/bg/inverse` + `text/inverse` | 어두운 영역, 검정 CTA |

- **그림자 없음.** 사례 전체에 effect가 0개. `[사례]` `[원칙]`
- 깊이감은 사진이 준다. 크롬에 그라디언트를 쓰지 않는다. `[원칙]`

---

## 10. Components

### 10.1 Buttons

**`button-brand`** — 모풍 흐름의 진행 CTA ("다음 단계로") `[슬라이드]`
- 배경 `semantic/action/brand`, 텍스트 `semantic/text/inverse` + `label/sm`, 높이 `control/height/lg`, radius `radius/scale/md`

**`button-secondary`** — 나란히 놓인 보조 액션 ("닫기") `[슬라이드]`
- 배경 `component/button/secondary/bg/default`, 텍스트 `component/button/secondary/text/default` + `label/sm`
- 나란히 놓을 때 간격 `scale/8`, 보조를 좁게(80 : 176)

**`button-primary`** — 일반 흐름의 주요 액션 `[변수]`
- 배경 `component/button/primary/bg/*`, 포커스 `component/button/primary/border/focus`, 텍스트 `text/inverse` + `label/sm`

**`icon-button-circle`** — 이전/다음 `[사례]` `[슬라이드]` `[PRD]`
- 면 `component/icon-button/bg`, 외곽선 1px `component/icon-button/border`, radius `component/icon-button/radius`
- 크기 `component/icon-button/size`, 화살표 `component/icon-button/icon-size` + `component/icon-button/icon`
- 터치 영역 `control/hit-area/min` 이상
- **`<button>`으로 구현**하고 `aria-label="이전 이미지"` / `"다음 이미지"`처럼 접근 가능한 이름을 준다.
- 첫/마지막 슬라이드에서는 해당 방향 버튼을 `disabled`로 두고 흐리게 표시한다(숨기지 않음 — 레이아웃이 흔들리지 않게).
- 모풍 슬라이드 버전은 면 `semantic/bg/brand-light`

### 10.2 Gallery (Editorial)

**`section-head`**
- 세로 스택, 간격 `editorial/layout/head-gap`
- 제목 `editorial/type/heading/*` + `text/primary` (모바일은 2줄로 끊음) · 부제 `editorial/type/subtitle/*` + `text/tertiary`

**`gallery-track`**
- 가로 배열, 카드 간격 `editorial/layout/card-gap`, 첫 카드는 `editorial/layout/page-x`에 맞추고 오른쪽은 화면 끝을 넘김
- 코드: `scroll-snap-type: x mandatory`, 카드마다 `scroll-snap-align: start`
- **자동으로 넘어가지 않는다.** 자동 전환이 꼭 필요하면 멈춤 버튼을 둔다. `[PRD]`
- `prefers-reduced-motion: reduce`에서는 부드러운 스크롤 애니메이션을 끈다. `[PRD]`

**`gallery-card`**
- 세로 스택, 간격 `component/gallery-card/gap`: 사진 → 본문
- 사진: `component/gallery-card/width` × `photo-height`, radius `component/gallery-card/photo-radius`
- 본문: 좌우 `component/gallery-card/body-x`, 간격 `component/gallery-card/body-gap`, 태그 → 카드 텍스트
- 카드 텍스트: 제목 `editorial/type/card-title/*` + `text/primary`, 설명 `editorial/type/card-body/*` + `text/tertiary`
- 카드 자체에는 배경·테두리·그림자가 없다.
- 화면 밖 카드 안의 인터랙티브 요소는 Tab 순서에서 빠지게 한다. `[PRD]`

**`target-tag`** — 카드가 다루는 대상 ("약", "카페 키오스크" …)
- 면 `component/tag/bg`, 텍스트 `component/tag/text` + `editorial/type/tag/*`
- radius `component/tag/radius`, padding `component/tag/y` / `component/tag/x`, 너비는 내용만큼

**`paginator`** `[PRD]`
- 가로 배열: `icon-button-circle`(이전) + 인덱스 + `icon-button-circle`(다음), 간격 `component/paginator/gap`
- 인덱스 `editorial/type/index/*` + `text/primary`. 형식 `현재/전체`. 스크린리더용으로 `aria-live="polite"` 영역에 "5개 중 2번째"처럼 문장으로 알린다.
- 모바일 갤러리에서는 오른쪽 정렬, 모풍 슬라이드에서는 가운데 정렬

### 10.3 Dialog

**`image-slide-dialog`** — 모풍 이미지 슬라이드 `[슬라이드]`
- 312×470, 면 `semantic/bg/default`, radius `radius/scale/lg`
- 위에서부터: 제목(`title/md`) → 가로 이미지 리스트 → `paginator`(가운데) → `button-secondary` + `button-brand`
- UI 레벨 컴포넌트다. 페이지네이터만 Editorial 컴포넌트를 재사용한다.

### 10.4 Inputs (UI) `[변수]`

**`text-input`**
- 면 `component/input/bg/default`, 텍스트 `component/input/text/default`, padding `component/input/x` · `y`, radius `radius/scale/md`
- 포커스 `component/input/border/focus`, 오류 `component/input/border/error` (+ 필요 시 `semantic/bg/status-error`)
- 비활성 `component/input/bg/disabled` + `text/disabled`

---

## 11. 패턴: 이미지 슬라이드 갤러리 (`10:4015`)

**Mobile `10:3951`** 360×674 · editorial 모드 `mobile`

```
[bg/canvas]
 ├ section-head     top: page-top(56)  x: page-x(24)
 ├ gallery-track    ↓ head-to-content(32)   카드 x=24, 324, 624 … 오른쪽으로 넘침
 │   └ gallery-card 288 × (216 사진 + 본문)
 └ paginator        ○ 1/5 ○  gap 24, 오른쪽 정렬
```

**Desktop `10:3980`** 1440×900 · editorial 모드 `desktop`

```
[bg/canvas]
 ├ section-head     top: page-top(112)  x: page-x(120)
 ├ gallery-track    ↓ head-to-content(64)   카드 x=120, 544, 968, 1392 … 넘침
 │   └ gallery-card 400 × (300 사진 + 본문)
 └ paginator        ○ 1/5 ○  gap 32  (사례엔 인덱스 없음 → PRD 기준으로 추가)
```

**콘텐츠 규칙**
- 카드 1장 = 어려운 정보 1개. 태그(대상) → 따옴표 질문(제목) → 왜 어려운지 2~3줄.
- 사진은 실제 현장(워크숍) 사진.

---

## 12. 참고: 모풍 이미지 슬라이드 운영 토큰 매핑 (`5:318`)

원본은 **운영 라이브러리(remote)** 토큰과 `Giparan` 폰트를 쓴다.

| 요소 | 운영 토큰 (원본) | 원본 값 | 로컬 DS 토큰 |
|---|---|---|---|
| 다이얼로그 배경 | `surface/surface-secondary` | `#FFFFFF` | `semantic/bg/default` |
| 다이얼로그 radius | `border-radius-md` | 16 | `radius/scale/lg` |
| 헤더 텍스트 | — | — | `title/md` + `semantic/text/primary` |
| 버튼 컨테이너 gap | — | 8 | `scale/8` |
| 버튼 높이 | `spacing/6` | 48 | `control/height/lg` |
| 버튼 radius | `radius/md` | 8 | `radius/scale/md` |
| 닫기 버튼 배경 | `surface/surface-button-inactive` | `#EAF1F1` | `component/button/secondary/bg/default` |
| 닫기 버튼 텍스트 | `text/text-deactivated` | `#8CA4A5` | ⚠️ 없음 (§14-1) |
| 다음 단계로 배경 | `surface/surface-button-active` | `#325253` | `semantic/action/brand` |
| 다음 단계로 텍스트 | `text/text-white` | `#FFFFFF` | `semantic/text/inverse` |
| 버튼 텍스트 스타일 | `ko/label-small` (Giparan Medium 16) | 16 | `label/sm` |
| 페이지네이터 gap | — | 24 | `component/paginator/gap` (mobile) |
| 이전/다음 원형 버튼 | 배경 `#EAF1F1`, 32×32 | — | `semantic/bg/brand-light`, `component/icon-button/size`, `component/icon-button/radius` |
| 페이지 인덱스 `1/5` | `text/text-primary` | `#202020` | `semantic/text/primary` + `editorial/type/index/*` |

---

## 13. 토큰 공백

2026-09-29 레벨 정리로 이전 공백 15건은 모두 새 토큰 또는 기존 토큰 통합(§2.3)으로 해소했다. 남은 것:

| # | 값 | 쓰임 | 상태 / 제안 |
|---|---|---|---|
| 1 | 운영 `text/text-deactivated` `#8CA4A5` | 모풍 닫기 버튼 텍스트 | 대응 없음. `component/button/secondary/text/disabled` 추가 검토 (§14-1) |
| 2 | 1024px breakpoint | Editorial 모드 전환 | 코드에만 있음(`tokens/build.mjs`). Figma에는 변수로 둘 수 없으니 이 문서가 기준 |
| 3 | 사례 `10:4015` 노드 바인딩 | 사례 프레임 | 변수는 생겼지만 사례 노드는 아직 하드코딩 값 → 바인딩 필요 |
| 4 | Editorial 텍스트 스타일 | Figma 텍스트 스타일 | 변수만 있음. `editorial/*` 텍스트 스타일 6종을 변수에 바인딩해서 만들면 모드 전환이 스타일에 반영됨 |

---

## 14. 알려진 이슈 / 정리 필요 (Figma 측)

1. **토큰 누락** — 운영 `text/text-deactivated`(`#8CA4A5`) 대응 없음.
2. **하드코딩 값** — `component/button/secondary/bg/hover`(`#FAFAFA`), `.../pressed`(`#F5F5F5`)가 raw hex. 연초록에서 hover가 회색이 되는 것이 의도인지 확인.
3. **상태 구분 없음** — `action/primary-pressed` = `action/primary`. `text/disabled` = `text/muted`.
4. **설명 불일치** — `input/bg/disabled` 설명 "hover fill" · `bg/brand-light` 설명 "브랜드 CTA 호버" · `bg/brand-sky`와 primitive 설명 불일치 · `neutral/100`, `/200` 설명 중복.
5. **Scope 과다** — 기존 `primitive/neutral/*`, `primitive/status/*`, `component/chip/icon/*`이 `ALL_SCOPES`. (신규 primitive 2개는 숨김으로 만듦)
6. **Sizing 빈칸** — `control/height`에 `lg`만. `chip/icon/height/md` = `sm` = 32.
7. **타입 스케일 역전** — `label/lg`(24) > `title/lg`(22), `display/md`(20) < `title/lg`(22).
8. **UI 텍스트 스타일 ↔ 변수 미연결** — 14종 모두 바인딩 없음. `ko`/`en` 전환이 스타일에 반영되지 않음.
9. **폰트 불일치** — 로컬 `NeutronicHangeul`, 모풍 슬라이드(운영) `Giparan`.
10. **레이어 이름** — 사례 페이지네이터 `Frame 289`, 이전 버튼도 `btn-next`. → `paginator` / `btn-prev`.
11. **`text/muted` 대비** — `#8A8A8A`는 흰 배경 3.45:1, canvas 2.98:1. 본문 크기에서는 AA(4.5:1) 미달. 캡션 용도라도 `neutral/600`으로 올릴지 검토.

---

## 15. Do / Don't

### Do
- 섹션을 만들기 전에 레벨(UI / Editorial)을 먼저 고른다.
- 바탕과 크롬은 무채색으로 두고, 색은 사진에 맡긴다.
- 현재 위치는 `현재/전체` 숫자로 보여 준다. 모바일·데스크톱 모두.
- 이전/다음은 실제 `<button>` + 접근 가능한 이름, 첫/마지막에서는 `disabled`.
- 모든 인터랙티브 요소에 보이는 포커스 링(`focus/ring/width` + `border/focus`).
- 작은 버튼도 터치 영역은 `control/hit-area/min` 이상.
- 사진은 4:3 비율, 텍스트는 사진 아래.
- 토큰이 없는 값은 §13 + `TODO(token)`.

### Don't
- 그림자를 넣지 않는다.
- 한 섹션 안에서 UI 텍스트 스타일과 `editorial/type/*`를 섞지 않는다.
- 점(dot) 색 변화만으로 현재 위치를 알리지 않는다.
- hover해야만 이전/다음 버튼이 보이게 하지 않는다.
- 슬라이드를 자동으로 넘기지 않는다.
- `bg/canvas` 위에 `text/muted`를 쓰지 않는다.
- 초록 브랜드색을 일반 흐름 CTA나 장식에 쓰지 않는다.
- `primitive/*`나 hex 값을 화면에 직접 쓰지 않는다.

---

## 16. 코드에서 쓰기

```bash
node tokens/build.mjs   # tokens/figma-variables.json → tokens/tokens.css
```

```html
<link rel="stylesheet" href="tokens/tokens.css" />
```

```css
.section { background: var(--semantic-bg-canvas); padding: var(--editorial-layout-page-top) var(--editorial-layout-page-x) 0; }
.section-title {
  font-family: var(--editorial-type-font-family);
  font-size: var(--editorial-type-heading-size);
  line-height: var(--editorial-type-heading-line-height);
  font-weight: var(--editorial-type-heading-weight);
  letter-spacing: var(--editorial-type-letter-spacing);
  color: var(--semantic-text-primary);
}
.icon-button:focus-visible {
  outline: var(--focus-ring-width) solid var(--semantic-border-focus);
  outline-offset: 2px;
}
```

- 이름 규칙: Figma `a/b/c` → CSS `--a-b-c`. Figma Dev Mode에 같은 이름이 code syntax로 표시된다.
- 모드: 기본값은 `ko` · `mobile`. `:lang(en)`이면 en 값, `min-width: 1024px`이면 desktop 값으로 바뀐다.
- `tokens.css`는 직접 고치지 않는다. Figma 변수를 고친 뒤 JSON을 다시 내보내고 빌드한다.
