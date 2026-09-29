#!/usr/bin/env node
// P2 승인 기록. 사람이 "<component> 승인"이라고 말했을 때만 오케스트레이터가 실행한다.
// 사용: node scripts/approve.mjs <component>
// p2-options.md 끝에 승인 줄과 승인해시(현재 p1 + p2 내용)를 쓴다. 이후 p1이나 p2가 바뀌면 P2 게이트가 FAIL한다.
import fs from 'node:fs';
import { loadRules, assertComponent, phasePath, readText, exists, stripApproval, approvalHash } from './lib.mjs';

try {
  const component = process.argv[2];
  const rules = loadRules();
  assertComponent(rules, component);
  for (const p of ['P1', 'P2']) {
    if (!exists(phasePath(rules, component, p))) throw new Error(`출력 파일 없음: ${phasePath(rules, component, p)}`);
  }
  const p2File = phasePath(rules, component, 'P2');
  fs.writeFileSync(p2File, stripApproval(rules, readText(p2File)));
  const hash = approvalHash(rules, component);
  fs.appendFileSync(p2File, `\n${rules.p2.approval_line}\n${rules.p2.approval_hash_line}${hash}\n`);
  console.log(`승인 기록: ${p2File}\n해시: ${hash}`);
} catch (e) {
  console.error(`approve 오류: ${e.message}`);
  process.exit(2);
}
