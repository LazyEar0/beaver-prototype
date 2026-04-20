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
let designerSelectedConnId = null; // Selected connection
let designerHoveredConnId = null; // Hovered connection
let designerBottomResizing = false; // Bottom panel resize
let designerFullscreen = false; // Fullscreen toggle
let designerSpaceDown = false; // Space key held for pan mode
let designerUndoStack = []; // Undo state stack (max 50)
let designerRedoStack = []; // Redo state stack
let designerMoreMenuOpen = false; // "More" dropdown menu state
let designerDirty = false; // Track unsaved changes
let designerVarPickerOpen = null; // Active variable picker: { editorId, position }
let designerVarPickerHighlighted = -1; // Keyboard navigation highlight index

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
  designerSelectedConnId = null;
  designerHoveredConnId = null;
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
  // Exit immersive mode if active
  const _shell = document.getElementById('designerShell');
  if (_shell) _shell.classList.remove('fullscreen');
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
    wf._designerVars = [];  // 全局变量由用户主动声明，默认为空

    // Add more nodes for published workflows (or the designated loop demo wf#8) to look realistic
    const isLoopDemo = wf.id === 8 || (wf.name && (wf.name.includes('批量') || wf.name.includes('遍历') || wf.name.includes('循环') || wf.name.includes('列表') || wf.name.includes('预警')));
    if (isLoopDemo || (wf.status === 'published' && wf.execCount > 0)) {
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
  // If workflow name/id suggests looping, generate a loop-based example
  // id=8 (库存预警通知) is the canonical loop demo workflow
  const isLoopScenario = wf.id === 8 || (wf.name && (wf.name.includes('批量') || wf.name.includes('遍历') || wf.name.includes('循环') || wf.name.includes('列表') || wf.name.includes('预警')));
  if (isLoopScenario) {
    return generateLoopExampleNodes(wf);
  }

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
  const vars = [];  // 节点I/O变量由节点自身配置定义，全局变量由用户主动声明
  return { nodes, conns, vars };
}

function generateLoopExampleNodes(wf) {
  // ──────────────────────────────────────────────────────
  //  示例场景："库存预警通知" — 遍历所有低库存房型，逐一发送飞书通知
  //
  //  流程逻辑：
  //  触发器
  //    └→ 拉取低库存房型列表（HTTP GET）
  //         └→ [循环节点] 遍历房型列表
  //                │
  //                ├─ 循环体端口（每轮执行）→ 发送飞书告警（HTTP POST）
  //                │                              ↑ 无需连出口，执行完自动进入下一轮
  //                │
  //                └─ 完成端口（全部遍历完）→ 记录汇总日志 → 结束
  // ──────────────────────────────────────────────────────
  const nodes = [
    {
      id: 1, type: 'trigger', name: '触发器', code: 'trigger_1',
      x: 80, y: 260,
      config: { triggerType: 'manual' }, warnings: 0
    },
    {
      // ① 先获取需要预警的房型列表
      id: 2, type: 'http', name: '拉取低库存房型', code: 'http_1',
      x: 300, y: 260,
      config: { method: 'GET', url: 'https://api.internal.com/rooms/low-stock' }, warnings: 0
    },
    {
      // ② 循环节点：遍历列表中的每一条房型
      //    listVar  → 上游HTTP节点返回的数组
      //    itemVar  → 循环体内用 ${roomItem} 引用当前房型
      id: 3, type: 'loop', name: '遍历预警房型', code: 'loop_1',
      x: 560, y: 260,
      config: {
        loopMode: 'forEach',
        listVar: '${http_1.data.rooms}',   // 上游列表
        itemVar: 'roomItem',               // 当前元素变量名
        indexVar: 'roomIndex',             // 当前索引变量名
        maxIterations: 500,
        allowBreak: false,
        outputVar: 'notifyResults',
        collectOutput: true
      }, warnings: 0
    },
    {
      // ③ 【循环体】每轮：对当前房型发送飞书预警消息
      //    这个节点通过"循环体"端口连接，每轮迭代执行一次
      //    执行完后无需连出口，引擎自动进入下一轮
      id: 4, type: 'http', name: '发送飞书预警', code: 'http_2',
      x: 700, y: 440,
      config: {
        method: 'POST',
        url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
        body: '{"text":"房型 ${roomItem.name} 库存仅剩 ${roomItem.stock} 间，请及时补充"}'
      }, warnings: 0
    },
    {
      // ④ 【循环完成后】汇总本次通知结果，写入日志
      //    通过"完成"端口连接，在所有房型都处理完后执行一次
      id: 5, type: 'assign', name: '记录通知汇总', code: 'assign_1',
      x: 860, y: 260,
      config: {
        assignments: [
          { target: 'summary', value: '共通知 ${loop_1.iterationCount} 个房型' }
        ]
      }, warnings: 0
    },
    {
      id: 6, type: 'end', name: '结束', code: 'end_1',
      x: 1080, y: 260,
      config: {}, warnings: 0
    },
  ];
  const conns = [
    { id: 1, from: 1, to: 2, fromPort: 'out',  toPort: 'in' },
    { id: 2, from: 2, to: 3, fromPort: 'out',  toPort: 'in' },
    // 循环体端口 → 循环体内第一个节点（每轮执行）
    { id: 3, from: 3, to: 4, fromPort: 'loop', toPort: 'in', label: '循环体（每轮）' },
    // 完成端口 → 循环全部结束后的下一步
    { id: 4, from: 3, to: 5, fromPort: 'done', toPort: 'in', label: '完成（全部结束后）' },
    { id: 5, from: 5, to: 6, fromPort: 'out',  toPort: 'in' },
    // 注意：节点4（发送飞书预警）没有出口连线 ← 这是正确的！
    // 循环体最后一个节点不需要连出口，执行完引擎自动进入下一轮
  ];
  const vars = [];  // 循环节点的迭代变量、赋值节点的目标变量均属于节点I/O，不在此声明
  return { nodes, conns, vars };
}


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
    ${designerFullscreen ? `<button class="fullscreen-exit-btn" onclick="toggleDesignerFullscreen()" title="退出全屏 (F11)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="4 14 4 20 10 20"/><polyline points="20 10 20 4 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> 退出全屏</button>` : ''}
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
        <button class="toolbar-btn ${designerBottomPanel === 'variables' ? 'active' : ''}" onclick="toggleDesignerBottom('variables')" title="查看和管理流程全局变量">
          ${icons.hash} <span>全局变量</span>
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
          <button class="canvas-control-btn" onclick="designerFitCanvas()" title="自适应画布大小">${icons.fitView}</button>
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
  // Pre-compute all loop body sets so we don't call getLoopBodyDescendants per-node repeatedly
  const loopBodyMap = new Map(); // nodeId → ownerLoopNode
  designerNodes.filter(n => n.type === 'loop').forEach(loopNode => {
    getLoopBodyDescendants(loopNode.id).forEach(nid => loopBodyMap.set(nid, loopNode));
  });

  return designerNodes.map(node => {
    const nt = nodeTypes.find(t => t.type === node.type) || {};
    const isSelected = designerSelectedNodeId === node.id || designerSelectedNodeIds.includes(node.id);
    const debugClass = designerDebugMode ? getNodeDebugClass(node) : '';
    const hasWarning = getNodeWarnings(node).length;
    const isPlaceholder = node.type === 'placeholder';
    const ownerLoop = loopBodyMap.get(node.id) || null;
    const isLoopBodyNode = !!ownerLoop;
    const inputConns = designerConnections.filter(c => c.to === node.id);
    // Don't show merge strategy badge when all inputs come from loop ports of the same loop node
    // (loop body and done never fire simultaneously, so merging makes no sense)
    const loopPortInputs = inputConns.filter(c => {
      const src = designerNodes.find(n => n.id === c.from);
      return src && src.type === 'loop' && (c.fromPort === 'loop' || c.fromPort === 'done');
    });
    const showMerge = inputConns.length > 1 && node.type !== 'end' && loopPortInputs.length < inputConns.length;
    const mergeIndicator = showMerge ? `<div class="merge-strategy-badge" onclick="event.stopPropagation();showMergeStrategyConfig(${node.id})" title="汇合策略: ${node.config?._mergeStrategy === 'any' ? '任一完成' : '等待全部'}">${node.config?._mergeStrategy === 'any' ? '任一' : '全部'}</div>` : '';

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
    } else if (node.type === 'loop') {
      // Loop node: two output ports — "loop body" (bottom) and "done" (right)
      portsHtml += `<div class="canvas-node-port port-loop" data-port="loop" data-node="${node.id}"><span class="canvas-node-port-label" style="bottom:-18px;left:50%;transform:translateX(-50%);color:#7c3aed;white-space:nowrap;font-size:10px">循环体</span></div>`;
      portsHtml += `<div class="canvas-node-port port-done" data-port="done" data-node="${node.id}"><span class="canvas-node-port-label" style="top:50%;right:-34px;transform:translateY(-50%);color:#16a34a;font-size:10px">完成</span></div>`;
    } else if (node.type !== 'end') {
      portsHtml += `<div class="canvas-node-port port-out" data-port="out" data-node="${node.id}"></div>`;
    }

    return `<div class="canvas-node ${isSelected ? 'selected' : ''} ${debugClass} ${isPlaceholder ? 'node-placeholder' : ''} ${node.type === 'loop' ? 'loop-node-style' : ''} ${isLoopBodyNode ? 'loop-body-node' : ''}" id="node-${node.id}"
      style="left:${node.x}px;top:${node.y}px"
      onmousedown="onNodeMouseDown(event, ${node.id})"
      onclick="onNodeClick(event, ${node.id})"
      oncontextmenu="onNodeContextMenu(event, ${node.id})">
      ${hasWarning > 0 ? `<div class="canvas-node-warning" title="${hasWarning} 个问题">${hasWarning}</div>` : ''}
      ${isLoopBodyNode ? `<div class="loop-body-badge" title="此节点位于循环节点「${ownerLoop.name}」的循环体内">↺</div>` : ''}
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
        ${node.type === 'trigger' ? (() => {
          const et = node.config?.enabledTypes || { manual: true, scheduled: false, event: false, webhook: false };
          const typeLabels = { manual: '手动', scheduled: '定时', event: '事件', webhook: 'Webhook' };
          const activeOnes = Object.entries(et).filter(([k2,v2]) => v2).map(([k2]) => typeLabels[k2]);
          return activeOnes.length ? '<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px">' + activeOnes.map(t2 => '<span style="font-size:9px;padding:1px 5px;border-radius:var(--radius-full);background:var(--md-primary-container);color:var(--md-on-primary-container)">' + t2 + '</span>').join('') + '</div>' : '';
        })() : ''}
        ${node.config?.condition ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(node.config.condition, 30)}</div>` : ''}
        ${node.config?.url ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(node.config.url, 30)}</div>` : ''}
        ${node.type === 'loop' ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${node.config?.loopMode === 'while' ? `While: ${truncate(node.config?.whileCondition || '未配置条件', 22)}` : `ForEach: ${truncate(node.config?.listVar || '未配置列表', 22)}`}</div>` : ''}
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
    const isSelected = designerSelectedConnId === conn.id;
    const connClass = [
      isActive ? 'connection-flow' : '',
      isSelected ? 'connection-selected' : ''
    ].filter(Boolean).join(' ');

    const strokeColor = isActive ? '#1890FF' : (isSelected ? '#1890FF' : '#222');
    const strokeWidth = isActive ? 3.5 : (isSelected ? 3.5 : 2.5);
    const markerEnd = (isActive || isSelected) ? 'url(#arrowhead-active)' : 'url(#arrowhead)';

    return `<path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" marker-end="${markerEnd}" class="${connClass}" onclick="onConnectionClick(event, ${conn.id})" oncontextmenu="onConnectionContextMenu(event, ${conn.id})" style="cursor:pointer" />
    ${isSelected ? `<path d="${path}" fill="none" stroke="rgba(24,144,255,0.15)" stroke-width="12" style="pointer-events:none" />` : ''}
    ${conn.label ? `<text x="${(fromPos.x + toPos.x) / 2}" y="${(fromPos.y + toPos.y) / 2 - 10}" text-anchor="middle" font-size="11" fill="${conn.label === 'TRUE' ? '#16a34a' : conn.label === 'FALSE' ? '#dc2626' : conn.label === 'Default' ? '#94a3b8' : conn.label === '循环体' ? '#7c3aed' : conn.label === '完成' ? '#16a34a' : '#1890FF'}" font-weight="700" font-family="Roboto, sans-serif" paint-order="stroke" stroke="#fff" stroke-width="3">${conn.label}</text>` : ''}`;
  }).join('');
}

function getPortPosition(node, port) {
  const w = 180, h = 72;
  switch (port) {
    case 'in': return { x: node.x, y: node.y + h / 2 };
    case 'out': return { x: node.x + w, y: node.y + h / 2 };
    case 'true': return { x: node.x + w * 0.35, y: node.y + h };
    case 'false': return { x: node.x + w * 0.65, y: node.y + h };
    case 'loop': return { x: node.x + w * 0.35, y: node.y + h };   // 底部偏左，循环体入口
    case 'done': return { x: node.x + w, y: node.y + h / 2 };       // 右侧中央，循环完成出口
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

  return `<div class="right-panel ${isOpen ? 'open' : ''}" id="designerRightPanel"><div class="right-panel-resize-handle" id="rightPanelResizeHandle" onmousedown="startRightPanelResize(event)"></div>${content}</div>`;
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
        ${designerVariables.length > 0 ? `
        <div class="config-section">
          <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">
            <span>全局变量</span>
            <a href="javascript:void(0)" onclick="switchBottomTab('variables');openBottomPanel()" style="font-size:var(--font-size-xs);color:var(--md-primary);text-decoration:none;font-weight:normal">管理</a>
          </div>
          ${designerVariables.map(v => `
            <div class="var-item" style="padding:4px 0">
              <span class="var-type-badge">${v.type}</span>
              <span class="var-name">${v.name}</span>
              ${v.desc ? `<span style="font-size:var(--font-size-xs);color:var(--md-outline);margin-left:6px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.desc}</span>` : ''}
            </div>
          `).join('')}
        </div>` : `
        <div style="padding:var(--space-3) 0 var(--space-1);border-top:1px solid var(--md-outline-variant)">
          <span style="font-size:var(--font-size-xs);color:var(--md-outline)">暂无全局变量 · </span><a href="javascript:void(0)" onclick="switchBottomTab('variables');openBottomPanel()" style="font-size:var(--font-size-xs);color:var(--md-primary);text-decoration:none">点击管理</a>
        </div>`}
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
    loop: { scene: '需要重复处理列表数据或轮询等待时使用，例如「批量处理订单」「遍历用户列表逐条推送」', rules: 'ForEach 模式必须指定列表变量；"循环体"端口（底部）连接循环内的节点，"完成"端口（右侧）连接循环结束后的节点；建议设置最大循环次数防止死循环；循环结果通过输出变量名引用' },
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

function parseCronToText(expr) {
  if (!expr || typeof expr !== 'string') return '';
  const parts = expr.trim().split(/\s+/);
  // Support both 5-part (min hour dom month dow) and 6-part (sec min hour dom month dow)
  let min, hour, dom, month, dow;
  if (parts.length === 6) {
    [, min, hour, dom, month, dow] = parts;
  } else if (parts.length === 5) {
    [min, hour, dom, month, dow] = parts;
  } else {
    return '无法识别的 Cron 表达式';
  }

  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  function fmtTime(h, m) {
    const hh = h === '*' ? null : parseInt(h, 10);
    const mm = m === '*' ? null : parseInt(m, 10);
    if (hh === null && mm === null) return '每分钟';
    if (hh === null) return `每小时第 ${mm} 分`;
    if (mm === null) return `${hh} 点整`;
    return `${hh} 点 ${mm} 分`;
  }

  // Every minute
  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') return '每分钟执行一次';

  // Every hour at :mm
  if (hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const mm = min === '*' ? 0 : parseInt(min, 10);
    return `每小时第 ${mm} 分执行`;
  }

  const timeStr = fmtTime(hour, min);

  // Every day
  if (dom === '*' && month === '*' && dow === '*') return `每天 ${timeStr} 执行`;

  // Day of week
  if (dom === '*' && month === '*' && dow !== '*') {
    if (/^\d$/.test(dow)) {
      const d = parseInt(dow, 10);
      return `每${weekNames[d] || ('周' + d)} ${timeStr} 执行`;
    }
    if (dow.includes(',')) {
      const days = dow.split(',').map(d => weekNames[parseInt(d, 10)] || ('周' + d)).join('、');
      return `每周${days} ${timeStr} 执行`;
    }
    if (dow.includes('-')) {
      const [s, e] = dow.split('-').map(Number);
      return `每周${weekNames[s]}至${weekNames[e]} ${timeStr} 执行`;
    }
    return `每周第 ${dow} 天 ${timeStr} 执行`;
  }

  // Day of month
  if (dom !== '*' && month === '*' && dow === '*') {
    if (/^\d+$/.test(dom)) {
      return `每月 ${parseInt(dom, 10)} 日 ${timeStr} 执行`;
    }
    if (dom.includes(',')) {
      const days = dom.split(',').map(d => parseInt(d, 10) + ' 日').join('、');
      return `每月 ${days} ${timeStr} 执行`;
    }
    return `每月第 ${dom} 天 ${timeStr} 执行`;
  }

  // Specific month + day
  if (dom !== '*' && month !== '*' && dow === '*') {
    const mNum = parseInt(month, 10);
    const dNum = parseInt(dom, 10);
    const mStr = !isNaN(mNum) ? monthNames[mNum - 1] : (month + '月');
    const dStr = !isNaN(dNum) ? (dNum + ' 日') : dom;
    return `${mStr}${dStr} ${timeStr} 执行`;
  }

  return `Cron: ${expr}`;
}

function renderTriggerConfig(node) {
  // Support multiple trigger types with Tab + independent enable switches (PRD requirement)
  const enabledTypes = node.config?.enabledTypes || { manual: true, scheduled: false, event: false, webhook: false };
  // Active tab for configuration detail display
  const activeTab = node.config?.activeTriggerTab || 'manual';
  const inputParams = node.config?.inputParams || [];

  const triggerTabs = [
    { key: 'manual', label: '手动触发', icon: '👆' },
    { key: 'scheduled', label: '定时触发', icon: '🕐' },
    { key: 'event', label: '事件触发', icon: '📡' },
    { key: 'webhook', label: 'Webhook', icon: '🔗' },
  ];

  const enabledCount = Object.values(enabledTypes).filter(Boolean).length;

  let html = `<div class="config-section">
    <div class="config-section-title">触发方式</div>
    <div class="config-field-help" style="margin-bottom:var(--space-2)">至少启用一种触发方式，可同时启用多种，任一满足即可触发工作流</div>
    ${enabledCount === 0 ? '<div style="padding:6px 10px;background:var(--md-error-container,rgba(179,38,30,0.1));border-radius:var(--radius-sm);font-size:var(--font-size-xs);color:var(--md-error);margin-bottom:var(--space-2)">⚠ 至少启用一种触发方式</div>' : ''}
    <div class="trigger-tabs">
      ${triggerTabs.map(t => {
        const isEnabled = enabledTypes[t.key];
        const isActive = activeTab === t.key;
        return `<div class="trigger-tab${isActive ? ' active' : ''}${isEnabled ? ' enabled' : ''}" onclick="updateNodeConfig(${node.id}, 'activeTriggerTab', '${t.key}'); renderDesigner()">
          <span class="trigger-tab-icon">${t.icon}</span>
          <span class="trigger-tab-label">${t.label}</span>
          <label class="trigger-tab-switch" onclick="event.stopPropagation()">
            <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleTriggerType(${node.id}, '${t.key}', this.checked)" />
            <span class="trigger-tab-switch-slider"></span>
          </label>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // Render the active tab's configuration detail
  html += `<div class="config-section">
    <div class="config-section-title">${triggerTabs.find(t => t.key === activeTab)?.icon || ''} ${triggerTabs.find(t => t.key === activeTab)?.label || ''}配置</div>`;

  if (activeTab === 'manual') {
    html += `<div class="config-field-help" style="margin-bottom:var(--space-2)">适用于需要人工手动启动的场景，如数据处理任务、报表生成、临时数据修复</div>`;
  }

  if (activeTab === 'scheduled') {
    const cronMode = node.config?.cronMode || 'simple'; // simple | advanced
    const cronVal = node.config?.cron || '0 0 * * *';
    const cronText = parseCronToText(cronVal);

    // Simple mode visual config
    const freqType = node.config?.schedFreq || 'daily'; // hourly | daily | weekly | monthly
    const schedMinute = node.config?.schedMinute ?? 0;
    const schedHour = node.config?.schedHour ?? 8;
    const schedDays = node.config?.schedDays || [1]; // Mon=1..Sun=7
    const schedMonthDay = node.config?.schedMonthDay || 1;

    html += `<div class="config-field-help" style="margin-bottom:var(--space-2)">适用于定期执行的任务，如每日凌晨同步数据、每周一发送周报、每月末执行对账</div>
    <div style="display:flex;gap:6px;margin-bottom:var(--space-2)">
      <button class="cron-preset-chip${cronMode === 'simple' ? ' active' : ''}" onclick="updateNodeConfig(${node.id}, 'cronMode', 'simple'); renderDesigner()">简单模式</button>
      <button class="cron-preset-chip${cronMode === 'advanced' ? ' active' : ''}" onclick="updateNodeConfig(${node.id}, 'cronMode', 'advanced'); renderDesigner()">高级模式</button>
    </div>`;

    if (cronMode === 'simple') {
      const weekOptions = [
        { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
        { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' }, { value: 7, label: '周日' },
      ];

      html += `<div class="config-field">
        <div class="config-field-label">频率类型</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, 'schedFreq', this.value); syncSimpleCron(${node.id})">
          <option value="hourly" ${freqType === 'hourly' ? 'selected' : ''}>每小时</option>
          <option value="daily" ${freqType === 'daily' ? 'selected' : ''}>每天</option>
          <option value="weekly" ${freqType === 'weekly' ? 'selected' : ''}>每周</option>
          <option value="monthly" ${freqType === 'monthly' ? 'selected' : ''}>每月</option>
        </select>
      </div>`;

      if (freqType === 'hourly') {
        html += `<div class="config-field">
          <div class="config-field-label">指定分钟</div>
          <input class="config-input" type="number" min="0" max="59" value="${schedMinute}" onchange="updateNodeConfig(${node.id}, 'schedMinute', parseInt(this.value)); syncSimpleCron(${node.id})" placeholder="0-59" style="width:80px" />
          <div class="config-field-help">每小时第 N 分钟执行</div>
        </div>`;
      } else {
        html += `<div class="config-field">
          <div class="config-field-label">指定时间</div>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="config-input" type="number" min="0" max="23" value="${schedHour}" onchange="updateNodeConfig(${node.id}, 'schedHour', parseInt(this.value)); syncSimpleCron(${node.id})" placeholder="时" style="width:70px" />
            <span style="color:var(--md-on-surface-variant)">:</span>
            <input class="config-input" type="number" min="0" max="59" value="${schedMinute}" onchange="updateNodeConfig(${node.id}, 'schedMinute', parseInt(this.value)); syncSimpleCron(${node.id})" placeholder="分" style="width:70px" />
          </div>
        </div>`;

        if (freqType === 'weekly') {
          html += `<div class="config-field">
            <div class="config-field-label">选择星期</div>
            <div class="sched-week-chips">
              ${weekOptions.map(d => `<span class="sched-week-chip${schedDays.includes(d.value) ? ' active' : ''}" onclick="toggleSchedDay(${node.id}, ${d.value})">${d.label}</span>`).join('')}
            </div>
          </div>`;
        }

        if (freqType === 'monthly') {
          html += `<div class="config-field">
            <div class="config-field-label">选择日期</div>
            <input class="config-input" type="number" min="1" max="31" value="${schedMonthDay}" onchange="updateNodeConfig(${node.id}, 'schedMonthDay', parseInt(this.value)); syncSimpleCron(${node.id})" placeholder="1-31" style="width:80px" />
          </div>`;
        }
      }

      // Show computed cron description
      const computedCron = node.config?.cron || '0 0 * * *';
      const computedText = parseCronToText(computedCron);
      if (computedText) {
        html += `<div class="cron-description"><span class="cron-description-icon">🕐</span><span>${computedText}</span></div>`;
      }
    } else {
      // Advanced mode: Cron expression
      const presets = [
        { label: '每小时', value: '0 * * * *' },
        { label: '每天', value: '0 0 * * *' },
        { label: '每周一', value: '0 0 * * 1' },
        { label: '每月1号', value: '0 0 1 * *' },
      ];
      html += `<div class="config-field">
        <div class="config-field-label">Cron 表达式</div>
        <input class="config-input" id="cron-input-${node.id}" value="${cronVal}" onchange="updateNodeConfig(${node.id}, 'cron', this.value); renderDesigner()" style="font-family:var(--font-family-mono)" placeholder="0 0 * * *" />
        <div class="cron-presets">
          ${presets.map(p => `<span class="cron-preset-chip${cronVal === p.value ? ' active' : ''}" onclick="updateNodeConfig(${node.id}, 'cron', '${p.value}'); renderDesigner()">${p.label}</span>`).join('')}
        </div>
        ${cronText ? `<div class="cron-description"><span class="cron-description-icon">🕐</span><span>${cronText}</span></div>` : ''}
      </div>`;
    }
  }

  if (activeTab === 'event') {
    html += `<div class="config-field-help" style="margin-bottom:var(--space-2)">适用于由外部事件触发的场景，如收到订单创建事件后启动订单处理流程</div>
      <div class="config-field">
        <div class="config-field-label">事件源标识 <span class="required">*</span></div>
        <input class="config-input" value="${escHtml(node.config?.eventSource || '')}" oninput="updateNodeConfig(${node.id}, 'eventSource', this.value)" placeholder="输入事件源标识，如 order.created" />
        <div class="config-field-help">手动填写事件源标识（MVP 阶段暂无事件源管理功能）；同一工作流内不可重复</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">事件描述</div>
        <textarea class="config-input" style="min-height:48px;resize:vertical" oninput="updateNodeConfig(${node.id}, 'eventDesc', this.value)" placeholder="对事件源的用途做简要说明，方便理解">${escHtml(node.config?.eventDesc || '')}</textarea>
      </div>
      <div class="config-field">
        <div class="config-field-label">匹配规则</div>
        <input class="config-input" value="${escHtml(node.config?.eventMatchRule || '')}" oninput="updateNodeConfig(${node.id}, 'eventMatchRule', this.value)" placeholder="事件匹配规则表达式，如 type == 'payment'" style="font-family:var(--font-family-mono)" />
        <div class="config-field-help">选填，支持表达式语法，用于过滤不需要的事件</div>
      </div>`;
  }

  if (activeTab === 'webhook') {
    const whMethod = node.config?.webhookMethod || 'POST';
    const whAuth = node.config?.webhookAuth || 'none';
    html += `<div class="config-field-help" style="margin-bottom:var(--space-2)">适用于第三方系统回调通知，如支付完成回调、外部系统集成通知、表单提交回调</div>
      <div class="config-field">
        <div class="config-field-label">Webhook URL</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input class="config-input" value="https://beaver.didatravel.com/webhook/${designerWf?.code || 'WF'}" readonly style="flex:1;background:var(--md-surface);cursor:text" />
          <button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="showToast('success','已复制','Webhook URL已复制到剪贴板')">${icons.copy}</button>
        </div>
      </div>
      <div class="config-field">
        <div class="config-field-label">URL 别名</div>
        <input class="config-input" value="${escHtml(node.config?.webhookAlias || '')}" oninput="updateNodeConfig(${node.id}, 'webhookAlias', this.value)" placeholder="如：/order-created，便于识别" />
        <div class="config-field-help">选填，自定义 URL 路径便于识别和记忆</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">请求方法</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, 'webhookMethod', this.value)">
          <option value="GET" ${whMethod === 'GET' ? 'selected' : ''}>GET</option>
          <option value="POST" ${whMethod === 'POST' ? 'selected' : ''}>POST</option>
          <option value="PUT" ${whMethod === 'PUT' ? 'selected' : ''}>PUT</option>
          <option value="DELETE" ${whMethod === 'DELETE' ? 'selected' : ''}>DELETE</option>
        </select>
      </div>
      <div class="config-field">
        <div class="config-field-label">认证方式</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, 'webhookAuth', this.value)">
          <option value="none" ${whAuth === 'none' ? 'selected' : ''}>无认证</option>
          <option value="bearer" ${whAuth === 'bearer' ? 'selected' : ''}>Bearer Token</option>
          <option value="basic" ${whAuth === 'basic' ? 'selected' : ''}>Basic Auth</option>
          <option value="hmac" ${whAuth === 'hmac' ? 'selected' : ''}>HMAC 签名</option>
        </select>
      </div>`;
  }

  html += `</div>`;

  // Input parameters section (shared across all trigger types)
  html += `<div class="config-section">
    <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">输入参数 <button class="btn btn-ghost btn-sm" style="height:24px;font-size:11px" onclick="addTriggerParam(${node.id})">${icons.plus} 添加</button></div>
    <div class="config-field-help" style="margin-bottom:var(--space-2)">定义触发流程时需要传入的参数，可在后续节点中通过 \${变量名} 引用</div>
    ${inputParams.length === 0 ? '<div style="text-align:center;padding:var(--space-3);color:var(--md-outline);font-size:var(--font-size-xs)">暂无输入参数，点击上方添加按钮</div>' :
    inputParams.map((p, i) => {
      const fieldType = p.fieldType || 'shortText';
      const fieldTypeOptions = [
        { value: 'shortText',  label: '短文本' },
        { value: 'longText',   label: '长文本' },
        { value: 'number',     label: '数字' },
        { value: 'toggle',     label: '开关' },
        { value: 'datetime',   label: '日期时间' },
        { value: 'file',       label: '文件' },
        { value: 'json',       label: 'JSON 对象' },
      ];
      const fieldTypeTypeMap = { shortText: 'String', longText: 'String', number: 'Integer', toggle: 'Boolean', datetime: 'DateTime', file: 'File', json: 'Object' };
      const inferredType = fieldTypeTypeMap[fieldType] || 'String';
      return `
      <div class="trigger-param-card">
        <div class="trigger-param-card-header">
          <div class="trigger-param-card-title">
            <span class="trigger-param-index">${i + 1}</span>
            <span class="trigger-param-label">${p.label || p.name || '未命名参数'}</span>
            <span class="trigger-param-type-badge">${inferredType}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <label class="trigger-param-required-toggle">
              <input type="checkbox" ${p.required ? 'checked' : ''} onchange="updateTriggerParamField(${node.id},${i},'required',this.checked)" style="accent-color:var(--md-primary);width:12px;height:12px">
              <span>必填</span>
            </label>
            <button class="table-action-btn danger" style="width:20px;height:20px;flex-shrink:0" onclick="removeTriggerParam(${node.id},${i})">${icons.close}</button>
          </div>
        </div>
        <div class="trigger-param-card-body">
          <div class="trigger-param-row">
            <div class="trigger-param-field">
              <label class="trigger-param-field-label">显示名称</label>
              <input class="config-input" value="${escHtml(p.label || '')}" placeholder="如：客户姓名" style="font-size:11px" oninput="updateTriggerParamField(${node.id},${i},'label',this.value)" />
            </div>
            <div class="trigger-param-field">
              <label class="trigger-param-field-label">字段类型</label>
              <select class="config-select" style="font-size:11px" onchange="updateTriggerParamField(${node.id},${i},'fieldType',this.value)">
                ${fieldTypeOptions.map(o => `<option value="${o.value}" ${fieldType === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="trigger-param-row">
            <div class="trigger-param-field">
              <label class="trigger-param-field-label">变量名 <span style="color:var(--md-error)">*</span></label>
              <input class="config-input" value="${escHtml(p.name || '')}" placeholder="如：customer_name" style="font-size:11px;font-family:var(--font-family-mono)" oninput="updateTriggerParamField(${node.id},${i},'name',this.value)" />
            </div>
            <div class="trigger-param-field">
              <label class="trigger-param-field-label">占位提示</label>
              <input class="config-input" value="${escHtml(p.placeholder || '')}" placeholder="输入框的提示文字" style="font-size:11px" oninput="updateTriggerParamField(${node.id},${i},'placeholder',this.value)" />
            </div>
          </div>
          <div class="trigger-param-row">
            <div class="trigger-param-field" style="flex:1">
              <label class="trigger-param-field-label">参数说明</label>
              <input class="config-input" value="${escHtml(p.desc || '')}" placeholder="对这个参数的用途做简要说明" style="font-size:11px" oninput="updateTriggerParamField(${node.id},${i},'desc',this.value)" />
            </div>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
  return html;
}

function toggleTriggerType(nodeId, type, enabled) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.enabledTypes) node.config.enabledTypes = { manual: true, scheduled: false, event: false, webhook: false };
  node.config.enabledTypes[type] = enabled;
  // Auto-switch active tab to the one just enabled
  if (enabled) node.config.activeTriggerTab = type;
  designerDirty = true;
  renderDesigner();
}

function syncSimpleCron(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config) return;
  const freq = node.config.schedFreq || 'daily';
  const minute = node.config.schedMinute ?? 0;
  const hour = node.config.schedHour ?? 0;
  const days = node.config.schedDays || [1];
  const monthDay = node.config.schedMonthDay || 1;

  let cron = '';
  switch (freq) {
    case 'hourly':
      cron = `${minute} * * * *`;
      break;
    case 'daily':
      cron = `${minute} ${hour} * * *`;
      break;
    case 'weekly':
      cron = `${minute} ${hour} * * ${days.sort().join(',')}`;
      break;
    case 'monthly':
      cron = `${minute} ${hour} ${monthDay} * *`;
      break;
    default:
      cron = `${minute} ${hour} * * *`;
  }
  node.config.cron = cron;
  designerDirty = true;
  renderDesigner();
}

function toggleSchedDay(nodeId, day) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config) return;
  if (!node.config.schedDays) node.config.schedDays = [1];
  const idx = node.config.schedDays.indexOf(day);
  if (idx >= 0) {
    // Don't allow removing the last day
    if (node.config.schedDays.length > 1) node.config.schedDays.splice(idx, 1);
  } else {
    node.config.schedDays.push(day);
  }
  syncSimpleCron(nodeId);
}

function addTriggerParam(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.inputParams) node.config.inputParams = [];
  const idx = node.config.inputParams.length + 1;
  node.config.inputParams.push({ name: 'param_' + idx, label: '', fieldType: 'shortText', required: false, placeholder: '', desc: '' });
  renderDesigner();
}

function updateTriggerParamField(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.inputParams?.[index]) return;
  node.config.inputParams[index][field] = value;
  // Re-render only if the header-visible fields change (label, fieldType)
  if (field === 'label' || field === 'fieldType') renderDesigner();
}

function removeTriggerParam(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.inputParams) return;
  node.config.inputParams.splice(index, 1);
  renderDesigner();
}

// Preset variable options for condition builder
/**
 * 动态生成条件节点的变量预设列表（替代原硬编码 COND_VAR_PRESETS）
 * @param {number} nodeId - 当前节点ID，用于获取上游可用变量
 */
function getCondVarPresets(nodeId) {
  const presets = [];
  const groups = getAvailableVariables(nodeId);
  groups.forEach(group => {
    // 每个分组最多取前5个变量，避免下拉过长
    group.variables.slice(0, 5).forEach(v => {
      presets.push({
        label: `${group.name.replace(/^[^\s]+\s/, '')} — ${v.name}`,
        value: v.path
      });
    });
  });
  // 末尾始终保留"自定义"选项
  presets.push({ label: '自定义...', value: '__custom__' });
  return presets;
}

// Operator options
const COND_OPS = [
  { label: '等于 (==)', value: 'eq' },
  { label: '不等于 (!=)', value: 'neq' },
  { label: '大于 (>)', value: 'gt' },
  { label: '小于 (<)', value: 'lt' },
  { label: '大于等于 (>=)', value: 'gte' },
  { label: '小于等于 (<=)', value: 'lte' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'notContains' },
  { label: '为空', value: 'isEmpty' },
  { label: '不为空', value: 'isNotEmpty' },
];

// Render visual condition rows for IF / Switch nodes
// addFnStr   : full JS call to add a condition, e.g. "addIfCondition(3)"
// removeFnPfx: function + leading args WITHOUT the condIdx arg, e.g. "removeIfCondition(3,"
//              → rendered as removeFnPfx + idx + ")"
// updateFnPfx: function + leading args WITHOUT (condIdx,field,value), e.g. "updateIfCondition(3,"
//              → rendered as updateFnPfx + idx + ",'left',this.value)"
function renderConditionRows(conditions, addFnStr, removeFnPfx, updateFnPfx, nodeId) {
  const noRightOps = ['isEmpty', 'isNotEmpty'];
  let html = '';
  conditions.forEach((cond, idx) => {
    if (idx > 0) {
      html += `<div class="condition-and-tag">AND</div>`;
    }
    const leftVal = (cond.left === '__custom__' || !cond.left) ? '' : cond.left;
    const opIsNoRight = noRightOps.includes(cond.op);
    const leftInputId = `cond_left_${nodeId}_${idx}_${Date.now()}`;

    html += `<div class="condition-visual-row">
      <!-- Row 1: variable input + ref picker -->
      <div class="cond-row-top">
        <div class="cond-right-wrap" style="flex:1">
          <input id="${leftInputId}" class="cond-left-input" value="${escHtml(leftVal)}" placeholder="输入或引用变量，如 vars.status" onchange="${updateFnPfx}${idx},'left',this.value)" style="padding-right:28px;width:100%" />
          <button class="cond-ref-btn" title="引用变量" onclick="showCondVarPicker('${leftInputId}', ${nodeId}, '${updateFnPfx}${idx}', 'left')">⊙</button>
          <div id="${leftInputId}_picker" class="var-picker-dropdown" style="display:none;position:fixed;z-index:9999;max-height:240px;overflow-y:auto;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:8px;box-shadow:var(--shadow-lg);flex-direction:column;width:280px"></div>
        </div>
        ${conditions.length > 1
          ? `<button class="cond-delete-btn" onclick="${removeFnPfx}${idx})" title="删除此条件">${icons.close}</button>`
          : ''
        }
      </div>
      <!-- Row 2: operator + value -->
      <div class="cond-row-bottom">
        <select class="cond-op-select" onchange="${updateFnPfx}${idx},'op',this.value)">
          ${COND_OPS.map(o => `<option value="${o.value}" ${(cond.op || 'eq') === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        ${opIsNoRight
          ? `<span style="flex:1;font-size:11px;color:var(--md-outline);padding:0 10px;font-style:italic">（无需填写值）</span>`
          : (() => {
              const rightInputId = `cond_right_${nodeId}_${idx}_${Date.now()}`;
              return `<div class="cond-right-wrap" style="position:relative;flex:1">
                <input id="${rightInputId}" class="cond-right-input" value="${escHtml(cond.right || '')}" placeholder="输入值或引用变量" onchange="${updateFnPfx}${idx},'right',this.value)" style="padding-right:28px;width:100%" />
                <button class="cond-ref-btn" title="从变量选择器中引用" onclick="showCondVarPicker('${rightInputId}', ${nodeId}, '${updateFnPfx}${idx}')">⊙</button>
                <div id="${rightInputId}_picker" class="var-picker-dropdown" style="display:none;position:fixed;z-index:9999;max-height:240px;overflow-y:auto;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:8px;box-shadow:var(--shadow-lg);flex-direction:column;width:280px"></div>
              </div>`;
            })()
        }
      </div>
    </div>`;
  });
  html += `<button class="cond-add-btn" onclick="${addFnStr}">${icons.plus} 添加条件</button>`;
  return html;
}

function renderIfConfig(node) {
  if (!node.config) node.config = {};
  const condMode = node.config.condMode || 'visual';
  if (!node.config.conditions || node.config.conditions.length === 0) {
    node.config.conditions = [{ left: 'response.status', op: 'eq', right: '200' }];
  }
  const conditions = node.config.conditions;
  const nid = node.id;

  return `<div class="config-section">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
      <div class="config-section-title" style="margin-bottom:0">条件配置</div>
      <div class="cond-mode-tabs">
        <button class="cond-mode-tab ${condMode === 'visual' ? 'active' : ''}" onclick="toggleIfCondMode(${nid},'visual')">可视化</button>
        <button class="cond-mode-tab ${condMode === 'expr' ? 'active' : ''}" onclick="toggleIfCondMode(${nid},'expr')">表达式</button>
      </div>
    </div>
    ${condMode === 'visual' ? `
    <div class="if-block">
      <div class="if-block-label">如果（满足以下全部条件）</div>
      ${renderConditionRows(
        conditions,
        `addIfCondition(${nid})`,
        `removeIfCondition(${nid},`,
        `updateIfCondition(${nid},`,
        nid
      )}
    </div>` : `
    <div class="config-field">
      <div class="config-field-label">条件表达式</div>
      <textarea class="expr-editor" placeholder="response.status == 200" onchange="updateNodeConfig(${nid},'condition',this.value)">${node.config?.condition || 'response.status == 200'}</textarea>
      <div style="font-size:11px;color:var(--md-outline);margin-top:4px">支持 JS 表达式，变量通过 <code style="background:var(--md-surface-container);padding:1px 4px;border-radius:3px">vars.xxx</code> 引用</div>
    </div>`}
    <div class="if-else-block">
      <div class="if-else-label">否则</div>
      <div class="if-else-desc">以上条件不满足时执行此分支</div>
    </div>
  </div>`;
}

function renderSwitchConfig(node) {
  if (!node.config) node.config = {};
  if (!node.config.branches) node.config.branches = [
    { name: '分支1', condition: '', condMode: 'visual', conditions: [{ left: 'vars.status', op: 'eq', right: '' }] },
    { name: '分支2', condition: '', condMode: 'visual', conditions: [{ left: 'vars.status', op: 'eq', right: '' }] },
  ];
  // Migrate old branches that don't have conditions yet
  node.config.branches.forEach(b => {
    if (!b.conditions) b.conditions = [{ left: b.condition ? '__custom__' : 'vars.status', op: 'eq', right: '' }];
    if (!b.condMode) b.condMode = 'visual';
  });
  const branches = node.config.branches;
  const nid = node.id;
  return `<div class="config-section">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2)">
      <div class="config-section-title" style="margin-bottom:0">分支配置 <span style="font-size:10px;color:var(--md-outline);font-weight:400">(${branches.length}/50)</span></div>
    </div>
    <div class="config-field">
      <div class="config-field-label">匹配模式</div>
      <select class="config-select" onchange="updateNodeConfig(${nid}, 'matchMode', this.value)">
        <option value="first" ${node.config.matchMode === 'first' ? 'selected' : ''}>首次匹配（命中第一个满足条件的分支）</option>
        <option value="all" ${node.config.matchMode === 'all' ? 'selected' : ''}>全部匹配（所有满足条件的分支都执行）</option>
      </select>
    </div>
    ${branches.map((b, i) => {
      const condMode = b.condMode || 'visual';
      const conditions = b.conditions || [{ left: 'vars.status', op: 'eq', right: '' }];
      const branchColor = `hsl(${i * 60}, 55%, 48%)`;
      return `
      <div class="branch-card" style="border-left-color:${branchColor}">
        <div class="branch-card-header">
          <input class="config-input" style="flex:1;height:28px;font-size:12px;font-weight:500" value="${escHtml(b.name)}" onchange="updateSwitchBranchName(${nid}, ${i}, this.value)" placeholder="分支名称" />
          <div class="cond-mode-tabs" style="margin-left:4px">
            <button class="cond-mode-tab ${condMode === 'visual' ? 'active' : ''}" onclick="toggleSwitchCondMode(${nid},${i},'visual')" title="可视化配置">可视化</button>
            <button class="cond-mode-tab ${condMode === 'expr' ? 'active' : ''}" onclick="toggleSwitchCondMode(${nid},${i},'expr')" title="表达式编辑">表达式</button>
          </div>
          <button class="table-action-btn" style="width:24px;height:24px;flex-shrink:0" onclick="removeSwitchBranch(${nid}, ${i})" title="删除分支">${icons.close}</button>
        </div>
        ${condMode === 'visual'
          ? renderConditionRows(
              conditions,
              `addSwitchCondition(${nid},${i})`,
              `removeSwitchCondition(${nid},${i},`,
              `updateSwitchCondition(${nid},${i},`,
              nid
            )
          : `<textarea class="expr-editor" style="min-height:36px;font-size:11px" placeholder="输入分支条件表达式..." onchange="updateSwitchBranchCondition(${nid}, ${i}, this.value)">${escHtml(b.condition || '')}</textarea>`
        }
      </div>`;
    }).join('')}
    <button class="btn btn-ghost btn-sm" onclick="addSwitchBranch(${nid})" style="width:100%;justify-content:center;margin-top:var(--space-2)">${icons.plus} 添加分支</button>
    <div style="margin-top:var(--space-3);padding:8px 10px;background:var(--md-surface-container);border-radius:6px;border-left:3px solid #94a3b8">
      <div style="font-size:11px;font-weight:700;color:var(--md-outline);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Default</div>
      <div style="font-size:11px;color:var(--md-on-surface-variant)">以上所有分支均不匹配时执行（兜底）</div>
    </div>
  </div>`;
}

function renderHttpConfig(node) {
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  const outputVarsSection = renderOutputVariablesSection(node);
  
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
      ${renderExprEditor({
        id: `http_url_${node.id}`,
        value: node.config?.url || '',
        placeholder: 'https://api.example.com/endpoint 或 {{input.apiUrl}}',
        nodeId: node.id,
        singleLine: true,
        label: '请求 URL',
        onChange: `updateNodeConfig(${node.id}, 'url', this.value)`
      })}
    </div>
    <div class="config-field">
      <div class="config-field-label">请求头</div>
      ${renderExprEditor({
        id: `http_headers_${node.id}`,
        value: node.config?.headers || '',
        placeholder: '{"Content-Type": "application/json", "Authorization": "{{input.token}}"}',
        nodeId: node.id,
        minHeight: 50,
        label: '请求头',
        hint: 'JSON 格式，支持 {{变量}} 引用',
        onChange: `updateNodeConfig(${node.id}, 'headers', this.value)`
      })}
    </div>
    <div class="config-field">
      <div class="config-field-label">请求体</div>
      ${renderExprEditor({
        id: `http_body_${node.id}`,
        value: node.config?.body || '',
        placeholder: '{"key": "value", "userId": "{{input.userId}}"}',
        nodeId: node.id,
        minHeight: 60,
        label: '请求体',
        hint: 'JSON 格式，支持 {{变量}} 引用',
        onChange: `updateNodeConfig(${node.id}, 'body', this.value)`
      })}
    </div>
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
}

function renderCodeConfig(node) {
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  const outputVarsSection = renderOutputVariablesSection(node);
  
  return `<div class="config-section">
    <div class="config-section-title">代码配置</div>
    <div class="config-field">
      <div class="config-field-label">脚本语言</div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'language', this.value)">
        <option ${node.config?.language === 'JavaScript' ? 'selected' : ''}>JavaScript</option>
        <option ${node.config?.language === 'Python' ? 'selected' : ''}>Python</option>
      </select>
    </div>
    <div class="config-field">
      <div class="config-field-label">代码</div>
      ${renderExprEditor({
        id: `code_script_${node.id}`,
        value: node.config?.script || '// 处理逻辑\nconst result = input;\nreturn result;',
        placeholder: '// 在此编写代码，输入 {{ 可快速插入变量',
        nodeId: node.id,
        minHeight: 120,
        label: '代码',
        hint: '使用 return 返回结果，返回值将作为 result 输出变量',
        onChange: `updateNodeConfig(${node.id}, 'script', this.value)`
      })}
      <div class="config-field-help">使用 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">return</code> 返回结果，返回值将作为 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">result</code> 输出变量</div>
    </div>
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
}

function renderDelayConfig(node) {
  const delayMode = node.config?.delayMode || '固定时长';
  const isFixed = delayMode === '固定时长';

  const fixedDurationField = `<div class="config-field">
      <div class="config-field-label">延迟时长</div>
      <div style="display:flex;gap:6px"><input class="config-input" type="number" value="${node.config?.delayValue || 5}" style="flex:1" onchange="updateNodeConfig(${node.id}, 'delayValue', this.value)" /><select class="config-select" style="width:80px" onchange="updateNodeConfig(${node.id}, 'delayUnit', this.value)"><option${(!node.config?.delayUnit || node.config.delayUnit === '秒') ? ' selected' : ''}>秒</option><option${(node.config?.delayUnit === '分钟') ? ' selected' : ''}>分钟</option><option${(node.config?.delayUnit === '小时') ? ' selected' : ''}>小时</option><option${(node.config?.delayUnit === '天') ? ' selected' : ''}>天</option></select></div>
      <div class="config-field-help">范围：1 秒 ~ 30 天，需输入正整数</div>
    </div>`;

  const targetTimeMode = node.config?.targetTimeMode || 'fixed';
  const isTargetFixed = targetTimeMode === 'fixed';

  const targetTimeField = `<div class="config-field">
      <div class="config-field-label">目标时间</div>
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <button class="cron-preset-chip${isTargetFixed ? ' active' : ''}" onclick="updateNodeConfig(${node.id}, 'targetTimeMode', 'fixed'); renderDesigner()">固定值</button>
        <button class="cron-preset-chip${!isTargetFixed ? ' active' : ''}" onclick="updateNodeConfig(${node.id}, 'targetTimeMode', 'variable'); renderDesigner()">变量</button>
      </div>
      ${isTargetFixed
        ? `<input class="config-input" type="datetime-local" value="${node.config?.delayTarget || ''}" onchange="updateNodeConfig(${node.id}, 'delayTarget', this.value)" />`
        : renderExprEditor({
            id: `delay_target_${node.id}`,
            value: node.config?.delayTarget || '',
            placeholder: '点击 T 按钮选择变量',
            nodeId: node.id,
            singleLine: true,
            label: '目标时间',
            hint: '目标时间必须大于当前时间，最大未来 30 天内',
            onChange: `updateNodeConfig(${node.id}, 'delayTarget', this.value)`
          })
      }
      <div class="config-field-help">目标时间必须大于当前时间，最大未来 30 天内</div>
    </div>`;

  return `<div class="config-section">
    <div class="config-section-title">延迟配置</div>
    <div class="config-field">
      <div class="config-field-label">延迟方式</div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'delayMode', this.value); renderDesigner()"><option${isFixed ? ' selected' : ''}>固定时长</option><option${!isFixed ? ' selected' : ''}>到指定时间</option></select>
    </div>
    ${isFixed ? fixedDurationField : targetTimeField}
  </div>`;
}

function renderAssignConfig(node) {
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  const outputVarsSection = renderOutputVariablesSection(node);
  const assignments = node.config?.assignments || [{ target: 'processedData', source: '' }];
  
  return `<div class="config-section">
    <div class="config-section-title">赋值规则</div>
    ${assignments.map((a, i) => `
    <div class="condition-row" style="flex-direction:column;gap:6px;align-items:stretch;margin-bottom:var(--space-2)">
      <div style="display:flex;gap:6px;align-items:center">
        <input class="config-input" placeholder="目标变量" value="${a.target}" style="flex:1;font-family:var(--font-family-mono)" onchange="updateAssignment(${node.id}, ${i}, 'target', this.value); renderDesigner()" />
        <span class="condition-op">=</span>
        ${renderExprEditor({
          id: `assign_src_${node.id}_${i}`,
          value: a.source,
          placeholder: '{{节点.输出变量}}',
          nodeId: node.id,
          singleLine: true,
          onChange: `updateAssignment(${node.id}, ${i}, 'source', this.value)`
        })}
      </div>
    </div>`).join('')}
    <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:var(--space-2)" onclick="addAssignment(${node.id})">${icons.plus} 添加赋值规则</button>
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
}

function updateAssignment(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.assignments) node.config.assignments = [{ target: 'processedData', source: '' }];
  if (node.config.assignments[index]) {
    node.config.assignments[index][field] = value;
  }
  designerDirty = true;
}

function addAssignment(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.assignments) node.config.assignments = [];
  node.config.assignments.push({ target: 'newVar', source: '' });
  designerDirty = true;
  renderDesigner();
}

function renderOutputConfig(node) {
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  return `<div class="config-section">
    <div class="config-section-title">输出配置</div>
    <div class="config-field">
      <div class="config-field-label">输出级别</div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'level', this.value)">
        <option ${node.config?.level === 'INFO' ? 'selected' : ''}>INFO</option>
        <option ${node.config?.level === 'WARNING' ? 'selected' : ''}>WARNING</option>
        <option ${node.config?.level === 'ERROR' ? 'selected' : ''}>ERROR</option>
      </select>
    </div>
    <div class="config-field">
      <div class="config-field-label">输出内容</div>
      ${renderExprEditor({
        id: `output_content_${node.id}`,
        value: node.config?.content || '',
        placeholder: '输出内容或 {{变量名}}',
        nodeId: node.id,
        minHeight: 60,
        onChange: `updateNodeConfig(${node.id}, 'content', this.value)`
      })}
    </div>
    ${upstreamPreview}
  </div>`;
}

function renderLoopConfig(node) {
  const mode = node.config?.loopMode || 'forEach';

  // Detect current loop body connection status
  const loopBodyConn = designerConnections.find(c => c.from === node.id && c.fromPort === 'loop');
  const doneConn = designerConnections.find(c => c.from === node.id && c.fromPort === 'done');
  const loopBodyNode = loopBodyConn ? designerNodes.find(n => n.id === loopBodyConn.to) : null;
  const doneNode = doneConn ? designerNodes.find(n => n.id === doneConn.to) : null;

  const loopBodyStatus = loopBodyNode
    ? `<span style="color:#7c3aed;font-weight:600">已连接 → ${loopBodyNode.name}</span>`
    : `<span style="color:var(--md-error)">未连接 — 从底部端口拖线到循环体第一个节点</span>`;
  const doneStatus = doneNode
    ? `<span style="color:#16a34a;font-weight:600">已连接 → ${doneNode.name}</span>`
    : `<span style="color:var(--md-outline)">未连接 — 从右侧端口拖线到循环完成后的节点</span>`;

  return `
  <div class="config-section loop-guide-card" style="background:linear-gradient(135deg,#f5f3ff 0%,#fafafa 100%);border:1px solid #ddd6fe;border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:0">
    <div style="font-size:var(--font-size-xs);font-weight:700;color:#7c3aed;margin-bottom:8px;letter-spacing:0.3px">循环体配置指引</div>
    <div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);line-height:2">
      <div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:4px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#7c3aed;color:#fff;border-radius:50%;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">1</span>
        <span>配置循环参数（遍历列表 / 循环条件）</span>
      </div>
      <div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:4px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#7c3aed;color:#fff;border-radius:50%;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">2</span>
        <span>在画布上添加循环体内的节点（如 HTTP、赋值等）</span>
      </div>
      <div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:4px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#7c3aed;color:#fff;border-radius:50%;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">3</span>
        <span>从循环节点<strong>底部紫色端口</strong>拖线到循环体第一个节点</span>
      </div>
      <div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:4px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#7c3aed;color:#fff;border-radius:50%;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">4</span>
        <span>循环体内节点依次连线，<strong>最后一个节点无需连出口</strong>（自动返回下次迭代）</span>
      </div>
      <div style="display:flex;gap:6px;align-items:flex-start">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#16a34a;color:#fff;border-radius:50%;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">5</span>
        <span>从循环节点<strong>右侧绿色端口</strong>拖线到循环完成后的节点</span>
      </div>
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #ddd6fe;font-size:var(--font-size-xs);display:flex;flex-direction:column;gap:4px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ede9fe;border:2px solid #7c3aed;flex-shrink:0"></span>
        <span style="color:var(--md-on-surface-variant)">循环体：${loopBodyStatus}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#dcfce7;border:2px solid #16a34a;flex-shrink:0"></span>
        <span style="color:var(--md-on-surface-variant)">完成后：${doneStatus}</span>
      </div>
    </div>
  </div>
  <div class="config-section">
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
        <div class="config-field-help">每次循环中，当前元素会被赋值到此变量，循环体内节点可直接引用</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">索引变量名</div>
        <input class="config-input" value="${node.config?.indexVar || 'index'}" style="font-family:var(--font-family-mono)" onchange="updateNodeConfig(${node.id}, 'indexVar', this.value)" />
      </div>
    ` : `
      <div class="config-field">
        <div class="config-field-label">循环条件 <span class="required">*</span></div>
        <textarea class="expr-editor" style="min-height:40px" placeholder="retryCount < 3 && !success" onchange="updateNodeConfig(${node.id}, 'whileCondition', this.value)">${node.config?.whileCondition || ''}</textarea>
        <div class="config-field-help">条件为 true 时继续执行循环体；每次循环体执行完毕后重新判断</div>
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
  </div>
  <div class="config-section">
    <div class="config-section-title">输出结果收集</div>
    <div class="config-field">
      <div class="config-field-label">输出变量名</div>
      <input class="config-input" value="${node.config?.outputVar || 'loopResult'}" style="font-family:var(--font-family-mono)" onchange="updateNodeConfig(${node.id}, 'outputVar', this.value)" placeholder="loopResult" />
      <div class="config-field-help">每次循环的输出将被收集到此数组变量中，循环完成后可在"完成"出口的后续节点中引用 <code style="font-size:10px;font-family:var(--font-family-mono);background:var(--md-surface-container);padding:0 3px;border-radius:2px">\${${node.config?.outputVar || 'loopResult'}}</code></div>
    </div>
    <div class="config-field">
      <div style="display:flex;align-items:center;gap:10px">
        <label class="toggle-sm"><input type="checkbox" ${node.config?.collectOutput !== false ? 'checked' : ''} onchange="updateNodeConfig(${node.id}, 'collectOutput', this.checked)" /><span class="toggle-sm-slider"></span></label>
        <span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">启用结果收集（关闭则循环体输出不汇总）</span>
      </div>
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
          ${icons.hash} 全局变量 <span class="bottom-panel-tab-badge" style="background:var(--md-primary-container);color:var(--md-primary)">${vars.length}</span>
        </div>
      </div>
      <div class="bottom-panel-actions">
        ${designerBottomTab === 'variables' ? `<button class="toolbar-btn" style="height:24px;font-size:11px" onclick="showAddVariableDialog()">${icons.plus} 新增全局变量</button>` : ''}
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
  if (vars.length === 0) {
    return `<div style="text-align:center;padding:var(--space-8) var(--space-6);color:var(--md-outline)">
      <div style="font-size:32px;margin-bottom:var(--space-3)">📦</div>
      <div style="font-size:var(--font-size-sm);font-weight:500;color:var(--md-on-surface-variant);margin-bottom:var(--space-2)">暂无全局变量</div>
      <div style="font-size:var(--font-size-xs);line-height:1.6">全局变量独立于节点存在，用于在多个节点间共享状态，<br>如流程开关、计数器、临时标记等。</div>
    </div>`;
  }
  return vars.map(v => `
    <div class="var-item">
      <span class="var-type-badge">${v.type}</span>
      <span class="var-name">${v.name}</span>
      ${v.defaultValue ? `<span style="font-size:var(--font-size-xs);color:var(--md-outline);font-family:var(--font-family-mono);margin-left:4px">= ${v.defaultValue}</span>` : ''}
      ${v.desc ? `<span style="font-size:var(--font-size-xs);color:var(--md-outline);margin-left:8px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.desc}</span>` : '<span style="flex:1"></span>'}
      <button class="table-action-btn" style="width:24px;height:24px;margin-left:auto;flex-shrink:0" onclick="showToast('info','编辑变量','${v.name}')">${icons.edit}</button>
      <button class="table-action-btn danger" style="width:24px;height:24px;flex-shrink:0" onclick="showDeleteVarConfirm('${v.name}')">${icons.trash}</button>
    </div>
  `).join('');
}

// --- Loop Body Scope Utility ---
// Returns the set of node IDs that belong to the "loop body" of a given loop node.
// The loop body is defined as all nodes reachable through the 'loop' port (and their
// successors via normal 'out'/'true'/'false'/etc. ports), stopping before any node that
// is also reachable from the loop node's 'done' port (i.e. the main-flow continuation).
function getLoopBodyDescendants(loopNodeId) {
  const bodySet = new Set();
  const visited = new Set();
  // BFS/DFS from the node directly connected via the 'loop' port
  const loopConn = designerConnections.find(c => c.from === loopNodeId && c.fromPort === 'loop');
  if (!loopConn) return bodySet;

  const stack = [loopConn.to];
  while (stack.length > 0) {
    const nid = stack.pop();
    if (visited.has(nid)) continue;
    visited.add(nid);
    bodySet.add(nid);
    // Follow all outgoing connections EXCEPT connections that go back to the loop node itself
    designerConnections
      .filter(c => c.from === nid && c.to !== loopNodeId)
      .forEach(c => { if (!visited.has(c.to)) stack.push(c.to); });
  }
  return bodySet;
}

// Returns the loop node that "owns" a given node (i.e. the node is inside its loop body).
// Returns null if the node is not inside any loop body.
function getOwnerLoopNode(nodeId) {
  return designerNodes.find(loopNode => {
    if (loopNode.type !== 'loop') return false;
    const body = getLoopBodyDescendants(loopNode.id);
    return body.has(nodeId);
  }) || null;
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
      // For loop nodes, check specific ports instead of generic "has any out"
      if (node.type === 'loop') {
        if (!hasIn) problems.push({ level: 'error', message: `节点「${node.name}」没有输入连线`, location: node.code, nodeId: node.id });
        const hasLoopOut = designerConnections.some(c => c.from === node.id && c.fromPort === 'loop');
        const hasDoneOut = designerConnections.some(c => c.from === node.id && c.fromPort === 'done');
        if (!hasLoopOut) problems.push({ level: 'error', message: `循环节点「${node.name}」未连接循环体（"循环体"端口无连线）`, location: node.code, nodeId: node.id });
        if (!hasDoneOut) problems.push({ level: 'warning', message: `循环节点「${node.name}」没有"完成"出口连线，循环结束后流程无法继续`, location: node.code, nodeId: node.id });
        // Detect confusion: loop body and done connecting to the same downstream node
        if (hasLoopOut && hasDoneOut) {
          const loopTarget = designerConnections.find(c => c.from === node.id && c.fromPort === 'loop')?.to;
          const doneTarget = designerConnections.find(c => c.from === node.id && c.fromPort === 'done')?.to;
          if (loopTarget && doneTarget && loopTarget === doneTarget) {
            problems.push({ level: 'warning', message: `循环节点「${node.name}」的"循环体"和"完成"出口连向了同一节点，这通常是错误的连线——循环体是每次迭代的入口，完成是所有迭代结束后的出口`, location: node.code, nodeId: node.id });
          }
        }
        // Validate required config
        if ((!node.config?.loopMode || node.config.loopMode === 'forEach') && !node.config?.listVar) {
          problems.push({ level: 'error', message: `循环节点「${node.name}」未配置遍历列表变量`, location: node.code, nodeId: node.id });
        }
        if (node.config?.loopMode === 'while' && !node.config?.whileCondition) {
          problems.push({ level: 'error', message: `循环节点「${node.name}」未配置 While 条件`, location: node.code, nodeId: node.id });
        }
      } else {
        const hasOut = designerConnections.some(c => c.from === node.id);
        if (!hasIn) problems.push({ level: 'error', message: `节点「${node.name}」没有输入连线`, location: node.code, nodeId: node.id });
        // Suppress "no output" warning for nodes that are the tail of a loop body —
        // loop body tail nodes intentionally have no outgoing connection; the engine
        // automatically advances to the next iteration.
        const isLoopBodyTail = !hasOut && (() => {
          const owner = getOwnerLoopNode(node.id);
          return owner != null;
        })();
        if (!hasOut && !isLoopBodyTail) {
          problems.push({ level: 'warning', message: `节点「${node.name}」没有输出连线`, location: node.code, nodeId: node.id });
        }
        // Detect loop body boundary escape: a node inside a loop body connects to a node outside
        if (hasOut) {
          const owner = getOwnerLoopNode(node.id);
          if (owner) {
            const bodySet = getLoopBodyDescendants(owner.id);
            designerConnections
              .filter(c => c.from === node.id)
              .forEach(c => {
                if (!bodySet.has(c.to) && c.to !== owner.id) {
                  const targetNode = designerNodes.find(n => n.id === c.to);
                  problems.push({
                    level: 'warning',
                    message: `节点「${node.name}」从循环体内连线到循环体外的「${targetNode?.name || c.to}」，会导致每次迭代提前结束流程。如需循环结束后继续，应使用循环节点的"完成"端口`,
                    location: node.code,
                    nodeId: node.id,
                  });
                }
              });
          }
        }
      }
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
  designerSelectedConnId = null;
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
  designerSelectedConnId = null; // Deselect connection when clicking a node
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

  // Resolve fromNode early — needed for all checks below
  const fromNode = designerNodes.find(n => n.id === fromNodeId);

  // Check for duplicate
  if (designerConnections.some(c => c.from === fromNodeId && c.to === targetId)) {
    showToast('warning', '提示', '该连线已存在'); return;
  }
  // For loop nodes: each output port (loop / done) can only have one outgoing connection
  if (fromNode && fromNode.type === 'loop' && (fromPort === 'loop' || fromPort === 'done')) {
    if (designerConnections.some(c => c.from === fromNodeId && c.fromPort === fromPort)) {
      const portName = fromPort === 'loop' ? '循环体' : '完成';
      showToast('warning', '提示', `"${portName}"端口已连接，请先删除原有连线再重新连接`); return;
    }
  }
  // Cycle detection — skip for loop body port (it's a deliberate forward branch, not a true cycle)
  if (fromPort !== 'loop' && detectCycle(fromNodeId, targetId)) {
    showToast('error', '检测到环', '该连线会形成循环依赖，不允许创建'); return;
  }

  // Loop body boundary check:
  // If the source node is inside a loop body AND the target node is outside that loop body,
  // warn the user — this typically means the loop body is "escaping" to the main flow,
  // which would cause the workflow to terminate prematurely on each iteration.
  const ownerLoop = getOwnerLoopNode(fromNodeId);
  if (ownerLoop) {
    const bodySet = getLoopBodyDescendants(ownerLoop.id);
    const targetInBody = bodySet.has(targetId);
    const targetIsLoopNode = targetId === ownerLoop.id;
    if (!targetInBody && !targetIsLoopNode) {
      const targetNode = designerNodes.find(n => n.id === targetId);
      const targetName = targetNode ? `「${targetNode.name}」` : '';
      const confirmed = confirm(
        `⚠️ 跨越循环边界的连线\n\n` +
        `节点「${fromNode.name}」位于循环节点「${ownerLoop.name}」的循环体内，` +
        `而目标节点${targetName}位于循环体外（主流程中）。\n\n` +
        `这会导致每次迭代执行到此节点时直接跳出循环，流程提前结束，通常是错误连线。\n\n` +
        `如需在循环结束后继续流程，请使用循环节点的"完成"端口连接后续节点。\n\n` +
        `确认仍要创建此连线吗？`
      );
      if (!confirmed) return;
    }
  }

  pushUndoState();

  // Determine label for Switch / Loop branches
  let connLabel = fromPort === 'true' ? 'TRUE' : fromPort === 'false' ? 'FALSE' : '';
  if (fromNode && fromNode.type === 'switch' && fromPort.startsWith('case') && fromPort !== 'caseDefault') {
    const caseIdx = parseInt(fromPort.replace('case', ''));
    const branches = fromNode.config?.branches || [{ name: '分支1' }, { name: '分支2' }];
    connLabel = caseIdx < branches.length ? branches[caseIdx].name : `Case ${caseIdx + 1}`;
  }
  if (fromNode && fromNode.type === 'switch' && fromPort === 'caseDefault') {
    connLabel = 'Default';
  }
  // Determine label for Loop ports
  if (fromNode && fromNode.type === 'loop' && fromPort === 'loop') {
    connLabel = '循环体';
  }
  if (fromNode && fromNode.type === 'loop' && fromPort === 'done') {
    connLabel = '完成';
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
  // Select the connection instead of immediately deleting
  designerSelectedConnId = connId;
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  designerContextMenu = null;
  renderDesigner();
}

function onConnectionContextMenu(e, connId) {
  e.preventDefault();
  e.stopPropagation();
  if (designerDebugMode || designerReadonly) return;
  designerSelectedConnId = connId;
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  const shell = document.getElementById('designerShell');
  const rect = shell.getBoundingClientRect();
  designerContextMenu = { x: e.clientX - rect.left, y: e.clientY - rect.top, connId };
  renderDesigner();
}

function deleteSelectedConnection() {
  if (!designerSelectedConnId) return;
  const conn = designerConnections.find(c => c.id === designerSelectedConnId);
  if (!conn) return;
  const fromNode = designerNodes.find(n => n.id === conn.from);
  const toNode = designerNodes.find(n => n.id === conn.to);
  const desc = (fromNode ? fromNode.name : '?') + ' → ' + (toNode ? toNode.name : '?');
  if (!confirm(`删除连线「${desc}」？`)) return;
  pushUndoState();
  designerConnections = designerConnections.filter(c => c.id !== designerSelectedConnId);
  designerSelectedConnId = null;
  designerDirty = true;
  syncDesignerState();
  renderDesigner();
  showToast('success', '连线已删除', '');
}

function reconnectConnectionFrom(connId) {
  const conn = designerConnections.find(c => c.id === connId);
  if (!conn) return;
  // Start a new connection from the original target's input, keeping the same destination
  // Actually: remove the connection, start connecting from the same source port
  const fromNode = designerNodes.find(n => n.id === conn.from);
  if (!fromNode) return;
  pushUndoState();
  designerConnections = designerConnections.filter(c => c.id !== connId);
  designerSelectedConnId = null;
  designerConnecting = { fromNodeId: conn.from, fromPort: conn.fromPort || 'out' };
  designerDirty = true;
  syncDesignerState();
  renderDesigner();
  showToast('info', '重连起点', '请点击目标节点的输入端口');
}

function reconnectConnectionTo(connId) {
  const conn = designerConnections.find(c => c.id === connId);
  if (!conn) return;
  const toNode = designerNodes.find(n => n.id === conn.to);
  if (!toNode) return;
  pushUndoState();
  designerConnections = designerConnections.filter(c => c.id !== connId);
  designerSelectedConnId = null;
  // Start connecting from the same source port to a new target
  designerConnecting = { fromNodeId: conn.from, fromPort: conn.fromPort || 'out' };
  designerDirty = true;
  syncDesignerState();
  renderDesigner();
  showToast('info', '重连终点', '请点击目标节点的输入端口');
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
  if (!node.config.branches) node.config.branches = [
    { name: '分支1', condition: '', condMode: 'visual', conditions: [{ left: 'vars.status', op: 'eq', right: '' }] },
    { name: '分支2', condition: '', condMode: 'visual', conditions: [{ left: 'vars.status', op: 'eq', right: '' }] },
  ];
  if (node.config.branches.length >= 50) { showToast('warning', '限制', '最多支持50个分支'); return; }
  const count = node.config.branches.length + 1;
  node.config.branches.push({ name: `分支${count}`, condition: '', condMode: 'visual', conditions: [{ left: 'vars.status', op: 'eq', right: '' }] });
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

// --- IF node condition operations ---
function toggleIfCondMode(nodeId, mode) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  node.config.condMode = mode;
  designerDirty = true;
  renderDesigner();
}

function addIfCondition(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.conditions) node.config.conditions = [];
  node.config.conditions.push({ left: 'vars.status', op: 'eq', right: '' });
  designerDirty = true;
  renderDesigner();
}

function removeIfCondition(nodeId, condIdx) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.conditions) return;
  if (node.config.conditions.length <= 1) return;
  node.config.conditions.splice(condIdx, 1);
  designerDirty = true;
  renderDesigner();
}

function updateIfCondition(nodeId, condIdx, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.conditions) return;
  if (!node.config.conditions[condIdx]) return;
  node.config.conditions[condIdx][field] = value;
  designerDirty = true;
  // Re-render when op changes (hides/shows right input) or left changes (preset vs custom switch)
  if (field === 'op' || field === 'left') renderDesigner();
}

// --- Switch node per-branch condition operations ---
function toggleSwitchCondMode(nodeId, branchIdx, mode) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.branches) return;
  node.config.branches[branchIdx].condMode = mode;
  designerDirty = true;
  renderDesigner();
}

function addSwitchCondition(nodeId, branchIdx) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.branches) return;
  const branch = node.config.branches[branchIdx];
  if (!branch) return;
  if (!branch.conditions) branch.conditions = [];
  branch.conditions.push({ left: 'vars.status', op: 'eq', right: '' });
  designerDirty = true;
  renderDesigner();
}

function removeSwitchCondition(nodeId, branchIdx, condIdx) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.branches) return;
  const branch = node.config.branches[branchIdx];
  if (!branch || !branch.conditions) return;
  if (branch.conditions.length <= 1) return;
  branch.conditions.splice(condIdx, 1);
  designerDirty = true;
  renderDesigner();
}

function updateSwitchCondition(nodeId, branchIdx, condIdx, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config || !node.config.branches) return;
  const branch = node.config.branches[branchIdx];
  if (!branch || !branch.conditions || !branch.conditions[condIdx]) return;
  branch.conditions[condIdx][field] = value;
  designerDirty = true;
  if (field === 'op' || field === 'left') renderDesigner();
}

// --- Right Panel Resize ---
let _rpResizing = false;
let _rpStartX = 0;
let _rpStartWidth = 360;

function startRightPanelResize(e) {
  e.preventDefault();
  const panel = document.getElementById('designerRightPanel');
  if (!panel) return;
  _rpResizing = true;
  _rpStartX = e.clientX;
  _rpStartWidth = panel.offsetWidth;
  const handle = document.getElementById('rightPanelResizeHandle');
  if (handle) handle.classList.add('dragging');
  document.addEventListener('mousemove', _onRpResizeMove);
  document.addEventListener('mouseup', _onRpResizeUp);
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
}

function _onRpResizeMove(e) {
  if (!_rpResizing) return;
  const panel = document.getElementById('designerRightPanel');
  if (!panel) return;
  const dx = _rpStartX - e.clientX; // dragging left = wider
  const newWidth = Math.min(720, Math.max(280, _rpStartWidth + dx));
  panel.style.width = newWidth + 'px';
  panel.style.transition = 'none';
}

function _onRpResizeUp() {
  _rpResizing = false;
  const handle = document.getElementById('rightPanelResizeHandle');
  if (handle) handle.classList.remove('dragging');
  document.removeEventListener('mousemove', _onRpResizeMove);
  document.removeEventListener('mouseup', _onRpResizeUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  // Restore transition
  const panel = document.getElementById('designerRightPanel');
  if (panel) panel.style.transition = '';
}


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

function openBottomPanel() {
  designerBottomPanel = designerBottomTab;
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
  const shell = document.getElementById('designerShell');
  if (!shell) return;
  designerFullscreen = !designerFullscreen;
  shell.classList.toggle('fullscreen', designerFullscreen);
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
function renderVarDefaultWidget(type) {
  const label = `<div class="config-field-label">初始值 <span style="color:var(--md-outline);font-weight:400">（可选）</span></div>`;
  switch (type) {
    case 'Integer':
      return `${label}<input class="config-input" id="newVarDefault" type="number" step="1" placeholder="整数，如 0" />`;
    case 'Double':
      return `${label}<input class="config-input" id="newVarDefault" type="number" step="any" placeholder="小数，如 0.0" />`;
    case 'Boolean':
      return `${label}<select class="config-select" id="newVarDefault"><option value="">— 不设置 —</option><option value="true">true</option><option value="false">false</option></select>`;
    case 'DateTime':
      return `${label}<input class="config-input" id="newVarDefault" type="datetime-local" />`;
    case 'Object':
      return `${label}<textarea class="config-input" id="newVarDefault" rows="3" placeholder='JSON 对象，如 {"key":"value"}' style="font-family:var(--font-family-mono);resize:vertical"></textarea>`;
    case 'File':
      return `${label}<div style="font-size:var(--font-size-xs);color:var(--md-outline);padding:6px 0">File 类型无初始值</div><input type="hidden" id="newVarDefault" value="" />`;
    default: // String
      return `${label}<input class="config-input" id="newVarDefault" type="text" placeholder="字符串，如 hello" />`;
  }
}

function updateVarDefaultWidget() {
  const type = document.getElementById('newVarType').value;
  const container = document.getElementById('varDefaultContainer');
  if (container) container.innerHTML = renderVarDefaultWidget(type);
}

function showAddVariableDialog() {
  showModal(`<div class="modal" style="max-width:420px"><div class="modal-header"><h2 class="modal-title">新增全局变量</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div style="font-size:var(--font-size-xs);color:var(--md-outline);margin-bottom:var(--space-3);line-height:1.5">全局变量独立于节点存在，可在任意节点中读写，适用于跨节点共享状态、计数器、开关等场景。</div>
    <div class="config-field"><div class="config-field-label">变量名 <span class="required">*</span></div><input class="config-input" id="newVarName" placeholder="英文标识符，如 retryCount" style="font-family:var(--font-family-mono)" /></div>
    <div class="config-field"><div class="config-field-label">数据类型</div><select class="config-select" id="newVarType" onchange="updateVarDefaultWidget()"><option>String</option><option>Integer</option><option>Double</option><option>Boolean</option><option>DateTime</option><option>Object</option><option>File</option></select></div>
    <div class="config-field" id="varDefaultContainer">${renderVarDefaultWidget('String')}</div>
    <div class="config-field"><div class="config-field-label">描述</div><input class="config-input" id="newVarDesc" placeholder="变量用途描述" /></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="addVariable()">添加</button></div></div>`);
}

function addVariable() {
  const name = document.getElementById('newVarName').value.trim();
  const type = document.getElementById('newVarType').value;
  const defaultValue = document.getElementById('newVarDefault').value.trim();
  const desc = document.getElementById('newVarDesc').value.trim();

  if (!name) { showToast('warning', '提示', '请输入变量名'); return; }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) { showToast('warning', '提示', '变量名只能包含英文字母、数字和下划线，且不能以数字开头'); return; }
  if (designerVariables.some(v => v.name === name)) { showToast('warning', '提示', '变量名已存在'); return; }

  designerVariables.push({ name, type, defaultValue, desc });
  syncDesignerState();
  closeModal();
  renderDesigner();
  showToast('success', '添加成功', `全局变量「${name}」已添加`);
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
    if (designerSelectedConnId) deleteSelectedConnection();
    else deleteSelectedNode();
  }
  if (e.key === 'Escape') {
    if (designerConnecting) { cancelConnection(); }
    else if (designerMoreMenuOpen) { designerMoreMenuOpen = false; renderDesigner(); }
    else if (designerContextMenu) { designerContextMenu = null; renderDesigner(); }
    else if (designerSelectedConnId) { designerSelectedConnId = null; renderDesigner(); }
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

  // Connection context menu (right-click on a connection)
  if (m.connId) {
    const conn = designerConnections.find(c => c.id === m.connId);
    if (!conn) return '';
    const fromNode = designerNodes.find(n => n.id === conn.from);
    const toNode = designerNodes.find(n => n.id === conn.to);
    const fromName = fromNode ? fromNode.name : '未知';
    const toName = toNode ? toNode.name : '未知';
    return `<div class="designer-context-menu" style="left:${m.x}px;top:${m.y}px" onclick="event.stopPropagation()">
    <div class="context-menu-item context-menu-info">${icons.workflow || '🔗'} ${fromName} → ${toName}</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" onclick="reconnectConnectionFrom(${m.connId});closeContextMenu()">🔄 重连起点</div>
    <div class="context-menu-item" onclick="reconnectConnectionTo(${m.connId});closeContextMenu()">🔄 重连终点</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" onclick="deleteSelectedConnection();closeContextMenu()">${icons.trash} 删除连线 <span class="context-menu-shortcut">Delete</span></div>
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

// ============================================
// Variable Picker (变量选择器)
// ============================================

/**
 * 获取当前节点可引用的所有变量
 * @param {number} currentNodeId - 当前节点ID
 * @returns {Array} 分组后的变量列表
 */
function getAvailableVariables(currentNodeId) {
  const groups = [];

  // 1. 触发器节点输入参数（流程入口参数，独立展示）
  const triggerNode = designerNodes.find(n => n.type === 'trigger');
  if (triggerNode && triggerNode.config?.inputParams?.length > 0) {
    groups.push({
      id: 'trigger_input',
      name: '⚡ 触发器输入',
      source: 'trigger',
      variables: triggerNode.config.inputParams.map(p => ({
        name: p.key || p.label,
        type: p.fieldType || 'String',
        desc: p.label || '',
        path: `${triggerNode.code}.${p.key || p.label}`,
        ref: `{{${triggerNode.code}.${p.key || p.label}}}`
      }))
    });
  }

  // 2. 上游节点输出（跳过触发器，触发器已单独展示）
  const upstreamNodes = getUpstreamNodes(currentNodeId).filter(n => n.type !== 'trigger');
  upstreamNodes.forEach(node => {
    const nodeType = nodeTypes.find(t => t.type === node.type);
    const outputs = getNodeOutputs(node);
    if (outputs.length > 0) {
      groups.push({
        id: `node_${node.id}`,
        name: `${nodeType?.icon || '📦'} ${node.name}`,
        source: 'node',
        nodeId: node.id,
        nodeType: node.type,
        variables: outputs.map(o => ({
          name: o.name,
          type: o.type,
          desc: o.desc,
          path: `${node.code}.${o.name}`,
          ref: `{{${node.code}.${o.name}}}`
        }))
      });
    }
  });

  // 3. 流程全局变量（用户主动声明的跨节点共享变量）
  if (designerVariables.length > 0) {
    groups.push({
      id: 'global_vars',
      name: '📦 全局变量',
      source: 'global',
      variables: designerVariables.map(v => ({
        name: v.name,
        type: v.type,
        desc: v.desc || (v.defaultValue ? `初始值: ${v.defaultValue}` : ''),
        path: `vars.${v.name}`,
        ref: `{{vars.${v.name}}}`
      }))
    });
  }

  // 4. 数据源数据项（当前空间已授权的数据源）
  // dataSources 来自 app.js 全局作用域，按空间授权过滤
  if (typeof dataSources !== 'undefined') {
    // 筛选：isPublic 或已授权给当前空间的数据源
    const currentWs = designerWsId;
    const availableDs = dataSources.filter(ds =>
      ds.isPublic ||
      !ds.authorizedSpaces || ds.authorizedSpaces.length === 0 ||
      ds.authorizedSpaces.includes(currentWs)
    );
    availableDs.forEach(ds => {
      if (ds.items && ds.items.length > 0) {
        groups.push({
          id: `ds_${ds.id}`,
          name: `🗂️ ${ds.name}`,
          source: 'datasource',
          dsId: ds.id,
          variables: ds.items.map(item => ({
            name: item.key,
            type: item.type || 'String',
            desc: item.value ? `值: ${item.value}` : '',
            path: `ds.${ds.name}.${item.key}`,
            ref: `{{ds.${ds.name}.${item.key}}}`
          }))
        });
      }
    });
  }

  return groups;
}

/**
 * 获取节点的上游节点列表（按执行顺序）
 */
function getUpstreamNodes(nodeId) {
  const visited = new Set();
  const result = [];
  
  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);
    
    // 找到所有连接到此节点的上游节点
    const incomingConns = designerConnections.filter(c => c.to === id);
    incomingConns.forEach(conn => {
      const sourceNode = designerNodes.find(n => n.id === conn.from);
      if (sourceNode) {
        traverse(conn.from);
        result.push(sourceNode);
      }
    });
  }
  
  traverse(nodeId);
  return result;
}

/**
 * 获取节点的输出变量定义
 * @param {object} node - 节点对象
 * @param {boolean} forPicker - 是否用于变量选择器（生成引用路径）
 */
function getNodeOutputs(node, forPicker = false) {
  const outputs = [];
  const nodeCode = node.code;
  
  switch (node.type) {
    case 'trigger':
      // 触发器的输入参数作为输出
      if (node.config?.inputParams) {
        node.config.inputParams.forEach(p => {
          outputs.push({
            name: p.key || p.label,
            type: p.fieldType || 'String',
            desc: p.label,
            editable: false
          });
        });
      }
      outputs.push({ name: 'triggerTime', type: 'String', desc: '触发时间', editable: false });
      break;
      
    case 'http': {
      const varPrefix = node.config?.responseVar || 'response';
      outputs.push({ 
        name: varPrefix, 
        type: 'Object', 
        desc: 'HTTP响应对象',
        editable: true,
        configField: 'responseVar'
      });
      outputs.push({ 
        name: `${varPrefix}.status`, 
        type: 'Number', 
        desc: 'HTTP状态码',
        editable: false
      });
      outputs.push({ 
        name: `${varPrefix}.data`, 
        type: 'Object', 
        desc: '响应数据体',
        editable: false
      });
      outputs.push({ 
        name: `${varPrefix}.headers`, 
        type: 'Object', 
        desc: '响应头',
        editable: false
      });
      break;
    }
      
    case 'code':
      outputs.push({ 
        name: 'result', 
        type: 'Object', 
        desc: '代码 return 返回的结果',
        editable: false
      });
      break;
      
    case 'assign': {
      const assignments = node.config?.assignments || [{ target: 'processedData', source: '' }];
      assignments.forEach(a => {
        if (a.target) {
          outputs.push({ 
            name: a.target, 
            type: 'Object', 
            desc: '赋值结果',
            editable: true,
            configField: 'assignments'
          });
        }
      });
      break;
    }
      
    case 'loop': {
      const itemVar = node.config?.itemVar || 'item';
      const indexVar = node.config?.indexVar || 'index';
      const outputVar = node.config?.outputVar || 'loopResult';
      
      outputs.push({ 
        name: itemVar, 
        type: 'Object', 
        desc: '当前迭代元素（循环体内可用）',
        editable: true,
        configField: 'itemVar'
      });
      outputs.push({ 
        name: indexVar, 
        type: 'Number', 
        desc: '当前迭代索引（循环体内可用）',
        editable: true,
        configField: 'indexVar'
      });
      outputs.push({ 
        name: outputVar, 
        type: 'Array', 
        desc: '收集的循环结果（循环完成后可用）',
        editable: true,
        configField: 'outputVar'
      });
      break;
    }
      
    case 'workflow': {
      const outputVar = node.config?.outputVar || 'wfResult';
      outputs.push({ 
        name: outputVar, 
        type: 'Object', 
        desc: '被调用工作流的返回结果',
        editable: true,
        configField: 'outputVar'
      });
      break;
    }
      
    case 'mq': {
      const msgVar = node.config?.messageVar || 'message';
      outputs.push({ 
        name: msgVar, 
        type: 'Object', 
        desc: '消费的消息内容',
        editable: true,
        configField: 'messageVar'
      });
      break;
    }
      
    default:
      outputs.push({ name: 'output', type: 'Object', desc: '节点输出', editable: false });
  }
  
  return outputs;
}

/**
 * 渲染节点输出变量区域
 * @param {object} node - 节点对象
 */
function renderOutputVariablesSection(node) {
  const outputs = getNodeOutputs(node);
  if (outputs.length === 0) return '';
  
  const nodeCode = node.code;
  
  // 分离可编辑和固定输出
  const editableOutputs = outputs.filter(o => o.editable);
  const fixedOutputs = outputs.filter(o => !o.editable);
  
  // 检查是否有嵌套子变量（如 response.status）
  const hasChildren = outputs.some(o => o.isChild);
  const parentOutputs = outputs.filter(o => !o.isChild);
  const childOutputs = outputs.filter(o => o.isChild);
  
  return `
    <div class="config-section output-vars-section">
      <div class="config-section-title" style="color:#16a34a;display:flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        输出变量
        <span style="font-size:10px;font-weight:400;color:var(--md-outline);margin-left:auto">下游节点可引用</span>
      </div>
      
      ${editableOutputs.length > 0 ? `
        <div class="output-vars-editable">
          ${editableOutputs.map(o => `
            <div class="output-var-edit-row">
              <div class="output-var-edit-main">
                <span class="var-icon type-${o.type}" title="${o.type}">${o.type.charAt(0)}</span>
                <input 
                  class="output-var-input" 
                  value="${o.name}" 
                  placeholder="变量名" 
                  style="flex:1;font-family:var(--font-family-mono)" 
                  onchange="updateNodeConfig(${node.id}, '${o.configField}', this.value); renderDesigner()"
                />
                <code class="var-ref-tag">{{${nodeCode}.${o.name}}}</code>
              </div>
              <div class="output-var-desc">${o.desc}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${fixedOutputs.length > 0 ? `
        <div class="output-vars-fixed">
          ${fixedOutputs.map(o => `
            <div class="output-var-item" onclick="copyOutputVarPath('${nodeCode}', '${o.name}')" title="点击复制引用路径">
              <span class="var-icon type-${o.type}" title="${o.type}">${o.type.charAt(0)}</span>
              <div class="output-var-info">
                <div class="output-var-name">${o.name}</div>
                <div class="output-var-desc-inline">${o.desc}</div>
              </div>
              <code class="var-ref-tag">{{${nodeCode}.${o.name}}}</code>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="output-vars-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        点击变量行或引用路径可复制，下游节点通过此路径引用输出值
      </div>
    </div>
  `;
}

/**
 * 复制输出变量路径到剪贴板
 */
function copyOutputVarPath(nodeCode, varName) {
  const path = `{{${nodeCode}.${varName}}}`;
  navigator.clipboard.writeText(path).then(() => {
    showToast('success', '已复制', `变量路径 ${path} 已复制到剪贴板`);
  }).catch(() => {
    showToast('error', '复制失败', '请手动复制');
  });
}

/**
 * 渲染带变量选择器的表达式编辑器
 * @param {object} options - 配置选项
 */
function renderExprEditor(options) {
  const {
    id,
    value = '',
    placeholder = '',
    nodeId,
    minHeight = 60,
    onChange = '',
    singleLine = false,
    label = '',       // 字段名，用于展开弹窗标题
    hint = '',        // 展开弹窗内的提示文字
    expandable = true // 是否显示展开按钮，代码/表达式场景默认 true
  } = options;
  
  const editorId = `expr_${id}_${Date.now()}`;
  const tag = singleLine ? 'input' : 'textarea';
  const inputAttrs = singleLine 
    ? `type="text" style="height:32px;padding-right:${expandable ? 60 : 36}px"` 
    : `style="min-height:${minHeight}px;padding-right:${expandable ? 60 : 36}px"`;
  
  const expandBtn = expandable ? `
    <button class="expr-expand-btn" 
      onclick="openExprExpandModal('${editorId}', ${nodeId}, ${JSON.stringify(label || id)}, ${JSON.stringify(hint || placeholder)})"
      title="展开编辑">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
      </svg>
    </button>` : '';

  return `
    <div class="expr-editor-wrapper${expandable ? ' has-expand' : ''}" data-editor-id="${editorId}">
      <${tag} 
        id="${editorId}"
        class="expr-editor" 
        ${inputAttrs}
        placeholder="${escHtml(placeholder)}"
        onchange="${onChange}"
        oninput="handleExprInput(event, '${editorId}', ${nodeId})"
        onkeydown="handleExprKeydown(event, '${editorId}', ${nodeId})"
        onfocus="handleExprFocus(event, '${editorId}', ${nodeId})"
        onblur="handleExprBlur(event, '${editorId}')"
      >${singleLine ? '' : escHtml(value)}</${tag}>
      ${expandBtn}
      <button class="var-picker-trigger" onclick="toggleVarPicker('${editorId}', ${nodeId}, event)" title="插入变量">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
        </svg>
      </button>
      <div id="${editorId}_picker" class="var-picker-popup" style="display:none"></div>
    </div>
  `;
}

/**
 * 处理表达式编辑器输入
 */
function handleExprInput(event, editorId, nodeId) {
  const editor = event.target;
  const value = editor.value;
  const cursorPos = editor.selectionStart;
  
  // 检测是否输入了 {{ 触发变量选择器
  const beforeCursor = value.substring(Math.max(0, cursorPos - 2), cursorPos);
  if (beforeCursor === '{{') {
    showVarPicker(editorId, nodeId);
  }
}

/**
 * 处理键盘导航
 */
function handleExprKeydown(event, editorId, nodeId) {
  if (!designerVarPickerOpen || designerVarPickerOpen.editorId !== editorId) return;
  
  const picker = document.getElementById(editorId + '_picker');
  if (!picker) return;
  
  const items = picker.querySelectorAll('.var-picker-item');
  const itemCount = items.length;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      designerVarPickerHighlighted = Math.min(designerVarPickerHighlighted + 1, itemCount - 1);
      updateVarPickerHighlight(items);
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      designerVarPickerHighlighted = Math.max(designerVarPickerHighlighted - 1, 0);
      updateVarPickerHighlight(items);
      break;
      
    case 'Enter':
      event.preventDefault();
      if (designerVarPickerHighlighted >= 0 && items[designerVarPickerHighlighted]) {
        selectVariable(editorId, items[designerVarPickerHighlighted].dataset.ref);
      }
      break;
      
    case 'Escape':
      hideVarPicker(editorId);
      break;
  }
}

/**
 * 更新变量选择器高亮
 */
function updateVarPickerHighlight(items) {
  items.forEach((item, idx) => {
    item.classList.toggle('highlighted', idx === designerVarPickerHighlighted);
  });
  
  // 滚动到可见区域
  if (items[designerVarPickerHighlighted]) {
    items[designerVarPickerHighlighted].scrollIntoView({ block: 'nearest' });
  }
}

/**
 * 处理表达式编辑器聚焦
 */
function handleExprFocus(event, editorId, nodeId) {
  // 可选：聚焦时自动显示变量选择器
}

/**
 * 处理表达式编辑器失焦
 */
function handleExprBlur(event, editorId) {
  // 延迟隐藏，以便点击变量选择器中的项
  setTimeout(() => {
    if (designerVarPickerOpen && designerVarPickerOpen.editorId === editorId) {
      hideVarPicker(editorId);
    }
  }, 200);
}

/**
 * 切换变量选择器显示状态
 */
function toggleVarPicker(editorId, nodeId, event) {
  if (event) event.stopPropagation();
  
  const picker = document.getElementById(editorId + '_picker');
  if (!picker) return;
  
  if (picker.style.display === 'none') {
    showVarPicker(editorId, nodeId);
  } else {
    hideVarPicker(editorId);
  }
}

/**
 * 显示变量选择器
 */
function showVarPicker(editorId, nodeId) {
  const picker = document.getElementById(editorId + '_picker');
  const editor = document.getElementById(editorId);
  if (!picker || !editor) return;
  
  designerVarPickerOpen = { editorId, nodeId };
  designerVarPickerHighlighted = -1;
  
  const groups = getAvailableVariables(nodeId);
  
  picker.innerHTML = `
    <div class="var-picker-search">
      <input type="text" placeholder="搜索变量..." oninput="filterVarPicker('${editorId}', this.value)">
    </div>
    <div class="var-picker-body" id="${editorId}_picker_body">
      ${renderVarPickerGroups(groups, editorId)}
    </div>
  `;
  
  picker.style.display = 'flex';
  
  // 聚焦搜索框
  setTimeout(() => {
    const searchInput = picker.querySelector('.var-picker-search input');
    if (searchInput) searchInput.focus();
  }, 50);
}

/**
 * 渲染变量分组
 */
function renderVarPickerGroups(groups, editorId) {
  if (groups.length === 0) {
    return '<div class="var-picker-empty">暂无可用变量</div>';
  }

  // 来源标签配置
  const sourceBadgeMap = {
    trigger:    { label: '触发器', cls: 'source-trigger' },
    node:       { label: '上游节点', cls: 'source-node' },
    global:     { label: '全局变量', cls: 'source-global' },
    datasource: { label: '数据源', cls: 'source-datasource' },
  };

  return groups.map(group => {
    const badge = sourceBadgeMap[group.source];
    const badgeHtml = badge
      ? `<span class="var-picker-source-badge ${badge.cls}">${badge.label}</span>`
      : '';
    return `
    <div class="var-picker-group" data-group="${group.id}" data-source="${group.source || ''}">
      <div class="var-picker-group-header">
        <span>${group.name}</span>
        ${badgeHtml}
      </div>
      ${group.variables.map(v => `
        <div class="var-picker-item" 
             data-ref="${v.ref}" 
             data-path="${v.path}"
             onclick="selectVariable('${editorId}', '${v.ref}')">
          <div class="var-icon type-${v.type}" title="${v.type}">${v.type.charAt(0)}</div>
          <div class="var-info">
            <div class="var-name">${v.name}</div>
            <div class="var-path">${v.path}</div>
            ${v.desc ? `<div class="var-desc">${v.desc}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `}).join('');
}

/**
 * 过滤变量选择器
 */
function filterVarPicker(editorId, keyword) {
  const body = document.getElementById(editorId + '_picker_body');
  if (!body) return;
  
  const groups = body.querySelectorAll('.var-picker-group');
  const lowerKeyword = keyword.toLowerCase();
  
  groups.forEach(group => {
    const items = group.querySelectorAll('.var-picker-item');
    let hasVisible = false;
    
    items.forEach(item => {
      const name = item.querySelector('.var-name')?.textContent || '';
      const path = item.dataset.path || '';
      const desc = item.querySelector('.var-desc')?.textContent || '';
      
      const visible = !keyword || 
        name.toLowerCase().includes(lowerKeyword) ||
        path.toLowerCase().includes(lowerKeyword) ||
        desc.toLowerCase().includes(lowerKeyword);
      
      item.style.display = visible ? '' : 'none';
      if (visible) hasVisible = true;
    });
    
    group.style.display = hasVisible ? '' : 'none';
  });
}

/**
 * 选择变量并插入到编辑器
 */
function selectVariable(editorId, ref) {
  const editor = document.getElementById(editorId);
  if (!editor) return;
  
  const value = editor.value;
  const cursorPos = editor.selectionStart;
  
  // 检查光标前是否有 {{ ，如果有则替换
  const beforeCursor = value.substring(Math.max(0, cursorPos - 2), cursorPos);
  let newValue, newPos;
  
  if (beforeCursor === '{{') {
    // 替换 {{ 为完整的变量引用
    const before = value.substring(0, cursorPos - 2);
    const after = value.substring(cursorPos);
    newValue = before + ref + after;
    newPos = before.length + ref.length;
  } else {
    // 在光标位置插入
    const before = value.substring(0, cursorPos);
    const after = value.substring(cursorPos);
    newValue = before + ref + after;
    newPos = cursorPos + ref.length;
  }
  
  editor.value = newValue;
  editor.selectionStart = editor.selectionEnd = newPos;
  editor.focus();
  
  // 触发 change 事件
  editor.dispatchEvent(new Event('change', { bubbles: true }));
  
  hideVarPicker(editorId);
}

/**
 * 条件行左值（变量对象）的变量选择器
 * 选中后直接写入路径并触发 update 回调（无论当前是 select 还是 input 模式）
 */
function showCondLeftVarPicker(leftInputId, nodeId, updateFnPfx) {
  const picker = document.getElementById(leftInputId + '_picker');
  const btn = document.getElementById(leftInputId + '_btn');
  const anchorEl = btn || document.getElementById(leftInputId);
  if (!picker || !anchorEl) return;

  if (picker.style.display === 'flex') {
    picker.style.display = 'none';
    return;
  }

  const rect = anchorEl.getBoundingClientRect();
  const pickerH = 240;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  picker.style.left = rect.left + 'px';
  picker.style.width = '280px';

  if (spaceBelow >= pickerH || spaceBelow >= spaceAbove) {
    picker.style.top = (rect.bottom + 4) + 'px';
    picker.style.bottom = '';
  } else {
    picker.style.top = '';
    picker.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
  }

  const groups = getAvailableVariables(nodeId);
  picker.innerHTML = `
    <div style="padding:8px;border-bottom:1px solid var(--md-outline-variant)">
      <input type="text" placeholder="搜索变量..." style="width:100%;padding:4px 8px;border:1px solid var(--md-outline-variant);border-radius:4px;font-size:12px;background:var(--md-surface)" oninput="filterCondVarPicker('${leftInputId}', this.value)">
    </div>
    <div id="${leftInputId}_picker_body" style="overflow-y:auto;max-height:200px">
      ${groups.length === 0
        ? '<div style="padding:16px;text-align:center;font-size:12px;color:var(--md-outline)">暂无可用变量</div>'
        : groups.map(group => `
          <div class="cond-var-group" data-group="${group.id}">
            <div style="padding:6px 10px 2px;font-size:10px;font-weight:600;color:var(--md-outline);text-transform:uppercase;letter-spacing:0.05em">${group.name}</div>
            ${group.variables.map(v => `
              <div class="cond-var-item" data-ref="${v.ref}" data-path="${v.path}" data-name="${v.name}"
                   style="padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:12px"
                   onmouseenter="this.style.background='var(--md-surface-container)'"
                   onmouseleave="this.style.background=''"
                   onclick="selectCondLeftVar('${leftInputId}', '${escHtml(v.path)}', '${updateFnPfx}')">
                <span style="font-size:10px;font-weight:600;padding:1px 4px;border-radius:3px;background:var(--md-primary-container);color:var(--md-on-primary-container);flex-shrink:0">${(v.type||'?').charAt(0)}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:500;color:var(--md-on-surface)">${v.name}</div>
                  <div style="font-size:10px;color:var(--md-outline);font-family:var(--font-family-mono)">${v.path}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
    </div>
  `;
  picker.style.display = 'flex';
  picker.style.flexDirection = 'column';

  const closeOnOutside = (e) => {
    if (!picker.contains(e.target)) {
      picker.style.display = 'none';
      document.removeEventListener('mousedown', closeOnOutside, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeOnOutside, true), 0);
}

/**
 * 左值选择：路径写入后触发 update 回调（path 是不带 {{}} 的路径）
 */
function selectCondLeftVar(leftInputId, path, updateFnPfx) {
  // updateFnPfx 形如 "updateIfCondition(3,0," 
  // 拼成完整调用：updateIfCondition(3, 0, 'left', 'vars.amount')
  const fn = new Function(`${updateFnPfx}'left',${JSON.stringify(path)})`);
  try { fn(); } catch(e) { console.warn('selectCondLeftVar callback failed', e); }
  const picker = document.getElementById(leftInputId + '_picker');
  if (picker) picker.style.display = 'none';
}


/**
 * 条件行右值的变量选择器（选中后直接替换 input 值，而非光标插入）
 * @param {string} inputId - 目标 input 的 id
 * @param {number} nodeId  - 当前节点 id，用于获取可用变量
 * @param {string} updateFnPfx - 更新回调前缀，选中后自动触发持久化
 */
function showCondVarPicker(inputId, nodeId, updateFnPfx) {
  const picker = document.getElementById(inputId + '_picker');
  const input = document.getElementById(inputId);
  if (!picker || !input) return;

  // 若已打开则关闭
  if (picker.style.display === 'flex') {
    picker.style.display = 'none';
    return;
  }

  // 计算 input 的屏幕坐标，决定弹出方向
  const rect = input.getBoundingClientRect();
  const pickerH = 240;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  picker.style.left = rect.left + 'px';
  picker.style.width = Math.max(rect.width, 280) + 'px';

  if (spaceBelow >= pickerH || spaceBelow >= spaceAbove) {
    // 向下弹出
    picker.style.top = (rect.bottom + 4) + 'px';
    picker.style.bottom = '';
  } else {
    // 向上弹出
    picker.style.top = '';
    picker.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
  }

  const groups = getAvailableVariables(nodeId);
  picker.innerHTML = `
    <div class="var-picker-search" style="padding:8px;border-bottom:1px solid var(--md-outline-variant)">
      <input type="text" placeholder="搜索变量..." style="width:100%;padding:4px 8px;border:1px solid var(--md-outline-variant);border-radius:4px;font-size:12px;background:var(--md-surface)" oninput="filterCondVarPicker('${inputId}', this.value)">
    </div>
    <div id="${inputId}_picker_body" style="overflow-y:auto;max-height:200px">
      ${groups.length === 0
        ? '<div style="padding:16px;text-align:center;font-size:12px;color:var(--md-outline)">暂无可用变量</div>'
        : groups.map(group => `
          <div class="cond-var-group" data-group="${group.id}">
            <div style="padding:6px 10px 2px;font-size:10px;font-weight:600;color:var(--md-outline);text-transform:uppercase;letter-spacing:0.05em">${group.name}</div>
            ${group.variables.map(v => `
              <div class="cond-var-item" data-ref="${v.ref}" data-path="${v.path}" data-name="${v.name}"
                   style="padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:12px"
                   onmouseenter="this.style.background='var(--md-surface-container)'"
                   onmouseleave="this.style.background=''"
                   onclick="selectCondVar('${inputId}', '${escHtml(v.ref)}', '${updateFnPfx}')">
                <span style="font-size:10px;font-weight:600;padding:1px 4px;border-radius:3px;background:var(--md-primary-container);color:var(--md-on-primary-container);flex-shrink:0">${v.type.charAt(0)}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:500;color:var(--md-on-surface)">${v.name}</div>
                  <div style="font-size:10px;color:var(--md-outline);font-family:var(--font-family-mono)">${v.path}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
    </div>
  `;
  picker.style.display = 'flex';
  picker.style.flexDirection = 'column';

  // 点击外部关闭
  const closeOnOutside = (e) => {
    if (!picker.contains(e.target) && e.target.getAttribute('onclick')?.includes(inputId) === false) {
      picker.style.display = 'none';
      document.removeEventListener('mousedown', closeOnOutside, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeOnOutside, true), 0);
}

function filterCondVarPicker(inputId, keyword) {
  const body = document.getElementById(inputId + '_picker_body');
  if (!body) return;
  const lowerKw = keyword.toLowerCase();
  body.querySelectorAll('.cond-var-group').forEach(group => {
    let hasVisible = false;
    group.querySelectorAll('.cond-var-item').forEach(item => {
      const name = (item.dataset.name || '').toLowerCase();
      const path = (item.dataset.path || '').toLowerCase();
      const visible = !keyword || name.includes(lowerKw) || path.includes(lowerKw);
      item.style.display = visible ? '' : 'none';
      if (visible) hasVisible = true;
    });
    group.style.display = hasVisible ? '' : 'none';
  });
}

function selectCondVar(inputId, ref, updateFnPfx) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = ref;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  // 直接触发持久化回调（updateFnPfx 形如 "updateIfCondition(3,0,'right',"）
  // 通过 change 事件冒泡已经触发了 onchange，无需额外调用
  const picker = document.getElementById(inputId + '_picker');
  if (picker) picker.style.display = 'none';
}


/**
 * 隐藏变量选择器
 */
function hideVarPicker(editorId) {
  const picker = document.getElementById(editorId + '_picker');
  if (picker) {
    picker.style.display = 'none';
  }
  designerVarPickerOpen = null;
  designerVarPickerHighlighted = -1;
}

/**
 * 渲染上游节点输出预览
 */
function renderUpstreamOutputPreview(nodeId) {
  const upstreamNodes = getUpstreamNodes(nodeId);
  if (upstreamNodes.length === 0) return '';
  
  const lastNode = upstreamNodes[upstreamNodes.length - 1];
  const nodeType = nodeTypes.find(t => t.type === lastNode.type);
  const outputs = getNodeOutputs(lastNode);
  
  // 生成示例输出数据
  const sampleOutput = generateSampleOutput(lastNode);
  
  return `
    <div class="upstream-output-preview">
      <div class="upstream-output-preview-header">
        <div class="upstream-output-preview-title">
          <span class="node-icon ${nodeType?.color || ''}">${nodeType?.icon || '📦'}</span>
          <span>上游输出: ${lastNode.name}</span>
        </div>
        <button class="upstream-output-copy-btn" onclick="copyUpstreamOutput('${lastNode.code}')">复制路径</button>
      </div>
      <div class="upstream-output-preview-content collapsed" onclick="this.classList.toggle('collapsed')">
${JSON.stringify(sampleOutput, null, 2)}
      </div>
      <div style="font-size:10px;color:var(--md-outline);margin-top:4px">点击展开/收起</div>
    </div>
  `;
}

/**
 * 生成节点示例输出数据
 */
function generateSampleOutput(node) {
  switch (node.type) {
    case 'http':
      return {
        response: {
          status: 200,
          data: { items: [{ id: 1, name: '示例数据' }] },
          headers: { 'content-type': 'application/json' }
        }
      };
    case 'trigger':
      return {
        triggerTime: '2025-01-15T10:30:00Z',
        ...(node.config?.inputParams?.reduce((acc, p) => {
          acc[p.key || p.label] = p.fieldType === 'Number' ? 0 : '示例值';
          return acc;
        }, {}) || {})
      };
    case 'code':
      return { result: { data: '代码执行结果' } };
    case 'loop':
      return {
        index: 0,
        item: { id: 1, name: '当前项' },
        results: []
      };
    default:
      return { output: '节点输出' };
  }
}

/**
 * 复制上游输出路径
 */
function copyUpstreamOutput(nodeCode) {
  const path = `{{${nodeCode}.output}}`;
  navigator.clipboard.writeText(path).then(() => {
    showToast('success', '已复制', `变量路径 ${path} 已复制到剪贴板`);
  }).catch(() => {
    showToast('error', '复制失败', '请手动复制');
  });
}

// ============================================================
// 表达式/代码 展开弹窗（Expand Editor Modal）
// ============================================================

let _exprExpandState = null; // { editorId, onConfirm }

/**
 * 打开展开编辑器弹窗
 * @param {string} editorId  - 原编辑器 DOM id
 * @param {number} nodeId    - 当前节点 id
 * @param {string} label     - 字段名称（显示在弹窗标题）
 * @param {string} hint      - 工具提示文字
 */
function openExprExpandModal(editorId, nodeId, label, hint) {
  // 读取原编辑器当前值
  const origEl = document.getElementById(editorId);
  const currentValue = origEl ? origEl.value : '';

  // 获取可用变量
  const varGroups = getAvailableVariables(nodeId);

  // 渲染左侧变量列表
  let varListHtml = '';
  if (varGroups.length === 0) {
    varListHtml = '<div style="padding:12px;font-size:11px;color:var(--md-outline)">暂无可用变量</div>';
  } else {
    varGroups.forEach(group => {
      const sourceBadgeMap = {
        trigger:    { label: '触发器', cls: 'source-trigger' },
        node:       { label: '上游节点', cls: 'source-node' },
        global:     { label: '全局变量', cls: 'source-global' },
        datasource: { label: '数据源', cls: 'source-datasource' },
      };
      const badge = sourceBadgeMap[group.source];
      const badgeHtml = badge
        ? `<span class="var-picker-source-badge ${badge.cls}" style="margin-left:auto">${badge.label}</span>`
        : '';
      varListHtml += `<div class="expr-expand-var-group" data-source="${group.source || ''}">
        <div class="expr-expand-var-group-label" style="display:flex;align-items:center">${escHtml(group.name)}${badgeHtml}</div>`;
      group.variables.forEach(v => {
        varListHtml += `<div class="expr-expand-var-item" 
          onclick="insertVarIntoExpandModal(${JSON.stringify(v.ref)})"
          title="${escHtml(v.desc || v.ref)}">
          <span class="expr-expand-var-name">${escHtml(v.path)}</span>
          <span class="expr-expand-var-type">${escHtml(v.type || '')}</span>
          <span class="expr-expand-var-insert">插入</span>
        </div>`;
      });
      varListHtml += '</div>';
    });
  }

  const hintHtml = hint
    ? `<span class="expr-expand-editor-hint">${escHtml(hint)} · 输入 <code>{{</code> 引用变量</span>`
    : `<span class="expr-expand-editor-hint">输入 <code>{{</code> 可快速引用变量</span>`;

  const modalHtml = `
  <div class="expr-expand-overlay" id="exprExpandOverlay" onclick="handleExpandOverlayClick(event)">
    <div class="expr-expand-modal" onclick="event.stopPropagation()">
      <div class="expr-expand-header">
        <div class="expr-expand-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          ${escHtml(label || '编辑表达式')}
          <span class="expr-expand-title-badge">表达式编辑器</span>
        </div>
        <div class="expr-expand-header-actions">
          <button class="expr-expand-close" onclick="closeExprExpandModal(false)" title="取消（Esc）">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="expr-expand-body">
        <div class="expr-expand-vars">
          <div class="expr-expand-vars-header">可用变量</div>
          <div class="expr-expand-vars-list" id="exprExpandVarList">
            ${varListHtml}
          </div>
        </div>
        <div class="expr-expand-editor-area">
          <div class="expr-expand-editor-toolbar">
            ${hintHtml}
          </div>
          <textarea 
            id="exprExpandTextarea"
            class="expr-expand-textarea"
            placeholder="${escHtml(hint || label || '在此输入表达式或代码...')}"
            onkeydown="handleExpandKeydown(event)"
          >${escHtml(currentValue)}</textarea>
        </div>
      </div>
      <div class="expr-expand-footer">
        <button class="btn-ghost" onclick="closeExprExpandModal(false)">取消</button>
        <button class="btn-primary" onclick="closeExprExpandModal(true)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          确认
        </button>
      </div>
    </div>
  </div>`;

  // 挂载到 body
  const container = document.createElement('div');
  container.id = 'exprExpandContainer';
  container.innerHTML = modalHtml;
  document.body.appendChild(container);

  // 聚焦到大编辑区，光标移到末尾
  const ta = document.getElementById('exprExpandTextarea');
  if (ta) {
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  // 保存状态
  _exprExpandState = { editorId };

  // Esc 关闭
  document.addEventListener('keydown', _onExpandEsc);
}

/**
 * 关闭展开弹窗
 * @param {boolean} confirm - true=确认写回原编辑器，false=取消
 */
function closeExprExpandModal(confirm) {
  const container = document.getElementById('exprExpandContainer');
  if (!container) return;

  if (confirm && _exprExpandState) {
    const ta = document.getElementById('exprExpandTextarea');
    const origEl = document.getElementById(_exprExpandState.editorId);
    if (ta && origEl) {
      origEl.value = ta.value;
      // 触发 change 事件，让原编辑器的 onchange 回调执行
      origEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  container.remove();
  _exprExpandState = null;
  document.removeEventListener('keydown', _onExpandEsc);
}

/**
 * 点击遮罩关闭
 */
function handleExpandOverlayClick(event) {
  if (event.target.id === 'exprExpandOverlay') {
    closeExprExpandModal(false);
  }
}

/**
 * 在展开弹窗的大编辑区插入变量引用
 */
function insertVarIntoExpandModal(ref) {
  const ta = document.getElementById('exprExpandTextarea');
  if (!ta) return;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const before = ta.value.substring(0, start);
  const after  = ta.value.substring(end);
  ta.value = before + ref + after;
  const pos = start + ref.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
}

/**
 * Esc 键关闭弹窗
 */
function _onExpandEsc(e) {
  if (e.key === 'Escape') closeExprExpandModal(false);
}

/**
 * 大编辑区键盘事件：Ctrl/Cmd+Enter 确认
 */
function handleExpandKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    closeExprExpandModal(true);
  }
}
