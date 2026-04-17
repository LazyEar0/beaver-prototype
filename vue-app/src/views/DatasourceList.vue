<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">数据源管理</h1>
        <div class="page-subtitle">管理和维护工作流所使用的数据源配置</div>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreate = true">新建数据源</v-btn>
    </div>

    <!-- Filter Container (full restoration from original prototype) -->
    <div class="filter-container">
      <!-- Toolbar row -->
      <div class="filter-toolbar">
        <div class="filter-search" style="max-width:320px">
          <v-icon size="18" color="grey">mdi-magnify</v-icon>
          <input v-model="search" placeholder="搜索数据源名称或描述..." />
        </div>

        <!-- Filter toggle button -->
        <button class="filter-toggle-btn" :class="{ active: filterOpen }" @click="filterOpen = !filterOpen">
          <v-icon size="16">mdi-filter-variant</v-icon>
          筛选
          <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
        </button>

        <!-- Active filter tags (shown when panel is collapsed) -->
        <div v-if="hasFilters && !filterOpen" class="filter-tags">
          <span v-if="authFilter !== 'all'" class="filter-tag">
            可见范围: {{ authLabel[authFilter] }}
            <button class="filter-tag-close" @click="authFilter = 'all'">&times;</button>
          </span>
          <span v-if="refFilter !== 'all'" class="filter-tag">
            引用状态: {{ refLabel[refFilter] }}
            <button class="filter-tag-close" @click="refFilter = 'all'">&times;</button>
          </span>
          <span v-for="c in selectedCreators" :key="c" class="filter-tag">
            创建者: {{ c }}
            <button class="filter-tag-close" @click="removeCreator(c)">&times;</button>
          </span>
          <span v-if="dateFrom || dateTo" class="filter-tag">
            日期: {{ dateFrom || '...' }} ~ {{ dateTo || '...' }}
            <button class="filter-tag-close" @click="dateFrom = ''; dateTo = ''">&times;</button>
          </span>
        </div>

        <button v-if="hasFilters" class="filter-reset-btn" @click="resetFilters">
          <v-icon size="14">mdi-close</v-icon>
          清除筛选
        </button>

        <v-spacer />
        <span style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">共 <strong style="color:var(--md-on-surface)">{{ filtered.length }}</strong> 个数据源</span>
      </div>

      <!-- Collapsible filter panel -->
      <div class="filter-panel" :class="{ collapsed: !filterOpen }">
        <!-- Auth scope chips -->
        <div class="filter-group">
          <span class="filter-label">可见范围</span>
          <div class="filter-chips">
            <v-chip v-for="opt in authOptions" :key="opt.value" :variant="authFilter === opt.value ? 'flat' : 'outlined'" :color="authFilter === opt.value ? 'primary' : undefined" size="small" @click="authFilter = opt.value">{{ opt.title }}</v-chip>
          </div>
        </div>

        <!-- Reference chips -->
        <div class="filter-group">
          <span class="filter-label">引用状态</span>
          <div class="filter-chips">
            <v-chip v-for="opt in refOptions" :key="opt.value" :variant="refFilter === opt.value ? 'flat' : 'outlined'" :color="refFilter === opt.value ? 'primary' : undefined" size="small" @click="refFilter = opt.value">{{ opt.title }}</v-chip>
          </div>
        </div>

        <!-- Creator multi-select dropdown -->
        <div class="filter-group">
          <span class="filter-label">创建者</span>
          <div class="creator-dropdown" v-click-outside="closeCreatorDropdown">
            <div class="creator-dropdown-trigger" :class="{ open: creatorOpen }" @click="creatorOpen = !creatorOpen">
              <template v-if="selectedCreators.length === 0">全部</template>
              <div v-else class="creator-mini-tags">
                <span v-for="c in selectedCreators.slice(0, 2)" :key="c" class="creator-mini-tag">{{ c }}</span>
                <span v-if="selectedCreators.length > 2" class="creator-mini-tag-more">+{{ selectedCreators.length - 2 }}</span>
              </div>
            </div>
            <div v-if="creatorOpen" class="creator-dropdown-panel">
              <div class="creator-dropdown-search">
                <v-icon size="16" color="grey">mdi-magnify</v-icon>
                <input v-model="creatorSearch" placeholder="搜索创建者..." />
              </div>
              <div class="creator-dropdown-list">
                <div v-for="name in filteredCreators" :key="name" class="creator-dropdown-item" :class="{ selected: selectedCreators.includes(name) }" @click="toggleCreator(name)">
                  <div class="creator-avatar-sm">{{ name.charAt(0) }}</div>
                  <span>{{ name }}</span>
                  <v-icon v-if="selectedCreators.includes(name)" size="16" color="primary" class="ml-auto">mdi-check</v-icon>
                </div>
                <div v-if="filteredCreators.length === 0" class="creator-dropdown-empty">无匹配结果</div>
              </div>
              <div class="creator-dropdown-footer">
                <button v-if="selectedCreators.length > 0" class="creator-dropdown-clear" @click="selectedCreators = []">清除</button>
                <button class="creator-dropdown-done" @click="creatorOpen = false">确定</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Date range -->
        <div class="filter-group">
          <span class="filter-label">创建时间</span>
          <div class="filter-date-range">
            <input type="date" v-model="dateFrom" />
            <span class="date-sep">~</span>
            <input type="date" v-model="dateTo" />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="filtered.length === 0" class="empty-state">
      <img src="/images/empty-datasource.png" alt="empty" />
      <div class="empty-state-title">{{ hasFilters ? '未找到匹配数据源' : '暂无数据源' }}</div>
      <div class="empty-state-desc">{{ hasFilters ? '请调整搜索或筛选条件' : '创建数据源来管理您的配置数据' }}</div>
      <v-btn v-if="!hasFilters" color="primary" prepend-icon="mdi-plus" @click="showCreate = true">新建数据源</v-btn>
    </div>

    <!-- Data source table -->
    <v-card v-else variant="outlined" style="border-radius:var(--radius-md);overflow:hidden">
      <v-table density="comfortable" hover>
        <thead>
          <tr>
            <th class="col-header" :class="{ 'sort-active': sortField === 'name' }" @click="toggleSort('name')">
              数据源名称 <v-icon v-if="sortField === 'name'" size="14">{{ sortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th>创建者</th>
            <th class="col-header" :class="{ 'sort-active': sortField === 'createdAt' }" @click="toggleSort('createdAt')">
              创建时间 <v-icon v-if="sortField === 'createdAt'" size="14">{{ sortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th>可见范围</th>
            <th>被引用</th>
            <th>条目数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ds in paged" :key="ds.id" style="cursor:pointer" @click="$router.push(`/datasource/${ds.id}`)">
            <td>
              <div class="d-flex align-center ga-2">
                <v-avatar size="32" :style="{ background: 'var(--md-primary-container)' }"><v-icon size="16" color="primary">mdi-database</v-icon></v-avatar>
                <div>
                  <div class="table-name">{{ ds.name }}</div>
                  <div v-if="ds.desc" class="table-desc">{{ ds.desc }}</div>
                </div>
              </div>
            </td>
            <td style="font-size:var(--font-size-base)">{{ ds.creator }}</td>
            <td style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">{{ ds.createdAt }}</td>
            <td>
              <span class="badge" :class="ds.isPublic ? 'badge-public' : 'badge-private'">
                <v-icon size="12">{{ ds.isPublic ? 'mdi-earth' : 'mdi-lock-outline' }}</v-icon>
                {{ ds.isPublic ? '公开' : '私有' }}
              </span>
            </td>
            <td>
              <span v-if="ds.referenced" class="ref-count">
                <v-icon size="14" color="primary">mdi-link-variant</v-icon> {{ ds.referenceCount }}
              </span>
              <span v-else class="ref-none">未引用</span>
            </td>
            <td>{{ ds.items.length }}</td>
            <td @click.stop>
              <div class="d-flex ga-1">
                <v-btn icon variant="text" size="x-small" @click="$router.push(`/datasource/${ds.id}`)"><v-icon size="16">mdi-eye-outline</v-icon></v-btn>
                <v-btn icon variant="text" size="x-small" @click="editTarget = { ...ds }; showEdit = true"><v-icon size="16">mdi-pencil-outline</v-icon></v-btn>
                <v-btn icon variant="text" size="x-small" color="error" @click="deleteTarget = ds; showDelete = true"><v-icon size="16">mdi-delete-outline</v-icon></v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Pagination (MD3 style) -->
      <div v-if="totalPages > 1" class="d-flex align-center justify-space-between px-5 py-3" style="border-top:1px solid var(--md-outline-variant)">
        <div style="font-size:var(--font-size-sm);color:var(--md-on-surface-variant)">
          共 {{ filtered.length }} 条 · 第 {{ page }} / {{ totalPages }} 页
          <span class="ml-4">
            每页
            <select v-model.number="pageSize" style="height:28px;padding:0 20px 0 6px;border:1px solid var(--md-outline-variant);border-radius:var(--radius-sm);font-size:var(--font-size-sm);appearance:none;outline:none;cursor:pointer;background:var(--md-surface) url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2349454F%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E') no-repeat right 4px center">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
            条
          </span>
        </div>
        <v-pagination v-model="page" :length="totalPages" rounded density="compact" size="small" />
      </div>
    </v-card>

    <!-- Create Dialog -->
    <v-dialog v-model="showCreate" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">新建数据源<v-btn icon variant="text" @click="showCreate = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="数据源名称 *" class="mb-2" />
          <v-textarea v-model="form.desc" label="描述" rows="2" class="mb-2" />
          <v-switch v-model="form.isPublic" label="公开可见" color="primary" density="compact" hint="公开后所有空间均可引用" persistent-hint />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showCreate = false">取消</v-btn><v-btn color="primary" @click="createDs">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <v-dialog v-model="showEdit" max-width="500" persistent>
      <v-card v-if="editTarget">
        <v-card-title class="d-flex align-center justify-space-between">编辑数据源<v-btn icon variant="text" @click="showEdit = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="editTarget.name" label="数据源名称" class="mb-2" />
          <v-textarea v-model="editTarget.desc" label="描述" rows="2" class="mb-2" />
          <v-switch v-model="editTarget.isPublic" label="公开可见" color="primary" density="compact" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showEdit = false">取消</v-btn><v-btn color="primary" @click="saveEdit">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Dialog -->
    <v-dialog v-model="showDelete" max-width="400" persistent>
      <v-card v-if="deleteTarget">
        <v-card-title>删除数据源</v-card-title>
        <v-card-text>
          <div class="delete-warning mb-3">
            <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
            <div style="font-size:var(--font-size-base)">确定删除数据源「{{ deleteTarget.name }}」吗？{{ deleteTarget.referenced ? `当前有 ${deleteTarget.referenceCount} 个空间引用了该数据源，删除后相关工作流将无法正常运行。` : '此操作不可恢复。' }}</div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showDelete = false">取消</v-btn><v-btn color="error" @click="confirmDelete">确认删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const vClickOutside = {
  mounted(el, binding) {
    el.__clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value()
    }
    document.addEventListener('click', el.__clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el.__clickOutside)
  },
}

// Filters
const search = ref('')
const authFilter = ref('all')
const refFilter = ref('all')
const selectedCreators = ref([])
const creatorSearch = ref('')
const creatorOpen = ref(false)
const dateFrom = ref('')
const dateTo = ref('')
const filterOpen = ref(false)
const sortField = ref('createdAt')
const sortAsc = ref(false)
const page = ref(1)
const pageSize = ref(10)

const authOptions = [
  { title: '全部', value: 'all' },
  { title: '公开', value: 'public' },
  { title: '私有', value: 'private' },
]
const refOptions = [
  { title: '全部', value: 'all' },
  { title: '已引用', value: 'yes' },
  { title: '未引用', value: 'no' },
]
const authLabel = { all: '全部', public: '公开', private: '私有' }
const refLabel = { all: '全部', yes: '已引用', no: '未引用' }

// Creators extracted from data
const allCreators = computed(() => [...new Set(store.dataSources.map(ds => ds.creator))])
const filteredCreators = computed(() => {
  if (!creatorSearch.value) return allCreators.value
  const q = creatorSearch.value.toLowerCase()
  return allCreators.value.filter(c => c.toLowerCase().includes(q))
})

function toggleCreator(name) {
  const idx = selectedCreators.value.indexOf(name)
  if (idx > -1) selectedCreators.value.splice(idx, 1)
  else selectedCreators.value.push(name)
}
function removeCreator(name) {
  selectedCreators.value = selectedCreators.value.filter(c => c !== name)
}
function closeCreatorDropdown() { creatorOpen.value = false }

const hasFilters = computed(() =>
  search.value || authFilter.value !== 'all' || refFilter.value !== 'all' ||
  selectedCreators.value.length > 0 || dateFrom.value || dateTo.value
)
const activeFilterCount = computed(() =>
  (authFilter.value !== 'all' ? 1 : 0) +
  (refFilter.value !== 'all' ? 1 : 0) +
  (selectedCreators.value.length > 0 ? 1 : 0) +
  (dateFrom.value || dateTo.value ? 1 : 0)
)

function resetFilters() {
  search.value = ''; authFilter.value = 'all'; refFilter.value = 'all'
  selectedCreators.value = []; dateFrom.value = ''; dateTo.value = ''
  filterOpen.value = false; page.value = 1
}

const filtered = computed(() => {
  let result = [...store.dataSources]
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(ds => ds.name.toLowerCase().includes(s) || ds.desc?.toLowerCase().includes(s))
  }
  if (authFilter.value !== 'all') {
    result = result.filter(ds => authFilter.value === 'public' ? ds.isPublic : !ds.isPublic)
  }
  if (refFilter.value !== 'all') {
    result = result.filter(ds => refFilter.value === 'yes' ? ds.referenced : !ds.referenced)
  }
  if (selectedCreators.value.length > 0) {
    result = result.filter(ds => selectedCreators.value.includes(ds.creator))
  }
  if (dateFrom.value) {
    result = result.filter(ds => ds.createdAt >= dateFrom.value)
  }
  if (dateTo.value) {
    result = result.filter(ds => ds.createdAt <= dateTo.value)
  }
  result.sort((a, b) => {
    const va = sortField.value === 'name' ? a.name : a.createdAt
    const vb = sortField.value === 'name' ? b.name : b.createdAt
    return sortAsc.value ? va.localeCompare(vb) : vb.localeCompare(va)
  })
  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function toggleSort(field) {
  if (sortField.value === field) sortAsc.value = !sortAsc.value
  else { sortField.value = field; sortAsc.value = true }
}

// Create
const showCreate = ref(false)
const form = ref({ name: '', desc: '', isPublic: true })
function createDs() {
  if (!form.value.name?.trim()) { store.showToast('error', '请输入数据源名称', ''); return }
  store.addDataSource({
    name: form.value.name.trim(), desc: form.value.desc.trim(), isPublic: form.value.isPublic,
    createdAt: new Date().toISOString().slice(0, 10), creator: 'Sukey Wu',
    referenced: false, referenceCount: 0, items: [], authorizedSpaces: [],
    syncConfig: { url: '', keyField: '', valueField: '' }, syncLogs: [],
  })
  showCreate.value = false; form.value = { name: '', desc: '', isPublic: true }
  store.showToast('success', '创建成功', `数据源已创建`)
}

// Edit
const showEdit = ref(false)
const editTarget = ref(null)
function saveEdit() {
  if (!editTarget.value) return
  store.updateDataSource(editTarget.value.id, {
    name: editTarget.value.name, desc: editTarget.value.desc, isPublic: editTarget.value.isPublic,
  })
  showEdit.value = false; store.showToast('success', '保存成功', '数据源已更新')
}

// Delete
const showDelete = ref(false)
const deleteTarget = ref(null)
function confirmDelete() {
  if (!deleteTarget.value) return
  store.deleteDataSource(deleteTarget.value.id)
  showDelete.value = false; store.showToast('success', '删除成功', '数据源已删除')
}
</script>
