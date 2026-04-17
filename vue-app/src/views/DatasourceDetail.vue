<template>
  <div v-if="ds">
    <!-- Compact Header -->
    <div class="compact-header">
      <div class="compact-header-top">
        <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" @click="$router.push('/datasource')">返回</v-btn>
        <span class="compact-header-title">{{ ds.name }}</span>
        <v-chip :color="ds.isPublic ? 'success' : 'grey'" size="x-small" variant="tonal" label>
          <v-icon start size="12">{{ ds.isPublic ? 'mdi-earth' : 'mdi-lock-outline' }}</v-icon>
          {{ ds.isPublic ? '公开' : '私有' }}
        </v-chip>
        <v-chip v-if="ds.referenced" color="primary" size="x-small" variant="tonal" class="ml-1">被引用 {{ ds.referenceCount }}</v-chip>
      </div>
      <div class="compact-header-meta">
        <span>{{ ds.desc || '暂无描述' }}</span>
        <span class="meta-sep">·</span><span>创建者: {{ ds.creator }}</span>
        <span class="meta-sep">·</span><span><v-icon size="12">mdi-calendar-outline</v-icon> {{ ds.createdAt }}</span>
        <span class="meta-sep">·</span><span>{{ ds.items.length }} 条目</span>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" density="compact" class="mb-4">
      <v-tab value="items"><v-icon start size="16">mdi-format-list-bulleted</v-icon>数据条目</v-tab>
      <v-tab value="auth"><v-icon start size="16">mdi-shield-lock-outline</v-icon>授权管理</v-tab>
      <v-tab value="sync"><v-icon start size="16">mdi-sync</v-icon>API 同步</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- ==================== ITEMS TAB ==================== -->
      <v-window-item value="items">
        <v-card variant="outlined" class="mb-3">
          <div class="d-flex align-center ga-3 pa-3">
            <v-text-field v-model="itemSearch" placeholder="搜索 Key 或 Value..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width:280px" />
            <v-select v-model="itemTypeFilter" :items="typeOptions" hide-details style="max-width:130px" density="compact" />
            <v-spacer />
            <span class="text-caption text-grey">共 <strong>{{ filteredItems.length }}</strong> 个条目</span>
            <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="showAddItem = true">添加条目</v-btn>
          </div>
        </v-card>

        <div v-if="filteredItems.length === 0" class="empty-state">
          <img src="/images/empty-dataitems.png" alt="empty" />
          <div class="empty-state-title">{{ itemSearch || itemTypeFilter !== 'all' ? '未找到匹配条目' : '暂无数据条目' }}</div>
          <div class="empty-state-desc">{{ itemSearch || itemTypeFilter !== 'all' ? '请调整搜索条件' : '添加数据条目到此数据源' }}</div>
        </div>

        <v-card v-else variant="outlined">
          <v-table density="comfortable" hover>
            <thead>
              <tr>
                <th class="col-header" :class="{ 'sort-active': itemSort === 'key' }" @click="toggleItemSort('key')">
                  Key <v-icon v-if="itemSort === 'key'" size="14">{{ itemSortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                </th>
                <th>Value</th>
                <th>类型</th>
                <th class="col-header" :class="{ 'sort-active': itemSort === 'updatedAt' }" @click="toggleItemSort('updatedAt')">
                  更新时间 <v-icon v-if="itemSort === 'updatedAt'" size="14">{{ itemSortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in pagedItems" :key="item.key">
                <td><code class="text-body-2" style="font-family:var(--font-mono)">{{ item.key }}</code></td>
                <td class="text-body-2">{{ item.value }}</td>
                <td><span class="wf-input-type-tag">{{ item.type }}</span></td>
                <td class="text-caption text-grey">{{ item.updatedAt }}</td>
                <td>
                  <v-btn icon variant="text" size="x-small" @click="editingItem = { ...item, originalKey: item.key }; showEditItem = true"><v-icon size="16">mdi-pencil-outline</v-icon></v-btn>
                  <v-btn icon variant="text" size="x-small" color="error" @click="deletingItemKey = item.key; showDeleteItem = true"><v-icon size="16">mdi-delete-outline</v-icon></v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="itemTotalPages > 1" class="d-flex justify-center pa-3">
            <v-pagination v-model="itemPage" :length="itemTotalPages" rounded density="compact" />
          </div>
        </v-card>
      </v-window-item>

      <!-- ==================== AUTH TAB ==================== -->
      <v-window-item value="auth">
        <v-card v-if="ds.isPublic" variant="outlined" class="pa-6 text-center">
          <v-icon size="48" color="success" class="mb-3">mdi-earth</v-icon>
          <h3 class="text-subtitle-1 font-weight-medium mb-1">公开数据源</h3>
          <p class="text-body-2 text-grey">该数据源为公开状态，所有空间均可引用，无需单独授权。</p>
          <v-btn variant="outlined" class="mt-3" @click="ds.isPublic = false; store.showToast('success','已切换','数据源已设为私有')">切换为私有</v-btn>
        </v-card>

        <template v-else>
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-caption text-grey">已授权 <strong>{{ ds.authorizedSpaces.length }}</strong> 个空间</span>
            <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="showAddAuth = true">添加授权</v-btn>
          </div>

          <div v-if="ds.authorizedSpaces.length === 0" class="empty-state">
            <img src="/images/empty-datasource.png" alt="empty" />
            <div class="empty-state-title">暂无授权空间</div>
            <div class="empty-state-desc">添加空间授权后，对应空间的工作流可引用此数据源</div>
          </div>

          <v-card v-else variant="outlined">
            <div v-for="(space, idx) in ds.authorizedSpaces" :key="idx" class="d-flex align-center pa-3" style="border-bottom:1px solid #F8FAFC">
              <v-avatar size="32" color="#EEF2FF"><v-icon size="16" color="primary">mdi-folder-outline</v-icon></v-avatar>
              <span class="ml-3 flex-grow-1 text-body-2 font-weight-medium">{{ space }}</span>
              <v-btn icon variant="text" size="x-small" color="error" @click="removeAuthSpace(space)">
                <v-icon size="16">mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card>
        </template>
      </v-window-item>

      <!-- ==================== SYNC TAB ==================== -->
      <v-window-item value="sync">
        <v-card variant="outlined" class="pa-4 mb-4">
          <h3 class="text-subtitle-2 font-weight-medium mb-3">API 同步配置</h3>
          <v-text-field v-model="ds.syncConfig.url" label="API 地址" placeholder="https://api.example.com/data" class="mb-2" :rules="[v => !v || /^https?:\/\/.+/i.test(v) || 'API 地址格式不正确']" />
          <div class="d-flex ga-3 mb-3">
            <v-text-field v-model="ds.syncConfig.keyField" label="Key 映射字段" placeholder="code" style="flex:1" />
            <v-text-field v-model="ds.syncConfig.valueField" label="Value 映射字段" placeholder="name" style="flex:1" />
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" size="small" @click="saveSyncConfig">保存配置</v-btn>
            <v-btn color="primary" size="small" prepend-icon="mdi-sync" @click="showSyncStrategy = true" :disabled="!ds.syncConfig.url">执行同步</v-btn>
          </div>
        </v-card>

        <!-- Sync logs -->
        <h3 class="text-subtitle-2 font-weight-medium mb-3">同步日志</h3>
        <div v-if="ds.syncLogs.length === 0" class="empty-state">
          <img src="/images/empty-sync-log.png" alt="empty" />
          <div class="empty-state-title">暂无同步记录</div>
          <div class="empty-state-desc">配置 API 并执行同步后将显示日志</div>
        </div>

        <v-card v-else variant="outlined">
          <v-table density="comfortable">
            <thead>
              <tr><th>时间</th><th>操作人</th><th>策略</th><th>结果</th><th>摘要</th></tr>
            </thead>
            <tbody>
              <tr v-for="(log, idx) in pagedSyncLogs" :key="idx">
                <td class="text-caption">{{ log.time }}</td>
                <td class="text-body-2">{{ log.operator }}</td>
                <td><v-chip size="x-small" :color="log.strategy === '全量覆盖' ? 'info' : 'success'" variant="tonal">{{ log.strategy }}</v-chip></td>
                <td>
                  <v-chip size="x-small" :color="log.result === 'success' ? 'success' : 'error'" variant="tonal">
                    {{ log.result === 'success' ? '成功' : '失败' }}
                  </v-chip>
                </td>
                <td class="text-caption">{{ log.result === 'success' ? log.summary : log.reason }}</td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="syncLogTotalPages > 1" class="d-flex justify-center pa-3">
            <v-pagination v-model="syncLogPage" :length="syncLogTotalPages" rounded density="compact" />
          </div>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- ==================== DIALOGS ==================== -->

    <!-- Add Item Dialog -->
    <v-dialog v-model="showAddItem" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">添加条目<v-btn icon variant="text" @click="showAddItem = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="newItem.key" label="Key *" class="mb-2" />
          <v-text-field v-model="newItem.value" label="Value *" class="mb-2" />
          <v-select v-model="newItem.type" :items="dataTypes" label="数据类型" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showAddItem = false">取消</v-btn><v-btn color="primary" @click="addItem">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Item Dialog -->
    <v-dialog v-model="showEditItem" max-width="460" persistent>
      <v-card v-if="editingItem">
        <v-card-title class="d-flex align-center justify-space-between">编辑条目<v-btn icon variant="text" @click="showEditItem = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="editingItem.key" label="Key *" class="mb-2" />
          <v-text-field v-model="editingItem.value" label="Value *" class="mb-2" />
          <v-select v-model="editingItem.type" :items="dataTypes" label="数据类型" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showEditItem = false">取消</v-btn><v-btn color="primary" @click="saveEditItem">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Item Dialog -->
    <v-dialog v-model="showDeleteItem" max-width="400" persistent>
      <v-card>
        <v-card-title>删除条目</v-card-title>
        <v-card-text>确定删除条目「{{ deletingItemKey }}」吗？此操作不可恢复。</v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showDeleteItem = false">取消</v-btn><v-btn color="error" @click="confirmDeleteItem">确认删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Auth Space Dialog -->
    <v-dialog v-model="showAddAuth" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">添加授权空间<v-btn icon variant="text" @click="showAddAuth = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">选择要授权的空间：</p>
          <div v-for="space in availableSpaces" :key="space" class="d-flex align-center pa-2 rounded-lg mb-1" style="cursor:pointer" :style="{ background: selectedSpaces.includes(space) ? '#EEF2FF' : '' }" @click="toggleSpace(space)">
            <v-avatar size="28" color="#EEF2FF"><v-icon size="14" color="primary">mdi-folder-outline</v-icon></v-avatar>
            <span class="ml-3 flex-grow-1 text-body-2">{{ space }}</span>
            <v-icon v-if="selectedSpaces.includes(space)" color="primary">mdi-check-circle</v-icon>
          </div>
          <div v-if="availableSpaces.length === 0" class="text-center text-grey pa-6">所有空间均已授权</div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <span class="text-caption text-grey">已选 {{ selectedSpaces.length }} 个</span>
          <v-spacer /><v-btn @click="showAddAuth = false">取消</v-btn><v-btn color="primary" :disabled="selectedSpaces.length === 0" @click="confirmAddAuth">确认授权</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Sync Strategy Dialog -->
    <v-dialog v-model="showSyncStrategy" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">选择同步策略<v-btn icon variant="text" @click="showSyncStrategy = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">请选择数据同步策略后执行</p>
          <div v-for="s in syncStrategies" :key="s.value" class="d-flex align-center pa-3 rounded-lg mb-2" style="cursor:pointer;border:2px solid transparent" :style="{ borderColor: syncStrategy === s.value ? '#4F46E5' : '#E5E7EB', background: syncStrategy === s.value ? '#EEF2FF' : '' }" @click="syncStrategy = s.value">
            <v-avatar size="36" :color="s.color"><v-icon size="18" color="white">{{ s.icon }}</v-icon></v-avatar>
            <div class="ml-3">
              <div class="text-body-2 font-weight-medium">{{ s.label }}</div>
              <div class="text-caption text-grey">{{ s.desc }}</div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showSyncStrategy = false">取消</v-btn><v-btn color="primary" :disabled="!syncStrategy" @click="executeSync">执行同步</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app'

const props = defineProps({ id: Number })
const store = useAppStore()

const ds = computed(() => store.dataSources.find(d => d.id === props.id))
const tab = ref('items')

// === ITEMS TAB ===
const itemSearch = ref('')
const itemTypeFilter = ref('all')
const itemSort = ref('updatedAt')
const itemSortAsc = ref(false)
const itemPage = ref(1)
const itemPageSize = 10
const dataTypes = ['String', 'Integer', 'Double', 'Boolean', 'DateTime']
const typeOptions = [
  { title: '全部类型', value: 'all' },
  ...dataTypes.map(t => ({ title: t, value: t })),
]

const filteredItems = computed(() => {
  if (!ds.value) return []
  let items = [...ds.value.items]
  if (itemSearch.value) {
    const q = itemSearch.value.toLowerCase()
    items = items.filter(i => i.key.toLowerCase().includes(q) || i.value.toLowerCase().includes(q))
  }
  if (itemTypeFilter.value !== 'all') items = items.filter(i => i.type === itemTypeFilter.value)
  items.sort((a, b) => {
    const va = itemSort.value === 'key' ? a.key : a.updatedAt
    const vb = itemSort.value === 'key' ? b.key : b.updatedAt
    return itemSortAsc.value ? va.localeCompare(vb) : vb.localeCompare(va)
  })
  return items
})
const itemTotalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / itemPageSize)))
const pagedItems = computed(() => {
  const start = (itemPage.value - 1) * itemPageSize
  return filteredItems.value.slice(start, start + itemPageSize)
})
function toggleItemSort(field) {
  if (itemSort.value === field) itemSortAsc.value = !itemSortAsc.value
  else { itemSort.value = field; itemSortAsc.value = true }
}

// Add item
const showAddItem = ref(false)
const newItem = ref({ key: '', value: '', type: 'String' })
function addItem() {
  if (!newItem.value.key?.trim() || !newItem.value.value?.trim()) { store.showToast('error', '请填写必填项', ''); return }
  if (ds.value.items.some(i => i.key === newItem.value.key.trim())) { store.showToast('error', 'Key 已存在', ''); return }
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  ds.value.items.push({ key: newItem.value.key.trim(), value: newItem.value.value.trim(), type: newItem.value.type, updatedAt: ts })
  showAddItem.value = false; newItem.value = { key: '', value: '', type: 'String' }
  store.showToast('success', '添加成功', '条目已添加')
}

// Edit item
const showEditItem = ref(false)
const editingItem = ref(null)
function saveEditItem() {
  if (!editingItem.value) return
  const item = ds.value.items.find(i => i.key === editingItem.value.originalKey)
  if (!item) return
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  item.key = editingItem.value.key.trim()
  item.value = editingItem.value.value.trim()
  item.type = editingItem.value.type
  item.updatedAt = ts
  showEditItem.value = false
  store.showToast('success', '保存成功', '条目已更新')
}

// Delete item
const showDeleteItem = ref(false)
const deletingItemKey = ref('')
function confirmDeleteItem() {
  ds.value.items = ds.value.items.filter(i => i.key !== deletingItemKey.value)
  showDeleteItem.value = false
  store.showToast('success', '删除成功', '条目已删除')
}

// === AUTH TAB ===
const showAddAuth = ref(false)
const selectedSpaces = ref([])
const availableSpaces = computed(() => {
  if (!ds.value) return []
  return store.allSpaces.filter(s => !ds.value.authorizedSpaces.includes(s))
})
function toggleSpace(space) {
  const idx = selectedSpaces.value.indexOf(space)
  if (idx > -1) selectedSpaces.value.splice(idx, 1)
  else selectedSpaces.value.push(space)
}
function confirmAddAuth() {
  selectedSpaces.value.forEach(s => {
    if (!ds.value.authorizedSpaces.includes(s)) ds.value.authorizedSpaces.push(s)
  })
  store.showToast('success', '授权成功', `已授权 ${selectedSpaces.value.length} 个空间`)
  selectedSpaces.value = []; showAddAuth.value = false
}
function removeAuthSpace(space) {
  ds.value.authorizedSpaces = ds.value.authorizedSpaces.filter(s => s !== space)
  store.showToast('success', '移除成功', '已撤销授权')
}

// === SYNC TAB ===
const syncLogPage = ref(1)
const syncLogPageSize = 10
const syncLogTotalPages = computed(() => Math.max(1, Math.ceil((ds.value?.syncLogs?.length || 0) / syncLogPageSize)))
const pagedSyncLogs = computed(() => {
  if (!ds.value) return []
  const start = (syncLogPage.value - 1) * syncLogPageSize
  return ds.value.syncLogs.slice(start, start + syncLogPageSize)
})

function saveSyncConfig() {
  store.showToast('success', '保存成功', 'API 同步配置已保存')
}

const showSyncStrategy = ref(false)
const syncStrategy = ref(null)
const syncStrategies = [
  { value: 'full', label: '全量覆盖', desc: '清空现有数据后完整替换为 API 返回结果', icon: 'mdi-sync', color: '#2563EB' },
  { value: 'incremental', label: '增量更新', desc: '仅新增和更新数据，不删除已有项', icon: 'mdi-plus', color: '#16A34A' },
]
function executeSync() {
  if (!syncStrategy.value) return
  const isSuccess = Math.random() > 0.3
  const strategyText = syncStrategy.value === 'full' ? '全量覆盖' : '增量更新'
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  ds.value.syncLogs.unshift({
    time: ts, operator: 'Sukey Wu', strategy: strategyText,
    result: isSuccess ? 'success' : 'error',
    summary: isSuccess ? `新增 ${Math.floor(Math.random() * 5)} 条、更新 ${Math.floor(Math.random() * 10)} 条${syncStrategy.value === 'full' ? `、删除 ${Math.floor(Math.random() * 3)} 条` : ''}` : '',
    reason: isSuccess ? '' : 'API 返回格式异常',
  })
  showSyncStrategy.value = false; syncStrategy.value = null
  store.showToast(isSuccess ? 'success' : 'error', isSuccess ? '同步成功' : '同步失败', '')
}

watch(() => showAddAuth.value, (v) => { if (v) selectedSpaces.value = [] })
watch(() => showSyncStrategy.value, (v) => { if (v) syncStrategy.value = null })
</script>
