#!/usr/bin/env node
/**
 * FringeIsland project dashboard generator.
 *
 * Reads scripts/dashboard/sources.json (the manifest), extracts EXACT text from
 * the canonical .md files, computes a few live build metrics from the repo, and
 * renders a self-contained docs/dashboard/index.html — a tabbed dashboard with a
 * modal .md viewer.
 *
 * The dashboard owns no prose of its own: every panel's content is derived from
 * a .md file (per the manifest) or measured from the repo. Re-run to refresh the
 * snapshot. The in-page file viewer is always live (fetches current files).
 *
 *   npm run dashboard         # regenerate the dashboard
 *   npm run dashboard:serve   # serve the repo so file links open in the browser
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const matter = require('gray-matter');

const REPO = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO, 'docs', 'dashboard');
const MANIFEST = path.join(__dirname, 'sources.json');
const MARKED_UMD = path.join(REPO, 'node_modules', 'marked', 'lib', 'marked.umd.js'); // vendored for the browser

let MARKED = null; // marked's parse fn, loaded via dynamic import in main()
function md2html(src) {
  if (!MARKED) return `<pre style="white-space:pre-wrap">${esc(String(src || ''))}</pre>`;
  try { return MARKED(String(src || '')); }
  catch { return `<pre style="white-space:pre-wrap">${esc(String(src || ''))}</pre>`; }
}

// ---------- small helpers ----------
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function readFileSafe(rel) {
  try { return fs.readFileSync(path.join(REPO, rel), 'utf8'); } catch { return null; }
}
function walk(absDir, test, acc) {
  acc = acc || [];
  let entries = [];
  try { entries = fs.readdirSync(absDir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const abs = path.join(absDir, e.name);
    if (e.isDirectory()) walk(abs, test, acc);
    else if (test(abs)) acc.push(abs);
  }
  return acc;
}
function relPosix(abs) { return path.relative(REPO, abs).split(path.sep).join('/'); }

function extractSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const norm = heading.trim().toLowerCase();
  const level = (heading.match(/^#+/) || ['#'])[0].length;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === norm) { start = i; break; }
  }
  if (start === -1) return null;
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/);
    if (m && m[1].length <= level) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}
function extractIntro(content) {
  let body = content;
  try { body = matter(content).content; } catch { /* keep raw */ }
  const lines = body.split(/\r?\n/);
  const out = [];
  let seen = 0;
  for (const ln of lines) {
    if (/^#{1,6}\s/.test(ln) && out.some((l) => l.trim())) break;
    out.push(ln);
    if (ln.trim()) seen++;
    if (seen >= 8) break;
  }
  return out.join('\n').trim();
}
// A short plain-text summary: prefer a "Purpose" section, else the first prose paragraph.
function extractSummary(content) {
  let body = content;
  try { body = matter(content).content; } catch { /* keep raw */ }
  const lines = body.split(/\r?\n/);
  let collected = [];
  const pIdx = lines.findIndex((l) => /^#{1,4}\s/.test(l) && /purpose/i.test(l));
  if (pIdx >= 0) {
    for (let i = pIdx + 1; i < lines.length; i++) { if (/^#{1,6}\s/.test(lines[i])) break; collected.push(lines[i]); }
  } else {
    let started = false;
    for (const l of lines) {
      const t = l.trim();
      if (!started) {
        if (!t || /^#{1,6}\s/.test(t) || t.startsWith('---') || t.startsWith('>') || t.startsWith('|') || /^\*\*[^*]+:\*\*/.test(t)) continue;
        started = true;
      }
      if (!t) break;
      collected.push(t);
    }
  }
  let txt = collected.join(' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (txt.length > 340) { txt = txt.slice(0, 340).replace(/\s+\S*$/, '') + '…'; }
  return txt || '(no summary found)';
}
function firstHeadingTitle(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

// ---------- block renderers ----------
function blockLinks(b) {
  const items = (b.items || []).map((it) => `<li>${fileLink(it.path, it.label)}</li>`).join('');
  return `<ul class="links">${items}</ul>`;
}
function blockFolders() {
  const docs = path.join(REPO, 'docs');
  let dirs = [];
  try {
    dirs = fs.readdirSync(docs, { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch { /* none */ }
  const rows = dirs.map((d) => {
    const readme = readFileSafe(`docs/${d}/README.md`);
    let purpose = '';
    if (readme) {
      const m = readme.match(/\*\*Purpose:\*\*\s*(.+)/);
      purpose = m ? m[1].trim() : (extractIntro(readme).split('\n').find((l) => l.trim() && !l.startsWith('#')) || '');
    }
    purpose = purpose.replace(/[`*]/g, '').slice(0, 200);
    const link = fs.existsSync(path.join(docs, d, 'README.md')) ? fileLink(`docs/${d}/README.md`, d) : `<span class="mono">${esc(d)}</span>`;
    return `<tr><td class="folder">${link}</td><td>${esc(purpose)}</td></tr>`;
  }).join('');
  return `<table class="folders"><tbody>${rows}</tbody></table>`;
}
function blockEntities(b) {
  return (b.groups || []).map((g) => {
    const rows = (g.items || []).map((it) => {
      const c = readFileSafe(it.path);
      const sum = c == null ? '<span class="note">no spec yet</span>' : esc(extractSummary(c));
      return `<div class="ent"><div class="ent-name">${fileLink(it.path, it.label)}</div><div class="ent-sum">${sum}</div></div>`;
    }).join('');
    const h = g.label ? `<div class="ent-group-h">${esc(g.label)}</div>` : '';
    return `<div class="ent-group">${h}${rows}</div>`;
  }).join('');
}
function blockIntro(b) {
  const c = readFileSafe(b.path);
  if (c == null) return missing(b.path);
  return `<div class="excerpt">${md2html(extractIntro(c))}</div>${sourceLine(b.path)}`;
}
function blockSection(b) {
  const c = readFileSafe(b.path);
  if (c == null) return missing(b.path);
  const sec = extractSection(c, b.heading);
  if (sec == null) return `<div class="note">Section not found: <span class="mono">${esc(b.heading)}</span></div>${sourceLine(b.path)}`;
  return `<div class="excerpt">${md2html(sec)}</div>${sourceLine(b.path)}`;
}
function blockToc(b) {
  const c = readFileSafe(b.path);
  if (c == null) return missing(b.path);
  const heads = (c.match(/^##\s+.+$/gm) || []).map((h) => h.replace(/^##\s+/, '').trim());
  if (!heads.length) return `<div class="note">No sections found.</div>`;
  return `<ul class="toc">${heads.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`;
}
function blockAdrs() {
  const dir = path.join(REPO, 'docs', 'architecture', 'decisions');
  const files = walk(dir, (f) => /ADR-.*\.md$/i.test(f)).sort();
  const items = files.map((abs) => {
    const c = fs.readFileSync(abs, 'utf8');
    const title = firstHeadingTitle(c) || path.basename(abs);
    return `<li>${fileLink(relPosix(abs), title)}</li>`;
  });
  return `<div class="count">${items.length} decisions</div><ul class="links adrs">${items.join('')}</ul>`;
}
function blockCqs(b) {
  const c = readFileSafe(b.path);
  if (c == null) return missing(b.path);
  const lines = c.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^###\s+(CQ-\d+:.*)$/);
    if (m) {
      let status = '';
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const sm = lines[j].match(/\*\*Status:\*\*\s*(.+)/);
        if (sm) { status = sm[1].trim(); break; }
      }
      rows.push(`<tr><td>${esc(m[1])}</td><td class="status">${esc(status)}</td></tr>`);
    }
  }
  if (!rows.length) return `<div class="note">No open questions found.</div>`;
  return `<table class="cqs"><tbody>${rows.join('')}</tbody></table>${sourceLine(b.path)}`;
}
function blockWaves() {
  const order = ['ferd', 'eid', 'hamn', 'heim', 'brim', 'urd'];
  const items = order.map((w) => {
    const rel = `docs/planning/waves/${w}.md`;
    const c = readFileSafe(rel);
    if (c == null) return null;
    return `<li>${fileLink(rel, firstHeadingTitle(c) || w)}</li>`;
  }).filter(Boolean);
  return `<ol class="links waves">${items.join('')}</ol>`;
}
function blockMetrics() {
  const migrations = walk(path.join(REPO, 'supabase', 'migrations'),
    (f) => /\.sql$/.test(f) && !/[\\/]archive[\\/]/.test(f)).length;
  const tests = walk(path.join(REPO, 'tests'), (f) => /\.(test|spec)\.[tj]sx?$/.test(f)).length;
  const apiRoutes = walk(path.join(REPO, 'app', 'api'), (f) => /[\\/]route\.ts$/.test(f)).length;
  const adrs = walk(path.join(REPO, 'docs', 'architecture', 'decisions'), (f) => /ADR-.*\.md$/i.test(f)).length;
  let lastCode = 'unknown';
  try {
    lastCode = execSync('git log -1 --format=%cs -- app lib components supabase', { cwd: REPO })
      .toString().trim() || 'unknown';
  } catch { /* ignore */ }
  const cards = [
    ['Migrations', migrations], ['Test files', tests], ['API routes', apiRoutes],
    ['ADRs', adrs], ['Last code commit', lastCode]
  ];
  return `<div class="metrics">${cards.map(([k, v]) =>
    `<div class="metric"><span class="metric-v">${esc(v)}</span><span class="metric-k">${esc(k)}</span></div>`).join('')}</div>`;
}
function blockActivity() {
  const SEP = String.fromCharCode(31);
  let commits = '';
  try { commits = execSync('git log -6 --format=%cs%x1f%s', { cwd: REPO }).toString().trim(); } catch { /* ignore */ }
  if (!commits) return `<table class="activity"><tbody><tr><td class="note">no git history</td></tr></tbody></table>`;
  const rows = commits.split('\n').map((l) => {
    const k = l.indexOf(SEP);
    const d = k < 0 ? '' : l.slice(0, k);
    const s = k < 0 ? l : l.slice(k + 1);
    return `<tr><td class="mono">${esc(d)}</td><td>${esc(s)}</td></tr>`;
  }).join('');
  return `<table class="activity"><tbody>${rows}</tbody></table>`;
}
function blockSvg(b) {
  if (!fs.existsSync(path.join(REPO, b.path))) return missing(b.path);
  return `<object class="svg" type="image/svg+xml" data="/${b.path}"></object>${sourceLine(b.path)}`;
}

function missing(p) { return `<div class="note">Missing source: <span class="mono">${esc(p)}</span></div>`; }
function sourceLine(p) { return `<div class="src">source: ${fileLink(p, p)}</div>`; }
function fileLink(p, label) {
  if (/\.md$/i.test(p)) return `<a class="md-link" data-md="/${esc(p)}" href="#">${esc(label)}</a>`;
  return `<a class="ext-link" href="/${esc(p)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

const RENDERERS = {
  links: blockLinks, folders: blockFolders, entities: blockEntities, intro: blockIntro, section: blockSection,
  toc: blockToc, adrs: blockAdrs, cqs: blockCqs, waves: blockWaves,
  metrics: blockMetrics, activity: blockActivity, svg: blockSvg
};
function renderBlock(b) {
  let body;
  try { body = (RENDERERS[b.type] || (() => `<div class="note">Unknown block: ${esc(b.type)}</div>`))(b); }
  catch (e) { body = `<div class="note">Error rendering ${esc(b.type)}: ${esc(e.message)}</div>`; }
  return `<section class="block"><div class="block-label">${esc(b.label || '')}</div>${body}</section>`;
}

function buildFileIndex() {
  const files = walk(path.join(REPO, 'docs'), (f) => /\.md$/i.test(f)).map(relPosix).sort();
  return files.map((p) => ({ p }));
}

// ---------- page template (tabbed) ----------
function renderPage(manifest, panels, fileIndex, stamp) {
  const indexJson = JSON.stringify(fileIndex).replace(/</g, '\\u003c');
  const tabs = panels.map((p, i) =>
    `<button class="tab${i === 0 ? ' active' : ''}" data-tab="${esc(p.id)}">${esc(p.label)}</button>`).join('') +
    `<button class="tab" data-tab="__browse">Browse files</button>`;
  const panes = panels.map((p, i) =>
    `<section class="pane${i === 0 ? ' active' : ''}" id="pane-${esc(p.id)}">
       <h2>${esc(p.title)}</h2><p class="blurb">${esc(p.blurb)}</p>${p.html}</section>`).join('') +
    `<section class="pane" id="pane-__browse">
       <h2>Browse files</h2><p class="blurb">Every Markdown file under docs/. Click to open in the viewer.</p>
       <input id="search" placeholder="filter files…" autocomplete="off"><div class="tree" id="tree"></div></section>`;
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(manifest.title)}</title>
<script src="./marked.umd.js"></script>
<style>
:root{--bg:#fdfcf7;--surface:#fff;--surface-2:#f1efe8;--hover:#e8e5db;--text:#3d3d3a;--muted:#5f5e5a;--subtle:#888780;--border:rgba(0,0,0,.12);--red:#A32D2D;--red-bg:#FCEBEB;--accent:#2d6a4f;}
*{box-sizing:border-box}
body{margin:0;font:15px/1.65 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text)}
header{padding:20px 32px 0}
header h1{margin:0;font-size:21px;letter-spacing:.2px}
header p{margin:4px 0 14px;color:var(--subtle);font-size:13px}
.tabs{display:flex;flex-wrap:wrap;gap:2px;padding:0 28px;border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:5}
.tab{appearance:none;border:none;background:none;font:inherit;font-size:14px;color:var(--muted);padding:11px 16px;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-1px;border-radius:6px 6px 0 0}
.tab:hover{background:var(--surface-2);color:var(--text)}
.tab.active{color:var(--red);border-bottom-color:var(--red);font-weight:600}
main{max-width:920px;margin:0 auto;padding:28px 32px 80px}
.pane{display:none;animation:fade .15s ease}
.pane.active{display:block}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.pane>h2{margin:0 0 2px;font-size:24px;letter-spacing:.2px}
.pane>.blurb{margin:0 0 26px;color:var(--subtle);font-size:14px}
.block{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 22px;margin:0 0 18px}
.block-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);font-weight:700;margin-bottom:10px}
.excerpt{font-size:14px;color:var(--text);overflow-wrap:anywhere}
.excerpt :is(h1,h2,h3){font-size:15px;margin:.5em 0;color:var(--text)}
.excerpt p{margin:.5em 0;color:var(--muted)}
.excerpt table{font-size:12.5px;border-collapse:collapse;margin:.5em 0;display:block;overflow-x:auto;max-width:100%}
.excerpt td,.excerpt th{border:1px solid var(--border);padding:4px 8px}
ul.links,ol.links,ul.toc{margin:0;padding-left:20px;font-size:14px;columns:1}
ul.toc{color:var(--muted);columns:2}
ul.links li,ul.toc li{margin:2px 0}
.adrs{columns:2;column-gap:28px}
a.md-link{color:var(--red);text-decoration:none;border-bottom:1px dotted var(--red)}
a.md-link:hover{background:var(--red-bg)}
a.ext-link{color:var(--accent)}
.src{font-size:11px;color:var(--subtle);margin-top:10px}
.src a{color:var(--subtle)}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
.note{font-size:12.5px;color:var(--red);background:var(--red-bg);padding:5px 9px;border-radius:5px}
.count{font-size:12px;color:var(--subtle);margin-bottom:6px}
.ent-group{margin:0 0 16px}
.ent-group-h{font-weight:700;font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin:16px 0 6px}
.ent{padding:8px 0;border-bottom:1px solid var(--border)}
.ent:last-child{border-bottom:none}
.ent-name{font-weight:600;font-size:14px}
.ent-sum{font-size:13px;color:var(--muted);margin-top:3px;line-height:1.55}
table.folders,table.cqs,table.activity{width:100%;border-collapse:collapse;font-size:13px}
table.folders td,table.cqs td,table.activity td{padding:6px 8px;border-bottom:1px solid var(--border);vertical-align:top}
table.folders td.folder{white-space:nowrap;width:120px}
.cqs .status{color:var(--muted);white-space:nowrap}
.metrics{display:flex;flex-wrap:wrap;gap:12px}
.metric{background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:12px 16px;min-width:92px;text-align:center}
.metric-v{display:block;font-size:20px;font-weight:700}
.metric-k{display:block;font-size:11px;color:var(--subtle);text-transform:uppercase;letter-spacing:.04em}
object.svg{width:100%;height:520px;border:1px solid var(--border);border-radius:8px;background:#fff}
#search{width:100%;max-width:420px;padding:9px 12px;border:1px solid var(--border);border-radius:7px;background:var(--surface);font-size:14px;margin-bottom:14px}
.tree{columns:3;column-gap:28px;font-size:13px}
.tree .grp{break-inside:avoid;margin:10px 0 3px;color:var(--accent);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
.tree a{display:block;padding:2px 4px;border-radius:4px;color:var(--text);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tree a:hover{background:var(--hover)}
/* modal */
#overlay{position:fixed;inset:0;background:rgba(20,18,14,.55);display:none;z-index:50;padding:40px}
#overlay.open{display:flex;align-items:flex-start;justify-content:center}
#modal{background:var(--surface);max-width:880px;width:100%;max-height:100%;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)}
#modal-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--border)}
#modal-path{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}
#modal-close{border:none;background:var(--surface-2);width:30px;height:30px;border-radius:6px;cursor:pointer;font-size:18px;line-height:1}
#modal-close:hover{background:var(--hover)}
#modal-body{padding:26px 34px;overflow:auto}
#modal-body :is(h1,h2,h3,h4){line-height:1.25}
#modal-body pre{background:var(--surface-2);padding:12px;border-radius:6px;overflow:auto}
#modal-body code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}
#modal-body table{border-collapse:collapse}
#modal-body td,#modal-body th{border:1px solid var(--border);padding:5px 9px}
#modal-body a{color:var(--red)}
.fm{background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:var(--muted);white-space:pre-wrap}
</style></head>
<body>
<header><h1>${esc(manifest.title)}</h1><p>${esc(manifest.subtitle || '')} &nbsp;·&nbsp; generated ${esc(stamp)}</p></header>
<nav class="tabs">${tabs}</nav>
<main>${panes}</main>
<div id="overlay"><div id="modal">
  <div id="modal-bar"><span id="modal-path"></span><button id="modal-close" title="Close (Esc)">×</button></div>
  <div id="modal-body"></div>
</div></div>
<script>
const FILES = ${indexJson};
function showTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('active',p.id==='pane-'+id));
  window.scrollTo(0,0);
}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{location.hash=t.dataset.tab;showTab(t.dataset.tab);}));
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(id&&document.getElementById('pane-'+id))showTab(id);});
(()=>{const id=location.hash.slice(1);if(id&&document.getElementById('pane-'+id))showTab(id);})();
const overlay=document.getElementById('overlay'),mbody=document.getElementById('modal-body'),mpath=document.getElementById('modal-path');
function closeModal(){overlay.classList.remove('open');mbody.innerHTML='';}
document.getElementById('modal-close').onclick=closeModal;
overlay.onclick=(e)=>{if(e.target===overlay)closeModal();};
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeModal();});
function resolveRel(base,href){
  if(/^([a-z]+:|#|\\/)/i.test(href))return href.replace(/^\\//,'');
  const parts=base.split('/').slice(0,-1);
  href.split('/').forEach(s=>{if(s==='..')parts.pop();else if(s!=='.'&&s!=='')parts.push(s);});
  return parts.join('/');
}
async function openFile(p){
  p=p.replace(/^\\//,'');
  overlay.classList.add('open');mpath.textContent=p;mbody.innerHTML='<p style="color:#888">loading…</p>';
  try{
    const r=await fetch('/'+p);
    if(!r.ok)throw new Error(r.status+' '+r.statusText);
    let text=await r.text(),fm='';
    const m=text.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n?/);
    if(m){fm='<div class="fm">'+m[1].replace(/[<>]/g,'')+'</div>';text=text.slice(m[0].length);}
    mbody.innerHTML=fm+marked.parse(text,{mangle:false,headerIds:false});
    mbody.scrollTop=0;
    mbody.querySelectorAll('a[href]').forEach(a=>{
      const href=a.getAttribute('href');
      if(/^[a-z]+:\\/\\//i.test(href))return;
      if(/\\.md(#|$)/i.test(href)){const tgt=resolveRel(p,href.split('#')[0]);a.onclick=(e)=>{e.preventDefault();openFile(tgt);};}
    });
  }catch(e){mbody.innerHTML='<div class="note">Could not load '+p+' — '+e.message+'. Is the dev server running? (npm run dashboard:serve)</div>';}
}
document.body.addEventListener('click',(e)=>{const a=e.target.closest('a.md-link');if(a){e.preventDefault();openFile(a.dataset.md);}});
function buildTree(filter){
  const tree=document.getElementById('tree');tree.innerHTML='';
  const groups={};
  FILES.filter(f=>!filter||f.p.toLowerCase().includes(filter)).forEach(f=>{const g=f.p.split('/')[1]||'.';(groups[g]=groups[g]||[]).push(f);});
  Object.keys(groups).sort().forEach(g=>{
    const h=document.createElement('div');h.className='grp';h.textContent=g;tree.appendChild(h);
    groups[g].forEach(f=>{const a=document.createElement('a');a.href='#';a.textContent=f.p.replace('docs/','');a.title=f.p;a.onclick=(e)=>{e.preventDefault();openFile(f.p);};tree.appendChild(a);});
  });
}
document.getElementById('search').addEventListener('input',(e)=>buildTree(e.target.value.toLowerCase().trim()));
buildTree('');
</script>
</body></html>`;
}

// ---------- main ----------
async function main() {
  const mod = await import('marked');
  MARKED = (s) => (mod.parse || mod.marked.parse)(s);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const panels = manifest.panels.map((p) => ({
    id: p.id,
    title: p.title,
    label: (p.title.split('—')[0] || p.title).trim(),
    blurb: p.blurb || '',
    html: p.blocks.map(renderBlock).join('')
  }));
  const fileIndex = buildFileIndex();
  const stamp = (() => { try { return execSync('git log -1 --format=%cd --date=short', { cwd: REPO }).toString().trim(); } catch { return 'n/a'; } })();
  const html = renderPage(manifest, panels, fileIndex, stamp);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
  fs.copyFileSync(MARKED_UMD, path.join(OUT_DIR, 'marked.umd.js'));

  console.log(`Dashboard written: docs/dashboard/index.html`);
  console.log(`Tabs: ${panels.length + 1} | files indexed: ${fileIndex.length}`);
  console.log(`View it with: npm run dashboard:serve  (then open the printed URL)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
