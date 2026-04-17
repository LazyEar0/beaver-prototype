<template>
  <div>
    <!-- Compact Header -->
    <div class="compact-header">
      <div class="compact-header-top">
        <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" @click="$router.push('/workspace')">返回</v-btn>
        <span class="compact-header-title">{{ ws?.name }}</span>
        <v-chip :color="roleColors[ws?.myRole]" size="x-small" variant="tonal" label>
          <v-icon start size="12">mdi-shield-outline</v-icon>{{ roleLabels[ws?.myRole] }}
        </v-chip>
      </div>
      <div class="compact-header-meta">
        <span><v-icon size="12">mdi-pound</v-icon> {{ ws?.code }}</span>
        <template v-if="ws?.desc"><span class="meta-sep">·</span><span>{{ ws.desc }}</span></template>
        <span class="meta-sep">·</span><span><v-icon size="12">mdi-calendar-outline</v-icon> {{ ws?.createdAt }}</span>
        <span class="meta-sep">·</span><span><v-icon size="12">mdi-clock-outline</v-icon> 活跃 {{ ws?.lastActiveAt }}</span>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" density="compact" class="mb-4">
      <v-tab value="workflows"><v-icon start size="16">mdi-sitemap-outline</v-icon>工作流</v-tab>
      <v-tab value="executions"><v-icon start size="16">mdi-clock-outline</v-icon>执行记录</v-tab>
      <v-tab v-if="isAdmin" value="settings"><v-icon start size="16">mdi-cog-outline</v-icon>空间设置</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- ==================== WORKFLOWS TAB ==================== -->
      <v-window-item value="workflows">
        <!-- Folder breadcrumb -->
        <div v-if="folderPath.length > 0" class="d-flex align-center ga-2 mb-3">
          <v-btn icon variant="text" size="x-small" @click="navigateUp"><v-icon>mdi-arrow-left</v-icon></v-btn>
          <v-breadcrumbs :items="folderBreadcrumbs" density="compact" class="pa-0">
            <template #divider><v-icon size="14">mdi-chevron-right</v-icon></template>
            <template #item="{ item }">
              <span style="cursor:pointer;font-size:13px" :style="{ fontWeight: item.disabled ? 600 : 400 }" @click="item.onClick?.()">{{ item.title }}</span>
            </template>
          </v-breadcrumbs>
        </div>

        <!-- Filter toolbar -->
        <v-card variant="outlined" class="mb-3">
          <div class="d-flex align-center ga-2 pa-3 flex-wrap">
            <v-text-field v-model="wfSearch" placeholder="搜索名称或编号..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width:280px" />
            <v-btn :variant="wfFilterOpen ? 'tonal' : 'outlined'" color="primary" size="small" prepend-icon="mdi-filter-variant" @click="wfFilterOpen = !wfFilterOpen">
              筛选<v-badge v-if="wfActiveFilterCount > 0" :content="wfActiveFilterCount" color="error" floating />
            </v-btn>
            <template v-if="wfHasFilters && !wfFilterOpen">
              <v-chip v-if="wfStatusFilter !== 'all'" closable size="small" @click:close="wfStatusFilter = 'all'">状态：{{ statusLabel[wfStatusFilter] }}</v-chip>
              <v-chip v-if="wfTypeFilter !== 'all'" closable size="small" @click:close="wfTypeFilter = 'all'">类型：{{ typeLabel[wfTypeFilter] }}</v-chip>
            </template>
            <v-btn v-if="wfHasFilters" variant="text" size="small" prepend-icon="mdi-close" @click="clearWfFilters">清除</v-btn>
            <v-spacer />
            <v-btn v-if="isMember" color="primary" size="small" prepend-icon="mdi-plus" @click="showCreateWf = true">新建工作流</v-btn>
            <v-btn v-if="canCreateFolder" variant="outlined" size="small" prepend-icon="mdi-folder-plus-outline" @click="showCreateFolder = true">新建文件夹</v-btn>
          </div>
          <!-- Filter panel -->
          <v-expand-transition>
            <div v-if="wfFilterOpen" class="px-3 pb-3">
              <v-divider class="mb-3" />
              <div class="d-flex ga-4 flex-wrap">
                <div>
                  <div class="text-caption text-grey mb-1">状态</div>
                  <v-chip-group v-model="wfStatusFilter" mandatory>
                    <v-chip v-for="s in statusOptions" :key="s.value" :value="s.value" filter variant="tonal" size="small">{{ s.label }}</v-chip>
                  </v-chip-group>
                </div>
                <div>
                  <div class="text-caption text-grey mb-1">类型</div>
                  <v-chip-group v-model="wfTypeFilter" mandatory>
                    <v-chip value="all" filter variant="tonal" size="small">全部</v-chip>
                    <v-chip value="app" filter variant="tonal" size="small">应用流</v-chip>
                    <v-chip value="chat" filter variant="tonal" size="small">对话流</v-chip>
                  </v-chip-group>
                </div>
              </div>
            </div>
          </v-expand-transition>
        </v-card>

        <!-- Empty state -->
        <div v-if="wfIsEmpty" class="empty-state">
          <img src="/images/empty-folder-content.png" alt="empty" />
          <div class="empty-state-title">{{ wfSearch ? '未找到匹配结果' : (currentFolderId !== null ? '该文件夹为空' : '暂无内容') }}</div>
          <div class="empty-state-desc">{{ wfSearch ? '请调整搜索或筛选条件' : '创建工作流或文件夹来组织您的空间' }}</div>
        </div>

        <!-- Content list -->
        <v-card v-else variant="outlined">
          <!-- Header -->
          <div class="content-list-header">
            <span class="col-header" :class="{ 'sort-active': wfSortField === 'name' }" style="flex:2.5" @click="toggleWfSort('name')">
              名称 <v-icon v-if="wfSortField === 'name'" size="14">{{ wfSortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </span>
            <span style="flex:0.7">状态</span>
            <span style="flex:0.6">版本</span>
            <span style="flex:0.6">类型</span>
            <span style="flex:0.8">创建者</span>
            <span style="flex:0.8">负责人</span>
            <span class="col-header" :class="{ 'sort-active': wfSortField === 'editedAt' }" style="flex:0.9" @click="toggleWfSort('editedAt')">
              最后编辑 <v-icon v-if="wfSortField === 'editedAt'" size="14">{{ wfSortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
            </span>
            <span style="width:110px">操作</span>
          </div>
          <!-- Folders -->
          <template v-if="!isSearchMode">
            <div v-for="f in sortedFolders" :key="'f-' + f.id" class="content-list-item" @dblclick="navigateIntoFolder(f)">
              <div class="content-item-main" style="flex:2.5">
                <div class="content-item-icon folder-icon"><v-icon>mdi-folder</v-icon></div>
                <div>
                  <div class="content-item-name" style="cursor:pointer" @click="navigateIntoFolder(f)">{{ f.name }}</div>
                  <div class="content-item-desc">{{ store.getSubWfCount(ws.id, f.id) }} 个工作流{{ store.getSubFolderCount(ws.id, f.id) > 0 ? `，${store.getSubFolderCount(ws.id, f.id)} 个子文件夹` : '' }}</div>
                </div>
              </div>
              <div style="flex:0.7"><span class="badge-type"><v-icon size="12">mdi-folder</v-icon> 文件夹</span></div>
              <div style="flex:0.6"></div>
              <div style="flex:0.6"></div>
              <div style="flex:0.8" class="text-caption text-grey">{{ f.creator }}</div>
              <div style="flex:0.8"></div>
              <div style="flex:0.9" class="text-caption text-grey">{{ f.editedAt }}</div>
              <div style="width:110px">
                <v-btn v-if="isMember" icon variant="text" size="x-small" @click.stop="editingFolder = { ...f }; showEditFolder = true"><v-icon size="16">mdi-pencil-outline</v-icon></v-btn>
              </div>
            </div>
          </template>
          <!-- Workflows -->
          <div v-for="wf in sortedWorkflows" :key="'wf-' + wf.id" class="content-list-item">
            <div class="content-item-main" style="flex:2.5">
              <div class="content-item-icon wf-icon"><v-icon>mdi-sitemap</v-icon></div>
              <div>
                <div class="content-item-name" style="cursor:pointer;color:#4F46E5" @click="store.showToast('info','流程设计器','将在 Phase 2 中实现')">
                  {{ wf.name }}
                  <span v-if="isSearchMode" style="font-size:11px;color:#9CA3AF;margin-left:8px">{{ store.getFolderPath(ws.id, wf.folderId) || '根目录' }}</span>
                </div>
                <div class="content-item-desc"><v-icon size="10">mdi-pound</v-icon> {{ wf.code }}{{ wf.desc ? ` · ${wf.desc}` : '' }}</div>
              </div>
            </div>
            <div style="flex:0.7"><span class="status-badge" :class="statusClass[wf.status]">{{ statusLabel[wf.status] }}</span></div>
            <div style="flex:0.6">
              <span v-if="wf.version > 0" class="version-badge">v{{ wf.version }}</span>
              <span v-else class="text-caption text-grey">-</span>
            </div>
            <div style="flex:0.6"><span class="badge-type">{{ typeLabel[wf.type] }}</span></div>
            <div style="flex:0.8" class="text-caption text-grey">{{ wf.creator }}</div>
            <div style="flex:0.8" class="text-caption text-grey">{{ wfOwnerNames(wf) }}</div>
            <div style="flex:0.9" class="text-caption text-grey">{{ wf.editedAt }}</div>
            <div style="width:110px" class="d-flex ga-1">
              <v-btn icon variant="text" size="x-small" :title="isMember ? '编辑流程' : '查看流程'" @click="store.showToast('info','流程设计器','将在 Phase 2 中实现')">
                <v-icon size="16" :color="isMember ? 'primary' : undefined">{{ isMember ? 'mdi-pencil-outline' : 'mdi-eye-outline' }}</v-icon>
              </v-btn>
              <v-btn v-if="wf.status === 'published'" icon variant="text" size="x-small" title="执行" @click="executeWf(wf)">
                <v-icon size="16" color="success">mdi-play</v-icon>
              </v-btn>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon variant="text" size="x-small"><v-icon size="16">mdi-dots-vertical</v-icon></v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item v-if="isMember" prepend-icon="mdi-content-copy" title="复制" @click="copyWf(wf)" />
                  <v-list-item v-if="isMember" prepend-icon="mdi-folder-move-outline" title="移动" @click="moveTarget = wf; showMoveWf = true" />
                  <v-divider v-if="isAdmin" />
                  <v-list-item v-if="isAdmin" prepend-icon="mdi-delete-outline" title="删除" base-color="error" @click="deleteTarget = wf; showDeleteWf = true" />
                </v-list>
              </v-menu>
            </div>
          </div>
        </v-card>
      </v-window-item>

      <!-- ==================== EXECUTIONS TAB ==================== -->
      <v-window-item value="executions">
        <!-- Exec detail view -->
        <template v-if="execDetailId !== null">
          <div class="mb-4">
            <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" @click="execDetailId = null">返回执行记录列表</v-btn>
          </div>
          <template v-if="execDetail">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center ga-3">
                <h2 class="text-h6">执行详情 #{{ execDetail.id }}</h2>
                <span class="exec-status" :class="execStatusClass[execDetail.status]">{{ execStatusLabel[execDetail.status] }}</span>
                <span v-if="execDetail.stale" class="stale-mark">异常滞留</span>
              </div>
              <div class="d-flex ga-2">
                <v-btn v-if="execDetail.status === 'running' && isMember" variant="outlined" size="small" prepend-icon="mdi-pause" @click="execDetail.status = 'paused'; store.showToast('success','暂停成功','')">暂停</v-btn>
                <v-btn v-if="execDetail.status === 'paused' && isMember" color="primary" size="small" prepend-icon="mdi-play" @click="execDetail.status = 'running'; store.showToast('success','已恢复','')">恢复</v-btn>
                <v-btn v-if="['running','paused'].includes(execDetail.status) && isMember" color="error" size="small" prepend-icon="mdi-stop" @click="execDetail.status = 'cancelled'; store.showToast('success','已取消','')">取消</v-btn>
                <v-btn v-if="['completed','failed','cancelled'].includes(execDetail.status) && isMember" color="primary" size="small" prepend-icon="mdi-refresh" @click="store.showToast('success','重新执行','已创建新实例')">重新执行</v-btn>
              </div>
            </div>
            <v-card variant="outlined" class="pa-4 mb-4">
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">
                <div><div class="text-caption text-grey">工作流</div><div class="font-weight-medium">{{ execDetail.wfName }}</div></div>
                <div><div class="text-caption text-grey">版本</div><span class="version-badge">v{{ execDetail.version }}</span></div>
                <div><div class="text-caption text-grey">触发方式</div>{{ execTriggerLabel[execDetail.trigger] }}</div>
                <div><div class="text-caption text-grey">触发人</div>{{ execDetail.triggerUser }}</div>
                <div><div class="text-caption text-grey">开始时间</div>{{ execDetail.startTime }}</div>
                <div><div class="text-caption text-grey">结束时间</div>{{ execDetail.endTime }}</div>
                <div><div class="text-caption text-grey">执行时长</div>{{ execDetail.duration }}</div>
              </div>
            </v-card>
            <template v-if="execDetail.nodes?.length">
              <h3 class="text-subtitle-1 font-weight-medium mb-3">节点执行时间线</h3>
              <div class="node-timeline">
                <div v-for="(node, i) in execDetail.nodes" :key="i" class="node-item">
                  <div class="node-dot" :class="node.status"></div>
                  <div style="flex:1">
                    <div class="d-flex align-center ga-3">
                      <span class="font-weight-medium text-body-2">{{ node.name }}</span>
                      <span class="badge-type" style="font-size:10px">{{ node.type }}</span>
                      <span class="exec-status" :class="execStatusClass[node.status]" style="font-size:11px">{{ execStatusLabel[node.status] || node.status }}</span>
                    </div>
                    <div class="d-flex ga-4 mt-1 text-caption text-grey">
                      <span>开始: {{ node.startTime }}</span><span>耗时: {{ node.duration }}</span>
                    </div>
                    <div v-if="node.error" style="margin-top:4px;padding:6px 8px;background:rgba(220,38,38,0.05);border-radius:8px;font-size:12px;color:#DC2626">{{ node.error }}</div>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </template>

        <!-- Exec list view -->
        <template v-else>
          <v-card variant="outlined" class="mb-3">
            <div class="d-flex align-center ga-2 pa-3 flex-wrap">
              <v-text-field v-model="execSearch" placeholder="搜索工作流名称或实例ID..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width:300px" />
              <v-select v-model="execStatusFilter" :items="execStatusOptions" hide-details style="max-width:140px" density="compact" />
              <v-select v-model="execTriggerFilter" :items="execTriggerOptions" hide-details style="max-width:140px" density="compact" />
              <v-select v-model="execTimeRange" :items="execTimeOptions" hide-details style="max-width:140px" density="compact" />
              <v-spacer />
              <span class="text-caption text-grey">共 <strong>{{ filteredExecs.length }}</strong> 条</span>
            </div>
          </v-card>

          <div v-if="filteredExecs.length === 0" class="empty-state">
            <img src="/images/empty-executions.png" alt="empty" />
            <div class="empty-state-title">{{ execSearch ? '未找到匹配记录' : '暂无执行记录' }}</div>
            <div class="empty-state-desc">{{ execSearch ? '请调整搜索条件' : '执行工作流后将在此显示记录' }}</div>
          </div>

          <v-card v-else variant="outlined">
            <v-table density="comfortable" hover>
              <thead>
                <tr>
                  <th>实例ID</th><th>工作流</th><th>版本</th><th>触发方式</th><th>状态</th>
                  <th>开始时间</th><th>结束时间</th><th>耗时</th><th>触发人</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in pagedExecs" :key="e.id" :style="e.stale ? 'background:rgba(234,179,8,0.05)' : ''">
                  <td><code class="text-caption">#{{ e.id }}</code></td>
                  <td class="font-weight-medium">{{ e.wfName }}</td>
                  <td><span class="version-badge">v{{ e.version }}</span></td>
                  <td>{{ execTriggerLabel[e.trigger] }}</td>
                  <td>
                    <span class="exec-status" :class="execStatusClass[e.status]">{{ execStatusLabel[e.status] }}</span>
                    <span v-if="e.stale" class="stale-mark">异常滞留</span>
                  </td>
                  <td class="text-caption">{{ e.startTime }}</td>
                  <td class="text-caption">{{ e.endTime }}</td>
                  <td>{{ e.duration }}</td>
                  <td>{{ e.triggerUser }}</td>
                  <td>
                    <v-btn icon variant="text" size="x-small" title="查看详情" @click="execDetailId = e.id"><v-icon size="16">mdi-eye-outline</v-icon></v-btn>
                    <v-btn v-if="['running','paused'].includes(e.status) && isMember" icon variant="text" size="x-small" title="取消" @click="e.status = 'cancelled'; store.showToast('success','已取消','')"><v-icon size="16" color="error">mdi-stop</v-icon></v-btn>
                    <v-btn v-if="['completed','failed','cancelled'].includes(e.status) && isMember" icon variant="text" size="x-small" title="重新执行" @click="store.showToast('success','重新执行','已创建新实例')"><v-icon size="16">mdi-refresh</v-icon></v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-if="execTotalPages > 1" class="d-flex justify-center pa-3">
              <v-pagination v-model="execPage" :length="execTotalPages" rounded density="compact" />
            </div>
          </v-card>
        </template>
      </v-window-item>

      <!-- ==================== SETTINGS TAB ==================== -->
      <v-window-item v-if="isAdmin" value="settings">
        <div class="d-flex justify-space-between align-center mb-4">
          <h3 class="text-subtitle-1 font-weight-medium">空间设置</h3>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" size="small" prepend-icon="mdi-pencil-outline" @click="editWsForm = { name: ws.name, desc: ws.desc }; showEditWs = true">编辑信息</v-btn>
            <v-btn color="error" variant="outlined" size="small" prepend-icon="mdi-delete-outline" @click="showDeleteWs = true">删除空间</v-btn>
          </div>
        </div>

        <h3 class="text-subtitle-1 font-weight-medium mb-3">成员管理</h3>
        <v-tabs v-model="memberTab" density="compact" class="mb-3">
          <v-tab value="admin"><v-icon start size="16">mdi-shield-outline</v-icon>管理员 <v-badge :content="wsAdmins.length" inline /></v-tab>
          <v-tab value="member"><v-icon start size="16">mdi-account-outline</v-icon>成员 <v-badge :content="wsMembers.length" inline /></v-tab>
          <v-tab value="viewer"><v-icon start size="16">mdi-eye-outline</v-icon>只读 <v-badge :content="wsViewers.length" inline /></v-tab>
        </v-tabs>

        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-caption text-grey">共 <strong>{{ currentRoleMembers.length }}</strong> 位{{ roleLabels[memberTab] }}</span>
          <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="showAddMember = true">添加{{ roleLabels[memberTab] }}</v-btn>
        </div>

        <div v-if="currentRoleMembers.length === 0" class="empty-state">
          <img src="/images/empty-members.png" alt="empty" />
          <div class="empty-state-title">暂无{{ roleLabels[memberTab] }}</div>
          <div class="empty-state-desc">当前角色分组暂无成员</div>
        </div>

        <v-card v-else variant="outlined">
          <div v-for="m in currentRoleMembers" :key="m.userId" class="d-flex align-center pa-3" style="border-bottom:1px solid #F8FAFC">
            <div class="member-avatar" :class="'avatar-' + m.role">{{ m.avatar }}</div>
            <div class="ml-3 flex-grow-1">
              <div class="text-body-2 font-weight-medium">{{ m.name }}</div>
              <div class="text-caption text-grey">加入于 {{ m.joinedAt }}</div>
            </div>
            <v-select v-model="m.role" :items="memberRoleOptions" hide-details density="compact" style="max-width:120px" class="mr-2" @update:model-value="(v) => onRoleChange(m, v)" />
            <v-btn icon variant="text" size="x-small" color="error" @click="removingMember = m; showRemoveMember = true"><v-icon size="16">mdi-account-remove-outline</v-icon></v-btn>
          </div>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- ==================== DIALOGS ==================== -->

    <!-- Create Workflow Dialog -->
    <v-dialog v-model="showCreateWf" max-width="520" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">新建工作流<v-btn icon variant="text" @click="showCreateWf = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="wfForm.name" label="工作流名称 *" class="mb-2" />
          <v-text-field v-model="wfForm.code" label="工作流编号 *" hint="英文、数字、下划线、连字符" class="mb-2" />
          <div class="d-flex ga-3 mb-2">
            <v-select v-model="wfForm.type" :items="[{title:'应用流',value:'app'},{title:'对话流',value:'chat'}]" label="类型" style="flex:1" />
            <v-select v-model="wfForm.ownerId" :items="ownerOptions" label="负责人" style="flex:1" />
          </div>
          <v-textarea v-model="wfForm.desc" label="描述" rows="2" />
          <v-checkbox v-model="wfForm.allowRef" label="允许被引用（开启后可作为子流程被其他工作流引用）" density="compact" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showCreateWf = false">取消</v-btn><v-btn color="primary" @click="createWf">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create Folder Dialog -->
    <v-dialog v-model="showCreateFolder" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">新建文件夹<v-btn icon variant="text" @click="showCreateFolder = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="folderForm.name" label="文件夹名称 *" class="mb-2" />
          <v-textarea v-model="folderForm.desc" label="描述" rows="2" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showCreateFolder = false">取消</v-btn><v-btn color="primary" @click="createFolder">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Folder Dialog -->
    <v-dialog v-model="showEditFolder" max-width="460" persistent>
      <v-card v-if="editingFolder">
        <v-card-title class="d-flex align-center justify-space-between">编辑文件夹<v-btn icon variant="text" @click="showEditFolder = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="editingFolder.name" label="文件夹名称 *" class="mb-2" />
          <v-textarea v-model="editingFolder.desc" label="描述" rows="2" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showEditFolder = false">取消</v-btn><v-btn color="primary" @click="updateFolder">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Workflow Dialog -->
    <v-dialog v-model="showDeleteWf" max-width="460" persistent>
      <v-card v-if="deleteTarget">
        <v-card-title class="d-flex align-center justify-space-between">删除工作流<v-btn icon variant="text" @click="showDeleteWf = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <div class="delete-warning mb-3">
            <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
            <div class="text-body-2">删除后，该工作流的所有版本和 {{ deleteTarget.execCount }} 条执行记录将被一并删除，此操作不可恢复。</div>
          </div>
          <v-text-field v-model="deleteConfirmCode" :label="`请输入工作流编号以确认删除：${deleteTarget.code}`" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showDeleteWf = false">取消</v-btn><v-btn color="error" :disabled="deleteConfirmCode !== deleteTarget.code" @click="confirmDeleteWf">确认删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Move Workflow Dialog -->
    <v-dialog v-model="showMoveWf" max-width="460">
      <v-card v-if="moveTarget">
        <v-card-title class="d-flex align-center justify-space-between">移动工作流<v-btn icon variant="text" @click="showMoveWf = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">将「{{ moveTarget.name }}」移动到：</p>
          <div class="folder-tree-node" :class="{ 'is-current': moveTarget.folderId === null }" @click="doMoveWf(null)">
            <v-icon size="18">mdi-folder</v-icon>
            <span>{{ ws.name }}（根目录）</span>
            <v-chip v-if="moveTarget.folderId === null" size="x-small" variant="tonal" color="primary" class="ml-2">当前位置</v-chip>
          </div>
          <div v-for="f in allFolders" :key="f.id" class="folder-tree-node" :class="{ 'is-current': moveTarget.folderId === f.id }" @click="doMoveWf(f.id)">
            <v-icon size="18">mdi-folder</v-icon>
            <span>{{ f.name }}</span>
            <v-chip v-if="moveTarget.folderId === f.id" size="x-small" variant="tonal" color="primary" class="ml-2">当前位置</v-chip>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Edit Workspace Dialog -->
    <v-dialog v-model="showEditWs" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">编辑空间<v-btn icon variant="text" @click="showEditWs = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="editWsForm.name" label="空间名称" class="mb-2" />
          <v-text-field :model-value="ws?.code" label="空间编号" disabled class="mb-2" />
          <v-textarea v-model="editWsForm.desc" label="空间描述" rows="2" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showEditWs = false">取消</v-btn><v-btn color="primary" @click="saveWsEdit">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Workspace Dialog -->
    <v-dialog v-model="showDeleteWs" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">删除空间<v-btn icon variant="text" @click="showDeleteWs = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <div class="delete-warning mb-3">
            <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
            <div class="text-body-2">删除空间后，所有工作流和执行记录将被一并删除，不可恢复。</div>
          </div>
          <v-text-field v-model="deleteWsConfirm" :label="`请输入空间名称以确认删除：${ws?.name}`" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showDeleteWs = false">取消</v-btn><v-btn color="error" :disabled="deleteWsConfirm !== ws?.name" @click="confirmDeleteWs">确认删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Member Dialog -->
    <v-dialog v-model="showAddMember" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">添加{{ roleLabels[memberTab] }}<v-btn icon variant="text" @click="showAddMember = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="memberSearch" placeholder="搜索用户名或部门..." prepend-inner-icon="mdi-magnify" hide-details class="mb-3" />
          <div style="max-height:300px;overflow-y:auto">
            <div v-for="u in availableUsers" :key="u.id" class="d-flex align-center pa-2" style="cursor:pointer;border-radius:8px" :style="{ background: selectedNewMembers.includes(u.id) ? '#EEF2FF' : '' }" @click="toggleNewMember(u.id)">
              <div class="member-avatar" :class="'avatar-' + memberTab">{{ u.avatar }}</div>
              <div class="ml-3 flex-grow-1">
                <div class="text-body-2">{{ u.name }}</div>
                <div class="text-caption text-grey">{{ u.dept }}</div>
              </div>
              <v-icon v-if="selectedNewMembers.includes(u.id)" color="primary">mdi-check-circle</v-icon>
            </div>
            <div v-if="availableUsers.length === 0" class="text-center text-grey pa-6">暂无可添加的用户</div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <span class="text-caption text-grey">已选 {{ selectedNewMembers.length }} 人</span>
          <v-spacer /><v-btn @click="showAddMember = false">取消</v-btn><v-btn color="primary" :disabled="selectedNewMembers.length === 0" @click="confirmAddMembers">确认添加</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Member Dialog -->
    <v-dialog v-model="showRemoveMember" max-width="400" persistent>
      <v-card v-if="removingMember">
        <v-card-title>移除成员</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">确定移除该成员吗？移除后该用户将无法访问此空间。</p>
          <div class="d-flex align-center ga-3 pa-3 rounded-lg" style="background:#F8FAFC">
            <div class="member-avatar" :class="'avatar-' + removingMember.role">{{ removingMember.avatar }}</div>
            <span class="text-body-2 font-weight-medium">{{ removingMember.name }}</span>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showRemoveMember = false">取消</v-btn><v-btn color="error" @click="confirmRemoveMember">确认移除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const props = defineProps({ id: Number })
const store = useAppStore()
const route = useRoute()
const router = useRouter()

const ws = computed(() => store.workspaces.find(w => w.id === props.id))
const isAdmin = computed(() => ws.value?.myRole === 'admin')
const isMember = computed(() => ws.value?.myRole !== 'viewer')

const roleLabels = { admin: '管理员', member: '成员', viewer: '只读查看者' }
const roleColors = { admin: 'primary', member: 'success', viewer: 'grey' }
const statusLabel = { draft: '草稿', published: '已发布', disabled: '已停用' }
const statusClass = { draft: 'status-draft', published: 'status-published', disabled: 'status-disabled' }
const typeLabel = { app: '应用流', chat: '对话流' }
const statusOptions = [
  { value: 'all', label: '全部' }, { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' }, { value: 'disabled', label: '已停用' },
]

// === WORKFLOWS TAB ===
const tab = ref('workflows')
const currentFolderId = ref(null)
const folderPath = ref([])
const wfSearch = ref('')
const wfStatusFilter = ref('all')
const wfTypeFilter = ref('all')
const wfSortField = ref('editedAt')
const wfSortAsc = ref(false)
const wfFilterOpen = ref(false)

const isSearchMode = computed(() => !!wfSearch.value)
const wfHasFilters = computed(() => wfSearch.value || wfStatusFilter.value !== 'all' || wfTypeFilter.value !== 'all')
const wfActiveFilterCount = computed(() => (wfStatusFilter.value !== 'all' ? 1 : 0) + (wfTypeFilter.value !== 'all' ? 1 : 0))
const canCreateFolder = computed(() => isMember.value && folderPath.value.length < 4)

const allFolders = computed(() => store.wsFolders[ws.value?.id] || [])
const folders = computed(() => allFolders.value.filter(f => f.parentId === currentFolderId.value))
const sortedFolders = computed(() => [...folders.value].sort((a, b) => {
  const fa = a.editedAt || a.createdAt, fb = b.editedAt || b.createdAt
  return wfSortAsc.value ? fa.localeCompare(fb) : fb.localeCompare(fa)
}))

const sortedWorkflows = computed(() => {
  const allWf = store.wsWorkflows[ws.value?.id] || []
  let wfs = isSearchMode.value
    ? allWf.filter(wf => wf.name.toLowerCase().includes(wfSearch.value.toLowerCase()) || wf.code.toLowerCase().includes(wfSearch.value.toLowerCase()))
    : allWf.filter(wf => wf.folderId === currentFolderId.value)
  if (wfStatusFilter.value !== 'all') wfs = wfs.filter(wf => wf.status === wfStatusFilter.value)
  if (wfTypeFilter.value !== 'all') wfs = wfs.filter(wf => wf.type === wfTypeFilter.value)
  return [...wfs].sort((a, b) => {
    if (wfSortField.value === 'name') return wfSortAsc.value ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    const va = a.editedAt, vb = b.editedAt
    return wfSortAsc.value ? va.localeCompare(vb) : vb.localeCompare(va)
  })
})

const wfIsEmpty = computed(() => isSearchMode.value ? sortedWorkflows.value.length === 0 : (sortedFolders.value.length === 0 && sortedWorkflows.value.length === 0))

function wfOwnerNames(wf) {
  return (wf.owners || []).map(id => store.getUserName(id)).filter(Boolean).join(', ') || '-'
}
function toggleWfSort(field) {
  if (wfSortField.value === field) wfSortAsc.value = !wfSortAsc.value
  else { wfSortField.value = field; wfSortAsc.value = true }
}
function clearWfFilters() { wfSearch.value = ''; wfStatusFilter.value = 'all'; wfTypeFilter.value = 'all'; wfFilterOpen.value = false }
function navigateIntoFolder(f) { folderPath.value.push({ id: f.id, name: f.name }); currentFolderId.value = f.id; clearWfFilters() }
function navigateUp() {
  if (folderPath.value.length >= 2) {
    folderPath.value.pop()
    currentFolderId.value = folderPath.value[folderPath.value.length - 1].id
  } else { folderPath.value = []; currentFolderId.value = null }
}

const folderBreadcrumbs = computed(() => {
  const items = [{ title: ws.value?.name || '', onClick: () => { folderPath.value = []; currentFolderId.value = null } }]
  folderPath.value.forEach((p, i) => {
    items.push({
      title: p.name,
      disabled: i === folderPath.value.length - 1,
      onClick: () => { folderPath.value = folderPath.value.slice(0, i + 1); currentFolderId.value = p.id },
    })
  })
  return items
})

// Workflow CRUD
const showCreateWf = ref(false)
const wfForm = ref({ name: '', code: '', desc: '', type: 'app', allowRef: false, ownerId: 101 })
const ownerOptions = computed(() => (ws.value?.members || []).filter(m => m.role !== 'viewer').map(m => ({ title: m.name, value: m.userId })))

function createWf() {
  if (!wfForm.value.name?.trim() || !wfForm.value.code?.trim()) { store.showToast('error', '请填写必填项', ''); return }
  const now = new Date().toISOString()
  store.addWorkflow(ws.value.id, {
    name: wfForm.value.name.trim(), code: wfForm.value.code.trim(), desc: wfForm.value.desc.trim(),
    type: wfForm.value.type, allowRef: wfForm.value.allowRef, status: 'draft', version: 0,
    creator: 'Sukey Wu', owners: [wfForm.value.ownerId], folderId: currentFolderId.value, wsId: ws.value.id,
    createdAt: now.slice(0, 10), editedAt: now.slice(0, 16).replace('T', ' '),
    lastRun: null, runningCount: 0, execCount: 0, debugPassed: false, inputs: [], versions: [],
  })
  showCreateWf.value = false
  wfForm.value = { name: '', code: '', desc: '', type: 'app', allowRef: false, ownerId: 101 }
  store.showToast('success', '创建成功', `工作流「${wfForm.value.name || ''}」已创建`)
}

function executeWf(wf) {
  if (!wf || wf.status !== 'published') return
  const now = new Date()
  const ts = now.toISOString().slice(0, 19).replace('T', ' ')
  const execId = 3000 + (store.getExecutions(ws.value.id).length)
  store.addExecution(ws.value.id, {
    id: execId, wfId: wf.id, wfName: wf.name, wfCode: wf.code, version: wf.version,
    trigger: 'manual', status: 'running', startTime: ts, endTime: '-', duration: '进行中',
    triggerUser: 'Sukey Wu', archived: false,
    nodes: [{ name: '触发节点', type: '手动触发', status: 'success', duration: '0.1秒', startTime: ts.slice(11) }, { name: '执行中...', type: '处理节点', status: 'running', duration: '进行中', startTime: ts.slice(11) }],
  })
  wf.runningCount++; wf.lastRun = 'running'
  store.showToast('success', '工作流已启动', `实例 ID: ${execId}`)
}

function copyWf(wf) {
  const allNames = (store.wsWorkflows[ws.value.id] || []).map(x => x.name)
  let copyName = `${wf.name} - 副本`
  let i = 2; while (allNames.includes(copyName)) { copyName = `${wf.name} - 副本 ${i++}` }
  const allCodes = Object.values(store.wsWorkflows).flat().map(x => x.code)
  let copyCode = `${wf.code}_copy`; i = 2; while (allCodes.includes(copyCode)) { copyCode = `${wf.code}_copy${i++}` }
  const now = new Date().toISOString()
  store.addWorkflow(ws.value.id, {
    ...wf, name: copyName, code: copyCode, status: 'draft', version: 0,
    creator: 'Sukey Wu', owners: [101], execCount: 0, runningCount: 0, lastRun: null,
    debugPassed: false, versions: [], createdAt: now.slice(0, 10), editedAt: now.slice(0, 16).replace('T', ' '),
  })
  store.showToast('success', '复制成功', `已创建副本「${copyName}」`)
}

const showMoveWf = ref(false)
const moveTarget = ref(null)
function doMoveWf(targetFolderId) {
  if (!moveTarget.value) return
  const wf = (store.wsWorkflows[ws.value.id] || []).find(x => x.id === moveTarget.value.id)
  if (wf) { wf.folderId = targetFolderId; wf.editedAt = new Date().toISOString().slice(0, 16).replace('T', ' ') }
  showMoveWf.value = false
  store.showToast('success', '移动成功', '工作流已移动')
}

const showDeleteWf = ref(false)
const deleteTarget = ref(null)
const deleteConfirmCode = ref('')
function confirmDeleteWf() {
  if (!deleteTarget.value) return
  store.deleteWorkflow(ws.value.id, deleteTarget.value.id)
  showDeleteWf.value = false; deleteConfirmCode.value = ''
  store.showToast('success', '删除成功', `工作流已删除`)
}

// Folder CRUD
const showCreateFolder = ref(false)
const folderForm = ref({ name: '', desc: '' })
function createFolder() {
  if (!folderForm.value.name?.trim()) { store.showToast('error', '请输入文件夹名称', ''); return }
  const now = new Date()
  store.addFolder(ws.value.id, {
    name: folderForm.value.name.trim(), desc: folderForm.value.desc.trim(),
    parentId: currentFolderId.value, wsId: ws.value.id, creator: 'Sukey Wu',
    createdAt: now.toISOString().slice(0, 10), editedAt: now.toISOString().slice(0, 16).replace('T', ' '),
  })
  showCreateFolder.value = false; folderForm.value = { name: '', desc: '' }
  store.showToast('success', '创建成功', '文件夹已创建')
}

const showEditFolder = ref(false)
const editingFolder = ref(null)
function updateFolder() {
  if (!editingFolder.value) return
  store.updateFolder(ws.value.id, editingFolder.value.id, {
    name: editingFolder.value.name.trim(), desc: editingFolder.value.desc?.trim() || '',
    editedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  })
  showEditFolder.value = false
  store.showToast('success', '保存成功', '文件夹已更新')
}

// === EXECUTIONS TAB ===
const execSearch = ref('')
const execStatusFilter = ref('all')
const execTriggerFilter = ref('all')
const execTimeRange = ref('all')
const execPage = ref(1)
const execPageSize = 10
const execDetailId = ref(null)

const execStatusLabel = { running: '运行中', paused: '已暂停', completed: '已完成', failed: '失败', cancelled: '已取消' }
const execStatusClass = { running: 'exec-running', paused: 'exec-paused', completed: 'exec-completed', failed: 'exec-failed', cancelled: 'exec-cancelled' }
const execTriggerLabel = { manual: '手动', scheduled: '定时', event: '事件触发', subflow: '子流程调用' }
const execStatusOptions = [
  { title: '全部状态', value: 'all' }, { title: '运行中', value: 'running' }, { title: '已暂停', value: 'paused' },
  { title: '已完成', value: 'completed' }, { title: '失败', value: 'failed' }, { title: '已取消', value: 'cancelled' },
]
const execTriggerOptions = [
  { title: '全部触发方式', value: 'all' }, { title: '手动', value: 'manual' }, { title: '定时', value: 'scheduled' }, { title: '事件触发', value: 'event' },
]
const execTimeOptions = [
  { title: '全部时间', value: 'all' }, { title: '最近1小时', value: '1h' }, { title: '最近24小时', value: '24h' }, { title: '最近7天', value: '7d' }, { title: '最近30天', value: '30d' },
]

const filteredExecs = computed(() => {
  let execs = [...(store.getExecutions(ws.value?.id) || [])]
  if (execSearch.value) {
    const q = execSearch.value.toLowerCase()
    execs = execs.filter(e => e.wfName.toLowerCase().includes(q) || String(e.id).includes(q))
  }
  if (execStatusFilter.value !== 'all') {
    if (execStatusFilter.value === 'stale') execs = execs.filter(e => e.stale)
    else execs = execs.filter(e => e.status === execStatusFilter.value)
  }
  if (execTriggerFilter.value !== 'all') execs = execs.filter(e => e.trigger === execTriggerFilter.value)
  execs.sort((a, b) => { if (a.stale && !b.stale) return -1; if (!a.stale && b.stale) return 1; return b.startTime.localeCompare(a.startTime) })
  return execs
})
const execTotalPages = computed(() => Math.max(1, Math.ceil(filteredExecs.value.length / execPageSize)))
const pagedExecs = computed(() => {
  const start = (execPage.value - 1) * execPageSize
  return filteredExecs.value.slice(start, start + execPageSize)
})
const execDetail = computed(() => execDetailId.value !== null ? (store.getExecutions(ws.value?.id) || []).find(e => e.id === execDetailId.value) : null)

// === SETTINGS TAB ===
const memberTab = ref('admin')
const wsAdmins = computed(() => (ws.value?.members || []).filter(m => m.role === 'admin'))
const wsMembers = computed(() => (ws.value?.members || []).filter(m => m.role === 'member'))
const wsViewers = computed(() => (ws.value?.members || []).filter(m => m.role === 'viewer'))
const currentRoleMembers = computed(() => (ws.value?.members || []).filter(m => m.role === memberTab.value))
const memberRoleOptions = [{ title: '管理员', value: 'admin' }, { title: '成员', value: 'member' }, { title: '只读查看者', value: 'viewer' }]

const showEditWs = ref(false)
const editWsForm = ref({ name: '', desc: '' })
function saveWsEdit() {
  store.updateWorkspace(ws.value.id, { name: editWsForm.value.name, desc: editWsForm.value.desc })
  showEditWs.value = false; store.showToast('success', '保存成功', '空间已更新')
}

const showDeleteWs = ref(false)
const deleteWsConfirm = ref('')
function confirmDeleteWs() {
  store.deleteWorkspace(ws.value.id)
  showDeleteWs.value = false
  store.showToast('success', '删除成功', `空间已删除`)
  router.push('/workspace')
}

function onRoleChange(member, newRole) {
  if (member.role === 'admin' && wsAdmins.value.length <= 1) {
    store.showToast('error', '操作失败', '至少保留一名管理员')
    return
  }
  store.showToast('success', '角色变更', `已变更为${roleLabels[newRole]}`)
}

const showAddMember = ref(false)
const memberSearch = ref('')
const selectedNewMembers = ref([])
const availableUsers = computed(() => {
  const existingIds = (ws.value?.members || []).map(m => m.userId)
  let users = store.ssoUsers.filter(u => !existingIds.includes(u.id))
  if (memberSearch.value) {
    const q = memberSearch.value.toLowerCase()
    users = users.filter(u => u.name.toLowerCase().includes(q) || u.dept.toLowerCase().includes(q))
  }
  return users
})
function toggleNewMember(id) {
  const idx = selectedNewMembers.value.indexOf(id)
  if (idx > -1) selectedNewMembers.value.splice(idx, 1)
  else selectedNewMembers.value.push(id)
}
function confirmAddMembers() {
  selectedNewMembers.value.forEach(uid => {
    const user = store.ssoUsers.find(u => u.id === uid)
    if (user && ws.value) {
      ws.value.members.push({ userId: user.id, name: user.name, avatar: user.avatar, role: memberTab.value, joinedAt: new Date().toISOString().slice(0, 10) })
    }
  })
  store.showToast('success', '添加成功', `已添加 ${selectedNewMembers.value.length} 位${roleLabels[memberTab.value]}`)
  selectedNewMembers.value = []; showAddMember.value = false
}

const showRemoveMember = ref(false)
const removingMember = ref(null)
function confirmRemoveMember() {
  if (!removingMember.value || !ws.value) return
  ws.value.members = ws.value.members.filter(m => m.userId !== removingMember.value.userId)
  store.showToast('success', '移除成功', `已将「${removingMember.value.name}」移除`)
  showRemoveMember.value = false
}

watch(() => showAddMember.value, (v) => { if (v) { selectedNewMembers.value = []; memberSearch.value = '' } })
watch(() => showDeleteWf.value, (v) => { if (v) deleteConfirmCode.value = '' })
</script>
