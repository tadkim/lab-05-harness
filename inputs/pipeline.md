# Pipeline

한 번 실행할 때 `component` 1개를 처리한다 (inputs/purpose.md).
Phase는 5개이고, 순서대로 진행한다.

## Phase

| Phase | story-work 단계 | 입력 | 출력 | 파일 (`runs/<component>/`) |
|---|---|---|---|---|
| P1 조사 | 1, 2 | component, Figma 기준 사례, UI Bowl, 참고 링크 | 현황·레퍼런스 정리 | research/p1-research.md |
| P2 안 비교·선택 | 3 (+ 5의 판단) | P1 출력 | 안 여러 개 + 선택 결과 | design/p2-options.md |
| P3 설계 | 4, 5 | P2에서 선택한 안 | Figma 컴포넌트·variant | design/p3-figma.json |
| P4 검토 | 6 | P3 Figma 결과 | 게이트 판정 결과 | gate/p4-gate.json |
| P5 전달 | 7 | P4 PASS 결과 | 개발 전달 문서 | handoff/p5-handoff.md |

## component별 P1 입력

| component | 현황 점검 | 레퍼런스 조사 |
|---|---|---|
| image-slider | Figma 10:4015 | UI Bowl, Apple, 사용자 링크 |
| video-player | 없음 | UI Bowl, Apple, 사용자 링크 |
| playback-progress | 없음 | UI Bowl, Apple, 사용자 링크 |

## P2 결정 항목

| component | 결정할 것 | 출처 |
|---|---|---|
| image-slider | 현재 위치를 명확히 보여주면서 화면이 복잡해지지 않는 인덱스 표현 | G1 |
| video-player | 기본 브라우저 플레이어 vs 컨트롤 별도 디자인 | G2 |
| playback-progress | 재생바의 시각적 강도: 현재 위치 핸들(thumb)을 항상 보일지 hover·focus 때만 보일지 + 보이는 재생바 굵기 | PRD 6-3, 13장 |

- 안 개수: `rules.yaml`의 `p2.options_min` ~ `p2.options_max`
- 사람 승인: P2 끝에서 1회. 하네스 전체에서 사람이 승인하는 곳은 여기 한 곳뿐이다.
- 셀 수 있는 조건(예: 조작 영역 크기)은 P2에서 고르지 않고 P4 게이트가 판정한다.

## 되돌아가는 지점

| 조건 | 돌아갈 곳 | 최대 횟수 | 횟수를 넘으면 |
|---|---|---|---|
| P4 게이트 FAIL | P3 | `retry.p4_fail_to_p3` | 멈추고 사람에게 묻는다 |
| P2에서 사람이 모든 안 거절 | P1 | `retry.p2_reject_to_p1` | 멈추고 사람에게 묻는다 |

## 재개

- `runs/<component>/`에서 가장 높은 번호의 Phase 파일 다음 Phase부터 시작한다.
- 완료 판정 규칙은 `rules.yaml`의 `p2`, `resume`을 따른다.

## 에이전트 경계

- B1: P1 → P2 (웹 탐색 → Figma)
- B2: P5 끝 (디자인 → 개발). 하네스는 여기서 멈춘다.
