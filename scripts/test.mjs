#!/usr/bin/env node
// 하네스 자체 테스트. rules.yaml이나 스크립트를 고칠 때마다 `npm test`로 다시 돌린다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadRules, CHECKERS } from './lib.mjs';

const rules = loadRules();
let failed = 0;
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok || !info ? '' : `\n      ${info}`}`);
  if (!ok) failed += 1;
};

const judge = (component, phase, extra = [], env = {}) => {
  const r = spawnSync('node', [path.join(ROOT, 'scripts/judge.mjs'), component, '--phase', phase, '--dry', ...extra], {
    encoding: 'utf8', env: { ...process.env, FIGMA_TOKEN: '', ...env },
  });
  let out = null;
  try { out = JSON.parse(r.stdout); } catch { /* 오류 출력 */ }
  return { code: r.status, out, stderr: r.stderr };
};
const failing = (out) => out.results.filter((r) => !r.pass).map((r) => r.gate).sort();

// 1. rules.yaml의 게이트와 판정 함수가 1:1인지 (가이드에만 있고 검사가 없는 규칙 방지)
const gateIds = Object.keys(rules.gates);
check('모든 게이트에 판정 함수가 있다', gateIds.every((g) => CHECKERS[g]), gateIds.filter((g) => !CHECKERS[g]).join(', '));
check('판정 함수마다 게이트가 있다', Object.keys(CHECKERS).every((c) => rules.gates[c]), Object.keys(CHECKERS).filter((c) => !rules.gates[c]).join(', '));

// 2. P4 fixture: pass는 FAIL 0개, fail은 의도한 게이트만 FAIL
for (const f of fs.readdirSync(path.join(ROOT, 'scripts/fixtures')).sort()) {
  const [kind, ...rest] = f.replace('.json', '').split('-');
  const component = rest.join('-');
  const file = path.join(ROOT, 'scripts/fixtures', f);
  const r = judge(component, 'P4', ['--measure', file]);
  if (!r.out) { check(`P4 ${f}`, false, r.stderr); continue; }
  const expected = kind === 'pass' ? [] : JSON.parse(fs.readFileSync(file, 'utf8'))._expect_fail.sort();
  check(`P4 ${f}: FAIL = [${expected.join(', ')}]`, JSON.stringify(failing(r.out)) === JSON.stringify(expected), `실제 FAIL: [${failing(r.out).join(', ')}]`);
}

// 3. P1 / P2 / P5 형식 게이트 — 임시 runs 폴더에서
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
const env = { HARNESS_RUNS: tmp };
const c = 'image-slider';
const write = (phase, text) => {
  const p = path.join(tmp, c, rules.phases[phase]);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};
const ref = (n, url = true) => `### R${n} 사례 ${n}\n${url ? `URL: https://example.com/${n}\n` : ''}원리: ...\n\n`;

write('P1', `# 조사\n\n${ref(1)}${ref(2)}${ref(3, false)}`);
check('P1: URL 없는 레퍼런스가 있으면 FAIL', judge(c, 'P1', [], env).code === 1);
write('P1', `# 조사\n\n${ref(1)}${ref(2)}${ref(3)}`);
check('P1: 레퍼런스 3개 + URL → PASS', judge(c, 'P1', [], env).code === 0);

write('P2', '# 안\n\n### 안 A\n내용\n\n### 안 B\n내용\n\n선택: A\n');
check('P2: 승인 전에는 FAIL', judge(c, 'P2', [], env).code === 1);
const ap = spawnSync('node', [path.join(ROOT, 'scripts/approve.mjs'), c], { encoding: 'utf8', env: { ...process.env, ...env } });
check('approve 실행', ap.status === 0, ap.stderr);
check('P2: 승인 후 PASS', judge(c, 'P2', [], env).code === 0);
write('P1', `# 조사 (수정됨)\n\n${ref(1)}${ref(2)}${ref(3)}`);
check('P2: 승인 뒤 p1이 바뀌면 예전 승인은 FAIL', judge(c, 'P2', [], env).code === 1);

write('P5', '# 전달\n\n자동 재생 관련: autoplay: false 줄을 빼먹지 않는다.\n');
check('P5: 문장 속 "autoplay: false"는 세지 않는다', judge(c, 'P5', [], env).code === 1);
write('P5', '# 전달\n\nautoplay: false\n');
check('P5: 정확한 줄이 있으면 PASS', judge(c, 'P5', [], env).code === 0);
fs.rmSync(tmp, { recursive: true, force: true });

// 4. 문서의 경로가 rules.yaml과 같은지 (폴더·파일명 변경 후 옛 경로가 남는 것 방지)
const docs = [
  ...fs.readdirSync(path.join(ROOT, '.claude/agents')).map((f) => `.claude/agents/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'inputs')).map((f) => `inputs/${f}`),
  ...['CLAUDE.md'].filter((f) => fs.existsSync(path.join(ROOT, f))),
];
const phaseFiles = Object.values(rules.phases);
const stale = [];
for (const d of docs) {
  const text = fs.readFileSync(path.join(ROOT, d), 'utf8');
  for (const m of text.matchAll(/[\w/<>.-]*p[1-5]-[a-z]+\.(?:md|json)/g)) {
    const ref = m[0].replace(/^.*runs\/<component>\//, '');
    if (ref.includes('/') && !phaseFiles.includes(ref)) stale.push(`${d}: ${m[0]}`);
    if (m[0].startsWith('runs/') && !phaseFiles.some((p) => m[0].endsWith(p))) stale.push(`${d}: ${m[0]}`);
  }
}
check('문서에 rules.yaml과 다른 Phase 경로가 없다', stale.length === 0, stale.join('\n      '));
for (const [name, a] of Object.entries(rules.agents)) {
  const f = path.join(ROOT, '.claude/agents', `${name}.md`);
  const text = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const need = (a.phases || []).map((p) => rules.phases[p]);
  if (name === 'judge') need.push(rules.phases.P4, `${a.folder}${a.extra_output}`);
  const missing = need.filter((p) => !text.includes(p));
  check(`.claude/agents/${name}.md가 자기 출력 경로를 적고 있다`, text && missing.length === 0, missing.join(', ') || '파일 없음');
}

console.log(failed === 0 ? '\n전체 통과' : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
