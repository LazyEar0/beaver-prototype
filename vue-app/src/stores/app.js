// Pinia store: all mock data + state for the entire prototype
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // ============================================
  //   SSO Users
  // ============================================
  const ssoUsers = ref([
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
  ])

  // ============================================
  //   DATA SOURCES
  // ============================================
  const dataSources = ref([
    { id: 1, name: '酒店星级字典', desc: '定义酒店星级分类标准', createdAt: '2025-03-15', creator: 'Admin', isPublic: true, referenced: true, referenceCount: 3, items: [{ key: 'ONE_STAR', value: '一星级', type: 'String', updatedAt: '2025-04-12 10:00' }, { key: 'TWO_STAR', value: '二星级', type: 'String', updatedAt: '2025-04-11 15:30' }, { key: 'STAR_COUNT', value: '5', type: 'Integer', updatedAt: '2025-04-10 09:00' }, { key: 'IS_ACTIVE', value: 'true', type: 'Boolean', updatedAt: '2025-04-09 14:20' }, { key: 'AVG_PRICE', value: '688.50', type: 'Double', updatedAt: '2025-04-08 11:00' }, { key: 'LAST_SYNC', value: '2025-04-10T14:30', type: 'DateTime', updatedAt: '2025-04-10 14:30' }], authorizedSpaces: [], syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [] },
    { id: 2, name: '货币代码', desc: '国际标准货币代码对照表', createdAt: '2025-03-18', creator: 'Sukey Wu', isPublic: true, referenced: true, referenceCount: 8, items: [{ key: 'CNY', value: '人民币', type: 'String', updatedAt: '2025-04-10 14:30' }, { key: 'USD', value: '美元', type: 'String', updatedAt: '2025-04-10 14:30' }, { key: 'EUR', value: '欧元', type: 'String', updatedAt: '2025-04-10 14:30' }], authorizedSpaces: [], syncConfig: { url: 'https://api.example.com/currencies', keyField: 'code', valueField: 'name_cn' }, syncLogs: [{ time: '2025-04-10 14:30', operator: 'Sukey Wu', strategy: '全量覆盖', result: 'success', summary: '新增 0 条、更新 7 条、删除 0 条', reason: '' }] },
    { id: 3, name: '房型代码', desc: '酒店房型编码与中文名称映射', createdAt: '2025-03-22', creator: 'Admin', isPublic: false, referenced: true, referenceCount: 2, items: [{ key: 'SGL', value: '单人房', type: 'String', updatedAt: '2026-04-16 11:20' }, { key: 'DBL', value: '双人房', type: 'String', updatedAt: '2026-04-15 09:30' }, { key: 'TWN', value: '双床房', type: 'String', updatedAt: '2026-04-14 16:45' }], authorizedSpaces: ['酒店预订流程', '数据清洗工作区'], syncConfig: { url: 'https://api.hotel.com/room-types', keyField: 'code', valueField: 'name_cn' }, syncLogs: [
      { time: '2026-04-16 11:20', operator: 'Sukey Wu', strategy: '全量覆盖', result: 'error', summary: '', reason: 'API 返回格式异常' },
      { time: '2026-04-16 11:20', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 2 条、更新 8 条', reason: '' },
      { time: '2026-04-15 09:30', operator: 'Admin', strategy: '全量覆盖', result: 'success', summary: '新增 0 条、更新 12 条', reason: '' },
      { time: '2026-04-14 16:45', operator: 'Sukey Wu', strategy: '增量更新', result: 'success', summary: '新增 1 条、更新 3 条', reason: '' },
    ] },
    { id: 4, name: '供应商列表', desc: '酒店供应商接入方清单', createdAt: '2025-04-01', creator: 'Sukey Wu', isPublic: false, referenced: false, referenceCount: 0, items: [{ key: 'SUPPLIER_A', value: 'Expedia', type: 'String', updatedAt: '2025-04-01 10:00' }, { key: 'SUPPLIER_B', value: 'Booking.com', type: 'String', updatedAt: '2025-04-01 10:00' }], authorizedSpaces: ['酒店预订流程'], syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [] },
    { id: 5, name: '订单状态码', desc: '订单生命周期各阶段状态定义', createdAt: '2025-04-05', creator: 'Admin', isPublic: true, referenced: true, referenceCount: 5, items: [{ key: 'PENDING', value: '待处理', type: 'String', updatedAt: '2025-04-05 09:00' }, { key: 'CONFIRMED', value: '已确认', type: 'String', updatedAt: '2025-04-05 09:00' }, { key: 'CANCELLED', value: '已取消', type: 'String', updatedAt: '2025-04-05 09:00' }], authorizedSpaces: [], syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [] },
  ])
  const allSpaces = ['酒店预订流程', '机票同步流程', '数据清洗工作区', '报表统计空间', '通知推送流程']
  let nextDsId = 11

  // ============================================
  //   WORKSPACES
  // ============================================
  const workspaces = ref([
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
  ])
  let wsNextId = 7

  // ============================================
  //   FOLDERS per workspace
  // ============================================
  const wsFolders = ref({
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
  })
  let folderNextId = 200

  // ============================================
  //   WORKFLOWS per workspace
  // ============================================
  const wsWorkflows = ref({
    1: [
      { id: 1, name: '酒店搜索', code: 'HTL_SEARCH', desc: '根据条件搜索可用酒店列表', type: 'app', allowRef: true, status: 'published', version: 3, creator: 'Sukey Wu', owners: [101, 103], folderId: 2, wsId: 1, createdAt: '2025-01-20', editedAt: '2025-04-13 14:30', lastRun: 'success', runningCount: 0, execCount: 45, debugPassed: true, inputs: [
        { name: 'city', label: '目标城市', type: 'String', required: true, desc: '搜索的目标城市名称' },
        { name: 'checkInDate', label: '入住日期', type: 'DateTime', required: true, desc: '预期入住日期时间' },
        { name: 'checkOutDate', label: '退房日期', type: 'DateTime', required: true, desc: '预期退房日期时间' },
        { name: 'guestCount', label: '入住人数', type: 'Integer', required: true, desc: '入住房间的总人数' },
        { name: 'maxPrice', label: '最高价格', type: 'Double', required: false, desc: '每晚最高价格限制（元），不填则不限' },
        { name: 'includeFullBooked', label: '包含满房酒店', type: 'Boolean', required: false, desc: '是否在结果中包含当前已满房的酒店' },
      ], versions: [
        { v: 3, status: 'current', publishedAt: '2025-04-13 14:00', publisher: 'Sukey Wu', note: '优化搜索性能' },
        { v: 2, status: 'history', publishedAt: '2025-03-20 10:00', publisher: 'Admin', note: '增加价格筛选' },
        { v: 1, status: 'history', publishedAt: '2025-02-01 09:00', publisher: 'Sukey Wu', note: '初始版本' },
      ] },
      { id: 2, name: '酒店预订确认', code: 'HTL_CONFIRM', desc: '处理酒店预订确认和通知', type: 'app', allowRef: false, status: 'published', version: 2, creator: 'Admin', owners: [102], folderId: 1, wsId: 1, createdAt: '2025-01-25', editedAt: '2025-04-12 10:30', lastRun: 'running', runningCount: 2, execCount: 32, debugPassed: true, inputs: [
        { name: 'orderId', label: '订单编号', type: 'String', required: true, desc: '需要确认的订单唯一编号' },
        { name: 'notifyGuest', label: '通知客人', type: 'Boolean', required: false, desc: '确认后是否自动发送通知给客人' },
      ], versions: [
        { v: 2, status: 'current', publishedAt: '2025-04-10 16:00', publisher: 'Admin', note: '增加短信通知' },
        { v: 1, status: 'history', publishedAt: '2025-02-05 14:00', publisher: 'Admin', note: '' },
      ] },
      { id: 3, name: '订单取消处理', code: 'HTL_CANCEL', desc: '自动化处理客户取消订单请求', type: 'app', allowRef: true, status: 'published', version: 1, creator: 'Sukey Wu', owners: [101], folderId: 3, wsId: 1, createdAt: '2025-02-15', editedAt: '2025-04-08 09:15', lastRun: 'failed', runningCount: 0, execCount: 18, debugPassed: true, inputs: [], versions: [{ v: 1, status: 'current', publishedAt: '2025-03-01 11:00', publisher: 'Sukey Wu', note: '初始发布' }] },
      { id: 4, name: '退款流程', code: 'HTL_REFUND', desc: '客户退款申请审批与执行', type: 'app', allowRef: false, status: 'draft', version: 0, creator: '张三', owners: [103], folderId: 3, wsId: 1, createdAt: '2025-03-20', editedAt: '2025-04-07 15:45', lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, inputs: [], versions: [] },
      { id: 5, name: '智能客服对话', code: 'HTL_CHAT', desc: '基于AI的酒店预订智能客服', type: 'chat', allowRef: false, status: 'published', version: 2, creator: 'Sukey Wu', owners: [101, 107], folderId: null, wsId: 1, createdAt: '2025-02-28', editedAt: '2025-04-11 11:20', lastRun: 'success', runningCount: 1, execCount: 120, debugPassed: true, inputs: [], versions: [] },
      { id: 6, name: '供应商价格同步', code: 'SUPPLIER_PRICE', desc: '定时同步各供应商最新价格', type: 'app', allowRef: false, status: 'disabled', version: 2, creator: 'Admin', owners: [102], folderId: 4, wsId: 1, createdAt: '2025-03-05', editedAt: '2025-04-06 16:00', lastRun: 'success', runningCount: 0, execCount: 60, debugPassed: true, inputs: [], versions: [] },
      { id: 7, name: '预订数据报表', code: 'HTL_REPORT', desc: '每日酒店预订统计报表', type: 'app', allowRef: false, status: 'published', version: 1, creator: '钱七', owners: [107], folderId: null, wsId: 1, createdAt: '2025-03-25', editedAt: '2025-04-09 08:00', lastRun: 'success', runningCount: 0, execCount: 15, debugPassed: true, inputs: [], versions: [] },
      { id: 8, name: '库存预警通知', code: 'HTL_STOCK_ALERT', desc: '酒店库存不足自动预警', type: 'app', allowRef: false, status: 'draft', version: 0, creator: '李四', owners: [104], folderId: null, wsId: 1, createdAt: '2025-04-10', editedAt: '2025-04-13 09:30', lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, inputs: [], versions: [] },
    ],
    2: [
      { id: 20, name: '航班信息拉取', code: 'FLT_PULL', desc: '从供应商API拉取航班数据', type: 'app', allowRef: true, status: 'published', version: 4, creator: 'Admin', owners: [102], folderId: 10, wsId: 2, createdAt: '2025-02-05', editedAt: '2025-04-12 09:15', lastRun: 'success', runningCount: 0, execCount: 200, debugPassed: true, inputs: [], versions: [] },
      { id: 21, name: '库存更新', code: 'FLT_INVENTORY', desc: '实时更新机票库存', type: 'app', allowRef: false, status: 'published', version: 2, creator: 'Sukey Wu', owners: [101], folderId: 10, wsId: 2, createdAt: '2025-02-10', editedAt: '2025-04-11 15:30', lastRun: 'running', runningCount: 1, execCount: 150, debugPassed: true, inputs: [], versions: [] },
      { id: 22, name: '价格计算', code: 'FLT_PRICE_CALC', desc: '动态计算机票价格', type: 'app', allowRef: true, status: 'draft', version: 0, creator: '张三', owners: [103], folderId: null, wsId: 2, createdAt: '2025-03-20', editedAt: '2025-04-08 11:00', lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, inputs: [], versions: [] },
    ],
    3: [{ id: 30, name: '数据格式校验', code: 'DC_VALIDATE', desc: '校验上游数据格式', type: 'app', allowRef: true, status: 'published', version: 1, creator: 'Sukey Wu', owners: [101], folderId: null, wsId: 3, createdAt: '2025-02-25', editedAt: '2025-04-11 16:45', lastRun: 'success', runningCount: 0, execCount: 80, debugPassed: true, inputs: [], versions: [] }],
    4: [], 5: [], 6: [],
  })
  let wfNextId = 100

  // ============================================
  //   EXECUTIONS per workspace
  // ============================================
  const wsExecutions = ref({
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
      { id: 2003, wfId: 2, wfName: '酒店预订确认', wfCode: 'HTL_CONFIRM', version: 2, trigger: 'event', status: 'running', startTime: '2025-04-13 12:30:00', endTime: '-', duration: '1小时+', triggerUser: '系统', archived: false, nodes: [] },
      { id: 2004, wfId: 3, wfName: '订单取消处理', wfCode: 'HTL_CANCEL', version: 1, trigger: 'manual', status: 'failed', startTime: '2025-04-12 16:20:00', endTime: '2025-04-12 16:22:15', duration: '2分15秒', triggerUser: 'Sukey Wu', archived: false, nodes: [
        { name: '触发节点', type: '手动触发', status: 'success', duration: '0.1秒', startTime: '16:20:00' },
        { name: '订单查询', type: 'HTTP请求', status: 'success', duration: '1.5秒', startTime: '16:20:00' },
        { name: '取消请求', type: 'HTTP请求', status: 'failed', duration: '2分10秒', startTime: '16:20:02', error: '供应商API返回500错误' },
        { name: '通知客户', type: '消息通知', status: 'skipped', duration: '-', startTime: '-' },
      ] },
      { id: 2005, wfId: 1, wfName: '酒店搜索', wfCode: 'HTL_SEARCH', version: 3, trigger: 'scheduled', status: 'completed', startTime: '2025-04-12 08:00:00', endTime: '2025-04-12 08:01:45', duration: '1分45秒', triggerUser: '系统', archived: false, nodes: [] },
      { id: 2006, wfId: 5, wfName: '智能客服对话', wfCode: 'HTL_CHAT', version: 2, trigger: 'manual', status: 'running', startTime: '2025-04-13 10:00:00', endTime: '-', duration: '4小时+', triggerUser: '张三', archived: false, nodes: [] },
      { id: 2007, wfId: 6, wfName: '供应商价格同步', wfCode: 'SUPPLIER_PRICE', version: 2, trigger: 'scheduled', status: 'completed', startTime: '2025-04-11 02:00:00', endTime: '2025-04-11 02:15:30', duration: '15分30秒', triggerUser: '系统', archived: false, nodes: [] },
      { id: 2008, wfId: 7, wfName: '预订数据报表', wfCode: 'HTL_REPORT', version: 1, trigger: 'scheduled', status: 'paused', startTime: '2025-04-05 06:00:00', endTime: '-', duration: '8天+', triggerUser: '系统', archived: false, stale: true, nodes: [] },
    ],
    2: [{ id: 2100, wfId: 20, wfName: '航班信息拉取', wfCode: 'FLT_PULL', version: 4, trigger: 'scheduled', status: 'completed', startTime: '2025-04-12 06:00:00', endTime: '2025-04-12 06:10:00', duration: '10分', triggerUser: '系统', archived: false, nodes: [] }],
    3: [], 4: [], 5: [], 6: [],
  })

  // ============================================
  //   Toast system
  // ============================================
  const toasts = ref([])
  let toastId = 0
  function showToast(type, title, message) {
    const id = ++toastId
    toasts.value.push({ id, type, title, message })
    setTimeout(() => removeToast(id), 3000)
  }
  function removeToast(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  // ============================================
  //   Data Source CRUD helpers
  // ============================================
  function addDataSource(ds) {
    ds.id = nextDsId++
    dataSources.value.push(ds)
  }
  function updateDataSource(id, updates) {
    const ds = dataSources.value.find(d => d.id === id)
    if (ds) Object.assign(ds, updates)
  }
  function deleteDataSource(id) {
    dataSources.value = dataSources.value.filter(d => d.id !== id)
  }

  // ============================================
  //   Workspace CRUD helpers
  // ============================================
  function addWorkspace(ws) {
    ws.id = wsNextId++
    workspaces.value.push(ws)
    wsFolders.value[ws.id] = []
    wsWorkflows.value[ws.id] = []
    wsExecutions.value[ws.id] = []
    return ws
  }
  function updateWorkspace(id, updates) {
    const ws = workspaces.value.find(w => w.id === id)
    if (ws) Object.assign(ws, updates)
  }
  function deleteWorkspace(id) {
    workspaces.value = workspaces.value.filter(w => w.id !== id)
    delete wsFolders.value[id]
    delete wsWorkflows.value[id]
    delete wsExecutions.value[id]
  }

  // ============================================
  //   Folder helpers
  // ============================================
  function getFolders(wsId, parentId) {
    return (wsFolders.value[wsId] || []).filter(f => f.parentId === parentId)
  }
  function addFolder(wsId, folder) {
    folder.id = folderNextId++
    if (!wsFolders.value[wsId]) wsFolders.value[wsId] = []
    wsFolders.value[wsId].push(folder)
    return folder
  }
  function updateFolder(wsId, folderId, updates) {
    const f = (wsFolders.value[wsId] || []).find(x => x.id === folderId)
    if (f) Object.assign(f, updates)
  }
  function deleteFolder(wsId, folderId) {
    wsFolders.value[wsId] = (wsFolders.value[wsId] || []).filter(f => f.id !== folderId)
  }
  function getSubFolderCount(wsId, folderId) {
    return (wsFolders.value[wsId] || []).filter(f => f.parentId === folderId).length
  }
  function getSubWfCount(wsId, folderId) {
    return (wsWorkflows.value[wsId] || []).filter(wf => wf.folderId === folderId).length
  }
  function getFolderPath(wsId, folderId) {
    const folders = wsFolders.value[wsId] || []
    const parts = []
    let cur = folderId
    while (cur) { const f = folders.find(x => x.id === cur); if (!f) break; parts.unshift(f.name); cur = f.parentId; }
    return parts.join(' / ')
  }

  // ============================================
  //   Workflow CRUD helpers
  // ============================================
  function getWorkflows(wsId, folderId) {
    return (wsWorkflows.value[wsId] || []).filter(wf => wf.folderId === folderId)
  }
  function getAllWorkflows(wsId) {
    return wsWorkflows.value[wsId] || []
  }
  function addWorkflow(wsId, wf) {
    wf.id = wfNextId++
    if (!wsWorkflows.value[wsId]) wsWorkflows.value[wsId] = []
    wsWorkflows.value[wsId].push(wf)
    return wf
  }
  function deleteWorkflow(wsId, wfId) {
    wsWorkflows.value[wsId] = (wsWorkflows.value[wsId] || []).filter(x => x.id !== wfId)
    wsExecutions.value[wsId] = (wsExecutions.value[wsId] || []).filter(e => e.wfId !== wfId)
  }
  function findWorkflow(wsId, wfId) {
    return (wsWorkflows.value[wsId] || []).find(wf => wf.id === wfId)
  }

  // ============================================
  //   Execution helpers
  // ============================================
  function getExecutions(wsId) {
    return wsExecutions.value[wsId] || []
  }
  function addExecution(wsId, exec) {
    if (!wsExecutions.value[wsId]) wsExecutions.value[wsId] = []
    wsExecutions.value[wsId].unshift(exec)
  }
  function findExecution(wsId, execId) {
    return (wsExecutions.value[wsId] || []).find(e => e.id === execId)
  }

  // ============================================
  //   Utility
  // ============================================
  function getUserName(userId) {
    const u = ssoUsers.value.find(x => x.id === userId)
    return u ? u.name : ''
  }

  return {
    ssoUsers, dataSources, allSpaces, workspaces,
    wsFolders, wsWorkflows, wsExecutions, toasts,
    showToast, removeToast,
    addDataSource, updateDataSource, deleteDataSource,
    addWorkspace, updateWorkspace, deleteWorkspace,
    getFolders, addFolder, updateFolder, deleteFolder,
    getSubFolderCount, getSubWfCount, getFolderPath,
    getWorkflows, getAllWorkflows, addWorkflow, deleteWorkflow, findWorkflow,
    getExecutions, addExecution, findExecution,
    getUserName,
  }
})
