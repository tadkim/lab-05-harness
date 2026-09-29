#!/usr/bin/env node
// 에이전트 편집 범위 확인. 에이전트 실행 전후의 파일 해시를 비교한다.
// 사용:
//   node scripts/check-scope.mjs before
//   node scripts/check-scope.mjs after <agent> <component>
// after: 바뀐 파일(추가·수정·삭제)이 rules.yaml agents.<agent>.folder 밖에 1개 이상이면 FAIL (종료 코드 1)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, RUNS, loadRules, assertComponent } from './lib.mjs';

const SNAP = path.join(RUNS, '.scope', 'snapshot.json');
const SKIP = new Set(['.git', 'node_modules', '.scope', '.DS_Store']);

function snapshot(dir = ROOT, out = {}) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) snapshot(p, out);
    else if (e.isFile()) out[path.relative(ROOT, p)] = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
  }
  return out;
}

try {
  const [cmd, agent, component] = process.argv.slice(2);
  if (cmd === 'before') {
    fs.mkdirSync(path.dirname(SNAP), { recursive: true });
    fs.writeFileSync(SNAP, JSON.stringify(snapshot()));
    console.log(`스냅샷 저장: ${path.relative(ROOT, SNAP)}`);
  } else if (cmd === 'after') {
    const rules = loadRules();
    assertComponent(rules, component);
    const a = rules.agents[agent];
    if (!a) throw new Error(`agent는 ${Object.keys(rules.agents).join(' | ')} 중 하나여야 합니다: ${agent}`);
    if (!fs.existsSync(SNAP)) throw new Error('스냅샷 없음: 에이전트 실행 전에 before를 먼저 실행하세요');
    const prev = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
    const now = snapshot();
    const changed = [...new Set([...Object.keys(prev), ...Object.keys(now)])].filter((f) => prev[f] !== now[f]);
    const allowed = path.relative(ROOT, path.join(RUNS, component, a.folder));
    const outside = changed.filter((f) => !f.startsWith(allowed));
    console.log(JSON.stringify({ agent, allowed, changed, outside, pass: outside.length === 0 }, null, 2));
    process.exit(outside.length === 0 ? 0 : 1);
  } else {
    throw new Error('사용: check-scope.mjs before | after <agent> <component>');
  }
} catch (e) {
  console.error(`check-scope 오류: ${e.message}`);
  process.exit(2);
}
