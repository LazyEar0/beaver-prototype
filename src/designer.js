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
let designerDebugPaused = false;       // Is debug paused at a breakpoint?
let designerDebugPausedNodeId = null;  // Which node is paused
let _debugAnimState = null;           // Animation state for resume/step
let designerDebugLogFilter = 'all';
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
let designerAltDown = false; // Alt key held for quick-delete mode
let designerReconnecting = null; // { connId, end: 'from'|'to' } dragging endpoint to reconnect
let designerBottomResizing = false; // Bottom panel resize
let designerFullscreen = false; // Fullscreen toggle
let designerSpaceDown = false; // Space key held for pan mode
let designerUndoStack = []; // Undo state stack (max 50)
let designerRedoStack = []; // Redo state stack
let designerMoreMenuOpen = false; // "More" dropdown menu state
let designerPublishMenuOpen = false; // Publish dropdown menu state
let designerDirty = false; // Track unsaved changes
let designerActiveConfigTab = 'basic'; // 'basic' | 'advanced' — persists across renderDesigner()
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
  { type: 'assign', name: '赋值', icon: '📝', color: 'node-color-data', category: '数据与执行', desc: '变量赋值操作，支持表达式计算和 ${变量名} 引用', code: 'assign' },
  { type: 'output', name: '输出', icon: '📤', color: 'node-color-data', category: '数据与执行', desc: '输出数据到下游节点，支持变量模式（结构化输出）和文本模式（模板输出）', code: 'output' },
  { type: 'code', name: '代码', icon: '💻', color: 'node-color-data', category: '数据与执行', desc: '编写自定义脚本（JS / Python），实现复杂数据处理逻辑', code: 'code' },
  { type: 'http', name: 'HTTP 请求', icon: '🌐', color: 'node-color-integration', category: '集成', desc: 'HTTP 请求调用，支持 GET/POST/PUT/DELETE，可配置请求头和请求体', code: 'http' },
  { type: 'mq', name: 'MQ 发送', icon: '📨', color: 'node-color-integration', category: '集成', desc: '向消息队列发送消息，需配置 Topic，支持消息 Key 和属性', code: 'mq' },
  { type: 'workflow', name: '工作流', icon: '🔗', color: 'node-color-flow', category: '扩展能力', desc: '调用被授权且支持引用的工作流，支持输入参数映射', code: 'wf' },
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
  designerDebugPaused = false;
  designerDebugPausedNodeId = null;
  _debugAnimState = null;
  designerNodePanelExpanded = false;
  designerClipboard = [];
  designerContextMenu = null;
  designerSelectedConnId = null;
  designerHoveredConnId = null;
  designerAltDown = false;
  designerReconnecting = null;
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
  designerPublishMenuOpen = false;
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
    { id: 5, type: 'output', name: '记录日志', code: 'output_1', x: 760, y: 340, config: { level: 'ERROR', outputMode: 'variables', outputVars: [{ name: 'result', type: 'String', source: '' }] }, warnings: 0 },
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
        allowBreak: true,
        breakCondition: 'roomItem.stock === 0',
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
          { target: 'summary', source: '共通知 ${loop_1.iterationCount} 个房型', type: 'String' }
        ]
      }, warnings: 0
    },
    {
      // ⑤ 【Break 中断后】库存为 0 时提前跳出循环，记录紧急事件
      //    通过"Break"端口连接，仅在 breakCondition 满足时执行一次
      id: 7, type: 'assign', name: '记录紧急缺货', code: 'assign_2',
      x: 560, y: 560,
      config: {
        assignments: [
          { target: 'urgentAlert', source: '房型 ${roomItem.name} 已完全缺货，立即采购', type: 'String' }
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
    // Break 端口 → 条件满足时跳出循环后执行的节点
    { id: 6, from: 3, to: 7, fromPort: 'break', toPort: 'in', label: 'Break（stock=0 时中断）' },
    { id: 5, from: 5, to: 6, fromPort: 'out',  toPort: 'in' },
    { id: 7, from: 7, to: 5, fromPort: 'out',  toPort: 'in' },
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
    ${designerDebugMode ? `<div class="debug-mode-bar active">${designerDebugPaused ? icons.pause : icons.play} <span>${designerDebugPaused ? '调试已暂停 - 断点命中' : '调试模式 - 画布只读'}</span> ${designerDebugPaused ? `<button class="btn btn-sm debug-btn-resume" onclick="resumeDebug()" title="继续执行到下一个断点或结束">${icons.play}<span>继续执行</span></button><button class="btn btn-sm debug-btn-step" onclick="stepDebug()" title="单步执行下一个节点">${icons.chevronRight}<span>单步执行</span></button>` : ''} <button class="btn btn-sm" style="height:24px;padding:0 12px;background:rgba(239,68,68,0.1);color:var(--md-error);border-radius:var(--radius-full);font-size:11px" onclick="exitDebugMode()">终止调试</button></div>` : ''}
    ${designerFullscreen ? `<button class="fullscreen-exit-btn" onclick="toggleDesignerFullscreen()" title="退出全屏 (F11)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="4 14 4 20 10 20"/><polyline points="20 10 20 4 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> 退出全屏</button>` : ''}
    <div class="designer-toolbar">
      <div class="designer-toolbar-left">
        <button class="designer-back-btn" onclick="closeDesigner()" title="返回">${icons.arrowLeft}</button>
        <span class="designer-wf-name" title="${wf.name}">${wf.name}</span>
        ${wf.type === 'chat'
          ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:var(--radius-full);background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1d4ed8;border:1px solid #93c5fd">💬 对话流</span>`
          : `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:var(--radius-full);background:linear-gradient(135deg,#f0fdf4,#dcfce7);color:#15803d;border:1px solid #86efac">⚙️ 应用流</span>`
        }
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
        <div style="position:relative;display:flex">
          <button class="btn btn-primary btn-sm" onclick="showPublishDialog()" ${wf.status === 'disabled' ? 'disabled style="opacity:0.5"' : ''} title="发布当前工作流版本">${icons.arrowUp || icons.check}<span>发布</span></button>
          <button class="btn btn-primary btn-sm" style="padding:0 6px;min-width:auto;border-left:1px solid rgba(255,255,255,0.3)" onclick="designerPublishMenuOpen=!designerPublishMenuOpen;renderDesigner()" ${wf.status === 'disabled' ? 'disabled style="opacity:0.5"' : ''} title="更多发布选项">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          ${designerPublishMenuOpen ? `<div class="designer-more-dropdown" style="right:0;min-width:160px" onclick="event.stopPropagation()">
            <div class="more-dropdown-item" onclick="designerPublishMenuOpen=false;showForcePublishDialog()">
              ${icons.alertTriangle || ''} <span>强制发布</span>
            </div>
          </div>` : ''}
        </div>
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
              <marker id="arrowhead-danger" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#dc2626" />
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
        <div class="conn-overlay" id="connOverlay">
          ${renderConnOverlay()}
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
      return src && src.type === 'loop' && (c.fromPort === 'loop' || c.fromPort === 'done' || c.fromPort === 'break');
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
      // Loop node: "loop body" (bottom-left), optional "break" (bottom-right), "done" (right)
      const showBreak = node.config?.allowBreak !== false;
      // When Break is disabled, center the loop port; otherwise shift it left to 25%
      const loopPortStyle = showBreak ? '' : 'style="left:50%"';
      portsHtml += `<div class="canvas-node-port port-loop" data-port="loop" data-node="${node.id}" ${loopPortStyle}><span class="canvas-node-port-label" style="bottom:-18px;left:50%;transform:translateX(-50%);color:#7c3aed;white-space:nowrap;font-size:10px">循环体</span></div>`;
      if (showBreak) {
        portsHtml += `<div class="canvas-node-port port-break" data-port="break" data-node="${node.id}"><span class="canvas-node-port-label" style="bottom:-18px;left:50%;transform:translateX(-50%);color:#ea580c;white-space:nowrap;font-size:10px">Break</span></div>`;
      }
      portsHtml += `<div class="canvas-node-port port-done" data-port="done" data-node="${node.id}"><span class="canvas-node-port-label" style="top:50%;right:-34px;transform:translateY(-50%);color:#16a34a;font-size:10px">完成</span></div>`;
    } else if (node.type !== 'end' && node.type !== 'break') {
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
        ${isPlaceholder && node.config?.requirementDesc ? `<div class="placeholder-desc-preview" title="${escHtml(node.config.requirementDesc)}">${truncate(node.config.requirementDesc, 24)}</div>` : ''}
        ${isPlaceholder && node.config?.assignee ? `<div class="placeholder-assignee-badge">${escHtml(node.config.assignee)}</div>` : ''}
        ${node.type === 'trigger' ? (() => {
          const et = node.config?.enabledTypes || { manual: true, scheduled: false, event: false, webhook: false };
          const typeLabels = { manual: '手动', scheduled: '定时', event: '事件', webhook: 'Webhook' };
          const activeOnes = Object.entries(et).filter(([k2,v2]) => v2).map(([k2]) => typeLabels[k2]);
          return activeOnes.length ? '<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px">' + activeOnes.map(t2 => '<span style="font-size:9px;padding:1px 5px;border-radius:var(--radius-full);background:var(--md-primary-container);color:var(--md-on-primary-container)">' + t2 + '</span>').join('') + '</div>' : '';
        })() : ''}
        ${node.config?.condition ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(node.config.condition, 30)}</div>` : ''}
        ${node.config?.url ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(node.config.url, 30)}</div>` : ''}
        ${node.type === 'loop' ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${node.config?.loopMode === 'while' ? `While: ${truncate(node.config?.whileCondition || '未配置条件', 22)}` : `ForEach: ${truncate(node.config?.listVar || '未配置列表', 22)}`}</div>` : ''}
        ${node.type === 'switch' ? (() => {
          const branches = node.config?.branches || [];
          const matchLabel = node.config?.matchMode === 'all' ? '全部匹配' : '首次匹配';
          return `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${branches.length} 个分支 · ${matchLabel}</div>`;
        })() : ''}
        ${node.type === 'code' ? (() => {
          const lang = node.config?.language || 'JavaScript';
          const vars = node.config?.codeOutputVars || [];
          const varNames = vars.map(v => v.name).filter(Boolean);
          return `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${lang}${varNames.length ? ' → ' + truncate(varNames.join(', '), 18) : ''}</div>`;
        })() : ''}
        ${node.type === 'delay' ? (() => {
          const isFixed = node.config?.delayMode !== '到指定时间';
          return isFixed
            ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">延迟 ${node.config?.delayValue || 5} ${node.config?.delayUnit || '秒'}</div>`
            : `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">到 ${truncate(node.config?.delayTarget || '未配置时间', 22)}</div>`;
        })() : ''}
        ${node.type === 'assign' ? (() => {
          const assignments = node.config?.assignments || [];
          const targets = assignments.map(a => a.target).filter(Boolean);
          return targets.length ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(targets.join(', '), 30)}</div>` : '';
        })() : ''}
        ${node.type === 'output' ? (() => {
          const mode = node.config?.outputMode === 'text' ? '文本模式' : '变量模式';
          const vars = node.config?.outputVars || [];
          return `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${mode}${vars.length ? ' · ' + vars.length + ' 个' : ''}</div>`;
        })() : ''}
        ${node.type === 'mq' && node.config?.topic ? `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">Topic: ${truncate(node.config.topic, 24)}</div>` : ''}
        ${node.type === 'workflow' ? (() => {
          const targetWf = Object.values(wsWorkflows).flat().find(wf => wf.id == node.config?.targetWfId);
          if (!targetWf) return '';
          const refVer = node.config?.referencedVersion || targetWf.version || 0;
          const latestVer = targetWf.latestPublishedVersion || refVer;
          const hasNew = latestVer > refVer;
          return `<div style="margin-top:4px;font-size:10px;color:var(--md-on-surface-variant)">${truncate(targetWf.name, 28)}${hasNew ? ` <span style="color:var(--md-primary);font-weight:500">↑v${latestVer}</span>` : ''}</div>`;
        })() : ''}
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
  const iconMap = { success: icons.check, failed: icons.xCircle, running: icons.sync, paused: icons.pause };
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
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;

    const isActive = designerDebugMode && conn._debugActive;
    const isSelected = designerSelectedConnId === conn.id;
    const isHovered = designerHoveredConnId === conn.id;
    const isAltDelete = isHovered && designerAltDown;

    // Determine visual style
    let strokeColor, strokeWidth, connClass, markerEnd;
    if (isAltDelete) {
      strokeColor = '#dc2626';
      strokeWidth = 3.5;
      connClass = 'connection-alt-delete';
      markerEnd = 'url(#arrowhead-danger)';
    } else if (isActive || isSelected || isHovered) {
      strokeColor = '#1890FF';
      strokeWidth = 3.5;
      connClass = isActive ? 'connection-flow' : (isSelected ? 'connection-selected' : 'connection-hovered');
      markerEnd = 'url(#arrowhead-active)';
    } else {
      strokeColor = '#222';
      strokeWidth = 2.5;
      connClass = '';
      markerEnd = 'url(#arrowhead)';
    }

    // Interaction group
    let html = '';
    html += `<g class="conn-group" data-conn="${conn.id}" style="pointer-events:all" onmouseenter="onConnectionHover(event, ${conn.id})" onmouseleave="onConnectionLeave(event, ${conn.id})">`;
    // Invisible wider path for easier hover - also set pointer-events inline for SVG compatibility
    html += `<path d="${path}" fill="none" stroke="transparent" stroke-width="14" style="pointer-events:stroke;cursor:pointer" onclick="onConnectionClick(event, ${conn.id})" oncontextmenu="onConnectionContextMenu(event, ${conn.id})" />`;

    // Glow path for selected/hovered state
    if (isSelected || isHovered) {
      html += `<path d="${path}" fill="none" stroke="${isAltDelete ? 'rgba(220,38,38,0.12)' : 'rgba(24,144,255,0.12)'}" stroke-width="14" style="pointer-events:none" />`;
    }

    // Visible path
    html += `<path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" marker-end="${markerEnd}" class="${connClass}" style="pointer-events:none" />`;

    // Label
    if (conn.label) {
      const labelColor = conn.label === 'TRUE' ? '#16a34a' : conn.label === 'FALSE' ? '#dc2626' : conn.label === 'Default' ? '#94a3b8' : conn.label === '循环体' ? '#7c3aed' : conn.label === '完成' ? '#16a34a' : conn.label.startsWith('Break') ? '#ea580c' : '#1890FF';
      html += `<text x="${midX}" y="${midY - 10}" text-anchor="middle" font-size="11" fill="${labelColor}" font-weight="700" font-family="Roboto, sans-serif" paint-order="stroke" stroke="#fff" stroke-width="3" style="pointer-events:none">${conn.label}</text>`;
    }

    html += '</g>';
    return html;
  }).join('');
}

// --- Connection HTML Overlay (delete btn + toolbar as HTML elements) ---
// Placed outside canvasContainer to avoid mousedown event interception.
function renderConnOverlay() {
  if (designerDebugMode) return '';
  const parts = [];

  designerConnections.forEach(conn => {
    const fromNode = designerNodes.find(n => n.id === conn.from);
    const toNode = designerNodes.find(n => n.id === conn.to);
    if (!fromNode || !toNode) return;

    const fromPos = getPortPosition(fromNode, conn.fromPort || 'out');
    const toPos = getPortPosition(toNode, conn.toPort || 'in');

    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;

    const isSelected = designerSelectedConnId === conn.id;
    const isHovered = designerHoveredConnId === conn.id;
    const isAltDelete = isHovered && designerAltDown;

    // Canvas coords → screen coords (conn-overlay is inside canvas-area, same as canvasContainer)
    const sx = midX * designerZoom + designerPanX;
    const sy = midY * designerZoom + designerPanY;

    // --- Hover: show × delete button at midpoint ---
    if (isHovered && !isSelected && !isAltDelete) {
      parts.push(`
        <button class="conn-overlay-delete"
          style="left:${sx}px;top:${sy}px"
          onclick="deleteConnectionById(event,${conn.id})"
          title="删除连线">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="2" y1="2" x2="8" y2="8" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="8" y1="2" x2="2" y2="8" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>`);
    }

    // --- Selected: show floating toolbar above midpoint ---
    if (isSelected) {
      const fromName = fromNode.name || '起点';
      const toName = toNode.name || '终点';
      parts.push(`
        <div class="conn-toolbar" style="left:${sx}px;top:${sy - 48 * designerZoom}px" onclick="event.stopPropagation()">
          <span class="conn-toolbar-label">${fromName} → ${toName}</span>
          <div class="conn-toolbar-sep"></div>
          <button class="conn-toolbar-btn" onclick="onEndpointDragStart(event,${conn.id},'to')" title="重新连接到另一节点">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3l4 4-4 4M21 7H9a4 4 0 000 8h3"/><path d="M7 17l-4-4 4-4"/>
            </svg>
            重连
          </button>
          <button class="conn-toolbar-btn danger" onclick="deleteConnectionById(event,${conn.id})" title="删除连线 (Delete)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
            删除
          </button>
        </div>`);

      // Endpoint handle at TARGET end only (to reconnect where it goes)
      const stx = toPos.x * designerZoom + designerPanX;
      const sty = toPos.y * designerZoom + designerPanY;
      parts.push(`
        <button class="conn-overlay-handle"
          style="left:${stx}px;top:${sty}px"
          onmousedown="onEndpointDragStart(event,${conn.id},'to')"
          title="拖拽到新节点重连">
        </button>`);
    }
  });

  return parts.join('');
}

function getPortPosition(node, port) {
  const w = 180, h = 72;
  switch (port) {
    case 'in': return { x: node.x, y: node.y + h / 2 };
    case 'out': return { x: node.x + w, y: node.y + h / 2 };
    case 'true': return { x: node.x + w * 0.35, y: node.y + h };
    case 'false': return { x: node.x + w * 0.65, y: node.y + h };
    case 'loop': {
      // When allowBreak is enabled, spread loop (left) and break (right) ports at bottom;
      // otherwise center the loop port at bottom.
      const hasBreak = node.config?.allowBreak !== false;
      return hasBreak
        ? { x: node.x + w * 0.25, y: node.y + h }
        : { x: node.x + w * 0.35, y: node.y + h };
    }
    case 'break': return { x: node.x + w * 0.75, y: node.y + h };  // 底部偏右，Break 中断出口
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

  const rpWidthStyle = _rpCurrentWidth !== 360 ? ` style="width:${_rpCurrentWidth}px"` : '';
  return `<div class="right-panel ${isOpen ? 'open' : ''}" id="designerRightPanel"${rpWidthStyle}><div class="right-panel-resize-handle" id="rightPanelResizeHandle" onmousedown="startRightPanelResize(event)"></div>${content}</div>`;
}

function renderOverviewPanel() {
  const wf = designerWf;
  if (!wf) return '';
  const problems = getProblems();

  // 解析负责人名称
  const ownerNames = (wf.owners || []).map(ownerId => {
    const u = (typeof ssoUsers !== 'undefined' ? ssoUsers : []).find(u => u.id === ownerId);
    return u ? u.name : String(ownerId);
  });
  const ownersDisplay = ownerNames.length > 0 ? ownerNames.join('、') : '-';

  // 版本状态
  const currentVer = (wf.versions || []).find(v => v.status === 'current');
  const hasDraft = !currentVer || wf.version === 0;
  const versionDisplay = wf.version > 0
    ? `<span class="version-badge" style="font-size:11px">v${wf.version}</span>${hasDraft ? '' : '<span style="margin-left:6px;font-size:var(--font-size-xs);color:var(--md-outline)">（有未发布改动）</span>'}`
    : '<span style="color:var(--md-outline-variant);font-size:var(--font-size-xs)">未发布</span>';

  // 允许被引用
  const allowRefDisplay = wf.allowRef
    ? `<span style="color:var(--md-success);font-size:var(--font-size-xs)">● 已开启</span>`
    : `<span style="color:var(--md-outline);font-size:var(--font-size-xs)">● 已关闭</span>`;

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
          <div class="wf-stat-card"><div class="wf-stat-card-label">问题</div><div class="wf-stat-card-value" style="${problems.length > 0 ? 'color:var(--md-error)' : 'color:var(--md-success)'}">${problems.length}</div></div>
          <div class="wf-stat-card"><div class="wf-stat-card-label">调试</div><div class="wf-stat-card-value" style="font-size:11px;${wf.debugPassed ? 'color:var(--md-success)' : 'color:var(--md-error)'}">${wf.debugPassed ? '通过' : '未通过'}</div></div>
        </div>
        <div class="config-section">
          <div class="config-section-title">基本信息</div>
          <div class="config-field"><div class="config-field-label">编号</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface);font-family:var(--font-family-mono)">${wf.code}</div></div>
          <div class="config-field"><div class="config-field-label">类型</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface)">${wf.type === 'app' ? '应用流' : (wf.type === 'chat' ? '对话流' : wf.type)}</div></div>
          <div class="config-field"><div class="config-field-label">创建者</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface)">${wf.creator}</div></div>
          <div class="config-field"><div class="config-field-label">负责人</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface)">${ownersDisplay}</div></div>
          <div class="config-field"><div class="config-field-label">最近修改</div><div style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">${wf.editedAt || '-'}${wf.lastEditor ? ` · ${wf.lastEditor}` : ''}</div></div>
        </div>
        <div class="config-section">
          <div class="config-section-title">版本与发布</div>
          <div class="config-field"><div class="config-field-label">当前版本</div><div style="font-size:var(--font-size-sm)">${versionDisplay}</div></div>
          <div class="config-field"><div class="config-field-label">允许被引用</div><div style="font-size:var(--font-size-sm)">${allowRefDisplay}</div></div>
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
  const hasAdvancedValues = checkHasAdvancedValues(node);
  const isAdvanced = designerActiveConfigTab === 'advanced';
  const canConvert = node.type !== 'trigger' && node.type !== 'end';

  return `
    <div class="right-panel-header">
      <span class="right-panel-title"><span class="canvas-node-icon ${nt.color || ''}" style="width:22px;height:22px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">${nt.icon || ''}</span> ${node.name}</span>
      ${canConvert ? `<button class="node-type-convert-btn" onclick="showConvertNodeMenu(${node.id})" title="切换节点类型">🔄</button>` : ''}
      <button class="right-panel-close" onclick="deselectNode()">${icons.close}</button>
    </div>
    <div class="right-panel-tabs">
      <div class="right-panel-tab ${!isAdvanced ? 'active' : ''}" id="rpTabBasic" onclick="switchNodeConfigTab('basic')">基础配置</div>
      <div class="right-panel-tab ${isAdvanced ? 'active' : ''}" id="rpTabAdvanced" onclick="switchNodeConfigTab('advanced')">高级配置${hasAdvancedValues ? '<span class="advanced-dot"></span>' : ''}</div>
    </div>
    <div class="right-panel-body" id="nodeConfigBody">
      ${isAdvanced ? renderAdvancedConfig(node) : renderNodeConfigFields(node, nt)}
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
    case 'break':
      html += renderBreakNodeConfig(node);
      break;
    case 'placeholder':
      html += renderPlaceholderConfig(node);
      break;
  }

  // Node description with richer content from PRD
  const nodeHelpMap = {
    trigger: { scene: '作为每个工作流的起始节点，定义流程何时被触发执行', rules: '每个工作流只能有一个触发器；触发方式和输入参数是必配项' },
    end: { scene: '作为工作流的终止节点，汇总输出结果', rules: '每个工作流只能有一个结束节点；应映射需要输出的变量' },
    'if': { scene: '根据数据判断走不同的业务分支，例如「订单金额 > 1000 走审批流」', rules: '必须配置条件表达式；TRUE 和 FALSE 分支都应连接后续节点' },
    'switch': { scene: '当有多个业务分支时使用，例如「根据订单来源渠道分发到不同处理流程」', rules: '至少配置 2 个分支条件；建议配置 Default 分支兜底' },
    loop: { scene: '需要重复处理列表数据或轮询等待时使用，例如「批量处理订单」「遍历用户列表逐条推送」', rules: 'ForEach 模式必须指定列表变量；"循环体"端口（底部）连接循环内的节点，"完成"端口（右侧）连接循环结束后的节点；建议设置最大循环次数防止死循环；循环结果通过输出变量名引用' },
    break: { scene: '在循环体内满足特定条件时提前跳出循环，例如「找到目标后停止遍历」或「出错超过阈值则中断」', rules: 'Break 节点只能放在循环节点的循环体内；执行后立即跳出当前循环，进入"完成"出口的后续节点；通常配合 IF 条件节点使用' },
    delay: { scene: '需要等待一段时间后再继续执行，例如「等待审批结果」或「定时重试」', rules: '固定时长模式需设置具体时长；到指定时间模式需设置目标时刻' },
    assign: { scene: '对变量进行计算或转换，例如「将接口返回数据映射到业务变量」', rules: '目标变量名不能为空；支持 ${变量名} 引用其他变量' },
    output: { scene: '记录流程执行日志，便于调试和问题排查', rules: 'INFO 级别用于常规记录，ERROR 级别会触发告警' },
    code: { scene: '标准节点无法满足的复杂数据处理逻辑', rules: '代码中可通过 input 获取输入数据，通过 return 返回处理结果' },
    http: { scene: '调用外部 REST API 接口，例如「查询订单状态」「推送通知」', rules: '请求 URL 为必填项；建议配置超时和重试策略' },
    mq: { scene: '向消息队列发送消息，例如「发布订单创建事件」「推送数据变更通知」', rules: 'Topic 和消息内容为必填项；消息 Key 用于分区路由；消息属性可传递元数据' },
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
  const wfType = designerWf?.type || 'app';
  const isChat = wfType === 'chat';
  const defaultEnabledTypes = isChat
    ? { message: true, manual: false, scheduled: false, event: false, webhook: false }
    : { manual: true, scheduled: false, event: false, webhook: false };
  const enabledTypes = node.config?.enabledTypes || defaultEnabledTypes;
  // Active tab for configuration detail display
  const activeTab = node.config?.activeTriggerTab || (isChat ? 'message' : 'manual');
  const inputParams = node.config?.inputParams || [];

  const triggerTabs = isChat ? [
    { key: 'message', label: '消息触发', icon: '💬' },
    { key: 'manual', label: '手动触发', icon: '👆' },
    { key: 'scheduled', label: '定时触发', icon: '🕐' },
    { key: 'event', label: '事件触发', icon: '📡' },
    { key: 'webhook', label: 'Webhook', icon: '🔗' },
  ] : [
    { key: 'manual', label: '手动触发', icon: '👆' },
    { key: 'scheduled', label: '定时触发', icon: '🕐' },
    { key: 'event', label: '事件触发', icon: '📡' },
    { key: 'webhook', label: 'Webhook', icon: '🔗' },
  ];

  const enabledCount = Object.values(enabledTypes).filter(Boolean).length;

  let html = `<div class="config-section">
    <div class="config-section-title">触发方式</div>
    <div class="config-field-help" style="margin-bottom:var(--space-2)">${isChat ? '对话流默认启用消息触发，由用户发送消息启动流程；也可启用其他触发方式用于自动化场景' : '至少启用一种触发方式，可同时启用多种，任一满足即可触发工作流'}</div>
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

  if (activeTab === 'message') {
    html += `<div class="config-field-help" style="margin-bottom:var(--space-2)">适用于对话场景，由用户发送消息触发流程执行，支持多轮对话</div>
    <div class="config-field">
      <div class="config-field-label">内置变量</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--md-surface-container);border-radius:var(--radius-sm);font-size:var(--font-size-xs)">
          <span style="font-family:var(--font-family-mono);color:var(--md-primary);min-width:120px">query</span>
          <span style="color:var(--md-on-surface-variant)">用户当前输入的消息内容</span>
          <span style="margin-left:auto;color:var(--md-outline);font-size:10px">String</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--md-surface-container);border-radius:var(--radius-sm);font-size:var(--font-size-xs)">
          <span style="font-family:var(--font-family-mono);color:var(--md-primary);min-width:120px">files</span>
          <span style="color:var(--md-on-surface-variant)">用户上传的文件列表</span>
          <span style="margin-left:auto;color:var(--md-outline);font-size:10px">Array[File]</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--md-surface-container);border-radius:var(--radius-sm);font-size:var(--font-size-xs)">
          <span style="font-family:var(--font-family-mono);color:var(--md-primary);min-width:120px">conversation_id</span>
          <span style="color:var(--md-on-surface-variant)">当前会话的唯一标识，跨轮次保持不变</span>
          <span style="margin-left:auto;color:var(--md-outline);font-size:10px">String</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--md-surface-container);border-radius:var(--radius-sm);font-size:var(--font-size-xs)">
          <span style="font-family:var(--font-family-mono);color:var(--md-primary);min-width:120px">user_id</span>
          <span style="color:var(--md-on-surface-variant)">当前对话用户的唯一标识</span>
          <span style="margin-left:auto;color:var(--md-outline);font-size:10px">String</span>
        </div>
      </div>
      <div class="config-field-help">内置变量可在下游节点中通过 \${trigger_1.query\} 等方式引用</div>
    </div>`;
  }

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

  // 判断值是否是变量路径（以 {{ 开头，或以 vars./ds. 开头，或符合 nodeCode. 模式）
  const isVarPath = (v) => {
    if (!v) return false;
    return v.startsWith('{{') || v.startsWith('vars.') || v.startsWith('ds.') ||
      /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_]/.test(v);
  };

  conditions.forEach((cond, idx) => {
    if (idx > 0) {
      html += `<div class="condition-and-tag">AND</div>`;
    }
    const leftVal = (cond.left === '__custom__' || !cond.left) ? '' : cond.left;
    const opIsNoRight = noRightOps.includes(cond.op);
    const leftInputId = `cond_left_${nodeId}_${idx}_${Date.now()}`;
    const leftIsVar = isVarPath(leftVal);
    // 左值路径去掉 {{}} 供 chip 显示
    const leftPath = leftVal.replace(/^\{\{/, '').replace(/\}\}$/, '');

    html += `<div class="condition-visual-row">
      <!-- Row 1: variable input + ref picker -->
      <div class="cond-row-top">
        <div class="cond-right-wrap" style="flex:1">
          ${leftIsVar ? `
          <div class="var-chip-wrap">
            <div class="var-chip" data-source="${_detectVarSource(leftPath)}" title="${escHtml(leftPath)}">
              <span class="var-chip-icon">${({ trigger:'T',node:'N',global:'G',datasource:'D',unknown:'V' })[_detectVarSource(leftPath)]}</span>
              <span class="var-chip-name">${escHtml(leftPath)}</span>
              <button class="var-chip-clear" onclick="clearVarChip('${leftInputId}', null)" title="清除">✕</button>
            </div>
          </div>
          <input id="${leftInputId}" class="cond-left-input" value="${escHtml(leftVal)}" placeholder="输入或引用变量，如 vars.status" onchange="${updateFnPfx}${idx},'left',this.value)" style="display:none;padding-right:28px;width:100%" />
          <button class="cond-ref-btn" title="引用变量" onclick="showCondVarPicker('${leftInputId}', ${nodeId}, '${updateFnPfx}${idx}', 'left')" style="display:none">⊙</button>
          ` : `
          <input id="${leftInputId}" class="cond-left-input" value="${escHtml(leftVal)}" placeholder="输入或引用变量，如 vars.status" onchange="${updateFnPfx}${idx},'left',this.value)" style="padding-right:28px;width:100%" />
          <button class="cond-ref-btn" title="引用变量" onclick="showCondVarPicker('${leftInputId}', ${nodeId}, '${updateFnPfx}${idx}', 'left')">⊙</button>
          `}
          <div id="${leftInputId}_picker" class="var-picker-dropdown" style="display:none"></div>
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
              const rightVal = cond.right || '';
              const rightIsVar = isVarPath(rightVal);
              const rightPath = rightVal.replace(/^\{\{/, '').replace(/\}\}$/, '');
              return `<div class="cond-right-wrap" style="position:relative;flex:1">
                ${rightIsVar ? `
                <div class="var-chip-wrap">
                  <div class="var-chip" data-source="${_detectVarSource(rightPath)}" title="${escHtml(rightPath)}">
                    <span class="var-chip-icon">${{ trigger:'T',node:'N',global:'G',datasource:'D',unknown:'V' }[_detectVarSource(rightPath)]}</span>
                    <span class="var-chip-name">${escHtml(rightPath)}</span>
                    <button class="var-chip-clear" onclick="clearVarChip('${rightInputId}', null)" title="清除">✕</button>
                  </div>
                </div>
                <input id="${rightInputId}" class="cond-right-input" value="${escHtml(rightVal)}" placeholder="输入值或引用变量" onchange="${updateFnPfx}${idx},'right',this.value)" style="display:none;padding-right:28px;width:100%" />
                <button class="cond-ref-btn" title="从变量选择器中引用" onclick="showCondVarPicker('${rightInputId}', ${nodeId}, '${updateFnPfx}${idx}')" style="display:none">⊙</button>
                ` : `
                <input id="${rightInputId}" class="cond-right-input" value="${escHtml(rightVal)}" placeholder="输入值或引用变量" onchange="${updateFnPfx}${idx},'right',this.value)" style="padding-right:28px;width:100%" />
                <button class="cond-ref-btn" title="从变量选择器中引用" onclick="showCondVarPicker('${rightInputId}', ${nodeId}, '${updateFnPfx}${idx}')">⊙</button>
                `}
                <div id="${rightInputId}_picker" class="var-picker-dropdown" style="display:none"></div>
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
  const outputVarsSection = renderHttpOutputVariablesSection(node);
  const method = node.config?.method || 'GET';
  const bodyType = node.config?.bodyType || 'json'; // 'json' | 'form' | 'raw' | 'none'
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
  const queryParams = node.config?.queryParams || [];
  const successConditions = node.config?.successConditions || [];

  // Body placeholder & hint by type
  const bodyPlaceholders = {
    json: '{"key": "value", "userId": "{{input.userId}}"}',
    form: 'field1=value1&field2={{input.field2}}',
    raw: '任意文本内容，支持 {{变量}} 引用',
    none: ''
  };
  const bodyHints = {
    json: 'JSON 格式，支持 {{变量}} 引用',
    form: 'URL 编码格式，支持 {{变量}} 引用',
    raw: '原始文本，支持 {{变量}} 引用',
    none: ''
  };

  // Query Params section
  const queryParamsHtml = `
    <div class="config-field">
      <div class="config-field-label" style="display:flex;align-items:center;justify-content:space-between">
        Query 参数
        <button class="btn btn-ghost btn-sm" style="height:22px;font-size:11px" onclick="addHttpQueryParam(${node.id})">${icons.plus} 添加</button>
      </div>
      ${queryParams.length === 0 ? `<div class="config-field-help" style="padding:6px 0">暂无参数，点击添加 — 也可直接在 URL 中拼接 ?key=value</div>` : ''}
      ${queryParams.map((p, i) => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <input class="config-input" style="flex:1;height:28px;font-size:11px" placeholder="参数名" value="${escHtml(p.key || '')}" oninput="updateHttpQueryParam(${node.id},${i},'key',this.value)" />
        <span style="color:var(--md-outline);font-size:12px">=</span>
        <input class="config-input" style="flex:2;height:28px;font-size:11px;font-family:var(--font-family-mono)" placeholder="参数值，支持 {{变量}}" value="${escHtml(p.value || '')}" oninput="updateHttpQueryParam(${node.id},${i},'value',this.value)" />
        <button class="table-action-btn danger" style="width:22px;height:22px;flex-shrink:0" onclick="removeHttpQueryParam(${node.id},${i})">${icons.close}</button>
      </div>`).join('')}
      ${queryParams.length > 0 ? `<div class="config-field-help">参数将自动附加到 URL，如已有 URL 参数则合并</div>` : ''}
    </div>`;

  // Body type selector (only for methods with body)
  const bodyTypeHtml = hasBody ? `
    <div class="config-field">
      <div class="config-field-label" style="display:flex;align-items:center;justify-content:space-between">
        请求体
        <div class="cond-mode-tabs" style="gap:2px">
          <button class="cond-mode-tab ${bodyType === 'json' ? 'active' : ''}" onclick="updateNodeConfig(${node.id},'bodyType','json');renderDesigner()">JSON</button>
          <button class="cond-mode-tab ${bodyType === 'form' ? 'active' : ''}" onclick="updateNodeConfig(${node.id},'bodyType','form');renderDesigner()">Form</button>
          <button class="cond-mode-tab ${bodyType === 'raw' ? 'active' : ''}" onclick="updateNodeConfig(${node.id},'bodyType','raw');renderDesigner()">Raw</button>
          <button class="cond-mode-tab ${bodyType === 'none' ? 'active' : ''}" onclick="updateNodeConfig(${node.id},'bodyType','none');renderDesigner()">无</button>
        </div>
      </div>
      ${bodyType !== 'none' ? renderExprEditor({
        id: `http_body_${node.id}`,
        value: node.config?.body || '',
        placeholder: bodyPlaceholders[bodyType] || '',
        nodeId: node.id,
        minHeight: 60,
        label: '请求体',
        hint: bodyHints[bodyType] || '',
        onChange: `updateNodeConfig(${node.id}, 'body', this.value)`
      }) : '<div class="config-field-help" style="padding:4px 0">此请求无请求体</div>'}
    </div>` : '';

  // Success conditions
  const successHtml = `
    <div class="config-section">
      <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">
        响应成功条件
        <button class="btn btn-ghost btn-sm" style="height:22px;font-size:11px" onclick="addHttpSuccessCondition(${node.id})">${icons.plus} 添加</button>
      </div>
      ${successConditions.length === 0 ? `<div class="config-field-help">默认 HTTP 2xx 视为成功；添加条件可自定义判断逻辑，不满足则触发错误处理策略</div>` : `
      <div class="config-field-help" style="margin-bottom:4px">满足以下全部条件视为成功</div>
      ${successConditions.map((sc, i) => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <select class="config-select" style="flex:1;height:28px;font-size:11px" onchange="updateHttpSuccessCondition(${node.id},${i},'field',this.value)">
          <option value="status" ${(sc.field||'status')==='status'?'selected':''}>状态码</option>
          <option value="body" ${sc.field==='body'?'selected':''}>响应体字段</option>
        </select>
        <select class="config-select" style="width:72px;height:28px;font-size:11px" onchange="updateHttpSuccessCondition(${node.id},${i},'op',this.value)">
          <option value="eq" ${(sc.op||'eq')==='eq'?'selected':''}>等于</option>
          <option value="ne" ${sc.op==='ne'?'selected':''}>不等于</option>
          <option value="in" ${sc.op==='in'?'selected':''}>包含于</option>
          <option value="range" ${sc.op==='range'?'selected':''}>范围</option>
        </select>
        <input class="config-input" style="flex:1.5;height:28px;font-size:11px;font-family:var(--font-family-mono)" placeholder="${(sc.field||'status')==='status' ? '200 或 200,201 或 200-299' : '字段路径 = 期望值'}" value="${escHtml(sc.value||'')}" oninput="updateHttpSuccessCondition(${node.id},${i},'value',this.value)" />
        <button class="table-action-btn danger" style="width:22px;height:22px;flex-shrink:0" onclick="removeHttpSuccessCondition(${node.id},${i})">${icons.close}</button>
      </div>`).join('')}
      `}
    </div>`;

  return `<div class="config-section">
    <div class="config-section-title">HTTP 请求配置</div>
    <div class="config-field">
      <div class="config-field-label">请求方法 <span class="required">*</span></div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'method', this.value); renderDesigner()">
        <option ${method === 'GET' ? 'selected' : ''}>GET</option>
        <option ${method === 'POST' ? 'selected' : ''}>POST</option>
        <option ${method === 'PUT' ? 'selected' : ''}>PUT</option>
        <option ${method === 'DELETE' ? 'selected' : ''}>DELETE</option>
        <option ${method === 'PATCH' ? 'selected' : ''}>PATCH</option>
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
    ${queryParamsHtml}
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
    ${bodyTypeHtml}
    ${upstreamPreview}
  </div>
  ${successHtml}
  ${outputVarsSection}`;
}

function renderCodeConfig(node) {
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  const outputVarsSection = renderOutputVariablesSection(node);
  
  // Code node output variable declarations (similar to output node)
  if (!node.config) node.config = {};
  if (!node.config.codeOutputVars) {
    node.config.codeOutputVars = [{ name: 'result', type: 'Object', desc: '代码 return 返回的结果' }];
  }
  const codeOutputVars = node.config.codeOutputVars;
  const typeOptions = ['String', 'Integer', 'Double', 'Boolean', 'DateTime', 'Object', 'File'];
  
  const outputDeclHtml = `
    <div class="config-section" style="margin-top:var(--space-2)">
      <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">
        输出变量声明
        <button class="btn btn-ghost btn-sm" style="height:24px;font-size:11px" onclick="addCodeOutputVar(${node.id})">${icons.plus} 添加</button>
      </div>
      <div class="config-field-help" style="margin-bottom:var(--space-2)">声明代码 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">return</code> 中返回的变量名和类型，下游节点可通过 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">{{${node.code}.变量名}}</code> 引用</div>
      ${codeOutputVars.map((v, i) => {
        const curType = v.type || 'Object';
        return `
      <div class="code-output-var-row">
        <span class="var-icon type-${curType}" title="${curType}">${curType.charAt(0)}</span>
        <input class="config-input" style="flex:1;height:28px;font-size:11px;font-family:var(--font-family-mono)" placeholder="变量名" value="${escHtml(v.name)}" onchange="updateCodeOutputVar(${node.id}, ${i}, 'name', this.value); renderDesigner()" />
        <select class="assign-type-select" title="变量类型" style="height:28px;font-size:11px" onchange="updateCodeOutputVar(${node.id}, ${i}, 'type', this.value); renderDesigner()">
          ${typeOptions.map(t => `<option value="${t}"${curType === t ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
        <input class="config-input" style="flex:1;height:28px;font-size:11px" placeholder="描述" value="${escHtml(v.desc || '')}" onchange="updateCodeOutputVar(${node.id}, ${i}, 'desc', this.value)" />
        ${codeOutputVars.length > 1 ? `<button class="table-action-btn danger" style="width:22px;height:22px;flex-shrink:0" onclick="removeCodeOutputVar(${node.id}, ${i})">${icons.close}</button>` : ''}
      </div>`;
      }).join('')}
    </div>`;
  
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
      ${renderCodeEditor({
        id: `code_script_${node.id}`,
        value: node.config?.script || '// 处理逻辑\nconst result = input;\nreturn result;',
        placeholder: '// 在此编写代码，通过 inputs 获取输入数据',
        nodeId: node.id,
        minHeight: 120,
        language: node.config?.language || 'JavaScript',
        onChange: `updateNodeConfig(${node.id}, 'script', this.value)`
      })}
      <div class="config-field-help">使用 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">return { key1: val1, key2: val2 }</code> 返回多个输出变量</div>
    </div>
    ${outputDeclHtml}
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
}

function updateCodeOutputVar(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.codeOutputVars?.[index]) return;
  node.config.codeOutputVars[index][field] = value;
  designerDirty = true;
}

// --- HTTP Query Params helpers ---
function addHttpQueryParam(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.queryParams) node.config.queryParams = [];
  node.config.queryParams.push({ key: '', value: '' });
  designerDirty = true;
  renderDesigner();
}
function updateHttpQueryParam(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.queryParams?.[index]) return;
  node.config.queryParams[index][field] = value;
  designerDirty = true;
}
function removeHttpQueryParam(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.queryParams) return;
  node.config.queryParams.splice(index, 1);
  designerDirty = true;
  renderDesigner();
}

// --- HTTP Success Conditions helpers ---
function addHttpSuccessCondition(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.successConditions) node.config.successConditions = [];
  node.config.successConditions.push({ field: 'status', op: 'eq', value: '200' });
  designerDirty = true;
  renderDesigner();
}
function updateHttpSuccessCondition(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.successConditions?.[index]) return;
  node.config.successConditions[index][field] = value;
  designerDirty = true;
}
function removeHttpSuccessCondition(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.successConditions) return;
  node.config.successConditions.splice(index, 1);
  designerDirty = true;
  renderDesigner();
}

function addCodeOutputVar(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.codeOutputVars) node.config.codeOutputVars = [];
  node.config.codeOutputVars.push({ name: 'newVar', type: 'String', desc: '' });
  designerDirty = true;
  renderDesigner();
}

function removeCodeOutputVar(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.codeOutputVars) return;
  node.config.codeOutputVars.splice(index, 1);
  if (node.config.codeOutputVars.length === 0) {
    node.config.codeOutputVars = [{ name: 'result', type: 'Object', desc: '代码 return 返回的结果' }];
  }
  designerDirty = true;
  renderDesigner();
}

function renderDelayConfig(node) {
  const delayMode = node.config?.delayMode || '固定时长';
  const isFixed = delayMode === '固定时长';

  const fixedDurationField = `<div class="config-field">
      <div class="config-field-label">延迟时长</div>
      <div style="display:flex;gap:6px"><input class="config-input" type="number" value="${node.config?.delayValue || 5}" style="flex:1" onchange="updateNodeConfig(${node.id}, 'delayValue', this.value)" /><select class="config-select" style="width:80px" onchange="updateNodeConfig(${node.id}, 'delayUnit', this.value)"><option${(!node.config?.delayUnit || node.config.delayUnit === '秒') ? ' selected' : ''}>秒</option><option${(node.config?.delayUnit === '分钟') ? ' selected' : ''}>分钟</option><option${(node.config?.delayUnit === '小时') ? ' selected' : ''}>小时</option><option${(node.config?.delayUnit === '天') ? ' selected' : ''}>天</option></select></div>
      <div class="config-field-help">范围：1 秒 ~ 30 天，需输入正整数</div>
    </div>`;

  // 判断当前目标时间值是否为变量引用模式
  const delayTargetVal = node.config?.delayTarget || '';
  const isVarMode = delayTargetVal.startsWith('${');
  const dtPickerId = `delay_dt_${node.id}`;
  const varInputId = `delay_var_${node.id}`;

  // datetime-local 控件需要 "YYYY-MM-DDTHH:mm" 格式，将存储的 "YYYY-MM-DD HH:mm" 转换
  const dtLocalVal = (!isVarMode && delayTargetVal)
    ? delayTargetVal.replace(' ', 'T')
    : '';

  const targetTimeField = `<div class="config-field">
      <div class="config-field-label">目标时间</div>
      <div style="position:relative">
        <!-- 固定值模式：datetime-local 选择器 -->
        <div id="delay_fixed_wrap_${node.id}" style="${isVarMode ? 'display:none' : 'display:flex'};align-items:center;gap:6px">
          <input id="${dtPickerId}" class="config-input" type="datetime-local" value="${escHtml(dtLocalVal)}"
            style="flex:1;font-family:var(--font-family-mono)"
            onchange="(function(v){var d=new Date(v);var pad=function(n){return String(n).padStart(2,'0')};var fmt=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());updateNodeConfig(${node.id},'delayTarget',fmt)})(this.value)" />
          <button class="cond-ref-btn" style="position:static;width:28px;height:28px;flex-shrink:0" title="改为引用变量"
            onclick="(function(){document.getElementById('delay_fixed_wrap_${node.id}').style.display='none';document.getElementById('delay_var_wrap_${node.id}').style.display='flex';updateNodeConfig(${node.id},'delayTarget','')})()">⊙</button>
        </div>
        <!-- 变量引用模式：文本输入框 + 变量选择器 -->
        <div id="delay_var_wrap_${node.id}" style="${isVarMode ? 'display:flex' : 'display:none'};align-items:center;gap:6px;position:relative">
          <div style="flex:1;position:relative">
            <input id="${varInputId}" class="config-input" type="text" value="${escHtml(isVarMode ? delayTargetVal : '')}"
              placeholder="点击 ⊙ 选择变量"
              style="width:100%;padding-right:28px;font-family:var(--font-family-mono)"
              onchange="updateNodeConfig(${node.id},'delayTarget',this.value)" />
            <button class="cond-ref-btn" title="选择变量"
              onclick="showCondVarPicker('${varInputId}', ${node.id}, 'updateNodeConfig(${node.id},&quot;delayTarget&quot;,')">⊙</button>
            <div id="${varInputId}_picker" class="var-picker-dropdown" style="display:none"></div>
          </div>
          <button class="cond-ref-btn" style="position:static;width:28px;height:28px;flex-shrink:0" title="改为选择固定时间"
            onclick="(function(){document.getElementById('delay_var_wrap_${node.id}').style.display='none';document.getElementById('delay_fixed_wrap_${node.id}').style.display='flex';updateNodeConfig(${node.id},'delayTarget','')})()">📅</button>
        </div>
      </div>
      <div class="config-field-help">${isVarMode ? '引用变量模式：点击 ⊙ 选择变量，点击 📅 切换回固定时间选择' : '固定时间模式：通过日期时间选择器选择，点击 ⊙ 切换为引用变量'}；目标时间须大于当前且在 30 天内</div>
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
  const assignments = node.config?.assignments || [{ target: 'processedData', source: '', type: 'String' }];
  const typeOptions = ['String', 'Integer', 'Double', 'Boolean', 'DateTime', 'Object', 'File'];
  
  return `<div class="config-section">
    <div class="config-section-title">赋值规则</div>
    ${assignments.map((a, i) => {
      const curType = a.type || 'String';
      const curMode = a.mode || 'template'; // 'template' | 'expression'
      const isExpr = curMode === 'expression';
      const targetId = `assign_target_${node.id}_${i}`;
      const srcPlaceholder = isExpr
        ? '{{price}} * {{qty}}，支持 + - * / % ( )'
        : '文本或 {{节点.输出变量}}，多个变量拼接';
      const isOverwrite = a.target && designerVariables.some(v => v.name === a.target);
      return `
    <div class="assign-rule-row${isExpr ? ' assign-rule-expr-mode' : ''}">
      <div class="assign-rule-main">
        <div class="assign-target-wrap">
          <input id="${targetId}" class="config-input assign-target-input" placeholder="如 orderStatus" value="${escHtml(a.target)}" style="font-family:var(--font-family-mono);padding-right:26px;width:100%" oninput="updateAssignment(${node.id}, ${i}, 'target', this.value); refreshAssignOutputVars(${node.id}); checkAssignOverwrite('${targetId}')" />
          <button class="cond-ref-btn assign-target-picker-btn" title="从全局变量中选择" onclick="showAssignTargetPicker('${targetId}', ${node.id}, ${i})" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);pointer-events:auto">⊙</button>
          <div id="${targetId}_picker" class="var-picker-dropdown" style="display:none;position:fixed;z-index:9999;max-height:240px;overflow-y:auto;background:var(--md-surface-container-high);border:1px solid var(--md-outline-variant);border-radius:8px;box-shadow:var(--shadow-lg);flex-direction:column;width:260px"></div>
        </div>
        <select class="assign-type-select" title="变量类型" onchange="updateAssignment(${node.id}, ${i}, 'type', this.value); refreshAssignOutputVars(${node.id})">
          ${typeOptions.map(t => `<option value="${t}"${curType === t ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
        <span class="condition-op">=</span>
        ${renderExprEditor({
          id: `assign_src_${node.id}_${i}`,
          value: a.source,
          placeholder: srcPlaceholder,
          nodeId: node.id,
          singleLine: true,
          onChange: `updateAssignment(${node.id}, ${i}, 'source', this.value)`
        })}
        ${assignments.length > 1 ? `<button class="assign-remove-btn" title="删除此规则" onclick="removeAssignment(${node.id}, ${i})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>` : ''}
      </div>
      <div class="assign-rule-footer">
        <div class="assign-mode-switch">
          <button class="assign-mode-btn${!isExpr ? ' active' : ''}" onclick="updateAssignment(${node.id}, ${i}, 'mode', 'template'); renderDesigner()" title="原样输出，支持变量插值">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h10M4 18h12"/></svg>
            模板
          </button>
          <button class="assign-mode-btn${isExpr ? ' active' : ''}" onclick="updateAssignment(${node.id}, ${i}, 'mode', 'expression'); renderDesigner()" title="求值后输出，支持四则运算">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v18M16 3v18M3 8h18M3 16h18" stroke-linecap="round"/></svg>
            表达式
          </button>
        </div>
        ${isExpr ? '<span class="assign-expr-hint">支持 <code>+ - * / %</code> 运算、括号分组、三元 <code>? :</code></span>' : '<span class="assign-expr-hint">用 <code>{{节点.变量}}</code> 引用上游值，多个变量可直接拼接</span>'}
      </div>
      ${isOverwrite ? `<div id="${targetId}_warn" class="assign-overwrite-warn">⚠ 将覆盖已有全局变量 <strong>${escHtml(a.target)}</strong></div>` : `<div id="${targetId}_warn" class="assign-overwrite-warn" style="display:none">⚠ 将覆盖已有全局变量</div>`}
    </div>`;
    }).join('')}
    <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:var(--space-2)" onclick="addAssignment(${node.id})">${icons.plus} 添加赋值规则</button>
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
}

function updateAssignment(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.assignments) node.config.assignments = [{ target: 'processedData', source: '', type: 'String' }];
  if (node.config.assignments[index]) {
    node.config.assignments[index][field] = value;
  }
  designerDirty = true;
}

/**
 * 仅刷新赋值节点的输出变量区域，不整体 renderDesigner，避免焦点丢失
 */
function refreshAssignOutputVars(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  const panel = document.querySelector('.config-panel-body');
  if (!panel) return;
  const section = panel.querySelector('.output-vars-section');
  if (!section) return;
  const newHtml = renderOutputVariablesSection(node);
  const tmp = document.createElement('div');
  tmp.innerHTML = newHtml;
  const newSection = tmp.querySelector('.output-vars-section');
  if (newSection) {
    section.replaceWith(newSection);
  }
}

function addAssignment(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.assignments) node.config.assignments = [];
  node.config.assignments.push({ target: 'newVar', source: '', type: 'String' });
  designerDirty = true;
  renderDesigner();
}

function removeAssignment(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config?.assignments) return;
  node.config.assignments.splice(index, 1);
  if (node.config.assignments.length === 0) {
    node.config.assignments = [{ target: 'processedData', source: '', type: 'String' }];
  }
  designerDirty = true;
  renderDesigner();
}

function toggleOutputMode(nodeId, mode) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  node.config.outputMode = mode;
  // Initialize data for target mode if missing
  if (mode === 'variables' && !node.config.outputVars) {
    node.config.outputVars = [{ name: 'result', type: 'String', source: '' }];
  }
  if (mode === 'text' && !node.config.textTemplate) {
    node.config.textTemplate = '';
  }
  designerDirty = true;
  renderDesigner();
}

function updateOutputVar(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.outputVars) node.config.outputVars = [{ name: 'result', type: 'String', source: '' }];
  if (node.config.outputVars[index]) {
    node.config.outputVars[index][field] = value;
  }
  designerDirty = true;
  // Changing name or type requires refresh for output vars section
  if (field === 'name' || field === 'type') {
    renderDesigner();
  }
}

function addOutputVar(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.outputVars) node.config.outputVars = [];
  node.config.outputVars.push({ name: 'newVar', type: 'String', source: '' });
  designerDirty = true;
  renderDesigner();
}

function removeOutputVar(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config?.outputVars) return;
  node.config.outputVars.splice(index, 1);
  if (node.config.outputVars.length === 0) {
    node.config.outputVars = [{ name: 'result', type: 'String', source: '' }];
  }
  designerDirty = true;
  renderDesigner();
}

function renderOutputConfig(node) {
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  const outputVarsSection = renderOutputVariablesSection(node);
  const wfType = designerWf?.type || 'app';
  const isChat = wfType === 'chat';
  const mode = node.config?.outputMode || 'variables';
  const typeOptions = ['String', 'Integer', 'Double', 'Boolean', 'DateTime', 'Object', 'File'];

  // Variable mode content
  const outputVars = node.config?.outputVars || [{ name: 'result', type: 'String', source: '' }];
  const varModeHtml = `
    <div class="config-field">
      <div class="config-field-label">输出变量</div>
      ${outputVars.map((v, i) => {
        const curType = v.type || 'String';
        return `
    <div class="assign-rule-row">
      <div class="assign-rule-main">
        <select class="assign-type-select" title="变量类型" onchange="updateOutputVar(${node.id}, ${i}, 'type', this.value)">
          ${typeOptions.map(t => `<option value="${t}"${curType === t ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
        <input class="config-input assign-target-input" placeholder="变量名" value="${escHtml(v.name)}" style="font-family:var(--font-family-mono)" onchange="updateOutputVar(${node.id}, ${i}, 'name', this.value); renderDesigner()" />
        <span class="condition-op">=</span>
        ${renderExprEditor({
          id: `output_src_${node.id}_${i}`,
          value: v.source,
          placeholder: '{{节点.输出变量}}',
          nodeId: node.id,
          singleLine: true,
          onChange: `updateOutputVar(${node.id}, ${i}, 'source', this.value)`
        })}
        ${outputVars.length > 1 ? `<button class="assign-remove-btn" title="删除此变量" onclick="removeOutputVar(${node.id}, ${i})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>` : ''}
      </div>
      <div class="assign-rule-hint">变量名将作为下游节点引用路径，仅允许字母、数字和下划线</div>
    </div>`;
      }).join('')}
      <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:var(--space-2)" onclick="addOutputVar(${node.id})">${icons.plus} 添加输出变量</button>
    </div>`;

  // Text mode content
  const textModeHtml = `
    <div class="config-field">
      <div class="config-field-label">输出文本</div>
      ${renderExprEditor({
        id: `output_text_${node.id}`,
        value: node.config?.textTemplate || '',
        placeholder: '输出文本，支持 {{节点.变量路径}} 插入变量',
        nodeId: node.id,
        minHeight: 80,
        label: '文本模板',
        hint: '使用 {{节点.变量路径}} 插入上游变量，输出固定为 text 变量',
        onChange: `updateNodeConfig(${node.id}, 'textTemplate', this.value)`
      })}
    </div>
    <div class="config-field-help" style="margin-top:2px">文本模式下，所有内容合并输出为一个 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">text</code> 变量</div>`;

  // Chat flow reply mode content
  const replyMode = node.config?.replyMode || 'streaming';
  const chatOutputHtml = `
    <div class="config-field-help" style="background:linear-gradient(135deg,#ecfdf5 0%,#f0fdf4 100%);border:1px solid #86efac;border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);color:#166534;font-size:var(--font-size-xs)">
      💬 <strong>对话流回复模式</strong> — 此节点向用户发送回复内容，流程继续执行（非终止性）
    </div>
    <div class="config-field">
      <div class="config-field-label">回复模式</div>
      <div style="display:flex;gap:var(--space-2);margin-top:var(--space-1)">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-xs);padding:6px 10px;border:1px solid ${replyMode === 'streaming' ? 'var(--md-primary)' : 'var(--md-outline-variant)'};border-radius:var(--radius-md);background:${replyMode === 'streaming' ? 'var(--md-primary-container)' : 'transparent'};color:${replyMode === 'streaming' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)'}">
          <input type="radio" name="replyMode_${node.id}" value="streaming" ${replyMode === 'streaming' ? 'checked' : ''} onchange="updateNodeConfig(${node.id},'replyMode',this.value)" style="display:none" />
          <span>⚡ 流式文本</span>
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-xs);padding:6px 10px;border:1px solid ${replyMode === 'rich' ? 'var(--md-primary)' : 'var(--md-outline-variant)'};border-radius:var(--radius-md);background:${replyMode === 'rich' ? 'var(--md-primary-container)' : 'transparent'};color:${replyMode === 'rich' ? 'var(--md-primary)' : 'var(--md-on-surface-variant)'}">
          <input type="radio" name="replyMode_${node.id}" value="rich" ${replyMode === 'rich' ? 'checked' : ''} onchange="updateNodeConfig(${node.id},'replyMode',this.value)" style="display:none" />
          <span>📄 富文本</span>
        </label>
      </div>
      <div class="config-field-help">流式文本逐字输出，适合 LLM 回复；富文本一次性发送，支持 Markdown 格式</div>
    </div>
    <div class="config-field">
      <div class="config-field-label">回复内容</div>
      ${renderExprEditor({
        id: `output_reply_${node.id}`,
        value: node.config?.replyContent || '',
        placeholder: '输入回复内容，支持 {{节点.变量路径}} 引用上游变量',
        nodeId: node.id,
        minHeight: 80,
        hint: '此内容将直接发送给对话用户，支持变量插值',
        onChange: `updateNodeConfig(${node.id}, 'replyContent', this.value)`
      })}
    </div>`;

  if (isChat) {
    return `<div class="config-section">
    <div class="config-section-title">输出配置</div>
    ${chatOutputHtml}
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
  }

  return `<div class="config-section">
    <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">
      <span>输出配置</span>
      <div class="cond-mode-tabs">
        <button class="cond-mode-tab ${mode === 'variables' ? 'active' : ''}" onclick="toggleOutputMode(${node.id},'variables')">变量模式</button>
        <button class="cond-mode-tab ${mode === 'text' ? 'active' : ''}" onclick="toggleOutputMode(${node.id},'text')">文本模式</button>
      </div>
    </div>
    <div class="config-field">
      <div class="config-field-label">输出级别</div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'level', this.value)">
        <option ${node.config?.level === 'INFO' ? 'selected' : ''}>INFO</option>
        <option ${node.config?.level === 'WARNING' ? 'selected' : ''}>WARNING</option>
        <option ${node.config?.level === 'ERROR' ? 'selected' : ''}>ERROR</option>
      </select>
    </div>
    ${mode === 'variables' ? varModeHtml : textModeHtml}
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
}

function renderLoopConfig(node) {
  const mode = node.config?.loopMode || 'forEach';

  // Detect current loop body connection status
  const loopBodyConn = designerConnections.find(c => c.from === node.id && c.fromPort === 'loop');
  const doneConn = designerConnections.find(c => c.from === node.id && c.fromPort === 'done');
  const breakConn = designerConnections.find(c => c.from === node.id && c.fromPort === 'break');
  const loopBodyNode = loopBodyConn ? designerNodes.find(n => n.id === loopBodyConn.to) : null;
  const doneNode = doneConn ? designerNodes.find(n => n.id === doneConn.to) : null;
  const breakNode = breakConn ? designerNodes.find(n => n.id === breakConn.to) : null;
  const showBreak = node.config?.allowBreak !== false;

  const loopBodyStatus = loopBodyNode
    ? `<span style="color:#7c3aed;font-weight:600">已连接 → ${loopBodyNode.name}</span>`
    : `<span style="color:var(--md-error)">未连接 — 从底部端口拖线到循环体第一个节点</span>`;
  const doneStatus = doneNode
    ? `<span style="color:#16a34a;font-weight:600">已连接 → ${doneNode.name}</span>`
    : `<span style="color:var(--md-outline)">未连接 — 从右侧端口拖线到循环完成后的节点</span>`;
  const breakStatus = breakNode
    ? `<span style="color:#ea580c;font-weight:600">已连接 → ${breakNode.name}</span>`
    : `<span style="color:var(--md-outline)">未连接 — 从底部 Break 端口拖线到中断后的节点</span>`;

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
      ${showBreak ? `<div style="display:flex;gap:6px;align-items:flex-start">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#ea580c;color:#fff;border-radius:50%;font-size:9px;font-weight:700;flex-shrink:0;margin-top:1px">6</span>
        <span>设置 <strong>Break 条件</strong>，从<strong>底部橙色端口</strong>拖线到中断后的节点</span>
      </div>` : ''}
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
      ${showBreak ? `<div style="display:flex;align-items:center;gap:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffedd5;border:2px solid #ea580c;flex-shrink:0"></span>
        <span style="color:var(--md-on-surface-variant)">Break：${breakStatus}</span>
      </div>` : ''}
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
        <div class="config-field-label">Break 条件 <span class="required">*</span></div>
        <textarea class="expr-editor" style="min-height:36px;font-size:11px" placeholder="roomItem.stock === 0" onchange="updateNodeConfig(${node.id}, 'breakCondition', this.value)">${node.config?.breakCondition || ''}</textarea>
        <div class="config-field-help">表达式为 true 时跳出循环，进入"Break"端口连接的后续节点。支持引用循环变量，如 <code style="font-size:10px;font-family:var(--font-family-mono);background:var(--md-surface-container);padding:0 3px;border-radius:2px">\${roomItem.stock} === 0</code>、<code style="font-size:10px;font-family:var(--font-family-mono);background:var(--md-surface-container);padding:0 3px;border-radius:2px">errorCount > 5</code></div>
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
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  const outputVarsSection = renderOutputVariablesSection(node);
  const properties = node.config?.properties || [];
  
  return `<div class="config-section">
    <div class="config-section-title">MQ 发送配置</div>
    <div class="config-field">
      <div class="config-field-label">Topic <span class="required">*</span></div>
      ${renderExprEditor({
        id: `mq_topic_${node.id}`,
        value: node.config?.topic || '',
        placeholder: 'order_events 或 {{input.topicName}}',
        nodeId: node.id,
        singleLine: true,
        label: 'Topic',
        onChange: `updateNodeConfig(${node.id}, 'topic', this.value)`
      })}
      <div class="config-field-help">消息发送的目标队列或 Topic 名称</div>
    </div>
    <div class="config-field">
      <div class="config-field-label">消息 Key</div>
      ${renderExprEditor({
        id: `mq_key_${node.id}`,
        value: node.config?.messageKey || '',
        placeholder: '可选，如 {{input.orderId}}（Kafka 分区键 / RabbitMQ routing key）',
        nodeId: node.id,
        singleLine: true,
        label: '消息 Key',
        onChange: `updateNodeConfig(${node.id}, 'messageKey', this.value)`
      })}
      <div class="config-field-help">选填。Kafka 场景控制分区路由，RabbitMQ 场景作为 routing key</div>
    </div>
    <div class="config-field">
      <div class="config-field-label">消息内容 <span class="required">*</span></div>
      ${renderExprEditor({
        id: `mq_body_${node.id}`,
        value: node.config?.body || '',
        placeholder: '{"event": "order_created", "orderId": "{{input.orderId}}"}',
        nodeId: node.id,
        minHeight: 80,
        label: '消息内容',
        hint: 'JSON 格式，支持 {{变量}} 引用',
        onChange: `updateNodeConfig(${node.id}, 'body', this.value)`
      })}
      <div class="config-field-help">JSON 格式，支持 {{变量}} 引用上游节点输出</div>
    </div>
  </div>
  <div class="config-section">
    <div class="config-section-title">消息属性</div>
    <div class="config-field-help" style="margin-bottom:6px">可选，Key-Value 形式的消息属性（如 contentType、correlationId），随消息一起发送</div>
    ${properties.map((p, i) => `
    <div class="assign-rule-row" style="margin-bottom:6px">
      <div class="assign-rule-main" style="gap:6px">
        <input class="config-input" placeholder="属性名" value="${escHtml(p.key || '')}" style="flex:1;font-family:var(--font-family-mono)" onchange="updateMqProperty(${node.id}, ${i}, 'key', this.value)" />
        <span class="condition-op">=</span>
        ${renderExprEditor({
          id: `mq_prop_val_${node.id}_${i}`,
          value: p.value || '',
          placeholder: '属性值，支持 {{变量}}',
          nodeId: node.id,
          singleLine: true,
          onChange: `updateMqProperty(${node.id}, ${i}, 'value', this.value)`
        })}
        ${properties.length > 1 ? `<button class="assign-remove-btn" title="删除此属性" onclick="removeMqProperty(${node.id}, ${i})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>` : ''}
      </div>
    </div>`).join('')}
    <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:var(--space-2)" onclick="addMqProperty(${node.id})">${icons.plus} 添加属性</button>
  </div>
  ${upstreamPreview}
  ${outputVarsSection}`;
}

// --- MQ Property Helpers ---
function addMqProperty(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.properties) node.config.properties = [];
  node.config.properties.push({ key: '', value: '' });
  designerDirty = true;
  renderDesigner();
}

function removeMqProperty(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config?.properties) return;
  node.config.properties.splice(index, 1);
  designerDirty = true;
  renderDesigner();
}

function updateMqProperty(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node || !node.config?.properties?.[index]) return;
  node.config.properties[index][field] = value;
  designerDirty = true;
}

function renderSubWfConfig(node) {
  // Only show workflows that are published, allow reference, AND have authorized the current workspace
  const currentWsId = designerWsId;
  const availableWfs = Object.values(wsWorkflows).flat().filter(wf =>
    wf.allowRef && wf.status === 'published' && wf.id !== designerWfId &&
    (!wf.authorizedSpaces || wf.authorizedSpaces.length === 0 || wf.authorizedSpaces.includes(currentWsId))
  );

  // Find the selected target workflow to read its input definitions
  const targetWf = availableWfs.find(wf => wf.id == node.config?.targetWfId);
  const targetInputs = targetWf?.inputs || [];

  // Ensure inputMapping is an array of { name, value } objects
  if (!node.config) node.config = {};
  if (!node.config.inputMapping || typeof node.config.inputMapping === 'string') {
    // Migrate from old JSON string format or initialize
    let existingMap = {};
    if (typeof node.config.inputMapping === 'string' && node.config.inputMapping.trim()) {
      try { existingMap = JSON.parse(node.config.inputMapping); } catch(e) { /* ignore */ }
    }
    if (targetInputs.length > 0) {
      node.config.inputMapping = targetInputs.map(inp => ({
        name: inp.name,
        label: inp.label || inp.name,
        type: inp.type || 'String',
        required: inp.required || false,
        desc: inp.desc || '',
        value: existingMap[inp.name] || ''
      }));
    } else {
      node.config.inputMapping = [];
    }
  }

  // Sync inputMapping with target workflow's inputs when target changes
  if (targetWf && node.config.inputMapping) {
    const existingByName = {};
    node.config.inputMapping.forEach(m => { existingByName[m.name] = m.value; });
    node.config.inputMapping = targetInputs.map(inp => ({
      name: inp.name,
      label: inp.label || inp.name,
      type: inp.type || 'String',
      required: inp.required || false,
      desc: inp.desc || '',
      value: existingByName[inp.name] !== undefined ? existingByName[inp.name] : ''
    }));
  }

  const inputMapping = node.config.inputMapping || [];
  const upstreamPreview = renderUpstreamOutputPreview(node.id);
  const outputVarsSection = renderOutputVariablesSection(node);

  // Workflow output variable declarations (similar to code node)
  if (!node.config.wfOutputVars) {
    node.config.wfOutputVars = [{ name: node.config.outputVar || 'wfResult', type: 'Object', desc: '被调用工作流的返回结果' }];
  }
  const wfOutputVars = node.config.wfOutputVars;
  const wfTypeOptions = ['String', 'Integer', 'Double', 'Boolean', 'DateTime', 'Object', 'File'];
  
  const wfOutputDeclHtml = `
    <div class="config-section" style="margin-top:var(--space-2)">
      <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">
        输出变量声明
        <button class="btn btn-ghost btn-sm" style="height:24px;font-size:11px" onclick="addWfOutputVar(${node.id})">${icons.plus} 添加</button>
      </div>
      <div class="config-field-help" style="margin-bottom:var(--space-2)">声明目标工作流返回的变量名和类型，下游节点可通过 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">{{${node.code}.变量名}}</code> 引用</div>
      ${wfOutputVars.map((v, i) => {
        const curType = v.type || 'Object';
        return `
      <div class="code-output-var-row">
        <span class="var-icon type-${curType}" title="${curType}">${curType.charAt(0)}</span>
        <input class="config-input" style="flex:1;height:28px;font-size:11px;font-family:var(--font-family-mono)" placeholder="变量名" value="${escHtml(v.name)}" onchange="updateWfOutputVar(${node.id}, ${i}, 'name', this.value); renderDesigner()" />
        <select class="assign-type-select" title="变量类型" style="height:28px;font-size:11px" onchange="updateWfOutputVar(${node.id}, ${i}, 'type', this.value); renderDesigner()">
          ${wfTypeOptions.map(t => `<option value="${t}"${curType === t ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
        <input class="config-input" style="flex:1;height:28px;font-size:11px" placeholder="描述" value="${escHtml(v.desc || '')}" onchange="updateWfOutputVar(${node.id}, ${i}, 'desc', this.value)" />
        ${wfOutputVars.length > 1 ? `<button class="table-action-btn danger" style="width:22px;height:22px;flex-shrink:0" onclick="removeWfOutputVar(${node.id}, ${i})">${icons.close}</button>` : ''}
      </div>`;
      }).join('')}
    </div>`;

  const inputMappingHtml = targetWf
    ? (inputMapping.length > 0
      ? inputMapping.map((m, i) => {
          const typeBadgeMap = { String: 'S', Integer: 'I', Double: 'D', Boolean: 'B', DateTime: 'T', Object: 'O', File: 'F', 'Array[String]': 'A', 'Array[Object]': 'A' };
          const badge = typeBadgeMap[m.type] || 'S';
          return `
        <div class="subwf-param-row">
          <div class="subwf-param-left">
            <span class="var-icon type-${m.type}" title="${m.type}">${badge}</span>
            <div class="subwf-param-info">
              <div class="subwf-param-name">${escHtml(m.label || m.name)}${m.required ? ' <span style="color:var(--md-error)">*</span>' : ''}</div>
              <div class="subwf-param-desc">${escHtml(m.name)}${m.desc ? ' · ' + escHtml(m.desc) : ''}</div>
            </div>
          </div>
          <div class="subwf-param-right">
            ${renderExprEditor({
              id: `subwf_input_${node.id}_${i}`,
              value: m.value,
              placeholder: `{{节点.变量}} 或固定值`,
              nodeId: node.id,
              singleLine: true,
              onChange: `updateSubWfInputMapping(${node.id}, ${i}, this.value)`
            })}
          </div>
        </div>`;
      }).join('')
      : `<div style="text-align:center;padding:var(--space-3);color:var(--md-outline);font-size:var(--font-size-xs)">目标工作流无需输入参数</div>`)
    : `<div style="text-align:center;padding:var(--space-3);color:var(--md-outline);font-size:var(--font-size-xs)">请先选择目标工作流</div>`;

  // Version info for the target workflow
  const currentRefVersion = targetWf?.version || 0;
  const latestPublishedVersion = targetWf?.latestPublishedVersion || currentRefVersion;
  const hasNewVersion = targetWf && latestPublishedVersion > (node.config?.referencedVersion || currentRefVersion);
  const versionPolicy = node.config?.versionPolicy || 'lock';

  // Version info section
  const versionInfoHtml = targetWf ? `
    <div class="config-section" style="margin-top:var(--space-2)">
      <div class="config-section-title">版本信息</div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0">
        <div style="font-size:var(--font-size-sm)">
          <span style="color:var(--md-on-surface-variant)">当前引用：</span>
          <span style="font-weight:500">v${node.config?.referencedVersion || currentRefVersion}</span>
          ${hasNewVersion ? `<span style="margin-left:var(--space-2);font-size:var(--font-size-xs);color:var(--md-primary);cursor:pointer" onclick="showVersionUpgradeDialog(${node.id})">↑ v${latestPublishedVersion} 可用</span>` : ''}
        </div>
        ${hasNewVersion ? `<button class="btn btn-ghost btn-sm" style="height:24px;font-size:11px" onclick="showVersionUpgradeDialog(${node.id})">升级</button>` : ''}
      </div>
      <div class="config-field">
        <div class="config-field-label">版本策略</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, 'versionPolicy', this.value); renderDesigner()">
          <option value="lock" ${versionPolicy === 'lock' ? 'selected' : ''}>锁定当前版本（推荐）</option>
          <option value="follow" ${versionPolicy === 'follow' ? 'selected' : ''}>自动跟随最新发布版</option>
        </select>
        <div class="config-field-help">${versionPolicy === 'lock' ? '发布新版本时不会自动升级，由您手动确认升级' : '发布新版本时自动升级到最新发布版'}</div>
      </div>
    </div>` : '';

  return `<div class="config-section">
    <div class="config-section-title">工作流调用配置</div>
    <div class="config-field">
      <div class="config-field-label">选择工作流 <span class="required">*</span></div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, 'targetWfId', this.value); onSubWfTargetChanged(${node.id}); renderDesigner()"><option value="">请选择...</option>
        ${availableWfs.map(wf => {
          const wsName = workspaces.find(ws => ws.id === wf.wsId)?.name || '';
          return `<option value="${wf.id}" ${node.config?.targetWfId == wf.id ? 'selected' : ''}>${wf.name} (${wf.code})${wsName ? ' - ' + wsName : ''}</option>`;
        }).join('')}
      </select>
      <div class="config-field-help">仅显示已发布、允许引用、且授权当前空间的工作流</div>
    </div>
    ${availableWfs.length === 0 ? `<div style="padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-sm);font-size:var(--font-size-xs);color:var(--md-outline);text-align:center">暂无可调用的工作流。请确认目标工作流已发布、开启"允许被引用"、并授权了当前空间。</div>` : ''}
    ${versionInfoHtml}
    <div class="config-section" style="margin-top:var(--space-2)">
      <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">输入参数映射 ${targetWf && inputMapping.length > 0 ? `<span style="font-size:10px;font-weight:400;color:var(--md-outline)">来自 ${escHtml(targetWf.name)}</span>` : ''}</div>
      <div class="config-field-help" style="margin-bottom:var(--space-2)">将当前流程变量映射为目标工作流的输入参数${targetWf ? '，必填项需提供值' : ''}</div>
      ${inputMappingHtml}
    </div>
    ${wfOutputDeclHtml}
    ${upstreamPreview}
  </div>
  ${outputVarsSection}`;
}

function updateSubWfInputMapping(nodeId, index, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.inputMapping?.[index]) return;
  node.config.inputMapping[index].value = value;
  designerDirty = true;
}

function onSubWfTargetChanged(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  // Record the referenced version when a target is selected
  const targetWf = Object.values(wsWorkflows).flat().find(wf => wf.id == node.config?.targetWfId);
  if (targetWf) {
    node.config.referencedVersion = targetWf.version || 1;
    node.config.versionPolicy = node.config.versionPolicy || 'lock';
  }
  syncSubWfInputMapping(nodeId);
}

function showVersionUpgradeDialog(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  const targetWf = Object.values(wsWorkflows).flat().find(wf => wf.id == node.config?.targetWfId);
  if (!targetWf) return;
  const currentVer = node.config?.referencedVersion || 1;
  const latestVer = targetWf.latestPublishedVersion || targetWf.version || currentVer;
  // Simulate compatibility check
  const compatResult = ['compatible', 'compatible', 'compatible', 'additions', 'breaking'][Math.floor(Math.random() * 5)];
  const compatLabels = { compatible: '完全兼容', additions: '有新增参数', breaking: '接口不兼容' };
  const compatColors = { compatible: 'var(--md-primary)', additions: '#f59e0b', breaking: 'var(--md-error)' };
  const compatDescs = {
    compatible: '新版本的输入输出接口与当前版本一致，可直接升级。',
    additions: '新版本新增了可选输入参数，升级后可配置新参数。',
    breaking: '新版本的输入输出接口有变更，升级后需手动调整参数映射。'
  };
  const label = compatLabels[compatResult];
  const color = compatColors[compatResult];
  const desc = compatDescs[compatResult];

  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">版本升级</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
      <div style="font-size:var(--font-size-sm)"><span style="color:var(--md-on-surface-variant)">当前版本</span> <strong>v${currentVer}</strong></div>
      <svg style="width:20px;height:20px;color:var(--md-primary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
      <div style="font-size:var(--font-size-sm)"><span style="color:var(--md-on-surface-variant)">目标版本</span> <strong>v${latestVer}</strong></div>
    </div>
    <div style="padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-md);border-left:3px solid ${color}">
      <div style="font-size:var(--font-size-sm);font-weight:500;color:${color};margin-bottom:4px">${label}</div>
      <div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">${desc}</div>
    </div>
    ${compatResult === 'breaking' ? '<div style="margin-top:var(--space-3);padding:var(--space-3);background:rgba(239,68,68,0.08);border-radius:var(--radius-md);font-size:var(--font-size-xs);color:var(--md-error)">升级后请检查并调整输入参数映射和输出变量声明，否则可能导致运行时错误。</div>' : ''}
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="confirmVersionUpgrade(${nodeId}, ${latestVer})">${compatResult === 'breaking' ? '我已了解，确认升级' : '确认升级'}</button></div></div>`);
}

function confirmVersionUpgrade(nodeId, newVersion) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  node.config.referencedVersion = newVersion;
  designerDirty = true;
  closeModal();
  showToast('success', '版本已升级', `已升级到 v${newVersion}`);
  renderDesigner();
}

function syncSubWfInputMapping(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  // Force re-migration on next render by resetting to undefined
  const oldValue = node.config.inputMapping;
  if (typeof oldValue === 'string' || !oldValue) {
    node.config.inputMapping = undefined;
  } else {
    // Keep existing values but let renderSubWfConfig re-sync
    node.config.inputMapping = undefined;
  }
  designerDirty = true;
}

function updateWfOutputVar(nodeId, index, field, value) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.wfOutputVars?.[index]) return;
  node.config.wfOutputVars[index][field] = value;
  // Sync legacy outputVar for backward compatibility
  if (field === 'name' && index === 0) {
    node.config.outputVar = value;
  }
  designerDirty = true;
}

function addWfOutputVar(nodeId) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  if (!node.config) node.config = {};
  if (!node.config.wfOutputVars) node.config.wfOutputVars = [];
  node.config.wfOutputVars.push({ name: 'newVar', type: 'String', desc: '' });
  designerDirty = true;
  renderDesigner();
}

function removeWfOutputVar(nodeId, index) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node?.config?.wfOutputVars) return;
  node.config.wfOutputVars.splice(index, 1);
  if (node.config.wfOutputVars.length === 0) {
    node.config.wfOutputVars = [{ name: 'wfResult', type: 'Object', desc: '被调用工作流的返回结果' }];
  }
  // Sync legacy outputVar
  if (node.config.wfOutputVars.length > 0) {
    node.config.outputVar = node.config.wfOutputVars[0].name;
  }
  designerDirty = true;
  renderDesigner();
}

function renderEndConfig(node) {
  const wfType = designerWf?.type || 'app';
  const isChat = wfType === 'chat';
  return `<div class="config-section">
    <div class="config-section-title">结束配置</div>
    ${isChat ? `
    <div class="config-field-help" style="background:linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%);border:1px solid #93c5fd;border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);color:#1e3a8a;font-size:var(--font-size-xs)">
      💭 <strong>对话流结束语义</strong> — 结束当前轮次执行，会话上下文保持，等待用户下一轮输入
    </div>
    <div class="config-field">
      <div class="config-field-label">最终回复 <span style="font-size:10px;color:var(--md-outline);font-weight:400">(可选)</span></div>
      <textarea class="config-textarea" rows="2" placeholder="轮次结束时额外发送的收尾语，留空则不发送" onchange="updateNodeConfig(${node.id}, 'finalReply', this.value)">${escHtml(node.config?.finalReply || '')}</textarea>
      <div class="config-field-help">留空表示本轮最后一条回复已由 Output 节点发送</div>
    </div>` : `
    <div class="config-field">
      <div class="config-field-label">输出变量映射</div>
      <textarea class="expr-editor" placeholder='{"result": "processedData"}'>${node.config?.outputMapping || ''}</textarea>
    </div>`}
  </div>`;
}

function renderBreakNodeConfig(node) {
  const ownerLoop = getOwnerLoopNode(node.id);
  const isInLoop = !!ownerLoop;
  return `
  ${!isInLoop ? `<div class="config-section" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:var(--radius-md);padding:var(--space-3)">
    <div style="font-size:var(--font-size-xs);color:#dc2626;font-weight:600;margin-bottom:4px">⚠️ 位置错误</div>
    <div style="font-size:var(--font-size-xs);color:#7f1d1d">Break 节点只能放在循环节点的循环体内。请将此节点移入某个循环节点的循环体，或删除此节点。</div>
  </div>` : `<div class="config-section" style="background:linear-gradient(135deg,#fff7ed 0%,#fafafa 100%);border:1px solid #fed7aa;border-radius:var(--radius-md);padding:var(--space-3)">
    <div style="font-size:var(--font-size-xs);color:#ea580c;font-weight:600;margin-bottom:4px">Break 中断说明</div>
    <div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);line-height:1.8">
      <div>此节点位于循环节点「<strong>${ownerLoop.name}</strong>」的循环体内。</div>
      <div style="margin-top:4px">执行到 Break 节点时，将<strong>立即跳出当前循环</strong>，流程进入循环节点"完成"出口的后续节点。</div>
      <div style="margin-top:6px;color:#9a3412">💡 通常在 IF 条件判断的 TRUE 分支后放置 Break 节点，实现"满足条件则中断循环"的逻辑。</div>
    </div>
  </div>`}
  <div class="config-section">
    <div class="config-section-title">Break 配置</div>
    <div class="config-field">
      <div class="config-field-label">中断说明</div>
      <input class="config-input" value="${node.config?.description || ''}" placeholder="例：库存为零时停止遍历" onchange="updateNodeConfig(${node.id}, 'description', this.value)" />
      <div class="config-field-help">可选，记录此 Break 的业务含义</div>
    </div>
  </div>`;
}

function renderPlaceholderConfig(node) {
  return `
  <div class="config-section placeholder-requirement-section" style="background:linear-gradient(135deg,#f8fafc 0%,#fafafa 100%);border:1px solid #e2e8f0;border-radius:var(--radius-md);padding:var(--space-3)">
    <div style="font-size:var(--font-size-xs);color:var(--md-primary);font-weight:600;margin-bottom:8px">📋 需求描述</div>
    <div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);line-height:1.7;margin-bottom:8px">
      描述此占位节点的业务意图，帮助协作者理解需要实现什么功能，以及转换为哪种节点类型。
    </div>
    <div class="config-field" style="margin-bottom:12px">
      <div class="config-field-label">需求说明 <span class="required">*</span></div>
      <textarea class="config-textarea" rows="3" placeholder="描述此位置需要实现的业务功能，例如：调用审批系统提交审批单，传入 orderId 和金额，返回审批单号和状态" onchange="updateNodeConfig(${node.id}, 'requirementDesc', this.value)">${escHtml(node.config?.requirementDesc || '')}</textarea>
      <div class="config-field-help">清晰描述需求，方便其他协作者了解应转换为哪种节点并正确配置</div>
    </div>
    <div class="config-field" style="margin-bottom:12px">
      <div class="config-field-label">预期输入</div>
      <input class="config-input" value="${escHtml(node.config?.expectedInput || '')}" placeholder="例：orderId, amount" onchange="updateNodeConfig(${node.id}, 'expectedInput', this.value)" />
      <div class="config-field-help">期望从前序节点获取哪些数据</div>
    </div>
    <div class="config-field" style="margin-bottom:12px">
      <div class="config-field-label">预期输出</div>
      <input class="config-input" value="${escHtml(node.config?.expectedOutput || '')}" placeholder="例：approvalId, status" onchange="updateNodeConfig(${node.id}, 'expectedOutput', this.value)" />
      <div class="config-field-help">期望为后续节点提供哪些数据</div>
    </div>
    <div class="config-field">
      <div class="config-field-label">指定处理人</div>
      <input class="config-input" value="${escHtml(node.config?.assignee || '')}" placeholder="例：@张三" onchange="updateNodeConfig(${node.id}, 'assignee', this.value)" />
      <div class="config-field-help">可选，标记由谁来实现此节点的具体逻辑</div>
    </div>
  </div>
  <div class="config-section">
    <div class="config-section-title">转换建议</div>
    <div class="placeholder-convert-suggestions">
      ${renderPlaceholderConvertSuggestions(node)}
    </div>
  </div>`;
}

function renderPlaceholderConvertSuggestions(node) {
  const desc = (node.config?.requirementDesc || '').toLowerCase();
  const suggestions = [];
  if (/调用|接口|api|请求|http|rest/.test(desc)) suggestions.push({ type: 'http', name: 'HTTP 请求', icon: '🌐', reason: '需求涉及外部接口调用' });
  if (/消息|队列|mq|通知|事件发布/.test(desc)) suggestions.push({ type: 'mq', name: 'MQ 发送', icon: '📨', reason: '需求涉及消息发送' });
  if (/条件|判断|分支|如果|是否/.test(desc)) suggestions.push({ type: 'if', name: 'IF 条件', icon: '🔀', reason: '需求涉及条件判断' });
  if (/代码|脚本|计算|转换|处理|python|javascript|js/.test(desc)) suggestions.push({ type: 'code', name: '代码', icon: '💻', reason: '需求涉及自定义逻辑' });
  if (/赋值|变量|设置|映射/.test(desc)) suggestions.push({ type: 'assign', name: '赋值', icon: '📝', reason: '需求涉及变量操作' });
  if (/工作流|子流程|复用/.test(desc)) suggestions.push({ type: 'workflow', name: '工作流', icon: '🔗', reason: '需求涉及调用其他工作流' });
  if (/遍历|循环|批量|逐条|轮询/.test(desc)) suggestions.push({ type: 'loop', name: '循环', icon: '🔄', reason: '需求涉及重复处理' });
  if (/等待|延迟|定时/.test(desc)) suggestions.push({ type: 'delay', name: '延迟', icon: '⏱️', reason: '需求涉及等待' });

  if (suggestions.length === 0) {
    return '<div style="font-size:var(--font-size-xs);color:var(--md-outline);padding:var(--space-2) 0">填写需求说明后，将根据描述内容推荐合适的节点类型</div>';
  }

  return suggestions.map(s => `
    <div class="placeholder-suggest-item" onclick="convertNodeTo(${node.id}, '${s.type}')" title="点击转换为${s.name}">
      <span style="font-size:16px">${s.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:var(--md-on-surface)">${s.name}</div>
        <div style="font-size:10px;color:var(--md-on-surface-variant)">${s.reason}</div>
      </div>
      <span style="font-size:10px;color:var(--md-primary);white-space:nowrap">转换 →</span>
    </div>
  `).join('');
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
            <div class="config-field-label" style="display:flex;justify-content:space-between;align-items:center">启用告警 <label class="toggle-sm"><input type="checkbox" /><span class="toggle-sm-slider"></span></label></div>
            <div class="config-field-help">开启后，满足触发条件时将向 Phoenix 系统推送告警通知</div>
          </div>
          <div class="config-field">
            <div class="config-field-label">触发条件 <span class="required">*</span></div>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:var(--font-size-xs)">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" checked style="accent-color:var(--md-primary)"> 流程执行失败</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" checked style="accent-color:var(--md-primary)"> 流程执行超时</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点执行异常</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点转人工处理</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点挂起等待超时</label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 执行异常滞留</label>
            </div>
            <div class="config-field-help">至少选择一个触发条件</div>
          </div>
          <div class="config-field">
            <div class="config-field-label">告警级别 <span class="required">*</span></div>
            <select class="config-select">
              <option value="" disabled selected>选择 Phoenix 业务域优先级</option>
              <option>P1 - 紧急</option><option>P2 - 重要</option><option>P3 - 一般</option><option>P4 - 低</option>
            </select>
            <div class="config-field-help">获取 Phoenix 中指定业务域的优先级，不同级别对应不同通知策略</div>
          </div>
          <div class="config-field">
            <div class="config-field-label">通知人 <span class="required">*</span></div>
            <div class="alert-notify-recipients">
              <span class="alert-recipient-tag">${wf.owners && wf.owners.length > 0 ? (workspaces.find(w => w.id === wf.wsId)?.members?.find(m => m.id === wf.owners[0])?.name || '流程负责人') : '流程负责人'} <span style="color:var(--md-outline);font-size:9px">（默认）</span></span>
              <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px;min-width:auto" onclick="showAlertRecipientPicker()">+ 添加</button>
            </div>
            <div class="config-field-help">默认为流程负责人，可添加其他空间成员</div>
          </div>
          <div class="config-field">
            <div class="config-field-label">通知方式 <span class="required">*</span></div>
            <div class="alert-notify-channels">
              <label class="alert-channel-chip"><input type="checkbox" checked style="display:none" /><span class="alert-channel-label">飞书</span></label>
              <label class="alert-channel-chip"><input type="checkbox" style="display:none" /><span class="alert-channel-label">短信</span></label>
              <label class="alert-channel-chip"><input type="checkbox" style="display:none" /><span class="alert-channel-label">电话</span></label>
              <label class="alert-channel-chip"><input type="checkbox" style="display:none" /><span class="alert-channel-label">邮件</span></label>
            </div>
            <div class="config-field-help">支持多选，同时通知多个方式</div>
          </div>
          <div class="config-field"><div class="config-field-label">通知周期(分钟)</div><input class="config-input" type="number" value="5" min="1" /><div class="config-field-help">同一告警不重复发送的时间窗口</div></div>
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

      <div class="settings-section" style="border:1px solid var(--md-error-container,#ffdad6);border-radius:var(--radius-md);background:var(--md-error-container,#fff8f7);margin-top:var(--space-4)">
        <div class="settings-section-title" style="color:var(--md-error)">${icons.trash} 危险操作</div>
        <div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);margin-bottom:var(--space-3);line-height:1.6">删除后，该工作流的所有版本将被删除，此操作不可恢复。执行记录将保留。</div>
        <button class="btn btn-danger" style="width:100%" onclick="showDeleteWfFromDesigner(${wf.id})">${icons.trash} 删除此工作流</button>
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

function showAlertRecipientPicker() {
  const ws = workspaces.find(w => w.id === designerWsId);
  const members = ws ? ws.members || [] : [];
  const memberListHtml = members.length > 0 ? members.map(m => `
    <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:var(--font-size-sm)" onmouseover="this.style.background='var(--md-surface-container)'" onmouseout="this.style.background=''">
      <input type="checkbox" style="accent-color:var(--md-primary)" />
      <span style="font-weight:500">${m.name || m.userName || ''}</span>
      <span style="margin-left:auto;font-size:var(--font-size-xs);color:var(--md-outline)">${m.role === 'admin' ? '管理员' : m.role === 'editor' ? '成员' : '查看者'}</span>
    </label>`).join('') : '<div style="color:var(--md-outline);font-size:var(--font-size-sm)">暂无空间成员</div>';
  showModal(`<div class="modal" style="max-width:400px"><div class="modal-header"><h2 class="modal-title">添加通知人</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">${memberListHtml}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="closeModal();showToast('success','已添加','通知人已更新')">确认</button></div></div>`);
}

function showDeleteWfFromDesigner(wfId) {
  const wf = (wsWorkflows[designerWsId] || []).find(x => x.id === wfId); if (!wf) return;
  // Check if this workflow is referenced by other workflows
  const referencingWfs = [];
  Object.entries(wsWorkflows).forEach(([wsId, wfs]) => {
    wfs.forEach(w => {
      if (w.id === wfId) return;
      if (w._designerNodes) {
        const hasRef = w._designerNodes.some(n => n.type === 'workflow' && n.config?.targetWfId == wfId);
        if (hasRef) referencingWfs.push(w.name);
      }
    });
  });
  if (referencingWfs.length > 0) {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">无法删除</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
      <div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">该工作流被以下工作流引用，请先移除所有引用后再删除：</div></div>
      <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-md)">
        ${referencingWfs.map(name => `<div style="font-size:var(--font-size-sm);padding:4px 0;display:flex;align-items:center;gap:var(--space-2)">${icons.workflow} ${name}</div>`).join('')}
      </div>
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">我知道了</button></div></div>`);
    return;
  }
showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">删除工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
<div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">删除后，该工作流的所有版本将被删除，此操作不可恢复。执行记录将保留。${wf.runningCount > 0 ? `<br><br><strong style="color:var(--md-error)">当前有 ${wf.runningCount} 个运行中实例，删除后将被终止。</strong>` : ''}</div></div>
<div class="delete-confirm-input" style="margin-top:var(--space-4)"><label class="delete-confirm-label">请输入工作流编号以确认删除：<strong>${wf.code}</strong></label><input type="text" class="form-input" id="deleteWfConfirmDesigner" placeholder="请输入工作流编号" oninput="onDeleteWfConfirmInputDesigner(${wfId})" style="width:100%" /></div>
</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" id="confirmDeleteWfBtnDesigner" disabled style="opacity:0.5;cursor:not-allowed;pointer-events:none" onclick="deleteWfFromDesigner(${wfId})">确认删除</button></div></div>`);
  setTimeout(() => document.getElementById('deleteWfConfirmDesigner')?.focus(), 300);
}

function onDeleteWfConfirmInputDesigner(wfId) {
  const wf = (wsWorkflows[designerWsId] || []).find(x => x.id === wfId); if (!wf) return;
  const input = document.getElementById('deleteWfConfirmDesigner'), btn = document.getElementById('confirmDeleteWfBtnDesigner');
  if (input && btn) { if (input.value.trim() === wf.code) { btn.removeAttribute('disabled'); btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.style.pointerEvents = 'auto'; } else { btn.setAttribute('disabled', 'true'); btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; btn.style.pointerEvents = 'none'; } }
}

function deleteWfFromDesigner(wfId) {
  const wf = (wsWorkflows[designerWsId] || []).find(x => x.id === wfId); if (!wf) return;
  wsWorkflows[designerWsId] = (wsWorkflows[designerWsId] || []).filter(x => x.id !== wfId);
  closeModal();
  showToast('success', '删除成功', `工作流「${wf.name}」已删除，执行记录已保留`);
  designerDirty = false;
  setTimeout(forceCloseDesigner, 800);
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
function renderVersionTagHtml(ver) {
  const tags = ver.tags || [];
  if (tags.length === 0) return '';
  return tags.map(t => {
    if (t === 'rollback') return `<span class="version-tag version-tag-rollback">${icons.redo} 回滚${ver.rollbackFrom ? `自 v${ver.rollbackFrom}` : ''}</span>`;
    if (t === 'unverified') return `<span class="version-tag version-tag-unverified">${icons.alertTriangle} 未调试</span>`;
    return `<span class="version-tag">${t}</span>`;
  }).join('');
}

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
      `<div class="version-history-list">${versions.map((ver, idx) => `
        <div class="version-history-item ${ver.status === 'current' ? 'version-history-current' : ''}" onclick="viewDesignerVersion(${ver.v})" style="cursor:pointer">
          <div class="version-history-timeline">
            <div class="version-timeline-dot ${ver.status === 'current' ? 'active' : ''}"></div>
            ${idx < versions.length - 1 ? '<div class="version-timeline-line"></div>' : ''}
          </div>
          <div class="version-history-content">
            <div class="version-history-row">
              <div class="version-history-info">
                <span class="version-item-badge ${ver.status === 'current' ? 'version-current' : ''}">v${ver.v}</span>
                ${ver.status === 'current' ? '<span class="version-status-current">当前生效</span>' : ''}
                ${renderVersionTagHtml(ver)}
              </div>
              <div class="version-history-actions">
                ${ver.status === 'history' ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();viewDesignerVersion(${ver.v})" title="查看此版本">${icons.eye}<span>查看</span></button><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();showDesignerRollbackModal(${ver.v})" title="回滚到此版本">${icons.redo}<span>回滚</span></button>` : ''}
              </div>
            </div>
            <div class="version-history-meta">${ver.publishedAt} · ${ver.publisher}</div>
            ${ver.note ? `<div class="version-history-note">${ver.note}</div>` : ''}
          </div>
        </div>`).join('')}</div>`}
    </div>`;
}

function viewDesignerVersion(version) {
  const wf = designerWf;
  const ver = (wf.versions || []).find(v => v.v === version);
  if (!ver) return;
  const tagHtml = renderVersionTagHtml(ver);
  showModal(`<div class="modal" style="max-width:560px"><div class="modal-header"><h2 class="modal-title">${icons.eye} 查看历史版本</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-md)">
      <div class="content-item-icon wf-icon" style="width:36px;height:36px">${icons.workflow}</div>
      <div><div style="font-weight:500">${wf.name}</div><div style="font-size:var(--font-size-xs);color:var(--md-outline)">${wf.code}</div></div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:var(--space-2)"><span class="version-item-badge">v${ver.v}</span>${tagHtml}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3)">
      <div style="padding:var(--space-2) var(--space-3);background:var(--md-surface-container-low);border-radius:var(--radius-sm)"><div style="font-size:var(--font-size-xs);color:var(--md-outline)">发布人</div><div style="font-size:var(--font-size-sm);font-weight:500">${ver.publisher}</div></div>
      <div style="padding:var(--space-2) var(--space-3);background:var(--md-surface-container-low);border-radius:var(--radius-sm)"><div style="font-size:var(--font-size-xs);color:var(--md-outline)">发布时间</div><div style="font-size:var(--font-size-sm);font-weight:500">${ver.publishedAt}</div></div>
    </div>
    ${ver.note ? `<div style="padding:var(--space-2) var(--space-3);background:var(--md-surface-container-low);border-radius:var(--radius-sm);margin-bottom:var(--space-3)"><div style="font-size:var(--font-size-xs);color:var(--md-outline)">版本说明</div><div style="font-size:var(--font-size-sm)">${ver.note}</div></div>` : ''}
    <div style="padding:var(--space-4);background:var(--md-surface-container-low);border-radius:var(--radius-md);text-align:center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="color:var(--md-outline);margin-bottom:var(--space-2)"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3a1 1 0 0 0 1 1h4"/><path d="M18 9v3a1 1 0 0 1-1 1h-4"/><path d="M12 13v2"/></svg>
      <div style="font-size:var(--font-size-sm);color:var(--md-outline)">此为历史版本只读视图</div>
      <div style="font-size:var(--font-size-xs);color:var(--md-outline);margin-top:4px">不可编辑历史版本，如需修改请编辑当前草稿</div>
    </div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">关闭</button></div></div>`);
}

function showDesignerRollbackModal(targetVersion) {
  const wf = designerWf;
  if (!wf) return;
  const nextV = wf.version + 1;
  showModal(`<div class="modal" style="max-width:480px"><div class="modal-header"><h2 class="modal-title">${icons.redo} 确认回滚</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-md)">
      <span class="version-item-badge">v${targetVersion}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="color:var(--md-outline)"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      <span class="version-item-badge version-current">v${nextV}</span>
      <span style="font-size:var(--font-size-xs);color:var(--md-outline)">新版本</span>
    </div>
    <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-bottom:var(--space-3)">确定回滚到 v${targetVersion} 吗？系统将基于 v${targetVersion} 创建新版本 v${nextV}，当前已发布版本不受影响。</p>
    <div class="form-group"><label class="form-label">版本说明</label><textarea class="form-textarea" id="designerRollbackNote" rows="2" maxlength="200" placeholder="简要描述回滚原因">回滚至v${targetVersion}</textarea></div>
    <div style="padding:var(--space-2) var(--space-3);background:rgba(0,90,193,0.06);border-radius:var(--radius-sm);border-left:3px solid var(--md-info)">
      <div style="font-size:var(--font-size-xs);color:var(--md-info);font-weight:500">回滚后说明</div>
      <ul style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);margin:4px 0 0;padding-left:16px;line-height:1.6">
        <li>新版本 v${nextV} 将标记「回滚自 v${targetVersion}」标签</li>
        <li>当前草稿内容不受影响</li>
        <li>运行中实例不受影响，继续使用启动时版本</li>
      </ul>
    </div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="rollbackDesignerWf(${targetVersion})">确认回滚</button></div></div>`);
}

function rollbackDesignerWf(targetVersion) {
  const wf = designerWf;
  if (!wf) return;
  const rollbackNote = document.getElementById('designerRollbackNote')?.value?.trim() || `回滚至v${targetVersion}`;
  const now = new Date().toISOString();
  // Mark existing current version as history
  if (wf.versions) wf.versions.forEach(v => { if (v.status === 'current') v.status = 'history'; });
  wf.version++;
  const newVersion = { v: wf.version, status: 'current', publishedAt: now.slice(0, 16).replace('T', ' '), publisher: 'Sukey Wu', note: rollbackNote, tags: ['rollback'], rollbackFrom: targetVersion };
  if (!wf.versions) wf.versions = [];
  wf.versions.unshift(newVersion);
  wf.editedAt = now.slice(0, 16).replace('T', ' ');
  closeModal();
  showToast('success', '回滚成功', `已基于 v${targetVersion} 创建新版本 v${wf.version}，版本标记「回滚自 v${targetVersion}」`);
  renderDesigner();
}

// --- Bottom Panel ---
function renderBottomPanel() {
  if (!designerBottomPanel) return '<div class="bottom-panel"></div>';

  const problems = getProblems();
  const vars = designerVariables;
  const logs = designerDebugLog;
  const debugLogCount = logs.length;
  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return `<div class="bottom-panel open" style="height:${designerBottomPanelHeight}px">
    <div class="bottom-panel-resize-handle" onmousedown="onBottomResizeStart(event)" title="拖拽调整高度"></div>
    <div class="bottom-panel-header">
      <div class="bottom-panel-tabs">
        <div class="bottom-panel-tab ${designerBottomTab === 'problems' ? 'active' : ''}" onclick="switchBottomTab('problems')">
          ${icons.alertTriangle} 问题 ${problems.length > 0 ? `<span class="bottom-panel-tab-badge">${problems.length}</span>` : ''}
        </div>
        <div class="bottom-panel-tab ${designerBottomTab === 'debug' ? 'active' : ''}" onclick="switchBottomTab('debug')">
          ${icons.play} 调试日志 ${debugLogCount > 0 ? `<span class="bottom-panel-tab-badge">${debugLogCount}</span>` : ''}${errorCount > 0 ? `<span class="bottom-panel-tab-badge" style="background:var(--md-error-container);color:var(--md-error)">${errorCount}</span>` : ''}
        </div>
        <div class="bottom-panel-tab ${designerBottomTab === 'variables' ? 'active' : ''}" onclick="switchBottomTab('variables')">
          ${icons.hash} 全局变量 <span class="bottom-panel-tab-badge" style="background:var(--md-primary-container);color:var(--md-primary)">${vars.length}</span>
        </div>
      </div>
      <div class="bottom-panel-actions">
        ${designerBottomTab === 'debug' && logs.length > 0 ? `<div class="debug-log-filters"><span class="debug-log-chip ${designerDebugLogFilter === 'all' ? 'active' : ''}" onclick="setDebugLogFilter('all')">全部</span><span class="debug-log-chip ${designerDebugLogFilter === 'info' ? 'active' : ''}" onclick="setDebugLogFilter('info')">信息</span><span class="debug-log-chip ${designerDebugLogFilter === 'warn' ? 'active' : ''}" onclick="setDebugLogFilter('warn')">警告${warnCount > 0 ? `(${warnCount})` : ''}</span><span class="debug-log-chip ${designerDebugLogFilter === 'error' ? 'active' : ''}" onclick="setDebugLogFilter('error')">错误${errorCount > 0 ? `(${errorCount})` : ''}</span><span class="debug-log-chip ${designerDebugLogFilter === 'debug' ? 'active' : ''}" onclick="setDebugLogFilter('debug')">调试</span></div>` : ''}
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

let designerDebugLogFilter = 'all';
function setDebugLogFilter(f) { designerDebugLogFilter = f; renderDesigner(); }

function renderDebugPanel(logs) {
  if (logs.length === 0) return '<div style="text-align:center;color:var(--md-outline);padding:var(--space-6);font-size:var(--font-size-sm)">暂无调试日志，点击"调试"按钮开始</div>';
  const filtered = designerDebugLogFilter === 'all' ? logs : logs.filter(l => l.level === designerDebugLogFilter);
  const levelIcon = { info: icons.info || 'ℹ', warn: icons.alertTriangle || '⚠', error: icons.xCircle || '✕', debug: icons.code || '⚙' };
  const levelLabel = { info: 'INFO', warn: 'WARN', error: 'ERROR', debug: 'DEBUG' };
  const eventGroupIcon = {
    'workflow.started': '▶', 'workflow.finished': '⏹',
    'node.started': '→', 'node.completed': '✓', 'node.retry': '↻',
    'trigger.input': '📥',
    'http.request': '⬆', 'http.response': '⬇', 'http.error': '✕',
    'condition.eval': '🔀', 'condition.result': '🔀',
    'switch.eval': '🔃', 'switch.result': '🔃',
    'loop.start': '🔄', 'loop.iteration': '↻', 'loop.done': '✓', 'loop.break': '⛔',
    'assign.set': '📝', 'assign.empty': '⚠',
    'code.execute': '💻', 'code.output': '📤',
    'delay.wait': '⏱',
    'output.write': '📤',
    'breakpoint.hit': '🔴', 'step.paused': '👉'
  };
  if (filtered.length === 0) return `<div style="text-align:center;color:var(--md-outline);padding:var(--space-6);font-size:var(--font-size-sm)">无 ${designerDebugLogFilter.toUpperCase()} 级别的日志</div>`;
  return filtered.map((log, i) => {
    const hasDetail = log.detail && (typeof log.detail === 'object' && Object.keys(log.detail).length > 0);
    const evIcon = eventGroupIcon[log.event] || '●';
    const hasErrorInfo = log.level === 'error' && (log.errorMessage || log.suggestedFix);
    return `<div class="debug-log-item debug-log-${log.level}" onclick="${hasDetail ? `this.querySelector('.debug-log-detail')?.classList.toggle('open')` : ''}">
      <span class="debug-log-time">${log.time.split('.')[0].split(' ')[1] || log.time}</span>
      <span class="debug-log-level ${log.level}">${levelLabel[log.level] || log.level.toUpperCase()}</span>
      ${log.node ? `<span class="debug-log-node" onclick="event.stopPropagation();flashDebugNode('${escHtml(log.node)}')">${escHtml(log.node)}</span>` : ''}
      <span class="debug-log-ev">${evIcon}</span>
      <span class="debug-log-msg">${escHtml(log.message)}</span>
      ${hasDetail ? `<span class="debug-log-expand-hint">▸</span>` : ''}
      ${hasErrorInfo ? `<div class="debug-log-error-info">
        ${log.errorMessage ? `<div class="debug-log-error-reason"><span class="debug-log-error-label">原因</span><span>${escHtml(log.errorMessage)}</span></div>` : ''}
        ${log.suggestedFix ? `<div class="debug-log-error-fix"><span class="debug-log-error-label">建议</span><span>${escHtml(log.suggestedFix)}</span></div>` : ''}
      </div>` : ''}
      ${hasDetail ? `<div class="debug-log-detail"><pre class="debug-log-detail-pre">${escHtml(JSON.stringify(log.detail, null, 2))}</pre></div>` : ''}
    </div>`;
  }).join('');
}

function flashDebugNode(nodeName) {
  const node = designerNodes.find(n => n.name === nodeName);
  if (!node) return;
  selectNode(node.id);
  // Flash highlight
  const el = document.querySelector(`.canvas-node[data-id="${node.id}"]`);
  if (el) {
    el.classList.add('debug-flash');
    setTimeout(() => el.classList.remove('debug-flash'), 1200);
  }
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
  // Also include nodes connected via the 'break' port as part of the loop's scope
  const breakConn = designerConnections.find(c => c.from === loopNodeId && c.fromPort === 'break');
  if (breakConn && !visited.has(breakConn.to)) {
    bodySet.add(breakConn.to);
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
        const hasBreakOut = designerConnections.some(c => c.from === node.id && c.fromPort === 'break');
        if (!hasLoopOut) problems.push({ level: 'error', message: `循环节点「${node.name}」未连接循环体（"循环体"端口无连线）`, location: node.code, nodeId: node.id });
        if (!hasDoneOut) problems.push({ level: 'warning', message: `循环节点「${node.name}」没有"完成"出口连线，循环结束后流程无法继续`, location: node.code, nodeId: node.id });
        // Break validation: if allowBreak is enabled but no break condition set
        if (node.config?.allowBreak !== false) {
          if (!node.config?.breakCondition) {
            problems.push({ level: 'warning', message: `循环节点「${node.name}」已开启 Break 中断但未设置中断条件`, location: node.code, nodeId: node.id });
          }
          if (!hasBreakOut) {
            problems.push({ level: 'warning', message: `循环节点「${node.name}」已开启 Break 中断但"Break"端口未连接后续节点`, location: node.code, nodeId: node.id });
          }
        }
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
        const isBreakNode = node.type === 'break';
        if (!hasOut && !isLoopBodyTail && !isBreakNode) {
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
    // Break node must be inside a loop body
    if (node.type === 'break') {
      const ownerLoop = getOwnerLoopNode(node.id);
      if (!ownerLoop) {
        problems.push({ level: 'error', message: `Break 节点「${node.name}」不在任何循环节点的循环体内，无法使用`, location: node.code, nodeId: node.id });
      }
    }
    // Placeholder node warning
    if (node.type === 'placeholder') {
      const desc = node.config?.requirementDesc ? `：${node.config.requirementDesc}` : '';
      const assignee = node.config?.assignee ? `（处理人：${node.config.assignee}）` : '';
      problems.push({ level: 'warning', message: `占位节点「${node.name}」待完善${desc}${assignee}`, location: node.code, nodeId: node.id });
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
  if (designerPublishMenuOpen) { designerPublishMenuOpen = false; renderDesigner(); return; }

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
  designerActiveConfigTab = 'basic'; // reset to basic tab when switching nodes
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
  _rpCurrentWidth = 360; // reset to default width on close
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
  // For loop nodes: each output port (loop / done / break) can only have one outgoing connection
  if (fromNode && fromNode.type === 'loop' && (fromPort === 'loop' || fromPort === 'done' || fromPort === 'break')) {
    if (designerConnections.some(c => c.from === fromNodeId && c.fromPort === fromPort)) {
      const portName = fromPort === 'loop' ? '循环体' : fromPort === 'done' ? '完成' : 'Break';
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
  if (fromNode && fromNode.type === 'loop' && fromPort === 'break') {
    const breakCond = fromNode.config?.breakCondition;
    connLabel = breakCond ? `Break（${breakCond}）` : 'Break';
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
  if (designerReadonly) return;

  // Alt+click = quick delete (Unreal Blueprint style)
  if (designerAltDown) {
    deleteConnectionById(e, connId);
    return;
  }

  // Normal click = select the connection
  designerSelectedConnId = connId;
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  designerContextMenu = null;
  renderDesigner();
}

let _connLeaveTimer = null;

function onConnectionHover(e, connId) {
  // Cancel any pending leave to prevent flicker when moving to overlay button
  if (_connLeaveTimer) { clearTimeout(_connLeaveTimer); _connLeaveTimer = null; }
  if (designerHoveredConnId === connId) return;
  designerHoveredConnId = connId;
  renderDesigner();
}

function onConnectionLeave(e, connId) {
  if (designerHoveredConnId !== connId) return;
  // Delay slightly so that entering the overlay button (which sits on top) cancels this
  if (_connLeaveTimer) clearTimeout(_connLeaveTimer);
  _connLeaveTimer = setTimeout(() => {
    _connLeaveTimer = null;
    if (designerHoveredConnId !== connId) return;
    designerHoveredConnId = null;
    renderDesigner();
  }, 80);
}

function onConnectionContextMenu(e, connId) {
  e.preventDefault();
  e.stopPropagation();
  if (designerDebugMode || designerReadonly) return;
  // Right-click on connection = select it (shows toolbar), no separate context menu
  designerSelectedConnId = connId;
  designerSelectedNodeId = null;
  designerSelectedNodeIds = [];
  designerContextMenu = null;
  renderDesigner();
}

function deleteConnectionById(e, connId) {
  if (e) e.stopPropagation();
  if (designerReadonly) return;
  if (_connLeaveTimer) { clearTimeout(_connLeaveTimer); _connLeaveTimer = null; }
  const conn = designerConnections.find(c => c.id === connId);
  if (!conn) return;
  const fromNode = designerNodes.find(n => n.id === conn.from);
  const toNode = designerNodes.find(n => n.id === conn.to);
  const desc = (fromNode ? fromNode.name : '?') + ' → ' + (toNode ? toNode.name : '?');
  pushUndoState();
  designerConnections = designerConnections.filter(c => c.id !== connId);
  if (designerSelectedConnId === connId) designerSelectedConnId = null;
  if (designerHoveredConnId === connId) designerHoveredConnId = null;
  designerDirty = true;
  syncDesignerState();
  renderDesigner();
  showToast('success', '连线已删除', desc);
}

function deleteSelectedConnection() {
  if (!designerSelectedConnId) return;
  deleteConnectionById(null, designerSelectedConnId);
}

// --- Endpoint Drag Reconnect (React Flow / Node-RED style) ---
function onEndpointDragStart(e, connId, end) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  if (designerReadonly || designerDebugMode) return;

  const conn = designerConnections.find(c => c.id === connId);
  if (!conn) return;

  designerReconnecting = { connId, end };
  // Remove the original connection
  pushUndoState();
  designerConnections = designerConnections.filter(c => c.id !== connId);
  designerSelectedConnId = null;

  // Start a new connecting drag from the preserved end
  if (end === 'from') {
    // Dragging the source endpoint: keep the target, rewire the source
    // Start connecting from nothing — we need a reverse drag
    // Actually, keep target as anchor and let user click a new source output port
    // For simplicity: initiate a normal connection from the original source port
    designerConnecting = { fromNodeId: conn.from, fromPort: conn.fromPort || 'out' };
  } else {
    // Dragging the target endpoint: keep the source, rewire the target
    designerConnecting = { fromNodeId: conn.from, fromPort: conn.fromPort || 'out' };
  }

  designerDirty = true;
  syncDesignerState();
  renderDesigner();

  const label = end === 'from' ? '起点' : '终点';
  showToast('info', `重连${label}`, '请点击目标节点的端口');
}

// Keep reconnectConnectionFrom/To for right-click menu backward compatibility
function reconnectConnectionFrom(connId) {
  onEndpointDragStart(null, connId, 'from');
}

function reconnectConnectionTo(connId) {
  onEndpointDragStart(null, connId, 'to');
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
let _rpCurrentWidth = 360; // persisted panel width across renders

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
  _rpCurrentWidth = newWidth; // persist width
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
  designerPublishMenuOpen = false;
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
  if (typeof dagre === 'undefined') {
    showToast('error', '布局引擎未加载', '请检查网络连接后重试');
    return;
  }
  pushUndoState();

  // --- Dagre LR hierarchical layout (same algorithm as n8n / Dify) ---
  const NODE_W = 200;
  const NODE_H = 90;

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 80, marginx: 80, marginy: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  // Register all nodes
  designerNodes.forEach(n => {
    g.setNode(String(n.id), { width: NODE_W, height: NODE_H });
  });

  // Register all edges; give main-path edges higher weight so dagre keeps them straight
  const mainPorts = new Set(['true', 'done', 'default', null, undefined, '']);
  designerConnections.forEach(c => {
    if (!g.hasNode(String(c.from)) || !g.hasNode(String(c.to))) return;
    const isMain = mainPorts.has(c.fromPort);
    g.setEdge(String(c.from), String(c.to), { weight: isMain ? 3 : 1 });
  });

  dagre.layout(g);

  // Apply computed positions (dagre returns center coords; our canvas uses top-left)
  designerNodes.forEach(n => {
    const pos = g.node(String(n.id));
    if (pos) {
      n.x = pos.x - NODE_W / 2;
      n.y = pos.y - NODE_H / 2;
    }
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

  // Check if trigger node has input parameters → show input form first
  const triggerNode = designerNodes.find(n => n.type === 'trigger');
  const inputParams = triggerNode?.config?.inputParams || [];
  if (inputParams.length > 0) {
    showDebugInputModal(inputParams);
    return;
  }

  // No input params → start debug directly
  startDebugExecution();
}

// --- Debug Input Parameter Modal ---
function showDebugInputModal(inputParams) {
  const wf = designerWf;
  const fieldTypeToType = { shortText: 'String', longText: 'String', number: 'Integer', toggle: 'Boolean', datetime: 'DateTime', file: 'File', json: 'Object' };
  // Convert trigger inputParams to the format expected by buildWfInputFormHtml
  const inputs = inputParams.map(p => ({
    name: p.name,
    label: p.label || p.name,
    type: fieldTypeToType[p.fieldType || 'shortText'] || 'String',
    required: !!p.required,
    desc: p.desc || '',
    placeholder: p.placeholder || ''
  }));
  const reqCount = inputs.filter(i => i.required).length;
  const optCount = inputs.length - reqCount;
  const formHtml = buildWfInputFormHtml(inputs);

  showModal(`<div class="modal" style="max-width:560px"><div class="modal-header"><h2 class="modal-title">调试工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body" style="padding-bottom:0">
    <div class="exec-wf-info">
      <div class="exec-wf-info-icon">${icons.workflow}</div>
      <div class="exec-wf-info-details">
        <div class="exec-wf-info-name">${wf?.name || '工作流'}</div>
        <div class="exec-wf-info-meta">${icons.hash} ${wf?.code || ''} · 草稿 · 模拟触发</div>
      </div>
    </div>
    <div style="height:var(--space-3)"></div>
    <div class="debug-trigger-notice">
      <span class="debug-trigger-notice-icon">${icons.alertTriangle}</span>
      <span>调试模式下，定时/事件/Webhook 触发均为模拟触发，不监听真实外部事件</span>
    </div>
    <div style="height:var(--space-3)"></div>
    <div class="exec-wf-params-header"><span class="exec-wf-params-title">${icons.settings} 输入参数</span><span class="exec-wf-params-count">${reqCount > 0 ? `${reqCount} 项必填` : ''}${reqCount > 0 && optCount > 0 ? '，' : ''}${optCount > 0 ? `${optCount} 项选填` : ''}</span></div>
    <div class="wf-input-form">${formHtml}</div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="confirmDebugWithInputs()">${icons.play} 开始调试</button></div></div>`);
}

function confirmDebugWithInputs() {
  const triggerNode = designerNodes.find(n => n.type === 'trigger');
  const inputParams = triggerNode?.config?.inputParams || [];
  const fieldTypeToType = { shortText: 'String', longText: 'String', number: 'Integer', toggle: 'Boolean', datetime: 'DateTime', file: 'File', json: 'Object' };
  const inputs = inputParams.map(p => ({
    name: p.name,
    label: p.label || p.name,
    type: fieldTypeToType[p.fieldType || 'shortText'] || 'String',
    required: !!p.required,
    desc: p.desc || ''
  }));
  if (inputs.length > 0 && !validateWfInputs(inputs)) {
    showToast('error', '参数校验失败', '请填写所有必填参数');
    return;
  }
  closeModal();
  startDebugExecution();
}

function startDebugExecution() {
  designerDebugMode = true;
  designerDebugPaused = false;
  designerDebugPausedNodeId = null;
  designerDebugLog = [];

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const ms = () => String(now.getMilliseconds()).padStart(3, '0');
  let seq = 0;
  const nextTs = () => { seq++; return `${ts}.${String(seq * 37 % 1000).padStart(3, '0')}`; };

  // Reset all node debug states
  designerNodes.forEach(n => { n._debugStatus = null; });
  designerConnections.forEach(c => { c._debugActive = false; });

  // --- Generate per-node diagnostic logs ---
  function generateNodeLogs(nodes, conns, phase) {
    const logs = [];
    const typeLabel = { trigger: '触发器', http: 'HTTP 请求', code: '代码', assign: '赋值', if: 'IF 条件', switch: 'Switch', loop: '循环', delay: '延迟', output: '输出', end: '结束' };

    // Build execution order based on connections
    const triggerNode = nodes.find(n => n.type === 'trigger');
    const endNode = nodes.find(n => n.type === 'end');
    const orderedNodes = [];
    if (triggerNode) orderedNodes.push(triggerNode);

    // Simple topological sort via BFS along connections
    const visited = new Set(triggerNode ? [triggerNode.id] : []);
    const queue = triggerNode ? [triggerNode.id] : [];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const outConns = conns.filter(c => c.from === currentId);
      for (const conn of outConns) {
        const targetNode = nodes.find(n => n.id === conn.to);
        if (targetNode && !visited.has(targetNode.id)) {
          visited.add(targetNode.id);
          orderedNodes.push(targetNode);
          queue.push(targetNode.id);
        }
      }
    }
    // Add any remaining nodes not reached
    nodes.forEach(n => { if (!visited.has(n.id)) orderedNodes.push(n); });

    // --- Trigger node ---
    const trigger = orderedNodes.find(n => n.type === 'trigger');
    if (trigger) {
      const trigType = trigger.config?.triggerType || 'manual';
      const trigLabel = { manual: '手动', scheduled: '定时', event: '事件', webhook: 'Webhook' };
      const inputParams = trigger.config?.inputParams || [];
      logs.push({ time: nextTs(), level: 'info', node: trigger.name, event: 'workflow.started', message: `工作流开始执行，触发方式: ${trigLabel[trigType] || trigType}` });
      if (inputParams.length > 0) {
        const paramPreview = inputParams.map(p => `${p.name}=${p.fieldType === 'toggle' ? 'true' : p.fieldType === 'number' ? '42' : '"模拟值"'}`).join(', ');
        logs.push({ time: nextTs(), level: 'debug', node: trigger.name, event: 'trigger.input', message: `输入参数: ${paramPreview}`, detail: inputParams.map(p => ({ name: p.name, label: p.label || p.name, type: p.fieldType || 'shortText', value: p.fieldType === 'toggle' ? true : p.fieldType === 'number' ? 42 : '模拟值' })) });
      }
      logs.push({ time: nextTs(), level: 'info', node: trigger.name, event: 'node.completed', message: '触发器执行完成，耗时 2ms' });
    }

    // --- Middle nodes (skip trigger & end) ---
    const middleNodes = orderedNodes.filter(n => n.type !== 'trigger' && n.type !== 'end');
    for (const node of middleNodes) {
      const nt = typeLabel[node.type] || node.type;
      const dur = node.type === 'http' ? Math.floor(Math.random() * 300 + 50) : node.type === 'code' ? Math.floor(Math.random() * 100 + 10) : Math.floor(Math.random() * 20 + 1);

      logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.started', message: `[${nt}] 开始执行 (${node.code})` });

      switch (node.type) {
        case 'http': {
          const method = (node.config?.method || 'GET').toUpperCase();
          const url = node.config?.url || 'https://api.example.com/endpoint';
          const headers = node.config?.headers || [];
          logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'http.request', message: `${method} ${url}`, detail: { method, url, headers: headers.length > 0 ? headers : '无自定义请求头', body: node.config?.body || null } });
          // Simulate response
          const statusCode = Math.random() > 0.15 ? 200 : 500;
          if (statusCode === 200) {
            const respBody = method === 'GET' ? { data: { items: [{ id: 1, name: '示例数据', status: 'active' }], total: 1 }, status: 'ok' } : { success: true, message: '操作成功' };
            logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'http.response', message: `HTTP ${statusCode} OK，耗时 ${dur}ms`, detail: { statusCode, responseSize: JSON.stringify(respBody).length + ' 字符', body: respBody } });
            logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `HTTP 请求完成，状态码 ${statusCode}，耗时 ${dur}ms` });
          } else {
            const errMsg = 'Internal Server Error';
            logs.push({ time: nextTs(), level: 'error', node: node.name, event: 'http.error',
              message: `HTTP ${statusCode} ${errMsg}，耗时 ${dur}ms`,
              errorMessage: `远端服务器返回 ${statusCode} 错误：${errMsg}。可能原因：目标服务故障、请求参数格式错误或权限不足。`,
              suggestedFix: `1. 检查请求 URL 是否正确：${url}\n2. 确认请求参数/Body格式符合接口要求\n3. 检查鉴权 Header（如 Authorization）是否已配置\n4. 联系接口提供方确认服务状态`,
              detail: { statusCode, error: errMsg, url, method, requestHeaders: headers.length > 0 ? headers : '无自定义请求头', errorMessage: `远端服务器返回 ${statusCode}：${errMsg}`, suggestedFix: '检查URL/参数/鉴权Header，确认目标服务正常运行' } });
            logs.push({ time: nextTs(), level: 'warn', node: node.name, event: 'node.retry', message: '正在重试 (1/3)...' });
            logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `重试成功，HTTP 200，耗时 ${dur + 120}ms` });
          }
          break;
        }
        case 'if': {
          const cond = node.config?.condition || 'true';
          const result = Math.random() > 0.3;
          logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'condition.eval', message: `条件表达式: ${cond}`, detail: { expression: cond, result: result ? 'TRUE' : 'FALSE', variables: '上游输出变量已注入上下文' } });
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'condition.result', message: `条件判断结果: ${result ? 'TRUE → 进入真分支' : 'FALSE → 进入假分支'}` });
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `IF 条件评估完成，耗时 ${dur}ms` });
          break;
        }
        case 'switch': {
          const cases = node.config?.cases || [{ label: '条件1', value: 'A' }, { label: '条件2', value: 'B' }];
          const matchedIdx = 0;
          logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'switch.eval', message: `匹配模式: ${node.config?.matchMode === 'all' ? '全部匹配' : '首次匹配'}`, detail: { cases: cases.map(c => c.label || c.value), matched: cases[matchedIdx]?.label || 'Default' } });
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'switch.result', message: `匹配分支: ${cases[matchedIdx]?.label || 'Default'}` });
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `Switch 路由完成，耗时 ${dur}ms` });
          break;
        }
        case 'loop': {
          const loopMode = node.config?.loopMode || 'forEach';
          const listVar = node.config?.listVar || 'items';
          const iterCount = Math.floor(Math.random() * 5 + 2);
          const breakCond = node.config?.breakCondition;
          logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'loop.start', message: `循环模式: ${loopMode === 'forEach' ? 'ForEach 遍历' : 'While 条件循环'}`, detail: { loopMode, listVar, itemVar: node.config?.itemVar || 'item', indexVar: node.config?.indexVar || 'index', maxIterations: node.config?.maxIterations || 1000, breakCondition: breakCond || '无' } });
          // Simulate iteration logs
          const actualIters = breakCond && Math.random() > 0.5 ? Math.min(iterCount, 2) : iterCount;
          for (let i = 0; i < actualIters; i++) {
            logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'loop.iteration', message: `第 ${i + 1} 轮迭代: ${node.config?.itemVar || 'item'} = { index: ${i}, ... }` });
          }
          if (breakCond && actualIters < iterCount) {
            logs.push({ time: nextTs(), level: 'warn', node: node.name, event: 'loop.break', message: `Break 条件满足: ${breakCond}，在第 ${actualIters} 轮中断循环` });
          }
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'loop.done', message: `循环完成，共 ${actualIters} 轮迭代，耗时 ${dur + actualIters * 30}ms` });
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `循环节点执行完成` });
          break;
        }
        case 'assign': {
          const assignments = node.config?.assignments || [];
          if (assignments.length > 0) {
            const assignStr = assignments.map(a => `${a.target} = ${a.source || '""'} (${a.type || 'String'})`).join(', ');
            logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'assign.set', message: `赋值: ${assignStr}`, detail: assignments.map(a => ({ target: a.target, source: a.source || '""', type: a.type || 'String', resolvedValue: a.type === 'Integer' ? 42 : a.type === 'Boolean' ? true : '模拟赋值结果' })) });
          } else {
            logs.push({ time: nextTs(), level: 'warn', node: node.name, event: 'assign.empty', message: '未配置赋值规则，节点无实际操作' });
          }
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `赋值完成，耗时 ${dur}ms` });
          break;
        }
        case 'code': {
          const lang = node.config?.language || 'JavaScript';
          const outputVars = node.config?.outputVars || [];
          logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'code.execute', message: `执行 ${lang} 脚本`, detail: { language: lang, script: node.config?.script ? node.config.script.substring(0, 100) + '...' : '// 空脚本', outputVars: outputVars.length > 0 ? outputVars : '无输出变量定义' } });
          if (outputVars.length > 0) {
            const varStr = outputVars.map(v => `${v.name}=${v.type === 'Integer' ? 42 : v.type === 'Boolean' ? true : '"计算结果"'}`).join(', ');
            logs.push({ time: nextTs(), level: 'debug', node: node.name, event: 'code.output', message: `输出变量: ${varStr}` });
          }
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `代码执行完成，耗时 ${dur}ms` });
          break;
        }
        case 'delay': {
          const delayMs = node.config?.duration || 1000;
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'delay.wait', message: `等待 ${delayMs}ms (模拟跳过)` });
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `延迟完成，耗时 ${dur}ms` });
          break;
        }
        case 'output': {
          const level = node.config?.level || 'INFO';
          const outputMode = node.config?.outputMode || 'variables';
          const outputTemplate = node.config?.template || '';
          const logLevel = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'info';
          if (level === 'ERROR') {
            const errScenarios = [
              {
                errorMessage: `输出内容为空：节点配置的输出模板未返回有效内容（当前模式: ${outputMode})`,
                suggestedFix: `确认「输出内容」配置：${outputMode === 'variables' ? '确认引用的变量不为空，可在全局变量面板查看变量当前值' : '确认模板表达式语法正确，如 \${变量名} 格式'}`,
                detail: { outputLevel: level, outputMode, template: outputTemplate || '（未配置）', resolvedValue: null, errorMessage: '输出内容为空：节点配置的输出模板未返回有效内容', suggestedFix: '确认引用的变量不为空，上游节点是否已正确赋値' }
              },
              {
                errorMessage: `变量引用无效：输出模板中引用的变量 \`output_content\` 在当前执行上下文中未定义`,
                suggestedFix: `在「全局变量」面板中新增变量 output_content，或修改输出模板改为引用已存在的变量（如上游赋値节点的输出变量）`,
                detail: { outputLevel: level, outputMode, template: outputTemplate || '\${output_content}', resolvedValue: undefined, errorMessage: '变量引用无效：output_content 在当前执行上下文中未定义', suggestedFix: '在全局变量面板中新增该变量，或修改模板引用已存在的变量' }
              }
            ];
            const sc = errScenarios[Math.floor(Math.random() * errScenarios.length)];
            logs.push({ time: nextTs(), level: 'error', node: node.name, event: 'output.write', message: `输出级别: ${level}，模式: ${outputMode}`, errorMessage: sc.errorMessage, suggestedFix: sc.suggestedFix, detail: sc.detail });
          } else {
            const outputPreview = outputMode === 'variables' ? '{ result: "操作成功", count: 42 }' : (outputTemplate || '输出内容');
            logs.push({ time: nextTs(), level: logLevel, node: node.name, event: 'output.write', message: `输出级别: ${level}，模式: ${outputMode}`, detail: { outputLevel: level, outputMode, template: outputTemplate || '（使用默认模板）', resolvedValue: outputPreview } });
          }
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `输出完成，耗时 ${dur}ms` });
          break;
        }
        default:
          logs.push({ time: nextTs(), level: 'info', node: node.name, event: 'node.completed', message: `节点执行完成，耗时 ${dur}ms` });
      }
    }

    // --- End node ---
    if (endNode) {
      logs.push({ time: nextTs(), level: 'info', node: endNode.name, event: 'workflow.finished', message: `工作流执行完成，共 ${middleNodes.length + 1} 个节点，总耗时 ${Math.floor(Math.random() * 800 + 200)}ms` });
    }

    return logs;
  }

  // Generate all logs upfront
  const allLogs = generateNodeLogs(designerNodes, designerConnections, 'start');

  // Phase 1: Trigger node starts immediately
  designerDebugLog.push(allLogs[0]); // workflow.started
  const triggerNode = designerNodes.find(n => n.type === 'trigger');
  if (triggerNode) triggerNode._debugStatus = 'running';

  designerBottomPanel = 'debug';
  designerBottomTab = 'debug';
  renderDesigner();

  // Phase 2: Animate through nodes progressively (with breakpoint support)
  let logIdx = 1;
  let nodePhaseIdx = 0;
  const middleNodes = designerNodes.filter(n => n.type !== 'trigger' && n.type !== 'end');
  const endNode = designerNodes.find(n => n.type === 'end');

  // Store animation state so resumeDebug/stepDebug can continue
  _debugAnimState = { allLogs, logIdx, nodePhaseIdx, middleNodes, endNode, triggerNode };

  function animateNextNode() {
    if (!designerDebugMode) return;

    // Mark trigger as success on first tick
    if (nodePhaseIdx === 0) {
      if (triggerNode) triggerNode._debugStatus = 'success';
      // Push trigger remaining logs
      while (logIdx < allLogs.length && allLogs[logIdx].node === triggerNode?.name) {
        designerDebugLog.push(allLogs[logIdx++]);
      }
      nodePhaseIdx++;
      _debugAnimState.logIdx = logIdx;
      _debugAnimState.nodePhaseIdx = nodePhaseIdx;
      renderDesigner();
      _debugTimer1 = setTimeout(animateNextNode, 400);
      return;
    }

    // Animate middle nodes one by one
    const midIdx = nodePhaseIdx - 1;
    if (midIdx < middleNodes.length) {
      const node = middleNodes[midIdx];

      // --- Check breakpoint BEFORE executing the node ---
      if (node._breakpoint) {
        node._debugStatus = 'paused';
        designerDebugPaused = true;
        designerDebugPausedNodeId = node.id;
        // Add breakpoint-hit log
        designerDebugLog.push({
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String((seq + 1) * 37 % 1000).padStart(3, '0')}`,
          level: 'warn',
          node: node.name,
          event: 'breakpoint.hit',
          message: `断点命中: ${node.name} (${node.code})，执行已暂停`
        });
        // Highlight incoming connection
        const inConn = designerConnections.find(c => c.to === node.id);
        if (inConn) inConn._debugActive = true;
        _debugAnimState.logIdx = logIdx;
        _debugAnimState.nodePhaseIdx = nodePhaseIdx;
        renderDesigner();
        showToast('warning', '断点命中', `${node.name} 处已暂停，点击继续执行或单步执行`);
        return; // Stop animation, wait for user action
      }

      node._debugStatus = 'running';
      // Highlight incoming connection
      const inConn = designerConnections.find(c => c.to === node.id);
      if (inConn) inConn._debugActive = true;
      renderDesigner();

      _debugTimer1 = setTimeout(() => {
        if (!designerDebugMode) return;
        node._debugStatus = 'success';
        // Push logs for this node
        while (logIdx < allLogs.length && allLogs[logIdx].node === node.name) {
          designerDebugLog.push(allLogs[logIdx++]);
        }
        // Highlight outgoing connection
        const outConn = designerConnections.find(c => c.from === node.id);
        if (outConn) outConn._debugActive = true;
        nodePhaseIdx++;
        _debugAnimState.logIdx = logIdx;
        _debugAnimState.nodePhaseIdx = nodePhaseIdx;
        renderDesigner();
        _debugTimer1 = setTimeout(animateNextNode, 300);
      }, 500);
      return;
    }

    // End node
    if (endNode) {
      endNode._debugStatus = 'running';
      renderDesigner();
      _debugTimer1 = setTimeout(() => {
        if (!designerDebugMode) return;
        endNode._debugStatus = 'success';
        while (logIdx < allLogs.length) {
          designerDebugLog.push(allLogs[logIdx++]);
        }
        if (designerWf) designerWf.debugPassed = true;
        designerDebugPaused = false;
        designerDebugPausedNodeId = null;
        _debugAnimState = null;
        designerBottomPanel = 'debug';
        designerBottomTab = 'debug';
        renderDesigner();
        showToast('success', '调试通过', '所有节点执行成功');
      }, 400);
    }
  }

  _debugTimer1 = setTimeout(animateNextNode, 400);
}

// Debug timer ID for cleanup
let _debugTimer1 = null;

// --- Resume debug: continue to next breakpoint or end ---
function resumeDebug() {
  if (!designerDebugMode || !designerDebugPaused || !_debugAnimState) return;

  const s = _debugAnimState;
  const { allLogs, middleNodes, endNode, triggerNode } = s;
  let { logIdx, nodePhaseIdx } = s;

  // Find the currently paused node and mark it as running then success
  const pausedNode = designerNodes.find(n => n.id === designerDebugPausedNodeId);
  if (pausedNode) {
    pausedNode._debugStatus = 'running';
    renderDesigner();
  }

  designerDebugPaused = false;
  designerDebugPausedNodeId = null;

  // Continue animation with breakpoint checks
  function continueAnimate() {
    if (!designerDebugMode) return;

    // First, complete the paused node
    if (pausedNode && pausedNode._debugStatus === 'running') {
      pausedNode._debugStatus = 'success';
      // Push logs for the paused node
      while (logIdx < allLogs.length && allLogs[logIdx].node === pausedNode.name) {
        designerDebugLog.push(allLogs[logIdx++]);
      }
      // Highlight outgoing connection
      const outConn = designerConnections.find(c => c.from === pausedNode.id);
      if (outConn) outConn._debugActive = true;
      nodePhaseIdx++;
      s.logIdx = logIdx;
      s.nodePhaseIdx = nodePhaseIdx;
      renderDesigner();
      _debugTimer1 = setTimeout(continueAnimate, 300);
      return;
    }

    // Continue with remaining middle nodes
    const midIdx = nodePhaseIdx - 1;
    if (midIdx < middleNodes.length) {
      const node = middleNodes[midIdx];

      // Check breakpoint
      if (node._breakpoint) {
        node._debugStatus = 'paused';
        designerDebugPaused = true;
        designerDebugPausedNodeId = node.id;
        const now = new Date();
        designerDebugLog.push({
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`,
          level: 'warn',
          node: node.name,
          event: 'breakpoint.hit',
          message: `断点命中: ${node.name} (${node.code})，执行已暂停`
        });
        const inConn = designerConnections.find(c => c.to === node.id);
        if (inConn) inConn._debugActive = true;
        s.logIdx = logIdx;
        s.nodePhaseIdx = nodePhaseIdx;
        renderDesigner();
        showToast('warning', '断点命中', `${node.name} 处已暂停`);
        return;
      }

      node._debugStatus = 'running';
      const inConn = designerConnections.find(c => c.to === node.id);
      if (inConn) inConn._debugActive = true;
      renderDesigner();

      _debugTimer1 = setTimeout(() => {
        if (!designerDebugMode) return;
        node._debugStatus = 'success';
        while (logIdx < allLogs.length && allLogs[logIdx].node === node.name) {
          designerDebugLog.push(allLogs[logIdx++]);
        }
        const outConn = designerConnections.find(c => c.from === node.id);
        if (outConn) outConn._debugActive = true;
        nodePhaseIdx++;
        s.logIdx = logIdx;
        s.nodePhaseIdx = nodePhaseIdx;
        renderDesigner();
        _debugTimer1 = setTimeout(continueAnimate, 300);
      }, 500);
      return;
    }

    // End node
    if (endNode) {
      endNode._debugStatus = 'running';
      renderDesigner();
      _debugTimer1 = setTimeout(() => {
        if (!designerDebugMode) return;
        endNode._debugStatus = 'success';
        while (logIdx < allLogs.length) {
          designerDebugLog.push(allLogs[logIdx++]);
        }
        if (designerWf) designerWf.debugPassed = true;
        designerDebugPaused = false;
        designerDebugPausedNodeId = null;
        _debugAnimState = null;
        designerBottomPanel = 'debug';
        designerBottomTab = 'debug';
        renderDesigner();
        showToast('success', '调试通过', '所有节点执行成功');
      }, 400);
    }
  }

  _debugTimer1 = setTimeout(continueAnimate, 300);
}

// --- Step debug: execute exactly one node, then pause ---
function stepDebug() {
  if (!designerDebugMode || !designerDebugPaused || !_debugAnimState) return;

  const s = _debugAnimState;
  const { allLogs, middleNodes, endNode, triggerNode } = s;
  let { logIdx, nodePhaseIdx } = s;

  // Find the currently paused node and execute it
  const pausedNode = designerNodes.find(n => n.id === designerDebugPausedNodeId);
  if (pausedNode) {
    pausedNode._debugStatus = 'running';
    renderDesigner();
  }

  designerDebugPaused = false;
  designerDebugPausedNodeId = null;

  _debugTimer1 = setTimeout(() => {
    if (!designerDebugMode) return;

    // Complete the paused/stepped node
    if (pausedNode && pausedNode._debugStatus === 'running') {
      pausedNode._debugStatus = 'success';
      while (logIdx < allLogs.length && allLogs[logIdx].node === pausedNode.name) {
        designerDebugLog.push(allLogs[logIdx++]);
      }
      const outConn = designerConnections.find(c => c.from === pausedNode.id);
      if (outConn) outConn._debugActive = true;
      nodePhaseIdx++;
    }

    // Check if there's a next node to step into
    const midIdx = nodePhaseIdx - 1;
    if (midIdx < middleNodes.length) {
      const nextNode = middleNodes[midIdx];
      // Always pause on the next node in step mode
      nextNode._debugStatus = 'paused';
      designerDebugPaused = true;
      designerDebugPausedNodeId = nextNode.id;
      const inConn = designerConnections.find(c => c.to === nextNode.id);
      if (inConn) inConn._debugActive = true;
      const now = new Date();
      designerDebugLog.push({
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`,
        level: 'debug',
        node: nextNode.name,
        event: 'step.paused',
        message: `单步执行: 暂停于 ${nextNode.name} (${nextNode.code})`
      });
      s.logIdx = logIdx;
      s.nodePhaseIdx = nodePhaseIdx;
      renderDesigner();
    } else if (endNode) {
      // No more middle nodes, execute end node
      endNode._debugStatus = 'running';
      renderDesigner();
      _debugTimer1 = setTimeout(() => {
        if (!designerDebugMode) return;
        endNode._debugStatus = 'success';
        while (logIdx < allLogs.length) {
          designerDebugLog.push(allLogs[logIdx++]);
        }
        if (designerWf) designerWf.debugPassed = true;
        designerDebugPaused = false;
        designerDebugPausedNodeId = null;
        _debugAnimState = null;
        designerBottomPanel = 'debug';
        designerBottomTab = 'debug';
        renderDesigner();
        showToast('success', '调试通过', '所有节点执行成功');
      }, 400);
    }
  }, 500);
}

function exitDebugMode() {
  // Clear pending debug animation timers
  if (_debugTimer1) { clearTimeout(_debugTimer1); _debugTimer1 = null; }

  designerDebugMode = false;
  designerDebugPaused = false;
  designerDebugPausedNodeId = null;
  _debugAnimState = null;
  designerDebugLogFilter = 'all';
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
    showModal(`<div class="modal" style="max-width:440px"><div class="modal-header"><h2 class="modal-title" style="color:var(--md-warning)">${icons.alertTriangle} 无法发布</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
      <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6">该工作流尚未通过调试验证，请先完成调试后再发布。</p>
      <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6;margin-top:var(--space-2)">如确需发布，可使用「强制发布」功能（需 LionKing 强制发布权限）。</p>
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">关闭</button></div></div>`);
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

function showForcePublishDialog() {
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

  showModal(`<div class="modal" style="max-width:440px"><div class="modal-header"><h2 class="modal-title" style="color:var(--md-warning)">${icons.alertTriangle} 强制发布</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6">确定强制发布吗？此版本未经调试验证，可能存在执行风险。</p>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="closeModal();_doForcePublish()">确认强制发布</button></div></div>`);
}

function _doForcePublish() {
  const wf = designerWf;
  if (!wf) return;
  const newVersion = (wf.version || 0) + 1;
  if (!wf.versions) wf.versions = [];
  wf.versions.unshift({ v: newVersion, status: 'current', publishedAt: new Date().toLocaleString('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(/\//g, '-'), publisher: 'Sukey Wu', note: '强制发布', tags: ['unverified'] });
  wf.version = newVersion;
  wf.status = 'published';
  wf.debugPassed = false;
  wf._baseVersion = newVersion;
  designerDirty = false;
  showToast('success', '发布成功', `工作流已强制发布为 v${newVersion}（未调试）`);
  renderDesigner();
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
function _designerWindowBlurHandler() {
  // When window loses focus, modifier keys may not fire keyup — reset them
  if (designerAltDown || designerSpaceDown) {
    designerAltDown = false;
    designerSpaceDown = false;
    const container = document.getElementById('canvasContainer');
    if (container && !designerIsPanning) container.style.cursor = '';
    if (designerHoveredConnId) renderDesigner();
  }
}

function setupDesignerKeys() {
  // Remove previous listeners
  document.removeEventListener('keydown', designerKeyHandler);
  document.removeEventListener('keyup', designerKeyUpHandler);
  window.removeEventListener('blur', _designerWindowBlurHandler);
  if (designerActive) {
    document.addEventListener('keydown', designerKeyHandler);
    document.addEventListener('keyup', designerKeyUpHandler);
    window.addEventListener('blur', _designerWindowBlurHandler);
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

  // Alt key for quick-delete mode on connections
  if (e.key === 'Alt' && !e.repeat) {
    designerAltDown = true;
    if (designerHoveredConnId) renderDesigner();
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
    else if (designerPublishMenuOpen) { designerPublishMenuOpen = false; renderDesigner(); }
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
  if (e.key === 'Alt') {
    designerAltDown = false;
    if (designerHoveredConnId) renderDesigner();
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
  const canConvert = node.type !== 'trigger' && node.type !== 'end';
  return `<div class="designer-context-menu" style="left:${m.x}px;top:${m.y}px" onclick="event.stopPropagation()">
    <div class="context-menu-item" onclick="designerCopyNodes();closeContextMenu()">${icons.copy || icons.clipboard} 复制节点 <span class="context-menu-shortcut">Ctrl+C</span></div>
    <div class="context-menu-item" onclick="duplicateNode(${m.nodeId});closeContextMenu()">${icons.copy || icons.clipboard} 复制为副本</div>
    <div class="context-menu-divider"></div>
    ${canConvert ? `<div class="context-menu-item" onclick="showConvertNodeMenu(${m.nodeId})">🔄 转换为… <span style="margin-left:auto">▸</span></div><div class="context-menu-divider"></div>` : ''}
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
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  const currentType = node.type;
  // Filter out trigger, end, placeholder, and current type
  const convertTypes = nodeTypes.filter(t => t.type !== 'placeholder' && t.type !== 'trigger' && t.type !== 'end' && t.type !== currentType);

  // Categorize by same category for better UX
  const currentNt = nodeTypes.find(t => t.type === currentType) || {};
  const currentCategory = currentNt.category || '';
  const sameCategory = convertTypes.filter(t => t.category === currentCategory);
  const otherCategory = convertTypes.filter(t => t.category !== currentCategory);

  let listHtml = '';
  if (sameCategory.length > 0) {
    listHtml += `<div class="convert-category-label">同类节点</div>`;
    listHtml += sameCategory.map(t => {
      const migratable = getMigrationHint(currentType, t.type);
      return `<div class="context-menu-item convert-item" onclick="confirmConvertNode(${nodeId},'${t.type}')">
        <span class="convert-item-icon ${t.color || ''}">${t.icon}</span>
        <span class="convert-item-info">
          <span class="convert-item-name">${t.name}</span>
          <span class="convert-item-hint">${migratable}</span>
        </span>
      </div>`;
    }).join('');
  }
  if (otherCategory.length > 0) {
    if (sameCategory.length > 0) listHtml += `<div class="convert-category-label">其他类型</div>`;
    listHtml += otherCategory.map(t => {
      const migratable = getMigrationHint(currentType, t.type);
      return `<div class="context-menu-item convert-item" onclick="confirmConvertNode(${nodeId},'${t.type}')">
        <span class="convert-item-icon ${t.color || ''}">${t.icon}</span>
        <span class="convert-item-info">
          <span class="convert-item-name">${t.name}</span>
          <span class="convert-item-hint">${migratable}</span>
        </span>
      </div>`;
    }).join('');
  }

  showModal(`<div class="modal" style="max-width:360px"><div class="modal-header"><h2 class="modal-title">🔄 转换节点类型</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div>
    <div style="padding:8px 16px 0;font-size:11px;color:var(--md-on-surface-variant)">当前类型：${currentNt.icon || ''} ${currentNt.name || currentType}</div>
    <div class="modal-body" style="padding:4px 0;max-height:360px;overflow-y:auto">
    ${listHtml}
  </div></div>`, { allowBackdropClose: true });
  closeContextMenu();
}

// --- Migration hint for each type pair ---
function getMigrationHint(fromType, toType) {
  // Same category — likely partial migration
  const fromNt = nodeTypes.find(t => t.type === fromType) || {};
  const toNt = nodeTypes.find(t => t.type === toType) || {};
  if (fromNt.category === toNt.category && fromNt.category === '流程控制') {
    if ((fromType === 'if' && toType === 'switch') || (fromType === 'switch' && toType === 'if')) {
      return '✅ 可保留条件配置';
    }
    return '⚠️ 部分配置可保留';
  }
  if (fromNt.category === toNt.category) {
    return '⚠️ 部分配置可保留';
  }
  return '❌ 配置将重置';
}

// --- Smart config migration ---
function migrateNodeConfig(oldType, oldConfig, newType) {
  const newConfig = {};

  // IF → Switch: migrate condition to branch
  if (oldType === 'if' && newType === 'switch') {
    const mode = oldConfig.mode || 'expr';
    newConfig.mode = mode;
    if (mode === 'visual' && oldConfig.conditions) {
      // Migrate first condition as case0
      newConfig.branches = [
        { name: '条件分支', condition: oldConfig.conditions[0] || {} }
      ];
    } else {
      newConfig.branches = [
        { name: '条件分支', condition: oldConfig.condition || '' }
      ];
    }
    newConfig.matchMode = oldConfig.matchMode || 'first';
    return { config: newConfig, migratedFields: ['条件配置'], lostFields: [] };
  }

  // Switch → IF: migrate first branch condition
  if (oldType === 'switch' && newType === 'if') {
    const mode = oldConfig.mode || 'expr';
    newConfig.mode = mode;
    const branches = oldConfig.branches || [];
    if (branches.length > 0 && mode === 'visual' && branches[0].condition) {
      newConfig.conditions = [branches[0].condition];
    } else {
      newConfig.condition = branches[0]?.condition || '';
    }
    const lost = branches.length > 1 ? [`${branches.length - 1} 个多余分支`] : [];
    return { config: newConfig, migratedFields: ['首个分支条件'], lostFields: lost };
  }

  // HTTP → MQ: preserve some generic fields
  if (oldType === 'http' && newType === 'mq') {
    if (oldConfig.headers) newConfig.headers = oldConfig.headers;
    return { config: newConfig, migratedFields: ['请求头'], lostFields: ['URL', '方法', '请求体'] };
  }

  // Assign → Code: migrate variable assignments as comment hint
  if (oldType === 'assign' && newType === 'code') {
    const assignments = oldConfig.assignments || [];
    if (assignments.length > 0) {
      const varNames = assignments.map(a => a.name).filter(Boolean);
      newConfig.language = 'JavaScript';
      newConfig.script = `// 原赋值变量: ${varNames.join(', ')}\n`;
      newConfig.outputVars = assignments.map(a => ({ name: a.name || '', type: a.type || 'String', desc: a.desc || '' }));
      return { config: newConfig, migratedFields: ['变量名', '输出变量'], lostFields: ['赋值表达式'] };
    }
    return { config: newConfig, migratedFields: [], lostFields: ['赋值配置'] };
  }

  // Delay → other logic: preserve nothing specific
  if (oldType === 'delay') {
    return { config: newConfig, migratedFields: [], lostFields: ['延迟配置'] };
  }

  // Loop → IF: condition might be reusable
  if (oldType === 'loop' && newType === 'if') {
    if (oldConfig.condition) {
      newConfig.condition = oldConfig.condition;
      return { config: newConfig, migratedFields: ['循环条件表达式'], lostFields: ['循环体配置'] };
    }
    return { config: newConfig, migratedFields: [], lostFields: ['循环配置'] };
  }

  // Code → Assign: output vars might be reusable
  if (oldType === 'code' && newType === 'assign') {
    const outputVars = oldConfig.outputVars || [];
    if (outputVars.length > 0) {
      newConfig.assignments = outputVars.map(v => ({ name: v.name || '', type: v.type || 'String', desc: v.desc || '', source: '' }));
      return { config: newConfig, migratedFields: ['输出变量'], lostFields: ['脚本代码'] };
    }
    return { config: newConfig, migratedFields: [], lostFields: ['代码配置'] };
  }

  // Default: no migration
  return { config: newConfig, migratedFields: [], lostFields: ['全部配置'] };
}

// --- Port remapping when converting node type ---
function remapConnectionsAfterConvert(nodeId, oldType, newType) {
  // Port mapping rules:
  // IF: outputs = true, false
  // Switch: outputs = case0, case1, ..., caseDefault
  // Loop: outputs = loop, done
  // Others: outputs = out
  // Input is always 'in'

  const outConns = designerConnections.filter(c => c.from === nodeId);

  outConns.forEach(conn => {
    const fp = conn.fromPort || 'out';

    // Map from specific output ports to generic 'out'
    if (newType !== 'if' && newType !== 'switch' && newType !== 'loop') {
      // Target type has only 'out' port
      if (fp !== 'out') {
        conn.fromPort = 'out';
        conn.label = '';
      }
    }

    // IF → Switch: true→case0, false→case1
    if (oldType === 'if' && newType === 'switch') {
      if (fp === 'true') { conn.fromPort = 'case0'; conn.label = '分支1'; }
      else if (fp === 'false') { conn.fromPort = 'case1'; conn.label = '分支2'; }
    }

    // Switch → IF: case0→true, case1→false, others→true
    if (oldType === 'switch' && newType === 'if') {
      if (fp === 'case0') { conn.fromPort = 'true'; conn.label = 'TRUE'; }
      else if (fp === 'case1') { conn.fromPort = 'false'; conn.label = 'FALSE'; }
      else if (fp.startsWith('case') || fp === 'caseDefault') { conn.fromPort = 'true'; conn.label = 'TRUE'; }
    }

    // Loop → other: loop→out, done→out (merge into single output)
    if (oldType === 'loop' && newType !== 'loop') {
      if (fp === 'loop' || fp === 'done') {
        conn.fromPort = 'out';
        conn.label = '';
      }
    }

    // Any → Loop: out→done (main flow goes to 'done', user reconnects 'loop' manually)
    if (newType === 'loop' && oldType !== 'loop') {
      if (fp === 'out' || fp === 'true' || fp === 'false') {
        conn.fromPort = 'done';
        conn.label = '完成';
      }
    }
  });
}

// --- Confirm conversion dialog ---
function confirmConvertNode(nodeId, newType) {
  const node = designerNodes.find(n => n.id === nodeId);
  if (!node) return;
  const oldType = node.type;
  const newNt = nodeTypes.find(t => t.type === newType);
  if (!newNt) return;

  // Skip confirmation for placeholder (no config to lose)
  if (oldType === 'placeholder') {
    convertNodeTo(nodeId, newType);
    return;
  }

  const migration = migrateNodeConfig(oldType, node.config || {}, newType);
  const hasMigrated = migration.migratedFields.length > 0;
  const hasLost = migration.lostFields.length > 0;

  // Build warning message
  let warningHtml = '';
  if (hasMigrated) {
    warningHtml += `<div class="convert-warn-item convert-warn-keep">✅ 保留: ${migration.migratedFields.join('、')}</div>`;
  }
  if (hasLost) {
    warningHtml += `<div class="convert-warn-item convert-warn-lose">⚠️ 丢失: ${migration.lostFields.join('、')}</div>`;
  }
  if (!hasMigrated && !hasLost) {
    warningHtml += `<div class="convert-warn-item convert-warn-lose">⚠️ 当前节点无配置，转换后需重新配置</div>`;
  }

  // Check connections that will be affected
  const affectedConns = designerConnections.filter(c => c.from === nodeId);
  let connWarningHtml = '';
  if (affectedConns.length > 0) {
    const portMap = getPortRemapSummary(oldType, newType);
    if (portMap) {
      connWarningHtml = `<div class="convert-warn-section">连线变更</div>${portMap}`;
    }
  }

  showModal(`<div class="modal" style="max-width:380px">
    <div class="modal-header">
      <h2 class="modal-title">🔄 确认转换</h2>
      <button class="modal-close" onclick="closeModal()">${icons.close}</button>
    </div>
    <div class="modal-body" style="padding:16px">
      <div style="font-size:13px;color:var(--md-on-surface);margin-bottom:12px">
        将 <strong>${node.name}</strong> 从
        <span class="convert-type-badge ${(nodeTypes.find(t=>t.type===oldType)||{}).color||''}">${(nodeTypes.find(t=>t.type===oldType)||{}).icon||''} ${(nodeTypes.find(t=>t.type===oldType)||{}).name||oldType}</span>
        转换为
        <span class="convert-type-badge ${newNt.color||''}">${newNt.icon} ${newNt.name}</span>
      </div>
      <div class="convert-warn-box">
        <div class="convert-warn-section">配置迁移</div>
        ${warningHtml}
      </div>
      ${connWarningHtml ? `<div class="convert-warn-box">${connWarningHtml}</div>` : ''}
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">取消</button>
        <button class="btn btn-primary btn-sm" onclick="convertNodeTo(${nodeId},'${newType}');closeModal()">确认转换</button>
      </div>
    </div>
  </div>`, { allowBackdropClose: true });
}

// --- Port remap summary for confirmation dialog ---
function getPortRemapSummary(oldType, newType) {
  const map = [];
  if (oldType === 'if' && newType === 'switch') {
    map.push({ from: 'TRUE', to: '分支1 (case0)' });
    map.push({ from: 'FALSE', to: '分支2 (case1)' });
  } else if (oldType === 'switch' && newType === 'if') {
    map.push({ from: 'Case 分支', to: 'TRUE / FALSE' });
  } else if (oldType === 'loop') {
    map.push({ from: '循环体 / 完成', to: '输出 (out)' });
  } else if (newType === 'loop') {
    map.push({ from: '输出', to: '完成 (done)' });
  } else if (oldType === 'if' || oldType === 'switch') {
    map.push({ from: '分支端口', to: '输出 (out)' });
  }

  if (map.length === 0) return '';
  return map.map(m => `<div class="convert-warn-item convert-warn-remap">${m.from} → ${m.to}</div>`).join('');
}

function convertNodeTo(nodeId, newType) {
  const node = designerNodes.find(n => n.id === nodeId);
  const nt = nodeTypes.find(t => t.type === newType);
  if (!node || !nt) return;

  const oldType = node.type;
  const oldConfig = { ...node.config };

  // Smart config migration
  const migration = migrateNodeConfig(oldType, oldConfig, newType);

  node.type = newType;
  node.name = nt.name;
  node.code = nt.code + '_' + nodeId;
  node.config = migration.config;

  // Remap connections
  remapConnectionsAfterConvert(nodeId, oldType, newType);

  designerDirty = true;
  closeModal();
  renderDesigner();

  // Show result toast
  const migratedInfo = migration.migratedFields.length > 0 ? `已保留: ${migration.migratedFields.join('、')}` : '';
  showToast('success', '节点已转换', `${node.name}${migratedInfo ? ' · ' + migratedInfo : ''}`);
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

// --- Node Advanced Config: Check if non-default values exist (for blue dot indicator) ---
function checkHasAdvancedValues(node) {
  const c = node.config || {};
  // Common fields
  if (c._mergeStrategy || c._timeout || c._retryCount || c._retryInterval || c._retryDegradation ||
      c._errorBehavior || c._note || c._suspendTimeout || c._alertOverride) return true;
  // Type-specific fields
  switch (node.type) {
    case 'trigger':
      if (c.preventConcurrent === false) return true; // default is true
      break;
    case 'http':
      if (c.suspendCallback || c.callbackTimeout) return true;
      break;
    case 'mq':
      break;
    case 'loop':
      if (c.iterationTimeout || c.iterationErrorBehavior) return true;
      break;
    case 'delay':
      if (c.suspendTimeout) return true;
      break;
    case 'workflow':
      // _timeout already checked above, default 300
      if (c._timeout && c._timeout !== 300) return true;
      break;
  }
  return false;
}

// --- Node Config Tab Switch ---
function switchNodeConfigTab(tab) {
  designerActiveConfigTab = tab; // persist so renderDesigner() restores correct tab
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
  let html = '';

  // Node-type-specific advanced sections
  switch (node.type) {
    case 'trigger':
      html += renderTriggerAdvancedConfig(node);
      break;
    case 'end':
      html += renderEndAdvancedConfig(node);
      break;
    case 'http':
      html += renderHttpAdvancedConfig(node);
      break;
    case 'mq':
      html += renderMqAdvancedConfig(node);
      break;
    case 'loop':
      html += renderLoopAdvancedConfig(node);
      break;
    case 'workflow':
      html += renderSubWfAdvancedConfig(node);
      break;
    case 'delay':
      html += renderDelayAdvancedConfig(node);
      break;
    default:
      // if, switch, assign, output, code, placeholder
      html += renderCommonAdvancedConfig(node);
      break;
  }

  // All non-trigger/end nodes have an alert override section
  if (node.type !== 'trigger' && node.type !== 'end') {
    html += renderAlertOverrideSection(node);
  }

  // All nodes have a 备注 section
  html += `
    <div class="config-section">
      <div class="config-section-title">备注</div>
      <div class="config-field">
        <textarea class="config-textarea" rows="3" placeholder="输入节点备注，用于描述节点的业务含义" onchange="updateNodeConfig(${node.id}, '_note', this.value)">${node.config?._note || ''}</textarea>
      </div>
    </div>`;

  return html;
}

// --- Shared: Error Handling Section ---
function renderErrorHandlingSection(node, opts) {
  const options = opts || {};
  const isSubWorkflow = options.isSubWorkflow || false;
  const errorBehavior = node.config?._errorBehavior || 'stop';
  const retryCount = node.config?._retryCount || 3;
  const retryInterval = node.config?._retryInterval || 5;
  const retryDegradation = node.config?._retryDegradation || 'stop';

  let html = `
    <div class="config-section">
      <div class="config-section-title">错误处理</div>
      <div class="config-field">
        <div class="config-field-label">错误时行为</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, '_errorBehavior', this.value); renderDesigner()">
          <option value="stop" ${errorBehavior === 'stop' ? 'selected' : ''}>终止流程</option>
          <option value="continue" ${errorBehavior === 'continue' ? 'selected' : ''}>忽略并继续</option>
          <option value="retry" ${errorBehavior === 'retry' ? 'selected' : ''}>自动重试</option>
          <option value="manual" ${errorBehavior === 'manual' ? 'selected' : ''}>转人工处理</option>
          <option value="callback" ${errorBehavior === 'callback' ? 'selected' : ''}>挂起等待回调</option>
        </select>
        <div class="config-field-help">${isSubWorkflow ? '子流程节点执行异常时的处理策略' : '节点执行异常时的处理策略'}</div>
      </div>
      ${errorBehavior === 'retry' ? `
      <div class="config-field">
        <div class="config-field-label">重试次数</div>
        <input class="config-input" type="number" value="${retryCount}" min="1" max="10" onchange="updateNodeConfig(${node.id}, '_retryCount', parseInt(this.value))" />
        <div class="config-field-help">默认 3 次</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">重试间隔 (秒)</div>
        <input class="config-input" type="number" value="${retryInterval}" min="1" max="300" onchange="updateNodeConfig(${node.id}, '_retryInterval', parseInt(this.value))" />
        <div class="config-field-help">默认 5 秒</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">重试用尽后降级策略</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, '_retryDegradation', this.value)">
          <option value="stop" ${retryDegradation === 'stop' ? 'selected' : ''}>终止流程</option>
          <option value="continue" ${retryDegradation === 'continue' ? 'selected' : ''}>忽略并继续</option>
          <option value="manual" ${retryDegradation === 'manual' ? 'selected' : ''}>转人工处理</option>
        </select>
      </div>
      ` : ''}
      ${errorBehavior === 'callback' || errorBehavior === 'manual' ? `
      <div class="config-field">
        <div class="config-field-label">挂起等待超时 (小时)</div>
        <input class="config-input" type="number" value="${node.config?._suspendTimeout || 24}" min="1" max="720" onchange="updateNodeConfig(${node.id}, '_suspendTimeout', parseInt(this.value))" />
        <div class="config-field-help">等待外部回调或人工处理的最大时长，超时后触发异常策略（默认 24 小时）</div>
      </div>
      ` : ''}
    </div>`;

  return html;
}

// --- Shared: Merge Strategy Field ---
function renderMergeStrategyField(node) {
  const ms = node.config?._mergeStrategy || 'all';
  return `
    <div class="config-field">
      <div class="config-field-label">汇合策略</div>
      <select class="config-select" onchange="updateNodeConfig(${node.id}, '_mergeStrategy', this.value)">
        <option value="all" ${ms === 'all' ? 'selected' : ''}>等待全部 (Wait All)</option>
        <option value="any" ${ms === 'any' ? 'selected' : ''}>任一完成 (Any)</option>
      </select>
      <div style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);margin-top:4px">当有多条输入连线时，决定何时执行此节点</div>
    </div>`;
}

// --- Shared: Alert Override Section (Node-level) ---
function renderAlertOverrideSection(node) {
  const alertOverride = node.config?._alertOverride || false;
  let html = `
    <div class="config-section">
      <div class="config-section-title" style="display:flex;align-items:center;justify-content:space-between">${icons.alertTriangle} 告警 <span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant);font-weight:400;margin-right:auto;margin-left:4px">覆盖全局设置</span> <label class="toggle-sm" style="margin-left:auto"><input type="checkbox" ${alertOverride ? 'checked' : ''} onchange="updateNodeConfig(${node.id}, '_alertOverride', this.checked); renderDesigner()" /><span class="toggle-sm-slider"></span></label></div>
      <div class="config-field-help" style="margin-bottom:var(--space-2)">开启后可覆盖工作流级告警配置，仅对此节点生效</div>
      ${alertOverride ? `
      <div class="config-field">
        <div class="config-field-label">启用告警</div>
        <div style="display:flex;align-items:center;gap:10px"><label class="toggle-sm"><input type="checkbox" checked /><span class="toggle-sm-slider"></span></label><span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">开启后，此节点异常时触发告警</span></div>
      </div>
      <div class="config-field">
        <div class="config-field-label">触发条件</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:var(--font-size-xs)">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点执行异常</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点转人工处理</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" style="accent-color:var(--md-primary)"> 节点挂起等待超时</label>
        </div>
      </div>
      <div class="config-field">
        <div class="config-field-label">通知人</div>
        <div class="alert-notify-recipients">
          <span class="alert-recipient-tag">流程负责人 <span style="color:var(--md-outline);font-size:9px">（默认）</span></span>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px;min-width:auto" onclick="showToast('info','添加通知人','选择空间成员作为额外通知人')">+ 添加</button>
        </div>
      </div>
      ` : ''}
    </div>`;
  return html;
}

// --- Common Advanced Config (if, switch, assign, output, code, placeholder) ---
function renderCommonAdvancedConfig(node) {
  const timeout = node.config?._timeout || 30;

  let html = `
    <div class="config-section">
      <div class="config-section-title">执行策略</div>
      <div class="config-field">
        <div class="config-field-label">超时时间 (秒)</div>
        <input class="config-input" type="number" value="${timeout}" min="1" max="3600" onchange="updateNodeConfig(${node.id}, '_timeout', parseInt(this.value))" />
        <div class="config-field-help">节点执行的最大等待时间，超时后触发异常处理（默认 30 秒）</div>
      </div>
      ${renderMergeStrategyField(node)}
    </div>`;

  html += renderErrorHandlingSection(node);
  return html;
}

// --- Trigger Advanced Config ---
function renderTriggerAdvancedConfig(node) {
  // Trigger is the entry point — no execution timeout, no merge strategy, no error handling
  // Only provide trigger-specific advanced options
  return `
    <div class="config-section">
      <div class="config-section-title">触发器高级设置</div>
      <div class="config-field">
        <div style="display:flex;align-items:center;gap:10px">
          <label class="toggle-sm"><input type="checkbox" ${node.config?.preventConcurrent !== false ? 'checked' : ''} onchange="updateNodeConfig(${node.id}, 'preventConcurrent', this.checked)" /><span class="toggle-sm-slider"></span></label>
          <span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">防止并发触发（同一时刻只允许一个实例运行）</span>
        </div>
      </div>
    </div>`;
}

// --- End Advanced Config ---
function renderEndAdvancedConfig(node) {
  // End node is the termination point — minimal advanced config
  return '';
}

// --- HTTP Advanced Config ---
function renderHttpAdvancedConfig(node) {
  const timeout = node.config?._timeout || 30;
  const suspendCallback = node.config?.suspendCallback || false;
  const callbackTimeout = node.config?.callbackTimeout || 24;
  // mock callback URL for prototype
  const callbackUrl = `https://beaver.example.com/api/v1/workflow/callback/{{instanceId}}`;

  let html = `
    <div class="config-section">
      <div class="config-section-title">执行策略</div>
      <div class="config-field">
        <div class="config-field-label">超时时间 (秒)</div>
        <input class="config-input" type="number" value="${timeout}" min="1" max="3600" onchange="updateNodeConfig(${node.id}, '_timeout', parseInt(this.value))" />
        <div class="config-field-help">${suspendCallback ? 'HTTP 请求发送阶段的最大等待时间（开启挂起后，响应等待改为回调超时控制）' : 'HTTP 请求的最大等待时间（默认 30 秒）'}</div>
      </div>
      ${renderMergeStrategyField(node)}
    </div>
    <div class="config-section">
      <div class="config-section-title">挂起等待回调</div>
      <div class="config-field">
        <div style="display:flex;align-items:center;gap:10px">
          <label class="toggle-sm"><input type="checkbox" ${suspendCallback ? 'checked' : ''} onchange="updateNodeConfig(${node.id}, 'suspendCallback', this.checked); renderDesigner()" /><span class="toggle-sm-slider"></span></label>
          <span style="font-size:var(--font-size-xs);color:var(--md-on-surface-variant)">开启后请求发送后节点挂起，等待外部系统通过回调 URL 返回结果</span>
        </div>
      </div>
      ${suspendCallback ? `
      <div class="config-field">
        <div class="config-field-label">回调超时 (小时)</div>
        <input class="config-input" type="number" value="${callbackTimeout}" min="1" max="720" onchange="updateNodeConfig(${node.id}, 'callbackTimeout', parseInt(this.value))" />
        <div class="config-field-help">等待回调的最长时间，超时未收到回调触发异常策略（默认 24 小时）</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">回调 URL <span style="font-size:10px;color:var(--md-outline);font-weight:400;margin-left:4px">只读 · 复制给外部系统</span></div>
        <div style="display:flex;align-items:center;gap:6px">
          <input class="config-input" readonly value="${callbackUrl}" style="font-family:var(--font-family-mono);font-size:11px;color:var(--md-on-surface-variant);cursor:pointer;background:var(--md-surface-container)" onclick="navigator.clipboard.writeText('${callbackUrl}').then(()=>showToast('回调 URL 已复制'))" title="点击复制" />
          <button class="btn btn-ghost btn-sm" style="flex-shrink:0;height:32px" onclick="navigator.clipboard.writeText('${callbackUrl}').then(()=>showToast('回调 URL 已复制'))" title="复制">${icons.copy || '📋'}</button>
        </div>
        <div class="config-field-help">外部系统调用此 URL 并传入 <code style="background:var(--md-surface-container);padding:0 3px;border-radius:2px">{"success":true,"data":{...}}</code> 以恢复流程</div>
      </div>
      ` : ''}
    </div>`;

  html += renderErrorHandlingSection(node);
  return html;
}

// --- MQ Advanced Config ---
function renderMqAdvancedConfig(node) {
  const timeout = node.config?._timeout || 30;

  let html = `
    <div class="config-section">
      <div class="config-section-title">执行策略</div>
      <div class="config-field">
        <div class="config-field-label">节点超时 (秒)</div>
        <input class="config-input" type="number" value="${timeout}" min="1" max="3600" onchange="updateNodeConfig(${node.id}, '_timeout', parseInt(this.value))" />
        <div class="config-field-help">消息发送的最大等待时间（默认 30 秒）</div>
      </div>
      ${renderMergeStrategyField(node)}
    </div>`;

  html += renderErrorHandlingSection(node);
  return html;
}

// --- Loop Advanced Config ---
function renderLoopAdvancedConfig(node) {
  const timeout = node.config?._timeout || 30;
  const iterationTimeout = node.config?.iterationTimeout || 300;

  let html = `
    <div class="config-section">
      <div class="config-section-title">执行策略</div>
      <div class="config-field">
        <div class="config-field-label">节点超时 (秒)</div>
        <input class="config-input" type="number" value="${timeout}" min="1" max="3600" onchange="updateNodeConfig(${node.id}, '_timeout', parseInt(this.value))" />
      </div>
      <div class="config-field">
        <div class="config-field-label">单次迭代超时 (秒)</div>
        <input class="config-input" type="number" value="${iterationTimeout}" min="1" max="3600" onchange="updateNodeConfig(${node.id}, 'iterationTimeout', parseInt(this.value))" />
        <div class="config-field-help">单次循环体执行的最大时间，超时视为该次迭代失败（默认 300 秒）</div>
      </div>
      <div class="config-field">
        <div class="config-field-label">迭代错误时行为</div>
        <select class="config-select" onchange="updateNodeConfig(${node.id}, 'iterationErrorBehavior', this.value)">
          <option value="stop" ${(node.config?.iterationErrorBehavior || 'stop') === 'stop' ? 'selected' : ''}>停止循环</option>
          <option value="continue" ${node.config?.iterationErrorBehavior === 'continue' ? 'selected' : ''}>跳过继续</option>
          <option value="retry" ${node.config?.iterationErrorBehavior === 'retry' ? 'selected' : ''}>重试当前迭代</option>
        </select>
        <div class="config-field-help">单次迭代执行失败时的处理方式</div>
      </div>
      ${renderMergeStrategyField(node)}
    </div>`;

  html += renderErrorHandlingSection(node);
  return html;
}

// --- Sub-Workflow Advanced Config ---
function renderSubWfAdvancedConfig(node) {
  const timeout = node.config?._timeout || 300;

  let html = `
    <div class="config-section">
      <div class="config-section-title">执行策略</div>
      <div class="config-field">
        <div class="config-field-label">子流程执行超时 (秒)</div>
        <input class="config-input" type="number" value="${timeout}" min="1" max="86400" onchange="updateNodeConfig(${node.id}, '_timeout', parseInt(this.value))" />
        <div class="config-field-help">子流程整体执行的最大等待时间（默认 300 秒）</div>
      </div>
      ${renderMergeStrategyField(node)}
    </div>`;

  html += renderErrorHandlingSection(node, { isSubWorkflow: true });
  return html;
}

// --- Delay Advanced Config ---
function renderDelayAdvancedConfig(node) {
  const suspendTimeout = node.config?.suspendTimeout || 24;

  let html = `
    <div class="config-section">
      <div class="config-section-title">执行策略</div>
      <div class="config-field">
        <div class="config-field-label">挂起等待超时 (小时)</div>
        <input class="config-input" type="number" value="${suspendTimeout}" min="1" max="720" onchange="updateNodeConfig(${node.id}, 'suspendTimeout', parseInt(this.value))" />
        <div class="config-field-help">延迟等待的最大时长，超时后触发异常策略（默认 24 小时）</div>
      </div>
      ${renderMergeStrategyField(node)}
    </div>`;

  html += renderErrorHandlingSection(node);
  return html;
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
      
    case 'code': {
      const codeOutputVars = node.config?.codeOutputVars;
      if (codeOutputVars && codeOutputVars.length > 0) {
        codeOutputVars.forEach(v => {
          if (v.name) {
            outputs.push({
              name: v.name,
              type: v.type || 'Object',
              desc: v.desc || '代码输出变量',
              editable: true,
              configField: 'codeOutputVars'
            });
          }
        });
      } else {
        outputs.push({ 
          name: 'result', 
          type: 'Object', 
          desc: '代码 return 返回的结果',
          editable: false
        });
      }
      break;
    }
      
    case 'assign': {
      const assignments = node.config?.assignments || [{ target: 'processedData', source: '', type: 'String' }];
      assignments.forEach(a => {
        if (a.target) {
          outputs.push({ 
            name: a.target, 
            type: a.type || 'String', 
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

    case 'break':
      // Break nodes have no outputs — they just signal the loop to stop
      break;
      
    case 'workflow': {
      const wfOutputVars = node.config?.wfOutputVars;
      if (wfOutputVars && wfOutputVars.length > 0) {
        wfOutputVars.forEach(v => {
          if (v.name) {
            outputs.push({
              name: v.name,
              type: v.type || 'Object',
              desc: v.desc || '被调用工作流的返回结果',
              editable: true,
              configField: 'wfOutputVars'
            });
          }
        });
      } else {
        const outputVar = node.config?.outputVar || 'wfResult';
        outputs.push({ 
          name: outputVar, 
          type: 'Object', 
          desc: '被调用工作流的返回结果',
          editable: true,
          configField: 'outputVar'
        });
      }
      break;
    }
      
    case 'mq': {
      outputs.push(
        { name: 'messageId', type: 'String', desc: '消息发送后返回的唯一标识', editable: false },
        { name: 'success', type: 'Boolean', desc: '消息是否发送成功', editable: false }
      );
      break;
    }
          
    case 'output': {
      const outMode = node.config?.outputMode || 'variables';
      if (outMode === 'text') {
        outputs.push({ name: 'text', type: 'String', desc: '输出文本', editable: false });
      } else {
        const outVars = node.config?.outputVars || [{ name: 'result', type: 'String', source: '' }];
        outVars.forEach(v => {
          if (v.name) {
            outputs.push({
              name: v.name,
              type: v.type || 'String',
              desc: '输出变量',
              editable: true,
              configField: 'outputVars'
            });
          }
        });
      }
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
          ${editableOutputs.map(o => {
            // 赋值节点的输出变量在赋值规则中编辑，此处只读展示
            const isAssignNode = node.type === 'assign';
            const varType = (node.config?.assignments?.find(a => a.target === o.name)?.type) || o.type;
            return isAssignNode ? `
            <div class="output-var-item" onclick="copyOutputVarPath('${nodeCode}', '${o.name}')" title="点击复制引用路径">
              <span class="var-icon type-${varType}" title="${varType}">${varType.charAt(0)}</span>
              <div class="output-var-info">
                <div class="output-var-name">${o.name}</div>
                <div class="output-var-desc-inline">${o.desc}</div>
              </div>
              <code class="var-ref-tag">{{${nodeCode}.${o.name}}}</code>
            </div>` : `
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
            </div>`;
          }).join('')}
        </div>
        ${node.type === 'assign' ? `<div class="output-vars-assign-hint">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          变量名和类型在上方赋值规则中修改
        </div>` : ''}
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
 * HTTP 节点专用输出变量区域（含响应结构展开浏览）
 */
function renderHttpOutputVariablesSection(node) {
  const nodeCode = node.code;
  const varPrefix = node.config?.responseVar || 'response';
  const expanded = node.config?._responsePreviewExpanded || false;

  // Mock response structure for browsing
  const mockResponse = {
    status: 200,
    data: {
      id: 12345,
      name: "示例数据",
      createdAt: "2026-04-20T10:00:00Z",
      items: [{ id: 1, label: "item1" }]
    },
    headers: {
      "content-type": "application/json",
      "x-request-id": "abc-123"
    }
  };

  // Flat field list for browsing
  const responseFields = [
    { path: `${varPrefix}.status`, type: 'Number', desc: 'HTTP 状态码', example: '200' },
    { path: `${varPrefix}.data`, type: 'Object', desc: '响应数据体（完整对象）', example: '{...}' },
    { path: `${varPrefix}.data.id`, type: 'Number', desc: '示例字段（实际字段取决于接口响应）', example: '12345' },
    { path: `${varPrefix}.data.name`, type: 'String', desc: '示例字段', example: '"示例数据"' },
    { path: `${varPrefix}.headers`, type: 'Object', desc: '响应头对象', example: '{...}' },
    { path: `${varPrefix}.headers.content-type`, type: 'String', desc: '响应内容类型', example: '"application/json"' },
  ];

  return `
    <div class="config-section output-vars-section">
      <div class="config-section-title" style="color:#16a34a;display:flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        输出变量
        <span style="font-size:10px;font-weight:400;color:var(--md-outline);margin-left:auto">下游节点可引用</span>
      </div>

      <div class="output-vars-editable">
        <div class="output-var-edit-row">
          <div class="output-var-edit-main">
            <span class="var-icon type-Object" title="Object">O</span>
            <input
              class="output-var-input"
              value="${varPrefix}"
              placeholder="response"
              style="flex:1;font-family:var(--font-family-mono)"
              onchange="updateNodeConfig(${node.id}, 'responseVar', this.value); renderDesigner()"
            />
            <code class="var-ref-tag">{{${nodeCode}.${varPrefix}}}</code>
          </div>
          <div class="output-var-desc">HTTP 响应对象（包含 status / data / headers）</div>
        </div>
      </div>

      <div class="output-vars-fixed">
        <div class="output-var-item" onclick="copyOutputVarPath('${nodeCode}', '${varPrefix}.status')" title="点击复制引用路径">
          <span class="var-icon type-Number" title="Number">N</span>
          <div class="output-var-info">
            <div class="output-var-name">${varPrefix}.status</div>
            <div class="output-var-desc-inline">HTTP 状态码</div>
          </div>
          <code class="var-ref-tag">{{${nodeCode}.${varPrefix}.status}}</code>
        </div>
        <div class="output-var-item" onclick="copyOutputVarPath('${nodeCode}', '${varPrefix}.data')" title="点击复制引用路径">
          <span class="var-icon type-Object" title="Object">O</span>
          <div class="output-var-info">
            <div class="output-var-name">${varPrefix}.data</div>
            <div class="output-var-desc-inline">响应数据体</div>
          </div>
          <code class="var-ref-tag">{{${nodeCode}.${varPrefix}.data}}</code>
        </div>
        <div class="output-var-item" onclick="copyOutputVarPath('${nodeCode}', '${varPrefix}.headers')" title="点击复制引用路径">
          <span class="var-icon type-Object" title="Object">O</span>
          <div class="output-var-info">
            <div class="output-var-name">${varPrefix}.headers</div>
            <div class="output-var-desc-inline">响应头</div>
          </div>
          <code class="var-ref-tag">{{${nodeCode}.${varPrefix}.headers}}</code>
        </div>
      </div>

      <!-- Response structure browser -->
      <div style="margin-top:var(--space-2)">
        <button
          class="btn btn-ghost btn-sm"
          style="width:100%;justify-content:space-between;height:28px;font-size:11px;color:var(--md-outline)"
          onclick="updateNodeConfig(${node.id},'_responsePreviewExpanded',${!expanded});renderDesigner()"
        >
          <span style="display:flex;align-items:center;gap:4px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            浏览响应字段结构
          </span>
          <span style="font-size:10px">${expanded ? '▲ 收起' : '▼ 展开'}</span>
        </button>
        ${expanded ? `
        <div style="margin-top:4px;border:1px solid var(--md-outline-variant);border-radius:6px;overflow:hidden">
          <div style="padding:6px 10px;background:var(--md-surface-container);font-size:10px;color:var(--md-outline);border-bottom:1px solid var(--md-outline-variant)">
            ℹ️ 示例字段结构（实际字段取决于接口响应）· 点击行复制引用路径
          </div>
          ${responseFields.map(f => `
          <div
            style="display:flex;align-items:center;gap:6px;padding:5px 10px;cursor:pointer;border-bottom:1px solid var(--md-outline-variant,rgba(0,0,0,0.08));font-size:11px"
            onclick="navigator.clipboard.writeText('{{${nodeCode}.${f.path}}}').then(()=>showToast('success','已复制','{{${nodeCode}.${f.path}}} 已复制'))"
            onmouseover="this.style.background='var(--md-surface-container)'"
            onmouseout="this.style.background=''"
          >
            <span class="var-icon type-${f.type}" style="flex-shrink:0;width:16px;height:16px;font-size:9px" title="${f.type}">${f.type.charAt(0)}</span>
            <code style="font-family:var(--font-family-mono);flex:1;color:var(--md-on-surface)">${f.path}</code>
            <span style="color:var(--md-outline);font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.desc}</span>
            <code style="font-family:var(--font-family-mono);font-size:10px;color:#64748b;background:var(--md-surface-container);padding:0 3px;border-radius:2px;flex-shrink:0">${f.example}</code>
          </div>`).join('')}
        </div>
        ` : ''}
      </div>

      <div class="output-vars-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        点击变量行或引用路径可复制，下游节点通过此路径引用响应值
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
      onclick="openExprExpandModal('${editorId}', ${nodeId}, ${JSON.stringify(label || id).replace(/"/g, '&quot;')}, ${JSON.stringify(hint || placeholder).replace(/"/g, '&quot;')})"
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
 * 渲染代码节点专用的代码编辑器（非通用表达式编辑器）
 * 区别于 renderExprEditor：
 * 1. 没有 {{ 变量引用 }} 的模板语法，而是通过 inputs / getVariable() 访问
 * 2. 展开弹窗是专用的代码编辑器（左侧变量面板 + 右侧大代码区）
 * 3. 变量点击插入的是 inputs.xxx 或 getVariable("xxx") 格式
 * 4. 有行号、等宽字体、代码提示
 */
function renderCodeEditor(options) {
  const {
    id,
    value = '',
    placeholder = '',
    nodeId,
    minHeight = 100,
    language = 'JavaScript',
    onChange = ''
  } = options;
  
  const editorId = `code_${id}_${Date.now()}`;
  const isJS = language === 'JavaScript';
  
  const langTag = isJS 
    ? '<span class="code-lang-tag js">JS</span>' 
    : '<span class="code-lang-tag py">PY</span>';

  return `
    <div class="code-editor-wrapper" data-editor-id="${editorId}">
      <div class="code-editor-header">
        ${langTag}
        <span class="code-editor-lang-label">${language}</span>
        <button class="code-editor-expand-btn" 
          onclick="openCodeEditorModal('${editorId}', ${nodeId}, ${JSON.stringify(language).replace(/"/g, '&quot;')})"
          title="打开代码编辑器">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
          展开编辑
        </button>
      </div>
      <textarea 
        id="${editorId}"
        class="code-editor-textarea"
        style="min-height:${minHeight}px"
        placeholder="${escHtml(placeholder)}"
        onchange="${onChange}"
        spellcheck="false"
      >${escHtml(value)}</textarea>
    </div>
  `;
}

/**
 * 打开代码节点专用的全屏代码编辑器
 * 与表达式编辑器 (openExprExpandModal) 的区别：
 * - 标题显示"代码编辑器"而非"表达式编辑器"
 * - 变量点击插入 inputs.xxx 格式（JS）或直接用变量名（Python），而非 {{xxx}}
 * - 左侧面板分为"输入参数"和"可用函数"两部分
 * - 提示文案面向代码编写
 */
function openCodeEditorModal(editorId, nodeId, language) {
  const origEl = document.getElementById(editorId);
  const currentValue = origEl ? origEl.value : '';

  const varGroups = getAvailableVariables(nodeId);
  const isJS = language === 'JavaScript';

  // --- Build variable list ---
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
        // For code editor, clicking inserts the variable in code format
        // JS: inputs.varName or getVariable("varName") 
        // Python: inputs["varName"] or get_variable("varName")
        const codeRef = isJS ? `inputs.${v.path.replace(/^.*\./, '')}` : `inputs["${v.path.replace(/^.*\./, '')}"]`;
        varListHtml += `<div class="expr-expand-var-item" 
          onclick="insertCodeVarIntoEditor(${JSON.stringify(codeRef).replace(/"/g, '&quot;')})"
          title="${escHtml(v.desc || v.path)}">
          <span class="expr-expand-var-name">${escHtml(v.path)}</span>
          <span class="expr-expand-var-type">${escHtml(v.type || '')}</span>
          <span class="expr-expand-var-insert">插入</span>
        </div>`;
      });
      varListHtml += '</div>';
    });
  }

  // --- Build available functions list (with full signature tooltips) ---
  const builtinFunctions = isJS ? [
    {
      name: 'getVariable(name)',
      desc: '读取工作流全局变量',
      code: 'getVariable("")',
      sig: 'getVariable(name: string): any',
      example: 'getVariable("userId")  // 返回全局变量 userId 的值'
    },
    {
      name: 'setVariable(name, value)',
      desc: '写入工作流全局变量',
      code: 'setVariable("", )',
      sig: 'setVariable(name: string, value: any): void',
      example: 'setVariable("totalCount", 100)  // 设置全局变量'
    },
    {
      name: 'getInput(name)',
      desc: '获取当前节点输入参数',
      code: 'getInput("")',
      sig: 'getInput(name: string): any',
      example: 'getInput("userId")  // 等同于 inputs.userId'
    },
    {
      name: 'getOutputFrom(nodeCode, outputName)',
      desc: '获取指定上游节点的输出值',
      code: 'getOutputFrom("", "")',
      sig: 'getOutputFrom(nodeCode: string, outputName?: string): any',
      example: 'getOutputFrom("http_1", "response")  // 取 http_1 节点的 response 输出'
    },
    {
      name: 'toJson(obj)',
      desc: '将对象序列化为 JSON 字符串',
      code: 'toJson()',
      sig: 'toJson(obj: any): string',
      example: 'toJson({ key: "val" })  // → \'{\'key\':\'val\'}\"'
    },
    {
      name: 'newGuid()',
      desc: '生成一个新的 GUID',
      code: 'newGuid()',
      sig: 'newGuid(): Guid',
      example: 'const id = newGuid().toString()  // 生成唯一 ID'
    },
    {
      name: 'newGuidString()',
      desc: '生成 GUID 字符串',
      code: 'newGuidString()',
      sig: 'newGuidString(): string',
      example: 'const id = newGuidString()  // "550e8400-e29b-41d4-a716-..."'
    },
    {
      name: 'setOutcome(name)',
      desc: '控制节点走哪个出口分支',
      code: 'setOutcome("")',
      sig: 'setOutcome(name: string): void',
      example: 'setOutcome("success")  // 让流程走 success 分支'
    },
    {
      name: 'isNullOrEmpty(value)',
      desc: '判断字符串是否为空',
      code: 'isNullOrEmpty()',
      sig: 'isNullOrEmpty(value: string): boolean',
      example: 'if (isNullOrEmpty(inputs.name)) { ... }'
    },
  ] : [
    { name: 'get_variable(name)', desc: '获取全局变量', code: 'get_variable("")', sig: 'get_variable(name: str) -> Any', example: 'val = get_variable("userId")' },
    { name: 'set_variable(name, value)', desc: '设置全局变量', code: 'set_variable("", )', sig: 'set_variable(name: str, value: Any) -> None', example: 'set_variable("count", 100)' },
    { name: 'get_input(name)', desc: '获取节点输入', code: 'get_input("")', sig: 'get_input(name: str) -> Any', example: 'val = get_input("userId")' },
    { name: 'to_json(obj)', desc: '序列化为 JSON', code: 'to_json()', sig: 'to_json(obj: Any) -> str', example: 'json_str = to_json({"key": "val"})' },
    { name: 'new_guid()', desc: '生成 GUID', code: 'new_guid()', sig: 'new_guid() -> str', example: 'id = new_guid()' },
  ];

  let funcListHtml = builtinFunctions.map(fn => {
    const tooltipHtml = `<div class="code-fn-tooltip"><div class="code-fn-sig">${escHtml(fn.sig || fn.name)}</div><div class="code-fn-example">${escHtml(fn.example || '')}</div></div>`;
    return `
    <div class="expr-expand-var-item code-fn-item"
      onclick="insertCodeVarIntoEditor(${JSON.stringify(fn.code).replace(/"/g, '&quot;')})"
      title="">
      <span class="expr-expand-var-name" style="color:var(--md-tertiary);font-family:var(--font-family-mono);font-size:11px">${escHtml(fn.name)}</span>
      <span class="expr-expand-var-type">${escHtml(fn.desc)}</span>
      <span class="expr-expand-var-insert">插入</span>
      ${tooltipHtml}
    </div>`;
  }).join('');

  const langTag = isJS 
    ? '<span class="code-lang-tag js" style="margin-right:8px">JS</span>' 
    : '<span class="code-lang-tag py" style="margin-right:8px">PY</span>';

  const hintHtml = isJS
    ? `<span class="expr-expand-editor-hint">通过 <code>inputs</code> 获取输入数据，使用 <code>return</code> 返回结果 · Ctrl+Enter 确认</span>`
    : `<span class="expr-expand-editor-hint">通过 <code>inputs</code> 获取输入数据，使用 <code>return</code> 返回结果 · Ctrl+Enter 确认</span>`;

  const modalHtml = `
  <div class="expr-expand-overlay" id="exprExpandOverlay" onclick="handleExpandOverlayClick(event)">
    <div class="expr-expand-modal" onclick="event.stopPropagation()">
      <div class="expr-expand-header">
        <div class="expr-expand-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          ${langTag} 代码编辑器
        </div>
        <div class="expr-expand-header-actions">
          <button class="expr-expand-close" onclick="closeCodeEditorModal('${editorId}', false)" title="取消（Esc）">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="expr-expand-body">
        <div class="expr-expand-vars">
          <div class="code-editor-left-tabs">
            <button class="code-left-tab active" onclick="switchCodeEditorTab(this,'vars')">可用变量</button>
            <button class="code-left-tab" onclick="switchCodeEditorTab(this,'funcs')">内置函数</button>
            <button class="code-left-tab" onclick="switchCodeEditorTab(this,'snippets')">片段</button>
          </div>
          <div id="codeEditorTabVars" class="expr-expand-vars-list code-editor-tab-panel" style="overflow-y:auto;flex:1">
            ${varListHtml}
          </div>
          <div id="codeEditorTabFuncs" class="expr-expand-vars-list code-editor-tab-panel" style="display:none;overflow-y:auto;flex:1">
            ${funcListHtml}
          </div>
          <div id="codeEditorTabSnippets" class="expr-expand-vars-list code-editor-tab-panel" style="display:none;overflow-y:auto;flex:1">
            ${isJS ? buildJsSnippetsHtml() : buildPySnippetsHtml()}
          </div>
        </div>
        <div class="expr-expand-editor-area">
          <div class="expr-expand-editor-toolbar">
            ${hintHtml}
          </div>
          <textarea 
            id="codeExpandTextarea"
            class="expr-expand-textarea code-expand-textarea"
            placeholder="${isJS ? '// 在此编写 JavaScript 代码' : '# 在此编写 Python 代码'}"
            onkeydown="handleCodeExpandKeydown(event)"
            spellcheck="false"
          >${escHtml(currentValue)}</textarea>
        </div>
      </div>
      <div class="expr-expand-footer">
        <button class="btn-ghost" onclick="closeCodeEditorModal('${editorId}', false)">取消</button>
        <button class="btn-primary" onclick="closeCodeEditorModal('${editorId}', true)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          确认
        </button>
      </div>
    </div>
  </div>`;

  const container = document.createElement('div');
  container.id = 'codeExpandContainer';
  container.innerHTML = modalHtml;
  document.body.appendChild(container);

  const ta = document.getElementById('codeExpandTextarea');
  if (ta) {
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    // inputs. autocomplete
    ta.addEventListener('input', _onCodeEditorInput);
  }

  _codeExpandState = { editorId, nodeId, language };
  document.addEventListener('keydown', _onCodeExpandEsc);
}

/**
 * 代码编辑器 Esc 关闭
 */
let _codeExpandState = null;
function _onCodeExpandEsc(e) {
  if (e.key === 'Escape') closeCodeEditorModal(null, false);
}

/**
 * 关闭代码编辑器弹窗
 */
function closeCodeEditorModal(editorId, confirm) {
  // If called from Esc handler, use saved state
  if (!editorId && _codeExpandState) editorId = _codeExpandState.editorId;
  
  const container = document.getElementById('codeExpandContainer');
  if (!container) return;

  if (confirm) {
    const ta = document.getElementById('codeExpandTextarea');
    const origEl = document.getElementById(editorId);
    if (ta && origEl) {
      // Syntax check before confirming
      const lang = _codeExpandState?.language || 'JavaScript';
      const err = _validateCodeSyntax(ta.value, lang);
      if (err) {
        // Show error banner but don't block saving
        let errBanner = document.getElementById('codeExpandSyntaxErr');
        if (!errBanner) {
          errBanner = document.createElement('div');
          errBanner.id = 'codeExpandSyntaxErr';
          errBanner.className = 'code-syntax-error-banner';
          const footer = document.querySelector('#codeExpandContainer .expr-expand-footer');
          if (footer) footer.insertAdjacentElement('beforebegin', errBanner);
        }
        errBanner.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> 语法错误：${escHtml(err)}`;
        return; // block save
      }
      origEl.value = ta.value;
      origEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  document.removeEventListener('keydown', _onCodeExpandEsc);
  _hideCodeAutocomplete();
  container.remove();
  _codeExpandState = null;
}

/**
 * 在代码编辑器中插入变量引用（代码格式）
 */
function insertCodeVarIntoEditor(codeRef) {
  const ta = document.getElementById('codeExpandTextarea');
  if (!ta) return;
  // Close autocomplete if open
  _hideCodeAutocomplete();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.substring(0, start);
  const after = ta.value.substring(end);
  ta.value = before + codeRef + after;
  const pos = start + codeRef.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
}

// ============================================================
// 代码片段 (Snippets)
// ============================================================
function buildJsSnippetsHtml() {
  const snippets = [
    {
      label: '获取输入并处理',
      desc: '模板：读 inputs 并返回结果',
      code: `const { data } = inputs;
// 在此处理数据
return { result: data };`
    },
    {
      label: '条件分支路由',
      desc: '根据条件走不同分支',
      code: `const status = inputs.status;
if (status === 'success') {
  setOutcome('success');
} else {
  setOutcome('fail');
}`
    },
    {
      label: '遍历数组并转换',
      desc: '对数组每个元素做处理',
      code: `const list = inputs.list || [];
const result = list.map(item => ({
  id: item.id,
  name: item.name,
  // 添加处理逻辑
}));
return { result };`
    },
    {
      label: '调用上游节点结果',
      desc: '获取指定节点的输出',
      code: `const httpResult = getOutputFrom('http_1', 'response');
const data = httpResult?.data;
return { data };`
    },
    {
      label: '读写全局变量',
      desc: '读取和写入全局变量',
      code: `// 读取
 const count = getVariable('retryCount') || 0;
// 写入
setVariable('retryCount', count + 1);
return { count };`
    },
    {
      label: '错误处理',
      desc: '带异常捕获的模板',
      code: `try {
  const result = inputs.data;
  if (!result) throw new Error('数据为空');
  return { success: true, result };
} catch (e) {
  setOutcome('error');
  return { success: false, message: e.message };
}`
    },
  ];
  return snippets.map(s => `
    <div class="code-snippet-item" onclick="insertSnippet(${JSON.stringify(s.code).replace(/"/g, '&quot;')})">
      <div class="code-snippet-label">${escHtml(s.label)}</div>
      <div class="code-snippet-desc">${escHtml(s.desc)}</div>
    </div>`).join('');
}

function buildPySnippetsHtml() {
  const snippets = [
    {
      label: '获取输入并处理',
      desc: '模板：读 inputs 并返回结果',
      code: `data = inputs.get('data')
# 在此处理数据
return {'result': data}`
    },
    {
      label: '条件分支路由',
      desc: '根据条件走不同分支',
      code: `status = inputs.get('status')
if status == 'success':
    set_outcome('success')
else:
    set_outcome('fail')`
    },
    {
      label: '遍历列表并转换',
      desc: '对列表每个元素做处理',
      code: `items = inputs.get('list', [])
result = [{'id': item['id'], 'name': item['name']} for item in items]
return {'result': result}`
    },
  ];
  return snippets.map(s => `
    <div class="code-snippet-item" onclick="insertSnippet(${JSON.stringify(s.code).replace(/"/g, '&quot;')})">
      <div class="code-snippet-label">${escHtml(s.label)}</div>
      <div class="code-snippet-desc">${escHtml(s.desc)}</div>
    </div>`).join('');
}

function insertSnippet(code) {
  const ta = document.getElementById('codeExpandTextarea');
  if (!ta) return;
  const start = ta.selectionStart;
  const before = ta.value.substring(0, start);
  const after = ta.value.substring(ta.selectionEnd);
  // Add newline separator if needed
  const sep = (before && !before.endsWith('\n')) ? '\n' : '';
  ta.value = before + sep + code + (after ? '\n' + after : '');
  const pos = before.length + sep.length + code.length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
}

// ============================================================
// 左侧面板 Tab 切换
// ============================================================
function switchCodeEditorTab(btn, tab) {
  // Update tab button styles
  const tabs = btn.closest('.code-editor-left-tabs');
  if (tabs) tabs.querySelectorAll('.code-left-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Show/hide panels
  const panels = { vars: 'codeEditorTabVars', funcs: 'codeEditorTabFuncs', snippets: 'codeEditorTabSnippets' };
  Object.entries(panels).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === tab ? 'block' : 'none';
  });
}

// ============================================================
// inputs. 自动补全
// ============================================================
let _codeAutoCompleteItems = [];

function _onCodeEditorInput(event) {
  const ta = event.target;
  const pos = ta.selectionStart;
  const before = ta.value.substring(0, pos);
  // Detect 'inputs.' trigger
  const match = before.match(/(inputs\.)([\w.]*)$/);
  if (match) {
    const prefix = match[2]; // text after 'inputs.'
    _showCodeAutocomplete(ta, prefix);
  } else {
    _hideCodeAutocomplete();
  }
}

function _buildInputsCompletionItems() {
  if (!_codeExpandState) return [];
  const { nodeId, language } = _codeExpandState;
  const isJS = language === 'JavaScript';
  const varGroups = getAvailableVariables(nodeId);
  const items = [];
  varGroups.forEach(group => {
    group.variables.forEach(v => {
      const fieldName = v.path.replace(/^.*\./, '');
      items.push({
        label: fieldName,
        type: v.type || 'Any',
        desc: `${group.name} · ${v.desc || v.type || ''}`,
        insert: isJS ? `inputs.${fieldName}` : `inputs["${fieldName}"]`,
        replace: true, // replace 'inputs.PREFIX' entirely
      });
    });
  });
  return items;
}

function _showCodeAutocomplete(ta, prefix) {
  const allItems = _buildInputsCompletionItems();
  const filtered = prefix
    ? allItems.filter(it => it.label.toLowerCase().startsWith(prefix.toLowerCase()))
    : allItems;
  if (filtered.length === 0) { _hideCodeAutocomplete(); return; }

  _codeAutoCompleteItems = filtered;

  let dropdown = document.getElementById('codeAutoCompleteDropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'codeAutoCompleteDropdown';
    dropdown.className = 'code-autocomplete-dropdown';
    document.body.appendChild(dropdown);
  }

  // Position below cursor (approximate using textarea dimensions)
  const rect = ta.getBoundingClientRect();
  const lines = ta.value.substring(0, ta.selectionStart).split('\n');
  const lineIndex = lines.length - 1;
  const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
  const paddingTop = parseInt(getComputedStyle(ta).paddingTop) || 10;
  const top = rect.top + paddingTop + lineIndex * lineHeight + lineHeight - ta.scrollTop;
  const left = rect.left + 12;

  dropdown.style.cssText = `top:${Math.min(top, window.innerHeight - 220)}px;left:${left}px;min-width:280px;display:block`;
  dropdown.innerHTML = filtered.slice(0, 10).map((item, i) => `
    <div class="code-ac-item${i === 0 ? ' active' : ''}" data-index="${i}" onmousedown="event.preventDefault();_applyCodeAutocomplete(${i})">
      <span class="code-ac-label">${escHtml(item.label)}</span>
      <span class="code-ac-type">${escHtml(item.type)}</span>
      <span class="code-ac-desc">${escHtml(item.desc)}</span>
    </div>`).join('');

  // Keyboard nav
  ta.onkeydown = function(e) {
    if (!document.getElementById('codeAutoCompleteDropdown')) {
      handleCodeExpandKeydown(e);
      return;
    }
    const items = dropdown.querySelectorAll('.code-ac-item');
    const active = dropdown.querySelector('.code-ac-item.active');
    const idx = active ? parseInt(active.dataset.index) : 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(idx + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === next));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === prev));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      _applyCodeAutocomplete(idx);
    } else if (e.key === 'Escape') {
      _hideCodeAutocomplete();
    } else {
      handleCodeExpandKeydown(e);
    }
  };
}

function _applyCodeAutocomplete(index) {
  const item = _codeAutoCompleteItems[index];
  if (!item) return;
  const ta = document.getElementById('codeExpandTextarea');
  if (!ta) return;
  const pos = ta.selectionStart;
  const before = ta.value.substring(0, pos);
  // Replace 'inputs.PREFIX' with full insert text
  const replaced = before.replace(/(inputs\.[\w.]*)$/, item.insert);
  ta.value = replaced + ta.value.substring(pos);
  const newPos = replaced.length;
  ta.focus();
  ta.setSelectionRange(newPos, newPos);
  _hideCodeAutocomplete();
  // Restore default keydown
  ta.onkeydown = handleCodeExpandKeydown;
}

function _hideCodeAutocomplete() {
  const el = document.getElementById('codeAutoCompleteDropdown');
  if (el) el.remove();
  _codeAutoCompleteItems = [];
  const ta = document.getElementById('codeExpandTextarea');
  if (ta) ta.onkeydown = handleCodeExpandKeydown;
}

// ============================================================
// 语法检查
// ============================================================
function _validateCodeSyntax(code, language) {
  if (language !== 'JavaScript') return null; // Python syntax check not feasible in browser
  try {
    // Wrap in function to allow top-level return
    new Function(code);
    return null; // no error
  } catch (e) {
    return e.message;
  }
}

/**
 * 代码编辑器键盘事件：Ctrl/Cmd+Enter 确认
 */
function handleCodeExpandKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    closeCodeEditorModal(null, true);
  }
}
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

  // 统计各来源变量数
  const tabCounts = { all: 0, trigger: 0, node: 0, global: 0, datasource: 0 };
  groups.forEach(g => {
    const cnt = g.variables.length;
    tabCounts.all += cnt;
    if (tabCounts[g.source] !== undefined) tabCounts[g.source] += cnt;
  });

  // 只显示有变量的来源 Tab
  const tabDefs = [
    { key: 'all',        label: '全部' },
    { key: 'trigger',    label: '触发器' },
    { key: 'node',       label: '上游节点' },
    { key: 'global',     label: '全局变量' },
    { key: 'datasource', label: '数据源' },
  ].filter(t => t.key === 'all' || tabCounts[t.key] > 0);

  const tabsHtml = tabDefs.map(t => `
    <span class="var-picker-tab${t.key === 'all' ? ' active' : ''}" 
          data-tab="${t.key}"
          onclick="filterVarPickerByTab('${editorId}', '${t.key}', this)">
      <span class="tab-dot"></span>
      ${t.label}
      <span class="tab-count">${tabCounts[t.key]}</span>
    </span>
  `).join('');
  
  picker.innerHTML = `
    <div class="var-picker-tabs">${tabsHtml}</div>
    <div class="var-picker-search">
      <input type="text" placeholder="搜索变量名或路径..." 
             oninput="filterVarPicker('${editorId}', this.value)">
    </div>
    <div class="var-picker-body" id="${editorId}_picker_body">
      ${renderVarPickerGroups(groups, editorId)}
    </div>
  `;
  
  picker.style.display = 'flex';
  
  setTimeout(() => {
    const searchInput = picker.querySelector('.var-picker-search input');
    if (searchInput) searchInput.focus();
  }, 50);
}

/**
 * 渲染变量分组（支持折叠 + 类型Tag文字）
 */
function renderVarPickerGroups(groups, editorId, keyword = '') {
  if (groups.length === 0) {
    return '<div class="var-picker-empty">暂无可用变量</div>';
  }

  const sourceBadgeMap = {
    trigger:    { label: '触发器', cls: 'source-trigger' },
    node:       { label: '上游节点', cls: 'source-node' },
    global:     { label: '全局变量', cls: 'source-global' },
    datasource: { label: '数据源', cls: 'source-datasource' },
  };

  // 类型全称 map
  const typeLabel = {
    String: 'Str', Number: 'Num', Integer: 'Int', Double: 'Dbl',
    Boolean: 'Bool', Object: 'Obj', Array: 'Arr', File: 'File', DateTime: 'Date'
  };

  function highlight(text) {
    if (!keyword) return escHtml(text);
    const re = new RegExp('(' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escHtml(text).replace(re, '<mark class="var-highlight">$1</mark>');
  }

  return groups.map(group => {
    const badge = sourceBadgeMap[group.source];
    const badgeHtml = badge
      ? `<span class="var-picker-source-badge ${badge.cls}">${badge.label}</span>`
      : '';
    const chevron = `<svg class="var-picker-group-chevron" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 6 8 10 12 6"/></svg>`;
    const itemsHtml = group.variables.map(v => {
      const tLabel = typeLabel[v.type] || v.type || '?';
      return `
        <div class="var-picker-item" 
             data-ref="${v.ref}" 
             data-path="${v.path}"
             onclick="selectVariable('${editorId}', '${v.ref.replace(/'/g, "\\'")}')">
          <span class="var-type-tag type-${v.type}" title="${v.type}">${tLabel}</span>
          <div class="var-info">
            <div class="var-name">${highlight(v.name)}</div>
            <div class="var-path">${highlight(v.path)}</div>
            ${v.desc ? `<div class="var-desc">${escHtml(v.desc)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
    <div class="var-picker-group" data-group="${group.id}" data-source="${group.source || ''}">
      <div class="var-picker-group-header" onclick="toggleVarPickerGroup(this)">
        <span>${group.name}</span>
        ${badgeHtml}
        ${chevron}
      </div>
      <div class="var-picker-items">${itemsHtml}</div>
    </div>
  `}).join('');
}

/**
 * 折叠/展开变量分组
 */
function toggleVarPickerGroup(headerEl) {
  const group = headerEl.closest('.var-picker-group');
  if (group) group.classList.toggle('collapsed');
}

/**
 * 按来源 Tab 过滤
 */
function filterVarPickerByTab(editorId, tab, tabEl) {
  // 切换 active
  const tabs = tabEl.closest('.var-picker-tabs').querySelectorAll('.var-picker-tab');
  tabs.forEach(t => t.classList.toggle('active', t === tabEl));

  const body = document.getElementById(editorId + '_picker_body');
  if (!body) return;

  body.querySelectorAll('.var-picker-group').forEach(group => {
    const source = group.dataset.source;
    group.style.display = (tab === 'all' || source === tab) ? '' : 'none';
  });

  // 清空搜索并重新聚焦
  const searchInput = document.querySelector(`#${editorId}_picker .var-picker-search input`);
  if (searchInput) { searchInput.value = ''; searchInput.focus(); }
}

/**
 * 过滤变量选择器（搜索 + 高亮）
 */
function filterVarPicker(editorId, keyword) {
  const body = document.getElementById(editorId + '_picker_body');
  if (!body) return;

  const lowerKeyword = keyword.toLowerCase();
  const groups = body.querySelectorAll('.var-picker-group');

  // 获取当前激活 Tab
  const activeTab = document.querySelector(`#${editorId}_picker .var-picker-tab.active`);
  const currentTab = activeTab ? activeTab.dataset.tab : 'all';

  groups.forEach(group => {
    const source = group.dataset.source;
    if (currentTab !== 'all' && source !== currentTab) {
      group.style.display = 'none';
      return;
    }
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
    // 搜索时自动展开已折叠的分组
    if (keyword && hasVisible) group.classList.remove('collapsed');
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
/**
 * 内部共用：在 fixed picker 容器里渲染统一变量选择器
 * @param {HTMLElement} picker      - .var-picker-dropdown 容器
 * @param {HTMLElement} anchorEl    - 定位锚点元素
 * @param {Array}       groups      - getAvailableVariables 返回的分组
 * @param {string}      pickerId    - picker 的 id 前缀（用于 filterVarPicker）
 * @param {string}      onSelectFn  - 每个 item onclick 调用的全局函数名（字符串）
 * @param {string}      onSelectArg - 传给该函数的附加参数（字符串，拼接在 ref 后面）
 */
function _showCondPickerAt(picker, anchorEl, groups, pickerId, onSelectFn, onSelectArg) {
  // 智能方向
  const rect = anchorEl.getBoundingClientRect();
  const pickerH = 360;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  picker.style.left = Math.min(rect.left, window.innerWidth - 360) + 'px';
  if (spaceBelow >= pickerH || spaceBelow >= spaceAbove) {
    picker.style.top = (rect.bottom + 4) + 'px';
    picker.style.bottom = '';
  } else {
    picker.style.top = '';
    picker.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
  }

  // 统计来源计数
  const tabCounts = { all: 0, trigger: 0, node: 0, global: 0, datasource: 0 };
  groups.forEach(g => {
    const cnt = g.variables.length;
    tabCounts.all += cnt;
    if (tabCounts[g.source] !== undefined) tabCounts[g.source] += cnt;
  });

  const tabDefs = [
    { key: 'all',        label: '全部' },
    { key: 'trigger',    label: '触发器' },
    { key: 'node',       label: '上游节点' },
    { key: 'global',     label: '全局变量' },
    { key: 'datasource', label: '数据源' },
  ].filter(t => t.key === 'all' || tabCounts[t.key] > 0);

  const tabsHtml = tabDefs.map(t => `
    <span class="var-picker-tab${t.key === 'all' ? ' active' : ''}"
          data-tab="${t.key}"
          onclick="filterVarPickerByTab('${pickerId}', '${t.key}', this)">
      <span class="tab-dot"></span>${t.label}
      <span class="tab-count">${tabCounts[t.key]}</span>
    </span>
  `).join('');

  // 生成每条 item 的 onclick（直接调用外部传入的选择函数）
  const groupsForRender = groups.map(group => ({
    ...group,
    variables: group.variables.map(v => {
      // 左值 picker（selectCondLeftVar）传 path，右值 picker（selectCondVar）传 ref
      const valueArg = (onSelectFn === 'selectCondLeftVar')
        ? v.path.replace(/'/g, "\\'")
        : v.ref.replace(/'/g, "\\'");
      return {
        ...v,
        _selectOnclick: `${onSelectFn}('${pickerId}', '${valueArg}' ${onSelectArg ? ', ' + onSelectArg : ''})`
      };
    })
  }));

  picker.innerHTML = `
    <div class="var-picker-tabs">${tabsHtml}</div>
    <div class="var-picker-search">
      <input type="text" placeholder="搜索变量名或路径..."
             oninput="filterVarPicker('${pickerId}', this.value)">
    </div>
    <div class="var-picker-body" id="${pickerId}_picker_body">
      ${renderCondPickerGroups(groupsForRender, pickerId)}
    </div>
  `;
  picker.style.display = 'flex';

  // 聚焦搜索框
  setTimeout(() => {
    const s = picker.querySelector('.var-picker-search input');
    if (s) s.focus();
  }, 50);

  // 点外部关闭
  const close = (e) => {
    if (!picker.contains(e.target)) {
      picker.style.display = 'none';
      document.removeEventListener('mousedown', close, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', close, true), 0);
}

/**
 * 为 cond picker 渲染分组（与 renderVarPickerGroups 一致，但 onclick 由外部生成）
 */
function renderCondPickerGroups(groups, pickerId) {
  if (groups.length === 0) {
    return '<div class="var-picker-empty">暂无可用变量</div>';
  }
  const sourceBadgeMap = {
    trigger:    { label: '触发器', cls: 'source-trigger' },
    node:       { label: '上游节点', cls: 'source-node' },
    global:     { label: '全局变量', cls: 'source-global' },
    datasource: { label: '数据源', cls: 'source-datasource' },
  };
  const typeLabel = {
    String: 'Str', Number: 'Num', Integer: 'Int', Double: 'Dbl',
    Boolean: 'Bool', Object: 'Obj', Array: 'Arr', File: 'File', DateTime: 'Date'
  };
  return groups.map(group => {
    const badge = sourceBadgeMap[group.source];
    const badgeHtml = badge
      ? `<span class="var-picker-source-badge ${badge.cls}">${badge.label}</span>` : '';
    const chevron = `<svg class="var-picker-group-chevron" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 6 8 10 12 6"/></svg>`;
    const itemsHtml = group.variables.map(v => {
      const tLabel = typeLabel[v.type] || v.type || '?';
      return `
        <div class="var-picker-item"
             data-ref="${v.ref}"
             data-path="${v.path}"
             onclick="${v._selectOnclick}">
          <span class="var-type-tag type-${v.type}" title="${v.type}">${tLabel}</span>
          <div class="var-info">
            <div class="var-name">${escHtml(v.name)}</div>
            <div class="var-path">${escHtml(v.path)}</div>
            ${v.desc ? `<div class="var-desc">${escHtml(v.desc)}</div>` : ''}
          </div>
        </div>`;
    }).join('');
    return `
    <div class="var-picker-group" data-group="${group.id}" data-source="${group.source || ''}">
      <div class="var-picker-group-header" onclick="toggleVarPickerGroup(this)">
        <span>${group.name}</span>${badgeHtml}${chevron}
      </div>
      <div class="var-picker-items">${itemsHtml}</div>
    </div>`;
  }).join('');
}

/**
 * 条件行右值变量选择器
 */
function showCondVarPicker(inputId, nodeId, updateFnPfx) {
  const picker = document.getElementById(inputId + '_picker');
  const input  = document.getElementById(inputId);
  if (!picker || !input) return;

  if (picker.style.display === 'flex') { picker.style.display = 'none'; return; }

  const groups = getAvailableVariables(nodeId);
  _showCondPickerAt(picker, input, groups, inputId, 'selectCondVar', JSON.stringify(updateFnPfx));
}

/**
 * 条件行左值变量选择器
 */
function showCondLeftVarPicker(leftInputId, nodeId, updateFnPfx) {
  const picker   = document.getElementById(leftInputId + '_picker');
  const btn      = document.getElementById(leftInputId + '_btn');
  const anchorEl = btn || document.getElementById(leftInputId);
  if (!picker || !anchorEl) return;

  if (picker.style.display === 'flex') { picker.style.display = 'none'; return; }

  const groups = getAvailableVariables(nodeId);
  _showCondPickerAt(picker, anchorEl, groups, leftInputId, 'selectCondLeftVar', JSON.stringify(updateFnPfx));
}

/**
 * 赋值节点目标变量名选择器 —— 仅展示全局变量供"覆盖赋值"选择
 * 选中后只填入变量名（不是 {{...}} 引用路径）
 */
function showAssignTargetPicker(inputId, nodeId, ruleIndex) {
  const picker = document.getElementById(inputId + '_picker');
  const input  = document.getElementById(inputId);
  if (!picker || !input) return;

  if (picker.style.display === 'flex') { picker.style.display = 'none'; return; }

  // 只取全局变量
  const globalVars = designerVariables;
  if (globalVars.length === 0) {
    // 无全局变量时给出提示
    picker.style.display = 'flex';
    picker.style.flexDirection = 'column';
    picker.innerHTML = `<div style="padding:12px;font-size:12px;color:var(--md-on-surface-variant);text-align:center">暂无全局变量<br><span style="font-size:11px;opacity:0.7">可在底部变量面板中添加</span></div>`;
    const r0 = input.getBoundingClientRect();
    picker.style.left = Math.min(r0.left, window.innerWidth - 270) + 'px';
    picker.style.top = (r0.bottom + 4) + 'px';
    const close = () => { picker.style.display = 'none'; document.removeEventListener('mousedown', close); };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
    return;
  }

  picker.style.display = 'flex';
  picker.style.flexDirection = 'column';
  picker.innerHTML = `
    <div style="padding:6px 8px 4px;font-size:10px;font-weight:600;color:var(--md-on-surface-variant);border-bottom:1px solid var(--md-outline-variant);margin-bottom:2px">
      📦 全局变量 <span style="font-weight:400;opacity:0.7">— 选中将覆盖该变量的值</span>
    </div>
    ${globalVars.map(v => `
      <div class="var-picker-item" onclick="selectAssignTarget('${inputId}', ${nodeId}, ${ruleIndex}, '${escHtml(v.name)}')">
        <span class="var-icon type-${v.type || 'String'}" style="flex-shrink:0">${(v.type || 'S').charAt(0)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-family:var(--font-family-mono);font-weight:500">${escHtml(v.name)}</div>
          ${v.desc ? `<div style="font-size:10px;color:var(--md-on-surface-variant)">${escHtml(v.desc)}</div>` : ''}
        </div>
        <span style="font-size:10px;color:var(--md-outline);margin-left:4px">${v.type || 'String'}</span>
      </div>
    `).join('')}
  `;
  const rect = input.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  picker.style.left = Math.min(rect.left, window.innerWidth - 270) + 'px';
  picker.style.top = spaceBelow >= 200 ? (rect.bottom + 4) + 'px' : (rect.top - 244) + 'px';
  picker.style.bottom = '';
  const close = (e) => {
    if (!picker.contains(e.target) && e.target !== input) {
      picker.style.display = 'none';
      document.removeEventListener('mousedown', close);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

/**
 * 选中全局变量后填入赋值目标名，并同步类型
 */
function selectAssignTarget(inputId, nodeId, ruleIndex, varName) {
  const input = document.getElementById(inputId);
  const picker = document.getElementById(inputId + '_picker');
  if (input) {
    input.value = varName;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (picker) picker.style.display = 'none';

  // 同步全局变量类型到赋值规则
  const globalVar = designerVariables.find(v => v.name === varName);
  if (globalVar?.type) {
    updateAssignment(nodeId, ruleIndex, 'type', globalVar.type);
  }
  updateAssignment(nodeId, ruleIndex, 'target', varName);
  refreshAssignOutputVars(nodeId);
  checkAssignOverwrite(inputId);
}

/**
 * 实时检测目标变量名是否与全局变量重名，显示/隐藏覆盖警告
 */
function checkAssignOverwrite(inputId) {
  const input = document.getElementById(inputId);
  const warn  = document.getElementById(inputId + '_warn');
  if (!input || !warn) return;
  const name = input.value.trim();
  const matched = name && designerVariables.find(v => v.name === name);
  if (matched) {
    warn.innerHTML = `⚠ 将覆盖已有全局变量 <strong>${escHtml(matched.name)}</strong>（${matched.type || 'String'}）`;
    warn.style.display = 'flex';
  } else {
    warn.style.display = 'none';
  }
}

/**
 * 确定变量路径属于哪个来源（根据路径前缀）
 */
function _detectVarSource(path) {
  if (!path) return 'unknown';
  if (path.startsWith('ds.'))   return 'datasource';
  if (path.startsWith('vars.')) return 'global';
  // 触发器：路径第一段是 trigger 节点 code
  const trigNode = designerNodes.find(n => n.type === 'trigger');
  if (trigNode && path.startsWith(trigNode.code + '.')) return 'trigger';
  return 'node';
}

/**
 * 在 input 旁边显示变量 chip（单值引用场景专用）
 * @param {string} inputId    - input 元素的 id
 * @param {string} path       - 变量路径（不含 {{}}），用于显示名称和来源判断
 * @param {string} clearFnCall - 点击 ✕ 时执行的 JS 字符串
 */
function showVarChip(inputId, path, clearFnCall) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const wrap = input.closest('.cond-right-wrap, .config-field');
  if (!wrap) return;

  // 隐藏 input 和 ⊙ 按钮
  input.style.display = 'none';
  const refBtn = wrap.querySelector('.cond-ref-btn');
  if (refBtn) refBtn.style.display = 'none';

  // 移除已有 chip
  const existing = wrap.querySelector('.var-chip-wrap');
  if (existing) existing.remove();

  const source = _detectVarSource(path);
  // 显示名：取路径末段
  const displayName = path.split('.').pop() || path;
  // 来源标注文字
  const sourceLabel = { trigger: '触发器', node: '节点', global: '全局变量', datasource: '数据源', unknown: '变量' };
  const typeChar = { trigger: 'T', node: 'N', global: 'G', datasource: 'D', unknown: 'V' };

  const chipWrap = document.createElement('div');
  chipWrap.className = 'var-chip-wrap';
  chipWrap.innerHTML = `
    <div class="var-chip" data-source="${source}" title="${path}">
      <span class="var-chip-icon" title="${sourceLabel[source]}">${typeChar[source]}</span>
      <span class="var-chip-name">${escHtml(path)}</span>
      <button class="var-chip-clear" onclick="${clearFnCall}" title="清除，恢复手动输入">✕</button>
    </div>
  `;

  // 插到 input 前
  wrap.insertBefore(chipWrap, input);
}

/**
 * 清除变量 chip，恢复 input 可编辑状态
 * @param {string} inputId  - 对应 input 的 id
 * @param {string} onChange - 清空时触发的持久化调用
 */
function clearVarChip(inputId, onChange) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const wrap = input.closest('.cond-right-wrap, .config-field');
  if (!wrap) return;

  // 移除 chip
  const chip = wrap.querySelector('.var-chip-wrap');
  if (chip) chip.remove();

  // 恢复 input 和 ⊙ 按钮
  input.style.display = '';
  input.value = '';
  const refBtn = wrap.querySelector('.cond-ref-btn');
  if (refBtn) refBtn.style.display = '';

  input.focus();

  // 触发持久化
  if (onChange) {
    try { new Function(onChange)(); } catch(e) {}
  }
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 右值选中变量（替换 input 为 chip）
 */
function selectCondVar(inputId, ref, updateFnPfx) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // 写入真实值（用于持久化）
  input.value = ref;
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // 关闭 picker
  const picker = document.getElementById(inputId + '_picker');
  if (picker) picker.style.display = 'none';

  // 提取 path（去掉 {{}}）
  const path = ref.replace(/^\{\{/, '').replace(/\}\}$/, '');
  const clearCall = `clearVarChip('${inputId}', '${updateFnPfx.replace(/'/g, "\\'")}'+'right', null)')`;
  showVarChip(inputId, path, `clearVarChip('${inputId}', null)`);
}

/**
 * 左值选中变量（替换 input 为 chip）
 */
function selectCondLeftVar(leftInputId, path, updateFnPfx) {
  const input = document.getElementById(leftInputId);
  if (!input) return;

  // 写入真实值并触发持久化
  input.value = path;
  const fn = new Function(`${updateFnPfx}'left',${JSON.stringify(path)})`);
  try { fn(); } catch(e) { console.warn('selectCondLeftVar callback failed', e); }

  // 关闭 picker
  const picker = document.getElementById(leftInputId + '_picker');
  if (picker) picker.style.display = 'none';

  showVarChip(leftInputId, path, `clearVarChip('${leftInputId}', null)`);
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
    case 'code': {
      const codeOutputVars = node.config?.codeOutputVars;
      if (codeOutputVars && codeOutputVars.length > 0) {
        const sample = {};
        codeOutputVars.forEach(v => {
          if (v.name) {
            switch (v.type) {
              case 'Number': sample[v.name] = 0; break;
              case 'Boolean': sample[v.name] = false; break;
              case 'Array': sample[v.name] = []; break;
              case 'Object': sample[v.name] = {}; break;
              default: sample[v.name] = '示例值';
            }
          }
        });
        return sample;
      }
      return { result: { data: '代码执行结果' } };
    }
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
          onclick="insertVarIntoExpandModal(${JSON.stringify(v.ref).replace(/"/g, '&quot;')})"
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
