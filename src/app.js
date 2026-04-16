/* ============================================
   Beaver - Prototype Application Logic
   Modules: Data Source + Workspace + Workspace Internal Features
   ============================================ */

// --- SVG Icons ---
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
let isComposing = false;
let searchFocused = false;
const icons = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
  arrowUpDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
  alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L2 9"/><path d="M2 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 15"/><path d="M2 3v6h6"/><path d="M22 21v-6h-6"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  removeUser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="16" y1="11" y2="11"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>',
  workflow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3a1 1 0 0 0 1 1h4"/><path d="M18 9v3a1 1 0 0 1-1 1h-4"/><path d="M12 13v2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
  transfer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8L22 12L18 16"/><path d="M2 12h20"/><path d="M6 16L2 12L6 8"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v16h16"/><path d="m5 19 6-6"/><path d="m2 6 3-3 3 3"/><path d="m18 16 3 3-3 3"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  disable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
  chevronUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>',
};

// ============================================
//   SHARED STATE
// ============================================
let currentModule = 'workspace';

// ============================================
//   DATA SOURCE MODULE - Mock Data & State
// ============================================
let dataSources = [
  { id: 1, name: '酒店星级字典', desc: '定义酒店星级分类标准', createdAt: '2025-03-15', creator: 'Admin', isPublic: true, referenced: true, referenceCount: 3, items: [{ key: 'ONE_STAR', value: '一星级', type: 'String', updatedAt: '2025-04-12 10:00' }, { key: 'TWO_STAR', value: '二星级', type: 'String', updatedAt: '2025-04-11 15:30' }, { key: 'STAR_COUNT', value: '5', type: 'Integer', updatedAt: '2025-04-10 09:00' }, { key: 'IS_ACTIVE', value: 'true', type: 'Boolean', updatedAt: '2025-04-09 14:20' }, { key: 'AVG_PRICE', value: '688.50', type: 'Double', updatedAt: '2025-04-08 11:00' }, { key: 'LAST_SYNC', value: '2025-04-10T14:30', type: 'DateTime', updatedAt: '2025-04-10 14:30' }], authorizedSpaces: [], syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [] },
  { id: 2, name: '货币代码', desc: '国际标准货币代码对照表', createdAt: '2025-03-18', creator: 'Sukey Wu', isPublic: true, referenced: true, referenceCount: 8, items: [{ key: 'CNY', value: '人民币', type: 'String', updatedAt: '2025-04-10 14:30' }, { key: 'USD', value: '美元', type: 'String', updatedAt: '2025-04-10 14:30' }, { key: 'EUR', value: '欧元', type: 'String', updatedAt: '2025-04-10 14:30' }], authorizedSpaces: [], syncConfig: { url: 'https://api.example.com/currencies', keyField: 'code', valueField: 'name_cn' }, syncLogs: [{ time: '2025-04-10 14:30', operator: 'Sukey Wu', strategy: '全量覆盖', result: 'success', summary: '新增 0 条、更新 7 条、删除 0 条', reason: '' }] },
  { id: 3, name: '房型代码', desc: '酒店房型编码与中文名称映射', createdAt: '2025-03-22', creator: 'Admin', isPublic: false, referenced: true, referenceCount: 2, items: [{ key: 'SGL', value: '单人房', type: 'String', updatedAt: '2026-04-16 11:20' }, { key: 'DBL', value: '双人房', type: 'String', updatedAt: '2026-04-15 09:30' }, { key: 'TWN', value: '双床房', type: 'String', updatedAt: '2026-04-14 16:45' }], authorizedSpaces: ['酒店预订流程', '数据清洗工作区'], syncConfig: { url: 'https://api.hotel.com/room-types', keyField: 'code', valueField: 'name_cn' }, syncLogs: [
    { time: '2026-04-16 11:20', operator: 'Sukey Wu', strategy: '全量覆盖', result: 'error', summary: '', reason: 'API 返回格式异常' },
    { time: '2026-04-16 11:20', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 2 条、更新 8 条', reason: '' },
    { time: '2026-04-15 09:30', operator: 'Admin', strategy: '全量覆盖', result: 'success', summary: '新增 0 条、更新 12 条', reason: '' },
    { time: '2026-04-14 16:45', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 1 条、更新 3 条', reason: '' },
    { time: '2026-04-13 10:00', operator: 'Admin', strategy: '全量覆盖', result: 'error', summary: '', reason: '网络连接超时' },
    { time: '2026-04-12 14:20', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 0 条、更新 5 条', reason: '' },
    { time: '2026-04-11 08:15', operator: 'Admin', strategy: '全量覆盖', result: 'success', summary: '新增 3 条、更新 7 条', reason: '' },
    { time: '2026-04-10 17:30', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 0 条、更新 2 条', reason: '' },
    { time: '2026-04-09 11:00', operator: 'Admin', strategy: '全量覆盖', result: 'success', summary: '新增 1 条、更新 9 条', reason: '' },
    { time: '2026-04-08 15:45', operator: 'Sukey Wu', strategy: '增量更新', result: 'error', summary: '', reason: '字段映射错误' },
    { time: '2026-04-07 09:20', operator: 'Admin', strategy: '全量覆盖', result: 'success', summary: '新增 2 条、更新 6 条', reason: '' },
    { time: '2026-04-06 13:10', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 0 条、更新 4 条', reason: '' },
    { time: '2026-04-05 10:30', operator: 'Admin', strategy: '全量覆盖', result: 'success', summary: '新增 5 条、更新 11 条', reason: '' },
    { time: '2026-04-04 16:00', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 1 条、更新 2 条', reason: '' },
    { time: '2026-04-03 08:45', operator: 'Admin', strategy: '全量覆盖', result: 'error', summary: '', reason: 'API 认证失败' },
  ] },
  { id: 4, name: '供应商列表', desc: '酒店供应商接入方清单', createdAt: '2025-04-01', creator: 'Sukey Wu', isPublic: false, referenced: false, referenceCount: 0, items: [{ key: 'SUPPLIER_A', value: 'Expedia', type: 'String', updatedAt: '2025-04-01 10:00' }, { key: 'SUPPLIER_B', value: 'Booking.com', type: 'String', updatedAt: '2025-04-01 10:00' }], authorizedSpaces: ['酒店预订流程'], syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [] },
  { id: 5, name: '订单状态码', desc: '订单生命周期各阶段状态定义', createdAt: '2025-04-05', creator: 'Admin', isPublic: true, referenced: true, referenceCount: 5, items: [{ key: 'PENDING', value: '待处理', type: 'String', updatedAt: '2025-04-05 09:00' }, { key: 'CONFIRMED', value: '已确认', type: 'String', updatedAt: '2025-04-05 09:00' }, { key: 'CANCELLED', value: '已取消', type: 'String', updatedAt: '2025-04-05 09:00' }], authorizedSpaces: [], syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [] },
];

const allSpaces = ['酒店预订流程', '机票同步流程', '数据清洗工作区', '报表统计空间', '通知推送流程'];
const spaceColors = ['bg-blue', 'bg-green', 'bg-purple', 'bg-orange', 'bg-pink', 'bg-cyan'];

let currentView = 'list';
let currentDsId = null;
let currentTab = 'items';
let listState = { search: '', authFilter: 'all', refFilter: 'all', creatorFilter: [], dateFrom: '', dateTo: '', page: 1, pageSize: 10, filterPanelOpen: true, creatorDropdownOpen: false, creatorSearch: '' };
let searchTimer = null;
let itemSortField = null;
let itemSortAsc = true;
let itemPage = 1;
let itemPageSize = 10;
let syncLogPage = 1;
let syncLogPageSize = 10;
let nextId = 11;

// ============================================
//   WORKSPACE MODULE - Mock Data & State
// ============================================
const ssoUsers = [
  { id: 101, name: 'Sukey Wu', avatar: 'S', dept: '产品部' },
  { id: 102, name: 'Admin', avatar: 'A', dept: '技术部' },
  { id: 103, name: '张三', avatar: '张', dept: '开发部' },
  { id: 104, name: '李四', avatar: '李', dept: '测试部' },
  { id: 105, name: '王五', avatar: '王', dept: '运维部' },
  { id: 106, name: '赵六', avatar: '赵', dept: '产品部' },
  { id: 107, name: '钱七', avatar: '钱', dept: '设计部' },
  { id: 108, name: '孙八', avatar: '孙', dept: '市场部' },
  { id: 109, name: '周九', avatar: '周', dept: '销售部' },
  { id: 110, name: '吴十', avatar: '吴', dept: '财务部' },
  { id: 111, name: 'Emily Chen', avatar: 'E', dept: '国际业务部' },
  { id: 112, name: 'Jason Liu', avatar: 'J', dept: '数据部' },
];

let workspaces = [
  { id: 1, name: '酒店预订流程', desc: '管理酒店预订相关的所有工作流，包括搜索、预订、确认和取消等环节', code: 'HOTEL_BOOKING', workflowCount: 8, myRole: 'admin', createdAt: '2025-01-10', lastActiveAt: '2025-04-13 14:30', runningInstances: 3, members: [
    { userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'admin', joinedAt: '2025-01-10' },
    { userId: 102, name: 'Admin', avatar: 'A', role: 'admin', joinedAt: '2025-01-10' },
    { userId: 103, name: '张三', avatar: '张', role: 'member', joinedAt: '2025-02-01' },
    { userId: 104, name: '李四', avatar: '李', role: 'member', joinedAt: '2025-02-15' },
    { userId: 105, name: '王五', avatar: '王', role: 'member', joinedAt: '2025-03-01' },
    { userId: 106, name: '赵六', avatar: '赵', role: 'viewer', joinedAt: '2025-03-15' },
    { userId: 107, name: '钱七', avatar: '钱', role: 'member', joinedAt: '2025-03-20' },
  ] },
  { id: 2, name: '机票同步流程', desc: '航班数据同步与机票库存管理', code: 'FLIGHT_SYNC', workflowCount: 5, myRole: 'member', createdAt: '2025-02-01', lastActiveAt: '2025-04-12 09:15', runningInstances: 0, members: [
    { userId: 102, name: 'Admin', avatar: 'A', role: 'admin', joinedAt: '2025-02-01' },
    { userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'member', joinedAt: '2025-02-10' },
    { userId: 103, name: '张三', avatar: '张', role: 'member', joinedAt: '2025-02-15' },
    { userId: 111, name: 'Emily Chen', avatar: 'E', role: 'viewer', joinedAt: '2025-03-01' },
  ] },
  { id: 3, name: '数据清洗工作区', desc: '数据质量检查与清洗流程管理', code: 'DATA_CLEANING', workflowCount: 3, myRole: 'admin', createdAt: '2025-02-20', lastActiveAt: '2025-04-11 16:45', runningInstances: 1, members: [
    { userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'admin', joinedAt: '2025-02-20' },
    { userId: 112, name: 'Jason Liu', avatar: 'J', role: 'member', joinedAt: '2025-03-01' },
    { userId: 104, name: '李四', avatar: '李', role: 'member', joinedAt: '2025-03-10' },
  ] },
  { id: 4, name: '报表统计空间', desc: '业务数据统计报表自动生成流程', code: 'REPORT_STATS', workflowCount: 6, myRole: 'viewer', createdAt: '2025-03-05', lastActiveAt: '2025-04-10 11:20', runningInstances: 0, members: [
    { userId: 102, name: 'Admin', avatar: 'A', role: 'admin', joinedAt: '2025-03-05' },
    { userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'viewer', joinedAt: '2025-03-20' },
  ] },
  { id: 5, name: '通知推送流程', desc: '多渠道消息通知与推送管理', code: 'NOTIFICATION', workflowCount: 4, myRole: 'member', createdAt: '2025-03-15', lastActiveAt: '2025-04-09 08:30', runningInstances: 2, members: [
    { userId: 103, name: '张三', avatar: '张', role: 'admin', joinedAt: '2025-03-15' },
    { userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'member', joinedAt: '2025-03-20' },
  ] },
  { id: 6, name: '客户服务流程', desc: '客户投诉处理、工单流转与满意度回访', code: 'CUSTOMER_SVC', workflowCount: 7, myRole: 'admin', createdAt: '2025-03-25', lastActiveAt: '2025-04-08 17:00', runningInstances: 0, members: [
    { userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'admin', joinedAt: '2025-03-25' },
    { userId: 108, name: '孙八', avatar: '孙', role: 'member', joinedAt: '2025-04-01' },
  ] },
];

let wsCurrentView = 'list';
let wsCurrentId = null;
let wsMemberTab = 'admin';
let wsListState = { search: '', roleFilter: 'all', sortField: 'lastActiveAt', sortAsc: false, page: 1, pageSize: 12 };
let wsNextId = 7;
const wsCardColors = [
  { bg: '#EEF2FF', color: '#4F46E5' }, { bg: '#DCFCE7', color: '#16A34A' },
  { bg: '#F1F5F9', color: '#64748B' }, { bg: '#FEF3C7', color: '#D97706' },
  { bg: '#EDE9FE', color: '#8B5CF6' }, { bg: '#DBEAFE', color: '#2563EB' },
];

// ============================================
//   WORKSPACE INTERNAL - State & Mock Data
// ============================================
let wsInternalTab = 'workflows';
let wsCurrentFolderId = null;
let wsFolderPath = [];
let wsContentSearch = '';
let wsContentStatusFilter = 'all';
let wsContentSortField = 'editedAt';
let wsContentSortAsc = false;
let wsContentCreatorFilter = 'all';
let wsExecSearch = '';
let wsExecStatusFilter = 'all';
let wsExecTriggerFilter = 'all';
let wsExecWfFilter = 'all';
let wsExecTimeRange = 'all';
let wsExecDetailId = null;
let wsExecShowArchive = false;
let wfNextId = 100;
let folderNextId = 200;

// Folders per workspace
let wsFolders = {
  1: [
    { id: 1, name: '预订核心流程', desc: '酒店预订核心业务流程', parentId: null, wsId: 1, creator: 'Sukey Wu', createdAt: '2025-01-15', editedAt: '2025-04-12 10:30' },
    { id: 2, name: '搜索相关', desc: '酒店搜索与筛选', parentId: null, wsId: 1, creator: 'Admin', createdAt: '2025-01-20', editedAt: '2025-04-10 14:00' },
    { id: 3, name: '取消与退款', desc: '取消和退款处理', parentId: 1, wsId: 1, creator: 'Sukey Wu', createdAt: '2025-02-10', editedAt: '2025-04-08 09:15' },
    { id: 4, name: '供应商对接', desc: '供应商API对接', parentId: null, wsId: 1, creator: '张三', createdAt: '2025-03-01', editedAt: '2025-04-06 16:00' },
    { id: 5, name: '退款审批', desc: '退款审批子流程', parentId: 3, wsId: 1, creator: 'Sukey Wu', createdAt: '2025-03-10', editedAt: '2025-04-05 11:00' },
    { id: 6, name: 'Expedia对接', desc: '', parentId: 4, wsId: 1, creator: '张三', createdAt: '2025-03-15', editedAt: '2025-04-04 14:00' },
    { id: 7, name: 'Booking对接', desc: '', parentId: 4, wsId: 1, creator: '张三', createdAt: '2025-03-16', editedAt: '2025-04-04 15:00' },
  ],
  2: [{ id: 10, name: '航班数据同步', desc: '实时航班数据采集', parentId: null, wsId: 2, creator: 'Admin', createdAt: '2025-02-05', editedAt: '2025-04-11 08:00' }],
  3: [], 4: [], 5: [], 6: [],
};

// Workflows per workspace
let wsWorkflows = {
  1: [
    { id: 1, name: '酒店搜索', code: 'HTL_SEARCH', desc: '根据条件搜索可用酒店列表', type: 'app', allowRef: true, status: 'published', version: 3, creator: 'Sukey Wu', owners: [101, 103], folderId: 2, wsId: 1, createdAt: '2025-01-20', editedAt: '2025-04-13 14:30', lastRun: 'success', runningCount: 0, execCount: 45, debugPassed: true, versions: [
      { v: 3, status: 'current', publishedAt: '2025-04-13 14:00', publisher: 'Sukey Wu', note: '优化搜索性能' },
      { v: 2, status: 'history', publishedAt: '2025-03-20 10:00', publisher: 'Admin', note: '增加价格筛选' },
      { v: 1, status: 'history', publishedAt: '2025-02-01 09:00', publisher: 'Sukey Wu', note: '初始版本' },
    ] },
    { id: 2, name: '酒店预订确认', code: 'HTL_CONFIRM', desc: '处理酒店预订确认和通知', type: 'app', allowRef: false, status: 'published', version: 2, creator: 'Admin', owners: [102], folderId: 1, wsId: 1, createdAt: '2025-01-25', editedAt: '2025-04-12 10:30', lastRun: 'running', runningCount: 2, execCount: 32, debugPassed: true, versions: [
      { v: 2, status: 'current', publishedAt: '2025-04-10 16:00', publisher: 'Admin', note: '增加短信通知' },
      { v: 1, status: 'history', publishedAt: '2025-02-05 14:00', publisher: 'Admin', note: '' },
    ] },
    { id: 3, name: '订单取消处理', code: 'HTL_CANCEL', desc: '自动化处理客户取消订单请求', type: 'app', allowRef: true, status: 'published', version: 1, creator: 'Sukey Wu', owners: [101], folderId: 3, wsId: 1, createdAt: '2025-02-15', editedAt: '2025-04-08 09:15', lastRun: 'failed', runningCount: 0, execCount: 18, debugPassed: true, versions: [{ v: 1, status: 'current', publishedAt: '2025-03-01 11:00', publisher: 'Sukey Wu', note: '初始发布' }] },
    { id: 4, name: '退款流程', code: 'HTL_REFUND', desc: '客户退款申请审批与执行', type: 'app', allowRef: false, status: 'draft', version: 0, creator: '张三', owners: [103], folderId: 3, wsId: 1, createdAt: '2025-03-20', editedAt: '2025-04-07 15:45', lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, versions: [] },
    { id: 5, name: '智能客服对话', code: 'HTL_CHAT', desc: '基于AI的酒店预订智能客服', type: 'chat', allowRef: false, status: 'published', version: 2, creator: 'Sukey Wu', owners: [101, 107], folderId: null, wsId: 1, createdAt: '2025-02-28', editedAt: '2025-04-11 11:20', lastRun: 'success', runningCount: 1, execCount: 120, debugPassed: true, versions: [
      { v: 2, status: 'current', publishedAt: '2025-04-05 09:30', publisher: 'Sukey Wu', note: '优化对话逻辑' },
      { v: 1, status: 'history', publishedAt: '2025-03-10 14:00', publisher: 'Sukey Wu', note: '' },
    ] },
    { id: 6, name: '供应商价格同步', code: 'SUPPLIER_PRICE', desc: '定时同步各供应商最新价格', type: 'app', allowRef: false, status: 'disabled', version: 2, creator: 'Admin', owners: [102], folderId: 4, wsId: 1, createdAt: '2025-03-05', editedAt: '2025-04-06 16:00', lastRun: 'success', runningCount: 0, execCount: 60, debugPassed: true, versions: [
      { v: 2, status: 'current', publishedAt: '2025-03-25 10:00', publisher: 'Admin', note: '增加Agoda接入' },
      { v: 1, status: 'history', publishedAt: '2025-03-10 09:00', publisher: 'Admin', note: '' },
    ] },
    { id: 7, name: '预订数据报表', code: 'HTL_REPORT', desc: '每日酒店预订统计报表', type: 'app', allowRef: false, status: 'published', version: 1, creator: '钱七', owners: [107], folderId: null, wsId: 1, createdAt: '2025-03-25', editedAt: '2025-04-09 08:00', lastRun: 'success', runningCount: 0, execCount: 15, debugPassed: true, versions: [{ v: 1, status: 'current', publishedAt: '2025-04-01 10:00', publisher: '钱七', note: '初始版本' }] },
    { id: 8, name: '库存预警通知', code: 'HTL_STOCK_ALERT', desc: '酒店库存不足自动预警', type: 'app', allowRef: false, status: 'draft', version: 0, creator: '李四', owners: [104], folderId: null, wsId: 1, createdAt: '2025-04-10', editedAt: '2025-04-13 09:30', lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, versions: [] },
  ],
  2: [
    { id: 20, name: '航班信息拉取', code: 'FLT_PULL', desc: '从供应商API拉取航班数据', type: 'app', allowRef: true, status: 'published', version: 4, creator: 'Admin', owners: [102], folderId: 10, wsId: 2, createdAt: '2025-02-05', editedAt: '2025-04-12 09:15', lastRun: 'success', runningCount: 0, execCount: 200, debugPassed: true, versions: [] },
    { id: 21, name: '库存更新', code: 'FLT_INVENTORY', desc: '实时更新机票库存', type: 'app', allowRef: false, status: 'published', version: 2, creator: 'Sukey Wu', owners: [101], folderId: 10, wsId: 2, createdAt: '2025-02-10', editedAt: '2025-04-11 15:30', lastRun: 'running', runningCount: 1, execCount: 150, debugPassed: true, versions: [] },
    { id: 22, name: '价格计算', code: 'FLT_PRICE_CALC', desc: '动态计算机票价格', type: 'app', allowRef: true, status: 'draft', version: 0, creator: '张三', owners: [103], folderId: null, wsId: 2, createdAt: '2025-03-20', editedAt: '2025-04-08 11:00', lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, versions: [] },
  ],
  3: [{ id: 30, name: '数据格式校验', code: 'DC_VALIDATE', desc: '校验上游数据格式', type: 'app', allowRef: true, status: 'published', version: 1, creator: 'Sukey Wu', owners: [101], folderId: null, wsId: 3, createdAt: '2025-02-25', editedAt: '2025-04-11 16:45', lastRun: 'success', runningCount: 0, execCount: 80, debugPassed: true, versions: [] }],
  4: [], 5: [], 6: [],
};

// Execution records per workspace
let wsExecutions = {
  1: [
    { id: 2001, wfId: 1, wfName: '酒店搜索', wfCode: 'HTL_SEARCH', version: 3, trigger: 'manual', status: 'completed', startTime: '2025-04-13 14:00:15', endTime: '2025-04-13 14:02:30', duration: '2分15秒', triggerUser: 'Sukey Wu', archived: false, nodes: [
      { name: '触发节点', type: '手动触发', status: 'success', duration: '0.1秒', startTime: '14:00:15' },
      { name: '参数解析', type: '代码节点', status: 'success', duration: '0.3秒', startTime: '14:00:15' },
      { name: '调用搜索API', type: 'HTTP请求', status: 'success', duration: '1分50秒', startTime: '14:00:16' },
      { name: '返回结果', type: '结束节点', status: 'success', duration: '0.1秒', startTime: '14:02:29' },
    ] },
    { id: 2002, wfId: 2, wfName: '酒店预订确认', wfCode: 'HTL_CONFIRM', version: 2, trigger: 'manual', status: 'running', startTime: '2025-04-13 13:45:00', endTime: '-', duration: '20分+', triggerUser: 'Admin', archived: false, nodes: [
      { name: '触发节点', type: '手动触发', status: 'success', duration: '0.1秒', startTime: '13:45:00' },
      { name: '订单校验', type: '代码节点', status: 'success', duration: '1.2秒', startTime: '13:45:00' },
      { name: '供应商确认', type: 'HTTP请求', status: 'running', duration: '进行中', startTime: '13:45:01' },
    ] },
    { id: 2003, wfId: 2, wfName: '酒店预订确认', wfCode: 'HTL_CONFIRM', version: 2, trigger: 'event', status: 'running', startTime: '2025-04-13 12:30:00', endTime: '-', duration: '1小时+', triggerUser: '系统', archived: false, nodes: [
      { name: '事件触发', type: '事件触发', status: 'success', duration: '0.1秒', startTime: '12:30:00' },
      { name: '供应商确认', type: 'HTTP请求', status: 'running', duration: '进行中', startTime: '12:30:01' },
    ] },
    { id: 2004, wfId: 3, wfName: '订单取消处理', wfCode: 'HTL_CANCEL', version: 1, trigger: 'manual', status: 'failed', startTime: '2025-04-12 16:20:00', endTime: '2025-04-12 16:22:15', duration: '2分15秒', triggerUser: 'Sukey Wu', archived: false, nodes: [
      { name: '触发节点', type: '手动触发', status: 'success', duration: '0.1秒', startTime: '16:20:00' },
      { name: '订单查询', type: 'HTTP请求', status: 'success', duration: '1.5秒', startTime: '16:20:00' },
      { name: '取消请求', type: 'HTTP请求', status: 'failed', duration: '2分10秒', startTime: '16:20:02', error: '供应商API返回500错误' },
      { name: '通知客户', type: '消息通知', status: 'skipped', duration: '-', startTime: '-' },
    ] },
    { id: 2005, wfId: 1, wfName: '酒店搜索', wfCode: 'HTL_SEARCH', version: 3, trigger: 'scheduled', status: 'completed', startTime: '2025-04-12 08:00:00', endTime: '2025-04-12 08:01:45', duration: '1分45秒', triggerUser: '系统', archived: false, nodes: [] },
    { id: 2006, wfId: 5, wfName: '智能客服对话', wfCode: 'HTL_CHAT', version: 2, trigger: 'manual', status: 'running', startTime: '2025-04-13 10:00:00', endTime: '-', duration: '4小时+', triggerUser: '张三', archived: false, nodes: [] },
    { id: 2007, wfId: 6, wfName: '供应商价格同步', wfCode: 'SUPPLIER_PRICE', version: 2, trigger: 'scheduled', status: 'completed', startTime: '2025-04-11 02:00:00', endTime: '2025-04-11 02:15:30', duration: '15分30秒', triggerUser: '系统', archived: false, nodes: [
      { name: '定时触发', type: '定时触发', status: 'success', duration: '0.1秒', startTime: '02:00:00' },
      { name: 'Expedia同步', type: 'HTTP请求', status: 'success', duration: '5分', startTime: '02:00:00' },
      { name: 'Booking同步', type: 'HTTP请求', status: 'success', duration: '6分', startTime: '02:05:00' },
      { name: '数据整合', type: '代码节点', status: 'success', duration: '20秒', startTime: '02:15:00' },
    ] },
    { id: 2008, wfId: 7, wfName: '预订数据报表', wfCode: 'HTL_REPORT', version: 1, trigger: 'scheduled', status: 'paused', startTime: '2025-04-05 06:00:00', endTime: '-', duration: '8天+', triggerUser: '系统', archived: false, stale: true, nodes: [
      { name: '定时触发', type: '定时触发', status: 'success', duration: '0.1秒', startTime: '06:00:00' },
      { name: '报表生成', type: '代码节点', status: 'paused', duration: '已暂停', startTime: '06:02:00' },
    ] },
    { id: 2009, wfId: 1, wfName: '酒店搜索', wfCode: 'HTL_SEARCH', version: 2, trigger: 'manual', status: 'cancelled', startTime: '2025-04-10 15:30:00', endTime: '2025-04-10 15:30:45', duration: '45秒', triggerUser: '李四', archived: false, nodes: [] },
    { id: 2010, wfId: 1, wfName: '酒店搜索', wfCode: 'HTL_SEARCH', version: 2, trigger: 'manual', status: 'completed', startTime: '2025-01-15 10:00:00', endTime: '2025-01-15 10:01:30', duration: '1分30秒', triggerUser: 'Sukey Wu', archived: true, nodes: [] },
  ],
  2: [{ id: 2100, wfId: 20, wfName: '航班信息拉取', wfCode: 'FLT_PULL', version: 4, trigger: 'scheduled', status: 'completed', startTime: '2025-04-12 06:00:00', endTime: '2025-04-12 06:10:00', duration: '10分', triggerUser: '系统', archived: false, nodes: [] }],
  3: [], 4: [], 5: [], 6: [],
};

// ============================================
//   NAVIGATION & MODULE SWITCHING
// ============================================
function switchModule(module) {
  currentModule = module;
  if (module === 'datasource') { currentView = 'list'; currentDsId = null; }
  else if (module === 'workspace') { wsCurrentView = 'list'; wsCurrentId = null; }
  updateSidebarActive(); render();
}
function updateSidebarActive() {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (currentModule === 'datasource') document.getElementById('navDatasource')?.classList.add('active');
  else if (currentModule === 'workspace') document.getElementById('navWorkspace')?.classList.add('active');
}
function toggleNav(el) {
  const children = el.nextElementSibling;
  if (!children || !children.classList.contains('nav-children')) return;
  el.classList.toggle('expanded'); children.classList.toggle('open');
}

// ============================================
//   MAIN RENDER
// ============================================
function render() {
  const content = document.getElementById('mainContent');
  const breadcrumb = document.getElementById('breadcrumb');
  if (currentModule === 'datasource') renderDatasourceModule(content, breadcrumb);
  else if (currentModule === 'workspace') renderWorkspaceModule(content, breadcrumb);
}

// ============================================
//   DATA SOURCE MODULE (compact)
// ============================================
function renderDatasourceModule(content, breadcrumb) {
  if (currentView === 'list') {
    breadcrumb.innerHTML = '<span class="breadcrumb-item current">数据源管理</span>';
    content.innerHTML = renderDsListPage();
  } else if (currentView === 'detail') {
    const ds = dataSources.find(d => d.id === currentDsId);
    if (!ds) { currentView = 'list'; render(); return; }
    breadcrumb.innerHTML = `<span class="breadcrumb-item" onclick="navigateTo('list')">数据源管理</span><span class="breadcrumb-separator">/</span><span class="breadcrumb-item current">${ds.name}</span>`;
    content.innerHTML = renderDsDetailPage(ds);
  }
}
function navigateTo(view, dsId) { currentView = view; currentDsId = dsId || null; if (view === 'detail') currentTab = 'items'; render(); }

function renderDsListPage() {
  const filtered = getFilteredDataSources();
  const total = filtered.length;
  const start = (listState.page - 1) * listState.pageSize;
  const paged = filtered.slice(start, start + listState.pageSize);
  const totalPages = Math.ceil(total / listState.pageSize);
  const creators = [...new Set(dataSources.map(d => d.creator))];
  const hasFilters = listState.search || listState.authFilter !== 'all' || listState.refFilter !== 'all' || listState.creatorFilter.length > 0 || listState.dateFrom || listState.dateTo;
  const activeFilterCount = (listState.authFilter !== 'all' ? 1 : 0) + (listState.refFilter !== 'all' ? 1 : 0) + (listState.creatorFilter.length > 0 ? 1 : 0) + (listState.dateFrom || listState.dateTo ? 1 : 0);

  // Build active filter tags (shown inline in toolbar when panel collapsed)
  let filterTagsHtml = '';
  if (hasFilters && !listState.filterPanelOpen) {
    const tags = [];
    if (listState.authFilter !== 'all') tags.push(`<span class="filter-tag">授权：${listState.authFilter === 'public' ? '公开' : '指定空间'}<button class="filter-tag-close" onclick="event.stopPropagation();removeFilterTag('auth')">×</button></span>`);
    if (listState.refFilter !== 'all') tags.push(`<span class="filter-tag">引用：${listState.refFilter === 'referenced' ? '已引用' : '未引用'}<button class="filter-tag-close" onclick="event.stopPropagation();removeFilterTag('ref')">×</button></span>`);
    if (listState.creatorFilter.length > 0) tags.push(`<span class="filter-tag">创建人：${listState.creatorFilter.join(', ')}<button class="filter-tag-close" onclick="event.stopPropagation();removeFilterTag('creator')">×</button></span>`);
    if (listState.dateFrom || listState.dateTo) tags.push(`<span class="filter-tag">时间：${listState.dateFrom || '...'} ~ ${listState.dateTo || '...'}<button class="filter-tag-close" onclick="event.stopPropagation();removeFilterTag('date')">×</button></span>`);
    if (tags.length) filterTagsHtml = `<div class="filter-tags">${tags.join('')}</div>`;
  }

  // Build creator dropdown trigger text
  const creatorTriggerHtml = listState.creatorFilter.length === 0
    ? '<span style="color:var(--md-on-surface-variant)">全部</span>'
    : listState.creatorFilter.length <= 2
      ? `<span class="creator-mini-tags">${listState.creatorFilter.map(c => `<span class="creator-mini-tag">${c}</span>`).join('')}</span>`
      : `<span class="creator-mini-tags"><span class="creator-mini-tag">${listState.creatorFilter[0]}</span><span class="creator-mini-tag-more">+${listState.creatorFilter.length - 1}</span></span>`;

  // Build creator dropdown panel
  const filteredCreators = listState.creatorSearch ? creators.filter(c => c.toLowerCase().includes(listState.creatorSearch.toLowerCase())) : creators;
  const creatorPanelHtml = listState.creatorDropdownOpen ? `<div class="creator-dropdown-panel" onclick="event.stopPropagation()">
    <div class="creator-dropdown-search">${icons.search}<input type="text" placeholder="搜索创建人..." value="${listState.creatorSearch}" oninput="onCreatorSearch(this.value)" autofocus /></div>
    <div class="creator-dropdown-list">${filteredCreators.length === 0 ? '<div class="creator-dropdown-empty">无匹配结果</div>' : filteredCreators.map(c => {
      const sel = listState.creatorFilter.includes(c);
      return `<div class="creator-dropdown-item ${sel ? 'selected' : ''}" onclick="toggleCreatorSelection('${c}')"><span class="creator-avatar-sm">${c.charAt(0)}</span><span>${c}</span><span class="check-icon">${icons.check}</span></div>`;
    }).join('')}</div></div>` : '';

  return `
    <div class="page-header"><div class="page-title-section"><h1 class="page-title shiny-text">数据源管理</h1><p class="page-subtitle">管理和维护系统数据字典及配置数据</p></div><button class="btn btn-primary magnet-btn" onclick="showCreateDsModal()">${icons.plus}<span>新建数据源</span></button></div>
    <div class="filter-container">
      <div class="filter-toolbar">
        <div class="filter-search">${icons.search}<input type="text" id="dsSearchInput" placeholder="搜索数据源名称..." value="${escHtml(listState.search)}" oninput="onSearchInput(this.value)" onfocus="searchFocused=true" onblur="searchFocused=false" oncompositionstart="isComposing=true" oncompositionend="isComposing=false;onSearchInput(this.value)" /></div>
        <button class="filter-toggle-btn ${listState.filterPanelOpen ? 'active' : ''}" onclick="toggleFilterPanel()">${icons.filter}<span>筛选</span>${activeFilterCount > 0 ? `<span class="filter-badge">${activeFilterCount}</span>` : ''}</button>
        ${filterTagsHtml}
        ${hasFilters ? `<button class="filter-reset-btn" onclick="clearAllFilters()" style="margin-left:auto">${icons.close}<span>清除</span></button>` : ''}
      </div>
      <div class="filter-panel ${listState.filterPanelOpen ? '' : 'collapsed'}">
        <div class="filter-group"><span class="filter-label">授权方式</span><div class="filter-chips">
          <span class="filter-chip ${listState.authFilter === 'all' ? 'active' : ''}" onclick="onFilterAuth('all')">全部</span>
          <span class="filter-chip ${listState.authFilter === 'public' ? 'active' : ''}" onclick="onFilterAuth('public')">公开</span>
          <span class="filter-chip ${listState.authFilter === 'private' ? 'active' : ''}" onclick="onFilterAuth('private')">指定空间</span>
        </div></div>
        <div class="filter-group"><span class="filter-label">引用状态</span><div class="filter-chips">
          <span class="filter-chip ${listState.refFilter === 'all' ? 'active' : ''}" onclick="onFilterRef('all')">全部</span>
          <span class="filter-chip ${listState.refFilter === 'referenced' ? 'active' : ''}" onclick="onFilterRef('referenced')">已引用</span>
          <span class="filter-chip ${listState.refFilter === 'unreferenced' ? 'active' : ''}" onclick="onFilterRef('unreferenced')">未引用</span>
        </div></div>
        <div class="filter-group"><span class="filter-label">创建人</span><div class="creator-dropdown"><div class="creator-dropdown-trigger ${listState.creatorDropdownOpen ? 'open' : ''}" onclick="event.stopPropagation();toggleCreatorDropdown()">${creatorTriggerHtml}</div>${creatorPanelHtml}</div></div>
        <div class="filter-group"><span class="filter-label">创建时间</span><div class="filter-date-range"><input type="date" value="${listState.dateFrom}" onchange="onFilterDateFrom(this.value)" /><span class="date-sep">~</span><input type="date" value="${listState.dateTo}" onchange="onFilterDateTo(this.value)" /></div></div>
      </div>
    </div>
    <div class="ds-table-area">${total === 0 ? (hasFilters ? renderEmptyState('dsSearchEmpty') : renderEmptyState('datasource')) : `
    <div class="table-wrapper"><table class="data-table"><thead><tr><th>名称</th><th style="width:100px">授权方式</th><th style="width:80px">数据项</th><th style="width:90px">被引用</th><th style="width:100px">创建者</th><th style="width:110px">创建时间</th><th style="width:90px">操作</th></tr></thead><tbody>
      ${paged.map(ds => `<tr onclick="navigateTo('detail', ${ds.id})"><td><div class="ds-name-cell"><span class="ds-name">${ds.name}</span>${ds.desc ? `<span class="ds-desc">${ds.desc}</span>` : ''}</div></td><td><span class="badge ${ds.isPublic ? 'badge-public' : 'badge-private'}">${ds.isPublic ? `${icons.globe} 公开` : `${icons.lock} 指定空间`}</span></td><td>${ds.items.length} 条</td><td>${ds.referenced ? `<span class="ref-count">${icons.link} ${ds.referenceCount}</span>` : '<span class="ref-none">未引用</span>'}</td><td>${ds.creator}</td><td>${ds.createdAt}</td><td onclick="event.stopPropagation()"><div class="table-actions"><button class="table-action-btn" title="编辑" onclick="showEditDsModal(${ds.id})">${icons.edit}</button><button class="table-action-btn danger" title="删除" onclick="showDeleteDsModal(${ds.id})">${icons.trash}</button></div></td></tr>`).join('')}
    </tbody></table></div>
    <div class="pagination"><div class="pagination-info"><span>共 ${total} 条记录</span><div class="pagination-divider"></div><span class="pagination-size"><label>每页</label><select onchange="onDsPageSizeChange(this.value)">${[10,20,50].map(n => `<option value="${n}" ${listState.pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}</select><label>条</label></span></div><div class="pagination-controls"><button class="pagination-btn" ${listState.page <= 1 ? 'disabled' : ''} onclick="goToPage(${listState.page - 1})">${icons.chevronLeft}</button>${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `<button class="pagination-btn ${p === listState.page ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>`).join('')}<button class="pagination-btn" ${listState.page >= totalPages ? 'disabled' : ''} onclick="goToPage(${listState.page + 1})">${icons.chevronRight}</button></div></div>`}</div>`;
}
function getFilteredDataSources() {
  return dataSources.filter(ds => {
    if (listState.search && !ds.name.toLowerCase().includes(listState.search.toLowerCase())) return false;
    if (listState.authFilter === 'public' && !ds.isPublic) return false;
    if (listState.authFilter === 'private' && ds.isPublic) return false;
    if (listState.refFilter === 'referenced' && !ds.referenced) return false;
    if (listState.refFilter === 'unreferenced' && ds.referenced) return false;
    if (listState.creatorFilter.length > 0 && !listState.creatorFilter.includes(ds.creator)) return false;
    if (listState.dateFrom && ds.createdAt < listState.dateFrom) return false;
    if (listState.dateTo && ds.createdAt > listState.dateTo) return false;
    return true;
  });
}
function onSearchInput(val) { if (isComposing) return; listState.search = val; clearTimeout(searchTimer); searchTimer = setTimeout(() => { listState.page = 1; render(); }, 300); }
function onFilterAuth(val) { listState.authFilter = val; listState.page = 1; render(); }
function goToPage(p) { listState.page = p; render(); }
function onFilterRef(val) { listState.refFilter = val; listState.page = 1; render(); }
function onFilterDateFrom(val) { listState.dateFrom = val; listState.page = 1; render(); }
function onFilterDateTo(val) { listState.dateTo = val; listState.page = 1; render(); }
function toggleFilterPanel() { listState.filterPanelOpen = !listState.filterPanelOpen; render(); }
function toggleCreatorDropdown() { listState.creatorDropdownOpen = !listState.creatorDropdownOpen; listState.creatorSearch = ''; render(); }
function toggleCreatorSelection(name) {
  const idx = listState.creatorFilter.indexOf(name);
  if (idx > -1) listState.creatorFilter.splice(idx, 1); else listState.creatorFilter.push(name);
  listState.page = 1;
  // --- Targeted DOM updates (no full render, no flash) ---
  // 1. Toggle dropdown item visual state
  document.querySelectorAll('.creator-dropdown-item').forEach(el => {
    if (el.children[1] && el.children[1].textContent === name) el.classList.toggle('selected');
  });
  // 2. Update trigger display
  const trigger = document.querySelector('.creator-dropdown-trigger');
  if (trigger) {
    const f = listState.creatorFilter;
    trigger.innerHTML = f.length === 0
      ? '<span style="color:var(--md-on-surface-variant)">全部</span>'
      : f.length <= 2
        ? `<span class="creator-mini-tags">${f.map(c => `<span class="creator-mini-tag">${c}</span>`).join('')}</span>`
        : `<span class="creator-mini-tags"><span class="creator-mini-tag">${f[0]}</span><span class="creator-mini-tag-more">+${f.length - 1}</span></span>`;
  }
  // 3. Update filter badge
  const activeCount = (listState.authFilter !== 'all' ? 1 : 0) + (listState.refFilter !== 'all' ? 1 : 0) + (listState.creatorFilter.length > 0 ? 1 : 0) + (listState.dateFrom || listState.dateTo ? 1 : 0);
  const badge = document.querySelector('.filter-badge');
  if (activeCount > 0) { if (badge) badge.textContent = activeCount; else { const s = document.createElement('span'); s.className = 'filter-badge'; s.textContent = activeCount; document.querySelector('.filter-toggle-btn')?.appendChild(s); } }
  else { if (badge) badge.remove(); }
  // 4. Refresh table area only (reuse renderDsListPage output to avoid code duplication)
  refreshDsTableArea();
}
function refreshDsTableArea() {
  const old = document.querySelector('.ds-table-area');
  if (!old) return;
  const full = renderDsListPage();
  const tmp = document.createElement('div'); tmp.innerHTML = full;
  const fresh = tmp.querySelector('.ds-table-area');
  if (fresh) old.replaceWith(fresh);
}
function onCreatorSearch(val) {
  listState.creatorSearch = val;
  const listEl = document.querySelector('.creator-dropdown-list');
  if (!listEl) return;
  const creators = [...new Set(dataSources.map(d => d.creator))];
  const filtered = val ? creators.filter(c => c.toLowerCase().includes(val.toLowerCase())) : creators;
  if (filtered.length === 0) { listEl.innerHTML = '<div class="creator-dropdown-empty">无匹配结果</div>'; }
  else { listEl.innerHTML = filtered.map(c => { const sel = listState.creatorFilter.includes(c); return `<div class="creator-dropdown-item ${sel ? 'selected' : ''}" onclick="toggleCreatorSelection('${c}')"><span class="creator-avatar-sm">${c.charAt(0)}</span><span>${c}</span><span class="check-icon">${icons.check}</span></div>`; }).join(''); }
}
function removeFilterTag(type) {
  if (type === 'auth') listState.authFilter = 'all';
  else if (type === 'ref') listState.refFilter = 'all';
  else if (type === 'creator') listState.creatorFilter = [];
  else if (type === 'date') { listState.dateFrom = ''; listState.dateTo = ''; }
  listState.page = 1; render();
}
function clearAllFilters() { listState.search = ''; listState.authFilter = 'all'; listState.refFilter = 'all'; listState.creatorFilter = []; listState.dateFrom = ''; listState.dateTo = ''; listState.page = 1; render(); }
function onDsPageSizeChange(val) { listState.pageSize = parseInt(val); listState.page = 1; render(); }
function validateKeyRealtime(input) {
  const val = input.value, ke = document.getElementById('keyError');
  if (val && !/^[a-zA-Z0-9_-]*$/.test(val)) { input.classList.add('error'); if (ke) { ke.textContent = 'Key 仅支持英文、数字、下划线和连字符'; ke.classList.remove('hidden'); } }
  else { input.classList.remove('error'); if (ke) ke.classList.add('hidden'); }
}
function validateDsNameRealtime(input) {
  const val = input.value, ne = document.getElementById('nameError');
  if (val && !/^[\u4e00-\u9fa5a-zA-Z0-9_-]*$/.test(val)) { input.classList.add('error'); if (ne) { ne.textContent = '仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); } }
  else { input.classList.remove('error'); if (ne) ne.classList.add('hidden'); }
}
function onItemPageChange(page) { itemPage = page; render(); }
function onItemPageSizeChange(size) { itemPageSize = parseInt(size); itemPage = 1; render(); }
function renderPagination(current, total) {
  let pages = '';
  for (let i = 1; i <= total; i++) pages += `<button class="pagination-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  return `<div class="pagination"><button class="pagination-btn" ${current <= 1 ? 'disabled' : ''} onclick="goToPage(${current - 1})">${icons.chevronLeft}</button>${pages}<button class="pagination-btn" ${current >= total ? 'disabled' : ''} onclick="goToPage(${current + 1})">${icons.chevronRight}</button></div>`;
}

function renderEmptyState(type) {
  const s = {
    datasource: { img: './public/images/empty-datasource.png', title: '暂无数据源', desc: '创建您的第一个数据源来管理配置数据', btn: '' },
    dsSearchEmpty: { img: './public/images/empty-datasource.png', title: '未找到匹配的数据源', desc: '请调整搜索或筛选条件', btn: '' },
    dataItems: { img: './public/images/empty-dataitems.png', title: '暂无数据项', desc: '添加数据项来定义数据源内容', btn: `<button class="btn btn-primary" onclick="showAddItemModal(${typeof currentDsId !== 'undefined' ? currentDsId : 0})">${icons.plus}<span>添加数据项</span></button>` },
    syncLog: { img: './public/images/empty-sync-log.png', title: '暂无同步记录', desc: '执行 API 同步后将在此记录历史', btn: '' },
    workspace: { img: './public/images/empty-workspace.png', title: '暂无工作空间', desc: '创建工作空间来组织工作流', btn: `<button class="btn btn-primary" onclick="showCreateWsModal()">${icons.plus}<span>创建空间</span></button>` },
    wsSearchEmpty: { img: './public/images/empty-workspace.png', title: '未找到匹配空间', desc: '请调整搜索或筛选条件', btn: '' },
    folderContent: { img: './public/images/empty-folder-content.png', title: '暂无内容', desc: '创建工作流或文件夹来组织您的空间', btn: '' },
    folderEmpty: { img: './public/images/empty-folder-content.png', title: '该文件夹为空', desc: '在此文件夹中创建工作流或子文件夹', btn: '' },
    executions: { img: './public/images/empty-executions.png', title: '暂无执行记录', desc: '执行工作流后将在此展示运行历史', btn: '' },
    searchNoResult: { img: './public/images/empty-folder-content.png', title: '未找到匹配的工作流', desc: '请调整搜索条件', btn: '' },
    execSearchNoResult: { img: './public/images/empty-executions.png', title: '未找到匹配的执行记录', desc: '请调整搜索条件', btn: '' },
    archiveEmpty: { img: './public/images/empty-executions.png', title: '暂无归档记录', desc: '超过90天的已终结记录将自动归档', btn: '' },
  }[type] || { img: '', title: '暂无内容', desc: '', btn: '' };
  return `<div class="empty-state"><img src="${s.img}" alt="${s.title}" class="empty-state-img" /><div class="empty-state-title">${s.title}</div><div class="empty-state-desc">${s.desc}</div>${s.btn}</div>`;
}

function renderDsDetailPage(ds) {
  const tabItems = [{ key: 'items', label: '数据项', count: ds.items.length }, { key: 'auth', label: '授权管理', count: ds.isPublic ? '' : ds.authorizedSpaces.length }, { key: 'sync', label: 'API 同步', count: ds.syncLogs.length }];
  return `
    <div class="detail-back" onclick="navigateTo('list')">${icons.arrowLeft}<span>返回列表</span></div>
    <div class="detail-header"><div class="detail-header-info"><h1 class="detail-title">${ds.name}</h1>${ds.desc ? `<p class="detail-desc">${ds.desc}</p>` : ''}<div class="detail-meta"><span class="detail-meta-item">${icons.user} ${ds.creator} 创建</span><span class="detail-meta-item">${icons.calendar} 创建于 ${ds.createdAt}</span><span class="detail-meta-item">${ds.isPublic ? `${icons.globe} 公开` : `${icons.lock} 指定空间`}</span></div></div>
    <div class="detail-header-actions"><button class="btn btn-secondary" onclick="showEditDsModal(${ds.id})">${icons.edit}<span>编辑</span></button><button class="btn btn-danger" onclick="showDeleteDsModal(${ds.id})">${icons.trash}<span>删除</span></button></div></div>
    <div class="tabs-container"><div class="tabs-header">${tabItems.map(t => `<div class="tab-item ${currentTab === t.key ? 'active' : ''}" onclick="switchTab('${t.key}')">${t.label}${t.count !== '' ? ` <span class="badge badge-type">${t.count}</span>` : ''}</div>`).join('')}</div><div class="tab-content">${currentTab === 'items' ? renderDataItemsTab(ds) : currentTab === 'auth' ? renderAuthTab(ds) : renderSyncTab(ds)}</div></div>`;
}
function switchTab(tab) { currentTab = tab; syncLogPage = 1; itemPage = 1; render(); }

function renderDataItemsTab(ds) {
  if (ds.items.length === 0) return renderEmptyState('dataItems');
  const sorted = [...ds.items];
  if (itemSortField) sorted.sort((a, b) => { const va = String(a[itemSortField]).toLowerCase(), vb = String(b[itemSortField]).toLowerCase(); return itemSortAsc ? va.localeCompare(vb) : vb.localeCompare(va); });
  else sorted.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const total = sorted.length;
  const totalPages = Math.ceil(total / itemPageSize);
  if (itemPage > totalPages) itemPage = totalPages;
  const start = (itemPage - 1) * itemPageSize;
  const paged = sorted.slice(start, start + itemPageSize);
  const si = (f) => itemSortField === f ? (itemSortAsc ? icons.arrowUp : icons.arrowDown) : icons.arrowUpDown;
  const addBtnDisabled = ds.items.length >= 500;
  const addBtn = addBtnDisabled
    ? `<span title="已达数据项上限（500条），无法继续添加" style="cursor:not-allowed"><button class="btn btn-primary btn-sm" disabled style="opacity:0.5;cursor:not-allowed;pointer-events:none">${icons.plus}<span>添加数据项</span></button></span>`
    : `<button class="btn btn-primary btn-sm" onclick="showAddItemModal(${ds.id})">${icons.plus}<span>添加数据项</span></button>`;
  return `<div class="tab-toolbar"><div class="tab-toolbar-left"><span class="item-count">共 <strong>${ds.items.length}</strong> 条</span></div><div class="tab-toolbar-right">${addBtn}</div></div>
  <div class="table-wrapper"><table class="data-table"><thead><tr><th class="sortable" onclick="toggleItemSort('key')">Key <span class="sort-icon">${si('key')}</span></th><th class="sortable" onclick="toggleItemSort('value')">Value <span class="sort-icon">${si('value')}</span></th><th style="width:90px">类型</th><th style="width:130px">更新时间</th><th style="width:90px">操作</th></tr></thead><tbody>
  ${paged.map(item => `<tr><td><code class="item-key">${item.key}</code></td><td>${item.value}</td><td><span class="badge badge-type">${item.type}</span></td><td style="font-size:var(--font-size-xs);color:var(--md-outline)">${item.updatedAt || '-'}</td><td><div class="table-actions"><button class="table-action-btn" title="编辑" onclick="showEditItemModal(${ds.id}, '${item.key}')">${icons.edit}</button><button class="table-action-btn danger" title="删除" onclick="deleteItem(${ds.id}, '${item.key}')">${icons.trash}</button></div></td></tr>`).join('')}
  </tbody></table></div>
  ${totalPages > 1 ? `<div class="pagination"><div class="pagination-info"><span>共 ${total} 条记录</span><span class="pagination-size"><label>每页</label><select onchange="onItemPageSizeChange(this.value)">${[10,20,50].map(n => `<option value="${n}" ${itemPageSize === n ? 'selected' : ''}>${n}</option>`).join('')}</select><label>条</label></span></div><div class="pagination-controls"><button class="pagination-btn" ${itemPage <= 1 ? 'disabled' : ''} onclick="onItemPageChange(${itemPage - 1})">${icons.chevronLeft}</button>${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `<button class="pagination-btn ${p === itemPage ? 'active' : ''}" onclick="onItemPageChange(${p})">${p}</button>`).join('')}<button class="pagination-btn" ${itemPage >= totalPages ? 'disabled' : ''} onclick="onItemPageChange(${itemPage + 1})">${icons.chevronRight}</button></div></div>` : ''}`;
}
function toggleItemSort(field) { if (itemSortField === field) itemSortAsc = !itemSortAsc; else { itemSortField = field; itemSortAsc = true; } render(); }

function renderAuthTab(ds) {
  const authToggle = `<div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-5)">
    <span style="font-size:var(--font-size-sm);font-weight:500;color:var(--md-on-surface-variant);white-space:nowrap">授权方式</span>
    <div class="segmented-control" style="flex:1;max-width:360px">
      <button class="segmented-control-btn ${ds.isPublic ? 'active' : ''}" onclick="switchAuthType(${ds.id}, true)">${icons.globe}<span>公开</span></button>
      <button class="segmented-control-btn ${!ds.isPublic ? 'active' : ''}" onclick="switchAuthType(${ds.id}, false)">${icons.lock}<span>指定空间</span></button>
    </div></div>`;
  if (ds.isPublic) return `${authToggle}<div class="empty-state" style="padding:var(--space-8) var(--space-6)"><span class="empty-state-icon">${icons.globe}</span><div class="empty-state-title">所有空间均可访问</div><div class="empty-state-desc">当前为公开数据源，无需单独授权</div></div>`;
  return `${authToggle}<div class="tab-toolbar"><div class="tab-toolbar-left"><span class="item-count">已授权 <strong>${ds.authorizedSpaces.length}</strong> 个空间</span></div><div class="tab-toolbar-right"><button class="btn btn-primary btn-sm" onclick="showAddSpaceModal(${ds.id})">${icons.plus}<span>添加授权</span></button></div></div>
  ${ds.authorizedSpaces.length === 0 ? '<div class="empty-state" style="padding:var(--space-8)"><div class="empty-state-title">暂无授权空间</div><div class="empty-state-desc">点击上方「添加授权」指定可访问此数据源的空间</div></div>' :
  `<div class="auth-space-list">${ds.authorizedSpaces.map(space => { const idx = allSpaces.indexOf(space); return `<div class="auth-space-item"><div class="auth-space-info"><div class="auth-space-icon ${spaceColors[idx % spaceColors.length]}">${space.charAt(0)}</div><div><div class="auth-space-name">${space}</div></div></div><button class="btn btn-ghost btn-sm" style="color:var(--md-error)" onclick="removeSpace(${ds.id}, '${space}')">${icons.trash}<span>移除</span></button></div>`; }).join('')}</div>`}`;
}
function switchAuthType(dsId, toPublic) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  if (ds.isPublic === toPublic) return;
  if (toPublic) {
    // 指定空间 → 公开
    const hasSpaces = ds.authorizedSpaces.length > 0;
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">切换为公开</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    ${hasSpaces ? `<div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">切换为公开后，已有的 <strong>${ds.authorizedSpaces.length}</strong> 个空间授权将被清空且无法恢复。</div></div>` : ''}
    <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-top:${hasSpaces ? 'var(--space-2)' : '0'}">切换后所有空间将可以直接访问此数据源，确定切换吗？</p>
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="confirmSwitchAuthType(${dsId}, true)">确认切换</button></div></div>`);
  } else {
    // 公开 → 指定空间
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">切换为指定空间</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">切换为「指定空间」后，只有被授权的空间才可以访问此数据源。</p>
    <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-top:var(--space-2)">切换后需手动添加授权空间，未授权空间内引用此数据源的工作流新实例将无法启动。确定切换吗？</p>
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="confirmSwitchAuthType(${dsId}, false)">确认切换</button></div></div>`);
  }
}
function confirmSwitchAuthType(dsId, toPublic) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  if (toPublic) { ds.authorizedSpaces = []; }
  ds.isPublic = toPublic;
  closeModal(); showToast('success', '已切换', toPublic ? '数据源已设为公开' : '数据源已设为指定空间授权'); render();
}

function renderSyncTab(ds) {
  return `<div class="sync-config"><h3 class="sync-config-title">API 同步配置</h3>
  <div class="sync-form-content">
  <div class="form-group" style="margin-bottom:var(--space-3)"><label class="form-label">API 地址</label><input type="text" class="form-input" id="syncUrl" value="${ds.syncConfig.url}" placeholder="https://api.example.com/data" oninput="this.classList.remove('error');var e=this.parentElement.querySelector('.sync-field-error');if(e)e.remove()" /></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)"><div class="form-group"><label class="form-label">Key 字段映射</label><input type="text" class="form-input" id="syncKeyField" value="${ds.syncConfig.keyField}" placeholder="字段名" oninput="this.classList.remove('error');var e=this.parentElement.querySelector('.sync-field-error');if(e)e.remove()" /></div><div class="form-group"><label class="form-label">Value 字段映射</label><input type="text" class="form-input" id="syncValueField" value="${ds.syncConfig.valueField}" placeholder="字段名" oninput="this.classList.remove('error');var e=this.parentElement.querySelector('.sync-field-error');if(e)e.remove()" /></div></div>
  <div style="display:flex;gap:var(--space-2)"><button class="btn btn-secondary btn-sm" onclick="saveSyncConfig(${ds.id})">保存配置</button><button class="btn btn-primary btn-sm" onclick="showSyncStrategyModal(${ds.id})">${icons.sync}<span>立即同步</span></button></div>
  </div></div>
  <div class="sync-config"><h3 class="sync-config-title">同步记录</h3>
  ${ds.syncLogs.length === 0 ? renderEmptyState('syncLog') : (() => {
    const total = ds.syncLogs.length;
    const totalPages = Math.ceil(total / syncLogPageSize);
    if (syncLogPage > totalPages) syncLogPage = totalPages;
    const start = (syncLogPage - 1) * syncLogPageSize;
    const paged = ds.syncLogs.slice(start, start + syncLogPageSize);
    return `<div class="table-wrapper"><table class="data-table"><thead><tr><th>时间</th><th>操作人</th><th>策略</th><th>结果</th><th>详情</th></tr></thead><tbody>${paged.map(log => `<tr><td>${log.time}</td><td>${log.operator}</td><td>${log.strategy}</td><td><span class="sync-result ${log.result}">${log.result === 'success' ? `${icons.checkCircle} 成功` : `${icons.xCircle} 失败`}</span></td><td>${log.result === 'success' ? log.summary : `<span style="color:var(--md-error)">${log.reason}</span>`}</td></tr>`).join('')}</tbody></table></div>
    ${totalPages > 1 ? `<div class="pagination"><div class="pagination-info"><span>共 ${total} 条记录</span><span class="pagination-size"><label>每页</label><select onchange="onSyncLogPageSizeChange(this.value)">${[10,20,50].map(n => `<option value="${n}" ${syncLogPageSize === n ? 'selected' : ''}>${n}</option>`).join('')}</select><label>条</label></span></div><div class="pagination-controls"><button class="pagination-btn" ${syncLogPage <= 1 ? 'disabled' : ''} onclick="onSyncLogPageChange(1)">${icons.chevronLeft}${icons.chevronLeft}</button><button class="pagination-btn" ${syncLogPage <= 1 ? 'disabled' : ''} onclick="onSyncLogPageChange(${syncLogPage - 1})">${icons.chevronLeft}</button>${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `<button class="pagination-btn ${p === syncLogPage ? 'active' : ''}" onclick="onSyncLogPageChange(${p})">${p}</button>`).join('')}<button class="pagination-btn" ${syncLogPage >= totalPages ? 'disabled' : ''} onclick="onSyncLogPageChange(${syncLogPage + 1})">${icons.chevronRight}</button><button class="pagination-btn" ${syncLogPage >= totalPages ? 'disabled' : ''} onclick="onSyncLogPageChange(${totalPages})">${icons.chevronRight}${icons.chevronRight}</button></div></div>` : ''}`;
  })()}</div>`;
}

function onSyncLogPageChange(page) { syncLogPage = page; render(); }
function onSyncLogPageSizeChange(size) { syncLogPageSize = parseInt(size); syncLogPage = 1; render(); }

// --- Modal System ---
function showModal(html, options) { const opt = options || {}; const o = document.getElementById('modalContainer'); o.innerHTML = html; o.classList.add('visible'); o.onclick = (e) => { if (e.target === o && opt.allowBackdropClose) closeModal(); }; }
function closeModal() { const o = document.getElementById('modalContainer'); o.classList.remove('visible'); setTimeout(() => { o.innerHTML = ''; }, 200); }

// --- DS CRUD ---
function showCreateDsModal() {
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">新建数据源</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">数据源名称 <span class="required">*</span></label><input type="text" class="form-input" id="dsName" placeholder="请输入数据源名称" maxlength="50" oninput="validateDsNameRealtime(this)" /><div class="form-error hidden" id="nameError"></div></div><div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">描述</label><textarea class="form-textarea" id="dsDesc" placeholder="请输入描述（选填）" maxlength="200"></textarea></div><div class="form-group"><label class="form-label">授权方式</label><div class="radio-group"><label class="radio-item"><input type="radio" name="dsAuth" value="public" checked /> ${icons.globe} 公开</label><label class="radio-item"><input type="radio" name="dsAuth" value="private" /> ${icons.lock} 指定空间</label></div></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="createDataSource()">保存</button></div></div>`);
  setTimeout(() => document.getElementById('dsName')?.focus(), 300);
}
function createDataSource() {
  const name = document.getElementById('dsName').value.trim(), desc = document.getElementById('dsDesc').value.trim(), isPublic = document.querySelector('input[name="dsAuth"]:checked').value === 'public';
  const ni = document.getElementById('dsName'), ne = document.getElementById('nameError'); ni.classList.remove('error'); ne.classList.add('hidden');
  if (!name) { ni.classList.add('error'); ne.textContent = '请输入数据源名称'; ne.classList.remove('hidden'); return; }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { ni.classList.add('error'); ne.textContent = '仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); return; }
  if (dataSources.some(d => d.name === name)) { ni.classList.add('error'); ne.textContent = '该名称已存在'; ne.classList.remove('hidden'); return; }
  dataSources.push({ id: nextId++, name, desc, createdAt: new Date().toISOString().slice(0, 10), creator: 'Sukey Wu', isPublic, referenced: false, referenceCount: 0, items: [], authorizedSpaces: [], syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [] });
  const newId = nextId - 1;
  listState.search = ''; listState.authFilter = 'all'; listState.refFilter = 'all'; listState.creatorFilter = []; listState.dateFrom = ''; listState.dateTo = '';
  closeModal(); showToast('success', '创建成功', `数据源「${name}」已创建`);
  currentView = 'detail'; currentDsId = newId; currentTab = 'items'; render();
}
function showEditDsModal(id) {
  const ds = dataSources.find(d => d.id === id); if (!ds) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">编辑数据源</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">数据源名称 <span class="required">*</span></label><input type="text" class="form-input" id="dsName" value="${ds.name}" maxlength="50" oninput="validateDsNameRealtime(this)" /><div class="form-error hidden" id="nameError"></div></div>
  <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="dsDesc" maxlength="200">${ds.desc}</textarea></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="updateDataSource(${id})">保存</button></div></div>`);
}
function updateDataSource(id) {
  const ds = dataSources.find(d => d.id === id), name = document.getElementById('dsName').value.trim();
  const ni = document.getElementById('dsName'), ne = document.getElementById('nameError'); ni.classList.remove('error'); ne.classList.add('hidden');
  if (!name) { ni.classList.add('error'); ne.textContent = '请输入数据源名称'; ne.classList.remove('hidden'); return; }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { ni.classList.add('error'); ne.textContent = '仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); return; }
  if (dataSources.some(d => d.id !== id && d.name === name)) { ni.classList.add('error'); ne.textContent = '该名称已存在'; ne.classList.remove('hidden'); return; }
  ds.name = name; ds.desc = document.getElementById('dsDesc').value.trim();
  closeModal(); showToast('success', '保存成功', `数据源已更新`); render();
}
function showDeleteDsModal(id) {
  const ds = dataSources.find(d => d.id === id); if (!ds) return;
  let refHtml = '';
  if (ds.referenced && ds.referenceCount > 0) {
    const wsNames = ['酒店预订流程', '机票同步流程', '数据清洗工作区', '报表统计空间', '通知推送流程'];
    const wfPrefixes = ['搜索', '计算', '校验', '验证', '转换', '生成', '同步', '导入', '导出', '清洗', '格式化', '汇总'];
    const mockRefs = [];
    for (let i = 0; i < ds.referenceCount; i++) { mockRefs.push({ wfName: wfPrefixes[i % wfPrefixes.length] + '流程' + (i >= wfPrefixes.length ? (Math.floor(i / wfPrefixes.length) + 1) : ''), wsName: wsNames[i % wsNames.length] }); }
    refHtml = `<div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">该数据源被 <strong>${ds.referenceCount}</strong> 个工作流引用：</div></div>
    <div style="margin:var(--space-3) 0;border:1px solid var(--md-outline-variant);border-radius:var(--radius-md);overflow:hidden">
      <div style="display:flex;padding:var(--space-2) var(--space-3);background:var(--md-surface-container);font-size:var(--font-size-xs);font-weight:500;color:var(--md-on-surface-variant)"><span style="flex:1">工作流名称</span><span style="flex:1">所属空间</span></div>
      <div style="max-height:240px;overflow-y:auto">
      ${mockRefs.map(r => `<div style="display:flex;padding:var(--space-2) var(--space-3);border-top:1px solid var(--md-outline-variant);font-size:var(--font-size-sm)"><span style="flex:1;color:var(--md-primary);font-weight:500">${r.wfName}</span><span style="flex:1;color:var(--md-on-surface-variant)">${r.wsName}</span></div>`).join('')}
      </div>
    </div><p style="font-size:var(--font-size-sm);color:var(--md-error);margin-top:var(--space-2)">删除后，上述工作流的新实例将无法启动。是否继续？</p>`;
  } else {
    refHtml = `<div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">确定删除数据源「${ds.name}」吗？此操作不可恢复。</div></div>`;
  }
  showModal(`<div class="modal" style="max-width:520px"><div class="modal-header"><h2 class="modal-title">删除数据源</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">${refHtml}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="deleteDataSource(${id})">确认删除</button></div></div>`);
}
function deleteDataSource(id) {
  const ds = dataSources.find(d => d.id === id); dataSources = dataSources.filter(d => d.id !== id);
  closeModal(); showToast('success', '删除成功', `数据源「${ds.name}」已删除`);
  if (currentView === 'detail' && currentDsId === id) { currentView = 'list'; currentDsId = null; } render();
}
// --- Data Item Value Component Helper ---
function getValueInputHtml(type, value, id) {
  const vid = id || 'itemValue';
  const errId = vid + 'Error';
  switch (type) {
    case 'Boolean': return `<select class="form-input" id="${vid}"><option value="true" ${value === 'true' ? 'selected' : ''}>true</option><option value="false" ${value === 'false' ? 'selected' : ''}>false</option></select>`;
    case 'Integer': return `<input type="number" step="1" class="form-input" id="${vid}" value="${value}" placeholder="请输入整数" oninput="this.classList.remove('error');document.getElementById('${errId}').classList.add('hidden')" /><div class="form-error hidden" id="${errId}"></div>`;
    case 'Double': return `<input type="number" step="any" class="form-input" id="${vid}" value="${value}" placeholder="请输入数字" oninput="this.classList.remove('error');document.getElementById('${errId}').classList.add('hidden')" /><div class="form-error hidden" id="${errId}"></div>`;
    case 'DateTime': return `<input type="datetime-local" class="form-input" id="${vid}" value="${value}" oninput="this.classList.remove('error');document.getElementById('${errId}').classList.add('hidden')" /><div class="form-error hidden" id="${errId}"></div>`;
    default: return `<input type="text" class="form-input" id="${vid}" value="${value}" placeholder="请输入文本" oninput="this.classList.remove('error');document.getElementById('${errId}').classList.add('hidden')" /><div class="form-error hidden" id="${errId}"></div>`;
  }
}
function validateItemValue(type, value) {
  if (!value && value !== 'false') return '请输入 Value';
  switch (type) {
    case 'Integer': if (!/^-?\d+$/.test(value)) return 'Value 必须为整数'; break;
    case 'Double': if (isNaN(Number(value))) return 'Value 必须为数字'; break;
    case 'Boolean': if (value !== 'true' && value !== 'false') return 'Value 必须为 true 或 false'; break;
    case 'DateTime': if (isNaN(Date.parse(value))) return 'Value 必须为有效的日期时间'; break;
  }
  return '';
}
const dsItemTypes = ['String', 'Integer', 'Double', 'Boolean', 'DateTime'];

function showAddItemModal(dsId) {
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">添加数据项</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">Key <span class="required">*</span></label><input type="text" class="form-input" id="itemKey" placeholder="英文、数字、下划线、连字符" maxlength="100" oninput="validateKeyRealtime(this)" /><div class="form-error hidden" id="keyError"></div></div>
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">类型 <span class="required">*</span></label><select class="form-input" id="itemType" onchange="onAddItemTypeChange(${dsId})">${dsItemTypes.map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
  <div class="form-group" id="valueGroup"><label class="form-label">Value <span class="required">*</span></label>${getValueInputHtml('String', '', 'itemValue')}</div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="addItem(${dsId})">保存</button></div></div>`);
}
function onAddItemTypeChange(dsId) {
  const type = document.getElementById('itemType').value;
  const group = document.getElementById('valueGroup');
  group.innerHTML = `<label class="form-label">Value <span class="required">*</span></label>${getValueInputHtml(type, '', 'itemValue')}`;
}
function addItem(dsId) {
  const ds = dataSources.find(d => d.id === dsId);
  const key = document.getElementById('itemKey').value.trim();
  const value = document.getElementById('itemValue').value.trim();
  const type = document.getElementById('itemType').value;
  const ki = document.getElementById('itemKey'), ke = document.getElementById('keyError');
  ki.classList.remove('error'); ke.classList.add('hidden');
  if (!key) { ki.classList.add('error'); ke.textContent = '请输入 Key'; ke.classList.remove('hidden'); return; }
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) { ki.classList.add('error'); ke.textContent = 'Key 仅支持英文、数字、下划线和连字符'; ke.classList.remove('hidden'); return; }
  if (ds.items.some(i => i.key === key)) { ki.classList.add('error'); ke.textContent = '该 Key 已存在，请使用其他名称'; ke.classList.remove('hidden'); return; }
  if (ds.items.length >= 500) { showToast('warning', '已达上限', '已达数据项上限（500条）'); return; }
  const valErr = validateItemValue(type, value);
  if (valErr) {
    const ve = document.getElementById('itemValueError');
    const vi = document.getElementById('itemValue');
    if (vi) vi.classList.add('error');
    if (ve) { ve.textContent = valErr; ve.classList.remove('hidden'); }
    else { showToast('warning', '校验失败', valErr); }
    return;
  }
  ds.items.push({ key, value, type, updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') }); closeModal(); showToast('success', '添加成功', `数据项已添加`); render();
}
function showEditItemModal(dsId, key) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  const item = ds.items.find(i => i.key === key); if (!item) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">编辑数据项</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">Key</label><input type="text" class="form-input" value="${item.key}" disabled style="background:var(--md-surface-container);color:var(--md-outline)" /></div>
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">类型</label><input type="text" class="form-input" value="${item.type}" disabled style="background:var(--md-surface-container);color:var(--md-outline)" /><div style="font-size:var(--font-size-xs);color:var(--md-outline);margin-top:4px">类型创建后不可修改</div></div>
  <div class="form-group"><label class="form-label">Value <span class="required">*</span></label>${getValueInputHtml(item.type, item.value, 'itemValue')}</div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="updateItem(${dsId}, '${key}')">保存</button></div></div>`);
}
function updateItem(dsId, key) {
  const ds = dataSources.find(d => d.id === dsId), item = ds.items.find(i => i.key === key);
  const value = document.getElementById('itemValue').value.trim();
  const valErr = validateItemValue(item.type, value);
  if (valErr) {
    const ve = document.getElementById('itemValueError');
    const vi = document.getElementById('itemValue');
    if (vi) vi.classList.add('error');
    if (ve) { ve.textContent = valErr; ve.classList.remove('hidden'); }
    else { showToast('warning', '校验失败', valErr); }
    return;
  }
  item.value = value;
  item.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  closeModal(); showToast('success', '保存成功', '数据项已更新'); render();
}
function deleteItem(dsId, key) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  const item = ds.items.find(i => i.key === key); if (!item) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">删除数据项</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">确定删除数据项「${item.key}」吗？此操作不可恢复。</div></div>
  <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-md);font-size:var(--font-size-sm)"><div style="display:flex;gap:var(--space-4)"><span style="color:var(--md-on-surface-variant)">Key:</span><code style="font-weight:500">${item.key}</code></div><div style="display:flex;gap:var(--space-4);margin-top:4px"><span style="color:var(--md-on-surface-variant)">Value:</span><span>${item.value}</span></div><div style="display:flex;gap:var(--space-4);margin-top:4px"><span style="color:var(--md-on-surface-variant)">类型:</span><span class="badge badge-type">${item.type}</span></div></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="confirmDeleteItem(${dsId}, '${key}')">确认删除</button></div></div>`);
}
function confirmDeleteItem(dsId, key) {
  const ds = dataSources.find(d => d.id === dsId); ds.items = ds.items.filter(i => i.key !== key);
  closeModal(); showToast('success', '删除成功', '数据项已删除'); render();
}

function showAddSpaceModal(dsId) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  const available = allSpaces.filter(s => !ds.authorizedSpaces.includes(s));
  if (available.length === 0) { showToast('info', '提示', '所有空间均已授权'); return; }
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">添加授权空间</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div style="margin-bottom:var(--space-3)"><div class="filter-search" style="width:100%">${icons.search}<input type="text" id="spaceSearchInput" placeholder="搜索空间名称..." oninput="filterSpaceList(${dsId})" /></div></div>
  <div style="max-height:320px;overflow-y:auto"><div class="auth-space-list" id="spaceListContainer">${available.map(space => `<div class="clickable-list-item" data-space-name="${space}" onclick="addSpace(${dsId}, '${space}')"><div class="auth-space-info"><div class="auth-space-icon ${spaceColors[allSpaces.indexOf(space) % spaceColors.length]}">${space.charAt(0)}</div><div><div class="auth-space-name">${space}</div></div></div>${icons.plus}</div>`).join('')}</div></div>
  </div></div>`);
}
function filterSpaceList(dsId) {
  const keyword = document.getElementById('spaceSearchInput').value.trim().toLowerCase();
  const items = document.querySelectorAll('#spaceListContainer .clickable-list-item');
  items.forEach(item => {
    const name = item.getAttribute('data-space-name').toLowerCase();
    item.style.display = name.includes(keyword) ? '' : 'none';
  });
}
function addSpace(dsId, space) { const ds = dataSources.find(d => d.id === dsId); if (!ds) return; ds.authorizedSpaces.push(space); closeModal(); showToast('success', '授权成功', `已授权「${space}」`); render(); }
function removeSpace(dsId, space) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  const ws = workspaces.find(w => w.name === space);
  const hasRunning = ws && ws.runningInstances > 0;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">移除授权</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">确定要移除「${space}」的授权吗？</div></div>
  ${hasRunning ? `<div style="margin-top:var(--space-3);padding:var(--space-3);background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.15);border-radius:var(--radius-md);font-size:var(--font-size-sm);color:var(--md-error);line-height:1.6"><strong>⚠ 该空间内有正在运行的工作流引用了此数据源</strong>，撤销后不影响运行中的实例，但新的实例将无法启动。是否继续？</div>` : ''}
  <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-md);font-size:var(--font-size-sm);color:var(--md-on-surface-variant);line-height:1.6">
  <div style="font-weight:500;color:var(--md-error);margin-bottom:4px">移除后的影响：</div>
  <ul style="margin:0;padding-left:var(--space-4)"><li>该空间内引用此数据源的工作流<strong>新实例将无法启动</strong></li><li>已运行的实例不受影响</li><li>重新授权后可恢复访问</li></ul></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="confirmRemoveSpace(${dsId}, '${space}')">确认移除</button></div></div>`);
}
function confirmRemoveSpace(dsId, space) { const ds = dataSources.find(d => d.id === dsId); if (!ds) return; ds.authorizedSpaces = ds.authorizedSpaces.filter(s => s !== space); closeModal(); showToast('success', '移除成功', `已撤销授权`); render(); }
function saveSyncConfig(dsId) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  const url = document.getElementById('syncUrl').value.trim();
  const keyField = document.getElementById('syncKeyField').value.trim();
  const valueField = document.getElementById('syncValueField').value.trim();
  const urlInput = document.getElementById('syncUrl');
  // Clear previous errors
  document.querySelectorAll('.sync-field-error').forEach(e => e.remove());
  document.querySelectorAll('#syncUrl,#syncKeyField,#syncValueField').forEach(e => e.classList.remove('error'));
  let hasError = false;
  if (!url) { urlInput.classList.add('error'); urlInput.insertAdjacentHTML('afterend', '<div class="form-error sync-field-error">请输入 API 地址</div>'); hasError = true; }
  else if (!/^https?:\/\/.+/i.test(url)) { urlInput.classList.add('error'); urlInput.insertAdjacentHTML('afterend', '<div class="form-error sync-field-error">API 地址格式不正确，需以 http:// 或 https:// 开头</div>'); hasError = true; }
  if (!keyField) { const el = document.getElementById('syncKeyField'); el.classList.add('error'); el.insertAdjacentHTML('afterend', '<div class="form-error sync-field-error">请输入 Key 映射字段</div>'); hasError = true; }
  if (!valueField) { const el = document.getElementById('syncValueField'); el.classList.add('error'); el.insertAdjacentHTML('afterend', '<div class="form-error sync-field-error">请输入 Value 映射字段</div>'); hasError = true; }
  if (hasError) return;
  ds.syncConfig.url = url; ds.syncConfig.keyField = keyField; ds.syncConfig.valueField = valueField;
  showToast('success', '保存成功', 'API 同步配置已保存');
}
function validateSyncFields() {
  const url = document.getElementById('syncUrl')?.value?.trim();
  const keyField = document.getElementById('syncKeyField')?.value?.trim();
  const valueField = document.getElementById('syncValueField')?.value?.trim();
  if (!url) return '请先输入 API 地址';
  if (!/^https?:\/\/.+/i.test(url)) return 'API 地址格式不正确，需以 http:// 或 https:// 开头';
  if (!keyField) return '请先填写 Key 映射字段';
  if (!valueField) return '请先填写 Value 映射字段';
  return '';
}
function showSyncStrategyModal(dsId) {
  const ds = dataSources.find(d => d.id === dsId); if (!ds) return;
  const validationError = validateSyncFields();
  if (validationError) { showToast('warning', '提示', validationError); return; }
  selectedSyncStrategy = null;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">选择同步策略</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-bottom:var(--space-3)">请选择数据同步策略后执行</p>
  <div style="display:flex;flex-direction:column;gap:var(--space-3)">
    <div class="sync-strategy-card" onclick="selectSyncStrategy(this, ${dsId}, 'full')"><div class="auth-space-info"><div class="auth-space-icon bg-blue">${icons.sync}</div><div><div class="auth-space-name">全量覆盖</div><div class="auth-space-desc">清空现有数据后完整替换为 API 返回结果</div></div></div><div class="strategy-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div></div>
    <div class="sync-strategy-card" onclick="selectSyncStrategy(this, ${dsId}, 'incremental')"><div class="auth-space-info"><div class="auth-space-icon bg-green">${icons.plus}</div><div><div class="auth-space-name">增量更新</div><div class="auth-space-desc">仅新增和更新数据，不删除已有项</div></div></div><div class="strategy-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div></div>
  </div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" id="syncExecBtn" disabled onclick="executeSyncFromModal(${dsId})">执行同步</button></div></div>`);
}
let selectedSyncStrategy = null;
function selectSyncStrategy(el, dsId, strategy) {
  selectedSyncStrategy = strategy;
  document.querySelectorAll('.sync-strategy-card').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById('syncExecBtn');
  if (btn) { btn.disabled = false; }
}
function executeSyncFromModal(dsId) {
  if (!selectedSyncStrategy) return;
  executeSync(dsId, selectedSyncStrategy);
  selectedSyncStrategy = null;
}
function executeSync(dsId, strategy) { const ds = dataSources.find(d => d.id === dsId); if (!ds) return; const isSuccess = Math.random() > 0.3; const strategyText = strategy === 'full' ? '全量覆盖' : '增量更新'; const now = new Date(); const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; ds.syncLogs.unshift({ time: timeStr, operator: 'Sukey Wu', strategy: strategyText, result: isSuccess ? 'success' : 'error', summary: isSuccess ? `新增 ${Math.floor(Math.random() * 5)} 条、更新 ${Math.floor(Math.random() * 10)} 条${strategy === 'full' ? `、删除 ${Math.floor(Math.random() * 3)} 条` : ''}` : '', reason: isSuccess ? '' : 'API 返回格式异常' }); closeModal(); showToast(isSuccess ? 'success' : 'error', isSuccess ? '同步成功' : '同步失败', ''); render(); }

// ============================================
//   WORKSPACE MODULE - Rendering
// ============================================
function renderWorkspaceModule(content, breadcrumb) {
  if (wsCurrentView === 'list') {
    breadcrumb.innerHTML = '<span class="breadcrumb-item current">空间管理</span>';
    content.innerHTML = renderWsListPage();
  } else if (wsCurrentView === 'detail') {
    const ws = workspaces.find(w => w.id === wsCurrentId);
    if (!ws) { wsCurrentView = 'list'; render(); return; }
    breadcrumb.innerHTML = `<span class="breadcrumb-item" onclick="wsNavigateTo('list')">空间管理</span><span class="breadcrumb-separator">/</span><span class="breadcrumb-item current">${ws.name}</span>`;
    content.innerHTML = renderWsDetailPage(ws);
  }
}
function wsNavigateTo(view, wsId) {
  wsCurrentView = view; wsCurrentId = wsId || null;
  if (view === 'detail') { wsInternalTab = 'workflows'; wsMemberTab = 'admin'; wsCurrentFolderId = null; wsFolderPath = []; wsContentSearch = ''; wsContentStatusFilter = 'all'; wsContentCreatorFilter = 'all'; wsContentSortField = 'editedAt'; wsContentSortAsc = false; wsExecSearch = ''; wsExecStatusFilter = 'all'; wsExecTriggerFilter = 'all'; wsExecWfFilter = 'all'; wsExecTimeRange = 'all'; wsExecDetailId = null; wsExecShowArchive = false; batchMode = false; batchSelectedIds.clear(); }
  render();
}

function renderWsListPage() {
  const filtered = getFilteredWorkspaces(); const total = filtered.length;
  const start = (wsListState.page - 1) * wsListState.pageSize;
  const paged = filtered.slice(start, start + wsListState.pageSize);
  const totalPages = Math.ceil(total / wsListState.pageSize);
  return `
    <div class="page-header"><div class="page-title-section"><h1 class="page-title shiny-text">空间管理</h1><p class="page-subtitle">管理工作空间，组织和协作工作流</p></div><button class="btn btn-primary magnet-btn" onclick="showCreateWsModal()">${icons.plus}<span>创建空间</span></button></div>
    <div class="filter-bar">
      <div class="filter-search">${icons.search}<input type="text" placeholder="搜索空间名称或编号..." value="${wsListState.search}" oninput="onWsSearchInput(this.value)" /></div>
      <div class="filter-chips">
        <span class="filter-chip ${wsListState.roleFilter === 'all' ? 'active' : ''}" onclick="onWsRoleFilter('all')">全部</span>
        <span class="filter-chip ${wsListState.roleFilter === 'admin' ? 'active' : ''}" onclick="onWsRoleFilter('admin')">我管理的</span>
        <span class="filter-chip ${wsListState.roleFilter === 'member' ? 'active' : ''}" onclick="onWsRoleFilter('member')">我参与的</span>
        <span class="filter-chip ${wsListState.roleFilter === 'viewer' ? 'active' : ''}" onclick="onWsRoleFilter('viewer')">仅查看</span>
      </div>
      <div class="filter-actions"><div class="sort-dropdown"><select onchange="onWsSortChange(this.value)"><option value="lastActiveAt" ${wsListState.sortField === 'lastActiveAt' ? 'selected' : ''}>最近活跃</option><option value="createdAt" ${wsListState.sortField === 'createdAt' ? 'selected' : ''}>创建时间</option></select><button class="sort-toggle-btn" onclick="toggleWsSortOrder()">${wsListState.sortAsc ? icons.arrowUp : icons.arrowDown}</button></div><span class="item-count">共 <strong>${total}</strong> 个空间</span></div>
    </div>
    ${total === 0 ? (wsListState.search || wsListState.roleFilter !== 'all' ? `<div class="ws-empty-state">${renderEmptyState('wsSearchEmpty')}</div>` : renderEmptyState('workspace')) : `
    <div class="workspace-grid fade-in-stagger">${paged.map(ws => {
      const cc = wsCardColors[ws.id % wsCardColors.length];
      const rl = { admin: '管理员', member: '成员', viewer: '只读查看者' };
      const rc = { admin: 'role-badge-admin', member: 'role-badge-member', viewer: 'role-badge-viewer' };
      return `<div class="workspace-card spotlight-card glare-hover" onclick="wsNavigateTo('detail', ${ws.id})"><div class="workspace-card-header"><div class="workspace-card-icon" style="background:${cc.bg};color:${cc.color}">${ws.name.charAt(0)}</div><div class="workspace-card-title-group"><div class="workspace-card-name">${ws.name}</div><span class="workspace-card-code">${icons.hash} ${ws.code}</span></div><div class="workspace-card-actions" onclick="event.stopPropagation()">${ws.myRole === 'admin' ? `<button class="table-action-btn" title="编辑" onclick="showEditWsModal(${ws.id})">${icons.edit}</button><button class="table-action-btn danger" title="删除" onclick="showDeleteWsStep1(${ws.id})">${icons.trash}</button>` : ''}</div></div><div class="workspace-card-desc" title="${ws.desc}">${ws.desc || '暂无描述'}</div><div class="workspace-card-stats"><span class="ws-stat-item">${icons.users} <span class="ws-stat-value" data-count-up="${ws.members.length}">${ws.members.length}</span> 成员</span><span class="ws-stat-item">${icons.workflow} <span class="ws-stat-value" data-count-up="${ws.workflowCount}">${ws.workflowCount}</span> 工作流</span>${ws.runningInstances > 0 ? `<span class="ws-stat-item" style="color:var(--md-success)">${icons.sync} <span class="ws-stat-value" data-count-up="${ws.runningInstances}">${ws.runningInstances}</span> 运行中</span>` : ''}</div><div class="workspace-card-footer"><span class="role-badge ${rc[ws.myRole]}">${icons.shield} ${rl[ws.myRole]}</span><span class="workspace-card-time">${icons.clock} ${ws.lastActiveAt}</span></div></div>`;
    }).join('')}</div>
    ${totalPages > 1 || total > 12 ? `<div class="pagination"><div class="pagination-info">第 ${start + 1}-${Math.min(start + wsListState.pageSize, total)} 条，共 ${total} 条</div><div class="pagination-controls">${wsListState.page > 1 ? `<button class="pagination-btn" onclick="wsListState.page--;render()">${icons.chevronLeft}</button>` : `<button class="pagination-btn disabled">${icons.chevronLeft}</button>`}${Array.from({length: totalPages}, (_, i) => `<button class="pagination-btn ${wsListState.page === i + 1 ? 'active' : ''}" onclick="wsListState.page=${i + 1};render()">${i + 1}</button>`).join('')}${wsListState.page < totalPages ? `<button class="pagination-btn" onclick="wsListState.page++;render()">${icons.chevronRight}</button>` : `<button class="pagination-btn disabled">${icons.chevronRight}</button>`}</div><div class="pagination-size"><span>每页</span><select onchange="wsListState.pageSize=parseInt(this.value);wsListState.page=1;render()"><option value="12" ${wsListState.pageSize === 12 ? 'selected' : ''}>12</option><option value="24" ${wsListState.pageSize === 24 ? 'selected' : ''}>24</option><option value="48" ${wsListState.pageSize === 48 ? 'selected' : ''}>48</option></select><span>条</span></div></div>` : ''}`}`;
}
function getFilteredWorkspaces() {
  let result = workspaces.filter(ws => { if (wsListState.search) { const s = wsListState.search.toLowerCase(); if (!ws.name.toLowerCase().includes(s) && !ws.code.toLowerCase().includes(s)) return false; } if (wsListState.roleFilter !== 'all' && ws.myRole !== wsListState.roleFilter) return false; return true; });
  result.sort((a, b) => { const f = wsListState.sortField; const va = f === 'lastActiveAt' ? a.lastActiveAt : a.createdAt, vb = f === 'lastActiveAt' ? b.lastActiveAt : b.createdAt; return wsListState.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va); });
  return result;
}
function onWsSearchInput(val) { wsListState.search = val; wsListState.page = 1; render(); }
function onWsRoleFilter(val) { wsListState.roleFilter = val; wsListState.page = 1; render(); }
function onWsSortChange(val) { wsListState.sortField = val; render(); }
function toggleWsSortOrder() { wsListState.sortAsc = !wsListState.sortAsc; render(); }

// ============================================
//   WORKSPACE DETAIL (3-Tab Layout)
// ============================================
function renderWsDetailPage(ws) {
  const isAdmin = ws.myRole === 'admin';
  return `
    <div class="detail-back" onclick="wsNavigateTo('list')">${icons.arrowLeft}<span>返回空间列表</span></div>
    <div class="ws-detail-header"><div class="ws-detail-info"><div class="ws-detail-title-row"><h1 class="ws-detail-title">${ws.name}</h1><span class="role-badge role-badge-${ws.myRole}">${icons.shield} ${{ admin: '管理员', member: '成员', viewer: '只读查看者' }[ws.myRole]}</span></div>${ws.desc ? `<div class="ws-detail-desc">${ws.desc}</div>` : ''}<div class="ws-detail-meta"><span class="ws-detail-meta-item">${icons.hash} ${ws.code}</span><span class="ws-detail-meta-item">${icons.calendar} 创建于 ${ws.createdAt}</span><span class="ws-detail-meta-item">${icons.clock} 最近活跃 ${ws.lastActiveAt}</span></div></div></div>
    <div class="ws-tabs-bar">
      <button class="ws-tab-btn ${wsInternalTab === 'workflows' ? 'active' : ''}" onclick="switchWsTab('workflows')">${icons.workflow}<span>工作流</span></button>
      <button class="ws-tab-btn ${wsInternalTab === 'executions' ? 'active' : ''}" onclick="switchWsTab('executions')">${icons.clock}<span>执行记录</span></button>
      ${isAdmin ? `<button class="ws-tab-btn ${wsInternalTab === 'settings' ? 'active' : ''}" onclick="switchWsTab('settings')">${icons.settings}<span>空间设置</span></button>` : ''}
    </div>
    <div class="ws-tab-content">${wsInternalTab === 'workflows' ? renderWsWorkflowsTab(ws) : wsInternalTab === 'executions' ? renderWsExecutionsTab(ws) : renderWsSettingsTab(ws)}</div>`;
}
function switchWsTab(tab) {
  wsInternalTab = tab;
  if (tab === 'workflows') { wsCurrentFolderId = null; wsFolderPath = []; wsContentSearch = ''; wsContentStatusFilter = 'all'; }
  if (tab === 'executions') { wsExecDetailId = null; wsExecSearch = ''; wsExecStatusFilter = 'all'; wsExecTriggerFilter = 'all'; wsExecShowArchive = false; }
  render();
}

// ============================================
//   WORKFLOWS TAB
// ============================================
function getFolderDepth() { return wsFolderPath.length + 1; }
function getSubFolderCount(wsId, folderId) { return (wsFolders[wsId] || []).filter(f => f.parentId === folderId).length; }
function getSubWfCount(wsId, folderId) { return (wsWorkflows[wsId] || []).filter(wf => wf.folderId === folderId).length; }
function getFolderPath(wsId, folderId) {
  const folders = wsFolders[wsId] || [];
  const parts = [];
  let cur = folderId;
  while (cur) { const f = folders.find(x => x.id === cur); if (!f) break; parts.unshift(f.name); cur = f.parentId; }
  return parts.join(' / ');
}

function renderWsWorkflowsTab(ws) {
  const isMemberOrAbove = ws.myRole !== 'viewer';
  const isAdmin = ws.myRole === 'admin';
  const folders = (wsFolders[ws.id] || []).filter(f => f.parentId === wsCurrentFolderId);
  let workflows = (wsWorkflows[ws.id] || []).filter(wf => wf.folderId === wsCurrentFolderId);
  const allWsWorkflows = wsWorkflows[ws.id] || [];
  const creators = [...new Set(allWsWorkflows.map(wf => wf.creator))].sort();
  const depth = getFolderDepth();
  const canCreateFolder = isMemberOrAbove && depth < 5;
  let isSearchMode = false;

  // Status filter
  if (wsContentStatusFilter !== 'all') workflows = workflows.filter(wf => wf.status === wsContentStatusFilter);

  // Creator filter
  if (wsContentCreatorFilter !== 'all') workflows = workflows.filter(wf => wf.creator === wsContentCreatorFilter);

  // Search mode - search across entire space
  if (wsContentSearch) {
    isSearchMode = true;
    const q = wsContentSearch.toLowerCase();
    workflows = allWsWorkflows.filter(wf => wf.name.toLowerCase().includes(q) || wf.code.toLowerCase().includes(q));
    if (wsContentStatusFilter !== 'all') workflows = workflows.filter(wf => wf.status === wsContentStatusFilter);
    if (wsContentCreatorFilter !== 'all') workflows = workflows.filter(wf => wf.creator === wsContentCreatorFilter);
  }

  // Sort
  const sortedFolders = [...folders].sort((a, b) => { const fa = a.editedAt || a.createdAt, fb = b.editedAt || b.createdAt; return wsContentSortAsc ? fa.localeCompare(fb) : fb.localeCompare(fa); });
  const sortedWf = [...workflows].sort((a, b) => {
    if (wsContentSortField === 'name') return wsContentSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if (wsContentSortField === 'createdAt') return wsContentSortAsc ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt);
    return wsContentSortAsc ? a.editedAt.localeCompare(b.editedAt) : b.editedAt.localeCompare(a.editedAt);
  });

  const showFolders = !isSearchMode;
  const isEmpty = showFolders ? (sortedFolders.length === 0 && sortedWf.length === 0) : sortedWf.length === 0;

  // Breadcrumb
  let breadcrumb = '';
  if (wsFolderPath.length > 0) {
    const parentIdx = wsFolderPath.length >= 2 ? wsFolderPath.length - 2 : -1;
    const goUpOnclick = parentIdx >= 0 ? `navigateToWsFolderByIndex(${parentIdx})` : `navigateToWsFolder(null)`;
    breadcrumb = `<div class="content-breadcrumb" style="display:flex;align-items:center;gap:var(--space-2)"><button class="btn btn-ghost btn-sm" onclick="${goUpOnclick}" title="返回上一级" style="padding:2px 6px;min-width:auto">${icons.arrowLeft}</button><span class="content-breadcrumb-item" onclick="navigateToWsFolder(null)">${ws.name}</span>${wsFolderPath.map((p, i) => `<span class="breadcrumb-separator">/</span><span class="content-breadcrumb-item ${i === wsFolderPath.length - 1 ? 'current' : ''}" onclick="navigateToWsFolderByIndex(${i})">${p.name}</span>`).join('')}</div>`;
  }

  // Status labels
  const statusLabel = { draft: '草稿', published: '已发布', disabled: '已停用' };
  const statusClass = { draft: 'status-draft', published: 'status-published', disabled: 'status-disabled' };
  const lastRunLabel = { success: '成功', failed: '失败', running: '运行中' };
  const lastRunClass = { success: 'exec-completed', failed: 'exec-failed', running: 'exec-running' };
  const typeLabel = { app: '应用流', chat: '对话流' };

  return `
    ${breadcrumb}
    <div class="filter-bar" style="margin-top:var(--space-3)">
      <div class="filter-search" style="flex:1;max-width:320px">${icons.search}<input type="text" placeholder="搜索工作流名称或编号..." value="${wsContentSearch}" oninput="onWsContentSearch(this.value)" /></div>
      <div class="filter-chips">
        <span class="filter-chip ${wsContentStatusFilter === 'all' ? 'active' : ''}" onclick="onWsStatusFilter('all')">全部</span>
        <span class="filter-chip ${wsContentStatusFilter === 'draft' ? 'active' : ''}" onclick="onWsStatusFilter('draft')">草稿</span>
        <span class="filter-chip ${wsContentStatusFilter === 'published' ? 'active' : ''}" onclick="onWsStatusFilter('published')">已发布</span>
        <span class="filter-chip ${wsContentStatusFilter === 'disabled' ? 'active' : ''}" onclick="onWsStatusFilter('disabled')">已停用</span>
      </div>
      <div class="filter-actions">
        <select class="form-input" style="width:auto;padding:4px 8px;font-size:var(--font-size-sm)" onchange="onWsCreatorFilter(this.value)">
          <option value="all" ${wsContentCreatorFilter === 'all' ? 'selected' : ''}>全部创建者</option>
          ${creators.map(c => `<option value="${c}" ${wsContentCreatorFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <div class="sort-dropdown"><select onchange="onWsContentSort(this.value)"><option value="editedAt" ${wsContentSortField === 'editedAt' ? 'selected' : ''}>最后编辑</option><option value="createdAt" ${wsContentSortField === 'createdAt' ? 'selected' : ''}>创建时间</option><option value="name" ${wsContentSortField === 'name' ? 'selected' : ''}>名称</option></select><button class="sort-toggle-btn" onclick="toggleWsContentSort()">${wsContentSortAsc ? icons.arrowUp : icons.arrowDown}</button></div>
        ${isMemberOrAbove ? `<button class="btn btn-secondary btn-sm" onclick="toggleBatchMode()" style="${batchMode ? 'background:var(--md-primary);color:white' : ''}">${icons.check}<span>${batchMode ? '退出批量' : '批量操作'}</span></button>` : ''}
        ${isMemberOrAbove ? `<button class="btn btn-primary btn-sm" onclick="showCreateWfModal()">${icons.plus}<span>新建工作流</span></button>` : ''}
        ${canCreateFolder ? `<button class="btn btn-secondary btn-sm" onclick="showCreateFolderModal()">${icons.folder}<span>新建文件夹</span></button>` : ''}
      </div>
    </div>

    ${batchMode && batchSelectedIds.size > 0 ? `<div class="batch-action-bar" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-4);background:var(--md-primary-container);border-radius:var(--radius-md);margin-top:var(--space-2);font-size:var(--font-size-sm)"><span style="color:var(--md-on-primary-container);font-weight:500">已选中 ${batchSelectedIds.size} 项</span><div style="margin-left:auto;display:flex;gap:var(--space-2)"><button class="btn btn-secondary btn-sm" onclick="batchMove()">${icons.move}<span>批量移动</span></button><button class="btn btn-secondary btn-sm" onclick="batchDisable()">${icons.disable}<span>批量停用</span></button>${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="batchDelete()">${icons.trash}<span>批量删除</span></button>` : ''}</div></div>` : ''}

    ${isEmpty ? (isSearchMode ? renderEmptyState('searchNoResult') : (wsCurrentFolderId !== null ? `<div class="empty-state" style="padding:var(--space-10)"><img src="./public/images/empty-folder-content.png" class="empty-state-img" /><div class="empty-state-title">该文件夹为空</div><div class="empty-state-desc">在此文件夹中创建工作流或子文件夹</div><div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">${isMemberOrAbove ? `<button class="btn btn-primary btn-sm" onclick="showCreateWfModal()">${icons.plus}<span>新建工作流</span></button>` : ''}${canCreateFolder ? `<button class="btn btn-secondary btn-sm" onclick="showCreateFolderModal()">${icons.folder}<span>新建子文件夹</span></button>` : ''}</div></div>` : `<div class="empty-state" style="padding:var(--space-10)"><img src="./public/images/empty-folder-content.png" class="empty-state-img" /><div class="empty-state-title">暂无内容</div><div class="empty-state-desc">创建工作流或文件夹来组织您的空间</div><div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">${isMemberOrAbove ? `<button class="btn btn-primary btn-sm" onclick="showCreateWfModal()">${icons.plus}<span>新建工作流</span></button><button class="btn btn-secondary btn-sm" onclick="showCreateFolderModal()">${icons.folder}<span>新建文件夹</span></button>` : ''}</div></div>`)) : `
    <div class="content-list-header">${batchMode ? `<span style="display:flex;align-items:center;padding-right:var(--space-2)"><input type="checkbox" ${batchSelectedIds.size === sortedWf.length && sortedWf.length > 0 ? 'checked' : ''} onchange="toggleBatchSelectAll(${ws.id})" style="width:16px;height:16px;accent-color:var(--md-primary);cursor:pointer" /></span>` : ''}<span style="flex:2">名称</span><span style="flex:1">状态</span><span style="flex:1">创建者</span><span style="flex:1">最后编辑</span><span style="width:170px">操作</span></div>
    <div class="content-list">
      ${showFolders ? sortedFolders.map(f => {
        const subF = getSubFolderCount(ws.id, f.id), subW = getSubWfCount(ws.id, f.id);
        return `<div class="content-list-item" ondblclick="navigateIntoFolder(${f.id}, '${f.name.replace(/'/g, "\\'")}')">
          <div class="content-item-main" style="flex:2"><div class="content-item-icon folder-icon">${icons.folder}</div><div><div class="content-item-name" onclick="navigateIntoFolder(${f.id}, '${f.name.replace(/'/g, "\\'")}')" style="cursor:pointer">${f.name}</div><div class="content-item-desc">${subW} 个工作流${subF > 0 ? `，${subF} 个子文件夹` : ''}</div></div></div>
          <div style="flex:1"><span class="badge badge-type" style="font-size:11px">${icons.folder} 文件夹</span></div>
          <div style="flex:1;font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">${f.creator}</div>
          <div style="flex:1;font-size:var(--font-size-sm);color:var(--md-outline)">${f.editedAt}</div>
          <div class="content-item-actions" style="width:140px">
            ${isMemberOrAbove ? `<button class="table-action-btn" title="编辑" onclick="showEditFolderModal(${f.id})">${icons.edit}</button><button class="table-action-btn" title="移动" onclick="showMoveFolderModal(${f.id})">${icons.move}</button><button class="table-action-btn danger" title="删除" onclick="showDeleteFolderModal(${f.id})">${icons.trash}</button>` : ''}
          </div></div>`;
      }).join('') : ''}
      ${sortedWf.map(wf => {
        const canDelete = isAdmin || wf.owners.includes(101);
        const canExec = wf.status === 'published';
        const ownerNames = wf.owners.map(oid => { const u = ssoUsers.find(x => x.id === oid); return u ? u.name : ''; }).filter(Boolean).join(', ');
        const isChecked = batchSelectedIds.has(wf.id);
        return `<div class="content-list-item${isChecked ? ' batch-selected' : ''}" style="${isChecked ? 'background:var(--md-primary-container-low, rgba(103,80,164,0.05))' : ''}">
          ${batchMode ? `<div style="display:flex;align-items:center;padding-right:var(--space-2)"><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleBatchSelect(${wf.id})" style="width:16px;height:16px;accent-color:var(--md-primary);cursor:pointer" /></div>` : ''}
          <div class="content-item-main" style="flex:2"><div class="content-item-icon wf-icon">${icons.workflow}</div><div><div class="content-item-name">${wf.name}${isSearchMode ? `<span style="font-size:11px;color:var(--md-outline);margin-left:8px">${getFolderPath(ws.id, wf.folderId) || '根目录'}</span>` : ''}</div><div class="content-item-desc">${icons.hash} ${wf.code}${wf.desc ? ` · ${wf.desc}` : ''}</div></div></div>
          <div style="flex:1;display:flex;align-items:center;gap:6px"><span class="status-badge ${statusClass[wf.status]}">${statusLabel[wf.status]}</span>${wf.version > 0 ? `<span class="version-badge">v${wf.version}</span>` : ''}<span class="badge badge-type" style="font-size:10px">${typeLabel[wf.type]}</span>${wf.lastRun ? `<span class="last-run"><span class="last-run-dot ${lastRunClass[wf.lastRun]}"></span>${lastRunLabel[wf.lastRun]}</span>` : ''}</div>
          <div style="flex:1;font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">${wf.creator}</div>
          <div style="flex:1;font-size:var(--font-size-sm);color:var(--md-outline)">${wf.editedAt}</div>
          <div class="content-item-actions" style="width:170px">
            ${isMemberOrAbove ? `<button class="table-action-btn" title="编辑流程" onclick="openDesigner(${ws.id}, ${wf.id})" style="color:var(--md-primary)">${icons.edit}</button>` : ''}
            ${wf.status === 'draft' && isMemberOrAbove ? `<button class="table-action-btn" title="发布" onclick="showPublishWfModal(${wf.id})" style="color:var(--md-success)">${icons.arrowUp}</button>` : ''}
            <button class="table-action-btn ${!canExec ? 'disabled' : ''}" title="执行" onclick="${canExec ? `executeWf(${wf.id})` : ''}" ${!canExec ? 'style="opacity:0.4;cursor:not-allowed"' : ''}>${icons.play}</button>
            ${isMemberOrAbove ? `<button class="table-action-btn" title="复制" onclick="copyWf(${wf.id})">${icons.copy}</button><button class="table-action-btn" title="移动" onclick="showMoveWfModal(${wf.id})">${icons.move}</button>` : ''}
            ${wf.status === 'published' && isMemberOrAbove ? `<button class="table-action-btn" title="停用" onclick="showDisableWfModal(${wf.id})">${icons.disable}</button>` : ''}
            ${wf.status === 'disabled' && isMemberOrAbove ? `<button class="table-action-btn" title="启用" onclick="enableWf(${wf.id})">${icons.checkCircle}</button>` : ''}
            ${wf.versions && wf.versions.length > 0 ? `<button class="table-action-btn" title="版本历史" onclick="showVersionHistory(${wf.id})">${icons.history}</button>` : ''}
            ${canDelete ? `<button class="table-action-btn danger" title="删除" onclick="showDeleteWfModal(${wf.id})">${icons.trash}</button>` : ''}
          </div></div>`;
      }).join('')}
    </div>`}`;
}

function onWsContentSearch(val) { wsContentSearch = val; render(); }
function onWsStatusFilter(val) { wsContentStatusFilter = val; render(); }
function onWsCreatorFilter(val) { wsContentCreatorFilter = val; render(); }
function onWsContentSort(val) { wsContentSortField = val; render(); }
function toggleWsContentSort() { wsContentSortAsc = !wsContentSortAsc; render(); }
function openDesigner(wsId, wfId) { showToast('info', '流程设计器', '流程设计器将在 Phase 2 中实现（当前为原型占位）'); }
function navigateIntoFolder(folderId, folderName) { wsFolderPath.push({ id: folderId, name: folderName }); wsCurrentFolderId = folderId; wsContentSearch = ''; render(); }
function navigateToWsFolder(folderId) { wsCurrentFolderId = folderId; if (folderId === null) wsFolderPath = []; render(); }
function navigateToWsFolderByIndex(idx) { if (idx < 0 || idx >= wsFolderPath.length) return; wsFolderPath = wsFolderPath.slice(0, idx + 1); wsCurrentFolderId = wsFolderPath[idx].id; render(); }

// --- Folder CRUD ---
function showCreateFolderModal() {
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">新建文件夹</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">文件夹名称 <span class="required">*</span></label><input type="text" class="form-input" id="folderName" placeholder="请输入文件夹名称" maxlength="50" oninput="this.classList.remove('error');document.getElementById('folderNameError').classList.add('hidden')" /><div class="form-error hidden" id="folderNameError"></div></div><div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="folderDesc" placeholder="选填" maxlength="500"></textarea></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="createFolder()">保存</button></div></div>`);
  setTimeout(() => document.getElementById('folderName')?.focus(), 300);
}
function createFolder() {
  const rawName = document.getElementById('folderName').value;
  const name = rawName.trim(), desc = document.getElementById('folderDesc').value.trim();
  const ni = document.getElementById('folderName'), ne = document.getElementById('folderNameError'); ni.classList.remove('error'); ne.classList.add('hidden');
  if (!name) { ni.classList.add('error'); ne.textContent = '请输入文件夹名称'; ne.classList.remove('hidden'); return; }
  if (rawName !== name) { ni.classList.add('error'); ne.textContent = '文件夹名称不允许以空格开头或结尾'; ne.classList.remove('hidden'); return; }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { ni.classList.add('error'); ne.textContent = '文件夹名称仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); return; }
  const siblings = (wsFolders[wsCurrentId] || []).filter(f => f.parentId === wsCurrentFolderId);
  if (siblings.some(f => f.name === name)) { ni.classList.add('error'); ne.textContent = '同级目录下已存在同名文件夹，请使用其他名称'; ne.classList.remove('hidden'); return; }
  if (!wsFolders[wsCurrentId]) wsFolders[wsCurrentId] = [];
  wsFolders[wsCurrentId].push({ id: folderNextId++, name, desc, parentId: wsCurrentFolderId, wsId: wsCurrentId, creator: 'Sukey Wu', createdAt: new Date().toISOString().slice(0, 10), editedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') });
  closeModal(); showToast('success', '创建成功', `文件夹「${name}」已创建`); render();
}
function showEditFolderModal(folderId) {
  const f = (wsFolders[wsCurrentId] || []).find(x => x.id === folderId); if (!f) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">编辑文件夹</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">文件夹名称 <span class="required">*</span></label><input type="text" class="form-input" id="folderName" value="${f.name}" maxlength="50" oninput="this.classList.remove('error');document.getElementById('folderNameError').classList.add('hidden')" /><div class="form-error hidden" id="folderNameError"></div></div><div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="folderDesc" maxlength="500">${f.desc || ''}</textarea></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="updateFolder(${folderId})">保存</button></div></div>`);
}
function updateFolder(folderId) {
  const f = (wsFolders[wsCurrentId] || []).find(x => x.id === folderId); if (!f) return;
  const rawName = document.getElementById('folderName').value;
  const name = rawName.trim(), desc = document.getElementById('folderDesc').value.trim();
  const ni = document.getElementById('folderName'), ne = document.getElementById('folderNameError'); ni.classList.remove('error'); ne.classList.add('hidden');
  if (!name) { ni.classList.add('error'); ne.textContent = '请输入文件夹名称'; ne.classList.remove('hidden'); return; }
  if (rawName !== name) { ni.classList.add('error'); ne.textContent = '文件夹名称不允许以空格开头或结尾'; ne.classList.remove('hidden'); return; }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { ni.classList.add('error'); ne.textContent = '文件夹名称仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); return; }
  const siblings = (wsFolders[wsCurrentId] || []).filter(x => x.parentId === f.parentId && x.id !== folderId);
  if (siblings.some(x => x.name === name)) { ni.classList.add('error'); ne.textContent = '同级目录下已存在同名文件夹，请使用其他名称'; ne.classList.remove('hidden'); return; }
  f.name = name; f.desc = desc; f.editedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  closeModal(); showToast('success', '保存成功', '文件夹已更新'); render();
}
function showDeleteFolderModal(folderId) {
  const f = (wsFolders[wsCurrentId] || []).find(x => x.id === folderId); if (!f) return;
  const subF = getSubFolderCount(wsCurrentId, folderId), subW = getSubWfCount(wsCurrentId, folderId);
  const isEmpty = subF === 0 && subW === 0;
  const ws = workspaces.find(w => w.id === wsCurrentId); const isAdmin = ws && ws.myRole === 'admin';
  if (isEmpty) {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">删除文件夹</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">确定删除文件夹「${f.name}」吗？</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="deleteFolder(${folderId})">删除</button></div></div>`);
  } else {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">删除文件夹</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
      <div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">该文件夹包含 ${subF} 个子文件夹和 ${subW} 个工作流</div></div>
      <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-4)">
        <div class="auth-space-item" style="cursor:pointer;border:2px solid transparent" onclick="deleteFolderKeepContent(${folderId})"><div class="auth-space-info"><div class="auth-space-icon bg-blue">${icons.move}</div><div><div class="auth-space-name">仅删除文件夹，保留内容</div><div class="auth-space-desc">子内容将移至上级目录</div></div></div></div>
        ${isAdmin ? `<div class="auth-space-item" style="cursor:pointer;border:2px solid transparent" onclick="showCascadeDeleteFolder(${folderId})"><div class="auth-space-info"><div class="auth-space-icon bg-orange" style="background:var(--md-error-container);color:var(--md-error)">${icons.trash}</div><div><div class="auth-space-name">删除文件夹及所有内容</div><div class="auth-space-desc">级联删除，不可恢复</div></div></div></div>` : ''}
      </div></div></div>`);
  }
}
function deleteFolder(folderId) {
  wsFolders[wsCurrentId] = (wsFolders[wsCurrentId] || []).filter(f => f.id !== folderId);
  closeModal(); showToast('success', '删除成功', '文件夹已删除'); render();
}
function deleteFolderKeepContent(folderId) {
  const f = (wsFolders[wsCurrentId] || []).find(x => x.id === folderId); if (!f) return;
  // Move children up to parent
  (wsFolders[wsCurrentId] || []).forEach(child => { if (child.parentId === folderId) child.parentId = f.parentId; });
  (wsWorkflows[wsCurrentId] || []).forEach(wf => { if (wf.folderId === folderId) wf.folderId = f.parentId; });
  wsFolders[wsCurrentId] = (wsFolders[wsCurrentId] || []).filter(x => x.id !== folderId);
  closeModal(); showToast('success', '删除成功', '文件夹已删除，内容已保留'); render();
}
function showCascadeDeleteFolder(folderId) {
  closeModal();
  setTimeout(() => {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">确认级联删除</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">此操作将删除文件夹内的所有工作流及其执行记录，不可恢复。是否继续？</div></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="cascadeDeleteFolder(${folderId})">确认删除</button></div></div>`);
  }, 250);
}
function cascadeDeleteFolder(folderId) {
  function getDescendants(parentId) {
    const children = (wsFolders[wsCurrentId] || []).filter(f => f.parentId === parentId);
    let ids = children.map(c => c.id);
    children.forEach(c => { ids = ids.concat(getDescendants(c.id)); });
    return ids;
  }
  const allFolderIds = [folderId, ...getDescendants(folderId)];
  wsWorkflows[wsCurrentId] = (wsWorkflows[wsCurrentId] || []).filter(wf => !allFolderIds.includes(wf.folderId));
  wsFolders[wsCurrentId] = (wsFolders[wsCurrentId] || []).filter(f => !allFolderIds.includes(f.id));
  closeModal(); showToast('success', '删除成功', '文件夹及所有内容已删除'); render();
}
function showMoveFolderModal(folderId) {
  const f = (wsFolders[wsCurrentId] || []).find(x => x.id === folderId); if (!f) return;
  const ws = workspaces.find(w => w.id === wsCurrentId);
  const allFolders = wsFolders[wsCurrentId] || [];
  function getDescIds(pid) { const ch = allFolders.filter(x => x.parentId === pid); let ids = ch.map(c => c.id); ch.forEach(c => { ids = ids.concat(getDescIds(c.id)); }); return ids; }
  const invalidIds = new Set([folderId, ...getDescIds(folderId)]);
  const treeHtml = buildFolderTree(allFolders, null, invalidIds, f.parentId, `moveFolder(${folderId}, __ID__)`, 0);
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">移动文件夹</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-bottom:var(--space-3)">将「${f.name}」移动到：</p>
  <div class="folder-tree">
    <div class="folder-tree-node ${f.parentId === null ? 'is-current' : ''}" onclick="${f.parentId === null ? '' : `moveFolder(${folderId}, null)`}" style="cursor:${f.parentId === null ? 'default' : 'pointer'}">
      <span class="folder-tree-icon">${icons.folder}</span><span class="folder-tree-label">${ws.name}（根目录）</span>${f.parentId === null ? '<span class="folder-tree-badge">当前位置</span>' : ''}
    </div>
    ${treeHtml}
  </div></div></div>`);
}

function buildFolderTree(allFolders, parentId, invalidIds, currentParentId, actionTpl, depth) {
  const children = allFolders.filter(f => f.parentId === parentId);
  if (children.length === 0) return '';
  return children.map(f => {
    const isInvalid = invalidIds && invalidIds.has(f.id);
    const isCurrent = f.id === currentParentId;
    const hasChildren = allFolders.some(c => c.parentId === f.id && !(invalidIds && invalidIds.has(c.id)));
    const subTree = buildFolderTree(allFolders, f.id, invalidIds, currentParentId, actionTpl, depth + 1);
    const action = actionTpl.replace('__ID__', f.id);
    const clickable = !isInvalid && !isCurrent;
    return `<div class="folder-tree-branch${depth === 0 ? '' : ''}">
      <div class="folder-tree-node depth-${depth + 1} ${isCurrent ? 'is-current' : ''} ${isInvalid ? 'is-disabled' : ''}"
        onclick="${clickable ? action : ''}" style="cursor:${clickable ? 'pointer' : 'default'};padding-left:${(depth + 1) * 20 + 8}px">
        ${hasChildren || subTree ? `<span class="folder-tree-toggle" onclick="event.stopPropagation();this.closest('.folder-tree-branch').classList.toggle('collapsed')">${icons.chevronRight}</span>` : '<span class="folder-tree-toggle-placeholder"></span>'}
        <span class="folder-tree-icon">${icons.folder}</span>
        <span class="folder-tree-label">${f.name}</span>
        ${isCurrent ? '<span class="folder-tree-badge">当前位置</span>' : ''}
        ${isInvalid ? '<span class="folder-tree-badge disabled">不可选</span>' : ''}
      </div>
      ${subTree ? `<div class="folder-tree-children">${subTree}</div>` : ''}
    </div>`;
  }).join('');
}

function moveFolder(folderId, targetParentId) {
  const f = (wsFolders[wsCurrentId] || []).find(x => x.id === folderId); if (!f) return;
  // Check same-name conflict at target
  const siblings = (wsFolders[wsCurrentId] || []).filter(x => x.parentId === targetParentId && x.id !== folderId);
  if (siblings.some(x => x.name === f.name)) { closeModal(); showToast('error', '移动失败', '目标位置已存在同名文件夹，请先重命名'); return; }
  // Check depth limit (target depth + subtree depth <= 5)
  let targetDepth = 0; let cur = targetParentId;
  while (cur) { const p = (wsFolders[wsCurrentId] || []).find(x => x.id === cur); if (!p) break; targetDepth++; cur = p.parentId; }
  function getMaxSubDepth(pid) { const children = (wsFolders[wsCurrentId] || []).filter(x => x.parentId === pid); if (children.length === 0) return 0; return 1 + Math.max(...children.map(c => getMaxSubDepth(c.id))); }
  const subDepth = 1 + getMaxSubDepth(folderId);
  if (targetDepth + subDepth > 5) { closeModal(); showToast('error', '移动失败', '移动后文件夹层级将超过5层限制'); return; }
  f.parentId = targetParentId; f.editedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  closeModal(); showToast('success', '移动成功', '文件夹已移动'); render();
}

// --- Workflow CRUD ---
function showCreateWfModal() {
  const ws = workspaces.find(w => w.id === wsCurrentId);
  showModal(`<div class="modal" style="max-width:560px"><div class="modal-header"><h2 class="modal-title">新建工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">工作流名称 <span class="required">*</span></label><input type="text" class="form-input" id="wfName" placeholder="请输入工作流名称" maxlength="50" oninput="this.classList.remove('error');document.getElementById('wfNameError').classList.add('hidden')" /><div class="form-error hidden" id="wfNameError"></div></div></div>
  <div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">工作流编号 <span class="required">*</span></label><input type="text" class="form-input" id="wfCode" placeholder="英文、数字、下划线、连字符" maxlength="30" oninput="this.classList.remove('error');document.getElementById('wfCodeError').classList.add('hidden')" /><div class="form-error hidden" id="wfCodeError"></div></div></div>
  <div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">描述</label><textarea class="form-textarea" id="wfDesc" placeholder="选填" maxlength="500"></textarea></div></div>
  <div class="form-row" style="gap:var(--space-4)">
    <div class="form-group" style="flex:1"><label class="form-label">工作流类型 <span class="required">*</span></label><select class="form-input" id="wfType"><option value="app">应用流</option><option value="chat">对话流</option></select></div>
    <div class="form-group" style="flex:1"><label class="form-label">允许被引用</label><div class="toggle-inline"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="wfAllowRef" /><span style="font-size:var(--font-size-sm)">开启后可作为子流程</span></label></div></div>
  </div>
  <div class="form-row"><div class="form-group" style="flex:1"><label class="form-label">流程负责人 <span class="required">*</span></label><select class="form-input" id="wfOwner">${ws.members.filter(m => m.role !== 'viewer').map(m => `<option value="${m.userId}">${m.name}</option>`).join('')}</select></div></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="createWf()">保存</button></div></div>`);
  setTimeout(() => document.getElementById('wfName')?.focus(), 300);
}
function createWf() {
  const rawName = document.getElementById('wfName').value, rawCode = document.getElementById('wfCode').value;
  const name = rawName.trim(), code = rawCode.trim(), desc = document.getElementById('wfDesc').value.trim();
  const type = document.getElementById('wfType').value, allowRef = document.getElementById('wfAllowRef').checked;
  const ownerId = parseInt(document.getElementById('wfOwner').value);
  let hasError = false;
  const ni = document.getElementById('wfName'), ne = document.getElementById('wfNameError'); ni.classList.remove('error'); ne.classList.add('hidden');
  const ci = document.getElementById('wfCode'), ce = document.getElementById('wfCodeError'); ci.classList.remove('error'); ce.classList.add('hidden');
  if (!name) { ni.classList.add('error'); ne.textContent = '请输入工作流名称'; ne.classList.remove('hidden'); hasError = true; }
  else if (rawName !== name) { ni.classList.add('error'); ne.textContent = '工作流名称不允许以空格开头或结尾'; ne.classList.remove('hidden'); hasError = true; }
  else if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { ni.classList.add('error'); ne.textContent = '工作流名称仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); hasError = true; }
  else if ((wsWorkflows[wsCurrentId] || []).some(wf => wf.name === name)) { ni.classList.add('error'); ne.textContent = '该空间内已存在同名工作流，请使用其他名称'; ne.classList.remove('hidden'); hasError = true; }
  if (!code) { ci.classList.add('error'); ce.textContent = '请输入工作流编号'; ce.classList.remove('hidden'); hasError = true; }
  else if (rawCode !== code) { ci.classList.add('error'); ce.textContent = '工作流编号不允许包含空格'; ce.classList.remove('hidden'); hasError = true; }
  else if (!/^[a-zA-Z0-9_-]+$/.test(code)) { ci.classList.add('error'); ce.textContent = '工作流编号仅支持英文、数字、下划线和连字符'; ce.classList.remove('hidden'); hasError = true; }
  else { const allCodes = Object.values(wsWorkflows).flat().map(wf => wf.code); if (allCodes.includes(code)) { ci.classList.add('error'); ce.textContent = '该编号已被使用，请更换其他编号'; ce.classList.remove('hidden'); hasError = true; } }
  if (hasError) return;
  if (!wsWorkflows[wsCurrentId]) wsWorkflows[wsCurrentId] = [];
  const now = new Date().toISOString();
  wsWorkflows[wsCurrentId].push({ id: wfNextId++, name, code, desc, type, allowRef, status: 'draft', version: 0, creator: 'Sukey Wu', owners: [ownerId], folderId: wsCurrentFolderId, wsId: wsCurrentId, createdAt: now.slice(0, 10), editedAt: now.slice(0, 16).replace('T', ' '), lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, versions: [] });
  closeModal(); showToast('success', '创建成功', `工作流「${name}」已创建，正在进入流程设计器...`); render(); setTimeout(() => openDesigner(wsCurrentId, wfNextId - 1), 500);
}
function showDeleteWfModal(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">删除工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">删除后，该工作流的所有版本和 ${wf.execCount} 条执行记录将被一并删除，此操作不可恢复。${wf.runningCount > 0 ? `<br><br><strong style="color:var(--md-error)">当前有 ${wf.runningCount} 个运行中实例，删除后将被终止。</strong>` : ''}</div></div>
  <div class="delete-confirm-input" style="margin-top:var(--space-4)"><label class="delete-confirm-label">请输入工作流编号以确认删除：<strong>${wf.code}</strong></label><input type="text" class="form-input" id="deleteWfConfirm" placeholder="请输入工作流编号" oninput="onDeleteWfConfirmInput(${wfId})" style="width:100%" /></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" id="confirmDeleteWfBtn" disabled style="opacity:0.5;cursor:not-allowed;pointer-events:none" onclick="deleteWf(${wfId})">确认删除</button></div></div>`);
  setTimeout(() => document.getElementById('deleteWfConfirm')?.focus(), 300);
}
function onDeleteWfConfirmInput(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  const input = document.getElementById('deleteWfConfirm'), btn = document.getElementById('confirmDeleteWfBtn');
  if (input && btn) { if (input.value.trim() === wf.code) { btn.removeAttribute('disabled'); btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.style.pointerEvents = 'auto'; } else { btn.setAttribute('disabled', 'true'); btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; btn.style.pointerEvents = 'none'; } }
}
function deleteWf(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId);
  wsWorkflows[wsCurrentId] = (wsWorkflows[wsCurrentId] || []).filter(x => x.id !== wfId);
  wsExecutions[wsCurrentId] = (wsExecutions[wsCurrentId] || []).filter(e => e.wfId !== wfId);
  closeModal(); showToast('success', '删除成功', `工作流「${wf.name}」已删除`); render();
}
function copyWf(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  const allNames = (wsWorkflows[wsCurrentId] || []).map(x => x.name);
  let copyName = `${wf.name} - 副本`;
  let i = 2; while (allNames.includes(copyName)) { copyName = `${wf.name} - 副本 ${i++}`; }
  const allCodes = Object.values(wsWorkflows).flat().map(x => x.code);
  let copyCode = `${wf.code}_copy`; i = 2; while (allCodes.includes(copyCode)) { copyCode = `${wf.code}_copy${i++}`; }
  if (!wsWorkflows[wsCurrentId]) wsWorkflows[wsCurrentId] = [];
  const now = new Date().toISOString();
  wsWorkflows[wsCurrentId].push({ ...wf, id: wfNextId++, name: copyName, code: copyCode, status: 'draft', version: 0, creator: 'Sukey Wu', owners: [101], execCount: 0, runningCount: 0, lastRun: null, debugPassed: false, versions: [], createdAt: now.slice(0, 10), editedAt: now.slice(0, 16).replace('T', ' ') });
  showToast('success', '复制成功', `已创建副本「${copyName}」`); render();
}
function showMoveWfModal(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  const ws = workspaces.find(w => w.id === wsCurrentId);
  const allFolders = wsFolders[wsCurrentId] || [];
  const treeHtml = buildFolderTree(allFolders, null, null, wf.folderId, `moveWf(${wfId}, __ID__)`, 0);
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">移动工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-bottom:var(--space-3)">将「${wf.name}」移动到：</p>
  <div class="folder-tree">
    <div class="folder-tree-node ${wf.folderId === null ? 'is-current' : ''}" onclick="${wf.folderId === null ? '' : `moveWf(${wfId}, null)`}" style="cursor:${wf.folderId === null ? 'default' : 'pointer'}">
      <span class="folder-tree-icon">${icons.folder}</span><span class="folder-tree-label">${ws.name}（根目录）</span>${wf.folderId === null ? '<span class="folder-tree-badge">当前位置</span>' : ''}
    </div>
    ${treeHtml}
  </div></div></div>`);
}
function moveWf(wfId, targetFolderId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  // Check same-name conflict at target
  const targetWfs = (wsWorkflows[wsCurrentId] || []).filter(x => x.folderId === targetFolderId && x.id !== wfId);
  if (targetWfs.some(x => x.name === wf.name)) { closeModal(); showToast('error', '移动失败', '目标位置已存在同名工作流，请先重命名'); return; }
  wf.folderId = targetFolderId; wf.editedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  closeModal(); showToast('success', '移动成功', '工作流已移动'); render();
}
function showDisableWfModal(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  if (wf.runningCount > 0) {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">停用工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">当前有 ${wf.runningCount} 个运行中实例，停用后不影响运行中的实例，但不允许启动新的实例。是否继续？</div></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="disableWf(${wfId})">确认停用</button></div></div>`);
  } else { disableWf(wfId); }
}
function disableWf(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  wf.status = 'disabled'; closeModal(); showToast('success', '停用成功', `工作流「${wf.name}」已停用`); render();
}
function enableWf(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  wf.status = 'published'; showToast('success', '启用成功', `工作流「${wf.name}」已重新启用`); render();
}
function executeWf(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf || wf.status !== 'published') return;
  if (!wsExecutions[wsCurrentId]) wsExecutions[wsCurrentId] = [];
  const now = new Date(); const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const execId = 3000 + wsExecutions[wsCurrentId].length;
  wsExecutions[wsCurrentId].unshift({ id: execId, wfId: wf.id, wfName: wf.name, wfCode: wf.code, version: wf.version, trigger: 'manual', status: 'running', startTime: ts, endTime: '-', duration: '进行中', triggerUser: 'Sukey Wu', archived: false, nodes: [{ name: '触发节点', type: '手动触发', status: 'success', duration: '0.1秒', startTime: ts.slice(11) }, { name: '执行中...', type: '处理节点', status: 'running', duration: '进行中', startTime: ts.slice(11) }] });
  wf.runningCount++; wf.lastRun = 'running';
  showToast('success', '工作流已启动', `实例 ID: ${execId}`); render();
}
function showVersionHistory(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  showModal(`<div class="modal" style="max-width:600px"><div class="modal-header"><h2 class="modal-title">版本历史 - ${wf.name}</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="version-list">${wf.versions.length === 0 ? '<p style="text-align:center;color:var(--md-outline);padding:var(--space-8)">暂无发布版本</p>' : wf.versions.map(ver => `
    <div class="version-item"><div style="display:flex;align-items:center;gap:var(--space-3);flex:1"><span class="version-item-badge ${ver.status === 'current' ? 'version-current' : ''}">v${ver.v}</span><div><div style="font-size:var(--font-size-sm);font-weight:500">${ver.status === 'current' ? '当前生效版本' : ver.status === 'draft' ? '草稿' : '历史版本'}</div><div style="font-size:var(--font-size-xs);color:var(--md-outline)">${ver.publishedAt} · ${ver.publisher}${ver.note ? ` · ${ver.note}` : ''}</div></div></div>
    ${ver.status === 'history' ? `<button class="btn btn-secondary btn-sm" onclick="showRollbackModal(${wfId}, ${ver.v})">${icons.redo}<span>回滚</span></button>` : ''}</div>`).join('')}</div></div></div>`);
}
function showRollbackModal(wfId, targetVersion) {
  closeModal();
  setTimeout(() => {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">确认回滚</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">确定回滚到 v${targetVersion} 吗？将基于 v${targetVersion} 创建一个新的草稿版本，当前发布的版本不受影响，您可以在编辑确认后重新发布。</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="rollbackWf(${wfId}, ${targetVersion})">确认回滚</button></div></div>`);
  }, 250);
}
function rollbackWf(wfId, targetVersion) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  closeModal(); showToast('success', '回滚成功', `已基于 v${targetVersion} 创建新草稿版本`); render();
}

// --- Publish Workflow from list ---
function showPublishWfModal(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  const nextV = wf.version + 1;
  showModal(`<div class="modal" style="max-width:480px"><div class="modal-header"><h2 class="modal-title">发布工作流</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);padding:var(--space-3);background:var(--md-surface-container);border-radius:var(--radius-md)">
      <div class="content-item-icon wf-icon" style="width:36px;height:36px">${icons.workflow}</div>
      <div><div style="font-weight:500">${wf.name}</div><div style="font-size:var(--font-size-xs);color:var(--md-outline)">${icons.hash} ${wf.code}</div></div>
      <span class="version-badge" style="margin-left:auto">v${nextV}</span>
    </div>
    <div class="form-group"><label class="form-label">发布说明</label><textarea class="form-textarea" id="publishNote" placeholder="选填，简要描述本次发布变更内容" maxlength="200" rows="3"${!wf.debugPassed ? ' disabled' : ''}></textarea></div>
    ${!wf.debugPassed ? `<div class="delete-warning" style="margin-top:var(--space-3)"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text" style="font-size:var(--font-size-sm);color:var(--md-error)"><strong>无法发布：</strong>当前流程尚未通过调试验证，请先完成调试后再发布。</div></div>` : ''}
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" ${!wf.debugPassed ? 'disabled style="opacity:0.5;cursor:not-allowed;pointer-events:none"' : `onclick="publishWfFromList(${wfId})"`}>确认发布</button></div></div>`);
}
function publishWfFromList(wfId) {
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === wfId); if (!wf) return;
  const note = document.getElementById('publishNote')?.value?.trim() || '';
  const now = new Date().toISOString();
  wf.version++;
  // Mark existing current version as history
  if (wf.versions) wf.versions.forEach(v => { if (v.status === 'current') v.status = 'history'; });
  if (!wf.versions) wf.versions = [];
  wf.versions.unshift({ v: wf.version, status: 'current', publishedAt: now.slice(0, 16).replace('T', ' '), publisher: 'Sukey Wu', note });
  wf.status = 'published';
  wf.editedAt = now.slice(0, 16).replace('T', ' ');
  closeModal(); showToast('success', '发布成功', `工作流「${wf.name}」v${wf.version} 已发布`); render();
}

// --- Batch Operations ---
let batchMode = false;
let batchSelectedIds = new Set();
function toggleBatchMode() {
  batchMode = !batchMode;
  batchSelectedIds.clear();
  render();
}
function toggleBatchSelect(wfId) {
  if (batchSelectedIds.has(wfId)) batchSelectedIds.delete(wfId);
  else batchSelectedIds.add(wfId);
  render();
}
function toggleBatchSelectAll(wsId) {
  const wfs = (wsWorkflows[wsId] || []).filter(wf => wf.folderId === wsCurrentFolderId);
  if (batchSelectedIds.size === wfs.length) batchSelectedIds.clear();
  else wfs.forEach(wf => batchSelectedIds.add(wf.id));
  render();
}
function batchDelete() {
  if (batchSelectedIds.size === 0) return;
  const count = batchSelectedIds.size;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">批量删除</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">确定删除选中的 ${count} 个工作流吗？此操作不可恢复。</div></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="confirmBatchDelete()">确认删除 (${count})</button></div></div>`);
}
function confirmBatchDelete() {
  const ids = [...batchSelectedIds];
  wsWorkflows[wsCurrentId] = (wsWorkflows[wsCurrentId] || []).filter(wf => !ids.includes(wf.id));
  ids.forEach(id => { wsExecutions[wsCurrentId] = (wsExecutions[wsCurrentId] || []).filter(e => e.wfId !== id); });
  batchSelectedIds.clear(); batchMode = false;
  closeModal(); showToast('success', '批量删除成功', `已删除 ${ids.length} 个工作流`); render();
}
function batchMove() {
  if (batchSelectedIds.size === 0) return;
  const ws = workspaces.find(w => w.id === wsCurrentId); if (!ws) return;
  const allFolders = wsFolders[wsCurrentId] || [];
  const treeHtml = buildFolderTree(allFolders, null, null, null, `confirmBatchMove(__ID__)`, 0);
  showModal(`<div class="modal" style="max-width:480px"><div class="modal-header"><h2 class="modal-title">批量移动 (${batchSelectedIds.size}项)</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant);margin-bottom:var(--space-3)">选择目标文件夹：</p>
  <div class="folder-tree">
    <div class="folder-tree-node" onclick="confirmBatchMove(null)" style="cursor:pointer"><span class="folder-tree-icon">${icons.folder}</span><span class="folder-tree-label">${ws.name}（根目录）</span></div>
    ${treeHtml}
  </div></div></div>`);
}
function confirmBatchMove(targetFolderId) {
  const ids = [...batchSelectedIds];
  (wsWorkflows[wsCurrentId] || []).forEach(wf => {
    if (ids.includes(wf.id)) { wf.folderId = targetFolderId; wf.editedAt = new Date().toISOString().slice(0, 16).replace('T', ' '); }
  });
  batchSelectedIds.clear(); batchMode = false;
  closeModal(); showToast('success', '批量移动成功', `已移动 ${ids.length} 个工作流`); render();
}
function batchDisable() {
  if (batchSelectedIds.size === 0) return;
  const wfs = (wsWorkflows[wsCurrentId] || []).filter(wf => batchSelectedIds.has(wf.id) && wf.status === 'published');
  if (wfs.length === 0) { showToast('info', '提示', '选中的工作流中没有已发布状态的工作流'); return; }
  wfs.forEach(wf => { wf.status = 'disabled'; });
  batchSelectedIds.clear(); batchMode = false;
  showToast('success', '批量停用成功', `已停用 ${wfs.length} 个工作流`); render();
}

// ============================================
//   EXECUTIONS TAB
// ============================================
function renderWsExecutionsTab(ws) {
  if (wsExecDetailId !== null) return renderExecDetail(ws);

  const allExecs = wsExecutions[ws.id] || [];
  const wfNames = [...new Set(allExecs.map(e => e.wfName))].sort();
  let execs = allExecs.filter(e => wsExecShowArchive ? e.archived : !e.archived);

  // Filters
  if (wsExecSearch) { const q = wsExecSearch.toLowerCase(); execs = execs.filter(e => e.wfName.toLowerCase().includes(q) || String(e.id).includes(q)); }
  if (wsExecStatusFilter !== 'all') {
    if (wsExecStatusFilter === 'stale') execs = execs.filter(e => e.stale);
    else execs = execs.filter(e => e.status === wsExecStatusFilter);
  }
  if (wsExecTriggerFilter !== 'all') execs = execs.filter(e => e.trigger === wsExecTriggerFilter);
  if (wsExecWfFilter !== 'all') execs = execs.filter(e => e.wfName === wsExecWfFilter);
  if (wsExecTimeRange !== 'all') {
    const now = new Date();
    let from;
    if (wsExecTimeRange === '1h') from = new Date(now - 3600000);
    else if (wsExecTimeRange === '24h') from = new Date(now - 86400000);
    else if (wsExecTimeRange === '7d') from = new Date(now - 7 * 86400000);
    else if (wsExecTimeRange === '30d') from = new Date(now - 30 * 86400000);
    if (from) execs = execs.filter(e => new Date(e.startTime) >= from);
  }

  // Sort: stale first, then by startTime desc
  execs.sort((a, b) => { if (a.stale && !b.stale) return -1; if (!a.stale && b.stale) return 1; return b.startTime.localeCompare(a.startTime); });

  const statusLabel = { running: '运行中', paused: '已暂停', completed: '已完成', failed: '失败', cancelled: '已取消' };
  const statusClass = { running: 'exec-running', paused: 'exec-paused', completed: 'exec-completed', failed: 'exec-failed', cancelled: 'exec-cancelled' };
  const triggerLabel = { manual: '手动', scheduled: '定时', event: '事件触发', subflow: '子流程调用' };

  return `
    ${wsExecShowArchive ? `<div class="archive-banner">${icons.archive} 以下为归档数据，仅供查阅 <button class="btn btn-ghost btn-sm" onclick="toggleExecArchive()" style="margin-left:auto">返回在线记录</button></div>` : ''}
    <div class="filter-bar" style="margin-top:var(--space-3)">
      <div class="filter-search" style="flex:1;max-width:300px">${icons.search}<input type="text" placeholder="搜索工作流或实例ID..." value="${wsExecSearch}" oninput="onExecSearch(this.value)" /></div>
      <div class="filter-chips">
        <span class="filter-chip ${wsExecStatusFilter === 'all' ? 'active' : ''}" onclick="onExecStatusFilter('all')">全部</span>
        <span class="filter-chip ${wsExecStatusFilter === 'running' ? 'active' : ''}" onclick="onExecStatusFilter('running')">运行中</span>
        <span class="filter-chip ${wsExecStatusFilter === 'paused' ? 'active' : ''}" onclick="onExecStatusFilter('paused')">已暂停</span>
        <span class="filter-chip ${wsExecStatusFilter === 'completed' ? 'active' : ''}" onclick="onExecStatusFilter('completed')">已完成</span>
        <span class="filter-chip ${wsExecStatusFilter === 'failed' ? 'active' : ''}" onclick="onExecStatusFilter('failed')">失败</span>
        <span class="filter-chip ${wsExecStatusFilter === 'cancelled' ? 'active' : ''}" onclick="onExecStatusFilter('cancelled')">已取消</span>
        <span class="filter-chip ${wsExecStatusFilter === 'stale' ? 'active' : ''}" onclick="onExecStatusFilter('stale')">异常滞留</span>
      </div>
      <div class="filter-actions">
        <select class="form-input" style="width:auto;padding:4px 8px;font-size:var(--font-size-sm)" onchange="onExecWfFilter(this.value)">
          <option value="all" ${wsExecWfFilter === 'all' ? 'selected' : ''}>全部工作流</option>
          ${wfNames.map(n => `<option value="${n}" ${wsExecWfFilter === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <select class="form-input" style="width:auto;padding:4px 8px;font-size:var(--font-size-sm)" onchange="onExecTriggerFilter(this.value)">
          <option value="all" ${wsExecTriggerFilter === 'all' ? 'selected' : ''}>全部触发方式</option>
          <option value="manual" ${wsExecTriggerFilter === 'manual' ? 'selected' : ''}>手动</option>
          <option value="scheduled" ${wsExecTriggerFilter === 'scheduled' ? 'selected' : ''}>定时</option>
          <option value="event" ${wsExecTriggerFilter === 'event' ? 'selected' : ''}>事件触发</option>
        </select>
        <select class="form-input" style="width:auto;padding:4px 8px;font-size:var(--font-size-sm)" onchange="onExecTimeRange(this.value)">
          <option value="all" ${wsExecTimeRange === 'all' ? 'selected' : ''}>全部时间</option>
          <option value="1h" ${wsExecTimeRange === '1h' ? 'selected' : ''}>最近1小时</option>
          <option value="24h" ${wsExecTimeRange === '24h' ? 'selected' : ''}>最近24小时</option>
          <option value="7d" ${wsExecTimeRange === '7d' ? 'selected' : ''}>最近7天</option>
          <option value="30d" ${wsExecTimeRange === '30d' ? 'selected' : ''}>最近30天</option>
        </select>
        ${!wsExecShowArchive ? `<button class="btn btn-secondary btn-sm" onclick="toggleExecArchive()">${icons.archive}<span>查看归档</span></button>` : ''}
        <span class="item-count">共 <strong>${execs.length}</strong> 条</span>
      </div>
    </div>
    ${execs.length === 0 ? (wsExecSearch ? renderEmptyState('execSearchNoResult') : wsExecShowArchive ? renderEmptyState('archiveEmpty') : renderEmptyState('executions')) : `
    <div class="table-wrapper"><table class="exec-table"><thead><tr><th>实例ID</th><th>工作流</th><th>版本</th><th>触发方式</th><th>状态</th><th>开始时间</th><th>结束时间</th><th>耗时</th><th>触发人</th><th>操作</th></tr></thead><tbody>
    ${execs.map(e => `<tr${e.stale ? ' style="background:rgba(234,179,8,0.05)"' : ''}>
      <td><code style="font-size:var(--font-size-xs)">#${e.id}</code></td>
      <td style="font-weight:500">${e.wfName}</td>
      <td><span class="version-badge">v${e.version}</span></td>
      <td>${triggerLabel[e.trigger] || e.trigger}</td>
      <td><span class="exec-status ${statusClass[e.status]}">${statusLabel[e.status]}</span>${e.stale ? '<span class="stale-mark">异常滞留</span>' : ''}</td>
      <td style="font-size:var(--font-size-xs)">${e.startTime}</td>
      <td style="font-size:var(--font-size-xs)">${e.endTime}</td>
      <td>${e.duration}</td>
      <td>${e.triggerUser}</td>
      <td><div class="table-actions">
        <button class="table-action-btn" title="查看详情" onclick="viewExecDetail(${e.id})">${icons.eye}</button>
        ${(e.status === 'running' || e.status === 'paused') && ws.myRole !== 'viewer' ? `<button class="table-action-btn danger" title="取消" onclick="showCancelExecModal(${e.id})">${icons.stop}</button>` : ''}
        ${e.status === 'running' && ws.myRole !== 'viewer' ? `<button class="table-action-btn" title="暂停" onclick="showPauseExecModal(${e.id})">${icons.pause}</button>` : ''}
        ${e.status === 'paused' && ws.myRole !== 'viewer' ? `<button class="table-action-btn" title="恢复" onclick="resumeExec(${e.id})">${icons.play}</button>` : ''}
        ${['completed','failed','cancelled'].includes(e.status) && ws.myRole !== 'viewer' ? `<button class="table-action-btn" title="重新执行" onclick="reExecute(${e.id})">${icons.redo}</button>` : ''}
      </div></td>
    </tr>`).join('')}
    </tbody></table></div>`}`;
}

function onExecSearch(val) { wsExecSearch = val; render(); }
function onExecStatusFilter(val) { wsExecStatusFilter = val; render(); }
function onExecTriggerFilter(val) { wsExecTriggerFilter = val; render(); }
function onExecWfFilter(val) { wsExecWfFilter = val; render(); }
function onExecTimeRange(val) { wsExecTimeRange = val; render(); }
function toggleExecArchive() { wsExecShowArchive = !wsExecShowArchive; wsExecSearch = ''; wsExecStatusFilter = 'all'; wsExecTriggerFilter = 'all'; wsExecWfFilter = 'all'; wsExecTimeRange = 'all'; wsExecDetailId = null; render(); }
function viewExecDetail(execId) { wsExecDetailId = execId; render(); }

function renderExecDetail(ws) {
  const exec = (wsExecutions[ws.id] || []).find(e => e.id === wsExecDetailId);
  if (!exec) { wsExecDetailId = null; render(); return ''; }
  const statusLabel = { running: '运行中', paused: '已暂停', completed: '已完成', failed: '失败', cancelled: '已取消' };
  const statusClass = { running: 'exec-running', paused: 'exec-paused', completed: 'exec-completed', failed: 'exec-failed', cancelled: 'exec-cancelled' };
  const triggerLabel = { manual: '手动', scheduled: '定时', event: '事件触发', subflow: '子流程调用' };
  const nodeStatusClass = { success: 'success', failed: 'failed', running: 'running', skipped: 'skipped', paused: 'running' };

  return `
    <div class="detail-back" onclick="wsExecDetailId = null; render()" style="margin-bottom:var(--space-4)">${icons.arrowLeft}<span>返回执行记录列表</span></div>
    <div class="exec-detail-header">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <h2 style="font-size:var(--font-size-lg);font-weight:500;margin:0">执行详情 #${exec.id}</h2>
        <span class="exec-status ${statusClass[exec.status]}" style="font-size:var(--font-size-sm)">${statusLabel[exec.status]}</span>
        ${exec.stale ? '<span class="stale-mark">异常滞留</span>' : ''}
      </div>
      <div style="display:flex;gap:var(--space-2)">
        ${exec.status === 'running' && ws.myRole !== 'viewer' ? `<button class="btn btn-secondary btn-sm" onclick="showPauseExecModal(${exec.id})">${icons.pause}<span>暂停</span></button>` : ''}
        ${exec.status === 'paused' && ws.myRole !== 'viewer' ? `<button class="btn btn-primary btn-sm" onclick="resumeExec(${exec.id})">${icons.play}<span>恢复</span></button>` : ''}
        ${(exec.status === 'running' || exec.status === 'paused') && ws.myRole !== 'viewer' ? `<button class="btn btn-danger btn-sm" onclick="showCancelExecModal(${exec.id})">${icons.stop}<span>取消</span></button>` : ''}
        ${['completed','failed','cancelled'].includes(exec.status) && ws.myRole !== 'viewer' ? `<button class="btn btn-primary btn-sm" onclick="reExecute(${exec.id})">${icons.redo}<span>重新执行</span></button>` : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-4);margin:var(--space-4) 0;padding:var(--space-4);background:var(--md-surface);border-radius:var(--radius-lg)">
      <div class="exec-detail-field"><span class="exec-detail-field-label">工作流</span><span class="exec-detail-field-value" style="font-weight:500">${exec.wfName}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">版本</span><span class="version-badge">v${exec.version}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">触发方式</span><span>${triggerLabel[exec.trigger]}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">触发人</span><span>${exec.triggerUser}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">开始时间</span><span>${exec.startTime}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">结束时间</span><span>${exec.endTime}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">执行时长</span><span>${exec.duration}</span></div>
    </div>
    ${exec.nodes && exec.nodes.length > 0 ? `
    <h3 style="font-size:var(--font-size-md);font-weight:500;margin:var(--space-6) 0 var(--space-3)">节点执行时间线</h3>
    <div class="node-timeline">${exec.nodes.map(node => `
      <div class="node-item ${node.status === 'failed' ? 'node-item-failed' : ''}">
        <div class="node-dot ${nodeStatusClass[node.status] || ''}"></div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <span style="font-weight:500;font-size:var(--font-size-sm)">${node.name}</span>
            <span class="badge badge-type" style="font-size:10px">${node.type}</span>
            <span class="exec-status ${statusClass[node.status] || ''}" style="font-size:11px">${statusLabel[node.status] || node.status}</span>
          </div>
          <div style="display:flex;gap:var(--space-4);margin-top:2px;font-size:var(--font-size-xs);color:var(--md-outline)">
            <span>开始: ${node.startTime}</span><span>耗时: ${node.duration}</span>
          </div>
          ${node.error ? `<div style="margin-top:4px;padding:6px 8px;background:rgba(220,38,38,0.05);border-radius:var(--radius-md);font-size:var(--font-size-xs);color:var(--md-error)">${node.error}</div>` : ''}
        </div>
      </div>`).join('')}</div>` : ''}`;
}

function showCancelExecModal(execId) {
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">取消执行</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">确定取消该执行实例吗？取消后正在执行的节点将被终止，已完成的节点不受影响。</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">关闭</button><button class="btn btn-danger" onclick="cancelExec(${execId})">确认取消</button></div></div>`);
}
function cancelExec(execId) {
  const exec = (wsExecutions[wsCurrentId] || []).find(e => e.id === execId); if (!exec) return;
  exec.status = 'cancelled'; exec.endTime = new Date().toISOString().slice(0, 19).replace('T', ' '); exec.duration = '已取消';
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === exec.wfId); if (wf && wf.runningCount > 0) wf.runningCount--;
  closeModal(); showToast('success', '取消成功', '执行已取消'); render();
}
function showPauseExecModal(execId) {
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">暂停执行</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">确定暂停该执行实例吗？暂停后当前正在执行的节点将完成后挂起，后续节点不再执行。</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="pauseExec(${execId})">确认暂停</button></div></div>`);
}
function pauseExec(execId) {
  const exec = (wsExecutions[wsCurrentId] || []).find(e => e.id === execId); if (!exec) return;
  exec.status = 'paused'; closeModal(); showToast('success', '暂停成功', '执行已暂停'); render();
}
function resumeExec(execId) {
  const exec = (wsExecutions[wsCurrentId] || []).find(e => e.id === execId); if (!exec) return;
  exec.status = 'running'; exec.stale = false; showToast('success', '执行已恢复', ''); render();
}
function reExecute(execId) {
  const exec = (wsExecutions[wsCurrentId] || []).find(e => e.id === execId); if (!exec) return;
  const wf = (wsWorkflows[wsCurrentId] || []).find(x => x.id === exec.wfId);
  if (wf && wf.status === 'published') {
    executeWf(wf.id);
    showToast('success', '重新执行', '已基于当前版本重新启动');
  } else {
    showToast('warning', '无法执行', '工作流当前状态不支持执行');
  }
}

// ============================================
//   SETTINGS TAB (Member Management)
// ============================================
function renderWsSettingsTab(ws) {
  const isAdmin = ws.myRole === 'admin';
  const admins = ws.members.filter(m => m.role === 'admin');
  const members = ws.members.filter(m => m.role === 'member');
  const viewers = ws.members.filter(m => m.role === 'viewer');
  const isSingleAdmin = admins.length === 1;
  const currentUserIsOnlyAdmin = isSingleAdmin && admins[0].userId === 101;

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
      <div><h3 style="font-size:var(--font-size-md);font-weight:500;margin:0">空间信息</h3></div>
      <div style="display:flex;gap:var(--space-2)">
        ${isAdmin ? `<button class="btn btn-secondary btn-sm" onclick="showEditWsModal(${ws.id})">${icons.edit}<span>编辑信息</span></button>` : ''}
        ${currentUserIsOnlyAdmin ? `<button class="btn btn-secondary btn-sm" onclick="showTransferAdminModal(${ws.id})">${icons.transfer}<span>转让管理员</span></button>` : ''}
        ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="showDeleteWsStep1(${ws.id})">${icons.trash}<span>删除空间</span></button>` : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-3);padding:var(--space-4);background:var(--md-surface);border-radius:var(--radius-lg);margin-bottom:var(--space-6)">
      <div class="exec-detail-field"><span class="exec-detail-field-label">空间名称</span><span style="font-weight:500">${ws.name}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">空间编号</span><span>${ws.code}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">创建时间</span><span>${ws.createdAt}</span></div>
      <div class="exec-detail-field"><span class="exec-detail-field-label">描述</span><span>${ws.desc || '-'}</span></div>
    </div>

    <h3 style="font-size:var(--font-size-md);font-weight:500;margin-bottom:var(--space-3)">成员管理</h3>
    <div class="tabs-container">
      <div class="tabs-header">
        <div class="tab-item ${wsMemberTab === 'admin' ? 'active' : ''}" onclick="switchMemberTab('admin')">${icons.shield}<span style="margin-left:6px">管理员</span><span class="badge badge-type" style="margin-left:6px">${admins.length}</span></div>
        <div class="tab-item ${wsMemberTab === 'member' ? 'active' : ''}" onclick="switchMemberTab('member')">${icons.user}<span style="margin-left:6px">成员</span><span class="badge badge-type" style="margin-left:6px">${members.length}</span></div>
        <div class="tab-item ${wsMemberTab === 'viewer' ? 'active' : ''}" onclick="switchMemberTab('viewer')">${icons.eye}<span style="margin-left:6px">只读查看者</span><span class="badge badge-type" style="margin-left:6px">${viewers.length}</span></div>
      </div>
      <div class="tab-content">${renderMemberTabContent(ws, isAdmin)}</div>
    </div>`;
}

function renderMemberTabContent(ws, isAdmin) {
  const membersByRole = ws.members.filter(m => m.role === wsMemberTab);
  const roleLabels = { admin: '管理员', member: '成员', viewer: '只读查看者' };
  if (membersByRole.length === 0) {
    return `<div class="empty-state" style="padding:var(--space-10) var(--space-8)"><img src="./public/images/empty-members.png" alt="暂无成员" style="width:140px;margin-bottom:var(--space-4);opacity:0.7;" /><div class="empty-state-title">暂无${roleLabels[wsMemberTab]}</div><div class="empty-state-desc">当前角色分组暂无成员</div>${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="showAddMemberModal()">${icons.plus}<span>添加${roleLabels[wsMemberTab]}</span></button>` : ''}</div>`;
  }
  return `<div class="tab-toolbar"><div class="tab-toolbar-left"><span class="item-count">共 <strong>${membersByRole.length}</strong> 位${roleLabels[wsMemberTab]}</span></div><div class="tab-toolbar-right">${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="showAddMemberModal()">${icons.plus}<span>添加${roleLabels[wsMemberTab]}</span></button>` : ''}</div></div>
  <div class="member-list">${membersByRole.map(m => {
    const ac = m.role === 'admin' ? 'avatar-admin' : m.role === 'member' ? 'avatar-member' : 'avatar-viewer';
    return `<div class="member-item"><div class="member-avatar ${ac}">${m.avatar}</div><div class="member-info"><div class="member-name">${m.name}</div><div class="member-joined">加入于 ${m.joinedAt}</div></div>
    ${isAdmin ? `<div class="member-actions"><select class="member-role-select" onchange="changeMemberRole(${ws.id}, ${m.userId}, this.value)"><option value="admin" ${m.role === 'admin' ? 'selected' : ''}>管理员</option><option value="member" ${m.role === 'member' ? 'selected' : ''}>成员</option><option value="viewer" ${m.role === 'viewer' ? 'selected' : ''}>只读查看者</option></select><button class="btn btn-ghost btn-sm" style="color:var(--md-error)" onclick="showRemoveMemberModal(${ws.id}, ${m.userId})">${icons.removeUser}<span>移除</span></button></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}
function switchMemberTab(tab) { wsMemberTab = tab; render(); }

// --- Workspace CRUD ---
function showCreateWsModal() {
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">创建空间</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">空间名称 <span class="required">*</span></label><input type="text" class="form-input" id="wsName" placeholder="请输入空间名称" maxlength="50" oninput="this.classList.remove('error');document.getElementById('wsNameError').classList.add('hidden')" /><div class="form-error hidden" id="wsNameError"></div></div>
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">空间描述</label><textarea class="form-textarea" id="wsDesc" placeholder="选填" maxlength="200"></textarea></div>
  <div class="form-group"><label class="form-label">空间编号 <span class="required">*</span></label><input type="text" class="form-input" id="wsCode" placeholder="英文、数字、下划线、连字符" maxlength="30" oninput="this.classList.remove('error');document.getElementById('wsCodeError').classList.add('hidden')" /><div class="form-error hidden" id="wsCodeError"></div></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="createWorkspace()">保存</button></div></div>`);
  setTimeout(() => document.getElementById('wsName')?.focus(), 300);
}
function createWorkspace() {
  const rawName = document.getElementById('wsName').value, rawCode = document.getElementById('wsCode').value;
  const name = rawName.trim(), desc = document.getElementById('wsDesc').value.trim(), code = rawCode.trim();
  let hasError = false;
  const ni = document.getElementById('wsName'), ne = document.getElementById('wsNameError'); ni.classList.remove('error'); ne.classList.add('hidden');
  if (!name) { ni.classList.add('error'); ne.textContent = '请输入空间名称'; ne.classList.remove('hidden'); hasError = true; }
  else if (rawName !== name) { ni.classList.add('error'); ne.textContent = '空间名称不允许以空格开头或结尾'; ne.classList.remove('hidden'); hasError = true; }
  else if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { ni.classList.add('error'); ne.textContent = '空间名称仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); hasError = true; }
  else if (workspaces.some(w => w.name === name)) { ni.classList.add('error'); ne.textContent = '该空间名称已存在，请使用其他名称'; ne.classList.remove('hidden'); hasError = true; }
  const ci = document.getElementById('wsCode'), ce = document.getElementById('wsCodeError'); ci.classList.remove('error'); ce.classList.add('hidden');
  if (!code) { ci.classList.add('error'); ce.textContent = '请输入空间编号'; ce.classList.remove('hidden'); hasError = true; }
  else if (rawCode !== code) { ci.classList.add('error'); ce.textContent = '空间编号不允许包含空格'; ce.classList.remove('hidden'); hasError = true; }
  else if (!/^[a-zA-Z0-9_-]+$/.test(code)) { ci.classList.add('error'); ce.textContent = '空间编号仅支持英文、数字、下划线和连字符'; ce.classList.remove('hidden'); hasError = true; }
  else if (workspaces.some(w => w.code === code)) { ci.classList.add('error'); ce.textContent = '该空间编号已存在，请使用其他编号'; ce.classList.remove('hidden'); hasError = true; }
  if (hasError) return;
  const now = new Date(), ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const newWs = { id: wsNextId++, name, desc, code, workflowCount: 0, myRole: 'admin', createdAt: now.toISOString().slice(0, 10), lastActiveAt: ts, runningInstances: 0, members: [{ userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'admin', joinedAt: now.toISOString().slice(0, 10) }] };
  workspaces.push(newWs); wsFolders[newWs.id] = []; wsWorkflows[newWs.id] = []; wsExecutions[newWs.id] = [];
  closeModal(); showToast('success', '创建成功', `空间「${name}」已创建`); wsNavigateTo('detail', newWs.id);
}
function showEditWsModal(id) {
  const ws = workspaces.find(w => w.id === id); if (!ws) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">编辑空间</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">空间名称 <span class="required">*</span></label><input type="text" class="form-input" id="wsName" value="${ws.name}" maxlength="50" oninput="this.classList.remove('error');document.getElementById('wsNameError').classList.add('hidden')" /><div class="form-error hidden" id="wsNameError"></div></div>
  <div class="form-group" style="margin-bottom:var(--space-4)"><label class="form-label">空间描述</label><textarea class="form-textarea" id="wsDesc" maxlength="200">${ws.desc}</textarea></div>
  <div class="form-group"><label class="form-label">空间编号 <span style="font-size:var(--font-size-xs);color:var(--md-outline);font-weight:400">创建后不可修改</span></label><input type="text" class="form-input" id="wsCode" value="${ws.code}" disabled style="background:var(--md-surface);color:var(--md-outline);cursor:not-allowed" /></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="updateWorkspace(${id})">保存</button></div></div>`);
}
function updateWorkspace(id) {
  const ws = workspaces.find(w => w.id === id), name = document.getElementById('wsName').value.trim(), desc = document.getElementById('wsDesc').value.trim();
  const ni = document.getElementById('wsName'), ne = document.getElementById('wsNameError'); ni.classList.remove('error'); ne.classList.add('hidden');
  if (!name) { ni.classList.add('error'); ne.textContent = '请输入空间名称'; ne.classList.remove('hidden'); return; }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { ni.classList.add('error'); ne.textContent = '空间名称仅支持中文、英文、数字、下划线和连字符'; ne.classList.remove('hidden'); return; }
  if (workspaces.some(w => w.id !== id && w.name === name)) { ni.classList.add('error'); ne.textContent = '该空间名称已存在，请使用其他名称'; ne.classList.remove('hidden'); return; }
  ws.name = name; ws.desc = desc; closeModal(); showToast('success', '保存成功', '空间已更新'); render();
}
function showDeleteWsStep1(id) {
  const ws = workspaces.find(w => w.id === id); if (!ws) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">删除空间</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="delete-step-indicator"><div class="delete-step active"><span class="delete-step-num">1</span><span>确认风险</span></div><div class="delete-step-line"></div><div class="delete-step"><span class="delete-step-num">2</span><span>输入确认</span></div></div>
  <div class="delete-warning"><span class="delete-warning-icon">${icons.alertTriangle}</span><div class="delete-warning-text">删除空间后，所有工作流和执行记录将被一并删除，不可恢复。${ws.runningInstances > 0 ? `<br><br><strong style="color:var(--md-error)">当前有 ${ws.runningInstances} 个运行中实例将被终止。</strong>` : ''}</div></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="showDeleteWsStep2(${id})">继续</button></div></div>`);
}
function showDeleteWsStep2(id) {
  const ws = workspaces.find(w => w.id === id); if (!ws) return; closeModal();
  setTimeout(() => {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">确认删除</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
    <div class="delete-step-indicator"><div class="delete-step completed"><span class="delete-step-num">${icons.check}</span><span>确认风险</span></div><div class="delete-step-line completed"></div><div class="delete-step active"><span class="delete-step-num">2</span><span>输入确认</span></div></div>
    <div class="delete-confirm-input"><label class="delete-confirm-label">请输入空间名称以确认删除：<strong>${ws.name}</strong></label><input type="text" class="form-input" id="deleteConfirmInput" placeholder="请输入空间名称" oninput="onDeleteConfirmInput(${id})" style="width:100%" /></div>
    </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" id="confirmDeleteBtn" disabled style="opacity:0.5;cursor:not-allowed;pointer-events:none" onclick="deleteWorkspace(${id})">确认删除</button></div></div>`);
    setTimeout(() => document.getElementById('deleteConfirmInput')?.focus(), 300);
  }, 250);
}
function onDeleteConfirmInput(id) {
  const ws = workspaces.find(w => w.id === id), input = document.getElementById('deleteConfirmInput'), btn = document.getElementById('confirmDeleteBtn');
  if (input && btn && ws) { if (input.value.trim() === ws.name) { btn.removeAttribute('disabled'); btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.style.pointerEvents = 'auto'; } else { btn.setAttribute('disabled', 'true'); btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; btn.style.pointerEvents = 'none'; } }
}
function deleteWorkspace(id) {
  const ws = workspaces.find(w => w.id === id);
  workspaces = workspaces.filter(w => w.id !== id);
  delete wsFolders[id]; delete wsWorkflows[id]; delete wsExecutions[id];
  closeModal(); showToast('success', '删除成功', `空间「${ws.name}」已删除`); wsNavigateTo('list');
}

// --- Member Management ---
function showAddMemberModal() {
  const ws = workspaces.find(w => w.id === wsCurrentId); if (!ws) return;
  const existingIds = ws.members.map(m => m.userId);
  const available = ssoUsers.filter(u => !existingIds.includes(u.id));
  const roleLabels = { admin: '管理员', member: '成员', viewer: '只读查看者' };
  const targetRole = wsMemberTab;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">添加${roleLabels[targetRole]}</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="people-picker-search">${icons.search}<input type="text" placeholder="搜索用户名..." oninput="filterPeoplePicker(this.value)" /></div>
  <div class="people-picker-list" id="peoplePickerList" style="max-height:320px;overflow-y:auto">${available.length === 0 ? '<div style="text-align:center;color:var(--md-outline);padding:var(--space-8)">暂无可添加的用户</div>' :
    available.map(u => `<div class="people-picker-item" data-name="${u.name}" onclick="addMember(${ws.id}, ${u.id}, '${targetRole}')"><div class="member-avatar avatar-${targetRole}">${u.avatar}</div><div class="people-picker-item-info"><div class="people-picker-item-name">${u.name}</div><div class="people-picker-item-dept">${u.dept}</div></div><div class="people-picker-item-add">${icons.plus}</div></div>`).join('')}
  </div></div></div>`);
}
function filterPeoplePicker(val) { document.querySelectorAll('#peoplePickerList .people-picker-item').forEach(item => { item.style.display = item.getAttribute('data-name').toLowerCase().includes(val.toLowerCase()) ? 'flex' : 'none'; }); }
function addMember(wsId, userId, role) {
  const ws = workspaces.find(w => w.id === wsId); if (!ws) return;
  if (ws.members.some(m => m.userId === userId)) { showToast('warning', '提示', '该用户已是空间成员'); return; }
  const user = ssoUsers.find(u => u.id === userId);
  ws.members.push({ userId: user.id, name: user.name, avatar: user.avatar, role, joinedAt: new Date().toISOString().slice(0, 10) });
  closeModal(); showToast('success', '添加成功', `已将「${user.name}」添加为${role === 'admin' ? '管理员' : role === 'member' ? '成员' : '只读查看者'}`); render();
}
function changeMemberRole(wsId, userId, newRole) {
  const ws = workspaces.find(w => w.id === wsId); if (!ws) return;
  const member = ws.members.find(m => m.userId === userId); if (!member) return;
  if (member.role === 'admin' && newRole !== 'admin') { if (ws.members.filter(m => m.role === 'admin').length <= 1) { showToast('error', '操作失败', '至少保留一名管理员'); render(); return; } }
  member.role = newRole; showToast('success', '角色变更', `已变更为${{ admin: '管理员', member: '成员', viewer: '只读查看者' }[newRole]}`); render();
}
function showRemoveMemberModal(wsId, userId) {
  const ws = workspaces.find(w => w.id === wsId); if (!ws) return;
  const member = ws.members.find(m => m.userId === userId); if (!member) return;
  if (member.role === 'admin' && ws.members.filter(m => m.role === 'admin').length <= 1) { showToast('error', '操作失败', '至少保留一名管理员'); return; }
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">移除成员</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">确定移除该成员吗？移除后该用户将无法访问此空间。</p>
  <div style="margin-top:var(--space-4);display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--md-surface);border-radius:var(--radius-lg)"><div class="member-avatar avatar-${member.role}">${member.avatar}</div><div><div style="font-size:var(--font-size-sm);font-weight:500">${member.name}</div></div></div>
  </div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="removeMember(${wsId}, ${userId})">确认移除</button></div></div>`);
}
function removeMember(wsId, userId) {
  const ws = workspaces.find(w => w.id === wsId); if (!ws) return;
  const member = ws.members.find(m => m.userId === userId);
  ws.members = ws.members.filter(m => m.userId !== userId);
  closeModal(); showToast('success', '移除成功', `已将「${member.name}」移除`); render();
}
function showTransferAdminModal(wsId) {
  const ws = workspaces.find(w => w.id === wsId); if (!ws) return;
  showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">转让管理员</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body">
  <div class="transfer-info"><span class="transfer-info-icon">${icons.info}</span><div class="transfer-info-text">转让后，目标用户将成为管理员，您的角色将变更为成员。</div></div>
  <div class="people-picker-search">${icons.search}<input type="text" placeholder="搜索用户名..." oninput="filterTransferPicker(this.value)" /></div>
  <div class="people-picker-list" id="transferPickerList" style="max-height:320px;overflow-y:auto">${ssoUsers.filter(u => u.id !== 101).map(u => `<div class="people-picker-item" data-name="${u.name}" onclick="confirmTransferAdmin(${wsId}, ${u.id}, '${u.name}')"><div class="member-avatar avatar-admin">${u.avatar}</div><div class="people-picker-item-info"><div class="people-picker-item-name">${u.name}</div><div class="people-picker-item-dept">${u.dept}</div></div><div class="people-picker-item-add">${icons.transfer}</div></div>`).join('')}</div></div></div>`);
}
function filterTransferPicker(val) { document.querySelectorAll('#transferPickerList .people-picker-item').forEach(item => { item.style.display = item.getAttribute('data-name').toLowerCase().includes(val.toLowerCase()) ? 'flex' : 'none'; }); }
function confirmTransferAdmin(wsId, targetUserId, targetName) {
  closeModal(); setTimeout(() => {
    showModal(`<div class="modal"><div class="modal-header"><h2 class="modal-title">转让管理员</h2><button class="modal-close" onclick="closeModal()">${icons.close}</button></div><div class="modal-body"><p style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">确定将管理员权限转让给 <strong>${targetName}</strong> 吗？转让后您的角色将变更为成员。</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="executeTransferAdmin(${wsId}, ${targetUserId})">确认转让</button></div></div>`);
  }, 250);
}
function executeTransferAdmin(wsId, targetUserId) {
  const ws = workspaces.find(w => w.id === wsId); if (!ws) return;
  const targetUser = ssoUsers.find(u => u.id === targetUserId);
  const currentAdmin = ws.members.find(m => m.userId === 101); if (currentAdmin) currentAdmin.role = 'member';
  const existingMember = ws.members.find(m => m.userId === targetUserId);
  if (existingMember) existingMember.role = 'admin';
  else ws.members.push({ userId: targetUser.id, name: targetUser.name, avatar: targetUser.avatar, role: 'admin', joinedAt: new Date().toISOString().slice(0, 10) });
  ws.myRole = 'member'; closeModal(); showToast('success', '转让成功', `管理员已转让给「${targetUser.name}」`); wsMemberTab = 'admin'; render();
}

// ============================================
//   TOAST SYSTEM
// ============================================
function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
  const id = 'toast-' + Date.now();
  const iconMap = { success: icons.checkCircle, error: icons.xCircle, warning: icons.alertTriangle, info: icons.info };
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.id = id;
  toast.innerHTML = `<span class="toast-icon ${type}">${iconMap[type]}</span><div class="toast-content"><div class="toast-title">${title}</div>${message ? `<div class="toast-message">${message}</div>` : ''}</div><button class="modal-close" onclick="removeToast('${id}')" style="width:24px;height:24px">${icons.close}</button>`;
  container.appendChild(toast);
  setTimeout(() => removeToast(id), 3000);
}
function removeToast(id) { const toast = document.getElementById(id); if (toast) { toast.classList.add('removing'); setTimeout(() => toast.remove(), 200); } }

// --- Init ---
document.addEventListener('DOMContentLoaded', () => { render(); initInteractionEffects(); });

// ============================================
//   VUE-BITS INSPIRED INTERACTION EFFECTS
//   (Pure vanilla JS implementations)
// ============================================

function initInteractionEffects() {
  initClickSpark();
  initMagnetButtons();
}

// --- 1. Count Up Animation ---
function animateCountUp(el, target, duration) {
  if (!el || isNaN(target)) return;
  const start = 0;
  const startTime = performance.now();
  duration = duration || 800;

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutExpo(progress);
    const currentValue = Math.round(start + (target - start) * easedProgress);
    el.textContent = currentValue;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function triggerCountUpAnimations() {
  document.querySelectorAll('[data-count-up]').forEach((el, idx) => {
    const target = parseInt(el.getAttribute('data-count-up'), 10);
    if (!isNaN(target)) {
      el.textContent = '0';
      setTimeout(() => animateCountUp(el, target, 900), idx * 80);
    }
  });
}

// --- 2. Fade Content (applied on render) ---
function applyFadeIn(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.remove('fade-in');
    void el.offsetWidth; // force reflow
    el.classList.add('fade-in');
  }
}

// --- 3. Blur Text (title entrance animation) ---
function applyBlurText(el) {
  if (!el) return;
  const text = el.textContent;
  el.innerHTML = '';
  el.style.visibility = 'visible';
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'blur-text-char';
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.animationDelay = `${i * 40}ms`;
    el.appendChild(span);
  });
}

let lastBlurView = '';
function triggerBlurTextAnimations() {
  const viewKey = `${currentModule}-${currentView}-${currentDsId || ''}-${wsCurrentView}-${wsCurrentId || ''}`;
  if (viewKey === lastBlurView) return;
  lastBlurView = viewKey;
  document.querySelectorAll('.page-title, .detail-title, .ws-detail-title').forEach(el => {
    applyBlurText(el);
  });
}

// --- 4. Spotlight Card (mouse-following highlight) ---
function initSpotlightCards() {
  document.querySelectorAll('.spotlight-card').forEach(card => {
    if (card.dataset.spotlightInit) return;
    card.dataset.spotlightInit = '1';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
    });
  });
}

// --- 5. Click Spark (button click particles) ---
function initClickSpark() {
  let sparkContainer = document.querySelector('.click-spark-container');
  if (!sparkContainer) {
    sparkContainer = document.createElement('div');
    sparkContainer.className = 'click-spark-container';
    document.body.appendChild(sparkContainer);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-primary, .btn-danger');
    if (!btn) return;

    const count = 8;
    const sparks = [];
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'click-spark';
      const angle = (360 / count) * i + (Math.random() * 20 - 10);
      const distance = 20 + Math.random() * 20;
      spark.style.left = `${e.clientX}px`;
      spark.style.top = `${e.clientY}px`;
      spark.style.setProperty('--spark-rotation', `rotate(${angle}deg)`);
      spark.style.setProperty('--spark-distance', `-${distance}px`);
      spark.style.animationDuration = `${0.4 + Math.random() * 0.3}s`;
      sparkContainer.appendChild(spark);
      sparks.push(spark);
    }
    setTimeout(() => sparks.forEach(s => s.remove()), 800);
  });
}

// --- 6. Star Border (rotating gradient border on active tabs) ---
// Applied via CSS class `.star-border` on active elements

// --- 7. Glare Hover (light sweep on cards) ---
// Applied via CSS class `.glare-hover` on hoverable cards

// --- 8. Magnet Button (subtle attraction effect) ---
function initMagnetButtons() {
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.magnet-btn').forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = 120;
      if (dist < threshold) {
        const strength = (1 - dist / threshold) * 6;
        btn.style.transform = `translate(${dx * strength / threshold}px, ${dy * strength / threshold}px)`;
      } else {
        btn.style.transform = '';
      }
    });
  });
}

// --- 9. Shiny Text ---
// Applied via CSS class `.shiny-text` on titles

// --- 10. Post-render hook to activate effects ---
const _originalRender = render;
let _lastFadeViewKey = '';
render = function() {
  // Save focus state & cursor position BEFORE DOM rebuild destroys inputs
  const _dsSearchEl = document.getElementById('dsSearchInput');
  const _searchWasFocused = searchFocused || (document.activeElement && document.activeElement === _dsSearchEl);
  const _searchCursorPos = (_searchWasFocused && _dsSearchEl) ? (_dsSearchEl.selectionStart || 0) : 0;
  const _creatorInputEl = document.querySelector('.creator-dropdown-search input');
  const _creatorWasFocused = document.activeElement && document.activeElement === _creatorInputEl;
  const _creatorCursorPos = (_creatorWasFocused && _creatorInputEl) ? (_creatorInputEl.selectionStart || 0) : 0;

  // Detect actual view/page change (not just filter operations)
  const newViewKey = `${currentModule}-${currentView}-${currentDsId || ''}-${wsCurrentView}-${wsCurrentId || ''}-${wsInternalTab || ''}-${currentTab || ''}`;
  const viewChanged = newViewKey !== _lastFadeViewKey;
  _lastFadeViewKey = newViewKey;

  _originalRender();

  // Only apply fade-in on actual page/view transitions, not filter operations
  if (viewChanged) {
    applyFadeIn('.content');
  }

  // Activate blur text on titles
  requestAnimationFrame(() => {
    triggerBlurTextAnimations();
    triggerCountUpAnimations();
    initSpotlightCards();
    // Restore search input focus after DOM rebuild
    if (currentModule === 'datasource' && currentView === 'list') {
      // Priority: creator dropdown search > main search (avoid focus fighting)
      if (listState.creatorDropdownOpen && _creatorWasFocused) {
        const cs = document.querySelector('.creator-dropdown-search input');
        if (cs) { cs.focus(); cs.setSelectionRange(_creatorCursorPos, _creatorCursorPos); }
      } else if (_searchWasFocused && !listState.creatorDropdownOpen) {
        const si = document.getElementById('dsSearchInput');
        if (si) { si.focus(); si.setSelectionRange(_searchCursorPos, _searchCursorPos); }
      }
    }
  });
};

// --- 11. Close creator dropdown on outside click ---
document.addEventListener('click', (e) => {
  if (listState.creatorDropdownOpen && !e.target.closest('.creator-dropdown')) {
    listState.creatorDropdownOpen = false;
    listState.creatorSearch = '';
    render();
  }
});