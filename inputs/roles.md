# Roles

에이전트는 4개이고, 각자 `runs/<component>/` 아래 폴더 1개만 편집한다.
확인: 에이전트를 실행한 뒤 `git status`로 봤을 때 자기 폴더 밖에서 바뀐 파일 = 0

## 에이전트

| 에이전트 | Phase | 편집 폴더 | 출력 파일 | Figma |
|---|---|---|---|---|
| researcher | P1 | research/ | p1-research.md | 읽기만 (10:4015) |
| designer | P2, P3 | design/ | p2-options.md, p3-figma.json | `harness/<component>` 페이지만 편집 |
| judge | 게이트 판정 | gate/ | p4-gate.json, checks.json | 읽기만 |
| handoff | P5 | handoff/ | p5-handoff.md | 읽기만 |

## judge (읽기 전용 판정자)

- PASS/FAIL은 `scripts/judge.mjs`가 rules.yaml과 측정값을 비교해서 정한다. judge 에이전트는 스크립트를 실행하고 결과를 보고만 한다.
- P4 측정 방식:
  - A (기본): `FIGMA_TOKEN`(file_content:read 권한) → judge.mjs가 Figma REST API로 직접 측정. 에이전트의 자기 보고가 끼지 않는다.
  - B (대체): 토큰이 없을 때만. judge 에이전트가 Figma 읽기 도구(get_metadata, get_design_context, get_variable_defs, get_screenshot)로 측정해 `gate/measure.json`에 쓰고 `--measure`로 넘긴다. use_figma는 쓰지 않는다.
- P4 결과는 `gate/p4-gate.json`에 쓴다 (judge.mjs가 씀).
- P1, P2, P5의 형식 확인 결과는 `gate/checks.json`에 쓴다. (p4-gate.json에 같이 쓰면 재개 규칙이 P4 완료로 잘못 판단한다)

## designer

- 만들거나 고친 Figma 노드는 모두 `harness/<component>` 페이지 안에 있다.
- 다른 페이지에서 바뀐 노드 = 0

## 사람

- P2 승인 줄(`승인: yes`)은 사람만 쓴다. 에이전트는 쓰지 않는다.
- 사람이 "<component> 승인"이라고 말하면 오케스트레이터가 `node scripts/approve.mjs <component>`로 대신 기록한다. 승인 줄과 함께 승인 시점의 p1 + p2 내용 해시가 남아서, 이후 내용이 바뀌면 예전 승인은 P2 게이트에서 FAIL한다.

## 편집 범위 확인

- 오케스트레이터는 에이전트 실행 전에 `node scripts/check-scope.mjs before`, 실행 후에 `node scripts/check-scope.mjs after <agent> <component>`를 실행한다. FAIL이면 멈추고 사람에게 보고한다.

## 자연어 트리거

| 말 | 동작 |
|---|---|
| "<component> 하네스 시작해줘" | P1부터 시작 |
| "<component> 이어서 해줘" | 재개 규칙에 따라 다음 Phase부터 |
| "<component> 다시 판정해줘" | judge만 실행 |
| "<component> 승인" | 사람의 지시로 p2-options.md에 승인 줄을 기록 → P3 |
| "<component> 거절" | P1로 돌아감 (최대 횟수: retry.p2_reject_to_p1) |
