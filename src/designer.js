/* ============================================
   Beaver - Flow Designer Module
   Full-Screen Immersive Canvas Editor
   ============================================ */

// --- Designer State ---
let designerActive = false;
let designerWfId = null;
let designerWsId = null;
let designerWf = null;
let designerNodes = [];
let designerConnections = [];
let designerVariables = [];
let designerSelectedNodeId = null;
let designerSelectedNodeIds = []; // Multi-select support
let designerZoom = 1;
let designerPanX = 0;
let designerPanY = 0;
let designerIsPanning = false;
let designerPanStart = { x: 0, y: 0 };
let designerNodeIdCounter = 1;
let designerConnIdCounter = 1;
let designerRightPanel = 'overview'; // overview | node | settings | version
let designerBottomPanel = null; // null | problems | debug | variables
let designerBottomTab = 'problems';
let designerBottomPanelHeight = 240; // Draggable height
let designerNodePanelExpanded = false;
let designerDebugMode = false;
let designerDebugLog = [];
let designerDraggingNodeType = null;
let designerDraggingExistingNode = null;
let designerDragOffset = { x: 0, y: 0 };
let designerConnecting = null; // { fromNodeId, fromPort }
let designerConnectingMouse = null; // { x, y } canvas coordinates for temp line
let designerAutoSaveTimer = null;
let designerReadonly = false; // Edit lock
let designerReadonlyUser = ''; // Who holds the lock
let designerGridSnap = false; // Grid snap toggle
let designerMinimapVisible = true; // Minimap toggle
let designerClipboard = []; // Copy/paste buffer
let designerIsBoxSelecting = false; // Box selection
let designerBoxSelectStart = null;
let designerBoxSelectRect = null;
let designerContextMenu = null; // Right-click context menu
let designerBottomResizing = false; // Bottom panel resize

// --- Node Type Definitions ---
const nodeTypes = [
  { type: 'trigger', name: '触发器', icon: '⚡', color: 'node-color-trigger', category: '流程控制', desc: '流程入口节点', code: 'trigger' },
  { type: 'end', name: '结束', icon: '🏁', color: 'node-color-end', category: '流程控制', desc: '流程出口节点', code: 'end' },
  { type: 'if', name: 'IF 条件', icon: '🔀', color: 'node-color-logic', category: '流程控制', desc: '条件判断分支', code: 'if' },
  { type: 'switch', name: 'Switch', icon: '🔃', color: 'node-color-logic', category: '流程控制', desc: '多条件分支', code: 'switch' },
  { type: 'loop', name: '循环', icon: '🔄', color: 'node-color-logic', category: '流程控制', desc: '循环执行', code: 'loop' },
  { type: 'delay', name: '延迟', icon: '⏱️', color: 'node-color-logic', category: '流程控制', desc: '延时执行', code: 'delay' },
  { type: 'assign', name: '赋值', icon: '📝', color: 'node-color-data', category: '数据处理', desc: '变量赋值', code: 'assign' },
  { type: 'output', name: '输出', icon: '📤', color: 'node-color-data', category: '数据处理', desc: '日志输出', code: 'output' },
  { type: 'code', name: '代码', icon: '💻', color: 'node-color-data', category: '数据处理', desc: '自定义代码', code: 'code' },
  { type: 'http', name: 'HTTP 请求', icon: '🌐', color: 'node-color-integration', category: '集成', desc: 'HTTP接口调用', code: 'http' },
  { type: 'mq', name: 'MQ 消息', icon: '📨', color: 'node-color-integration', category: '集成', desc: '消息队列', code: 'mq' },
  { type: 'workflow', name: '子工作流', icon: '🔗', color: 'node-color-flow', category: '集成', desc: '调用子流程', code: 'wf' },
  { type: 'placeholder', name: '占位节点', icon: '⬜', color: 'node-color-placeholder', category: '其他', desc: '待完善节点', code: 'placeholder' },
];

// --- Open / Close Designer ---
function openDesigner(wsId, wfId) {
  const wfs = wsWorkflows[wsId] || [];
  const wf = wfs.find(w => w.id === wfId);
  if (!wf) return;

  designerWfId = wfId;
  designerWsId = wsId;
  designerWf = wf;
  designerActive = true;
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  designerRightPanel = 'overview';
  designerBottomPanel = null;
  designerBottomTab = 'problems';
  designerZoom = 1;
  designerPanX = 0;
  designerPanY = 0;
  designerDebugMode = false;
  designerDebugLog = [];
  designerNodePanelExpanded = false;
  designerClipboard = [];
  designerContextMenu = null;
  designerGridSnap = false;
  designerMinimapVisible = true;

  // Simulate edit lock: some workflows are "locked" by another user for demo
  if (wfId === 7) {
    designerReadonly = true;
    designerReadonlyUser = '钱七';
  } else {
    designerReadonly = false;
    designerReadonlyUser = '';
  }

  // Initialize default nodes if empty
  initDesignerNodes(wf);

  const shell = document.getElementById('designerShell');
  shell.classList.add('active');
  renderDesigner();
  startAutoSave();

  // Simulate abnormal exit recovery dialog for draft workflows
  if (wf.status === 'draft' && wf._hasUnsavedDraft) {
    setTimeout(() => {
      showModal(`<div class="modal" style="max-width:440px"><div class="modal-header"><h2 class="modal-title">${icons.alertTriangle} 检测到未保存的草稿</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
        <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6">检测到您上次编辑的未保存草稿，是否恢复？</p>
        <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-sm)">
          <div style="font-size:var(--font-size-xs);color:var(--md-outline);display:flex;gap:var(--space-3)">
            <span>上次编辑：2026-04-16 14:35</span><span>节点数：${designerNodes.length + 2}</span>
          </div>
        </div>
      </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal();showToast('info','已放弃','将加载最新保存版本')">不恢复</button><button class="btn btn-primary" onclick="closeModal();showToast('success','已恢复','草稿已恢复到上次编辑状态')">恢复草稿</button></div></div>`);
    }, 500);
  }
  wf._hasUnsavedDraft = true;
}

function closeDesigner() {
  designerActive = false;
  stopAutoSave();
  const shell = document.getElementById('designerShell');
  shell.classList.remove('active');
  render(); // Re-render main app
}

function initDesignerNodes(wf) {
  // Generate default nodes for this workflow
  if (!wf._designerNodes) {
    wf._designerNodes = [
      { id: 1, type: 'trigger', name: '触发器', code: 'trigger_1', x: 120, y: 200, config: { triggerType: 'manual' }, warnings: 0 },
      { id: 2, type: 'end', name: '结束', code: 'end_1', x: 700, y: 200, config: {}, warnings: 0 },
    ];
    wf._designerConns = [];
    wf._designerVars = [
      { name: 'input', type: 'Object', scope: '输入变量', desc: '工作流输入参数' },
      { name: 'output', type: 'Object', scope: '输出变量', desc: '工作流输出结果' },
    ];

    // Add more nodes for published workflows to make it look realistic
    if (wf.status === 'published' && wf.execCount > 0) {
      const extraNodes = generateRealisticNodes(wf);
      wf._designerNodes = extraNodes.nodes;
      wf._designerConns = extraNodes.conns;
      wf._designerVars = extraNodes.vars;
    }
    wf._designerNodeIdCounter = wf._designerNodes.length + 1;
    wf._designerConnIdCounter = (wf._designerConns?.length || 0) + 1;
  }

  designerNodes = wf._designerNodes;
  designerConnections = wf._designerConns || [];
  designerVariables = wf._designerVars || [];
  designerNodeIdCounter = wf._designerNodeIdCounter || designerNodes.length + 1;
  designerConnIdCounter = wf._designerConnIdCounter || designerConnections.length + 1;
}

function generateRealisticNodes(wf) {
  const nodes = [
    { id: 1, type: 'trigger', name: '触发器', code: 'trigger_1', x: 80, y: 240, config: { triggerType: 'manual' }, warnings: 0 },
    { id: 2, type: 'http', name: '查询数据', code: 'http_1', x: 320, y: 160, config: { method: 'GET', url: 'https://api.example.com/data' }, warnings: 0 },
    { id: 3, type: 'if', name: '数据校验', code: 'if_1', x: 540, y: 240, config: { condition: 'response.status == 200' }, warnings: 0 },
    { id: 4, type: 'assign', name: '数据处理', code: 'assign_1', x: 760, y: 140, config: {}, warnings: 0 },
    { id: 5, type: 'output', name: '记录日志', code: 'output_1', x: 760, y: 340, config: { level: 'ERROR' }, warnings: 0 },
    { id: 6, type: 'http', name: '推送结果', code: 'http_2', x: 980, y: 140, config: { method: 'POST' }, warnings: 0 },
    { id: 7, type: 'end', name: '结束', code: 'end_1', x: 1200, y: 240, config: {}, warnings: 0 },
  ];
  const conns = [
    { id: 1, from: 1, to: 2, fromPort: 'out', toPort: 'in' },
    { id: 2, from: 1, to: 3, fromPort: 'out', toPort: 'in' },
    { id: 3, from: 3, to: 4, fromPort: 'true', toPort: 'in', label: 'TRUE' },
    { id: 4, from: 3, to: 5, fromPort: 'false', toPort: 'in', label: 'FALSE' },
    { id: 5, from: 4, to: 6, fromPort: 'out', toPort: 'in' },
    { id: 6, from: 6, to: 7, fromPort: 'out', toPort: 'in' },
    { id: 7, from: 5, to: 7, fromPort: 'out', toPort: 'in' },
  ];
  const vars = [
    { name: 'input', type: 'Object', scope: '输入变量', desc: '工作流输入参数' },
    { name: 'output', type: 'Object', scope: '输出变量', desc: '工作流输出结果' },
    { name: 'response', type: 'Object', scope: '中间变量', desc: 'HTTP响应数据' },
    { name: 'processedData', type: 'Object', scope: '中间变量', desc: '处理后的数据' },
    { name: 'errorMsg', type: 'String', scope: '中间变量', desc: '错误信息' },
  ];
  return { nodes, conns, vars };
}

// --- Auto Save ---
// Helper: sync designer state back to workflow object after mutations
function syncDesignerState() {
  if (designerWf) {
    designerWf._designerNodes = designerNodes;
    designerWf._designerConns = designerConnections;
    designerWf._designerVars = designerVariables;
    designerWf._designerNodeIdCounter = designerNodeIdCounter;
    designerWf._designerConnIdCounter = designerConnIdCounter;
  }
}
function startAutoSave() {
  designerAutoSaveTimer = setInterval(() => {
    const indicator = document.getElementById('designerSaveIndicator');
    if (indicator) {
      indicator.innerHTML = `${icons.check} <span>草稿已自动保存</span>`;
      setTimeout(() => {
        const el = document.getElementById('designerSaveIndicator');
        if (el) el.innerHTML = `${icons.check} <span>已保存</span>`;
      }, 2000);
    }
  }, 30000);
}

function stopAutoSave() {
  if (designerAutoSaveTimer) { clearInterval(designerAutoSaveTimer); designerAutoSaveTimer = null; }
}

// --- Main Render ---
function renderDesigner() {
  const shell = document.getElementById('designerShell');
  if (!shell || !designerWf) return;

  const wf = designerWf;
  const statusLabel = { draft: '草稿', published: '已发布', disabled: '已停用' };
  const statusClass = { draft: 'status-draft', published: 'status-published', disabled: 'status-disabled' };

  shell.innerHTML = `
    ${designerReadonly ? `<div class="readonly-banner">${icons.lock} <span>当前 ${designerReadonlyUser} 正在编辑，您处于只读模式</span> <button class="btn btn-sm" style="height:24px;padding:0 12px;background:rgba(217,119,6,0.15);color:var(--md-warning);border-radius:var(--radius-full);font-size:11px;margin-left:var(--space-2)" onclick="showToast('info','提示','刷新页面可重新尝试获取编辑权限')">刷新重试</button></div>` : ''}
    ${designerDebugMode ? `<div class="debug-mode-bar active">${icons.play} <span>调试模式 - 画布只读</span> <button class="btn btn-sm" style="height:24px;padding:0 12px;background:rgba(0,90,193,0.15);color:var(--md-info);border-radius:var(--radius-full);font-size:11px" onclick="exitDebugMode()">退出调试</button></div>` : ''}
    <div class="designer-toolbar">
      <div class="designer-toolbar-left">
        <button class="designer-back-btn" onclick="closeDesigner()" title="返回">${icons.arrowLeft}</button>
        <span class="designer-wf-name" title="${wf.name}">${wf.name}</span>
        <span class="designer-wf-status status-badge ${statusClass[wf.status]}">${statusLabel[wf.status]}</span>
        ${wf.version > 0 ? `<span class="version-badge">v${wf.version}</span>` : ''}
        <span class="designer-save-indicator" id="designerSaveIndicator">${icons.check} <span>已保存</span></span>
      </div>
      <div class="designer-toolbar-center">
        <button class="toolbar-btn" onclick="designerUndo()" title="撤销 (Ctrl+Z)">${icons.arrowLeft} <span>撤销</span></button>
        <button class="toolbar-btn" onclick="designerRedo()" title="重做 (Ctrl+Y)">${icons.redo} <span>重做</span></button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" onclick="autoLayout()" title="优化排列">${icons.workflow} <span>优化排列</span></button>
        <button class="toolbar-btn ${designerGridSnap ? 'active' : ''}" onclick="toggleGridSnap()" title="网格吸附">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span>吸附</span>
        </button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn ${designerMinimapVisible ? 'active' : ''}" onclick="toggleMinimap()" title="小地图">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><rect x="12" y="12" width="8" height="8" rx="1"/></svg>
          <span>地图</span>
        </button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn ${designerBottomPanel === 'problems' ? 'active' : ''}" onclick="toggleDesignerBottom('problems')">
          ${icons.alertTriangle} <span>问题</span>
          ${getProblems().length > 0 ? `<span class="toolbar-badge">${getProblems().length}</span>` : `<span class="toolbar-badge success">${icons.check}</span>`}
        </button>
      </div>
      <div class="designer-toolbar-right">
        <button class="btn btn-secondary btn-sm" onclick="enterDebugMode()" ${designerDebugMode || designerReadonly ? 'disabled style="opacity:0.5"' : ''}>${icons.play}<span>调试</span></button>
        <button class="btn btn-secondary btn-sm" onclick="designerSave()" ${designerReadonly ? 'disabled style="opacity:0.5"' : ''}>${icons.check}<span>保存</span></button>
        <button class="btn btn-secondary btn-sm" onclick="showDesignerSettings()">${icons.settings}<span>设置</span></button>
        <button class="btn btn-secondary btn-sm" onclick="showDesignerVersions()">${icons.history}<span>版本</span></button>
        <button class="btn btn-primary btn-sm" onclick="showPublishDialog()" ${wf.status === 'disabled' || designerReadonly ? 'disabled style="opacity:0.5"' : ''}>${icons.arrowUp || icons.check}<span>发布</span></button>
      </div>
    </div>

    <div class="designer-main">
      ${renderNodePanel()}
      <div class="canvas-area" id="canvasArea">
        <div class="canvas-container" id="canvasContainer" onmousedown="onCanvasMouseDown(event)" onmousemove="onCanvasMouseMove(event)" onmouseup="onCanvasMouseUp(event)" onwheel="onCanvasWheel(event)" ondblclick="onCanvasDblClick(event)" oncontextmenu="onCanvasContextMenu(event)">
          <div class="canvas-grid" style="transform: translate(${designerPanX % 20}px, ${designerPanY % 20}px)"></div>
          <div class="box-select-rect" id="boxSelectRect"></div>
          <svg class="canvas-svg" id="canvasSvg">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--md-outline)" />
              </marker>
              <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--md-primary)" />
              </marker>
            </defs>
            <g transform="translate(${designerPanX}, ${designerPanY}) scale(${designerZoom})">
              ${renderConnections()}
            </g>
          </svg>
          <div class="canvas-nodes" id="canvasNodes" style="transform: translate(${designerPanX}px, ${designerPanY}px) scale(${designerZoom})">
            ${renderCanvasNodes()}
          </div>
        </div>
        <div class="canvas-controls">
          <button class="canvas-control-btn" onclick="designerZoomOut()" title="缩小">${icons.arrowDown}</button>
          <span class="canvas-zoom-level" onclick="designerResetZoom()" title="点击重置">${Math.round(designerZoom * 100)}%</span>
          <button class="canvas-control-btn" onclick="designerZoomIn()" title="放大">${icons.arrowUp}</button>
          <span style="width:1px;height:16px;background:var(--md-outline-variant);margin:0 4px"></span>
          <button class="canvas-control-btn" onclick="designerFitCanvas()" title="适应画布">${icons.workflow}</button>
        </div>
        ${designerMinimapVisible ? renderMinimap() : ''}
      </div>
      ${renderRightPanel()}
    </div>

    ${renderBottomPanel()}
    ${renderContextMenu()}
  `;

  // Set up keyboard shortcuts
  setupDesignerKeys();
}

// --- Node Panel ---
function renderNodePanel() {
  const categories = {};
  nodeTypes.forEach(nt => {
    if (!categories[nt.category]) categories[nt.category] = [];
    categories[nt.category].push(nt);
  });

  return `<div class="node-panel ${designerNodePanelExpanded ? 'expanded' : ''}" id="nodePanel"
    onmouseenter="expandNodePanel()" onmouseleave="collapseNodePanel()">
    <div class="node-panel-header">
      <button class="node-panel-toggle" onclick="toggleNodePanel()">${designerNodePanelExpanded ? icons.chevronLeft : icons.chevronRight}</button>
      <span class="node-panel-title">节点库</span>
    </div>
    <div class="node-panel-search">
      <input type="text" placeholder="搜索节点..." oninput="filterNodes(this.value)" />
    </div>
    <div class="node-panel-body">
      ${Object.entries(categories).map(([cat, types]) => `
        <div class="node-category">
          <div class="node-category-title">${cat}</div>
          ${types.map(nt => `
            <div class="node-type-item" draggable="true" ondragstart="onNodeDragStart(event, '${nt.type}')" data-nodetype="${nt.type}" data-name="${nt.name}">
              <div class="node-type-icon ${nt.color}">${nt.icon}</div>
              <div class="node-type-info">
                <div class="node-type-name">${nt.name}</div>
                <div class="node-type-desc">${nt.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  </div>`;
}

function expandNodePanel() { designerNodePanelExpanded = true; updateNodePanel(); }
function collapseNodePanel() { designerNodePanelExpanded = false; updateNodePanel(); }
function toggleNodePanel() { designerNodePanelExpanded = !designerNodePanelExpanded; updateNodePanel(); }

function updateNodePanel() {
  const panel = document.getElementById('nodePanel');
  if (panel) { panel.classList.toggle('expanded', designerNodePanelExpanded); }
}

function filterNodes(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.node-type-item').forEach(item => {
    const name = item.getAttribute('data-name') || '';
    item.style.display = name.toLowerCase().includes(q) ? 'flex' : 'none';
  });
}

// --- Canvas Nodes ---
function renderCanvasNodes() {
  return designerNodes.map(node => {
    const nt = nodeTypes.find(t => t.type === node.type) || {};
    const isSelected = designerSelectedNodeId === node.id || designerSelectedNodeIds.includes(node.id);
    const debugClass = designerDebugMode ? getNodeDebugClass(node) : '';
    const hasWarning = getNodeWarnings(node).length;
    const isPlaceholder = node.type === 'placeholder';
    const inputConns = designerConnections.filter(c => c.to === node.id);
    const mergeIndicator = inputConns.length > 1 && node.type !== 'end' ? `<div class="merge-strategy-badge" onclick="event.stopPropagation();showMergeStrategyConfig(${node.id})" title="汇合策略: ${node.config?._mergeStrategy === 'any' ? '任一完成' : '等待全部'}">${node.config?._mergeStrategy === 'any' ? '任一' : '全部'}</div>` : '';

    let portsHtml = '';
    if (node.type !== 'trigger') portsHtml += `<div class="canvas-node-port port-in" data-port="in" data-node="${node.id}"></div>`;
    if (node.type === 'if') {
      portsHtml += `<div class="canvas-node-port port-true" data-port="true" data-node="${node.id}"><span class="canvas-node-port-label" style="bottom:-18px;left:-4px;color:var(--md-success)">T</span></div>`;
      portsHtml += `<div class="canvas-node-port port-false" data-port="false" data-node="${node.id}"><span class="canvas-node-port-label" style="bottom:-18px;left:-4px;color:var(--md-error)">F</span></div>`;
    } else if (node.type !== 'end') {
      portsHtml += `<div class="canvas-node-port port-out" data-port="out" data-node="${node.id}"></div>`;
    }

    return `<div class="canvas-node ${isSelected ? 'selected' : ''} ${debugClass} ${isPlaceholder ? 'node-placeholder' : ''}" id="node-${node.id}"
      style="left:${node.x}px;top:${node.y}px"
      onmousedown="onNodeMouseDown(event, ${node.id})"
      onclick="onNodeClick(event, ${node.id})"
      oncontextmenu="onNodeContextMenu(event, ${node.id})">
      ${hasWarning > 0 ? `<div class="canvas-node-warning" title="${hasWarning} 个问题">${hasWarning}</div>` : ''}
      ${node._breakpoint ? '<div class="canvas-node-breakpoint"></div>' : ''}
      ${debugClass ? renderNodeDebugStatus(node) : ''}
      ${mergeIndicator}
      <div class="canvas-node-header">
        <div class="canvas-node-icon ${nt.color || ''}">${nt.icon || '?'}</div>
        <span class="canvas-node-title">${node.name}</span>
      </div>
      <div class="canvas-node-body">
        <span class="canvas-node-code">${node.code}</span>
        ${isPlaceholder ? '<div class="placeholder-tag">待完善</div>' : ''}
        ${node.config?.condition ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(node.config.condition, 30)}</div>` : ''}
        ${node.config?.url ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(node.config.url, 30)}</div>` : ''}
      </div>
      ${portsHtml}
    </div>`;
  }).join('');
}

function truncate(str, len) { return str.length > len ? str.slice(0, len) + '...' : str; }

function getNodeDebugClass(node) {
  if (!node._debugStatus) return '';
  return `node-${node._debugStatus}`;
}

function renderNodeDebugStatus(node) {
  if (!node._debugStatus) return '';
  const cls = `debug-${node._debugStatus}`;
  const iconMap = { success: icons.check, failed: icons.xCircle, running: icons.sync };
  return `<div class="canvas-node-debug-status ${cls}">${iconMap[node._debugStatus] || ''}</div>`;
}

// --- Connections ---
function renderConnections() {
  return designerConnections.map(conn => {
    const fromNode = designerNodes.find(n => n.id === conn.from);
    const toNode = designerNodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return '';

    const fromPos = getPortPosition(fromNode, conn.fromPort || 'out');
    const toPos = getPortPosition(toNode, conn.toPort || 'in');

    const dx = Math.abs(toPos.x - fromPos.x);
    const cp = Math.max(dx * 0.4, 50);

    const path = `M${fromPos.x},${fromPos.y} C${fromPos.x + cp},${fromPos.y} ${toPos.x - cp},${toPos.y} ${toPos.x},${toPos.y}`;

    const isActive = designerDebugMode && conn._debugActive;

    return `<path d="${path}" fill="none" stroke="${isActive ? 'var(--md-info)' : 'var(--md-outline-variant)'}" stroke-width="${isActive ? 2.5 : 2}" marker-end="url(#${isActive ? 'arrowhead-active' : 'arrowhead'})" ${isActive ? 'class="connection-flow"' : ''} onclick="onConnectionClick(event, ${conn.id})" />
    ${conn.label ? `<text x="${(fromPos.x + toPos.x) / 2}" y="${(fromPos.y + toPos.y) / 2 - 8}" text-anchor="middle" font-size="10" fill="var(--md-on-surface-variant)" font-weight="600" font-family="Roboto, sans-serif">${conn.label}</text>` : ''}`;
  }).join('');
}

function getPortPosition(node, port) {
  const w = 180, h = 72;
  switch (port) {
    case 'in': return { x: node.x, y: node.y + h / 2 };
    case 'out': return { x: node.x + w, y: node.y + h / 2 };
    case 'true': return { x: node.x + w * 0.35, y: node.y + h };
    case 'false': return { x: node.x + w * 0.65, y: node.y + h };
    default: return { x: node.x + w, y: node.y + h / 2 };
  }
}

// --- Right Panel ---
function renderRightPanel() {
  const isOpen = designerRightPanel !== null;

  let content = '';
  if (designerRightPanel === 'overview') {
    content = renderOverviewPanel();
  } else if (designerRightPanel === 'node') {
    content = renderNodeConfigPanel();
  } else if (designerRightPanel === 'settings') {
    content = renderDesignerSettingsPanel();
  } else if (designerRightPanel === 'version') {
    content = renderDesignerVersionPanel();
  }

  return `<div class="right-panel ${isOpen ? 'open' : ''}">${content}</div>`;
}

function renderOverviewPanel() {
  const wf = designerWf;
  if (!wf) return '';
  const nodeCount = designerNodes.length;
  const connCount = designerConnections.length;
  const varCount = designerVariables.length;
  const problems = getProblems();

  return `
    <div class="right-panel-header">
      <span class="right-panel-title">${icons.info} 工作流概览</span>
      <button class="right-panel-close" onclick="closeRightPanel()">${icons.close}</button>
    </div>
    <div class="right-panel-body">
      <div class="wf-overview">
        <div class="wf-overview-title">${wf.name}</div>
        <div class="wf-overview-desc">${wf.desc || '暂无描述'}</div>
        <div class="wf-overview-stats">
          <div class="wf-stat-card"><div class="wf-stat-card-label">节点数</div><div class="wf-stat-card-value">${nodeCount}</div></div>
          <div class="wf-stat-card"><div class="wf-stat-card-label">连线数</div><div class="wf-stat-card-value">${connCount}</div></div>
          <div class="wf-stat-card"><div class="wf-stat-card-label">变量数</div><div class="wf-stat-card-value">${varCount}</div></div>
          <div class="wf-stat-card"><div class="wf-stat-card-label">问题</div><div class="wf-stat-card-value" style="${problems.length > 0 ? 'color:var(--md-error)' : 'color:var(--md-success)'}">${problems.length}</div></div>
        </div>
        <div class="config-section">
          <div class="config-section-title">基本信息</div>
          <div class="config-field"><div class="config-field-label">编号</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface);font-family:var(--font-family-mono)">${wf.code}</div></div>
          <div class="config-field"><div class="config-field-label">类型</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface)">${wf.type === 'app' ? '应用流' : '对话流'}</div></div>
          <div class="config-field"><div class="config-field-label">创建者</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface)">${wf.creator}</div></div>
          <div class="config-field"><div class="config-field-label">版本</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface)">${wf.version > 0 ? 'v' + wf.version : '未发布'}</div></div>
          <div class="config-field"><div class="config-field-label">调试状态</div><div style="font-size:var(--font-size-sm);color:${wf.debugPassed ? 'var(--md-success)' : 'var(--md-error)'}">${wf.debugPassed ? '已通过' : '未通过'}</div></div>
        </div>
        <div class="config-section">
          <div class="config-section-title">输入变量</div>
          ${designerVariables.filter(v => v.scope === '输入变量').map(v => `
            <div class="var-item">
              <var-type-badge>${v.type}</var-type-badge>
              <span class="var-name">${v.name}</span>
            </div>
          `).join('') || '<div style="font-size:var(--font-size-xs);color:var(--md-outline)">暂无输入变量</div>'}
        </div>
      </div>
    </div>`;
}

function renderNodeConfigPanel() {
  const node = designerNodes.find(n => n.id === designerSelectedNodeId);
  if (!node) { designerRightPanel = 'overview'; return renderOverviewPanel(); }
  const nt = nodeTypes.find(t => t.type === node.type) || {};
  const hasAdvancedValues = node.config?._mergeStrategy || node.config?._retryCount || node.config?._timeout;

  return `
    <div class="right-panel-header">
      <span class="right-panel-title"><span class="canvas-node-icon ${nt.color || ''}" style="width:22px;height:22px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">${nt.icon || ''}</span> ${node.name}</span>
      <button class="right-panel-close" onclick="deselectNode()">${icons.close}</button>
    </div>
    <div class="right-panel-tabs">
      <div class="right-panel-tab active" id="rpTabBasic" onclick="switchNodeConfigTab('basic')">基础配置</div>
      <div class="right-panel-tab" id="rpTabAdvanced" onclick="switchNodeConfigTab('advanced')">高级配置${hasAdvancedValues ? '<span class="advanced-dot"></span>' : ''}</div>
    </div>
    <div class="right-panel-body" id="nodeConfigBody">
      ${renderNodeConfigFields(node, nt)}
    </div>`;
}

function renderNodeConfigFields(node, nt) {
  let html = `
    <div class="config-section">
      <div class="config-section-title">节点信息</div>
      <div class="config-field">
        <div class="config-field-label">节点名称 <span class="required">*</span></div>
        <input class="config-input" value="${node.name}" onchange="updateNodeProp(${node.id}, 'name', this.value)" />
      </div>
      <div class="config-field">
        <div class="config-field-label">节点编码 <span class="required">*</span></div>
        <input class="config-input" value="${node.code}" onchange="updateNodeProp(${node.id}, 'code', this.value)" style="font-family:var(--font-family-mono)" />
      </div>
    </div>`;

  // Type-specific config
  switch (node.type) {
    case 'trigger':
      html += renderTriggerConfig(node);
      break;
    case 'if':
      html += renderIfConfig(node);
      break;
    case 'switch':
      html += renderSwitchConfig(node);
      break;
    case 'http':
      html += renderHttpConfig(node);
      break;
    case 'code':
      html += renderCodeConfig(node);
      break;
    case 'delay':
      html += renderDelayConfig(node);
      break;
    case 'assign':
      html += renderAssignConfig(node);
      break;
    case 'output':
      html += renderOutputConfig(node);
      break;
    case 'loop':
      html += renderLoopConfig(node);
      break;
    case 'mq':
      html += renderMqConfig(node);
      break;
    case 'workflow':
      html += renderSubWfConfig(node);
      break;
    case 'end':
      html += renderEndConfig(node);
      break;
  }

  // Four-dimensional description
  html += `<div class="config-section" style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--md-surface-container-high)">
    <div class="config-section-title" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">节点说明 ${icons.arrowDown}</div>
    <div style="display:none;font-size:var(--font-size-xs);color:var(--md-on-surface-variant);line-height:1.6">
      <div style="margin-bottom:8px"><strong style="color:var(--md-on-surface)">定义：</strong>${nt.desc || '-'}</div>
      <div style="margin-bottom:8px"><strong style="color:var(--md-on-surface)">适用场景：</strong>根据业务需求配置</div>
      <div><strong style="color:var(--md-on-surface)">使用规则：</strong>请确保必填项已配置</div>
    </div>
  </div>`;

  return html;
}

function renderTriggerConfig(node) {
  const tt = node.config?.triggerType || 'manual';
  return `<div class="config-section">
    <div class="config-section-title">触发方式</div>
    <div class="config-field">
      <select class="config-select" value="${tt}" onchange="updateNodeConfig(${node.id}, 'triggerType', this.value); renderDesigner()">
        <option value="manual" ${tt === 'manual' ? 'selected' : ''}>手动触发</option>
        <option value="scheduled" ${tt === 'scheduled' ? 'selected' : ''}>定时触发</option>
        <option value="event" ${tt === 'event' ? 'selected' : ''}>事件触发</option>
        <option value="webhook" ${tt === 'webhook' ? 'selected' : ''}>Webhook</option>
      </select>
    </div>
    ${tt === 'scheduled' ? `
      <div class="config-field">
        <div class="config-field-label">Cron 表达式</div>
        <input class="config-input" value="${node.config?.cron || '0 0 * * *'}" onchange="updateNodeConfig(${node.id}, 'cron', this.value)" style="font-family:var(--font-family-mono)" placeholder="0 0 * * *" />
        <div class="cron-presets">
          <span class="cron-preset-chip" onclick="this.parentElement.previousElementSibling.value='0 * * * *'">每小时</span>
          <span class="cron-preset-chip" onclick="this.parentElement.previousElementSibling.value='0 0 * * *'">每天</span>
          <span class="cron-preset-chip" onclick="this.parentElement.previousElementSibling.value='0 0 * * 1'">每周一</span>
          <span class="cron-preset-chip" onclick="this.parentElement.previousElementSibling.value='0 0 1 * *'">每月1号</span>
        </div>
      </div>` : ''}
    ${tt === 'event' ? `
      <div class="config-field">
        <div class="config-field-label">事件源标识 <span class="required">*</span></div>
        <input class="config-input" value="${node.config?.eventSource || ''}" onchange="updateNodeConfig(${node.id}, 'eventSource', this.value)" placeholder="输入事件源标识" />
      </div>` : ''}
    ${tt === 'webhook' ? `
      <div class="config-field">
        <div class="config-field-label">Webhook URL</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input class="config-input" value="https://beaver.didatravel.com/webhook/${designerWf?.code || 'WF'}" readonly style="flex:1;background:var(--md-surface);cursor:text" />
          <button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="showToast('success','已复制','Webhook URL已复制到剪贴板')">${icons.copy}</button>
        </div>
      </div>` : ''}
  </div>`;
}

function renderIfConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">条件配置</div>
    <div style="display:flex;gap:4px;margin-bottom:var(--space-3)">
      <button class="toolbar-btn active" style="font-size:11px;height:28px">可视化构建器</button>
      <button class="toolbar-btn" style="font-size:11px;height:28px" onclick="showToast('info','提示','切换到表达式编辑器')">表达式编辑器</button>
    </div>
    <div class="condition-row">
      <input class="config-input" style="flex:1" placeholder="变量" value="${node.config?.condLeft || 'response.status'}" />
      <select class="config-select" style="width:60px"><option>==</option><option>!=</option><option>&gt;</option><option>&lt;</option></select>
      <input class="config-input" style="flex:1" placeholder="值" value="${node.config?.condRight || '200'}" />
    </div>
    <div class="config-field" style="margin-top:var(--space-3)">
      <div class="config-field-label">条件表达式</div>
      <textarea class="expr-editor" placeholder="response.status == 200">${node.config?.condition || 'response.status == 200'}</textarea>
    </div>
    <div style="display:flex;gap:var(--space-3);margin-top:var(--space-3)">
      <div style="flex:1;padding:8px;background:#E8F5E9;border-radius:6px;text-align:center"><div style="font-size:10px;color:#2E7D32;font-weight:600">TRUE 分支</div></div>
      <div style="flex:1;padding:8px;background:#FFEBEE;border-radius:6px;text-align:center"><div style="font-size:10px;color:#C62828;font-weight:600">FALSE 分支</div></div>
    </div>
  </div>`;
}

function renderSwitchConfig(node) {
  const branches = node.config?.branches || [{ name: '分支1', condition: '' }, { name: '分支2', condition: '' }];
  return `<div class="config-section">
    <div class="config-section-title">分支配置 <span style="font-size:10px;color:var(--md-outline);font-weight:400">(${branches.length}/50)</span></div>
    <div class="config-field">
      <div class="config-field-label">匹配模式</div>
      <select class="config-select"><option>首次匹配</option><option>所有匹配</option></select>
    </div>
    ${branches.map((b, i) => `
      <div class="branch-card" style="border-left-color:hsl(${i * 60}, 60%, 50%)">
        <div class="branch-card-header">
          <span class="branch-card-title">${b.name}</span>
          <button class="table-action-btn" style="width:24px;height:24px" onclick="showToast('info','提示','删除分支')">${icons.close}</button>
        </div>
        <textarea class="expr-editor" style="min-height:36px;font-size:11px" placeholder="输入分支条件...">${b.condition}</textarea>
      </div>
    `).join('')}
    <button class="btn btn-ghost btn-sm" onclick="showToast('info','提示','添加分支')" style="width:100%;justify-content:center;margin-top:var(--space-2)">${icons.plus} 添加分支</button>
    <div style="margin-top:var(--space-3);padding:8px;background:var(--md-surface-container);border-radius:6px;text-align:center"><div style="font-size:10px;color:var(--md-outline);font-weight:500">Default 分支</div></div>
  </div>`;
}

function renderHttpConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">HTTP 请求配置</div>
    <div class="config-field">
      <div class="config-field-label">请求方法 <span class="required">*</span></div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'method', this.value)">
        <option ${node.config?.method === 'GET' ? 'selected' : ''}>GET</option>
        <option ${node.config?.method === 'POST' ? 'selected' : ''}>POST</option>
        <option ${node.config?.method === 'PUT' ? 'selected' : ''}>PUT</option>
        <option ${node.config?.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
        <option ${node.config?.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
      </select>
    </div>
    <div class="config-field">
      <div class="config-field-label">请求 URL <span class="required">*</span></div>
      <input class="config-input" value="${node.config?.url || ''}" placeholder="https://api.example.com/endpoint" onchange="updateNodeConfig(${node.id}, 'url', this.value)" />
    </div>
    <div class="config-field">
      <div class="config-field-label">请求头</div>
      <textarea class="expr-editor" style="min-height:50px" placeholder='{"Content-Type": "application/json"}'>${node.config?.headers || ''}</textarea>
    </div>
    <div class="config-field">
      <div class="config-field-label">请求体</div>
      <textarea class="expr-editor" style="min-height:60px" placeholder='{"key": "value"}'>${node.config?.body || ''}</textarea>
    </div>
    <div class="config-field">
      <div class="config-field-label">响应变量</div>
      <input class="config-input" value="${node.config?.responseVar || 'response'}" placeholder="response" style="font-family:var(--font-family-mono)" />
    </div>
  </div>`;
}

function renderCodeConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">代码配置</div>
    <div class="config-field">
      <div class="config-field-label">脚本语言</div>
      <select class="config-select"><option>JavaScript</option><option>Python</option></select>
    </div>
    <div class="config-field">
      <div class="config-field-label">代码</div>
      <textarea class="expr-editor" style="min-height:120px;font-size:12px" placeholder="// 在此编写代码...">${node.config?.script || '// 处理逻辑\nconst result = input;\nreturn result;'}</textarea>
    </div>
  </div>`;
}

function renderDelayConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">延迟配置</div>
    <div class="config-field">
      <div class="config-field-label">延迟方式</div>
      <select class="config-select"><option>固定时长</option><option>到指定时间</option></select>
    </div>
    <div class="config-field">
      <div class="config-field-label">延迟时长</div>
      <div style="display:flex;gap:6px"><input class="config-input" type="number" value="5" style="flex:1" /><select class="config-select" style="width:80px"><option>秒</option><option>分钟</option><option>小时</option></select></div>
    </div>
  </div>`;
}

function renderAssignConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">赋值规则</div>
    <div class="condition-row" style="flex-direction:column;gap:6px;align-items:stretch">
      <div style="display:flex;gap:6px;align-items:center">
        <input class="config-input" placeholder="目标变量" value="processedData" style="flex:1;font-family:var(--font-family-mono)" />
        <span class="condition-op">=</span>
        <input class="config-input" placeholder="表达式或值" value="response.data" style="flex:1;font-family:var(--font-family-mono)" />
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:var(--space-2)">${icons.plus} 添加赋值规则</button>
  </div>`;
}

function renderOutputConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">输出配置</div>
    <div class="config-field">
      <div class="config-field-label">输出级别</div>
      <select class="config-select"><option>INFO</option><option>WARNING</option><option>ERROR</option></select>
    </div>
    <div class="config-field">
      <div class="config-field-label">输出内容</div>
      <textarea class="expr-editor" placeholder="输入输出内容或表达式...">${node.config?.content || ''}</textarea>
    </div>
  </div>`;
}

function renderLoopConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">循环配置</div>
    <div class="config-field">
      <div class="config-field-label">循环模式</div>
      <select class="config-select"><option>ForEach (遍历列表)</option><option>While (条件循环)</option></select>
    </div>
    <div class="config-field">
      <div class="config-field-label">遍历列表变量</div>
      <input class="config-input" placeholder="data.items" style="font-family:var(--font-family-mono)" />
    </div>
    <div class="config-field">
      <div class="config-field-label">当前元素变量名</div>
      <input class="config-input" value="item" style="font-family:var(--font-family-mono)" />
    </div>
  </div>`;
}

function renderMqConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">MQ 消息配置</div>
    <div class="config-field">
      <div class="config-field-label">操作模式</div>
      <select class="config-select"><option>发送消息</option><option>消费消息</option></select>
    </div>
    <div class="config-field">
      <div class="config-field-label">Topic <span class="required">*</span></div>
      <input class="config-input" placeholder="输入 Topic" />
    </div>
    <div class="config-field">
      <div class="config-field-label">消息内容</div>
      <textarea class="expr-editor" placeholder='{"event": "order_created"}'></textarea>
    </div>
  </div>`;
}

function renderSubWfConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">子工作流配置</div>
    <div class="config-field">
      <div class="config-field-label">选择工作流 <span class="required">*</span></div>
      <select class="config-select"><option value="">请选择...</option>
        ${Object.values(wsWorkflows).flat().filter(wf => wf.allowRef && wf.status === 'published' && wf.id !== designerWfId).map(wf => `<option value="${wf.id}">${wf.name} (${wf.code})</option>`).join('')}
      </select>
    </div>
    <div class="config-field">
      <div class="config-field-label">输入参数映射</div>
      <textarea class="expr-editor" style="min-height:50px" placeholder='{"param1": "variable1"}'></textarea>
    </div>
  </div>`;
}

function renderEndConfig(node) {
  return `<div class="config-section">
    <div class="config-section-title">结束配置</div>
    <div class="config-field">
      <div class="config-field-label">输出变量映射</div>
      <textarea class="expr-editor" placeholder='{"result": "processedData"}'>${node.config?.outputMapping || ''}</textarea>
    </div>
  </div>`;
}

// --- Settings Panel ---
function renderDesignerSettingsPanel() {
  const wf = designerWf;
  return `
    <div class="right-panel-header">
      <span class="right-panel-title">${icons.settings} 工作流设置</span>
      <button class="right-panel-close" onclick="showDesignerOverview()">${icons.close}</button>
    </div>
    <div class="right-panel-body">
      <div class="settings-section">
        <div class="settings-section-title">${icons.info} 基本信息</div>
        <div class="config-field"><div class="config-field-label">名称</div><input class="config-input" value="${wf.name}" /></div>
        <div class="config-field"><div class="config-field-label">编号</div><input class="config-input" value="${wf.code}" style="font-family:var(--font-family-mono);color:var(--md-outline)" readonly /></div>
        <div class="config-field"><div class="config-field-label">描述</div><textarea class="config-textarea" style="min-height:50px">${wf.desc || ''}</textarea></div>
        <div class="config-field"><div class="config-field-label">流程负责人</div>${buildPersonPickerHtml('designerOwner', wf.owners || [], true)}</div>
        <div class="config-field"><div class="config-field-label">类型</div><div style="font-size:var(--font-size-sm);color:var(--md-outline)">${wf.type === 'app' ? '应用流' : '对话流'} (不可修改)</div></div>
        <div class="config-field"><div class="config-field-label">所属文件夹</div><div style="font-size:var(--font-size-sm);color:var(--md-outline)">${getFolderPath(wf.wsId, wf.folderId) || '根目录'} (不可修改)</div></div>
        <div class="config-field">
          <div class="config-field-label">允许被引用</div>
          <div style="display:flex;align-items:center;gap:10px"><label class="toggle-sm"><input type="checkbox" ${wf.allowRef ? 'checked' : ''} /><span class="toggle-sm-slider"></span></label><span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">开启后该流程可作为子流程被其他工作流引用</span></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">${icons.alertTriangle} 异常处理策略</div>
        <div class="config-field">
          <div class="config-field-label">默认异常策略</div>
          <select class="config-select">
            <option>终止流程</option><option>忽略并继续</option><option>重试</option><option>转人工处理</option><option>挂起等待回调</option>
          </select>
        </div>
        <div class="config-field">
          <div class="config-field-label">重试次数</div>
          <input class="config-input" type="number" value="3" min="1" max="10" />
        </div>
        <div class="config-field">
          <div class="config-field-label">重试间隔(秒)</div>
          <input class="config-input" type="number" value="5" min="1" />
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">${icons.clock} 超时配置</div>
        <div class="config-field"><div class="config-field-label">工作流整体超时(分钟)</div><input class="config-input" type="number" value="60" /></div>
        <div class="config-field"><div class="config-field-label">节点默认超时(秒)</div><input class="config-input" type="number" value="30" /></div>
        <div class="config-field"><div class="config-field-label">挂起等待超时(小时)</div><input class="config-input" type="number" value="24" /></div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">${icons.sync} 并发控制</div>
        <div class="config-field"><div class="config-field-label">最大并发数</div><input class="config-input" type="number" value="10" min="1" /></div>
        <div class="config-field">
          <div class="config-field-label">排队策略</div>
          <select class="config-select"><option>排队等待</option><option>直接拒绝</option></select>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">${icons.alertTriangle} 告警配置</div>
        <div class="config-field">
          <div class="config-field-label" style="display:flex;justify-content:space-between;align-items:center">启用告警 <label class="toggle-sm"><input type="checkbox" checked /><span class="toggle-sm-slider"></span></label></div>
        </div>
        <div class="config-field">
          <div class="config-field-label">触发条件</div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:var(--font-size-xs)">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" checked style="accent-color:var(--md-primary)"> 流程执行失败</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" checked style="accent-color:var(--md-primary)"> 流程执行超时</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点执行异常</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点转人工处理</label>
          </div>
        </div>
        <div class="config-field"><div class="config-field-label">静默期(分钟)</div><input class="config-input" type="number" value="5" min="1" /></div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">${icons.archive} 执行记录</div>
        <div class="config-field"><div class="config-field-label">保留天数</div><input class="config-input" type="number" value="90" /></div>
        <div class="config-field">
          <div class="config-field-label" style="display:flex;justify-content:space-between;align-items:center">记录节点详情 <label class="toggle-sm"><input type="checkbox" checked /><span class="toggle-sm-slider"></span></label></div>
        </div>
      </div>
    </div>`;
}

// --- Version Panel ---
function renderDesignerVersionPanel() {
  const wf = designerWf;
  const versions = wf.versions || [];
  return `
    <div class="right-panel-header">
      <span class="right-panel-title">${icons.history} 版本历史</span>
      <button class="right-panel-close" onclick="showDesignerOverview()">${icons.close}</button>
    </div>
    <div class="right-panel-body">
      ${versions.length === 0 ? '<div style="text-align:center;color:var(--md-outline);padding:var(--space-8);font-size:var(--font-size-sm)">暂无版本历史</div>' :
      versions.map(ver => `
        <div style="padding:var(--space-3);margin-bottom:var(--space-2);background:var(--md-surface-container);border-radius:var(--radius-sm)${ver.status === 'current' ? ';border-left:3px solid var(--md-primary)' : ''}">
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:4px">
            <span class="version-badge" style="${ver.status === 'current' ? 'background:var(--md-primary);color:white' : ''}">v${ver.v}</span>
            <span style="font-size:var(--font-size-xs);font-weight:500;color:var(--md-on-surface)">${ver.status === 'current' ? '当前生效' : '历史版本'}</span>
          </div>
          <div style="font-size:11px;color:var(--md-outline)">${ver.publishedAt} · ${ver.publisher}</div>
          ${ver.note ? `<div style="font-size:11px;color:var(--md-on-surface-variant);margin-top:4px">${ver.note}</div>` : ''}
          ${ver.status === 'history' ? `<div style="margin-top:6px;display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" style="height:24px;font-size:11px" onclick="showToast('info','提示','查看此版本')">${icons.eye}<span>查看</span></button>
            <button class="btn btn-ghost btn-sm" style="height:24px;font-size:11px" onclick="showToast('info','提示','回滚到此版本')">${icons.redo}<span>回滚</span></button>
          </div>` : ''}
        </div>
      `).join('')}
    </div>`;
}

// --- Bottom Panel ---
function renderBottomPanel() {
  if (!designerBottomPanel) return '<div class="bottom-panel"></div>';

  const problems = getProblems();
  const vars = designerVariables;
  const logs = designerDebugLog;

  return `<div class="bottom-panel open" style="height:${designerBottomPanelHeight}px">
    <div class="bottom-panel-resize-handle" onmousedown="onBottomResizeStart(event)" title="拖拽调整高度"></div>
    <div class="bottom-panel-header">
      <div class="bottom-panel-tabs">
        <div class="bottom-panel-tab ${designerBottomTab === 'problems' ? 'active' : ''}" onclick="switchBottomTab('problems')">
          ${icons.alertTriangle} 问题 ${problems.length > 0 ? `<span class="bottom-panel-tab-badge">${problems.length}</span>` : ''}
        </div>
        <div class="bottom-panel-tab ${designerBottomTab === 'debug' ? 'active' : ''}" onclick="switchBottomTab('debug')">
          ${icons.play} 调试日志
        </div>
        <div class="bottom-panel-tab ${designerBottomTab === 'variables' ? 'active' : ''}" onclick="switchBottomTab('variables')">
          ${icons.hash} 变量 <span class="bottom-panel-tab-badge" style="background:var(--md-primary-container);color:var(--md-primary)">${vars.length}</span>
        </div>
      </div>
      <div class="bottom-panel-actions">
        ${designerBottomTab === 'variables' ? `<button class="toolbar-btn" style="height:24px;font-size:11px" onclick="showAddVariableDialog()">${icons.plus} 新增</button>` : ''}
        <button class="canvas-control-btn" style="width:24px;height:24px" onclick="closeBottomPanel()">${icons.close}</button>
      </div>
    </div>
    <div class="bottom-panel-body">
      ${designerBottomTab === 'problems' ? renderProblemsPanel(problems) : ''}
      ${designerBottomTab === 'debug' ? renderDebugPanel(logs) : ''}
      ${designerBottomTab === 'variables' ? renderVariablesPanel(vars) : ''}
    </div>
  </div>`;
}

function renderProblemsPanel(problems) {
  if (problems.length === 0) return '<div style="text-align:center;color:var(--md-success);padding:var(--space-6);font-size:var(--font-size-sm);display:flex;align-items:center;justify-content:center;gap:8px">' + icons.checkCircle + ' 无问题，可以发布</div>';
  return problems.map(p => `
    <div class="problem-item" onclick="${p.nodeId ? `selectNode(${p.nodeId})` : ''}">
      <span class="problem-icon ${p.level}">${p.level === 'error' ? icons.xCircle : icons.alertTriangle}</span>
      <span class="problem-text">${p.message}</span>
      <span class="problem-location">${p.location}</span>
    </div>
  `).join('');
}

function renderDebugPanel(logs) {
  if (logs.length === 0) return '<div style="text-align:center;color:var(--md-outline);padding:var(--space-6);font-size:var(--font-size-sm)">暂无调试日志，点击"调试"按钮开始</div>';
  return logs.map(log => `
    <div class="debug-log-item">
      <span class="debug-log-time">${log.time}</span>
      <span class="debug-log-level ${log.level}">${log.level.toUpperCase()}</span>
      <span class="debug-log-msg">${log.message}</span>
    </div>
  `).join('');
}

function renderVariablesPanel(vars) {
  return vars.map(v => `
    <div class="var-item">
      <span class="var-type-badge">${v.type}</span>
      <span class="var-name">${v.name}</span>
      <span class="var-scope">${v.scope}</span>
      <button class="table-action-btn" style="width:24px;height:24px;margin-left:auto" onclick="showToast('info','编辑变量','${v.name}')">${icons.edit}</button>
      <button class="table-action-btn danger" style="width:24px;height:24px" onclick="showDeleteVarConfirm('${v.name}')">${icons.trash}</button>
    </div>
  `).join('');
}

// --- Problems Detection ---
function getProblems() {
  const problems = [];
  const hasTrigger = designerNodes.some(n => n.type === 'trigger');
  const hasEnd = designerNodes.some(n => n.type === 'end');

  if (!hasTrigger) problems.push({ level: 'error', message: '缺少触发器节点', location: '流程', nodeId: null });
  if (!hasEnd) problems.push({ level: 'error', message: '缺少结束节点', location: '流程', nodeId: null });

  // Check for disconnected nodes
  designerNodes.forEach(node => {
    if (node.type === 'trigger') {
      const hasOut = designerConnections.some(c => c.from === node.id);
      if (!hasOut) problems.push({ level: 'error', message: `触发器没有输出连线`, location: node.code, nodeId: node.id });
    } else if (node.type === 'end') {
      const hasIn = designerConnections.some(c => c.to === node.id);
      if (!hasIn) problems.push({ level: 'error', message: `结束节点没有输入连线`, location: node.code, nodeId: node.id });
    } else {
      const hasIn = designerConnections.some(c => c.to === node.id);
      const hasOut = designerConnections.some(c => c.from === node.id);
      if (!hasIn) problems.push({ level: 'error', message: `节点「${node.name}」没有输入连线`, location: node.code, nodeId: node.id });
      if (!hasOut) problems.push({ level: 'warning', message: `节点「${node.name}」没有输出连线`, location: node.code, nodeId: node.id });
    }

    // Check required configs
    if (node.type === 'http' && !node.config?.url) {
      problems.push({ level: 'error', message: '请求 URL 未配置', location: node.code, nodeId: node.id });
    }
    // Placeholder node warning
    if (node.type === 'placeholder') {
      problems.push({ level: 'warning', message: `占位节点「${node.name}」待完善`, location: node.code, nodeId: node.id });
    }
  });

  return problems;
}

function getNodeWarnings(node) {
  return getProblems().filter(p => p.nodeId === node.id);
}

// --- Canvas Interaction ---
function onCanvasMouseDown(e) {
  if (e.target.closest('.canvas-node')) return;
  if (e.target.closest('.canvas-controls')) return;
  if (e.target.closest('.canvas-minimap')) return;

  // Close context menu on click
  if (designerContextMenu) { designerContextMenu = null; renderDesigner(); return; }

  // Shift+drag = box selection
  if (e.shiftKey) {
    e.preventDefault();
    const canvasRect = document.getElementById('canvasContainer').getBoundingClientRect();
    designerIsBoxSelecting = true;
    designerBoxSelectStart = { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };
    designerBoxSelectRect = { x: designerBoxSelectStart.x, y: designerBoxSelectStart.y, w: 0, h: 0 };
    return;
  }

  // Start panning
  designerIsPanning = true;
  designerPanStart = { x: e.clientX - designerPanX, y: e.clientY - designerPanY };
  document.getElementById('canvasContainer').style.cursor = 'grabbing';

  // Deselect node if clicking on canvas
  deselectNode();
  designerSelectedNodeIds = [];
}

function onCanvasMouseMove(e) {
  // Box selection drag
  if (designerIsBoxSelecting && designerBoxSelectStart) {
    const canvasRect = document.getElementById('canvasContainer').getBoundingClientRect();
    const cx = e.clientX - canvasRect.left;
    const cy = e.clientY - canvasRect.top;
    designerBoxSelectRect = {
      x: Math.min(designerBoxSelectStart.x, cx),
      y: Math.min(designerBoxSelectStart.y, cy),
      w: Math.abs(cx - designerBoxSelectStart.x),
      h: Math.abs(cy - designerBoxSelectStart.y),
    };
    const el = document.getElementById('boxSelectRect');
    if (el) {
      el.style.left = designerBoxSelectRect.x + 'px';
      el.style.top = designerBoxSelectRect.y + 'px';
      el.style.width = designerBoxSelectRect.w + 'px';
      el.style.height = designerBoxSelectRect.h + 'px';
      el.style.display = 'block';
    }
    return;
  }

  if (designerIsPanning) {
    designerPanX = e.clientX - designerPanStart.x;
    designerPanY = e.clientY - designerPanStart.y;
    updateCanvasTransform();
  }

  // Drag-to-connect: update temp line
  if (designerConnecting) {
    const rect = document.getElementById('canvasContainer').getBoundingClientRect();
    designerConnectingMouse = {
      x: (e.clientX - rect.left - designerPanX) / designerZoom,
      y: (e.clientY - rect.top - designerPanY) / designerZoom,
    };
    drawTempConnection();
    // Highlight port under cursor
    document.querySelectorAll('.port-hover-target').forEach(p => p.classList.remove('port-hover-target'));
    const hoverPort = e.target.closest('.canvas-node-port.port-connectable');
    if (hoverPort) hoverPort.classList.add('port-hover-target');
    return;
  }

  if (designerDraggingExistingNode) {
    const node = designerNodes.find(n => n.id === designerDraggingExistingNode);
    if (node) {
      const rect = document.getElementById('canvasContainer').getBoundingClientRect();
      let nx = (e.clientX - rect.left - designerPanX) / designerZoom - designerDragOffset.x;
      let ny = (e.clientY - rect.top - designerPanY) / designerZoom - designerDragOffset.y;
      // Grid snap
      if (designerGridSnap) {
        nx = Math.round(nx / 20) * 20;
        ny = Math.round(ny / 20) * 20;
      }
      node.x = nx;
      node.y = ny;
      updateCanvasTransform();
    }
  }
}

function onCanvasMouseUp(e) {
  // Finish drag-to-connect
  if (designerConnecting) {
    endConnection(e);
    return;
  }
  // Finish box selection
  if (designerIsBoxSelecting && designerBoxSelectRect) {
    const r = designerBoxSelectRect;
    if (r.w > 5 && r.h > 5) {
      // Find nodes inside the rect (screen-space)
      designerSelectedNodeIds = [];
      designerNodes.forEach(node => {
        const sx = node.x * designerZoom + designerPanX;
        const sy = node.y * designerZoom + designerPanY;
        const sw = 180 * designerZoom;
        const sh = 72 * designerZoom;
        if (sx + sw > r.x && sx < r.x + r.w && sy + sh > r.y && sy < r.y + r.h) {
          designerSelectedNodeIds.push(node.id);
        }
      });
      if (designerSelectedNodeIds.length > 0) {
        designerSelectedNodeId = designerSelectedNodeIds[0];
        if (designerSelectedNodeIds.length === 1) designerRightPanel = 'node';
        else designerRightPanel = 'overview';
        showToast('info', '框选完成', `已选择 ${designerSelectedNodeIds.length} 个节点`);
      }
    }
    designerIsBoxSelecting = false;
    designerBoxSelectStart = null;
    designerBoxSelectRect = null;
    renderDesigner();
    return;
  }

  designerIsPanning = false;
  designerDraggingExistingNode = null;
  document.getElementById('canvasContainer').style.cursor = '';
}

function onCanvasWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  const newZoom = Math.max(0.25, Math.min(2, designerZoom + delta));
  designerZoom = newZoom;
  updateCanvasTransform();
  // Update zoom display
  const zoomEl = document.querySelector('.canvas-zoom-level');
  if (zoomEl) zoomEl.textContent = Math.round(designerZoom * 100) + '%';
}

function onCanvasDblClick(e) {
  if (e.target.closest('.canvas-node')) return;
  // Show quick search
  showQuickNodeSearch(e);
}

function updateCanvasTransform() {
  const nodesContainer = document.getElementById('canvasNodes');
  const svg = document.getElementById('canvasSvg');
  const grid = document.querySelector('.canvas-grid');

  if (nodesContainer) nodesContainer.style.transform = `translate(${designerPanX}px, ${designerPanY}px) scale(${designerZoom})`;
  if (svg) {
    const g = svg.querySelector('g');
    if (g) g.setAttribute('transform', `translate(${designerPanX}, ${designerPanY}) scale(${designerZoom})`);
  }
  if (grid) grid.style.transform = `translate(${designerPanX % 20}px, ${designerPanY % 20}px)`;

  // Re-render nodes for position updates (lightweight)
  const nc = document.getElementById('canvasNodes');
  if (nc) nc.innerHTML = renderCanvasNodes();
  if (svg) {
    const g = svg.querySelector('g');
    if (g) g.innerHTML = `${renderConnections()}`;
  }
}

// --- Node Interaction ---
function onNodeMouseDown(e, nodeId) {
  if (designerDebugMode) return;
  e.stopPropagation();

  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;

  // Check if clicking on a port (start drag-to-connect)
  if (e.target.closest('.canvas-node-port')) {
    const portEl = e.target.closest('.canvas-node-port');
    const port = portEl.getAttribute('data-port');
    if (port === 'in') return; // Only allow dragging FROM output ports
    startConnection(nodeId, port, e);
    return;
  }

  // Start dragging node
  const rect = document.getElementById('canvasContainer').getBoundingClientRect();
  designerDragOffset = {
    x: (e.clientX - rect.left - designerPanX) / designerZoom - node.x,
    y: (e.clientY - rect.top - designerPanY) / designerZoom - node.y,
  };
  designerDraggingExistingNode = nodeId;
}

function onNodeContextMenu(e, nodeId) {
  e.preventDefault();
  e.stopPropagation();
  if (designerReadonly) return;
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  designerSelectedNodeId = nodeId;
  designerRightPanel = 'node';
  const shell = document.getElementById('designerShell');
  const rect = shell.getBoundingClientRect();
  designerContextMenu = { x: e.clientX - rect.left, y: e.clientY - rect.top, nodeId, nodeType: node.type };
  renderDesigner();
}

// --- Node Click with Multi-Select (Ctrl+Click) ---
function onNodeClick(e, nodeId) {
  e.stopPropagation();
  designerContextMenu = null; // Close any open context menu
  if (e.ctrlKey || e.metaKey) {
    // Multi-select toggle
    const idx = designerSelectedNodeIds.indexOf(nodeId);
    if (idx > -1) { designerSelectedNodeIds.splice(idx, 1); }
    else { designerSelectedNodeIds.push(nodeId); }
    designerSelectedNodeId = designerSelectedNodeIds.length > 0 ? designerSelectedNodeIds[designerSelectedNodeIds.length - 1] : null;
    if (designerSelectedNodeIds.length === 1) designerRightPanel = 'node';
    else designerRightPanel = 'overview';
    renderDesigner();
  } else {
    designerSelectedNodeIds = [nodeId];
    selectNode(nodeId);
  }
}

function selectNode(nodeId) {
  designerSelectedNodeId = nodeId;
  designerRightPanel = 'node';
  renderDesigner();
}

function deselectNode() {
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  designerRightPanel = 'overview';
  renderDesigner();
}

function closeRightPanel() {
  designerRightPanel = null;
  renderDesigner();
}

function showDesignerOverview() {
  designerSelectedNodeId = null;
  designerRightPanel = 'overview';
  renderDesigner();
}

// --- Node CRUD ---
function addNodeToCanvas(type, x, y) {
  if (designerDebugMode) return;
  const nt = nodeTypes.find(t => t.type === type);
  if (!nt) return;

  // Check: only one trigger and one end
  if (type === 'trigger' && designerNodes.some(n => n.type === 'trigger')) {
    showToast('warning', '限制', '每个工作流只能有一个触发器节点');
    return;
  }
  if (type === 'end' && designerNodes.some(n => n.type === 'end')) {
    showToast('warning', '限制', '每个工作流只能有一个结束节点');
    return;
  }

  const count = designerNodes.filter(n => n.type === type).length + 1;
  const newNode = {
    id: designerNodeIdCounter++,
    type,
    name: nt.name,
    code: `${nt.code}_${count}`,
    x: x || 400,
    y: y || 200,
    config: {},
    warnings: 0,
  };

  designerNodes.push(newNode);
  designerSelectedNodeId = newNode.id;
  designerRightPanel = 'node';
  renderDesigner();
  showToast('success', '已添加', `${nt.name} 节点`);
}

function deleteSelectedNode() {
  if (designerDebugMode || designerReadonly) return;

  // Multi-select delete
  if (designerSelectedNodeIds.length > 1) {
    const deletable = designerSelectedNodeIds.filter(id => {
      const n = designerNodes.find(nd => nd.id === id);
      return n && n.type !== 'trigger' && n.type !== 'end';
    });
    if (deletable.length === 0) { showToast('warning', '无法删除', '不能删除触发器或结束节点'); return; }
    designerNodes = designerNodes.filter(n => !deletable.includes(n.id));
    designerConnections = designerConnections.filter(c => !deletable.includes(c.from) && !deletable.includes(c.to));
    syncDesignerState();
    designerSelectedNodeIds = designerSelectedNodeIds.filter(id => !deletable.includes(id));
    designerSelectedNodeId = null;
    designerRightPanel = 'overview';
    renderDesigner();
    showToast('success', '已删除', `${deletable.length} 个节点`);
    return;
  }

  // Single delete
  if (!designerSelectedNodeId) return;
  const node = designerNodes.find(n => n.id === designerSelectedNodeId);
  if (!node) return;

  if (node.type === 'trigger' || node.type === 'end') {
    showToast('warning', '无法删除', '触发器和结束节点不可删除');
    return;
  }

  designerNodes = designerNodes.filter(n => n.id !== designerSelectedNodeId);
  designerConnections = designerConnections.filter(c => c.from !== designerSelectedNodeId && c.to !== designerSelectedNodeId);
  syncDesignerState();
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  designerRightPanel = 'overview';
  renderDesigner();
  showToast('success', '已删除', node.name);
}

// --- Connections (Drag-to-Connect) ---
function startConnection(fromNodeId, fromPort, e) {
  designerConnecting = { fromNodeId, fromPort };
  const rect = document.getElementById('canvasContainer').getBoundingClientRect();
  designerConnectingMouse = {
    x: (e.clientX - rect.left - designerPanX) / designerZoom,
    y: (e.clientY - rect.top - designerPanY) / designerZoom,
  };
  // Add connecting class to canvas for visual feedback
  document.getElementById('canvasContainer').classList.add('is-connecting');
  // Mark all valid target ports
  document.querySelectorAll('.canvas-node-port.port-in').forEach(p => {
    const nid = parseInt(p.getAttribute('data-node'));
    if (nid !== fromNodeId) p.classList.add('port-connectable');
  });
  drawTempConnection();
}

function drawTempConnection() {
  if (!designerConnecting || !designerConnectingMouse) return;
  const fromNode = designerNodes.find(n => n.id === designerConnecting.fromNodeId);
  if (!fromNode) return;
  const fromPos = getPortPosition(fromNode, designerConnecting.fromPort);
  const toX = designerConnectingMouse.x;
  const toY = designerConnectingMouse.y;
  const dx = Math.abs(toX - fromPos.x);
  const cp = Math.max(dx * 0.4, 50);
  const path = `M${fromPos.x},${fromPos.y} C${fromPos.x + cp},${fromPos.y} ${toX - cp},${toY} ${toX},${toY}`;
  let tempLine = document.getElementById('tempConnectionLine');
  if (!tempLine) {
    const svg = document.getElementById('canvasSvg');
    const g = svg?.querySelector('g');
    if (!g) return;
    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempLine.id = 'tempConnectionLine';
    tempLine.setAttribute('fill', 'none');
    tempLine.setAttribute('stroke', 'var(--md-primary)');
    tempLine.setAttribute('stroke-width', '2');
    tempLine.setAttribute('stroke-dasharray', '6 4');
    tempLine.setAttribute('opacity', '0.7');
    tempLine.setAttribute('marker-end', 'url(#arrowhead-active)');
    g.appendChild(tempLine);
  }
  tempLine.setAttribute('d', path);
}

function endConnection(e) {
  if (!designerConnecting) return;
  // Check if we dropped on a valid target port
  const targetPort = e.target.closest('.canvas-node-port.port-in');
  if (targetPort) {
    const targetNodeId = parseInt(targetPort.getAttribute('data-node'));
    completeConnection(designerConnecting.fromNodeId, designerConnecting.fromPort, targetNodeId);
  }
  cancelConnection();
}

function cancelConnection() {
  designerConnecting = null;
  designerConnectingMouse = null;
  const tempLine = document.getElementById('tempConnectionLine');
  if (tempLine) tempLine.remove();
  const container = document.getElementById('canvasContainer');
  if (container) container.classList.remove('is-connecting');
  document.querySelectorAll('.port-connectable').forEach(p => p.classList.remove('port-connectable'));
  document.querySelectorAll('.port-hover-target').forEach(p => p.classList.remove('port-hover-target'));
}

function completeConnection(fromNodeId, fromPort, targetId) {
  if (!targetId || fromNodeId === targetId) {
    showToast('warning', '提示', '不允许节点连接到自身'); return;
  }

  // Check for duplicate
  if (designerConnections.some(c => c.from === fromNodeId && c.to === targetId)) {
    showToast('warning', '提示', '该连线已存在'); return;
  }
  // Cycle detection
  if (detectCycle(fromNodeId, targetId)) {
    showToast('error', '检测到环', '该连线会形成循环依赖，不允许创建'); return;
  }

  designerConnections.push({
    id: designerConnIdCounter++,
    from: fromNodeId,
    to: targetId,
    fromPort,
    toPort: 'in',
    label: fromPort === 'true' ? 'TRUE' : fromPort === 'false' ? 'FALSE' : '',
  });

  renderDesigner();
  showToast('success', '连线已创建', '');
}

function onConnectionClick(e, connId) {
  e.stopPropagation();
  if (designerDebugMode) return;
  if (confirm('删除此连线？')) {
    designerConnections = designerConnections.filter(c => c.id !== connId);
    syncDesignerState();
    renderDesigner();
    showToast('success', '连线已删除', '');
  }
}

// --- Node Drag from Panel ---
function onNodeDragStart(e, nodeType) {
  e.dataTransfer.setData('nodeType', nodeType);
  designerDraggingNodeType = nodeType;
}

// Set up canvas as drop target
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', (e) => {
    const nodeType = e.dataTransfer.getData('nodeType');
    if (nodeType && document.getElementById('canvasContainer')) {
      const rect = document.getElementById('canvasContainer').getBoundingClientRect();
      const x = (e.clientX - rect.left - designerPanX) / designerZoom;
      const y = (e.clientY - rect.top - designerPanY) / designerZoom;
      addNodeToCanvas(nodeType, x, y);
    }
  });
});

// --- Node Property Updates ---
function updateNodeProp(nodeId, prop, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (node) { node[prop] = value; }
}

function updateNodeConfig(nodeId, key, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (node) { if (!node.config) node.config = {}; node.config[key] = value; }
}

// --- Zoom Controls ---
function designerZoomIn() { designerZoom = Math.min(2, designerZoom + 0.1); renderDesigner(); }
function designerZoomOut() { designerZoom = Math.max(0.25, designerZoom - 0.1); renderDesigner(); }
function designerResetZoom() { designerZoom = 1; designerPanX = 0; designerPanY = 0; renderDesigner(); }
function designerFitCanvas() { designerZoom = 0.8; designerPanX = 50; designerPanY = 30; renderDesigner(); }

// --- Bottom Panel Controls ---
function toggleDesignerBottom(tab) {
  if (designerBottomPanel && designerBottomTab === tab) {
    designerBottomPanel = null;
  } else {
    designerBottomPanel = tab;
    designerBottomTab = tab;
  }
  renderDesigner();
}

function switchBottomTab(tab) {
  designerBottomTab = tab;
  renderDesigner();
}

function closeBottomPanel() {
  designerBottomPanel = null;
  renderDesigner();
}

// --- Toolbar Actions ---
function designerUndo() { showToast('info', '撤销', '已撤销上一步操作'); }
function designerRedo() { showToast('info', '重做', '已重做上一步操作'); }

function autoLayout() {
  // Simple auto-layout: arrange nodes left to right
  let x = 100, y = 120;
  const sorted = [...designerNodes].sort((a, b) => {
    if (a.type === 'trigger') return -1;
    if (b.type === 'trigger') return 1;
    if (a.type === 'end') return 1;
    if (b.type === 'end') return -1;
    return a.id - b.id;
  });

  sorted.forEach((node, i) => {
    node.x = x + (i % 4) * 220;
    node.y = y + Math.floor(i / 4) * 120;
  });

  renderDesigner();
  showToast('success', '已优化排列', '节点已自动整理');
}

// --- Debug Mode ---
function enterDebugMode() {
  const problems = getProblems().filter(p => p.level === 'error');
  if (problems.length > 0) {
    showToast('error', '无法调试', `存在 ${problems.length} 个错误需要修复`);
    designerBottomPanel = 'problems';
    designerBottomTab = 'problems';
    renderDesigner();
    return;
  }

  designerDebugMode = true;
  designerDebugLog = [];

  // Simulate debug execution
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  designerDebugLog.push(
    { time: ts, level: 'info', message: '调试会话已启动' },
    { time: ts, level: 'info', message: '正在执行触发器节点...' },
  );

  // Simulate node execution states
  designerNodes.forEach(n => { n._debugStatus = null; });
  const triggerNode = designerNodes.find(n => n.type === 'trigger');
  if (triggerNode) triggerNode._debugStatus = 'success';

  // Animate through nodes
  setTimeout(() => {
    designerNodes.forEach(n => {
      if (n.type !== 'trigger' && n.type !== 'end') n._debugStatus = 'success';
    });
    designerDebugLog.push({ time: ts, level: 'info', message: '所有节点执行完成' });
    renderDesigner();

    setTimeout(() => {
      const endNode = designerNodes.find(n => n.type === 'end');
      if (endNode) endNode._debugStatus = 'success';
      designerDebugLog.push({ time: ts, level: 'info', message: '调试执行完成 - 通过' });
      designerConnections.forEach(c => c._debugActive = true);

      if (designerWf) designerWf.debugPassed = true;

      designerBottomPanel = 'debug';
      designerBottomTab = 'debug';
      renderDesigner();
      showToast('success', '调试通过', '所有节点执行成功');
    }, 800);
  }, 600);

  designerBottomPanel = 'debug';
  designerBottomTab = 'debug';
  renderDesigner();
}

function exitDebugMode() {
  designerDebugMode = false;
  designerNodes.forEach(n => { n._debugStatus = null; });
  designerConnections.forEach(c => { c._debugActive = false; });
  renderDesigner();
}

// --- Publish ---
function showPublishDialog() {
  const wf = designerWf;
  if (!wf) return;

  const problems = getProblems().filter(p => p.level === 'error');
  if (problems.length > 0) {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">无法发布</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
      <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-bottom:var(--space-3)">以下问题需要修复后才能发布：</p>
      ${problems.map(p => `<div class="problem-item" style="margin-bottom:6px"><span class="problem-icon error">${icons.xCircle}</span><span class="problem-text">${p.message}</span></div>`).join('')}
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();designerBottomPanel='problems';designerBottomTab='problems';renderDesigner()">去修复</button></div></div>`);
    return;
  }

  if (!wf.debugPassed) {
    showToast('warning', '提示', '该工作流尚未通过调试，请先调试通过后再发布');
    return;
  }

  const newVersion = (wf.version || 0) + 1;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">发布工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div style="text-align:center;margin-bottom:var(--space-4)"><span class="publish-version-badge">v${newVersion}</span></div>
    <div class="config-field"><div class="config-field-label">版本说明 <span class="required">*</span></div><textarea class="form-textarea" id="publishNote" placeholder="请输入版本说明..." maxlength="500" style="min-height:80px"></textarea><div class="form-error hidden" id="publishNoteError"></div></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="executePublish(${newVersion})">确认发布</button></div></div>`);
}

function executePublish(version) {
  const note = document.getElementById('publishNote').value.trim();
  if (!note) {
    const ne = document.getElementById('publishNoteError');
    ne.textContent = '请输入版本说明';
    ne.classList.remove('hidden');
    document.getElementById('publishNote').classList.add('error');
    return;
  }

  const wf = designerWf;
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  // Update previous current to history
  if (wf.versions) wf.versions.forEach(v => { if (v.status === 'current') v.status = 'history'; });
  if (!wf.versions) wf.versions = [];
  wf.versions.unshift({ v: version, status: 'current', publishedAt: ts, publisher: 'Sukey Wu', note });
  wf.version = version;
  wf.status = 'published';
  wf.editedAt = ts;

  closeModal();
  renderDesigner();
  showToast('success', '发布成功', `v${version} 已发布`);
}

// --- Show Settings / Versions ---
function showDesignerSettings() {
  designerSelectedNodeId = null;
  designerRightPanel = 'settings';
  renderDesigner();
}

function showDesignerVersions() {
  designerSelectedNodeId = null;
  designerRightPanel = 'version';
  renderDesigner();
}

// --- Quick Node Search ---
function showQuickNodeSearch(e) {
  if (designerDebugMode) return;
  const rect = document.getElementById('canvasContainer').getBoundingClientRect();
  const dropX = (e.clientX - rect.left - designerPanX) / designerZoom;
  const dropY = (e.clientY - rect.top - designerPanY) / designerZoom;

  showModal(`<div class="modal" style="max-width:400px"><div class="modal-header"><h2 class="modal-title">快速添加节点</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <input type="text" class="form-input" placeholder="搜索节点类型..." oninput="filterQuickSearch(this.value)" style="margin-bottom:var(--space-3)" />
    <div id="quickSearchResults" style="max-height:300px;overflow-y:auto">
      ${nodeTypes.map(nt => `<div class="quick-search-item" onclick="closeModal();addNodeToCanvas('${nt.type}', ${Math.round(dropX)}, ${Math.round(dropY)})">
        <div class="quick-search-item-icon ${nt.color}">${nt.icon}</div>
        <div><div style="font-size:var(--font-size-sm);font-weight:500">${nt.name}</div><div style="font-size:11px;color:var(--md-outline)">${nt.desc}</div></div>
      </div>`).join('')}
    </div>
  </div></div>`);
}

function filterQuickSearch(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#quickSearchResults .quick-search-item').forEach((item, i) => {
    const nt = nodeTypes[i];
    item.style.display = (nt && nt.name.toLowerCase().includes(q)) ? 'flex' : 'none';
  });
}

// --- Variable Management ---
function showAddVariableDialog() {
  showModal(`<div class="modal" style="max-width:420px"><div class="modal-header"><h2 class="modal-title">新增变量</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div class="config-field"><div class="config-field-label">变量名 <span class="required">*</span></div><input class="config-input" id="newVarName" placeholder="变量名" style="font-family:var(--font-family-mono)" /></div>
    <div class="config-field"><div class="config-field-label">数据类型</div><select class="config-select" id="newVarType"><option>String</option><option>Integer</option><option>Double</option><option>Boolean</option><option>DateTime</option><option>Object</option><option>File</option></select></div>
    <div class="config-field"><div class="config-field-label">变量类型</div><select class="config-select" id="newVarScope"><option>输入变量</option><option>输出变量</option><option>中间变量</option></select></div>
    <div class="config-field"><div class="config-field-label">描述</div><input class="config-input" id="newVarDesc" placeholder="变量用途描述" /></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="addVariable()">添加</button></div></div>`);
}

function addVariable() {
  const name = document.getElementById('newVarName').value.trim();
  const type = document.getElementById('newVarType').value;
  const scope = document.getElementById('newVarScope').value;
  const desc = document.getElementById('newVarDesc').value.trim();

  if (!name) { showToast('warning', '提示', '请输入变量名'); return; }
  if (designerVariables.some(v => v.name === name)) { showToast('warning', '提示', '变量名已存在'); return; }

  designerVariables.push({ name, type, scope, desc });
  closeModal();
  renderDesigner();
  showToast('success', '添加成功', `变量「${name}」已添加`);
}

function showDeleteVarConfirm(varName) {
  // Check references
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">删除变量</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">确定删除变量「${varName}」吗？</p>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="deleteVariable('${varName}')">确认删除</button></div></div>`);
}

function deleteVariable(varName) {
  designerVariables = designerVariables.filter(v => v.name !== varName);
  syncDesignerState();
  closeModal();
  renderDesigner();
  showToast('success', '已删除', `变量「${varName}」已删除`);
}

// --- Minimap ---
function renderMinimap() {
  if (designerNodes.length === 0) return '';
  const minX = Math.min(...designerNodes.map(n => n.x));
  const maxX = Math.max(...designerNodes.map(n => n.x)) + 180;
  const minY = Math.min(...designerNodes.map(n => n.y));
  const maxY = Math.max(...designerNodes.map(n => n.y)) + 72;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min(160 / w, 100 / h);

  return `<div class="canvas-minimap">
    ${designerNodes.map(n => {
      const nx = (n.x - minX) * scale + 10;
      const ny = (n.y - minY) * scale + 10;
      return `<div class="minimap-node" style="left:${nx}px;top:${ny}px;width:${20 * scale}px;height:${8 * scale}px"></div>`;
    }).join('')}
    <div class="minimap-viewport" style="left:${10 - designerPanX * scale / designerZoom / 10}px;top:${10 - designerPanY * scale / designerZoom / 10}px;width:60px;height:40px"></div>
  </div>`;
}

// --- Keyboard Shortcuts ---
function setupDesignerKeys() {
  // Remove previous listeners
  document.removeEventListener('keydown', designerKeyHandler);
  if (designerActive) {
    document.addEventListener('keydown', designerKeyHandler);
  }
}

function designerKeyHandler(e) {
  if (!designerActive) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelectedNode();
  }
  if (e.key === 'Escape') {
    if (designerConnecting) { cancelConnection(); }
    else if (designerContextMenu) { designerContextMenu = null; renderDesigner(); }
    else if (designerDebugMode) exitDebugMode();
    else deselectNode();
  }
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); designerUndo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); designerRedo(); }
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); designerSave(); }
  if (e.ctrlKey && e.key === 'c') { e.preventDefault(); designerCopyNodes(); }
  if (e.ctrlKey && e.key === 'v') { e.preventDefault(); designerPasteNodes(); }
  if (e.ctrlKey && e.key === 'a') { e.preventDefault(); designerSelectAll(); }
}

// --- Context Menu ---
function renderContextMenu() {
  if (!designerContextMenu) return '';
  const m = designerContextMenu;

  // Canvas context menu (right-click on empty canvas area)
  if (m.canvas) {
    return `<div class="designer-context-menu" style="left:${m.x}px;top:${m.y}px" onclick="event.stopPropagation()">
      <div class="context-menu-item" onclick="designerPasteNodes();closeContextMenu()">${icons.clipboard || '📋'} 粘贴节点 <span class="context-menu-shortcut">Ctrl+V</span></div>
      <div class="context-menu-item" onclick="designerSelectAll();closeContextMenu()">☑ 全选 <span class="context-menu-shortcut">Ctrl+A</span></div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" onclick="addNodeToCanvas('placeholder',${Math.round(m.canvasX)},${Math.round(m.canvasY)});closeContextMenu()">⬜ 添加占位节点</div>
      <div class="context-menu-item" onclick="autoLayout();closeContextMenu()">${icons.workflow} 优化排列</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" onclick="designerResetZoom();closeContextMenu()">🔍 重置缩放</div>
    </div>`;
  }

  // Node context menu
  const node = designerNodes.find(n => n.id === m.nodeId);
  if (!node) return '';
  const isPlaceholder = node.type === 'placeholder';
  return `<div class="designer-context-menu" style="left:${m.x}px;top:${m.y}px" onclick="event.stopPropagation()">
    <div class="context-menu-item" onclick="designerCopyNodes();closeContextMenu()">${icons.copy || icons.clipboard} 复制节点 <span class="context-menu-shortcut">Ctrl+C</span></div>
    <div class="context-menu-item" onclick="duplicateNode(${m.nodeId});closeContextMenu()">${icons.copy || icons.clipboard} 复制为副本</div>
    <div class="context-menu-divider"></div>
    ${isPlaceholder ? `<div class="context-menu-item" onclick="showConvertNodeMenu(${m.nodeId})">🔄 转换为… <span style="margin-left:auto">▸</span></div><div class="context-menu-divider"></div>` : ''}
    <div class="context-menu-item" onclick="toggleBreakpoint(${m.nodeId});closeContextMenu()">${node._breakpoint ? icons.xCircle : '🔴'} ${node._breakpoint ? '移除断点' : '设置断点'} </div>
    ${designerConnections.filter(c => c.to === m.nodeId).length > 1 && node.type !== 'end' ? `<div class="context-menu-item" onclick="showMergeStrategyConfig(${m.nodeId});closeContextMenu()">🔀 汇合策略</div>` : ''}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" onclick="deleteNodeById(${m.nodeId});closeContextMenu()">${icons.trash} 删除节点 <span class="context-menu-shortcut">Delete</span></div>
  </div>`;
}

function onCanvasContextMenu(e) {
  e.preventDefault();
  if (designerReadonly) return;
  // If clicked on canvas (not node), show canvas context menu
  const shell = document.getElementById('designerShell');
  const rect = shell.getBoundingClientRect();
  const canvasRect = document.getElementById('canvasContainer').getBoundingClientRect();
  const cx = (e.clientX - canvasRect.left - designerPanX) / designerZoom;
  const cy = (e.clientY - canvasRect.top - designerPanY) / designerZoom;
  designerContextMenu = { x: e.clientX - rect.left, y: e.clientY - rect.top, canvas: true, canvasX: cx, canvasY: cy };
  renderDesigner();
}

function closeContextMenu() {
  designerContextMenu = null;
  renderDesigner();
}

function toggleBreakpoint(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (node) {
    node._breakpoint = !node._breakpoint;
    showToast('info', node._breakpoint ? '已设置断点' : '已移除断点', node.name);
  }
}

function deleteNodeById(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (node.type === 'trigger' || node.type === 'end') {
    showToast('warning', '提示', '不能删除触发器或结束节点');
    return;
  }
  designerNodes = designerNodes.filter(n => n.id !== nodeId);
  designerConnections = designerConnections.filter(c => c.from !== nodeId && c.to !== nodeId);
  syncDesignerState();
  if (designerSelectedNodeId === nodeId) {
    designerSelectedNodeId = null;
    designerRightPanel = 'overview';
  }
  designerSelectedNodeIds = designerSelectedNodeIds.filter(id => id !== nodeId);
  renderDesigner();
  showToast('success', '节点已删除', node.name);
}

function duplicateNode(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (node.type === 'trigger' || node.type === 'end') {
    showToast('warning', '限制', '不能复制触发器或结束节点'); return;
  }
  const newNode = {
    ...JSON.parse(JSON.stringify(node)),
    id: designerNodeIdCounter++,
    name: node.name + ' (副本)',
    code: node.code + '_copy',
    x: node.x + 40,
    y: node.y + 40,
  };
  designerNodes.push(newNode);
  renderDesigner();
  showToast('success', '已复制副本', newNode.name);
}

function showConvertNodeMenu(nodeId) {
  const convertTypes = nodeTypes.filter(t => t.type !== 'placeholder' && t.type !== 'trigger' && t.type !== 'end');
  const listHtml = convertTypes.map(t => `<div class="context-menu-item" onclick="convertNodeTo(${nodeId},'${t.type}');closeModal()">${t.icon} ${t.name}</div>`).join('');
  showModal(`<div class="modal" style="max-width:320px"><div class="modal-header"><h2 class="modal-title">转换节点类型</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body" style="padding:0;max-height:320px;overflow-y:auto">
    ${listHtml}
  </div></div>`);
  closeContextMenu();
}

function convertNodeTo(nodeId, newType) {
  const node = designerNodes.find(n => n.id === nodeId);
  const nt = nodeTypes.find(t => t.type === newType);
  if (!node || !nt) return;
  node.type = newType;
  node.name = nt.name;
  node.code = nt.code + '_' + nodeId;
  node.config = {};
  closeModal();
  renderDesigner();
  showToast('success', '节点已转换', `${node.name}`);
}

// --- Toggle Functions ---
function toggleGridSnap() {
  designerGridSnap = !designerGridSnap;
  showToast('info', designerGridSnap ? '网格吸附已开启' : '网格吸附已关闭', designerGridSnap ? '节点将自动对齐20px网格' : '');
  renderDesigner();
}

function toggleMinimap() {
  designerMinimapVisible = !designerMinimapVisible;
  renderDesigner();
}

function designerSave() {
  if (designerReadonly) return;
  const indicator = document.getElementById('designerSaveIndicator');
  if (indicator) {
    indicator.innerHTML = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> <span>保存中…</span>`;
  }
  setTimeout(() => {
    const el = document.getElementById('designerSaveIndicator');
    if (el) el.innerHTML = `${icons.check} <span>已保存</span>`;
    showToast('success', '已保存', '草稿已手动保存');
  }, 600);
}

// --- Node Config Tab Switch ---
function switchNodeConfigTab(tab) {
  const basicTab = document.getElementById('rpTabBasic');
  const advTab = document.getElementById('rpTabAdvanced');
  const body = document.getElementById('nodeConfigBody');
  if (!basicTab || !advTab || !body) return;

  const node = designerNodes.find(n => n.id === designerSelectedNodeId);
  if (!node) return;
  const nt = nodeTypes.find(t => t.type === node.type) || {};

  if (tab === 'basic') {
    basicTab.classList.add('active');
    advTab.classList.remove('active');
    body.innerHTML = renderNodeConfigFields(node, nt);
  } else {
    basicTab.classList.remove('active');
    advTab.classList.add('active');
    body.innerHTML = renderAdvancedConfig(node);
  }
}

function renderAdvancedConfig(node) {
  const ms = node.config?._mergeStrategy || 'all';
  const retry = node.config?._retryCount || 0;
  const timeout = node.config?._timeout || 30;
  return `
    <div class="config-section">
      <div class="config-section-title">执行策略</div>
      <div class="config-field">
        <div class="config-field-label">超时时间 (秒)</div>
        <input class="config-input" type="number" value="${timeout}" min="1" max="3600" onchange="updateNodeConfig(${node.id}, '_timeout', parseInt(this.value))" />
      </div>
      <div class="config-field">
        <div class="config-field-label">失败重试次数</div>
        <input class="config-input" type="number" value="${retry}" min="0" max="10" onchange="updateNodeConfig(${node.id}, '_retryCount', parseInt(this.value))" />
      </div>
      <div class="config-field">
        <div class="config-field-label">汇合策略</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, '_mergeStrategy', this.value)">
          <option value="all" ${ms === 'all' ? 'selected' : ''}>等待全部 (Wait All)</option>
          <option value="any" ${ms === 'any' ? 'selected' : ''}>任一完成 (Any)</option>
        </select>
        <div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);margin-top:4px">当有多条输入连线时，决定何时执行此节点</div>
      </div>
    </div>
    <div class="config-section">
      <div class="config-section-title">错误处理</div>
      <div class="config-field">
        <div class="config-field-label">错误时行为</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, '_errorBehavior', this.value)">
          <option value="stop" ${(node.config?._errorBehavior || 'stop') === 'stop' ? 'selected' : ''}>停止流程</option>
          <option value="continue" ${node.config?._errorBehavior === 'continue' ? 'selected' : ''}>继续执行</option>
          <option value="retry" ${node.config?._errorBehavior === 'retry' ? 'selected' : ''}>自动重试</option>
        </select>
      </div>
    </div>
    <div class="config-section">
      <div class="config-section-title">备注</div>
      <div class="config-field">
        <textarea class="config-textarea" rows="3" placeholder="输入节点备注，用于描述节点的业务含义" onchange="updateNodeConfig(${node.id}, '_note', this.value)">${node.config?._note || ''}</textarea>
      </div>
    </div>`;
}

// --- Merge Strategy Config ---
function showMergeStrategyConfig(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  const ms = node.config?._mergeStrategy || 'all';
  showModal(`<div class="modal" style="max-width:400px"><div class="modal-header"><h2 class="modal-title">🔀 汇合策略</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6;margin-bottom:var(--space-4)">节点「${node.name}」有多条输入连线，请选择汇合策略：</p>
    <div style="display:flex;flex-direction:column;gap:var(--space-3)">
      <label class="merge-option ${ms === 'all' ? 'active' : ''}" style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);border:1.5px solid ${ms === 'all' ? 'var(--md-primary)' : 'var(--md-outline-variant)'};border-radius:var(--radius-sm);cursor:pointer;transition:all 0.2s">
        <input type="radio" name="mergeStrategy" value="all" ${ms === 'all' ? 'checked' : ''} onchange="setMergeStrategy(${nodeId},'all')" />
        <div><div style="font-weight:500;font-size:var(--font-size-sm)">等待全部 (Wait All)</div><div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);margin-top:2px">所有上游节点完成后再执行</div></div>
      </label>
      <label class="merge-option ${ms === 'any' ? 'active' : ''}" style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3);border:1.5px solid ${ms === 'any' ? 'var(--md-primary)' : 'var(--md-outline-variant)'};border-radius:var(--radius-sm);cursor:pointer;transition:all 0.2s">
        <input type="radio" name="mergeStrategy" value="any" ${ms === 'any' ? 'checked' : ''} onchange="setMergeStrategy(${nodeId},'any')" />
        <div><div style="font-weight:500;font-size:var(--font-size-sm)">任一完成 (Any)</div><div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);margin-top:2px">任一上游节点完成后立即执行</div></div>
      </label>
    </div>
  </div><div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">确定</button></div></div>`);
}

function setMergeStrategy(nodeId, strategy) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (node) {
    if (!node.config) node.config = {};
    node.config._mergeStrategy = strategy;
    showToast('success', '汇合策略已更新', strategy === 'all' ? '等待全部' : '任一完成');
  }
}

// --- Copy / Paste / Select All ---
function designerCopyNodes() {
  if (designerReadonly) return;
  const ids = designerSelectedNodeIds.length > 0 ? designerSelectedNodeIds : (designerSelectedNodeId ? [designerSelectedNodeId] : []);
  if (ids.length === 0) { showToast('warning', '提示', '请先选择节点'); return; }
  designerClipboard = ids.map(id => {
    const node = designerNodes.find(n => n.id === id);
    return node ? JSON.parse(JSON.stringify(node)) : null;
  }).filter(Boolean);
  showToast('success', '已复制', `${designerClipboard.length} 个节点`);
}

function designerPasteNodes() {
  if (designerReadonly) return;
  if (designerClipboard.length === 0) { showToast('warning', '提示', '剪贴板为空'); return; }
  const newIds = [];
  designerClipboard.forEach(src => {
    // Skip trigger/end nodes
    if (src.type === 'trigger' || src.type === 'end') return;
    const newNode = {
      ...JSON.parse(JSON.stringify(src)),
      id: designerNodeIdCounter++,
      name: src.name + ' (粘贴)',
      code: src.code + '_p' + Date.now().toString(36).slice(-3),
      x: src.x + 60,
      y: src.y + 60,
    };
    delete newNode._breakpoint;
    delete newNode._debugStatus;
    designerNodes.push(newNode);
    newIds.push(newNode.id);
  });
  syncDesignerState();
  designerSelectedNodeIds = newIds;
  designerSelectedNodeId = newIds[newIds.length - 1];
  renderDesigner();
  showToast('success', '已粘贴', `${newIds.length} 个节点`);
}

function designerSelectAll() {
  if (designerReadonly) return;
  designerSelectedNodeIds = designerNodes.map(n => n.id);
  if (designerSelectedNodeIds.length > 0) {
    designerSelectedNodeId = designerSelectedNodeIds[0];
    designerRightPanel = 'overview';
  }
  renderDesigner();
  showToast('info', '全选', `已选择 ${designerSelectedNodeIds.length} 个节点`);
}

// --- Cycle Detection ---
function detectCycle(fromId, toId) {
  // BFS from toId to check if we can reach fromId (which would create a cycle)
  const visited = new Set();
  const queue = [toId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === fromId) return true; // Cycle detected
    if (visited.has(current)) continue;
    visited.add(current);
    designerConnections.filter(c => c.from === current).forEach(c => {
      queue.push(c.to);
    });
  }
  return false;
}

// --- Bottom Panel Resize ---
function onBottomResizeStart(e) {
  e.preventDefault();
  designerBottomResizing = true;
  const startY = e.clientY;
  const startHeight = designerBottomPanelHeight;

  function onMove(ev) {
    if (!designerBottomResizing) return;
    const delta = startY - ev.clientY;
    const shell = document.getElementById('designerShell');
    const maxH = shell ? shell.offsetHeight * 0.5 : 400;
    designerBottomPanelHeight = Math.max(150, Math.min(maxH, startHeight + delta));
    const bp = document.querySelector('.bottom-panel.open');
    if (bp) bp.style.height = designerBottomPanelHeight + 'px';
  }
  function onUp() {
    designerBottomResizing = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
