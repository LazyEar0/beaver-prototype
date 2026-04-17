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
let designerGridSnap = true; // Grid snap always on by default
let designerNodePanelPinned = false; // Pin node panel open
let designerMinimapVisible = true; // Minimap toggle
let designerClipboard = []; // Copy/paste buffer
let designerIsBoxSelecting = false; // Box selection
let designerBoxSelectStart = null;
let designerBoxSelectRect = null;
let designerContextMenu = null; // Right-click context menu
let designerBottomResizing = false; // Bottom panel resize
let designerFullscreen = false; // Fullscreen toggle
let designerSpaceDown = false; // Space key held for pan mode
let designerUndoStack = []; // Undo state stack (max 50)
let designerRedoStack = []; // Redo state stack
let designerMoreMenuOpen = false; // "More" dropdown menu state
let designerDirty = false; // Track unsaved changes

// --- Node Type Definitions ---
const nodeTypes = [
  { type: 'trigger', name: '触发器', icon: '⚡', color: 'node-color-trigger', category: '流程控制', desc: '流程的起始入口，定义触发条件（手动/定时/事件/Webhook）', code: 'trigger', hidden: true },
  { type: 'end', name: '结束', icon: '🏁', color: 'node-color-end', category: '流程控制', desc: '流程的终止节点，负责输出变量映射与流程结束处理', code: 'end', hidden: true },
  { type: 'if', name: 'IF 条件', icon: '🔀', color: 'node-color-logic', category: '流程控制', desc: '根据条件表达式判断，将流程分为 TRUE / FALSE 两个分支', code: 'if' },
  { type: 'switch', name: 'Switch', icon: '🔃', color: 'node-color-logic', category: '流程控制', desc: '多条件分支路由，支持首次匹配或全部匹配，含 Default 分支', code: 'switch' },
  { type: 'loop', name: '循环', icon: '🔄', color: 'node-color-logic', category: '流程控制', desc: '循环执行，支持 ForEach 遍历、While 条件循环、Break 中断', code: 'loop' },
  { type: 'delay', name: '延迟', icon: '⏱️', color: 'node-color-logic', category: '流程控制', desc: '延迟执行后续节点，支持固定时长或到达指定时间', code: 'delay' },
  { type: 'assign', name: '赋值', icon: '📝', color: 'node-color-data', category: '数据处理', desc: '变量赋值操作，支持表达式计算和 ${变量名} 引用', code: 'assign' },
  { type: 'output', name: '输出', icon: '📤', color: 'node-color-data', category: '数据处理', desc: '输出日志到调试面板，支持 INFO / WARNING / ERROR 级别', code: 'output' },
  { type: 'code', name: '代码', icon: '💻', color: 'node-color-data', category: '数据处理', desc: '编写自定义脚本（JS / Python），实现复杂数据处理逻辑', code: 'code' },
  { type: 'http', name: 'HTTP 请求', icon: '🌐', color: 'node-color-integration', category: '集成', desc: 'HTTP 请求调用，支持 GET/POST/PUT/DELETE，可配置请求头和请求体', code: 'http' },
  { type: 'mq', name: 'MQ 消息', icon: '📨', color: 'node-color-integration', category: '集成', desc: '消息队列操作，支持发送和消费消息，需配置 Topic', code: 'mq' },
  { type: 'workflow', name: '工作流', icon: '🔗', color: 'node-color-flow', category: '集成', desc: '调用被授权且支持引用的工作流，支持输入参数映射', code: 'wf' },
  { type: 'placeholder', name: '占位节点', icon: '⬜', color: 'node-color-placeholder', category: '其他', desc: '标记待完善的流程分支，可后续转换为具体节点类型', code: 'placeholder' },
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
  designerGridSnap = true;
  designerMinimapVisible = true;

  // Multi-person collaborative editing — no edit lock
  designerReadonly = false;
  designerReadonlyUser = '';

  // Simulate online collaborators for demo
  designerOnlineUsers = _getSimulatedOnlineUsers(wfId);

  // Initialize draft snapshot metadata
  if (!wf._draftSnapshots) wf._draftSnapshots = [];
  if (!wf._baseVersion) wf._baseVersion = wf.version || 0;

  // Simulate version conflict for demo: wfId=7 was v1 when we started, but 钱七 published v2
  if (wfId === 7 && !wf._conflictSimulated) {
    wf._baseVersion = 1; // We started editing based on v1
    // But the current version is already v1, so simulate 钱七 publishing v2
    wf.version = 2;
    if (!wf.versions) wf.versions = [];
    wf.versions.unshift({ v: 2, status: 'current', publishedAt: '2026-04-17 14:30', publisher: '钱七', note: '修复报表数据统计逻辑' });
    wf._conflictSimulated = true;
  }

  // Initialize default nodes if empty
  initDesignerNodes(wf);

  const shell = document.getElementById('designerShell');
  shell.classList.add('active');
  renderDesigner();
  startAutoSave();

  // Multi-person awareness: check if someone else has unsaved draft
  const otherDraft = _getOtherUserDraft(wfId);
  if (otherDraft) {
    setTimeout(() => {
      _showCollabNotification(otherDraft.user, otherDraft.time);
    }, 600);
  }

  designerDirty = false; // Fresh open — no unsaved changes
}

function closeDesigner() {
  // If there are unsaved changes, show confirmation dialog
  if (designerDirty) {
    showModal(`<div class="modal" style="max-width:440px"><div class="modal-header"><h2 class="modal-title">${icons.alertTriangle} 存在未保存的修改</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
      <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6">当前流程设计存在尚未保存的修改，离开后这些修改将丢失。</p>
      <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-sm)">
        <div style="font-size:var(--font-size-xs);color:var(--md-outline);display:flex;gap:var(--space-3)">
          <span>节点数：${designerNodes.length}</span><span>连线数：${designerConnections.length}</span>
        </div>
      </div>
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">继续编辑</button><button class="btn btn-secondary" style="color:var(--md-error)" onclick="closeModal();forceCloseDesigner()">不保存，直接离开</button><button class="btn btn-primary" onclick="designerSave();closeModal();setTimeout(forceCloseDesigner,700)">保存并离开</button></div></div>`);
    return;
  }
  forceCloseDesigner();
}

function forceCloseDesigner() {
  designerActive = false;
  designerSpaceDown = false;
  designerMoreMenuOpen = false;
  designerUndoStack = [];
  designerRedoStack = [];
  designerDirty = false;
  designerFullscreen = false;
  // Exit fullscreen if active
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  stopAutoSave();
  document.removeEventListener('keyup', designerKeyUpHandler);
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

// --- Multi-person Collaboration ---
let designerOnlineUsers = []; // Simulated online users

function _getSimulatedOnlineUsers(wfId) {
  // Simulate different online users for different workflows
  const allUsers = [
    { id: 101, name: 'Sukey Wu', avatar: 'W', color: '#6366f1', isMe: true },
    { id: 102, name: 'Admin', avatar: 'A', color: '#0ea5e9' },
    { id: 103, name: '张三', avatar: '张', color: '#f59e0b' },
    { id: 104, name: '李四', avatar: '李', color: '#10b981' },
    { id: 107, name: '钱七', avatar: '钱', color: '#ef4444' },
  ];
  const me = allUsers[0];
  if (wfId === 1) return [me, allUsers[1], allUsers[2]]; // 3 users on 酒店搜索
  if (wfId === 2) return [me, allUsers[4]]; // 2 users on 酒店预订确认
  if (wfId === 7) return [me, allUsers[4], allUsers[3]]; // 3 users on 预订数据报表
  return [me]; // Only me
}

function _getOtherUserDraft(wfId) {
  // Simulate another user having an unsaved draft for certain workflows
  if (wfId === 1) return { user: '张三', time: '16:42' };
  if (wfId === 7) return { user: '钱七', time: '15:18' };
  return null;
}

function _showCollabNotification(userName, time) {
  // Non-blocking notification banner for other user's draft
  const shell = document.getElementById('designerShell');
  if (!shell) return;
  const banner = document.createElement('div');
  banner.className = 'collab-draft-notification';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    <span><strong>${userName}</strong> 有未保存的草稿，最后编辑于 ${time}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:inherit;padding:2px;display:flex">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  `;
  shell.appendChild(banner);
  // Auto-dismiss after 8 seconds
  setTimeout(() => { if (banner.parentElement) banner.remove(); }, 8000);
}

function _renderOnlineUsers() {
  if (!designerOnlineUsers || designerOnlineUsers.length <= 1) return '';
  const maxShow = 4;
  const users = designerOnlineUsers;
  const showUsers = users.slice(0, maxShow);
  const overflow = users.length - maxShow;
  return `<div class="collab-users" title="当前 ${users.length} 人在线编辑">
    ${showUsers.map((u, i) => `<div class="collab-avatar${u.isMe ? ' is-me' : ''}" style="background:${u.color};z-index:${users.length - i}" title="${u.name}${u.isMe ? '（你）' : ''}">${u.avatar}</div>`).join('')}
    ${overflow > 0 ? `<div class="collab-avatar collab-overflow" style="z-index:0">+${overflow}</div>` : ''}
  </div>`;
}

function _getDraftSnapshotInfo() {
  const wf = designerWf;
  if (!wf || !wf._draftSnapshots || wf._draftSnapshots.length === 0) return null;
  return wf._draftSnapshots[wf._draftSnapshots.length - 1];
}

// --- Main Render ---
function renderDesigner() {
  const shell = document.getElementById('designerShell');
  if (!shell || !designerWf) return;

  const wf = designerWf;
  const statusLabel = { draft: '草稿', published: '已发布', disabled: '已停用' };
  const statusClass = { draft: 'status-draft', published: 'status-published', disabled: 'status-disabled' };

  shell.innerHTML = `
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
        <button class="toolbar-btn" onclick="designerUndo()" title="撤销上一步操作 (Ctrl+Z)">${icons.arrowLeft}</button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn" onclick="autoLayout()" title="自动优化节点排列">${icons.workflow}</button>
        <button class="toolbar-btn ${designerMinimapVisible ? 'active' : ''}" onclick="toggleMinimap()" title="${designerMinimapVisible ? '隐藏小地图' : '显示小地图'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><rect x="12" y="12" width="8" height="8" rx="1"/></svg>
        </button>
        <button class="toolbar-btn ${designerFullscreen ? 'active' : ''}" onclick="toggleDesignerFullscreen()" title="${designerFullscreen ? '退出全屏 (F11)' : '进入全屏 (F11)'}">
          ${designerFullscreen
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="4 14 4 20 10 20"/><polyline points="20 10 20 4 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
          }
        </button>
        <span class="toolbar-divider"></span>
        <button class="toolbar-btn ${designerBottomPanel === 'variables' ? 'active' : ''}" onclick="toggleDesignerBottom('variables')" title="查看和管理变量定义">
          ${icons.hash} <span>变量</span>
          <span class="toolbar-badge" style="background:var(--md-primary-container);color:var(--md-primary)">${designerVariables.length}</span>
        </button>
        <button class="toolbar-btn ${designerBottomPanel === 'problems' ? 'active' : ''}" onclick="toggleDesignerBottom('problems')" title="查看流程中的问题和警告">
          ${icons.alertTriangle} <span>问题</span>
          ${getProblems().length > 0 ? `<span class="toolbar-badge">${getProblems().length}</span>` : `<span class="toolbar-badge success">${icons.check}</span>`}
        </button>
      </div>
      <div class="designer-toolbar-right">
        ${_renderOnlineUsers()}
        ${designerOnlineUsers.length > 1 ? '<span class="toolbar-divider"></span>' : ''}
        <button class="btn btn-secondary btn-sm" onclick="enterDebugMode()" ${designerDebugMode ? 'disabled style="opacity:0.5"' : ''} title="调试运行工作流 (模拟执行)">${icons.play}<span>调试</span></button>
        <button class="btn btn-secondary btn-sm" onclick="designerSave()" title="手动保存草稿 (Ctrl+S)">${icons.check}<span>保存</span></button>
        <div class="designer-more-menu-wrap" style="position:relative">
          <button class="btn btn-secondary btn-sm" onclick="toggleDesignerMoreMenu(event)" title="更多操作">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg><span>更多</span>
          </button>
          ${designerMoreMenuOpen ? `<div class="designer-more-dropdown" onclick="event.stopPropagation()">
            <div class="more-dropdown-item" onclick="showDesignerSettings();closeDesignerMoreMenu()">
              ${icons.settings} <span>工作流设置</span>
            </div>
            <div class="more-dropdown-item" onclick="showDesignerVersions();closeDesignerMoreMenu()">
              ${icons.history} <span>版本历史</span>
            </div>
          </div>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="showPublishDialog()" ${wf.status === 'disabled' ? 'disabled style="opacity:0.5"' : ''} title="发布当前工作流版本">${icons.arrowUp || icons.check}<span>发布</span></button>
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
                <polygon points="0 0, 10 3.5, 0 7" fill="#222" />
              </marker>
              <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#1890FF" />
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
          <button class="canvas-control-btn" onclick="designerZoomOut()" title="缩小视图">${icons.arrowDown}</button>
          <input class="canvas-zoom-input" id="canvasZoomInput" type="text" value="${Math.round(designerZoom * 100)}%" onfocus="onZoomInputFocus(this)" onblur="onZoomInputBlur(this)" onkeydown="onZoomInputKey(event, this)" title="输入精确缩放值 (25%-200%)" />
          <button class="canvas-control-btn" onclick="designerZoomIn()" title="放大视图">${icons.arrowUp}</button>
          <span style="width:1px;height:16px;background:var(--md-outline-variant);margin:0 4px"></span>
          <button class="canvas-control-btn" onclick="designerFitCanvas()" title="自适应画布大小">${icons.workflow}</button>
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
  nodeTypes.filter(nt => !nt.hidden).forEach(nt => {
    if (!categories[nt.category]) categories[nt.category] = [];
    categories[nt.category].push(nt);
  });

  return `<div class="node-panel ${designerNodePanelExpanded ? 'expanded' : ''} ${designerNodePanelPinned ? 'pinned' : ''}" id="nodePanel"
    ${!designerNodePanelPinned ? 'onmouseenter="expandNodePanel()" onmouseleave="collapseNodePanel()"' : ''}>
    <div class="node-panel-header">
      <button class="node-panel-toggle" onclick="toggleNodePanel()" title="${designerNodePanelExpanded ? '收起节点库' : '展开节点库'}">${designerNodePanelExpanded ? icons.chevronLeft : icons.chevronRight}</button>
      <span class="node-panel-title">节点库</span>
      <button class="node-panel-pin ${designerNodePanelPinned ? 'active' : ''}" onclick="togglePinNodePanel()" title="${designerNodePanelPinned ? '取消固定' : '固定面板'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 17v5"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"/></svg>
      </button>
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
    <div class="node-panel-hint">触发器和结束节点已自动创建</div>
  </div>`;
}

function expandNodePanel() { if (!designerNodePanelPinned) { designerNodePanelExpanded = true; updateNodePanel(); } }
function collapseNodePanel() { if (!designerNodePanelPinned) { designerNodePanelExpanded = false; updateNodePanel(); } }
function toggleNodePanel() { designerNodePanelExpanded = !designerNodePanelExpanded; updateNodePanel(); }
function togglePinNodePanel() {
  designerNodePanelPinned = !designerNodePanelPinned;
  if (designerNodePanelPinned) designerNodePanelExpanded = true;
  renderDesigner();
}

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
    } else if (node.type === 'switch') {
      // Switch node: multiple branch output ports + default
      const branches = node.config?.branches || [{ name: '分支1' }, { name: '分支2' }];
      const totalPorts = branches.length + 1; // branches + default
      branches.forEach((b, idx) => {
        const portPos = (idx + 1) / (totalPorts + 1) * 100;
        portsHtml += `<div class="canvas-node-port port-switch-case" data-port="case${idx}" data-node="${node.id}" style="bottom:-6px;left:${portPos}%;transform:translateX(-50%)"><span class="canvas-node-port-label" style="bottom:-18px;left:50%;transform:translateX(-50%);color:#1890FF;white-space:nowrap;font-size:10px">${b.name}</span></div>`;
      });
      const defPos = totalPorts / (totalPorts + 1) * 100;
      portsHtml += `<div class="canvas-node-port port-switch-default" data-port="caseDefault" data-node="${node.id}" style="bottom:-6px;left:${defPos}%;transform:translateX(-50%)"><span class="canvas-node-port-label" style="bottom:-18px;left:50%;transform:translateX(-50%);color:#94a3b8;white-space:nowrap;font-size:10px">Default</span></div>`;
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

    return `<path d="${path}" fill="none" stroke="${isActive ? '#1890FF' : '#222'}" stroke-width="${isActive ? 3.5 : 2.5}" marker-end="url(#${isActive ? 'arrowhead-active' : 'arrowhead'})" ${isActive ? 'class="connection-flow"' : ''} onclick="onConnectionClick(event, ${conn.id})" style="cursor:pointer" />
    ${conn.label ? `<text x="${(fromPos.x + toPos.x) / 2}" y="${(fromPos.y + toPos.y) / 2 - 10}" text-anchor="middle" font-size="11" fill="${conn.label === 'TRUE' ? '#16a34a' : conn.label === 'FALSE' ? '#dc2626' : conn.label === 'Default' ? '#94a3b8' : '#1890FF'}" font-weight="700" font-family="Roboto, sans-serif" paint-order="stroke" stroke="#fff" stroke-width="3">${conn.label}</text>` : ''}`;
  }).join('');
}

function getPortPosition(node, port) {
  const w = 180, h = 72;
  switch (port) {
    case 'in': return { x: node.x, y: node.y + h / 2 };
    case 'out': return { x: node.x + w, y: node.y + h / 2 };
    case 'true': return { x: node.x + w * 0.35, y: node.y + h };
    case 'false': return { x: node.x + w * 0.65, y: node.y + h };
    case 'caseDefault': {
      const branches = node.config?.branches || [{ name: '分支1' }, { name: '分支2' }];
      const totalPorts = branches.length + 1;
      const defPos = totalPorts / (totalPorts + 1);
      return { x: node.x + w * defPos, y: node.y + h };
    }
    default: {
      // Switch case ports: case0, case1, case2...
      if (port.startsWith('case')) {
        const idx = parseInt(port.replace('case', ''));
        const branches = node.config?.branches || [{ name: '分支1' }, { name: '分支2' }];
        const totalPorts = branches.length + 1;
        const pos = (idx + 1) / (totalPorts + 1);
        return { x: node.x + w * pos, y: node.y + h };
      }
      return { x: node.x + w, y: node.y + h / 2 };
    }
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

  // Node description with richer content from PRD
  const nodeHelpMap = {
    trigger: { scene: '作为每个工作流的起始节点，定义流程何时被触发执行', rules: '每个工作流只能有一个触发器；触发方式和输入参数是必配项' },
    end: { scene: '作为工作流的终止节点，汇总输出结果', rules: '每个工作流只能有一个结束节点；应映射需要输出的变量' },
    'if': { scene: '根据数据判断走不同的业务分支，例如「订单金额 > 1000 走审批流」', rules: '必须配置条件表达式；TRUE 和 FALSE 分支都应连接后续节点' },
    'switch': { scene: '当有多个业务分支时使用，例如「根据订单来源渠道分发到不同处理流程」', rules: '至少配置 2 个分支条件；建议配置 Default 分支兜底' },
    loop: { scene: '需要重复处理列表数据或轮询等待时使用', rules: 'ForEach 模式必须指定列表变量；建议设置最大循环次数防止死循环' },
    delay: { scene: '需要等待一段时间后再继续执行，例如「等待审批结果」或「定时重试」', rules: '固定时长模式需设置具体时长；到指定时间模式需设置目标时刻' },
    assign: { scene: '对变量进行计算或转换，例如「将接口返回数据映射到业务变量」', rules: '目标变量名不能为空；支持 ${变量名} 引用其他变量' },
    output: { scene: '记录流程执行日志，便于调试和问题排查', rules: 'INFO 级别用于常规记录，ERROR 级别会触发告警' },
    code: { scene: '标准节点无法满足的复杂数据处理逻辑', rules: '代码中可通过 input 获取输入数据，通过 return 返回处理结果' },
    http: { scene: '调用外部 REST API 接口，例如「查询订单状态」「推送通知」', rules: '请求 URL 为必填项；建议配置超时和重试策略' },
    mq: { scene: '与消息队列系统交互，例如「发布订单创建事件」「消费支付回调消息」', rules: 'Topic 为必填项；消费模式需关注消息幂等处理' },
    workflow: { scene: '复用已有流程能力，例如「调用通用的审批流程」「复用数据校验流程」', rules: '只能调用已发布、开启了「允许被引用」、且授权了当前空间的工作流' },
    placeholder: { scene: '规划流程时的临时占位，标记待实现的部分', rules: '发布前需转换为具体节点类型或删除' },
  };
  const help = nodeHelpMap[node.type] || {};

  html += `<div class="config-section node-help-section">
    <div class="config-section-title" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">节点说明 ${icons.arrowDown}</div>
    <div style="display:none;font-size:var(--font-size-xs);color:var(--md-on-surface-variant);line-height:1.7">
      <div style="margin-bottom:8px"><strong style="color:var(--md-on-surface)">定义</strong><br/>${nt.desc || '-'}</div>
      <div style="margin-bottom:8px"><strong style="color:var(--md-on-surface)">适用场景</strong><br/>${help.scene || '根据业务需求配置'}</div>
      <div><strong style="color:var(--md-on-surface)">使用规则</strong><br/>${help.rules || '请确保必填项已配置'}</div>
    </div>
  </div>`;

  return html;
}

function renderTriggerConfig(node) {
  const tt = node.config?.triggerType || 'manual';
  const inputParams = node.config?.inputParams || [];
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
  </div>
  <div class="config-section">
    <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">输入参数 <button class="btn btn-ghost btn-sm" style="height:24px;font-size:11px" onclick="addTriggerParam(${node.id})">${icons.plus} 添加</button></div>
    <div class="config-field-help" style="margin-bottom:var(--space-2)">定义触发流程时需要传入的参数，可在后续节点中通过 \${参数名} 引用</div>
    ${inputParams.length === 0 ? '<div style="text-align:center;padding:var(--space-3);color:var(--md-outline);font-size:var(--font-size-xs)">暂无输入参数，点击上方按钮添加</div>' :
    inputParams.map((p, i) => `
      <div class="trigger-param-card">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
          <input class="config-input" value="${p.name}" placeholder="参数名" style="flex:1;font-family:var(--font-family-mono);font-size:11px" />
          <select class="config-select" style="width:90px;font-size:11px">
            <option ${p.type === 'String' ? 'selected' : ''}>String</option>
            <option ${p.type === 'Integer' ? 'selected' : ''}>Integer</option>
            <option ${p.type === 'Double' ? 'selected' : ''}>Double</option>
            <option ${p.type === 'Boolean' ? 'selected' : ''}>Boolean</option>
            <option ${p.type === 'DateTime' ? 'selected' : ''}>DateTime</option>
            <option ${p.type === 'Object' ? 'selected' : ''}>Object</option>
            <option ${p.type === 'File' ? 'selected' : ''}>File</option>
          </select>
          <label style="display:flex;align-items:center;gap:2px;font-size:10px;color:var(--md-on-surface-variant);white-space:nowrap"><input type="checkbox" ${p.required ? 'checked' : ''} style="accent-color:var(--md-primary);width:12px;height:12px">必填</label>
          <button class="table-action-btn danger" style="width:20px;height:20px;flex-shrink:0" onclick="removeTriggerParam(${node.id},${i})">${icons.close}</button>
        </div>
        <input class="config-input" value="${p.desc || ''}" placeholder="参数说明" style="font-size:11px" />
      </div>
    `).join('')}
  </div>`;
}

function addTriggerParam(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.inputParams) node.config.inputParams = [];
  const idx = node.config.inputParams.length + 1;
  node.config.inputParams.push({ name: 'param_' + idx, type: 'String', required: false, desc: '' });
  renderDesigner();
}

function removeTriggerParam(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.inputParams) return;
  node.config.inputParams.splice(index, 1);
  renderDesigner();
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
  if (!node.config) node.config = {};
  if (!node.config.branches) node.config.branches = [{ name: '分支1', condition: '' }, { name: '分支2', condition: '' }];
  const branches = node.config.branches;
  return `<div class="config-section">
    <div class="config-section-title">分支配置 <span style="font-size:10px;color:var(--md-outline);font-weight:400">(${branches.length}/50)</span></div>
    <div class="config-field">
      <div class="config-field-label">匹配模式</div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'matchMode', this.value)">
        <option value="first" ${node.config.matchMode === 'first' ? 'selected' : ''}>首次匹配</option>
        <option value="all" ${node.config.matchMode === 'all' ? 'selected' : ''}>所有匹配</option>
      </select>
    </div>
    ${branches.map((b, i) => `
      <div class="branch-card" style="border-left-color:hsl(${i * 60}, 60%, 50%)">
        <div class="branch-card-header">
          <input class="config-input" style="flex:1;height:28px;font-size:12px;font-weight:500" value="${b.name}" onchange="updateSwitchBranchName(${node.id}, ${i}, this.value)" />
          <button class="table-action-btn" style="width:24px;height:24px" onclick="removeSwitchBranch(${node.id}, ${i})" title="删除分支">${icons.close}</button>
        </div>
        <textarea class="expr-editor" style="min-height:36px;font-size:11px" placeholder="输入分支条件表达式..." onchange="updateSwitchBranchCondition(${node.id}, ${i}, this.value)">${b.condition}</textarea>
      </div>
    `).join('')}
    <button class="btn btn-ghost btn-sm" onclick="addSwitchBranch(${node.id})" style="width:100%;justify-content:center;margin-top:var(--space-2)">${icons.plus} 添加分支</button>
    <div style="margin-top:var(--space-3);padding:8px;background:var(--md-surface-container);border-radius:6px;text-align:center"><div style="font-size:10px;color:var(--md-outline);font-weight:500">Default 分支（兜底）</div></div>
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
  const mode = node.config?.loopMode || 'forEach';
  return `<div class="config-section">
    <div class="config-section-title">循环配置</div>
    <div class="config-field">
      <div class="config-field-label">循环模式 <span class="required">*</span></div>
      <div class="loop-mode-cards">
        <div class="loop-mode-card ${mode === 'forEach' ? 'active' : ''}" onclick="updateNodeConfig(${node.id}, 'loopMode', 'forEach'); renderDesigner()">
          <div class="loop-mode-card-icon">🔄</div>
          <div class="loop-mode-card-info">
            <div class="loop-mode-card-title">ForEach</div>
            <div class="loop-mode-card-desc">遍历列表中的每个元素</div>
          </div>
        </div>
        <div class="loop-mode-card ${mode === 'while' ? 'active' : ''}" onclick="updateNodeConfig(${node.id}, 'loopMode', 'while'); renderDesigner()">
          <div class="loop-mode-card-icon">🔁</div>
          <div class="loop-mode-card-info">
            <div class="loop-mode-card-title">While</div>
            <div class="loop-mode-card-desc">满足条件时持续执行</div>
          </div>
        </div>
      </div>
    </div>
    ${mode === 'forEach' ? `
      <div class="config-field">
        <div class="config-field-label">遍历列表变量 <span class="required">*</span></div>
        <input class="config-input" value="${node.config?.listVar || ''}" placeholder="\${data.items}" style="font-family:var(--font-family-mono)" onchange="updateNodeConfig(${node.id}, 'listVar', this.value)" />
        <div class="config-field-help">引用一个数组类型的变量，循环将遍历其中每个元素</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">当前元素变量名</div>
        <input class="config-input" value="${node.config?.itemVar || 'item'}" style="font-family:var(--font-family-mono)" onchange="updateNodeConfig(${node.id}, 'itemVar', this.value)" />
        <div class="config-field-help">每次循环中，当前元素会被赋值到此变量</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">索引变量名</div>
        <input class="config-input" value="${node.config?.indexVar || 'index'}" style="font-family:var(--font-family-mono)" onchange="updateNodeConfig(${node.id}, 'indexVar', this.value)" />
      </div>
    ` : `
      <div class="config-field">
        <div class="config-field-label">循环条件 <span class="required">*</span></div>
        <textarea class="expr-editor" style="min-height:40px" placeholder="retryCount < 3 && !success" onchange="updateNodeConfig(${node.id}, 'whileCondition', this.value)">${node.config?.whileCondition || ''}</textarea>
        <div class="config-field-help">条件为 true 时继续执行循环体</div>
      </div>
    `}
    <div class="config-field">
      <div class="config-field-label">最大循环次数</div>
      <input class="config-input" type="number" value="${node.config?.maxIterations || 1000}" min="1" max="100000" onchange="updateNodeConfig(${node.id}, 'maxIterations', parseInt(this.value))" />
      <div class="config-field-help">防止无限循环的安全限制</div>
    </div>
    <div class="config-field">
      <div style="display:flex;align-items:center;gap:10px">
        <label class="toggle-sm"><input type="checkbox" ${node.config?.allowBreak !== false ? 'checked' : ''} onchange="updateNodeConfig(${node.id}, 'allowBreak', this.checked)" /><span class="toggle-sm-slider"></span></label>
        <span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">允许 Break 中断（满足条件时提前跳出循环）</span>
      </div>
    </div>
    ${node.config?.allowBreak !== false ? `
      <div class="config-field">
        <div class="config-field-label">Break 条件</div>
        <textarea class="expr-editor" style="min-height:36px;font-size:11px" placeholder="errorCount > 5" onchange="updateNodeConfig(${node.id}, 'breakCondition', this.value)">${node.config?.breakCondition || ''}</textarea>
      </div>
    ` : ''}
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
  // Only show workflows that are published, allow reference, AND have authorized the current workspace
  const currentWsId = designerWsId;
  const availableWfs = Object.values(wsWorkflows).flat().filter(wf =>
    wf.allowRef && wf.status === 'published' && wf.id !== designerWfId &&
    (!wf.authorizedSpaces || wf.authorizedSpaces.length === 0 || wf.authorizedSpaces.includes(currentWsId))
  );
  return `<div class="config-section">
    <div class="config-section-title">工作流调用配置</div>
    <div class="config-field">
      <div class="config-field-label">选择工作流 <span class="required">*</span></div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'targetWfId', this.value)"><option value="">请选择...</option>
        ${availableWfs.map(wf => {
          const wsName = workspaces.find(ws => ws.id === wf.wsId)?.name || '';
          return `<option value="${wf.id}" ${node.config?.targetWfId == wf.id ? 'selected' : ''}>${wf.name} (${wf.code})${wsName ? ' - ' + wsName : ''}</option>`;
        }).join('')}
      </select>
      <div class="config-field-help">仅显示已发布、允许引用、且授权当前空间的工作流</div>
    </div>
    ${availableWfs.length === 0 ? `<div style="padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-sm);font-size:var(--font-size-xs);color:var(--md-outline);text-align:center">暂无可调用的工作流。请确认目标工作流已发布、开启"允许被引用"、并授权了当前空间。</div>` : ''}
    <div class="config-field">
      <div class="config-field-label">输入参数映射</div>
      <textarea class="expr-editor" style="min-height:50px" placeholder='{"param1": "\${variable1}", "param2": "\${variable2}"}' onchange="updateNodeConfig(${node.id}, 'inputMapping', this.value)">${node.config?.inputMapping || ''}</textarea>
      <div class="config-field-help">将当前流程变量映射为目标工作流的输入参数</div>
    </div>
    <div class="config-field">
      <div class="config-field-label">输出变量名</div>
      <input class="config-input" value="${node.config?.outputVar || 'wfResult'}" style="font-family:var(--font-family-mono)" onchange="updateNodeConfig(${node.id}, 'outputVar', this.value)" />
      <div class="config-field-help">目标工作流的执行结果将赋值到此变量</div>
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
        <div class="settings-hint">带 <span class="required">*</span> 标记的为必填项</div>
        <div class="config-field"><div class="config-field-label">名称 <span class="required">*</span></div><input class="config-input" value="${wf.name}" placeholder="输入工作流名称" /></div>
        <div class="config-field"><div class="config-field-label">编号</div><input class="config-input" value="${wf.code}" style="font-family:var(--font-family-mono);color:var(--md-outline)" readonly /><div class="config-field-help">系统自动生成，不可修改</div></div>
        <div class="config-field"><div class="config-field-label">描述</div><textarea class="config-textarea" style="min-height:50px" placeholder="描述工作流的用途和业务场景">${wf.desc || ''}</textarea></div>
        <div class="config-field"><div class="config-field-label">流程负责人 <span class="required">*</span></div>${buildPersonPickerHtml('designerOwner', wf.owners || [], true)}<div class="config-field-help">负责流程的维护和问题处理</div></div>
        <div class="config-field"><div class="config-field-label">类型</div><div class="config-readonly-value">${wf.type === 'app' ? '应用流' : '对话流'}</div><div class="config-field-help">创建后不可修改</div></div>
        <div class="config-field"><div class="config-field-label">所属空间</div><div class="config-readonly-value">${getFolderPath(wf.wsId, wf.folderId) || '根目录'}</div></div>
        <div class="config-field">
          <div class="config-field-label">允许被引用</div>
          <div style="display:flex;align-items:center;gap:10px"><label class="toggle-sm"><input type="checkbox" ${wf.allowRef ? 'checked' : ''} onchange="designerWf.allowRef=this.checked;renderDesigner()" /><span class="toggle-sm-slider"></span></label><span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">开启后可被其他空间的工作流调用</span></div>
        </div>
        ${wf.allowRef ? `
        <div class="config-field auth-spaces-field">
          <div class="config-field-label">授权空间 <span class="required">*</span></div>
          <div class="config-field-help" style="margin-bottom:6px">选择允许调用本工作流的空间，未授权的空间无法在"工作流"节点中看到本流程</div>
          <div class="auth-space-options">
            <label class="auth-space-option ${!wf.authorizedSpaces || wf.authorizedSpaces.length === 0 ? 'active' : ''}" onclick="designerWf.authorizedSpaces=[];renderDesigner()">
              <input type="radio" name="authMode" ${!wf.authorizedSpaces || wf.authorizedSpaces.length === 0 ? 'checked' : ''} style="display:none" />
              <span class="auth-space-radio"></span>
              <span>全部空间</span>
            </label>
            <label class="auth-space-option ${wf.authorizedSpaces && wf.authorizedSpaces.length > 0 ? 'active' : ''}" onclick="if(!designerWf.authorizedSpaces||designerWf.authorizedSpaces.length===0){designerWf.authorizedSpaces=[designerWsId];}renderDesigner()">
              <input type="radio" name="authMode" ${wf.authorizedSpaces && wf.authorizedSpaces.length > 0 ? 'checked' : ''} style="display:none" />
              <span class="auth-space-radio"></span>
              <span>指定空间</span>
            </label>
          </div>
          ${wf.authorizedSpaces && wf.authorizedSpaces.length > 0 ? `
            <div class="auth-space-list">
              ${workspaces.filter(ws => ws.id !== wf.wsId).map(ws => {
                const checked = wf.authorizedSpaces.includes(ws.id);
                return `<label class="auth-space-item ${checked ? 'checked' : ''}">
                  <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleAuthorizedSpace(${ws.id}, this.checked)" style="display:none" />
                  <span class="auth-space-check">${checked ? icons.check : ''}</span>
                  <span class="auth-space-name">${ws.name}</span>
                  <span class="auth-space-code">${ws.code}</span>
                </label>`;
              }).join('')}
            </div>
            <div style="font-size:10px;color:var(--md-outline);margin-top:4px">当前空间「${workspaces.find(ws => ws.id === wf.wsId)?.name || ''}」默认可用，无需勾选</div>
          ` : ''}
        </div>
        ` : ''}
      </div>

      <div class="settings-section settings-collapsible">
        <div class="settings-section-title" onclick="toggleSettingsSection(this)" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">${icons.alertTriangle} 异常处理策略 <span class="settings-toggle-icon">${icons.chevronDown || icons.arrowDown}</span></div>
        <div class="settings-section-body">
          <div class="config-field">
            <div class="config-field-label">默认异常策略 <span class="required">*</span></div>
            <select class="config-select">
              <option>终止流程</option><option>忽略并继续</option><option>重试</option><option>转人工处理</option><option>挂起等待回调</option>
            </select>
            <div class="config-field-help">当节点执行出错时的默认处理方式</div>
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <div class="config-field" style="flex:1"><div class="config-field-label">重试次数</div><input class="config-input" type="number" value="3" min="1" max="10" /></div>
            <div class="config-field" style="flex:1"><div class="config-field-label">重试间隔(秒)</div><input class="config-input" type="number" value="5" min="1" /></div>
          </div>
        </div>
      </div>

      <div class="settings-section settings-collapsible">
        <div class="settings-section-title" onclick="toggleSettingsSection(this)" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">${icons.clock} 超时配置 <span class="settings-toggle-icon">${icons.chevronDown || icons.arrowDown}</span></div>
        <div class="settings-section-body">
          <div style="display:flex;gap:var(--space-2)">
            <div class="config-field" style="flex:1"><div class="config-field-label">流程超时(分)</div><input class="config-input" type="number" value="60" /></div>
            <div class="config-field" style="flex:1"><div class="config-field-label">节点超时(秒)</div><input class="config-input" type="number" value="30" /></div>
          </div>
          <div class="config-field"><div class="config-field-label">挂起等待超时(小时)</div><input class="config-input" type="number" value="24" /></div>
        </div>
      </div>

      <div class="settings-section settings-collapsible">
        <div class="settings-section-title" onclick="toggleSettingsSection(this)" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">${icons.sync} 并发控制 <span class="settings-toggle-icon">${icons.chevronDown || icons.arrowDown}</span></div>
        <div class="settings-section-body">
          <div style="display:flex;gap:var(--space-2)">
            <div class="config-field" style="flex:1"><div class="config-field-label">最大并发数</div><input class="config-input" type="number" value="10" min="1" /></div>
            <div class="config-field" style="flex:1">
              <div class="config-field-label">排队策略</div>
              <select class="config-select"><option>排队等待</option><option>直接拒绝</option></select>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section settings-collapsible">
        <div class="settings-section-title" onclick="toggleSettingsSection(this)" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">${icons.alertTriangle} 告警配置 <span class="settings-toggle-icon">${icons.chevronDown || icons.arrowDown}</span></div>
        <div class="settings-section-body">
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
      </div>

      <div class="settings-section settings-collapsible">
        <div class="settings-section-title" onclick="toggleSettingsSection(this)" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">${icons.archive} 执行记录 <span class="settings-toggle-icon">${icons.chevronDown || icons.arrowDown}</span></div>
        <div class="settings-section-body">
          <div class="config-field"><div class="config-field-label">保留天数</div><input class="config-input" type="number" value="90" /></div>
          <div class="config-field">
            <div class="config-field-label" style="display:flex;justify-content:space-between;align-items:center">记录节点详情 <label class="toggle-sm"><input type="checkbox" checked /><span class="toggle-sm-slider"></span></label></div>
          </div>
        </div>
      </div>
    </div>`;
}

function toggleSettingsSection(titleEl) {
  const body = titleEl.nextElementSibling;
  const icon = titleEl.querySelector('.settings-toggle-icon');
  if (body) {
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.style.transform = isHidden ? '' : 'rotate(-90deg)';
  }
}

function toggleAuthorizedSpace(wsId, checked) {
  if (!designerWf) return;
  if (!designerWf.authorizedSpaces) designerWf.authorizedSpaces = [];
  if (checked) {
    if (!designerWf.authorizedSpaces.includes(wsId)) designerWf.authorizedSpaces.push(wsId);
  } else {
    designerWf.authorizedSpaces = designerWf.authorizedSpaces.filter(id => id !== wsId);
    // Ensure at least one space if in specific mode
    if (designerWf.authorizedSpaces.length === 0) designerWf.authorizedSpaces.push(designerWsId);
  }
  renderDesigner();
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

  // Close more menu if open
  if (designerMoreMenuOpen) { designerMoreMenuOpen = false; renderDesigner(); return; }

  // Space+drag = force panning (PRD: space+drag canvas pan)
  if (designerSpaceDown) {
    e.preventDefault();
    designerIsPanning = true;
    designerPanStart = { x: e.clientX - designerPanX, y: e.clientY - designerPanY };
    document.getElementById('canvasContainer').style.cursor = 'grabbing';
    return;
  }

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
  if (designerDraggingExistingNode) designerDirty = true; // Node was moved
  designerDraggingExistingNode = null;
  document.getElementById('canvasContainer').style.cursor = '';
}

function onCanvasWheel(e) {
  e.preventDefault();
  // PRD: Ctrl+滚轮缩放，普通滚轮不触发缩放
  if (!e.ctrlKey && !e.metaKey) return;
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  const newZoom = Math.max(0.25, Math.min(2, designerZoom + delta));
  designerZoom = newZoom;
  updateCanvasTransform();
  // Update zoom display
  const zoomEl = document.getElementById('canvasZoomInput');
  if (zoomEl) zoomEl.value = Math.round(designerZoom * 100) + '%';
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
  pushUndoState();
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
    config: type === 'switch' ? { branches: [{ name: '分支1', condition: '' }, { name: '分支2', condition: '' }], matchMode: 'first' } : {},
    warnings: 0,
  };

  designerNodes.push(newNode);
  designerDirty = true;
  designerSelectedNodeId = newNode.id;
  designerRightPanel = 'node';
  renderDesigner();
  showToast('success', '已添加', `${nt.name} 节点`);
}

function deleteSelectedNode() {
  if (designerDebugMode || designerReadonly) return;
  pushUndoState();
  designerDirty = true;

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

  pushUndoState();

  // Determine label for Switch branches
  const fromNode = designerNodes.find(n => n.id === fromNodeId);
  let connLabel = fromPort === 'true' ? 'TRUE' : fromPort === 'false' ? 'FALSE' : '';
  if (fromNode && fromNode.type === 'switch' && fromPort.startsWith('case') && fromPort !== 'caseDefault') {
    const caseIdx = parseInt(fromPort.replace('case', ''));
    const branches = fromNode.config?.branches || [{ name: '分支1' }, { name: '分支2' }];
    connLabel = caseIdx < branches.length ? branches[caseIdx].name : `Case ${caseIdx + 1}`;
  }
  if (fromNode && fromNode.type === 'switch' && fromPort === 'caseDefault') {
    connLabel = 'Default';
  }

  designerConnections.push({
    id: designerConnIdCounter++,
    from: fromNodeId,
    to: targetId,
    fromPort,
    toPort: 'in',
    label: connLabel,
  });
  designerDirty = true;
  renderDesigner();
  showToast('success', '连线已创建', '');
}

function onConnectionClick(e, connId) {
  e.stopPropagation();
  if (designerDebugMode) return;
  if (confirm('删除此连线？')) {
    pushUndoState();
    designerConnections = designerConnections.filter(c => c.id !== connId);
    designerDirty = true;
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
  if (node) { node[prop] = value; designerDirty = true; }
}

function updateNodeConfig(nodeId, key, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (node) { if (!node.config) node.config = {}; node.config[key] = value; designerDirty = true; }
}

// --- Switch Branch Operations ---
function addSwitchBranch(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  pushUndoState();
  if (!node.config) node.config = {};
  if (!node.config.branches) node.config.branches = [{ name: '分支1', condition: '' }, { name: '分支2', condition: '' }];
  if (node.config.branches.length >= 50) { showToast('warning', '限制', '最多支持50个分支'); return; }
  const count = node.config.branches.length + 1;
  node.config.branches.push({ name: `分支${count}`, condition: '' });
  designerDirty = true;
  syncDesignerState();
  renderDesigner();
  showToast('success', '已添加', `分支${count}`);
}

function removeSwitchBranch(nodeId, branchIdx) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.branches) return;
  if (node.config.branches.length <= 1) { showToast('warning', '提示', '至少保留一个分支'); return; }
  pushUndoState();
  const removed = node.config.branches.splice(branchIdx, 1);
  // Also remove connections from this branch port
  designerConnections = designerConnections.filter(c => !(c.from === nodeId && c.fromPort === `case${branchIdx}`));
  // Re-index connections for higher branches
  designerConnections.forEach(c => {
    if (c.from === nodeId && c.fromPort.startsWith('case')) {
      const idx = parseInt(c.fromPort.replace('case', ''));
      if (idx > branchIdx) c.fromPort = `case${idx - 1}`;
    }
  });
  designerDirty = true;
  syncDesignerState();
  renderDesigner();
  showToast('success', '已删除', removed[0]?.name || '分支');
}

function updateSwitchBranchName(nodeId, branchIdx, newName) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.branches) return;
  node.config.branches[branchIdx].name = newName;
  // Update connection labels too
  designerConnections.forEach(c => {
    if (c.from === nodeId && c.fromPort === `case${branchIdx}`) c.label = newName;
  });
  designerDirty = true;
  syncDesignerState();
  renderDesigner();
}

function updateSwitchBranchCondition(nodeId, branchIdx, newCondition) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.branches) return;
  node.config.branches[branchIdx].condition = newCondition;
  designerDirty = true;
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

// --- Undo/Redo Stack (50 steps max) ---
function _captureDesignerState() {
  return JSON.stringify({
    nodes: designerNodes.map(n => ({ ...n })),
    connections: designerConnections.map(c => ({ ...c })),
    variables: designerVariables.map(v => ({ ...v })),
  });
}

function pushUndoState() {
  const state = _captureDesignerState();
  // Don't push duplicate state
  if (designerUndoStack.length > 0 && designerUndoStack[designerUndoStack.length - 1] === state) return;
  designerUndoStack.push(state);
  if (designerUndoStack.length > 50) designerUndoStack.shift();
  // Clear redo stack on new action
  designerRedoStack = [];
}

function _restoreDesignerState(stateJson) {
  const state = JSON.parse(stateJson);
  designerNodes = state.nodes;
  designerConnections = state.connections;
  designerVariables = state.variables;
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  designerRightPanel = 'overview';
}

function designerUndo() {
  if (designerUndoStack.length === 0) {
    showToast('info', '撤销', '没有更多操作可撤销');
    return;
  }
  // Save current state to redo stack
  designerRedoStack.push(_captureDesignerState());
  // Restore previous state
  const prevState = designerUndoStack.pop();
  _restoreDesignerState(prevState);
  designerDirty = true;
  renderDesigner();
  showToast('info', '撤销', `已撤销（剩余 ${designerUndoStack.length} 步）`);
}

function designerRedo() {
  if (designerRedoStack.length === 0) {
    showToast('info', '重做', '没有更多操作可重做');
    return;
  }
  // Save current state to undo stack
  designerUndoStack.push(_captureDesignerState());
  // Restore next state
  const nextState = designerRedoStack.pop();
  _restoreDesignerState(nextState);
  designerDirty = true;
  renderDesigner();
  showToast('info', '重做', `已重做（剩余 ${designerRedoStack.length} 步）`);
}

// --- Fullscreen Toggle ---
function toggleDesignerFullscreen() {
  const shell = document.getElementById('shell');
  if (!shell) return;
  if (!designerFullscreen) {
    if (shell.requestFullscreen) shell.requestFullscreen();
    else if (shell.webkitRequestFullscreen) shell.webkitRequestFullscreen();
    designerFullscreen = true;
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    designerFullscreen = false;
  }
  renderDesigner();
}

// --- Zoom Input Handlers ---
function onZoomInputFocus(el) {
  el.value = Math.round(designerZoom * 100);
  el.select();
}

function onZoomInputBlur(el) {
  applyZoomInput(el);
}

function onZoomInputKey(e, el) {
  if (e.key === 'Enter') {
    e.preventDefault();
    applyZoomInput(el);
    el.blur();
  }
  if (e.key === 'Escape') {
    el.value = Math.round(designerZoom * 100) + '%';
    el.blur();
  }
}

function applyZoomInput(el) {
  let val = parseInt(el.value.replace('%', '').trim());
  if (isNaN(val)) val = 100;
  val = Math.max(25, Math.min(200, val));
  designerZoom = val / 100;
  updateCanvasTransform();
  el.value = Math.round(designerZoom * 100) + '%';
}

// --- More Menu ---
function toggleDesignerMoreMenu(e) {
  e && e.stopPropagation();
  designerMoreMenuOpen = !designerMoreMenuOpen;
  renderDesigner();
}

function closeDesignerMoreMenu() {
  designerMoreMenuOpen = false;
  renderDesigner();
}

function exportDesignerJSON() {
  const data = {
    nodes: designerNodes,
    connections: designerConnections,
    variables: designerVariables,
    version: designerWf?.version || 0,
    exportedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${designerWf?.name || 'workflow'}_export.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('success', '导出成功', '工作流 JSON 已下载');
}

function autoLayout() {
  pushUndoState();
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

  // Animate through nodes (guard against exited debug mode)
  _debugTimer1 = setTimeout(() => {
    if (!designerDebugMode) return;
    designerNodes.forEach(n => {
      if (n.type !== 'trigger' && n.type !== 'end') n._debugStatus = 'success';
    });
    designerDebugLog.push({ time: ts, level: 'info', message: '所有节点执行完成' });
    renderDesigner();

    _debugTimer2 = setTimeout(() => {
      if (!designerDebugMode) return;
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

// Debug timer IDs for cleanup
let _debugTimer1 = null;
let _debugTimer2 = null;

function exitDebugMode() {
  // Clear pending debug animation timers
  if (_debugTimer1) { clearTimeout(_debugTimer1); _debugTimer1 = null; }
  if (_debugTimer2) { clearTimeout(_debugTimer2); _debugTimer2 = null; }

  designerDebugMode = false;
  designerNodes.forEach(n => { n._debugStatus = null; });
  designerConnections.forEach(c => { c._debugActive = false; });
  designerBottomPanel = null;
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

  // Version conflict detection: check if someone else published since we started editing
  const baseVer = wf._baseVersion || 0;
  const currentVer = wf.version || 0;
  if (baseVer > 0 && currentVer > baseVer) {
    // Another user has published a newer version while we were editing
    _showVersionConflictDialog(baseVer, currentVer);
    return;
  }

  _showPublishForm();
}

function _showVersionConflictDialog(baseVer, currentVer) {
  const wf = designerWf;
  const lastPublish = wf.versions && wf.versions.length > 0 ? wf.versions[0] : null;
  const publisherName = lastPublish ? lastPublish.publisher : '其他用户';
  const publishTime = lastPublish ? lastPublish.publishedAt : '未知';

  showModal(`<div class="modal" style="max-width:520px"><div class="modal-header"><h2 class="modal-title" style="color:var(--md-warning)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="vertical-align:-4px;margin-right:6px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    版本冲突</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div>
    <div class="modal-body">
      <div class="conflict-info-card">
        <div class="conflict-info-row">
          <span class="conflict-label">您的编辑基于</span>
          <span class="conflict-version">v${baseVer}</span>
        </div>
        <div class="conflict-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--md-outline)" stroke-width="2" width="16" height="16"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="conflict-info-row">
          <span class="conflict-label">当前已发布版本</span>
          <span class="conflict-version current">v${currentVer}</span>
        </div>
        <div class="conflict-detail">由 <strong>${publisherName}</strong> 于 ${publishTime} 发布</div>
      </div>
      <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6;margin-top:var(--space-4)">
        在您编辑期间，其他成员已发布了新版本。请选择处理方式：
      </p>
    </div>
    <div class="modal-footer" style="flex-direction:column;gap:var(--space-2);align-items:stretch">
      <button class="btn btn-primary" onclick="closeModal();_forcePublish()" style="justify-content:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m5 12 5 5L20 7"/></svg>
        以我的版本覆盖发布
      </button>
      <button class="btn btn-secondary" onclick="closeModal();_rebaseAndPublish()" style="justify-content:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
        基于最新版本重新编辑
      </button>
      <button class="btn btn-secondary" onclick="closeModal()" style="justify-content:center;color:var(--md-outline)">取消</button>
    </div>
  </div>`);
}

function _forcePublish() {
  // User chose to override: proceed with normal publish flow
  _showPublishForm();
}

function _rebaseAndPublish() {
  // Simulate rebasing to the latest version
  const wf = designerWf;
  wf._baseVersion = wf.version || 0;
  showToast('info', '已更新基准版本', `当前编辑已基于 v${wf._baseVersion}，请检查后重新发布`);
  renderDesigner();
}

function _showPublishForm() {
  const wf = designerWf;
  const newVersion = (wf.version || 0) + 1;
  const nodeCount = designerNodes.length;
  const connCount = designerConnections.length;
  const lastSnapshot = _getDraftSnapshotInfo();
  const snapshotInfo = lastSnapshot ? `<div class="publish-snapshot-info"><span>最后保存：${lastSnapshot.savedBy} · ${lastSnapshot.savedAt}</span><span>基于 v${lastSnapshot.baseVersion}</span></div>` : '';

  showModal(`<div class="modal" style="max-width:480px"><div class="modal-header"><h2 class="modal-title">发布工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div class="publish-summary">
      <div class="publish-version-badge">v${newVersion}</div>
      <div class="publish-meta">
        <span>${wf.name}</span>
        <span class="publish-stats">${nodeCount} 个节点 / ${connCount} 条连线</span>
      </div>
    </div>
    ${snapshotInfo}
    <div class="config-field" style="margin-top:var(--space-4)"><div class="config-field-label">版本说明 <span class="required">*</span></div><textarea class="form-textarea" id="publishNote" placeholder="请描述本次发布的变更内容..." maxlength="500" style="min-height:80px;width:100%;box-sizing:border-box;resize:vertical"></textarea><div class="form-error hidden" id="publishNoteError"></div></div>
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
  // Update base version after publish
  wf._baseVersion = version;

  closeModal();
  // Exit debug mode after publishing so canvas remains editable
  if (designerDebugMode) exitDebugMode();
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
  const filteredTypes = nodeTypes.filter(nt => !nt.hidden);

  showModal(`<div class="modal" style="max-width:400px"><div class="modal-header"><h2 class="modal-title">快速添加节点</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <input type="text" class="form-input" placeholder="搜索节点类型..." oninput="filterQuickSearch(this.value)" style="margin-bottom:var(--space-3)" />
    <div id="quickSearchResults" style="max-height:300px;overflow-y:auto">
      ${filteredTypes.map(nt => `<div class="quick-search-item" data-name="${nt.name}" onclick="closeModal();addNodeToCanvas('${nt.type}', ${Math.round(dropX)}, ${Math.round(dropY)})">
        <div class="quick-search-item-icon ${nt.color}">${nt.icon}</div>
        <div><div style="font-size:var(--font-size-sm);font-weight:500">${nt.name}</div><div style="font-size:11px;color:var(--md-outline)">${nt.desc}</div></div>
      </div>`).join('')}
    </div>
  </div></div>`);
}

function filterQuickSearch(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#quickSearchResults .quick-search-item').forEach((item) => {
    const name = (item.getAttribute('data-name') || '').toLowerCase();
    item.style.display = name.includes(q) ? 'flex' : 'none';
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
let _minimapDragging = false;
let _minimapScale = 1;
let _minimapMinX = 0;
let _minimapMinY = 0;

function renderMinimap() {
  if (designerNodes.length === 0) return '';
  const minX = Math.min(...designerNodes.map(n => n.x));
  const maxX = Math.max(...designerNodes.map(n => n.x)) + 180;
  const minY = Math.min(...designerNodes.map(n => n.y));
  const maxY = Math.max(...designerNodes.map(n => n.y)) + 72;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min(160 / w, 100 / h);
  _minimapScale = scale;
  _minimapMinX = minX;
  _minimapMinY = minY;

  return `<div class="canvas-minimap" onmousedown="onMinimapMouseDown(event)">
    ${designerNodes.map(n => {
      const nx = (n.x - minX) * scale + 10;
      const ny = (n.y - minY) * scale + 10;
      return `<div class="minimap-node" style="left:${nx}px;top:${ny}px;width:${20 * scale}px;height:${8 * scale}px"></div>`;
    }).join('')}
    <div class="minimap-viewport" id="minimapViewport" style="left:${10 - designerPanX * scale / designerZoom / 10}px;top:${10 - designerPanY * scale / designerZoom / 10}px;width:60px;height:40px;cursor:grab"></div>
  </div>`;
}

function onMinimapMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  _minimapDragging = true;
  const minimapRect = e.currentTarget.getBoundingClientRect();
  onMinimapDrag(e, minimapRect);

  const onMove = (ev) => { onMinimapDrag(ev, minimapRect); };
  const onUp = () => {
    _minimapDragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function onMinimapDrag(e, minimapRect) {
  const mx = e.clientX - minimapRect.left - 10;
  const my = e.clientY - minimapRect.top - 10;
  // Convert minimap coords to canvas coords
  const canvasX = mx / _minimapScale + _minimapMinX;
  const canvasY = my / _minimapScale + _minimapMinY;
  // Center the viewport on the clicked point
  const containerEl = document.getElementById('canvasContainer');
  if (!containerEl) return;
  const cRect = containerEl.getBoundingClientRect();
  designerPanX = -(canvasX * designerZoom - cRect.width / 2);
  designerPanY = -(canvasY * designerZoom - cRect.height / 2);
  updateCanvasTransform();
}

// --- Keyboard Shortcuts ---
function setupDesignerKeys() {
  // Remove previous listeners
  document.removeEventListener('keydown', designerKeyHandler);
  document.removeEventListener('keyup', designerKeyUpHandler);
  if (designerActive) {
    document.addEventListener('keydown', designerKeyHandler);
    document.addEventListener('keyup', designerKeyUpHandler);
  }
}

function designerKeyHandler(e) {
  if (!designerActive) return;

  // F11 = fullscreen toggle (always active, even in input)
  if (e.key === 'F11') {
    e.preventDefault();
    toggleDesignerFullscreen();
    return;
  }

  // Space key for pan mode (not in input fields)
  if (e.key === ' ' && !e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    designerSpaceDown = true;
    const container = document.getElementById('canvasContainer');
    if (container) container.style.cursor = 'grab';
    return;
  }

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelectedNode();
  }
  if (e.key === 'Escape') {
    if (designerConnecting) { cancelConnection(); }
    else if (designerMoreMenuOpen) { designerMoreMenuOpen = false; renderDesigner(); }
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

function designerKeyUpHandler(e) {
  if (!designerActive) return;
  if (e.key === ' ') {
    designerSpaceDown = false;
    const container = document.getElementById('canvasContainer');
    if (container && !designerIsPanning) container.style.cursor = '';
  }
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
  designerDirty = true;
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
  designerDirty = true;
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
  designerDirty = true;
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
  const indicator = document.getElementById('designerSaveIndicator');
  if (indicator) {
    indicator.innerHTML = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> <span>保存中…</span>`;
  }
  setTimeout(() => {
    // Record draft snapshot metadata
    const wf = designerWf;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if (wf) {
      if (!wf._draftSnapshots) wf._draftSnapshots = [];
      wf._draftSnapshots.push({
        savedBy: 'Sukey Wu',
        savedAt: ts,
        baseVersion: wf._baseVersion || wf.version || 0,
        nodeCount: designerNodes.length,
        connCount: designerConnections.length
      });
    }
    const el = document.getElementById('designerSaveIndicator');
    if (el) el.innerHTML = `${icons.check} <span>Sukey Wu · ${ts.slice(11)}</span>`;
    designerDirty = false;
    showToast('success', '已保存', `草稿已保存（基于 v${wf._baseVersion || wf.version || 0}）`);
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
    designerDirty = true;
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
  pushUndoState();
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
  designerDirty = true;
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
