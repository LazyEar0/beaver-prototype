/* ============================================================
   Beaver Sprint-AI1 原型 — ai1-designer.js
   完全复用现有 designer.css / style.css 的类名体系
   聚焦：AI1.1 文件节点 / AI1.2 输出节点文件模式 / AI1.3 节点库
============================================================ */
'use strict';

// ============================================================
// ICONS（与现有原型一致的内联 SVG 片段）
// ============================================================
const AI1_ICONS = {
  arrowLeft:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>`,
  close:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  check:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>`,
  chevronDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>`,
  info:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  play:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  send:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>`,
  download:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
  search:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  file:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
  var:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
};

// ============================================================
// MOCK DATA
// ============================================================

/** 预设工作流节点（对话流，5 节点） */
const AI1_NODES = [
  {
    id: 1, type: 'trigger', name: '触发器', code: 'trigger_1', icon: '⚡',
    color: 'node-color-trigger',
    desc: '消息触发',
    x: 40, y: 140, w: 180, h: 72,
    readonly: true,
    outputs: [
      { name: 'query',      type: 'String', desc: '用户输入文本' },
      { name: 'session_id', type: 'String', desc: '会话 ID' },
    ]
  },
  {
    id: 2, type: 'llm', name: 'LLM', code: 'llm_1', icon: '🤖',
    color: 'node-color-integration',
    desc: '大语言模型',
    x: 260, y: 140, w: 180, h: 72,
    readonly: true,
    outputs: [
      { name: 'result', type: 'String', desc: 'LLM 输出文本' },
    ]
  },
  {
    id: 3, type: 'file', name: '文件', code: 'file_1', icon: '📁',
    color: 'node-color-file',
    desc: '文件节点（写入）',
    x: 480, y: 140, w: 180, h: 72,
    readonly: false,
    config: {
      operation: 'write',
      fileName: '',
      fileFormat: 'md',
      fileContent: null,
      urlExpiry: '24h',
      sizeLimit: 10,
    },
    outputs: [
      { name: 'output', type: 'File', desc: '文件对象（含 URL）' },
    ]
  },
  {
    id: 4, type: 'output', name: '输出', code: 'output_1', icon: '📤',
    color: 'node-color-data',
    desc: '输出节点（文件模式）',
    x: 700, y: 140, w: 180, h: 72,
    readonly: false,
    config: {
      chatMode: 'file',
      fileVar: null,
      additionalText: '已为您生成文档，点击下载',
    },
    outputs: []
  },
  {
    id: 5, type: 'end', name: '结束', code: 'end_1', icon: '🏁',
    color: 'node-color-end',
    desc: '流程结束',
    x: 920, y: 140, w: 180, h: 72,
    readonly: true,
    outputs: []
  },
];

/** 预设连线 */
const AI1_EDGES = [
  { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
];

/** Mock 可选变量 */
const AI1_VARS = {
  stringVars: [
    { groupId: 'trigger_1', groupName: '触发器 (trigger_1)', vars: [
      { name: 'query',      type: 'String', path: 'trigger_1.query',      desc: '用户输入文本',  ref: 'trigger_1.query' },
      { name: 'session_id', type: 'String', path: 'trigger_1.session_id', desc: '会话 ID',       ref: 'trigger_1.session_id' },
    ]},
    { groupId: 'llm_1', groupName: 'LLM (llm_1)', vars: [
      { name: 'result', type: 'String', path: 'llm_1.result', desc: 'LLM 输出文本', ref: 'llm_1.result' },
    ]},
  ],
  fileVars: [
    { groupId: 'file_1', groupName: '文件节点 (file_1)', vars: [
      { name: 'output', type: 'File', path: 'file_1.output', desc: '文件对象（含 URL）', ref: 'file_1.output' },
    ]},
  ],
};

/** 节点库（AI1.3 — 仅集成分类文件节点高亮，其余占位） */
const AI1_NODE_LIBRARY = [
  { category: '流程控制', items: [
    { type: 'if',    name: 'IF 条件', icon: '🔀', color: 'node-color-logic',       desc: '条件判断分支',     disabled: true },
    { type: 'switch',name: 'Switch',  icon: '🔃', color: 'node-color-logic',       desc: '多条件路由',       disabled: true },
    { type: 'loop',  name: '循环',    icon: '🔄', color: 'node-color-logic',       desc: '循环遍历处理',     disabled: true },
  ]},
  { category: '数据与执行', items: [
    { type: 'assign', name: '赋值',   icon: '📝', color: 'node-color-data',        desc: '变量赋值操作',     disabled: true },
    { type: 'output', name: '输出',   icon: '📤', color: 'node-color-data',        desc: '输出/回复用户',    disabled: true },
    { type: 'code',   name: '代码',   icon: '💻', color: 'node-color-data',        desc: '自定义脚本',       disabled: true },
  ]},
  { category: '集成', items: [
    { type: 'http',  name: 'HTTP 请求', icon: '🌐', color: 'node-color-integration', desc: '调用外部 API',    disabled: true },
    { type: 'file',  name: '文件',      icon: '📁', color: 'node-color-file',        desc: '将内容写入文件并上传存储，获取文件下载地址', disabled: false, highlight: true },
  ]},
];

// ============================================================
// STATE
// ============================================================
let ai1SelectedNodeId  = null;
let ai1ActiveConfigTab = 'basic';
let ai1ChatDebugMode   = false;
let ai1ChatMsgNo       = 0;
let ai1VarPickerState  = null;   // { fieldId, varSet, anchorEl }
let ai1NodePanelExpanded = false;

// 直接引用节点配置（不用深拷贝，原型不需要）
const fileNode   = AI1_NODES.find(n => n.type === 'file');
const outputNode = AI1_NODES.find(n => n.type === 'output');

// ============================================================
// UTILITIES
// ============================================================
function ai1Esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function getFileIcon(fmt) { return { md:'📄', html:'🌐', txt:'📃' }[fmt] || '📄'; }
function getFmtLabel(fmt) { return { md:'Markdown', html:'HTML', txt:'纯文本' }[fmt] || fmt; }
function validateFile(cfg) {
  const e = {};
  if (!cfg.fileName?.trim())       e.fileName    = '文件名为必填项';
  else if (/[/\\]/.test(cfg.fileName)) e.fileName = '文件名不允许包含路径分隔符';
  if (!cfg.fileContent)            e.fileContent = '文件内容为必填项';
  return e;
}

// ============================================================
// TOAST（复用现有原型结构的 toast）
// ============================================================
function showToast(type, title, msg) {
  const icons = { success:'✓', error:'✗', info:'ℹ' };
  const colors = {
    success: 'background:#1e3a2a;border-left:3px solid #188038',
    error:   'background:#3a1e1e;border-left:3px solid #D93025',
    info:    'background:#1e2a3a;border-left:3px solid #1A73E8',
  };
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const el = document.createElement('div');
  el.style.cssText = `pointer-events:auto;display:flex;align-items:flex-start;gap:10px;padding:10px 14px;${colors[type]||colors.info};color:#f1f3f5;border-radius:var(--radius-lg,10px);font-size:13px;max-width:320px;box-shadow:var(--shadow-xl);animation:fadeInRight 0.2s ease`;
  el.innerHTML = `<div style="flex-shrink:0;font-weight:700">${icons[type]||icons.info}</div><div><div style="font-weight:600;font-size:13px">${ai1Esc(title)}</div>${msg?`<div style="font-size:11px;opacity:0.8;margin-top:2px">${ai1Esc(msg)}</div>`:''}</div>`;
  c.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity 0.3s'; setTimeout(()=>el.remove(),300); }, 3000);
}

// ============================================================
// HOME PAGE → DESIGNER
// ============================================================
function openAI1Designer() {
  document.getElementById('homePage').style.display = 'none';
  ai1SelectedNodeId  = null;
  ai1ActiveConfigTab = 'basic';
  ai1ChatDebugMode   = false;
  renderAI1Designer();
}

function closeAI1Designer() {
  document.getElementById('designerShell').classList.remove('active');
  document.getElementById('homePage').style.display = 'flex';
  ai1ChatDebugMode = false;
  ai1SelectedNodeId = null;
  closeAI1VarPicker();
}

// ============================================================
// MAIN RENDER — 完全对齐现有原型 renderDesigner() 的 HTML 结构
// ============================================================
function renderAI1Designer() {
  const shell = document.getElementById('designerShell');
  shell.innerHTML = `
    <!-- Toolbar -->
    <div class="designer-toolbar">
      <div class="designer-toolbar-left">
        <button class="designer-back-btn" onclick="closeAI1Designer()" title="返回">${AI1_ICONS.arrowLeft}</button>
        <span class="designer-wf-name">PRD生成对话流</span>
        <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1d4ed8;border:1px solid #93c5fd">💬 对话流</span>
        <span class="designer-wf-status status-badge status-draft">草稿</span>
      </div>
      <div class="designer-toolbar-center">
        <button class="toolbar-btn" onclick="showProblemsHint()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>问题</span>
          <span class="toolbar-badge" id="problemsBadge">${Object.keys(validateFile(fileNode.config)).length > 0 ? Object.keys(validateFile(fileNode.config)).length : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>'}</span>
        </button>
      </div>
      <div class="designer-toolbar-right">
        <span class="designer-save-indicator">${AI1_ICONS.check} <span>已保存</span></span>
        <button class="btn btn-secondary btn-sm" onclick="activateAI1ChatDebug()">
          ${AI1_ICONS.play}<span>调试</span>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="showToast('success','已保存','工作流草稿已保存')">
          ${AI1_ICONS.check}<span>保存</span>
        </button>
        <button class="btn btn-primary btn-sm" onclick="showToast('success','发布成功','工作流已发布为 v1')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
          <span>发布</span>
        </button>
      </div>
    </div>

    <!-- Main 3-panel -->
    <div class="designer-main">
      ${renderAI1NodePanel()}

      <!-- Canvas -->
      <div class="canvas-area" id="ai1CanvasArea">
        <div class="canvas-container" id="ai1CanvasContainer">
          <div class="canvas-grid"></div>
          <svg class="canvas-svg" id="ai1CanvasSvg"></svg>
          <div class="canvas-nodes" id="ai1CanvasNodes" style="transform:translate(0px,0px) scale(1)"></div>
        </div>
        <div class="canvas-controls">
          <button class="canvas-control-btn" onclick="showToast('info','缩放','本原型静态画布')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <span class="canvas-zoom-level" style="cursor:default">100%</span>
          <button class="canvas-control-btn" onclick="showToast('info','缩放','本原型静态画布')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          <span style="width:1px;height:16px;background:var(--md-outline-variant);margin:0 4px"></span>
          <button class="canvas-control-btn" onclick="showToast('info','适应画布','本原型静态画布')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
        </div>
        <div class="canvas-static-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          静态画布演示 · 点击节点查看配置
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel open" id="ai1RightPanel">
        <div class="right-panel-resize-handle"></div>
        <div id="ai1RightPanelContent">${renderAI1OverviewPanel()}</div>
      </div>
    </div>
  `;

  shell.classList.add('active');
  renderAI1CanvasNodes();
  renderAI1CanvasConnections();
  // 初始化完成后自适应画布显示（延迟确保 DOM 已渲染）
  setTimeout(fitAI1Canvas, 100);
}

// ============================================================
// NODE PANEL (左侧, AI1.3)
// ============================================================
function renderAI1NodePanel() {
  const expanded = ai1NodePanelExpanded;
  let catHtml = '';
  AI1_NODE_LIBRARY.forEach(cat => {
    catHtml += `<div class="node-category">
      <div class="node-category-title">${ai1Esc(cat.category)}</div>
      ${cat.items.map(item => `
        <div class="node-type-item${item.disabled ? ' ai1-node-disabled' : ''}"
             style="opacity:${item.disabled ? 0.45 : 1};cursor:${item.disabled ? 'default' : 'grab'}"
             onclick="${item.disabled
               ? `showToast('info','即将支持','${item.name}节点将在后续版本中上线')`
               : `showToast('info','节点库提示','本原型为静态预设，请直接点击画布上的文件节点查看配置')`}"
             title="${item.disabled ? '即将支持' : item.desc}">
          <div class="node-type-icon ${item.color}" style="${item.highlight ? 'background:#F3E5F5;color:#6A1B9A;border:1.5px solid #CE93D8;' : ''}">${item.icon}</div>
          <div class="node-type-info">
            <div class="node-type-name">${ai1Esc(item.name)}${item.highlight ? ' <span style="font-size:10px;color:var(--md-primary);font-weight:600">NEW</span>' : ''}${item.disabled ? ' <span style="font-size:10px;color:var(--md-outline);font-weight:400">（即将）</span>' : ''}</div>
            <div class="node-type-desc">${ai1Esc(item.desc)}</div>
          </div>
        </div>`).join('')}
    </div>`;
  });
  return `
    <div class="node-panel ${expanded ? 'expanded' : ''}" id="ai1NodePanel"
         onmouseenter="expandAI1NodePanel()" onmouseleave="collapseAI1NodePanel()">
      <div class="node-panel-header">
        <button class="node-panel-toggle" onclick="toggleAI1NodePanel()" title="${expanded ? '收起' : '展开'}节点库">
          ${expanded
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M15 18l-6-6 6-6"/></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>`
          }
        </button>
        <span class="node-panel-title">节点库</span>
      </div>
      <div class="node-panel-search">
        <input type="text" placeholder="搜索节点..." oninput="filterAI1Nodes(this.value)" />
      </div>
      <div class="node-panel-body">${catHtml}</div>
    </div>`;
}

function expandAI1NodePanel()   { ai1NodePanelExpanded = true;  const p = document.getElementById('ai1NodePanel'); if(p) p.classList.add('expanded'); }
function collapseAI1NodePanel() { ai1NodePanelExpanded = false; const p = document.getElementById('ai1NodePanel'); if(p) p.classList.remove('expanded'); }
function toggleAI1NodePanel()   { ai1NodePanelExpanded = !ai1NodePanelExpanded; renderAI1Designer(); }
function filterAI1Nodes(kw) {
  const panel = document.getElementById('ai1NodePanel');
  if (!panel) return;
  panel.querySelectorAll('.node-type-item').forEach(el => {
    const txt = el.innerText.toLowerCase();
    el.style.display = (!kw || txt.includes(kw.toLowerCase())) ? '' : 'none';
  });
}

// ============================================================
// CANVAS RENDER (AI1.1 节点使用现有原型的 canvas-node 结构)
// ============================================================

/** 自适应画布：计算缩放和偏移，使所有节点居中可见 */
function fitAI1Canvas() {
  const area  = document.getElementById('ai1CanvasArea');
  const nodes = document.getElementById('ai1CanvasNodes');
  const svgEl = document.getElementById('ai1CanvasSvg');
  if (!area || !nodes || !svgEl) return;

  const aW = area.clientWidth;
  const aH = area.clientHeight;

  // 计算所有节点的包围盒
  const bx1 = Math.min(...AI1_NODES.map(n => n.x));
  const by1 = Math.min(...AI1_NODES.map(n => n.y));
  const bx2 = Math.max(...AI1_NODES.map(n => n.x + n.w));
  const by2 = Math.max(...AI1_NODES.map(n => n.y + n.h));
  const bW  = bx2 - bx1;
  const bH  = by2 - by1;

  const pad   = 60;
  // 水平方向自适应，最大0.85倍；垂直不参与缩放计算（节点高度小，避免过度拉伸）
  const scaleByW = (aW - pad * 2) / bW;
  const scale    = Math.min(scaleByW, 0.85);
  const tx    = (aW - bW * scale) / 2 - bx1 * scale;
  // 垂直方向：节点放在画布上1/3处，视觉重心更舒适
  const ty    = Math.max(pad, aH * 0.25 - by1 * scale);

  // 节点容器用 CSS transform
  nodes.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  // SVG 连线用 <g> 的 transform属性（路径坐标不变）
  const g = svgEl.querySelector('g');
  if (g) g.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
}

function renderAI1CanvasNodes() {
  const container = document.getElementById('ai1CanvasNodes');
  if (!container) return;
  container.innerHTML = AI1_NODES.map(node => {
    const errs = node.type === 'file' ? validateFile(node.config) : {};
    const hasWarning = Object.keys(errs).length > 0;
    const isSelected = node.id === ai1SelectedNodeId;
    return `
      <div class="canvas-node${isSelected ? ' selected' : ''}"
           id="ai1node_${node.id}"
           style="left:${node.x}px;top:${node.y}px;min-width:${node.w}px;cursor:pointer"
           onclick="ai1SelectNode(${node.id})"
           title="${ai1Esc(node.desc)}">
        <div class="canvas-node-header">
          <div class="canvas-node-icon ${node.color}">${node.icon}</div>
          <div class="canvas-node-title">${ai1Esc(node.name)}</div>
          ${hasWarning ? `<div class="canvas-node-warning" title="${Object.values(errs).join('；')}">!</div>` : ''}
        </div>
        <div class="canvas-node-body">
          <span class="canvas-node-code">${ai1Esc(node.code)}</span>
          <span style="margin-left:6px;font-size:11px;color:var(--md-outline)">${ai1Esc(node.desc)}</span>
        </div>
        <!-- Ports -->
        ${node.id !== 1 ? `<div class="canvas-node-port port-in" title="输入"></div>` : ''}
        ${node.id !== 5 ? `<div class="canvas-node-port port-out" title="输出"></div>` : ''}
      </div>`;
  }).join('');
}

function renderAI1CanvasConnections() {
  const svg = document.getElementById('ai1CanvasSvg');
  if (!svg) return;
  const paths = AI1_EDGES.map(edge => {
    const fn = AI1_NODES.find(n => n.id === edge.from);
    const tn = AI1_NODES.find(n => n.id === edge.to);
    if (!fn || !tn) return '';
    const x1 = fn.x + fn.w, y1 = fn.y + fn.h / 2;
    const x2 = tn.x,        y2 = tn.y + tn.h / 2;
    const cx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}"
      fill="none" stroke="var(--md-outline)" stroke-width="1.5"
      marker-end="url(#ai1arrow)"/>`;
  }).join('');
  svg.innerHTML = `
    <defs>
      <marker id="ai1arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="var(--md-outline)"/>
      </marker>
    </defs>
    <g>${paths}</g>`;
}

// ============================================================
// NODE SELECTION & PANEL
// ============================================================
function ai1SelectNode(nodeId) {
  if (ai1ChatDebugMode) return;
  ai1SelectedNodeId  = nodeId;
  ai1ActiveConfigTab = 'basic';
  renderAI1CanvasNodes();
  renderAI1CanvasConnections();
  const node = AI1_NODES.find(n => n.id === nodeId);
  const content = document.getElementById('ai1RightPanelContent');
  if (!content || !node) return;
  switch (node.type) {
    case 'file':   content.innerHTML = renderFileNodePanel(node);   break;
    case 'output': content.innerHTML = renderOutputNodePanel(node); break;
    default:       content.innerHTML = renderReadonlyPanel(node);   break;
  }
}

function closeAI1NodePanel() {
  ai1SelectedNodeId = null;
  renderAI1CanvasNodes();
  const content = document.getElementById('ai1RightPanelContent');
  if (content) content.innerHTML = renderAI1OverviewPanel();
}

// ============================================================
// OVERVIEW PANEL（右侧默认面板）
// ============================================================
function renderAI1OverviewPanel() {
  const errors = validateFile(fileNode.config);
  const errCount = Object.keys(errors).length;
  return `
    <div class="right-panel-header">
      <span class="right-panel-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--md-primary)"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        工作流概览
      </span>
    </div>
    <div class="right-panel-body">
      <div class="wf-overview">
        <div class="wf-overview-title">PRD生成对话流</div>
        <div class="wf-overview-desc">演示：用户发起对话 → LLM 生成 PRD 内容 → 文件节点写入 OSS → 输出节点以文件卡片回复用户。</div>
        <div class="wf-overview-stats">
          <div class="wf-stat-card">
            <div class="wf-stat-card-label">配置问题</div>
            <div class="wf-stat-card-value" style="color:${errCount > 0 ? 'var(--md-error)' : 'var(--md-success)'}">${errCount}</div>
          </div>
          <div class="wf-stat-card">
            <div class="wf-stat-card-label">节点数</div>
            <div class="wf-stat-card-value">${AI1_NODES.length}</div>
          </div>
        </div>
        <div class="config-section">
          <div class="config-section-title">基本信息</div>
          <div class="config-field"><div class="config-field-label">流程类型</div><span style="font-size:var(--font-size-sm)">对话流</span></div>
          <div class="config-field"><div class="config-field-label">版本状态</div><span style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">草稿（未发布）</span></div>
        </div>
        ${errCount > 0 ? `
        <div class="config-section">
          <div class="config-section-title" style="color:var(--md-error)">待处理问题</div>
          ${Object.values(errors).map(e => `
            <div class="config-field" style="background:var(--md-error-container);border-radius:var(--radius-sm);padding:6px 8px;margin-bottom:6px">
              <span style="font-size:var(--font-size-xs);color:var(--md-error)">⚠ ${ai1Esc(e)}</span>
            </div>`).join('')}
          <div style="font-size:11px;color:var(--md-outline);margin-top:4px">点击画布上的"文件"节点完成配置</div>
        </div>` : `
        <div style="padding:12px 0 4px;border-top:1px solid var(--md-outline-variant)">
          <span style="font-size:12px;color:var(--md-success)">✓ 配置无问题，可以调试</span>
        </div>`}
      </div>
    </div>`;
}

// ============================================================
// READONLY PANEL（触发器 / LLM / 结束节点）
// ============================================================
function renderReadonlyPanel(node) {
  return `
    <div class="right-panel-header">
      <span class="right-panel-title">
        <span class="canvas-node-icon ${node.color}" style="width:22px;height:22px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">${node.icon}</span>
        ${ai1Esc(node.name)}
      </span>
      <button class="right-panel-close" onclick="closeAI1NodePanel()">${AI1_ICONS.close}</button>
    </div>
    <div class="right-panel-body">
      <div style="padding:10px;background:var(--md-info-container);border-radius:var(--radius-sm);font-size:12px;color:#1a4f9e;margin-bottom:16px;line-height:1.6">
        ℹ ${node.type === 'llm' ? 'LLM 节点配置不在本原型范围内演示，聚焦查看文件节点（📁）和输出节点（📤）的配置。' : '本节点在当前原型中为只读展示。'}
      </div>
      ${node.outputs?.length ? `
      <div class="config-section">
        <div class="config-section-title">输出变量</div>
        <div class="output-vars-readonly">
          ${node.outputs.map(v => `
            <div class="output-var-row">
              <span class="output-var-name">${ai1Esc(v.name)}</span>
              <span class="output-var-type">${ai1Esc(v.type)}</span>
              <span class="output-var-desc">${ai1Esc(v.desc)}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
    </div>`;
}

// ============================================================
// FILE NODE PANEL (AI1.1)
// ============================================================
function renderFileNodePanel(node) {
  const cfg = node.config;
  const errors = validateFile(cfg);
  const isAdvanced = ai1ActiveConfigTab === 'advanced';
  const hasAdvancedDot = cfg.urlExpiry !== '24h' || cfg.sizeLimit !== 10;

  return `
    <div class="right-panel-header">
      <span class="right-panel-title">
        <span class="canvas-node-icon node-color-file" style="width:22px;height:22px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">📁</span>
        ${ai1Esc(node.name)}
      </span>
      <button class="right-panel-close" onclick="closeAI1NodePanel()">${AI1_ICONS.close}</button>
    </div>
    <div class="right-panel-tabs">
      <div class="right-panel-tab${!isAdvanced ? ' active' : ''}" onclick="ai1SwitchTab('basic')">基础配置</div>
      <div class="right-panel-tab${isAdvanced ? ' active' : ''}" onclick="ai1SwitchTab('advanced')">高级配置${hasAdvancedDot ? '<span class="advanced-dot"></span>' : ''}</div>
    </div>
    <div class="right-panel-body" id="fileNodeBody">
      ${isAdvanced ? renderFileAdvancedConfig(cfg) : renderFileBasicConfig(cfg, errors)}
    </div>`;
}

function renderFileBasicConfig(cfg, errors) {
  const contentBtn = cfg.fileContent
    ? `<button class="var-trigger-btn has-value" onclick="openAI1VarPicker('fileContent','stringVars')">
        ${AI1_ICONS.file}
        <span class="var-ref-tag">${ai1Esc(cfg.fileContent.path)}</span>
        <span class="arrow-icon">${AI1_ICONS.chevronDown}</span>
       </button>`
    : `<button class="var-trigger-btn" onclick="openAI1VarPicker('fileContent','stringVars')">
        ${AI1_ICONS.var}
        <span style="color:var(--md-outline)">点击选择变量（仅 String 类型）</span>
        <span class="arrow-icon">${AI1_ICONS.chevronDown}</span>
       </button>`;

  return `
    <!-- 节点信息 -->
    <div class="config-section">
      <div class="config-section-title">节点信息</div>
      <div class="config-field">
        <div class="config-field-label">节点名称 <span class="required">*</span></div>
        <input class="config-input" value="${ai1Esc(fileNode.name)}" onchange="fileNode.name=this.value;renderAI1CanvasNodes();renderAI1CanvasConnections()" />
      </div>
      <div class="config-field">
        <div class="config-field-label">节点编码</div>
        <input class="config-input" value="file_1" readonly style="font-family:var(--font-family-mono);background:var(--md-surface-container);cursor:not-allowed" />
      </div>
    </div>

    <!-- 操作配置 -->
    <div class="config-section">
      <div class="config-section-title">操作配置</div>

      <div class="config-field">
        <div class="config-field-label">操作类型 <span class="required">*</span></div>
        <div class="operation-list">
          <div class="operation-item active">✏️ &nbsp;写入</div>
          <div class="operation-item disabled" onclick="showToast('info','即将支持','读取操作将在后续版本中上线')">
            📖 &nbsp;读取 <span class="operation-item-badge">即将支持</span>
          </div>
          <div class="operation-item disabled" onclick="showToast('info','即将支持','复制操作将在后续版本中上线')">
            📋 &nbsp;复制 <span class="operation-item-badge">即将支持</span>
          </div>
        </div>
      </div>

      <div class="config-field">
        <div class="config-field-label">文件名 <span class="required">*</span></div>
        <input class="config-input${errors.fileName ? ' config-input-error' : ''}" id="input_fileName"
          placeholder="例：PRD_登录模块 或 文档_{{trigger_1.session_id}}"
          value="${ai1Esc(cfg.fileName || '')}"
          oninput="updateFileConfig('fileName', this.value)" />
        <div style="font-size:11px;color:var(--md-outline);margin-top:4px;line-height:1.5">支持 {{变量}} 插值；不含路径分隔符；扩展名由格式自动添加</div>
        ${errors.fileName ? `<div style="font-size:11px;color:var(--md-error);margin-top:3px">⚠ ${ai1Esc(errors.fileName)}</div>` : ''}
      </div>

      <div class="config-field">
        <div class="config-field-label">文件格式 <span class="required">*</span></div>
        <select class="config-select" onchange="updateFileConfig('fileFormat', this.value)">
          <option value="md"   ${cfg.fileFormat==='md'   ?'selected':''}>Markdown (.md)</option>
          <option value="html" ${cfg.fileFormat==='html' ?'selected':''}>HTML (.html)</option>
          <option value="txt"  ${cfg.fileFormat==='txt'  ?'selected':''}>纯文本 (.txt)</option>
        </select>
      </div>

      <div class="config-field">
        <div class="config-field-label">文件内容 <span class="required">*</span></div>
        ${contentBtn}
        <div style="font-size:11px;color:var(--md-outline);margin-top:4px">仅接受 String 类型变量；内容将原样写入文件</div>
        ${errors.fileContent ? `<div style="font-size:11px;color:var(--md-error);margin-top:3px">⚠ ${ai1Esc(errors.fileContent)}</div>` : ''}
      </div>
    </div>

    <!-- 输出变量 -->
    <div class="config-section">
      <div class="config-section-title">输出变量</div>
      <div class="output-vars-readonly">
        <div class="output-var-row">
          <span class="output-var-name">output</span>
          <span class="output-var-type">File</span>
          <span class="output-var-desc">文件对象（含 URL）</span>
        </div>
      </div>
      <div style="font-size:11px;color:var(--md-outline);margin-top:6px;line-height:1.6">
        引用示例：<code style="font-family:var(--font-family-mono);font-size:10px;background:var(--md-surface-container);padding:1px 4px;border-radius:3px">{{file_1.output.url}}</code>
        · <code style="font-family:var(--font-family-mono);font-size:10px;background:var(--md-surface-container);padding:1px 4px;border-radius:3px">{{file_1.output.name}}</code>
      </div>
    </div>

    <!-- 节点说明（折叠） -->
    <div class="config-section">
      <div class="config-section-title" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
        节点说明
        <span class="config-section-toggle">${AI1_ICONS.chevronDown}</span>
      </div>
      <div style="display:none;font-size:11px;color:var(--md-outline);line-height:1.7">
        <strong>适用场景：</strong>将 LLM 或上游节点生成的文本存为文件（Markdown/HTML/TXT），返回文件下载地址。<br/>
        <strong>使用规则：</strong>文件内容仅支持 String 类型变量；文件名不允许含路径分隔符；当前版本仅支持写入操作。
      </div>
    </div>

    ${Object.keys(errors).length > 0 ? `
    <div style="background:var(--md-error-container);border-radius:var(--radius-sm);padding:10px 12px;margin-top:4px">
      <div style="font-size:12px;color:var(--md-error);font-weight:600">
        ⚠ 存在 ${Object.keys(errors).length} 个错误，保存或调试前需修正
      </div>
    </div>` : ''}
  `;
}

function renderFileAdvancedConfig(cfg) {
  return `
    <div class="config-section">
      <div class="config-section-title">存储配置</div>
      <div class="config-field">
        <div class="config-field-label">URL 有效期</div>
        <select class="config-select" onchange="updateFileConfig('urlExpiry',this.value);refreshFilePanel()">
          <option value="1h"      ${cfg.urlExpiry==='1h'     ?'selected':''}>1 小时</option>
          <option value="24h"     ${cfg.urlExpiry==='24h'    ?'selected':''}>24 小时（默认）</option>
          <option value="7d"      ${cfg.urlExpiry==='7d'     ?'selected':''}>7 天</option>
          <option value="forever" ${cfg.urlExpiry==='forever'?'selected':''}>永久</option>
        </select>
        <div style="font-size:11px;color:var(--md-outline);margin-top:4px">生成的 OSS 签名 URL 的访问有效时长</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">文件大小限制（MB）</div>
        <input class="config-input" type="number" min="1" max="100" value="${cfg.sizeLimit}"
          onchange="updateFileConfig('sizeLimit',parseInt(this.value)||10);refreshFilePanel()" />
        <div style="font-size:11px;color:var(--md-outline);margin-top:4px">文件内容超出此限制时节点执行失败</div>
      </div>
    </div>`;
}

function updateFileConfig(field, value) {
  fileNode.config[field] = value;
  const errors = validateFile(fileNode.config);
  fileNode.warnings = Object.keys(errors).length;
  renderAI1CanvasNodes();
  renderAI1CanvasConnections();
  // 刷新面板内容（保留 tab）
  const content = document.getElementById('ai1RightPanelContent');
  if (content) content.innerHTML = renderFileNodePanel(fileNode);
  // 更新问题徽标
  updateProblemsHint();
}

function refreshFilePanel() {
  const content = document.getElementById('ai1RightPanelContent');
  if (content) content.innerHTML = renderFileNodePanel(fileNode);
}

function ai1SwitchTab(tab) {
  ai1ActiveConfigTab = tab;
  const content = document.getElementById('ai1RightPanelContent');
  if (!content) return;
  const node = AI1_NODES.find(n => n.id === ai1SelectedNodeId);
  if (node?.type === 'file')   content.innerHTML = renderFileNodePanel(node);
  if (node?.type === 'output') content.innerHTML = renderOutputNodePanel(node);
}

function updateProblemsHint() {
  const badge = document.getElementById('problemsBadge');
  if (!badge) return;
  const errs = validateFile(fileNode.config);
  const cnt = Object.keys(errs).length;
  badge.textContent = cnt > 0 ? cnt : '✓';
  badge.style.background = cnt > 0 ? 'var(--md-error)' : 'var(--md-success-container)';
  badge.style.color = cnt > 0 ? '#fff' : 'var(--md-success)';
}

function showProblemsHint() {
  const errs = validateFile(fileNode.config);
  const cnt = Object.keys(errs).length;
  if (cnt > 0) showToast('error', `${cnt} 个配置错误`, Object.values(errs).join('；'));
  else         showToast('success', '配置无问题', '可以点击"调试"开始执行');
}

// ============================================================
// OUTPUT NODE PANEL (AI1.2)
// ============================================================
function renderOutputNodePanel(node) {
  const cfg = node.config;
  return `
    <div class="right-panel-header">
      <span class="right-panel-title">
        <span class="canvas-node-icon node-color-data" style="width:22px;height:22px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">📤</span>
        ${ai1Esc(node.name)}
      </span>
      <button class="right-panel-close" onclick="closeAI1NodePanel()">${AI1_ICONS.close}</button>
    </div>
    <div class="right-panel-body">
      <!-- 对话流提示 -->
      <div style="background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid rgba(24,128,56,0.2);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px;color:#166534;margin-bottom:16px;line-height:1.6">
        💬 <strong>对话流回复配置</strong><br/>
        设置本轮对话的回复方式。选择文件模式可将上游文件节点的输出以文件卡片形式回复用户。
      </div>

      <!-- 回复模式 -->
      <div class="config-section">
        <div class="config-section-title">回复模式</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${['stream','rich','file'].map((mode, i) => {
            const labels = ['⚡ 流式文本', '📄 富文本', '📁 文件'];
            const active = cfg.chatMode === mode;
            return `<label style="flex:1;min-width:80px">
              <input type="radio" name="ai1ChatMode" value="${mode}" ${active?'checked':''}
                onchange="updateOutputConfig('chatMode','${mode}')" style="display:none">
              <div style="padding:7px 10px;border:1px solid ${active?'var(--md-primary)':'var(--md-outline-variant)'};border-radius:var(--radius-sm);font-size:12px;font-weight:500;text-align:center;cursor:pointer;background:${active?'var(--md-primary-container)':'transparent'};color:${active?'var(--md-primary)':'var(--md-on-surface-variant)'};transition:all 0.15s"
                onclick="document.querySelectorAll('[name=ai1ChatMode]')[${i}].click()">
                ${labels[i]}
              </div>
            </label>`;
          }).join('')}
        </div>
      </div>

      ${cfg.chatMode === 'file' ? renderOutputFileModeConfig(cfg) : `
      <div class="config-section">
        <div class="config-section-title">回复内容</div>
        <div style="padding:10px;background:var(--md-surface-container);border-radius:var(--radius-sm);font-size:12px;color:var(--md-outline)">
          ${cfg.chatMode==='stream' ? '⚡ 流式文本模式：LLM 节点生成内容实时逐字输出' : '📄 富文本模式：一次性发送，支持 Markdown 格式渲染'}
          <br/><br/>
          <a href="javascript:void(0)" style="color:var(--md-primary);font-size:11px" onclick="updateOutputConfig('chatMode','file')">
            → 切换到文件模式查看核心交互 ↗
          </a>
        </div>
      </div>`}
    </div>`;
}

function renderOutputFileModeConfig(cfg) {
  const fileVarBtn = cfg.fileVar
    ? `<button class="var-trigger-btn has-value" onclick="openAI1VarPicker('outputFileVar','fileVars')">
        ${AI1_ICONS.file}
        <span class="var-ref-tag">${ai1Esc(cfg.fileVar.path)}</span>
        <span class="arrow-icon">${AI1_ICONS.chevronDown}</span>
       </button>`
    : `<button class="var-trigger-btn" onclick="openAI1VarPicker('outputFileVar','fileVars')">
        ${AI1_ICONS.var}
        <span style="color:var(--md-outline)">点击选择 File 类型变量</span>
        <span class="arrow-icon">${AI1_ICONS.chevronDown}</span>
       </button>`;

  // 实时预览卡片
  const fmt = fileNode.config.fileFormat || 'md';
  const fName = fileNode.config.fileName ? `${fileNode.config.fileName}.${fmt}` : `（文件名未配置）.${fmt}`;
  const previewCard = cfg.fileVar
    ? `<div class="file-card-preview">
        <div class="file-card-preview-icon">${getFileIcon(fmt)}</div>
        <div class="file-card-preview-info">
          <div class="file-card-preview-name">${ai1Esc(fName)}</div>
          <div class="file-card-preview-meta">${getFmtLabel(fmt)} · 大小运行时确定</div>
        </div>
       </div>`
    : `<div class="file-card-preview placeholder">
        <div class="file-card-preview-icon">📄</div>
        <div class="file-card-preview-info">
          <div class="file-card-preview-name" style="color:var(--md-outline)">（请先选择文件变量）</div>
          <div class="file-card-preview-meta">选择变量后此处实时预览</div>
        </div>
       </div>`;

  return `
    <div class="config-section">
      <div class="config-section-title">文件模式配置</div>

      <div class="config-field">
        <div class="config-field-label">文件变量 <span class="required">*</span></div>
        ${fileVarBtn}
        <div style="font-size:11px;color:var(--md-outline);margin-top:4px">仅显示 File 类型变量，通常来自上游文件节点的 output</div>
      </div>

      <div class="config-field">
        <div class="config-field-label">附加文字（可选）</div>
        <input class="config-input" type="text"
          placeholder="例：已为您生成文档，点击下载"
          value="${ai1Esc(cfg.additionalText || '')}"
          oninput="updateOutputConfig('additionalText',this.value)" />
        <div style="font-size:11px;color:var(--md-outline);margin-top:4px">显示在文件卡片上方，最多 200 字；支持 {{变量}} 插值</div>
      </div>

      <div style="height:1px;background:var(--md-outline-variant);margin:12px 0"></div>

      <div class="config-field">
        <div class="config-field-label">文件卡片预览（只读）</div>
        ${previewCard}
        <div style="font-size:11px;color:var(--md-outline);margin-top:6px">此为配置预览，实际效果见"调试"对话面板</div>
      </div>
    </div>`;
}

function updateOutputConfig(field, value) {
  outputNode.config[field] = value;
  const content = document.getElementById('ai1RightPanelContent');
  if (content) content.innerHTML = renderOutputNodePanel(outputNode);
}

// ============================================================
// VARIABLE PICKER (浮层)
// ============================================================
function openAI1VarPicker(fieldId, varSet) {
  closeAI1VarPicker();
  ai1VarPickerState = { fieldId, varSet };
  const groups = AI1_VARS[varSet] || [];
  const picker = document.createElement('div');
  picker.className = 'ai1-var-picker';
  picker.id = 'ai1VarPicker';
  picker.innerHTML = `
    <div class="ai1-var-picker-header">
      <span>选择变量</span>
      <button onclick="closeAI1VarPicker()" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;color:var(--md-outline)">${AI1_ICONS.close}</button>
    </div>
    <div class="ai1-var-picker-search">
      ${AI1_ICONS.search}
      <input type="text" placeholder="搜索变量..." oninput="filterAI1VarPicker(this.value)" />
    </div>
    <div class="ai1-var-picker-body" id="ai1VarPickerBody">
      ${renderAI1VarGroups(groups, fieldId)}
    </div>`;
  document.body.appendChild(picker);

  // 定位（紧贴触发按钮）
  const btn = document.querySelector(`[onclick*="openAI1VarPicker('${fieldId}'"]`);
  if (btn) {
    const rect = btn.getBoundingClientRect();
    let left = rect.left, top = rect.bottom + 4;
    if (left + 280 > window.innerWidth - 8) left = window.innerWidth - 288;
    if (top + 300 > window.innerHeight - 8) top = rect.top - 304;
    picker.style.left = left + 'px';
    picker.style.top  = top  + 'px';
  }

  setTimeout(() => document.addEventListener('click', ai1PickerOutsideClick, { once: true }), 0);
}

function ai1PickerOutsideClick(e) {
  const picker = document.getElementById('ai1VarPicker');
  if (picker && !picker.contains(e.target)) {
    closeAI1VarPicker();
  } else {
    setTimeout(() => document.addEventListener('click', ai1PickerOutsideClick, { once: true }), 0);
  }
}

function closeAI1VarPicker() {
  const p = document.getElementById('ai1VarPicker');
  if (p) p.remove();
  ai1VarPickerState = null;
}

function renderAI1VarGroups(groups, fieldId) {
  if (!groups.length) return `<div style="padding:20px;text-align:center;font-size:12px;color:var(--md-outline)">暂无可用变量</div>`;
  const typeLabel = { String:'Str', File:'File', Number:'Num', Boolean:'Bool' };
  const typeBg    = { String:'#E8F0FE;color:#1A73E8', File:'#FEF7E0;color:#E37400', Number:'#E6F4EA;color:#188038' };
  return groups.map(g => `
    <div>
      <div class="ai1-var-group-title">${ai1Esc(g.groupName)}</div>
      ${g.vars.map(v => `
        <div class="ai1-var-item" onclick="ai1SelectVar('${fieldId}', ${JSON.stringify(v).replace(/"/g,'&quot;')})">
          <span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;flex-shrink:0;background:${typeBg[v.type]||'#e0e0e0;color:#666'}">${typeLabel[v.type]||v.type}</span>
          <div style="min-width:0">
            <div style="font-size:12px;font-weight:500">${ai1Esc(v.name)}</div>
            <div style="font-size:10px;color:var(--md-outline);font-family:var(--font-family-mono)">${ai1Esc(v.path)}</div>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

function filterAI1VarPicker(kw) {
  if (!ai1VarPickerState) return;
  const groups = AI1_VARS[ai1VarPickerState.varSet] || [];
  const filtered = groups.map(g => ({
    ...g, vars: g.vars.filter(v => !kw || v.name.includes(kw) || v.path.includes(kw))
  })).filter(g => g.vars.length > 0);
  const body = document.getElementById('ai1VarPickerBody');
  if (body) body.innerHTML = renderAI1VarGroups(filtered, ai1VarPickerState.fieldId);
}

function ai1SelectVar(fieldId, varObj) {
  closeAI1VarPicker();
  if (fieldId === 'fileContent') {
    updateFileConfig('fileContent', varObj);
  } else if (fieldId === 'outputFileVar') {
    updateOutputConfig('fileVar', varObj);
  }
}

// ============================================================
// CHAT DEBUG PANEL (AI1.2 对话调试)
// ============================================================
function activateAI1ChatDebug() {
  ai1ChatDebugMode = true;
  ai1ChatMsgNo = 0;
  ai1SelectedNodeId = null;
  renderAI1CanvasNodes();
  renderAI1CanvasConnections();

  const content = document.getElementById('ai1RightPanelContent');
  if (!content) return;
  content.innerHTML = `
    <div class="right-panel-header">
      <span class="right-panel-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--md-primary)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        对话调试
      </span>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;color:var(--md-success);display:flex;align-items:center;gap:4px">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--md-success);display:inline-block"></span>调试模式
        </span>
        <button class="right-panel-close" onclick="exitAI1ChatDebug()">${AI1_ICONS.close}</button>
      </div>
    </div>
    <div id="ai1ChatMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px">
      <div class="chat-msg bot">
        <div class="chat-msg-avatar">🤖</div>
        <div class="chat-msg-bubble chat-msg-bubble-bot">您好！我可以帮您生成文档。请告诉我需要生成什么内容？</div>
      </div>
    </div>
    <div class="chat-preview-input-area">
      <div class="chat-input-row">
        <input class="chat-input" id="ai1ChatInput"
          placeholder="输入消息，例：帮我生成一份用户登录模块PRD"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendAI1ChatMsg()}" />
        <button class="chat-send-btn" onclick="sendAI1ChatMsg()">${AI1_ICONS.send}</button>
      </div>
      <div class="chat-input-meta">
        <span class="chat-meta-item">按 Enter 发送 · 本次对话为模拟演示</span>
      </div>
    </div>`;
  document.getElementById('ai1ChatInput')?.focus();
}

function exitAI1ChatDebug() {
  ai1ChatDebugMode = false;
  const content = document.getElementById('ai1RightPanelContent');
  if (content) content.innerHTML = renderAI1OverviewPanel();
}

function sendAI1ChatMsg() {
  const input = document.getElementById('ai1ChatInput');
  const text = input?.value.trim();
  if (!text) return;
  input.value = '';
  ai1ChatMsgNo++;

  const msgs = document.getElementById('ai1ChatMessages');
  if (!msgs) return;

  // 用户消息
  const userEl = document.createElement('div');
  userEl.className = 'chat-msg chat-msg-user';
  userEl.innerHTML = `<div class="chat-msg-bubble chat-msg-bubble-user">${ai1Esc(text)}</div>`;
  msgs.appendChild(userEl);
  msgs.scrollTop = msgs.scrollHeight;

  // 模拟节点执行高亮
  simulateAI1Execution().then(() => addAI1BotReply(msgs, ai1ChatMsgNo));
}

function simulateAI1Execution() {
  return new Promise(resolve => {
    const order = [1, 2, 3, 4, 5];
    let idx = 0;
    const id = setInterval(() => {
      if (idx > 0) {
        const prev = document.getElementById('ai1node_' + order[idx-1]);
        if (prev) prev.style.boxShadow = '';
      }
      if (idx < order.length) {
        const curr = document.getElementById('ai1node_' + order[idx]);
        if (curr) curr.style.boxShadow = '0 0 0 3px rgba(24,128,56,0.3)';
        idx++;
      } else {
        clearInterval(id);
        resolve();
      }
    }, 280);
  });
}

function addAI1BotReply(msgs, msgNo) {
  // typing 动画
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-msg bot';
  typingEl.innerHTML = `<div class="chat-msg-avatar">🤖</div>
    <div style="display:flex;gap:4px;padding:8px 12px;background:var(--md-surface-container);border-radius:12px;border-bottom-left-radius:4px">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--md-outline);animation:typingDot 1.2s infinite"></span>
      <span style="width:6px;height:6px;border-radius:50%;background:var(--md-outline);animation:typingDot 1.2s infinite 0.2s"></span>
      <span style="width:6px;height:6px;border-radius:50%;background:var(--md-outline);animation:typingDot 1.2s infinite 0.4s"></span>
    </div>`;
  msgs.appendChild(typingEl);
  msgs.scrollTop = msgs.scrollHeight;

  setTimeout(() => {
    typingEl.remove();
    const cfg = outputNode.config;
    const botEl = document.createElement('div');
    botEl.className = 'chat-msg bot';

    if (cfg.chatMode === 'file') {
      const fileCfg = fileNode.config;
      const fmt   = fileCfg.fileFormat || 'md';
      const fName = fileCfg.fileName
        ? `${fileCfg.fileName}${msgNo > 1 ? `_v${msgNo}` : ''}.${fmt}`
        : `文档_${msgNo}.${fmt}`;
      const size  = `${(8 + msgNo * 3.7).toFixed(1)} KB`;
      const addTxt = cfg.additionalText || '';

      botEl.innerHTML = `
        <div class="chat-msg-avatar">🤖</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-width:85%">
          ${addTxt ? `<div class="chat-file-additional-text">${ai1Esc(addTxt)}</div>` : ''}
          <div class="chat-file-card">
            <div class="chat-file-card-icon">${getFileIcon(fmt)}</div>
            <div class="chat-file-card-info">
              <div class="chat-file-card-name">${ai1Esc(fName)}</div>
              <div class="chat-file-card-meta">${getFmtLabel(fmt)} · ${size}</div>
            </div>
            <button class="chat-file-card-btn" onclick="showToast('success','文件已生成','${ai1Esc(fName)} — 实际部署后可通过 OSS 签名 URL 下载')">
              ${AI1_ICONS.download} 下载
            </button>
          </div>
        </div>`;
    } else {
      const tips = [
        '好的，我来帮您生成相关文档，请稍等...',
        '文档已生成完成。请将"输出节点"回复模式切换为 📁 文件，即可看到文件卡片效果。',
      ];
      botEl.innerHTML = `
        <div class="chat-msg-avatar">🤖</div>
        <div class="chat-msg-bubble chat-msg-bubble-bot">${ai1Esc(tips[Math.min(msgNo-1,1)])}</div>`;
    }
    msgs.appendChild(botEl);
    msgs.scrollTop = msgs.scrollHeight;
  }, 1800);
}

// 补充 typing 动画 keyframe（inject 到 head 一次）
const _ai1StyleTag = document.createElement('style');
_ai1StyleTag.textContent = `
  @keyframes typingDot {
    0%,80%,100% { transform:scale(0.7);opacity:0.4 }
    40%         { transform:scale(1.1);opacity:1 }
  }
  @keyframes fadeInRight {
    from { opacity:0;transform:translateX(12px) }
    to   { opacity:1;transform:translateX(0) }
  }
  .config-input-error { border-color:var(--md-error) !important; }
`;
document.head.appendChild(_ai1StyleTag);

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', () => {
  // 首页默认显示（已在 HTML 中 inline style 设置）
});
