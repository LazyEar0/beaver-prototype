<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">数据源管理</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreate = true">新建数据源</v-btn>
    </div>

    <!-- Filter bar -->
    <v-card variant="outlined" class="mb-4">
      <div class="d-flex align-center ga-3 pa-3 flex-wrap">
        <v-text-field v-model="search" placeholder="搜索数据源名称..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width:280px" />
        <v-select v-model="authFilter" :items="authOptions" hide-details style="max-width:130px" density="compact" />
        <v-select v-model="refFilter" :items="refOptions" hide-details style="max-width:130px" density="compact" />
        <v-spacer />
        <span class="text-body-2 text-grey">共 <strong>{{ filtered.length }}</strong> 个数据源</span>
      </div>
    </v-card>

    <!-- Empty -->
    <div v-if="filtered.length === 0" class="empty-state">
      <img src="/images/empty-datasource.png" alt="empty" />
      <div class="empty-state-title">{{ hasFilters ? '未找到匹配数据源' : '暂无数据源' }}</div>
      <div class="empty-state-desc">{{ hasFilters ? '请调整搜索或筛选条件' : '创建数据源来管理您的配置数据' }}</div>
      <v-btn v-if="!hasFilters" color="primary" prepend-icon="mdi-plus" @click="showCreate = true">新建数据源</v-btn>
    </div>

    <!-- Data source table -->
    <v-card v-else variant="outlined">
      <v-table density="comfortable" hover>
        <thead>
          <tr>
            <th class="col-header" :class="{ 'sort-active': sortField === 'name' }" @click="toggleSort('name')">
              数据源名称 <v-icon v-if="sortField === 'name'" size="14">{{ sortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </th>
            <th>描述</th>
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
                <v-avatar size="32" color="#EEF2FF"><v-icon size="16" color="primary">mdi-database</v-icon></v-avatar>
                <span class="font-weight-medium">{{ ds.name }}</span>
              </div>
            </td>
            <td class="text-caption text-grey" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ ds.desc || '-' }}</td>
            <td class="text-body-2">{{ ds.creator }}</td>
            <td class="text-caption text-grey">{{ ds.createdAt }}</td>
            <td>
              <v-chip :color="ds.isPublic ? 'success' : 'grey'" size="x-small" variant="tonal" label>
                <v-icon start size="12">{{ ds.isPublic ? 'mdi-earth' : 'mdi-lock-outline' }}</v-icon>
                {{ ds.isPublic ? '公开' : '私有' }}
              </v-chip>
            </td>
            <td>
              <v-chip v-if="ds.referenced" color="primary" size="x-small" variant="tonal">被引用 {{ ds.referenceCount }}</v-chip>
              <span v-else class="text-caption text-grey">未引用</span>
            </td>
            <td>{{ ds.items.length }}</td>
            <td @click.stop>
              <v-btn icon variant="text" size="x-small" @click="$router.push(`/datasource/${ds.id}`)"><v-icon size="16">mdi-eye-outline</v-icon></v-btn>
              <v-btn icon variant="text" size="x-small" @click="editTarget = { ...ds }; showEdit = true"><v-icon size="16">mdi-pencil-outline</v-icon></v-btn>
              <v-btn icon variant="text" size="x-small" color="error" @click="deleteTarget = ds; showDelete = true"><v-icon size="16">mdi-delete-outline</v-icon></v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
      <div v-if="totalPages > 1" class="d-flex justify-center pa-3">
        <v-pagination v-model="page" :length="totalPages" rounded density="compact" />
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
            <div class="text-body-2">确定删除数据源「{{ deleteTarget.name }}」吗？{{ deleteTarget.referenced ? `当前有 ${deleteTarget.referenceCount} 个空间引用了该数据源，删除后相关工作流将无法正常运行。` : '此操作不可恢复。' }}</div>
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

const search = ref('')
const authFilter = ref('all')
const refFilter = ref('all')
const sortField = ref('createdAt')
const sortAsc = ref(false)
const page = ref(1)
const pageSize = 10

const authOptions = [
  { title: '全部可见范围', value: 'all' },
  { title: '公开', value: 'public' },
  { title: '私有', value: 'private' },
]
const refOptions = [
  { title: '全部引用', value: 'all' },
  { title: '已引用', value: 'yes' },
  { title: '未引用', value: 'no' },
]

const hasFilters = computed(() => search.value || authFilter.value !== 'all' || refFilter.value !== 'all')

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
  result.sort((a, b) => {
    const va = sortField.value === 'name' ? a.name : a.createdAt
    const vb = sortField.value === 'name' ? b.name : b.createdAt
    return sortAsc.value ? va.localeCompare(vb) : vb.localeCompare(va)
  })
  return result
})
const totalPages = computed(() => Math.ceil(filtered.value.length / pageSize))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
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
