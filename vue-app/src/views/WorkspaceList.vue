<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">空间管理</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreate = true">新建空间</v-btn>
    </div>

    <!-- Filter bar -->
    <v-card variant="outlined" class="mb-4">
      <div class="d-flex align-center ga-3 pa-3">
        <v-text-field v-model="search" placeholder="搜索空间名称或编号..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width:320px" />
        <v-chip-group v-model="roleFilter" mandatory>
          <v-chip v-for="r in roles" :key="r.value" :value="r.value" filter variant="tonal" color="primary">{{ r.label }}</v-chip>
        </v-chip-group>
        <v-spacer />
        <v-select v-model="sortField" :items="sortOptions" hide-details style="max-width:140px" density="compact" />
        <v-btn icon variant="text" size="small" @click="sortAsc = !sortAsc">
          <v-icon>{{ sortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
        </v-btn>
        <span class="text-body-2 text-grey">共 <strong>{{ filtered.length }}</strong> 个空间</span>
      </div>
    </v-card>

    <!-- Empty state -->
    <div v-if="filtered.length === 0" class="empty-state">
      <img src="/images/empty-workspace.png" alt="empty" />
      <div class="empty-state-title">{{ search || roleFilter !== 'all' ? '未找到匹配空间' : '暂无工作空间' }}</div>
      <div class="empty-state-desc">{{ search || roleFilter !== 'all' ? '请调整搜索或筛选条件' : '创建工作空间来组织工作流' }}</div>
      <v-btn v-if="!search && roleFilter === 'all'" color="primary" prepend-icon="mdi-plus" @click="showCreate = true">新建空间</v-btn>
    </div>

    <!-- Workspace grid -->
    <div v-else class="ws-card-grid">
      <v-card v-for="ws in paged" :key="ws.id" variant="outlined" hover @click="$router.push(`/workspace/${ws.id}`)" style="cursor:pointer">
        <v-card-text class="pa-4">
          <div class="d-flex align-center ga-3 mb-3">
            <v-avatar :color="cardColors[ws.id % cardColors.length].bg" size="40">
              <span :style="{ color: cardColors[ws.id % cardColors.length].color, fontWeight: 600 }">{{ ws.name.charAt(0) }}</span>
            </v-avatar>
            <div class="flex-grow-1" style="min-width:0">
              <div class="text-subtitle-2 font-weight-medium text-truncate">{{ ws.name }}</div>
              <div class="text-caption text-grey d-flex align-center ga-1"><v-icon size="12">mdi-pound</v-icon>{{ ws.code }}</div>
            </div>
            <v-btn v-if="ws.myRole === 'admin'" icon variant="text" size="x-small" @click.stop="editWs = ws; showEdit = true">
              <v-icon size="16">mdi-pencil-outline</v-icon>
            </v-btn>
          </div>
          <div class="text-body-2 text-grey-darken-1 mb-3" style="min-height:20px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">{{ ws.desc || '暂无描述' }}</div>
          <div class="d-flex align-center ga-4 mb-3">
            <span class="text-caption d-flex align-center ga-1"><v-icon size="14">mdi-account-group-outline</v-icon><strong>{{ ws.members.length }}</strong> 成员</span>
            <span class="text-caption d-flex align-center ga-1"><v-icon size="14">mdi-sitemap-outline</v-icon><strong>{{ ws.workflowCount }}</strong> 工作流</span>
            <span v-if="ws.runningInstances > 0" class="text-caption d-flex align-center ga-1" style="color:#16A34A"><v-icon size="14" color="success">mdi-sync</v-icon><strong>{{ ws.runningInstances }}</strong> 运行中</span>
          </div>
          <div class="d-flex align-center justify-space-between">
            <v-chip :color="roleColors[ws.myRole]" size="x-small" variant="tonal" label>
              <v-icon start size="12">mdi-shield-outline</v-icon>{{ roleLabels[ws.myRole] }}
            </v-chip>
            <span class="text-caption text-grey d-flex align-center ga-1"><v-icon size="12">mdi-clock-outline</v-icon>活跃于 {{ ws.lastActiveAt }}</span>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="d-flex justify-center mt-4">
      <v-pagination v-model="page" :length="totalPages" rounded density="compact" />
    </div>

    <!-- Create workspace dialog -->
    <v-dialog v-model="showCreate" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">新建空间<v-btn icon variant="text" @click="showCreate = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="空间名称" :rules="[v => !!v?.trim() || '请输入空间名称']" class="mb-2" />
          <v-text-field v-model="form.code" label="空间编号" hint="英文、数字、下划线、连字符" class="mb-2" />
          <v-textarea v-model="form.desc" label="空间描述" rows="2" counter="200" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showCreate = false">取消</v-btn><v-btn color="primary" @click="createWs">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit workspace dialog -->
    <v-dialog v-model="showEdit" max-width="500" persistent>
      <v-card v-if="editWs">
        <v-card-title class="d-flex align-center justify-space-between">编辑空间<v-btn icon variant="text" @click="showEdit = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="editWs.name" label="空间名称" class="mb-2" />
          <v-text-field :model-value="editWs.code" label="空间编号" disabled class="mb-2" />
          <v-textarea v-model="editWs.desc" label="空间描述" rows="2" counter="200" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showEdit = false">取消</v-btn><v-btn color="primary" @click="showEdit = false; store.showToast('success','保存成功','空间已更新')">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const search = ref('')
const roleFilter = ref('all')
const sortField = ref('lastActiveAt')
const sortAsc = ref(false)
const page = ref(1)
const pageSize = 12

const roles = [
  { value: 'all', label: '全部' },
  { value: 'admin', label: '我管理的' },
  { value: 'member', label: '我参与的' },
  { value: 'viewer', label: '仅查看' },
]
const sortOptions = [
  { title: '最近活跃', value: 'lastActiveAt' },
  { title: '创建时间', value: 'createdAt' },
]
const roleLabels = { admin: '管理员', member: '成员', viewer: '只读查看者' }
const roleColors = { admin: 'primary', member: 'success', viewer: 'grey' }
const cardColors = [
  { bg: '#EEF2FF', color: '#4F46E5' }, { bg: '#DCFCE7', color: '#16A34A' },
  { bg: '#F1F5F9', color: '#64748B' }, { bg: '#FEF3C7', color: '#D97706' },
  { bg: '#EDE9FE', color: '#8B5CF6' }, { bg: '#DBEAFE', color: '#2563EB' },
]

const filtered = computed(() => {
  let result = store.workspaces.filter(ws => {
    if (search.value) {
      const s = search.value.toLowerCase()
      if (!ws.name.toLowerCase().includes(s) && !ws.code.toLowerCase().includes(s)) return false
    }
    if (roleFilter.value !== 'all' && ws.myRole !== roleFilter.value) return false
    return true
  })
  result.sort((a, b) => {
    const va = sortField.value === 'lastActiveAt' ? a.lastActiveAt : a.createdAt
    const vb = sortField.value === 'lastActiveAt' ? b.lastActiveAt : b.createdAt
    return sortAsc.value ? va.localeCompare(vb) : vb.localeCompare(va)
  })
  return result
})
const totalPages = computed(() => Math.ceil(filtered.value.length / pageSize))
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

// Create
const showCreate = ref(false)
const form = ref({ name: '', code: '', desc: '' })
function createWs() {
  if (!form.value.name?.trim() || !form.value.code?.trim()) { store.showToast('error', '请填写必填项', ''); return }
  const now = new Date()
  const ts = now.toISOString().slice(0, 16).replace('T', ' ')
  const ws = store.addWorkspace({
    name: form.value.name.trim(), desc: form.value.desc.trim(), code: form.value.code.trim(),
    workflowCount: 0, myRole: 'admin', createdAt: now.toISOString().slice(0, 10), lastActiveAt: ts,
    runningInstances: 0, members: [{ userId: 101, name: 'Sukey Wu', avatar: 'S', role: 'admin', joinedAt: now.toISOString().slice(0, 10) }],
  })
  showCreate.value = false
  form.value = { name: '', code: '', desc: '' }
  store.showToast('success', '创建成功', `空间「${ws.name}」已创建`)
}

// Edit
const showEdit = ref(false)
const editWs = ref(null)
</script>
