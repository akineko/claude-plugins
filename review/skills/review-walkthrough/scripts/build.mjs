#!/usr/bin/env node
/**
 * review-walkthrough のビルドスクリプト（Node >= 18、依存パッケージなし）
 *
 *   map    — レビュー対象の差分を収集し、構造化マップ（map.json）と
 *            ファイル別パッチ（patches/*.patch）を作業ディレクトリに書き出す
 *   render — 分析結果（data.json）とマップを assets/template.html に合成し、
 *            自己完結の1枚 HTML を出力する
 *
 * 使い方:
 *   node build.mjs map [--target <spec>] [--out-dir <dir>]
 *   node build.mjs render --data <data.json> --map <map.json> --out <out.html>
 *                         [--template <path>] [--allow-uncovered]
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MAX_BUFFER = 512 * 1024 * 1024;
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const KINDS = ['discretion', 'external', 'interpretation', 'integration', 'risk', 'complexity'];
const SOURCES = ['conversation', 'doc', 'inferred'];
const LOCKFILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock',
  'Cargo.lock', 'go.sum', 'poetry.lock', 'uv.lock', 'Pipfile.lock',
  'Gemfile.lock', 'composer.lock', 'flake.lock', 'packages.lock.json',
]);
const FULLDIFF_MAX_LINES = 2000;
const NOISE_DIFF_MAX_LINES = 120;
const UNTRACKED_MAX_BYTES = 1024 * 1024;
const POINT_DIFFS_MAX = 3;
const CODEREF_MAX = 3;
const CODEREF_MAX_LINES = 40;
const COMMITS_SHOWN = 20;
const FETCH_STALE_HOURS = 24;

function die(msg) { console.error('[review-walkthrough] エラー: ' + msg); process.exit(1); }
function warnOut(msg) { console.error('[review-walkthrough] 警告: ' + msg); }

function git(root, args) {
  return execFileSync('git', ['-C', root, '-c', 'core.quotepath=false', ...args],
    { encoding: 'utf8', maxBuffer: MAX_BUFFER });
}
function gitTry(root, args) {
  try { return git(root, args).trim(); } catch { return null; }
}

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key === 'allow-uncovered') { opts[key] = true; continue; }
      opts[key] = argv[++i];
    } else opts._.push(a);
  }
  return opts;
}

/* ================= 対象の解決 ================= */
function defaultBranch(root) {
  const s = gitTry(root, ['symbolic-ref', '-q', '--short', 'refs/remotes/origin/HEAD']);
  if (s) return s.replace(/^origin\//, '');
  for (const b of ['main', 'master']) {
    if (gitTry(root, ['rev-parse', '--verify', '--quiet', 'refs/heads/' + b])) return b;
  }
  return null;
}

function resolveTarget(root, rawSpec) {
  const spec = (rawSpec || '').trim();
  if (!spec || spec === 'worktree') {
    if (!gitTry(root, ['rev-parse', '--verify', '--quiet', 'HEAD'])) {
      die('HEAD がありません（コミットが1つもないリポジトリでは対象を解決できません）');
    }
    return { spec: spec || '(未指定=未コミット変更)', label: '未コミット変更（staged + unstaged + untracked）', diffArgs: ['HEAD'], untracked: true };
  }
  if (spec === 'staged') return { spec, label: 'ステージ済みの変更', diffArgs: ['--cached'], untracked: false };
  if (spec === 'unstaged') return { spec, label: '未ステージの変更（+ untracked）', diffArgs: [], untracked: true };
  if (spec.includes('..')) return { spec, label: '範囲 ' + spec, diffArgs: [spec], untracked: false, commitRange: spec.replace('...', '..') };

  const isLocalBranch = gitTry(root, ['rev-parse', '--verify', '--quiet', 'refs/heads/' + spec]);
  const isRemoteBranch = !isLocalBranch && gitTry(root, ['rev-parse', '--verify', '--quiet', 'refs/remotes/' + spec]);
  const isOriginBranch = !isLocalBranch && !isRemoteBranch && gitTry(root, ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/' + spec]);
  if (isLocalBranch || isRemoteBranch || isOriginBranch) {
    const ref = isLocalBranch ? spec : (isRemoteBranch ? spec : 'origin/' + spec);
    const base = defaultBranch(root);
    if (!base) die('既定ブランチ（main/master/origin HEAD）を特定できません。<base>...<branch> の範囲形式で指定してください');
    if (ref === base || ref === 'origin/' + base) {
      die('対象が既定ブランチ（' + base + '）そのものです。コミットまたは範囲（A..B）で指定してください');
    }
    // 基準は origin/<base> を優先する（ローカル <base> の pull 忘れに結果が左右されないため）
    const baseRef = gitTry(root, ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/' + base]) ? 'origin/' + base : base;
    return { spec, label: 'ブランチ ' + ref + '（' + baseRef + ' との merge-base 起点）', diffArgs: [baseRef + '...' + ref], untracked: false, commitRange: baseRef + '..' + ref };
  }

  if (gitTry(root, ['rev-parse', '--verify', '--quiet', spec + '^{commit}'])) {
    const parent = gitTry(root, ['rev-parse', '--verify', '--quiet', spec + '^']);
    return { spec, label: 'コミット ' + spec, diffArgs: [parent ? spec + '^' : EMPTY_TREE, spec], untracked: false, commitRange: parent ? spec + '^..' + spec : spec };
  }
  die('対象を解決できません: ' + spec + '（staged / unstaged / コミット / A..B / ブランチ のいずれかで指定してください）');
}

/* ================= 対象コミットと基準の鮮度 ================= */
function listCommits(root, range) {
  const out = gitTry(root, ['log', '--format=%h %s', range]);
  if (out === null) return null;
  return out ? out.split('\n') : [];
}

function fetchAgeHours(root) {
  const common = gitTry(root, ['rev-parse', '--git-common-dir']);
  if (!common) return null;
  try {
    const mtime = fs.statSync(path.resolve(root, common, 'FETCH_HEAD')).mtimeMs;
    return (Date.now() - mtime) / 3600000;
  } catch { return null; } // FETCH_HEAD が無い（fetch 履歴が無い）場合は判定しない
}

/* ================= map: 差分の収集と構造化 ================= */
function splitPatches(bigPatch) {
  const chunks = [];
  let cur = null;
  for (const line of bigPatch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      if (cur) chunks.push(cur);
      cur = [line];
    } else if (cur) cur.push(line);
  }
  if (cur) chunks.push(cur);
  return chunks.map(lines => lines.join('\n') + '\n');
}

function parsePatch(patch) {
  const lines = patch.split('\n');
  let pathNew = null, pathOld = null, status = 'M', binary = false;
  let adds = 0, dels = 0;
  const hunks = [];
  for (const line of lines) {
    if (line.startsWith('rename from ')) { pathOld = line.slice(12); status = 'R'; }
    else if (line.startsWith('rename to ')) { pathNew = line.slice(10); }
    else if (line.startsWith('new file mode')) status = 'A';
    else if (line.startsWith('deleted file mode')) status = 'D';
    else if (line.startsWith('+++ b/')) pathNew = pathNew || line.slice(6);
    else if (line.startsWith('--- a/')) pathOld = pathOld || line.slice(6);
    else if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) binary = true;
    else if (line.startsWith('@@')) { if (hunks.length < 30) hunks.push(line); }
    else if (line.startsWith('+') && !line.startsWith('+++')) adds++;
    else if (line.startsWith('-') && !line.startsWith('---')) dels++;
  }
  if (!pathNew) {
    if (status === 'D' && pathOld) pathNew = pathOld;
    else {
      const m = lines[0].match(/^diff --git a\/(.*) b\/(.*)$/);
      if (m && m[1] === m[2]) pathNew = m[1];
      else pathNew = m ? m[2] : '(パス解決不可)';
    }
  }
  return {
    path: pathNew,
    oldPath: status === 'R' ? pathOld : undefined,
    status, binary, adds, dels, hunks,
  };
}

function mechanicalKind(p) {
  if (LOCKFILES.has(path.basename(p))) return 'lockfile';
  if (/(^|\/)(dist|build|out|coverage|__generated__|__snapshots__|\.next|node_modules|vendor)\//.test(p)) return 'generated';
  if (/\.min\.(js|css)$/.test(p) || /\.(snap|map)$/.test(p) || /_pb2?\.\w+$/.test(p) || /\.generated\.\w+$/.test(p)) return 'generated';
  return null;
}

function collectUntracked(root) {
  const out = gitTry(root, ['ls-files', '--others', '--exclude-standard']) || '';
  const entries = [];
  for (const rel of out.split('\n').filter(Boolean)) {
    const abs = path.join(root, rel);
    let st;
    try { st = fs.statSync(abs); } catch { continue; }
    if (!st.isFile()) continue;
    if (st.size > UNTRACKED_MAX_BYTES) {
      entries.push({ path: rel, status: 'A', untracked: true, binary: false, adds: 0, dels: 0, hunks: [], patch: null, note: '1MB 超の新規ファイルのため diff を省略（' + Math.round(st.size / 1024) + 'KB）' });
      continue;
    }
    const buf = fs.readFileSync(abs);
    if (buf.subarray(0, 8000).includes(0)) {
      entries.push({ path: rel, status: 'A', untracked: true, binary: true, adds: 0, dels: 0, hunks: [], patch: null });
      continue;
    }
    let text = buf.toString('utf8');
    const noEol = !text.endsWith('\n');
    if (!noEol) text = text.slice(0, -1);
    const bodyLines = text === '' ? [] : text.split('\n');
    const patch =
      'diff --git a/' + rel + ' b/' + rel + '\n' +
      'new file mode 100644\n--- /dev/null\n+++ b/' + rel + '\n' +
      '@@ -0,0 +1,' + bodyLines.length + ' @@\n' +
      bodyLines.map(l => '+' + l).join('\n') + (bodyLines.length ? '\n' : '') +
      (noEol ? '\\ No newline at end of file\n' : '');
    entries.push({
      path: rel, status: 'A', untracked: true, binary: false,
      adds: bodyLines.length, dels: 0,
      hunks: ['@@ -0,0 +1,' + bodyLines.length + ' @@'], patch,
    });
  }
  return entries;
}

function slugify(p) {
  return p.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(-60) || 'file';
}

function cmdMap(opts) {
  const root = gitTry(process.cwd(), ['rev-parse', '--show-toplevel']);
  if (!root) die('git リポジトリ内で実行してください');
  const target = resolveTarget(root, opts.target);

  let bigPatch = '';
  try {
    bigPatch = git(root, ['diff', '--no-color', '--no-ext-diff', '--find-renames', '--patch', ...target.diffArgs]);
  } catch (e) {
    die('git diff に失敗しました: ' + (e.stderr || e.message));
  }

  const files = splitPatches(bigPatch).map(patch => ({ ...parsePatch(patch), patch }));
  if (target.untracked) files.push(...collectUntracked(root));
  files.sort((a, b) => a.path.localeCompare(b.path));

  if (files.length === 0) {
    console.log('[review-walkthrough] 対象「' + target.label + '」に差分がありません。');
    process.exit(0);
  }

  const outDir = opts['out-dir'] || fs.mkdtempSync(path.join(os.tmpdir(), 'review-walkthrough-'));
  const patchDir = path.join(outDir, 'patches');
  fs.mkdirSync(patchDir, { recursive: true });

  const mapFiles = files.map((f, i) => {
    let patchRel = null;
    if (f.patch) {
      patchRel = 'patches/' + String(i + 1).padStart(4, '0') + '-' + slugify(f.path) + '.patch';
      fs.writeFileSync(path.join(outDir, patchRel), f.patch);
    }
    return {
      path: f.path,
      oldPath: f.oldPath,
      status: f.status,
      untracked: f.untracked || false,
      binary: f.binary,
      adds: f.adds,
      dels: f.dels,
      mechanical: mechanicalKind(f.path),
      patch: patchRel,
      hunks: f.hunks,
      note: f.note,
    };
  });

  const totals = {
    files: mapFiles.length,
    adds: mapFiles.reduce((s, f) => s + f.adds, 0),
    dels: mapFiles.reduce((s, f) => s + f.dels, 0),
  };
  const commits = target.commitRange ? listCommits(root, target.commitRange) : null;
  const map = {
    target: { spec: target.spec, label: target.label, diffArgs: target.diffArgs },
    root,
    generatedAt: new Date().toISOString(),
    totals,
    commits: commits ? { range: target.commitRange, count: commits.length, list: commits.slice(0, COMMITS_SHOWN) } : undefined,
    files: mapFiles,
  };
  fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(map, null, 2));

  console.log('[review-walkthrough] 対象: ' + target.label + '（git diff ' + target.diffArgs.join(' ') + '）');
  console.log('ファイル ' + totals.files + ' ・ +' + totals.adds + ' −' + totals.dels);
  for (const f of mapFiles) {
    const tags = [f.untracked ? 'untracked' : null, f.binary ? 'binary' : null, f.mechanical].filter(Boolean);
    console.log('  ' + f.status.padEnd(2) + ' +' + String(f.adds).padEnd(5) + '−' + String(f.dels).padEnd(5) +
      f.path + (tags.length ? '  [' + tags.join(', ') + ']' : ''));
  }
  if (commits) {
    console.log('');
    console.log('コミット ' + commits.length + ' 件（' + target.commitRange + '）:');
    for (const c of commits.slice(0, COMMITS_SHOWN)) console.log('  ' + c);
    if (commits.length > COMMITS_SHOWN) console.log('  …他 ' + (commits.length - COMMITS_SHOWN) + ' 件');
  }
  console.log('');
  console.log('map: ' + path.join(outDir, 'map.json'));
  console.log('patches: ' + patchDir + path.sep);

  if (target.diffArgs.some(a => a.includes('origin/'))) {
    const age = fetchAgeHours(root);
    if (age !== null && age >= FETCH_STALE_HOURS) {
      warnOut('最終 fetch から約 ' + Math.round(age) + ' 時間経過しています（FETCH_HEAD の更新時刻）。基準の origin/* が実際のリモートより古い可能性があります。正確を期すには git fetch 後の再実行を検討してください');
    }
  }
}

/* ================= render: HTML の組み立て ================= */
function truncatePatch(patch, maxLines) {
  const lines = patch.replace(/\n$/, '').split('\n');
  if (lines.length <= maxLines) return { diff: patch, note: null };
  return {
    diff: lines.slice(0, maxLines).join('\n') + '\n',
    note: '表示は先頭 ' + maxLines + ' 行まで（全体 ' + lines.length + ' 行）。全文は git で参照してください。',
  };
}

function validateData(data) {
  const errors = [], warnings = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  need(data && typeof data === 'object', 'data.json がオブジェクトではありません');
  if (!data || typeof data !== 'object') return { errors, warnings };
  need(data.meta && typeof data.meta.title === 'string' && data.meta.title, 'meta.title は必須です');
  need(data.overview && typeof data.overview.summary === 'string' && data.overview.summary, 'overview.summary は必須です');
  need(Array.isArray(data.units) && data.units.length > 0, 'units は1件以上必要です');
  const uids = new Set(), pids = new Set(), pnos = new Set();
  for (const u of data.units || []) {
    const where = 'unit ' + (u && u.id);
    need(u.id && !uids.has(u.id), where + ': id が空か重複しています'); uids.add(u.id);
    need(u.name, where + ': name は必須です');
    need(u.goal, where + ': goal は必須です');
    for (const [k, hint] of [
      ['tagline', 'name が同じ役割を果たすため廃止しました'],
      ['flow', 'files[] の並び順と role（このユニットでの役割）へ移してください'],
      ['fileNotes', 'files[].note へ移してください'],
    ]) if (u[k] !== undefined) errors.push(where + ': 旧形式の ' + k + ' があります。' + hint);
    need(Array.isArray(u.files) && u.files.length > 0, where + ': files は1件以上必要です');
    if ((u.files || []).some(f => typeof f === 'string')) {
      errors.push(where + ': 旧形式の files（文字列の配列）です。{path, role} の配列（並び順＝読む順）に移行してください');
    }
    for (const f of (Array.isArray(u.files) ? u.files : [])) {
      if (typeof f === 'string') continue;
      need(f && typeof f.path === 'string' && f.path, where + ': files[].path は必須です');
      need(f && typeof f.role === 'string' && f.role, where + ': files[].role（このユニットでの役割）は必須です: ' + (f && f.path));
    }
    if (u.background !== undefined) {
      need(typeof u.background === 'string' && u.background, where + ': background は空にしないでください（不要なら省略する）');
    }
    if (u.codeRefs !== undefined) {
      need(Array.isArray(u.codeRefs) && u.codeRefs.length <= CODEREF_MAX, where + ': codeRefs は最大 ' + CODEREF_MAX + ' 件です');
      need(u.background, where + ': codeRefs は background の引用なので、background なしでは使えません');
      for (const r of (Array.isArray(u.codeRefs) ? u.codeRefs : [])) {
        need(r && typeof r.file === 'string' && r.file, where + ': codeRefs[].file は必須です');
        need(r && typeof r.lines === 'string' && /^\d+(-\d+)?$/.test(r.lines),
          where + ': codeRefs[].lines は "12-30" または "12" の形式です（現在: ' + (r && r.lines) + '）');
        need(r && typeof r.caption === 'string' && r.caption, where + ': codeRefs[].caption（この引用が何を示すか）は必須です');
      }
    }
    need(Array.isArray(u.points), where + ': points は配列が必須です（0件可）');
    if (Array.isArray(u.points) && u.points.length === 0) warnings.push(where + ': ポイントが 0 件です（説明と全 diff のみの表示になります）');
    if (Array.isArray(u.points) && u.points.length > 6) warnings.push(where + ': ポイントが ' + u.points.length + ' 件あります（目安は 2〜5 件）');
    for (const p of u.points || []) {
      const pw = 'point ' + (p && p.id);
      need(p.id && !pids.has(p.id), pw + ': id が空か重複しています'); pids.add(p.id);
      need(Number.isInteger(p.no) && !pnos.has(p.no), pw + ': no（通し番号）が空か重複しています'); pnos.add(p.no);
      need(KINDS.includes(p.kind), pw + ': kind は ' + KINDS.join('/') + ' のいずれかです（現在: ' + p.kind + '）');
      need(typeof p.file === 'string' && p.file, pw + ': file は必須です');
      if (p.file && !/:\d+$/.test(p.file)) warnings.push(pw + ': file に行番号（path:line）がありません');
      for (const k of ['title', 'what', 'whatPlain', 'why']) need(typeof p[k] === 'string' && p[k], pw + ': ' + k + ' は必須です');
      need(SOURCES.includes(p.whySource), pw + ': whySource は ' + SOURCES.join('/') + ' のいずれかです（現在: ' + p.whySource + '）');
      need(Array.isArray(p.checks) && p.checks.length > 0, pw + ': checks は1件以上必要です');
      need(Array.isArray(p.premises || []), pw + ': premises は配列です');
      if (p.diff !== undefined) errors.push(pw + ': 旧形式の diff（単数文字列）です。diffs: [{file, diff}] の配列に移行してください');
      need(Array.isArray(p.diffs) && p.diffs.length >= 1 && p.diffs.length <= POINT_DIFFS_MAX,
        pw + ': diffs（抜粋）は {file, diff} の配列で 1〜' + POINT_DIFFS_MAX + ' 件必要です');
      for (const d of (Array.isArray(p.diffs) ? p.diffs : [])) {
        need(d && typeof d.file === 'string' && d.file, pw + ': diffs[].file は必須です');
        need(d && typeof d.diff === 'string' && d.diff, pw + ': diffs[].diff は必須です');
        if (d && typeof d.diff === 'string' && d.diff && !d.diff.includes('@@')) warnings.push(pw + ': diffs の抜粋に @@ ハンクヘッダがありません（行番号が表示されません）');
      }
      if (Array.isArray(p.diffs) && p.diffs[0] && typeof p.diffs[0].file === 'string' && typeof p.file === 'string' &&
          p.diffs[0].file.split(':')[0] !== p.file.split(':')[0]) {
        warnings.push(pw + ': file（代表位置）と diffs 先頭のファイルが一致していません');
      }
    }
  }
  for (const g of data.noise || []) {
    need(g && g.name, 'noise グループ: name は必須です');
    need(g && g.reason, 'noise グループ ' + (g && g.name) + ': reason（分類根拠）は必須です');
  }
  return { errors, warnings };
}

/**
 * ユニット背景のコード引用をワークツリーの現物から抽出する。
 * モデルにコードを転記させないため、data.json には file と行範囲だけを書かせる。
 */
function extractCodeRef(root, ref, changedPaths, warnings) {
  const abs = path.resolve(root, ref.file);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) die('codeRefs: リポジトリ外のファイルは引用できません: ' + ref.file);
  let buf;
  try { buf = fs.readFileSync(abs); } catch { die('codeRefs: ファイルを読めません: ' + ref.file); }
  if (buf.subarray(0, 8000).includes(0)) die('codeRefs: バイナリファイルは引用できません: ' + ref.file);

  const lines = buf.toString('utf8').replace(/\n$/, '').split('\n');
  const m = ref.lines.match(/^(\d+)(?:-(\d+))?$/);
  const start = Number(m[1]);
  let end = m[2] ? Number(m[2]) : start;
  if (start < 1 || start > lines.length) die('codeRefs: 開始行が範囲外です（' + ref.file + ' は ' + lines.length + ' 行）: ' + ref.lines);
  if (end < start) die('codeRefs: 行範囲が逆転しています: ' + ref.file + ':' + ref.lines);
  if (end > lines.length) {
    warnings.push('codeRefs: 終了行をファイル末尾に丸めました（' + ref.file + ':' + ref.lines + ' → ' + lines.length + '）');
    end = lines.length;
  }
  if (end - start + 1 > CODEREF_MAX_LINES) {
    die('codeRefs: 1件あたり ' + CODEREF_MAX_LINES + ' 行までです（' + ref.file + ':' + ref.lines + ' は ' + (end - start + 1) + ' 行）');
  }
  if (changedPaths.has(rel)) {
    warnings.push('codeRefs: 変更対象ファイルからの引用です（' + ref.file + '）。変更点はファイル行の diff が示すので、背景に必要かを確認してください');
  }
  return { file: rel, caption: ref.caption, startLine: start, endLine: end, code: lines.slice(start - 1, end).join('\n') };
}

function cmdRender(opts) {
  for (const k of ['data', 'map', 'out']) if (!opts[k]) die('render には --' + k + ' が必要です');
  const data = JSON.parse(fs.readFileSync(opts.data, 'utf8'));
  const map = JSON.parse(fs.readFileSync(opts.map, 'utf8'));
  const mapDir = path.dirname(path.resolve(opts.map));
  const tplPath = opts.template || path.join(SCRIPT_DIR, '..', 'assets', 'template.html');
  const tpl = fs.readFileSync(tplPath, 'utf8');
  if (!/\/\*__WALKTHROUGH_DATA__\*\//.test(tpl)) die('テンプレートにデータ注入プレースホルダが見つかりません: ' + tplPath);

  const { errors, warnings } = validateData(data);
  if (errors.length) die('data.json の検証エラー:\n  - ' + errors.join('\n  - '));

  const byPath = new Map(map.files.map(f => [f.path, f]));
  const readPatch = f => (f && f.patch) ? fs.readFileSync(path.join(mapDir, f.patch), 'utf8') : null;

  // 完全性検査: 変更された全ファイルがユニットかノイズ棚に割り当てられているか
  const claimed = new Map();
  for (const u of data.units) for (const f of u.files) if (!claimed.has(f.path)) claimed.set(f.path, u.id);
  for (const g of data.noise || []) {
    for (const f of g.files || []) {
      const p = typeof f === 'string' ? f : f.path;
      if (!claimed.has(p)) claimed.set(p, 'noise');
    }
  }
  const unclaimed = map.files.map(f => f.path).filter(p => !claimed.has(p));
  const unknownClaims = [...claimed.keys()].filter(p => !byPath.has(p));
  for (const p of unknownClaims) warnings.push('割り当てられたファイルが差分に存在しません（パスの誤記?）: ' + p);
  if (unclaimed.length) {
    if (!opts['allow-uncovered']) {
      die('どのユニット・ノイズ棚にも割り当てられていない変更ファイルがあります:\n  - ' + unclaimed.join('\n  - ') +
        '\nユニットまたはノイズ棚に割り当てて再実行してください（暫定回避: --allow-uncovered。その場合「未分類」グループとして明示されます）');
    }
    data.noise = data.noise || [];
    data.noise.push({
      name: '未分類の変更（自動追加）',
      sub: unclaimed.length + ' ファイル',
      reason: '分析でどのユニットにも割り当てられなかったファイル。内容は未確認のため必ず目を通してください',
      files: unclaimed,
    });
    warnings.push('未割り当ての ' + unclaimed.length + ' ファイルを「未分類の変更」グループとしてノイズ棚に追加しました');
  }

  // ファイル行への充填（モデルによる転記を排除する）: 統計・diff 本文・そのファイルに載るポイント番号
  const changedPaths = new Set(map.files.map(f => f.path));
  for (const u of data.units) {
    const pointNos = new Map();
    for (const p of u.points) {
      const paths = new Set([p.file, ...(p.diffs || []).map(d => d.file)]
        .filter(x => typeof x === 'string').map(x => x.replace(/:\d+$/, '')));
      for (const q of paths) {
        if (!pointNos.has(q)) pointNos.set(q, []);
        if (!pointNos.get(q).includes(p.no)) pointNos.get(q).push(p.no);
      }
    }
    u.files = u.files.map((row, i) => {
      const out = { ...row, rowId: u.id + '-f' + (i + 1), points: (pointNos.get(row.path) || []).sort((a, b) => a - b) };
      const f = byPath.get(row.path);
      if (!f) return { ...out, diff: '', diffNote: '差分に存在しないパス（要確認）' };
      Object.assign(out, { status: f.status, binary: f.binary, adds: f.adds, dels: f.dels });
      if (f.binary) return { ...out, diff: '', diffNote: 'バイナリファイルのため diff なし' };
      const patch = readPatch(f);
      if (!patch) return { ...out, diff: '', diffNote: f.note || 'diff を取得できませんでした' };
      const t = truncatePatch(patch, FULLDIFF_MAX_LINES);
      return { ...out, diff: t.diff, diffNote: t.note || undefined };
    });
    if (u.codeRefs) u.codeRefs = u.codeRefs.map(r => extractCodeRef(map.root, r, changedPaths, warnings));
  }

  // ノイズ棚: ファイル統計の付与と、小さなグループへの diff 添付
  for (const g of data.noise || []) {
    if (!g.files) continue;
    g.files = g.files.map(f => {
      const p = typeof f === 'string' ? f : f.path;
      const m = byPath.get(p);
      return m ? { path: p, adds: m.adds, dels: m.dels, binary: m.binary } : { path: p };
    });
    const total = g.files.reduce((s, f) => s + (f.adds || 0) + (f.dels || 0), 0);
    if (!g.diffs && total > 0 && total <= NOISE_DIFF_MAX_LINES) {
      g.diffs = g.files
        .map(f => byPath.get(f.path))
        .filter(m => m && !m.binary && m.patch)
        .map(m => {
          const t = truncatePatch(readPatch(m), 200);
          return { file: m.path, diff: t.diff, note: t.note || undefined };
        });
    }
  }

  // メタ情報の確定（統計は map を唯一の出所とする）
  const noisePaths = new Set();
  for (const g of data.noise || []) for (const f of g.files || []) noisePaths.add(typeof f === 'string' ? f : f.path);
  data.meta.stats = {
    files: map.totals.files,
    adds: map.totals.adds,
    dels: map.totals.dels,
    noiseFiles: noisePaths.size,
  };
  data.meta.target = data.meta.target || map.target.label;
  data.meta.command = data.meta.command || ('/review-walkthrough ' + map.target.spec);
  if (!data.meta.generated) {
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    data.meta.generated = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = tpl.replace(/\/\*__WALKTHROUGH_DATA__\*\/[\s\S]*?\/\*__WALKTHROUGH_DATA_END__\*\//, () => json);
  fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
  fs.writeFileSync(opts.out, html);

  const points = data.units.reduce((s, u) => s + u.points.length, 0);
  const backgrounds = data.units.filter(u => u.background).length;
  const codeRefs = data.units.reduce((s, u) => s + (u.codeRefs || []).length, 0);
  console.log('[review-walkthrough] 出力: ' + opts.out + '（' + Math.round(html.length / 1024) + 'KB）');
  console.log('ユニット ' + data.units.length + '（背景 ' + backgrounds + ' ・ コード引用 ' + codeRefs + '）' +
    ' ・ 重要ポイント ' + points + ' ・ ノイズ棚 ' + noisePaths.size + ' ファイル');
  for (const w of warnings) warnOut(w);
}

/* ================= エントリポイント ================= */
const [cmd, ...rest] = process.argv.slice(2);
const opts = parseArgs(rest);
if (cmd === 'map') cmdMap(opts);
else if (cmd === 'render') cmdRender(opts);
else {
  console.error('使い方:\n  node build.mjs map [--target <spec>] [--out-dir <dir>]\n  node build.mjs render --data <data.json> --map <map.json> --out <out.html> [--template <path>] [--allow-uncovered]');
  process.exit(cmd ? 1 : 0);
}
