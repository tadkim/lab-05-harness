#!/usr/bin/env node
// 게이트 판정.
// 사용: node scripts/judge.mjs <component> --phase P1|P2|P4|P5 [--measure <측정 JSON>] [--dry]
//   P4 측정: --measure가 없으면 FIGMA_TOKEN으로 Figma REST API를 직접 읽는다 (읽기 전용).
//   --dry: 결과 파일을 쓰지 않고 출력만 한다.
// 종료 코드: 0 PASS, 1 FAIL, 2 실행 오류
import fs from 'node:fs';
import path from 'node:path';
import {
  RUNS, readText, exists, loadRules, assertComponent, phasePath, loadTokens, gatesFor, runGates,
} from './lib.mjs';

const args = process.argv.slice(2);
const component = args[0];
const opt = (name) => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : undefined; };
const phase = opt('--phase');
const measureFile = opt('--measure');
const dry = args.includes('--dry');

async function main() {
  const rules = loadRules();
  assertComponent(rules, component);
  if (!['P1', 'P2', 'P4', 'P5'].includes(phase)) throw new Error('--phase는 P1 | P2 | P4 | P5');

  const entries = gatesFor(rules, component, phase);
  const tokens = loadTokens(rules);
  const files = {};
  for (const p of ['P1', 'P2', 'P5']) {
    const f = phasePath(rules, component, p);
    if (exists(f)) files[p] = readText(f);
  }
  if (phase !== 'P4' && files[phase] === undefined) throw new Error(`출력 파일 없음: ${phasePath(rules, component, phase)}`);

  let m;
  let source;
  if (phase === 'P4') {
    if (measureFile) {
      m = JSON.parse(readText(measureFile));
      source = `file:${path.basename(measureFile)}`;
    } else if (process.env.FIGMA_TOKEN) {
      m = await measureFromFigma(rules, component);
      source = 'figma-rest';
    } else {
      throw new Error('P4 측정값 없음: FIGMA_TOKEN을 설정하거나 --measure <파일>을 주세요 (inputs/roles.md 참고)');
    }
  }

  const results = runGates({ rules, component, tokens, files, m }, entries);
  const pass = results.every((r) => r.pass);
  const out = { component, phase, pass, results };

  if (phase === 'P4') {
    const gateFile = phasePath(rules, component, 'P4');
    const prev = exists(gateFile) ? JSON.parse(readText(gateFile)) : null;
    const attempt = (prev?.attempt ?? 0) + 1;
    const maxAttempts = 1 + rules.retry.p4_fail_to_p3;
    Object.assign(out, {
      attempt,
      next: pass ? 'P5' : attempt >= maxAttempts ? 'STOP' : 'P3',
      source,
      tokens_exported_at: tokens.exportedAt,
      measured_at: new Date().toISOString(),
      measurements: m,
    });
    if (!dry) writeJson(gateFile, out);
  } else if (!dry) {
    const checksFile = path.join(RUNS, component, rules.agents.judge.folder, rules.agents.judge.extra_output);
    const all = exists(checksFile) ? JSON.parse(readText(checksFile)) : {};
    all[phase] = { pass, results, checked_at: new Date().toISOString() };
    writeJson(checksFile, all);
  }

  console.log(JSON.stringify(out, null, 2));
  process.exit(pass ? 0 : 1);
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

// ---- Figma REST 측정 (GET /v1/files/:key/nodes, 읽기 전용) ----
async function measureFromFigma(rules, component) {
  const p3 = JSON.parse(readText(phasePath(rules, component, 'P3')));
  if (!p3.fileKey || !Array.isArray(p3.nodeIds) || p3.nodeIds.length === 0) {
    throw new Error('p3-figma.json 형식: { "fileKey": "...", "nodeIds": ["1:2", ...] }');
  }
  const url = `https://api.figma.com/v1/files/${p3.fileKey}/nodes?ids=${encodeURIComponent(p3.nodeIds.join(','))}`;
  const res = await fetch(url, { headers: { 'X-Figma-Token': process.env.FIGMA_TOKEN } });
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const roots = Object.values(data.nodes).map((n) => n?.document).filter(Boolean);
  return extract(roots, rules.figma_naming);
}

const hex = ({ r, g, b }) => `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const visible = (p) => p.visible !== false;

export function extract(roots, naming) {
  const m = { variants: [], interactive: [], focus: [], iconButtons: [], unbound: [], texts: [], playState: {}, afterTimeout: 0 };
  const hasText = (n) => n.type === 'TEXT' || (n.children || []).some(hasText);
  const firstName = (n, prefix) => {
    if (n.name?.startsWith(prefix)) return n.name;
    for (const c of n.children || []) { const f = firstName(c, prefix); if (f) return f; }
    return null;
  };

  const walk = (n, variant) => {
    if (n.type === 'COMPONENT') {
      variant = n.name;
      m.variants.push(n.name);
      for (const state of ['Playing', 'Paused']) {
        if (n.name.includes(state)) {
          m.playState[state] = {
            icon: firstName(n, naming.icon_prefix),
            label: firstName(n, naming.interactive_prefix)?.slice(naming.interactive_prefix.length) ?? null,
          };
        }
      }
    }
    if (n.name?.startsWith(naming.interactive_prefix)) {
      const box = n.absoluteBoundingBox || {};
      m.interactive.push({ name: n.name, width: box.width, height: box.height });
      if (!hasText(n)) m.iconButtons.push({ name: n.name, label: n.name.slice(naming.interactive_prefix.length) });
    }
    if (n.type === 'TEXT') m.texts.push(n.characters ?? '');

    const bv = n.boundVariables || {};
    (n.fills || []).forEach((p, i) => {
      if (p.type === 'SOLID' && visible(p) && !p.boundVariables?.color && !bv.fills?.[i]) m.unbound.push({ node: n.name, prop: 'fill' });
    });
    (n.strokes || []).forEach((p, i) => {
      if (p.type === 'SOLID' && visible(p) && !p.boundVariables?.color && !bv.strokes?.[i]) m.unbound.push({ node: n.name, prop: 'stroke' });
    });
    if (n.cornerRadius > 0 && !bv.topLeftRadius && !bv.cornerRadius) m.unbound.push({ node: n.name, prop: 'radius' });
    for (const k of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) {
      if (n[k] > 0 && !bv[k]) m.unbound.push({ node: n.name, prop: k });
    }

    if (variant?.includes('Focus')) {
      const s = (n.strokes || []).find((p) => p.type === 'SOLID' && visible(p));
      if (s) m.focus.push({ variant, node: n.name, strokeWeight: n.strokeWeight, strokeColor: hex(s.color), strokeVar: null });
    }

    for (const it of [...(n.interactions || []), ...(n.reactions || [])]) {
      if (it.trigger?.type === 'AFTER_TIMEOUT') m.afterTimeout += 1;
    }
    for (const c of n.children || []) walk(c, variant);
  };

  roots.forEach((r) => walk(r, null));
  return m;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(`judge 오류: ${e.message}`); process.exit(2); });
}
