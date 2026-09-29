// 하네스 스크립트 공통 모듈. 판정 수치는 rules.yaml에서만 읽는다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RUNS = process.env.HARNESS_RUNS || path.join(ROOT, 'runs');

export const readText = (p) => fs.readFileSync(p, 'utf8');
export const exists = (p) => fs.existsSync(p);

export function loadRules() {
  return YAML.parse(readText(path.join(ROOT, 'rules.yaml')));
}

export function assertComponent(rules, component) {
  if (!rules.components[component]) {
    throw new Error(`component는 ${Object.keys(rules.components).join(' | ')} 중 하나여야 합니다: ${component}`);
  }
}

export function phasePath(rules, component, phase) {
  return path.join(RUNS, component, rules.phases[phase]);
}

// tokens/figma-variables.json의 별칭(@name)과 모드별 값([mode1, ...])을 풀어 실제 값을 돌려준다.
export function loadTokens(rules) {
  const json = JSON.parse(readText(path.join(ROOT, rules.tokens.source)));
  const map = {};
  for (const c of json.collections) for (const [name, , value] of c.v) map[name] = value;
  const resolve = (name, depth = 0) => {
    if (depth > 20) throw new Error(`토큰 별칭 순환: ${name}`);
    let v = map[name];
    if (v === undefined) throw new Error(`토큰 없음: ${name}`);
    if (Array.isArray(v)) v = v[0];
    if (typeof v === 'string' && v.startsWith('@')) return resolve(v.slice(1), depth + 1);
    return v;
  };
  return { exportedAt: json.exportedAt, resolve };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const lineRe = (prefix, rest = '', flags = 'gm') => new RegExp(`^${escapeRe(prefix)}${rest}`, flags);
export const countMatches = (text, re) => (text.match(re) || []).length;

// 승인 해시: 승인 시점의 p1 + p2 내용(승인 줄 제외). 이후 내용이 바뀌면 해시가 달라져 승인이 무효가 된다.
export function approvalHash(rules, component) {
  const p1 = readText(phasePath(rules, component, 'P1'));
  const p2 = stripApproval(rules, readText(phasePath(rules, component, 'P2')));
  return crypto.createHash('sha256').update(p1).update('\0').update(p2).digest('hex');
}

export function stripApproval(rules, text) {
  const { approval_line, approval_hash_line } = rules.p2;
  return text
    .split('\n')
    .filter((l) => l !== approval_line && !l.startsWith(approval_hash_line))
    .join('\n')
    .replace(/\n+$/, '\n');
}

const appliesTo = (gate, component) => gate.applies_to === undefined || gate.applies_to === 'all' || gate.applies_to.includes(component);

export function gatesFor(rules, component, phase) {
  return Object.entries(rules.gates).filter(([, g]) => g.phase === phase && appliesTo(g, component));
}

// ---- 게이트별 판정 함수. rules.yaml의 gates 키와 1:1로 맞아야 한다 (test.mjs가 확인) ----
export const CHECKERS = {
  p1_references({ rules, files }) {
    const text = files.P1;
    const blocks = text.split(lineRe(rules.p1.reference_heading, '\\d+', 'm')).slice(1);
    const noUrl = blocks.filter((b) => !lineRe(rules.p1.url_line, '', 'm').test(b)).length;
    return {
      pass: blocks.length >= rules.p1.references_min && noUrl === 0,
      detail: { references: blocks.length, min: rules.p1.references_min, without_url: noUrl },
    };
  },

  p2_options({ rules, component, files }) {
    const t = files.P2;
    const p = rules.p2;
    const options = countMatches(t, lineRe(p.option_heading));
    const choices = countMatches(t, lineRe(p.choice_line, '\\S+'));
    const approvals = countMatches(t, lineRe(p.approval_line, '$'));
    const hashLine = t.match(lineRe(p.approval_hash_line, '([0-9a-f]{64})$', 'm'));
    const hashOk = !!hashLine && hashLine[1] === approvalHash(rules, component);
    return {
      pass: options >= p.options_min && options <= p.options_max && choices === 1 && approvals === 1 && hashOk,
      detail: { options, choices, approvals, approval_hash_matches: hashOk },
    };
  },

  required_states({ rules, component, m }) {
    const missing = rules.required_states[component].filter((s) => !m.variants.some((v) => v.includes(s)));
    return { pass: missing.length === 0, detail: { missing } };
  },

  hit_area({ tokens, rules, m }) {
    const min = tokens.resolve(rules.tokens.hit_area_min);
    const small = m.interactive.filter((n) => n.width < min || n.height < min);
    return {
      pass: m.interactive.length > 0 && small.length === 0,
      detail: { min, interactive: m.interactive.length, too_small: small },
    };
  },

  focus_ring({ tokens, rules, m }) {
    const width = tokens.resolve(rules.tokens.focus_ring_width);
    const color = String(tokens.resolve(rules.tokens.focus_ring_color)).toUpperCase();
    const focusVariants = m.variants.filter((v) => v.includes('Focus'));
    const ok = (f) => f.strokeWeight === width && (f.strokeVar === rules.tokens.focus_ring_color || String(f.strokeColor).toUpperCase() === color);
    const missing = focusVariants.filter((v) => !m.focus.some((f) => f.variant === v && ok(f)));
    return {
      pass: focusVariants.length > 0 && missing.length === 0,
      detail: { expected: { width, color }, focus_variants: focusVariants.length, without_ring: missing },
    };
  },

  accessible_name({ m }) {
    const empty = m.iconButtons.filter((b) => !b.label || !b.label.trim());
    return { pass: empty.length === 0, detail: { icon_buttons: m.iconButtons.length, empty_label: empty } };
  },

  token_binding({ m }) {
    return { pass: m.unbound.length === 0, detail: { unbound: m.unbound } };
  },

  service_a_index_text({ gate, m }) {
    const re = new RegExp(gate.pattern);
    const hits = m.texts.filter((t) => re.test(t.trim()));
    return { pass: hits.length >= 1, detail: { matches: hits } };
  },

  service_a_play_state({ m }) {
    const a = m.playState?.Playing;
    const b = m.playState?.Paused;
    const differs = !!a && !!b && (a.icon !== b.icon || a.label !== b.label);
    return { pass: differs, detail: { Playing: a ?? null, Paused: b ?? null } };
  },

  service_b_no_autoplay({ m }) {
    return { pass: m.afterTimeout === 0, detail: { after_timeout: m.afterTimeout } };
  },

  service_b_handoff({ gate, files }) {
    const found = files.P5.split('\n').some((l) => l.trim() === gate.line);
    return { pass: found, detail: { line: gate.line, found } };
  },
};

export function runGates(ctx, entries) {
  return entries.map(([id, gate]) => {
    const fn = CHECKERS[id];
    if (!fn) return { gate: id, pass: false, detail: { error: '판정 함수 없음 — scripts/lib.mjs에 추가 필요' } };
    try {
      return { gate: id, ...fn({ ...ctx, gate }) };
    } catch (e) {
      return { gate: id, pass: false, detail: { error: e.message } };
    }
  });
}
