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
              <v-chip v-if="wfCreatorFilter.length > 0" closable size="small" @click:close="wfCreatorFilter = []">创建者：{{ wfCreatorFilter.join(', ') }}</v-chip>
              <v-chip v-if="wfOwnerFilter.length > 0" closable size="small" @click:close="wfOwnerFilter = []">负责人：{{ wfOwnerFilter.join(', ') }}</v-chip>
            </template>
            <v-btn v-if="wfHasFilters" variant="text" size="small" prepend-icon="mdi-close" @click="clearWfFilters">清除</v-btn>
            <v-spacer />
            <!-- Batch mode toggle -->
            <v-btn v-if="isMember && !batchMode" variant="text" size="small" prepend-icon="mdi-checkbox-multiple-outline" @click="batchMode = true; batchSelectedIds = []">批量</v-btn>
            <v-btn v-if="batchMode" variant="tonal" size="small" prepend-icon="mdi-close" @click="batchMode = false; batchSelectedIds = []">退出批量</v-btn>
            <v-btn v-if="isMember && !batchMode" color="primary" size="small" prepend-icon="mdi-plus" @click="showCreateWf = true">新建工作流</v-btn>
            <v-btn v-if="canCreateFolder && !batchMode" variant="outlined" size="small" prepend-icon="mdi-folder-plus-outline" @click="showCreateFolder = true">新建文件夹</v-btn>
          </div>

          <!-- Batch toolbar -->
          <div v-if="batchMode" class="d-flex align-center ga-2 px-3 pb-3">
            <v-divider class="mb-0" />
          </div>
          <div v-if="batchMode" class="d-flex align-center ga-2 px-3 pb-3">
            <v-checkbox :model-value="batchAllSelected" :indeterminate="batchSelectedIds.length > 0 && !batchAllSelected" hide-details density="compact" label="全选" @update:model-value="toggleBatchSelectAll" />
            <span class="text-caption text-grey">已选 {{ batchSelectedIds.length }} 项</span>
            <v-spacer />
            <v-btn v-if="isAdmin" variant="outlined" color="error" size="small" prepend-icon="mdi-delete-outline" :disabled="batchSelectedIds.length === 0" @click="showBatchDelete = true">批量删除</v-btn>
            <v-btn variant="outlined" size="small" prepend-icon="mdi-folder-move-outline" :disabled="batchSelectedIds.length === 0" @click="showBatchMove = true">批量移动</v-btn>
            <v-btn v-if="isAdmin" variant="outlined" size="small" prepend-icon="mdi-cancel" :disabled="batchSelectedIds.length === 0" @click="batchDisable">批量停用</v-btn>
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
                <!-- Creator dropdown -->
                <div>
                  <div class="text-caption text-grey mb-1">创建者</div>
                  <v-menu v-model="wfCreatorOpen" :close-on-content-click="false">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="outlined" size="small" append-icon="mdi-chevron-down" style="text-transform:none">
                        {{ wfCreatorFilter.length > 0 ? `已选 ${wfCreatorFilter.length} 人` : '全部创建者' }}
                      </v-btn>
                    </template>
                    <v-card min-width="220">
                      <v-text-field v-model="wfCreatorSearch" placeholder="搜索..." prepend-inner-icon="mdi-magnify" hide-details density="compact" class="ma-2" />
                      <v-list density="compact" style="max-height:200px;overflow-y:auto">
                        <v-list-item v-for="c in filteredWfCreators" :key="c" @click="toggleWfCreator(c)">
                          <template #prepend><v-checkbox-btn :model-value="wfCreatorFilter.includes(c)" /></template>
                          <v-list-item-title>{{ c }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                      <v-divider />
                      <div class="d-flex justify-end pa-2 ga-2">
                        <v-btn v-if="wfCreatorFilter.length > 0" variant="text" size="x-small" @click="wfCreatorFilter = []">清空</v-btn>
                        <v-btn variant="tonal" size="x-small" @click="wfCreatorOpen = false">确定</v-btn>
                      </div>
                    </v-card>
                  </v-menu>
                </div>
                <!-- Owner dropdown -->
                <div>
                  <div class="text-caption text-grey mb-1">负责人</div>
                  <v-menu v-model="wfOwnerOpen" :close-on-content-click="false">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="outlined" size="small" append-icon="mdi-chevron-down" style="text-transform:none">
                        {{ wfOwnerFilter.length > 0 ? `已选 ${wfOwnerFilter.length} 人` : '全部负责人' }}
                      </v-btn>
                    </template>
                    <v-card min-width="220">
                      <v-text-field v-model="wfOwnerSearch" placeholder="搜索..." prepend-inner-icon="mdi-magnify" hide-details density="compact" class="ma-2" />
                      <v-list density="compact" style="max-height:200px;overflow-y:auto">
                        <v-list-item v-for="o in filteredWfOwners" :key="o" @click="toggleWfOwner(o)">
                          <template #prepend><v-checkbox-btn :model-value="wfOwnerFilter.includes(o)" /></template>
                          <v-list-item-title>{{ o }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                      <v-divider />
                      <div class="d-flex justify-end pa-2 ga-2">
                        <v-btn v-if="wfOwnerFilter.length > 0" variant="text" size="x-small" @click="wfOwnerFilter = []">清空</v-btn>
                        <v-btn variant="tonal" size="x-small" @click="wfOwnerOpen = false">确定</v-btn>
                      </div>
                    </v-card>
                  </v-menu>
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
              <div style="width:110px" class="d-flex ga-1">
                <v-btn v-if="isMember" icon variant="text" size="x-small" @click.stop="editingFolder = { ...f }; showEditFolder = true"><v-icon size="16">mdi-pencil-outline</v-icon></v-btn>
                <v-menu v-if="isMember">
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon variant="text" size="x-small"><v-icon size="16">mdi-dots-vertical</v-icon></v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item prepend-icon="mdi-folder-move-outline" title="移动" @click="moveFolderTarget = f; showMoveFolder = true" />
                    <v-divider v-if="isMember" />
                    <v-list-item prepend-icon="mdi-delete-outline" title="删除" base-color="error" @click="deleteFolderTarget = f; openFolderDeleteDialog(f)" />
                  </v-list>
                </v-menu>
              </div>
            </div>
          </template>
          <!-- Workflows -->
          <div v-for="wf in sortedWorkflows" :key="'wf-' + wf.id" class="content-list-item">
            <div class="content-item-main" style="flex:2.5">
              <v-checkbox v-if="batchMode" :model-value="batchSelectedIds.includes(wf.id)" hide-details density="compact" class="mr-2" @update:model-value="toggleBatchSelect(wf.id)" />
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
              <v-btn v-if="wf.status === 'published'" icon variant="text" size="x-small" title="执行" @click="openExecuteDialog(wf)">
                <v-icon size="16" color="success">mdi-play</v-icon>
              </v-btn>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon variant="text" size="x-small"><v-icon size="16">mdi-dots-vertical</v-icon></v-btn>
                </template>
                <v-list density="compact">
                  <v-list-item v-if="isMember && wf.status === 'draft'" prepend-icon="mdi-publish" title="发布" @click="openPublishDialog(wf)" />
                  <v-list-item v-if="isAdmin && wf.status === 'published'" prepend-icon="mdi-cancel" title="停用" @click="openDisableDialog(wf)" />
                  <v-list-item v-if="isAdmin && wf.status === 'disabled'" prepend-icon="mdi-check-circle-outline" title="启用" @click="enableWf(wf)" />
                  <v-list-item v-if="wf.versions && wf.versions.length > 0" prepend-icon="mdi-history" title="版本历史" @click="versionTarget = wf; showVersionHistory = true" />
                  <v-divider v-if="isMember" />
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
                <v-btn v-if="execDetail.status === 'running' && isMember" variant="outlined" size="small" prepend-icon="mdi-pause" @click="confirmExecAction = 'pause'; confirmExecTarget = execDetail; showConfirmExec = true">暂停</v-btn>
                <v-btn v-if="execDetail.status === 'paused' && isMember" color="primary" size="small" prepend-icon="mdi-play" @click="confirmExecAction = 'resume'; confirmExecTarget = execDetail; showConfirmExec = true">恢复</v-btn>
                <v-btn v-if="['running','paused'].includes(execDetail.status) && isMember" color="error" size="small" prepend-icon="mdi-stop" @click="confirmExecAction = 'cancel'; confirmExecTarget = execDetail; showConfirmExec = true">取消</v-btn>
                <v-btn v-if="['completed','failed','cancelled'].includes(execDetail.status) && isMember" color="primary" size="small" prepend-icon="mdi-refresh" @click="confirmExecAction = 'reExecute'; confirmExecTarget = execDetail; showConfirmExec = true">重新执行</v-btn>
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
                    <v-btn v-if="e.status === 'running' && isMember" icon variant="text" size="x-small" title="暂停" @click="confirmExecAction = 'pause'; confirmExecTarget = e; showConfirmExec = true"><v-icon size="16">mdi-pause</v-icon></v-btn>
                    <v-btn v-if="e.status === 'paused' && isMember" icon variant="text" size="x-small" title="恢复" @click="confirmExecAction = 'resume'; confirmExecTarget = e; showConfirmExec = true"><v-icon size="16" color="primary">mdi-play</v-icon></v-btn>
                    <v-btn v-if="['running','paused'].includes(e.status) && isMember" icon variant="text" size="x-small" title="取消" @click="confirmExecAction = 'cancel'; confirmExecTarget = e; showConfirmExec = true"><v-icon size="16" color="error">mdi-stop</v-icon></v-btn>
                    <v-btn v-if="['completed','failed','cancelled'].includes(e.status) && isMember" icon variant="text" size="x-small" title="重新执行" @click="confirmExecAction = 'reExecute'; confirmExecTarget = e; showConfirmExec = true"><v-icon size="16">mdi-refresh</v-icon></v-btn>
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
            <v-btn v-if="isSingleAdmin" variant="outlined" size="small" prepend-icon="mdi-swap-horizontal" @click="showTransferAdmin = true">转让管理员</v-btn>
            <v-btn color="error" variant="outlined" size="small" prepend-icon="mdi-delete-outline" @click="deleteWsStep = 1; showDeleteWs = true">删除空间</v-btn>
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

    <!-- Delete Folder Dialog -->
    <v-dialog v-model="showDeleteFolder" max-width="480" persistent>
      <v-card v-if="deleteFolderTarget">
        <v-card-title class="d-flex align-center justify-space-between">删除文件夹<v-btn icon variant="text" @click="showDeleteFolder = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <!-- Empty folder -->
          <template v-if="deleteFolderIsEmpty">
            <p class="text-body-2">确定删除文件夹「{{ deleteFolderTarget.name }}」吗？</p>
          </template>
          <!-- Non-empty folder -->
          <template v-else>
            <div class="delete-warning mb-3">
              <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
              <div class="text-body-2">该文件夹包含 {{ deleteFolderSubFolderCount }} 个子文件夹和 {{ deleteFolderSubWfCount }} 个工作流</div>
            </div>
            <div class="d-flex flex-column ga-3 mt-4">
              <v-card variant="outlined" class="pa-3" style="cursor:pointer" @click="deleteFolderKeepContent">
                <div class="d-flex align-center ga-3">
                  <v-avatar size="36" color="#EEF2FF"><v-icon size="18" color="primary">mdi-folder-move-outline</v-icon></v-avatar>
                  <div><div class="text-body-2 font-weight-medium">仅删除文件夹，保留内容</div><div class="text-caption text-grey">子内容将移至上级目录</div></div>
                </div>
              </v-card>
              <v-card v-if="isAdmin" variant="outlined" class="pa-3" style="cursor:pointer" @click="showDeleteFolder = false; showCascadeDeleteFolder = true">
                <div class="d-flex align-center ga-3">
                  <v-avatar size="36" color="#FEE2E2"><v-icon size="18" color="error">mdi-delete-outline</v-icon></v-avatar>
                  <div><div class="text-body-2 font-weight-medium">删除文件夹及所有内容</div><div class="text-caption text-grey">级联删除，不可恢复</div></div>
                </div>
              </v-card>
            </div>
          </template>
        </v-card-text>
        <v-card-actions v-if="deleteFolderIsEmpty" class="px-4 pb-4"><v-spacer /><v-btn @click="showDeleteFolder = false">取消</v-btn><v-btn color="error" @click="deleteEmptyFolder">删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cascade Delete Folder Confirmation -->
    <v-dialog v-model="showCascadeDeleteFolder" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">确认级联删除<v-btn icon variant="text" @click="showCascadeDeleteFolder = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <div class="delete-warning">
            <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
            <div class="text-body-2">此操作将删除文件夹内的所有工作流及其执行记录，不可恢复。是否继续？</div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showCascadeDeleteFolder = false">取消</v-btn><v-btn color="error" @click="cascadeDeleteFolder">确认删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Move Folder Dialog -->
    <v-dialog v-model="showMoveFolder" max-width="460">
      <v-card v-if="moveFolderTarget">
        <v-card-title class="d-flex align-center justify-space-between">移动文件夹<v-btn icon variant="text" @click="showMoveFolder = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">将「{{ moveFolderTarget.name }}」移动到：</p>
          <div class="folder-tree-node" :class="{ 'is-current': moveFolderTarget.parentId === null }" @click="moveFolderTarget.parentId !== null && doMoveFolder(null)">
            <v-icon size="18">mdi-folder</v-icon>
            <span>{{ ws.name }}（根目录）</span>
            <v-chip v-if="moveFolderTarget.parentId === null" size="x-small" variant="tonal" color="primary" class="ml-2">当前位置</v-chip>
          </div>
          <div v-for="f in movableFolders" :key="f.id" class="folder-tree-node" :class="{ 'is-current': moveFolderTarget.parentId === f.id }" @click="moveFolderTarget.parentId !== f.id && doMoveFolder(f.id)">
            <v-icon size="18">mdi-folder</v-icon>
            <span>{{ f.name }}</span>
            <v-chip v-if="moveFolderTarget.parentId === f.id" size="x-small" variant="tonal" color="primary" class="ml-2">当前位置</v-chip>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete Workflow Dialog -->
    <v-dialog v-model="showDeleteWf" max-width="460" persistent>
      <v-card v-if="deleteTarget">
        <v-card-title class="d-flex align-center justify-space-between">删除工作流<v-btn icon variant="text" @click="showDeleteWf = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <div class="delete-warning mb-3">
            <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
            <div class="text-body-2">删除后，该工作流的所有版本和 {{ deleteTarget.execCount }} 条执行记录将被一并删除，此操作不可恢复。
              <template v-if="deleteTarget.runningCount > 0"><br /><br /><strong style="color:#DC2626">当前有 {{ deleteTarget.runningCount }} 个运行中实例，删除后将被终止。</strong></template>
            </div>
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

    <!-- Publish Workflow Dialog -->
    <v-dialog v-model="showPublishWf" max-width="480" persistent>
      <v-card v-if="publishTarget">
        <v-card-title class="d-flex align-center justify-space-between">发布工作流<v-btn icon variant="text" @click="showPublishWf = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-card variant="tonal" class="pa-3 mb-4 d-flex align-center ga-3">
            <div class="content-item-icon wf-icon" style="width:36px;height:36px"><v-icon>mdi-sitemap</v-icon></div>
            <div class="flex-grow-1"><div class="font-weight-medium">{{ publishTarget.name }}</div><div class="text-caption text-grey"><v-icon size="10">mdi-pound</v-icon> {{ publishTarget.code }}</div></div>
            <span class="version-badge">v{{ publishTarget.version + 1 }}</span>
          </v-card>
          <v-textarea v-model="publishNote" label="发布说明" placeholder="选填，简要描述本次发布变更内容" rows="3" :disabled="!publishTarget.debugPassed" />
          <div v-if="!publishTarget.debugPassed" class="delete-warning mt-3">
            <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
            <div class="text-body-2" style="color:#DC2626"><strong>无法发布：</strong>当前流程尚未通过调试验证，请先完成调试后再发布。</div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showPublishWf = false">取消</v-btn><v-btn color="primary" :disabled="!publishTarget.debugPassed" @click="confirmPublishWf">确认发布</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Disable Workflow Dialog -->
    <v-dialog v-model="showDisableWf" max-width="460" persistent>
      <v-card v-if="disableTarget">
        <v-card-title class="d-flex align-center justify-space-between">停用工作流<v-btn icon variant="text" @click="showDisableWf = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <template v-if="disableTarget.runningCount > 0">
            <div class="delete-warning">
              <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
              <div class="text-body-2">当前有 {{ disableTarget.runningCount }} 个运行中实例，停用后不影响运行中的实例，但不允许启动新的实例。是否继续？</div>
            </div>
          </template>
          <template v-else>
            <p class="text-body-2">确定停用工作流「{{ disableTarget.name }}」吗？停用后将不允许启动新的执行实例。</p>
          </template>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showDisableWf = false">取消</v-btn><v-btn color="error" @click="confirmDisableWf">确认停用</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Version History Dialog -->
    <v-dialog v-model="showVersionHistory" max-width="600">
      <v-card v-if="versionTarget">
        <v-card-title class="d-flex align-center justify-space-between">版本历史 - {{ versionTarget.name }}<v-btn icon variant="text" @click="showVersionHistory = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <div v-if="!versionTarget.versions || versionTarget.versions.length === 0" class="text-center text-grey pa-8">暂无发布版本</div>
          <div v-else>
            <div v-for="ver in versionTarget.versions" :key="ver.v" class="d-flex align-center pa-3 mb-2 rounded-lg" style="border:1px solid #E5E7EB">
              <div class="d-flex align-center ga-3 flex-grow-1">
                <span class="version-badge" :class="{ 'version-current': ver.status === 'current' }">v{{ ver.v }}</span>
                <div>
                  <div class="text-body-2 font-weight-medium">{{ ver.status === 'current' ? '当前生效版本' : ver.status === 'draft' ? '草稿' : '历史版本' }}</div>
                  <div class="text-caption text-grey">{{ ver.publishedAt }} · {{ ver.publisher }}{{ ver.note ? ` · ${ver.note}` : '' }}</div>
                </div>
              </div>
              <v-btn v-if="ver.status === 'history'" variant="outlined" size="small" prepend-icon="mdi-undo" @click="rollbackTarget = { wf: versionTarget, version: ver.v }; showVersionHistory = false; showRollback = true">回滚</v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Rollback Confirmation -->
    <v-dialog v-model="showRollback" max-width="460" persistent>
      <v-card v-if="rollbackTarget">
        <v-card-title>确认回滚</v-card-title>
        <v-card-text>
          <p class="text-body-2">确定回滚到 v{{ rollbackTarget.version }} 吗？将基于 v{{ rollbackTarget.version }} 创建一个新的草稿版本，当前发布的版本不受影响，您可以在编辑确认后重新发布。</p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showRollback = false">取消</v-btn><v-btn color="primary" @click="confirmRollback">确认回滚</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Execute Workflow Dialog -->
    <v-dialog v-model="showExecuteWf" max-width="520" persistent>
      <v-card v-if="executeTarget">
        <v-card-title class="d-flex align-center justify-space-between">
          {{ executeTarget.inputs?.length > 0 ? `执行工作流 · ${executeTarget.name}` : '确认执行' }}
          <v-btn icon variant="text" @click="showExecuteWf = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="executeTarget.inputs?.length > 0" class="d-flex align-center ga-2 mb-4 pa-2 rounded" style="background:#F8FAFC;font-size:12px;color:#6B7280">
            发布版本 v{{ executeTarget.version }} · 手动触发
          </div>
          <div v-if="executeTarget.runningCount > 0" class="mb-4 pa-3 rounded" style="background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.15);font-size:13px;color:#6B7280">
            当前已有 <strong>{{ executeTarget.runningCount }}</strong> 个运行中实例。
          </div>
          <template v-if="!executeTarget.inputs?.length">
            <p class="text-body-2">确定手动执行工作流「{{ executeTarget.name }}」（v{{ executeTarget.version }}）吗？</p>
          </template>
          <template v-else>
            <div v-for="(inp, idx) in executeTarget.inputs" :key="idx" class="mb-4">
              <div class="d-flex align-center ga-2 mb-1">
                <span class="text-body-2 font-weight-medium">{{ inp.label || inp.name }}</span>
                <span v-if="inp.required" style="color:#DC2626">*</span>
                <span class="wf-input-type-tag">{{ inp.type }}</span>
              </div>
              <div v-if="inp.desc" class="text-caption text-grey mb-1">{{ inp.desc }}</div>
              <!-- Type-aware input controls -->
              <v-switch v-if="inp.type === 'Boolean'" v-model="execInputValues[idx]" :label="execInputValues[idx] ? '是' : '否'" hide-details density="compact" color="primary" />
              <v-text-field v-else-if="inp.type === 'Integer'" v-model="execInputValues[idx]" type="number" step="1" placeholder="请输入整数值" hide-details density="compact" />
              <v-text-field v-else-if="inp.type === 'Double'" v-model="execInputValues[idx]" type="number" step="0.01" placeholder="请输入数值" hide-details density="compact" />
              <v-text-field v-else-if="inp.type === 'DateTime'" v-model="execInputValues[idx]" type="datetime-local" hide-details density="compact" />
              <v-textarea v-else-if="inp.type === 'Object'" v-model="execInputValues[idx]" placeholder="请输入 JSON 格式数据" rows="3" hide-details density="compact" style="font-family:monospace" />
              <v-file-input v-else-if="inp.type === 'File'" v-model="execInputValues[idx]" placeholder="选择文件" hide-details density="compact" />
              <v-text-field v-else v-model="execInputValues[idx]" :placeholder="`请输入${inp.label || inp.name}`" hide-details density="compact" />
            </div>
            <div class="text-caption text-grey"><span style="color:#DC2626">*</span> 为必填参数</div>
          </template>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showExecuteWf = false">取消</v-btn><v-btn color="primary" @click="confirmExecuteWf">确认执行</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Batch Delete Dialog -->
    <v-dialog v-model="showBatchDelete" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">批量删除<v-btn icon variant="text" @click="showBatchDelete = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <div class="delete-warning">
            <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
            <div class="text-body-2">确定删除选中的 {{ batchSelectedIds.length }} 个工作流吗？此操作不可恢复。</div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showBatchDelete = false">取消</v-btn><v-btn color="error" @click="confirmBatchDelete">确认删除 ({{ batchSelectedIds.length }})</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Batch Move Dialog -->
    <v-dialog v-model="showBatchMove" max-width="460">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">批量移动 ({{ batchSelectedIds.length }}项)<v-btn icon variant="text" @click="showBatchMove = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">选择目标文件夹：</p>
          <div class="folder-tree-node" @click="confirmBatchMove(null)">
            <v-icon size="18">mdi-folder</v-icon><span>{{ ws?.name }}（根目录）</span>
          </div>
          <div v-for="f in allFolders" :key="f.id" class="folder-tree-node" @click="confirmBatchMove(f.id)">
            <v-icon size="18">mdi-folder</v-icon><span>{{ f.name }}</span>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Execution Action Confirmation Dialog -->
    <v-dialog v-model="showConfirmExec" max-width="460" persistent>
      <v-card v-if="confirmExecTarget">
        <v-card-title class="d-flex align-center justify-space-between">{{ execActionTitle }}<v-btn icon variant="text" @click="showConfirmExec = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p v-if="confirmExecAction === 'pause'" class="text-body-2">确定暂停该执行实例吗？暂停后当前正在执行的节点将完成后挂起，后续节点不再执行。</p>
          <p v-else-if="confirmExecAction === 'resume'" class="text-body-2">确定恢复执行实例 <strong>#{{ confirmExecTarget.id }}</strong>（{{ confirmExecTarget.wfName }}）吗？恢复后将继续从暂停点执行。</p>
          <p v-else-if="confirmExecAction === 'cancel'" class="text-body-2">确定取消该执行实例吗？取消后正在执行的节点将被终止，已完成的节点不受影响。</p>
          <p v-else-if="confirmExecAction === 'reExecute'" class="text-body-2">确定基于工作流「{{ confirmExecTarget.wfName }}」当前版本重新执行吗？将创建一个新的执行实例。</p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer /><v-btn @click="showConfirmExec = false">取消</v-btn>
          <v-btn :color="confirmExecAction === 'cancel' ? 'error' : 'primary'" @click="doExecAction">{{ execActionBtnText }}</v-btn>
        </v-card-actions>
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

    <!-- Delete Workspace Dialog (2-step) -->
    <v-dialog v-model="showDeleteWs" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">{{ deleteWsStep === 1 ? '删除空间' : '确认删除' }}<v-btn icon variant="text" @click="showDeleteWs = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <!-- Step indicator -->
          <div class="d-flex align-center justify-center ga-3 mb-4">
            <div class="d-flex align-center ga-1">
              <v-avatar :color="deleteWsStep >= 1 ? 'primary' : 'grey'" size="24"><span style="font-size:12px;color:white">{{ deleteWsStep > 1 ? '✓' : '1' }}</span></v-avatar>
              <span class="text-caption" :class="deleteWsStep >= 1 ? 'text-primary' : 'text-grey'">确认风险</span>
            </div>
            <v-divider style="max-width:40px" />
            <div class="d-flex align-center ga-1">
              <v-avatar :color="deleteWsStep >= 2 ? 'primary' : 'grey'" size="24"><span style="font-size:12px;color:white">2</span></v-avatar>
              <span class="text-caption" :class="deleteWsStep >= 2 ? 'text-primary' : 'text-grey'">输入确认</span>
            </div>
          </div>
          <!-- Step 1 -->
          <template v-if="deleteWsStep === 1">
            <div class="delete-warning">
              <v-icon color="error" class="mr-2">mdi-alert-outline</v-icon>
              <div class="text-body-2">删除空间后，所有工作流和执行记录将被一并删除，不可恢复。
                <template v-if="ws?.runningInstances > 0"><br /><br /><strong style="color:#DC2626">当前有 {{ ws.runningInstances }} 个运行中实例将被终止。</strong></template>
              </div>
            </div>
          </template>
          <!-- Step 2 -->
          <template v-else>
            <v-text-field v-model="deleteWsConfirm" :label="`请输入空间名称以确认删除：${ws?.name}`" />
          </template>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer /><v-btn @click="showDeleteWs = false">取消</v-btn>
          <v-btn v-if="deleteWsStep === 1" color="error" @click="deleteWsStep = 2">继续</v-btn>
          <v-btn v-else color="error" :disabled="deleteWsConfirm !== ws?.name" @click="confirmDeleteWs">确认删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Transfer Admin Dialog -->
    <v-dialog v-model="showTransferAdmin" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">转让管理员<v-btn icon variant="text" @click="showTransferAdmin = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-3">选择要转让管理员权限的成员：</p>
          <div v-for="m in transferCandidates" :key="m.userId" class="d-flex align-center pa-2 rounded-lg mb-1" style="cursor:pointer" :style="{ background: transferTargetId === m.userId ? '#EEF2FF' : '' }" @click="transferTargetId = m.userId">
            <div class="member-avatar" :class="'avatar-' + m.role">{{ m.avatar }}</div>
            <div class="ml-3 flex-grow-1">
              <div class="text-body-2">{{ m.name }}</div>
              <div class="text-caption text-grey">{{ roleLabels[m.role] }}</div>
            </div>
            <v-icon v-if="transferTargetId === m.userId" color="primary">mdi-check-circle</v-icon>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showTransferAdmin = false">取消</v-btn><v-btn color="primary" :disabled="!transferTargetId" @click="confirmTransferAdmin">确认转让</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Role Change Confirmation Dialog -->
    <v-dialog v-model="showRoleChangeConfirm" max-width="400" persistent>
      <v-card v-if="roleChangeMember">
        <v-card-title>确认角色变更</v-card-title>
        <v-card-text>
          <p class="text-body-2">确定将「{{ roleChangeMember.name }}」的角色从 <strong>{{ roleLabels[roleChangeFrom] }}</strong> 变更为 <strong>{{ roleLabels[roleChangeTo] }}</strong> 吗？</p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="cancelRoleChange">取消</v-btn><v-btn color="primary" @click="confirmRoleChange">确认变更</v-btn></v-card-actions>
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
const wfCreatorFilter = ref([])
const wfOwnerFilter = ref([])
const wfCreatorOpen = ref(false)
const wfOwnerOpen = ref(false)
const wfCreatorSearch = ref('')
const wfOwnerSearch = ref('')
const wfSortField = ref('editedAt')
const wfSortAsc = ref(false)
const wfFilterOpen = ref(false)

// Batch mode
const batchMode = ref(false)
const batchSelectedIds = ref([])
const batchAllSelected = computed(() => {
  const wfs = sortedWorkflows.value
  return wfs.length > 0 && batchSelectedIds.value.length === wfs.length
})
function toggleBatchSelect(wfId) {
  const idx = batchSelectedIds.value.indexOf(wfId)
  if (idx > -1) batchSelectedIds.value.splice(idx, 1)
  else batchSelectedIds.value.push(wfId)
}
function toggleBatchSelectAll(val) {
  if (val) batchSelectedIds.value = sortedWorkflows.value.map(wf => wf.id)
  else batchSelectedIds.value = []
}

const isSearchMode = computed(() => !!wfSearch.value)
const wfHasFilters = computed(() => wfSearch.value || wfStatusFilter.value !== 'all' || wfTypeFilter.value !== 'all' || wfCreatorFilter.value.length > 0 || wfOwnerFilter.value.length > 0)
const wfActiveFilterCount = computed(() => (wfStatusFilter.value !== 'all' ? 1 : 0) + (wfTypeFilter.value !== 'all' ? 1 : 0) + (wfCreatorFilter.value.length > 0 ? 1 : 0) + (wfOwnerFilter.value.length > 0 ? 1 : 0))

// Creator/Owner dropdown data
const allWfCreators = computed(() => [...new Set((store.wsWorkflows[ws.value?.id] || []).map(wf => wf.creator))].sort())
const allWfOwnerNames = computed(() => {
  const ids = [...new Set((store.wsWorkflows[ws.value?.id] || []).flatMap(wf => wf.owners || []))]
  return ids.map(id => store.getUserName(id)).filter(Boolean).sort()
})
const filteredWfCreators = computed(() => wfCreatorSearch.value ? allWfCreators.value.filter(c => c.toLowerCase().includes(wfCreatorSearch.value.toLowerCase())) : allWfCreators.value)
const filteredWfOwners = computed(() => wfOwnerSearch.value ? allWfOwnerNames.value.filter(c => c.toLowerCase().includes(wfOwnerSearch.value.toLowerCase())) : allWfOwnerNames.value)
function toggleWfCreator(name) { const idx = wfCreatorFilter.value.indexOf(name); if (idx > -1) wfCreatorFilter.value.splice(idx, 1); else wfCreatorFilter.value.push(name) }
function toggleWfOwner(name) { const idx = wfOwnerFilter.value.indexOf(name); if (idx > -1) wfOwnerFilter.value.splice(idx, 1); else wfOwnerFilter.value.push(name) }
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
  if (wfCreatorFilter.value.length > 0) wfs = wfs.filter(wf => wfCreatorFilter.value.includes(wf.creator))
  if (wfOwnerFilter.value.length > 0) wfs = wfs.filter(wf => (wf.owners || []).some(oid => { const u = store.ssoUsers.find(x => x.id === oid); return u && wfOwnerFilter.value.includes(u.name) }))
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
function clearWfFilters() { wfSearch.value = ''; wfStatusFilter.value = 'all'; wfTypeFilter.value = 'all'; wfCreatorFilter.value = []; wfOwnerFilter.value = []; wfCreatorOpen.value = false; wfOwnerOpen.value = false; wfFilterOpen.value = false }
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
  store.showToast('success', '创建成功', `工作流已创建`)
  wfForm.value = { name: '', code: '', desc: '', type: 'app', allowRef: false, ownerId: 101 }
}

// Execute workflow with input form
const showExecuteWf = ref(false)
const executeTarget = ref(null)
const execInputValues = ref([])

function openExecuteDialog(wf) {
  if (!wf || wf.status !== 'published') return
  executeTarget.value = wf
  execInputValues.value = (wf.inputs || []).map(inp => inp.type === 'Boolean' ? false : '')
  showExecuteWf.value = true
}

function confirmExecuteWf() {
  const wf = executeTarget.value
  if (!wf) return
  // Validate required inputs
  const inputs = wf.inputs || []
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i].required && inputs[i].type !== 'Boolean') {
      if (!execInputValues.value[i] || (typeof execInputValues.value[i] === 'string' && !execInputValues.value[i].trim())) {
        store.showToast('error', '参数校验失败', '请填写所有必填参数')
        return
      }
    }
  }
  executeWf(wf)
  showExecuteWf.value = false
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

// Publish workflow
const showPublishWf = ref(false)
const publishTarget = ref(null)
const publishNote = ref('')

function openPublishDialog(wf) {
  publishTarget.value = wf
  publishNote.value = ''
  showPublishWf.value = true
}
function confirmPublishWf() {
  const wf = publishTarget.value
  if (!wf || !wf.debugPassed) return
  const now = new Date().toISOString()
  wf.version++
  if (wf.versions) wf.versions.forEach(v => { if (v.status === 'current') v.status = 'history' })
  if (!wf.versions) wf.versions = []
  wf.versions.unshift({ v: wf.version, status: 'current', publishedAt: now.slice(0, 16).replace('T', ' '), publisher: 'Sukey Wu', note: publishNote.value })
  wf.status = 'published'
  wf.editedAt = now.slice(0, 16).replace('T', ' ')
  showPublishWf.value = false
  store.showToast('success', '发布成功', `工作流 v${wf.version} 已发布`)
}

// Disable / Enable workflow
const showDisableWf = ref(false)
const disableTarget = ref(null)

function openDisableDialog(wf) { disableTarget.value = wf; showDisableWf.value = true }
function confirmDisableWf() {
  if (!disableTarget.value) return
  disableTarget.value.status = 'disabled'
  showDisableWf.value = false
  store.showToast('success', '停用成功', `工作流已停用`)
}
function enableWf(wf) {
  wf.status = 'published'
  store.showToast('success', '启用成功', `工作流已重新启用`)
}

// Version history + rollback
const showVersionHistory = ref(false)
const versionTarget = ref(null)
const showRollback = ref(false)
const rollbackTarget = ref(null)

function confirmRollback() {
  if (!rollbackTarget.value) return
  showRollback.value = false
  store.showToast('success', '回滚成功', `已基于 v${rollbackTarget.value.version} 创建新草稿版本`)
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

// Batch operations
const showBatchDelete = ref(false)
const showBatchMove = ref(false)

function confirmBatchDelete() {
  const ids = [...batchSelectedIds.value]
  ids.forEach(id => store.deleteWorkflow(ws.value.id, id))
  batchSelectedIds.value = []; batchMode.value = false; showBatchDelete.value = false
  store.showToast('success', '批量删除成功', `已删除 ${ids.length} 个工作流`)
}
function confirmBatchMove(targetFolderId) {
  const ids = [...batchSelectedIds.value]
  const wfs = store.wsWorkflows[ws.value.id] || []
  wfs.forEach(wf => {
    if (ids.includes(wf.id)) { wf.folderId = targetFolderId; wf.editedAt = new Date().toISOString().slice(0, 16).replace('T', ' ') }
  })
  batchSelectedIds.value = []; batchMode.value = false; showBatchMove.value = false
  store.showToast('success', '批量移动成功', `已移动 ${ids.length} 个工作流`)
}
function batchDisable() {
  const wfs = (store.wsWorkflows[ws.value.id] || []).filter(wf => batchSelectedIds.value.includes(wf.id) && wf.status === 'published')
  if (wfs.length === 0) { store.showToast('info', '提示', '选中的工作流中没有已发布状态的工作流'); return }
  wfs.forEach(wf => { wf.status = 'disabled' })
  batchSelectedIds.value = []; batchMode.value = false
  store.showToast('success', '批量停用成功', `已停用 ${wfs.length} 个工作流`)
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

// Folder delete (with cascade options)
const showDeleteFolder = ref(false)
const showCascadeDeleteFolder = ref(false)
const deleteFolderTarget = ref(null)

const deleteFolderSubFolderCount = computed(() => deleteFolderTarget.value ? store.getSubFolderCount(ws.value?.id, deleteFolderTarget.value.id) : 0)
const deleteFolderSubWfCount = computed(() => deleteFolderTarget.value ? store.getSubWfCount(ws.value?.id, deleteFolderTarget.value.id) : 0)
const deleteFolderIsEmpty = computed(() => deleteFolderSubFolderCount.value === 0 && deleteFolderSubWfCount.value === 0)

function openFolderDeleteDialog(f) {
  deleteFolderTarget.value = f
  showDeleteFolder.value = true
}
function deleteEmptyFolder() {
  if (!deleteFolderTarget.value) return
  store.deleteFolder(ws.value.id, deleteFolderTarget.value.id)
  showDeleteFolder.value = false
  store.showToast('success', '删除成功', '文件夹已删除')
}
function deleteFolderKeepContent() {
  const f = deleteFolderTarget.value
  if (!f) return
  const allF = store.wsFolders[ws.value.id] || []
  allF.forEach(child => { if (child.parentId === f.id) child.parentId = f.parentId })
  const allW = store.wsWorkflows[ws.value.id] || []
  allW.forEach(wf => { if (wf.folderId === f.id) wf.folderId = f.parentId })
  store.deleteFolder(ws.value.id, f.id)
  showDeleteFolder.value = false
  store.showToast('success', '删除成功', '文件夹已删除，内容已保留')
}
function cascadeDeleteFolder() {
  const f = deleteFolderTarget.value
  if (!f) return
  function getDescendants(parentId) {
    const children = (store.wsFolders[ws.value.id] || []).filter(x => x.parentId === parentId)
    let ids = children.map(c => c.id)
    children.forEach(c => { ids = ids.concat(getDescendants(c.id)) })
    return ids
  }
  const allFolderIds = [f.id, ...getDescendants(f.id)]
  store.wsWorkflows[ws.value.id] = (store.wsWorkflows[ws.value.id] || []).filter(wf => !allFolderIds.includes(wf.folderId))
  store.wsFolders[ws.value.id] = (store.wsFolders[ws.value.id] || []).filter(x => !allFolderIds.includes(x.id))
  showCascadeDeleteFolder.value = false
  store.showToast('success', '删除成功', '文件夹及所有内容已删除')
}

// Folder move
const showMoveFolder = ref(false)
const moveFolderTarget = ref(null)
const movableFolders = computed(() => {
  if (!moveFolderTarget.value) return []
  const fId = moveFolderTarget.value.id
  function getDescIds(pid) { const ch = allFolders.value.filter(x => x.parentId === pid); let ids = ch.map(c => c.id); ch.forEach(c => { ids = ids.concat(getDescIds(c.id)) }); return ids }
  const invalidIds = new Set([fId, ...getDescIds(fId)])
  return allFolders.value.filter(f => !invalidIds.has(f.id))
})
function doMoveFolder(targetParentId) {
  const f = (store.wsFolders[ws.value.id] || []).find(x => x.id === moveFolderTarget.value?.id)
  if (!f) return
  f.parentId = targetParentId
  f.editedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
  showMoveFolder.value = false
  store.showToast('success', '移动成功', '文件夹已移动')
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
  { title: '异常滞留', value: 'stale' },
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

// Execution action confirmations
const showConfirmExec = ref(false)
const confirmExecAction = ref('')
const confirmExecTarget = ref(null)

const execActionTitle = computed(() => ({
  pause: '暂停执行', resume: '确认恢复执行', cancel: '取消执行', reExecute: '确认重新执行',
}[confirmExecAction.value] || ''))
const execActionBtnText = computed(() => ({
  pause: '确认暂停', resume: '确认恢复', cancel: '确认取消', reExecute: '确认执行',
}[confirmExecAction.value] || '确认'))

function doExecAction() {
  const e = confirmExecTarget.value
  if (!e) return
  if (confirmExecAction.value === 'pause') {
    e.status = 'paused'
    store.showToast('success', '暂停成功', '执行已暂停')
  } else if (confirmExecAction.value === 'resume') {
    e.status = 'running'; e.stale = false
    store.showToast('success', '执行已恢复', '')
  } else if (confirmExecAction.value === 'cancel') {
    e.status = 'cancelled'
    e.endTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
    e.duration = '已取消'
    store.showToast('success', '取消成功', '执行已取消')
  } else if (confirmExecAction.value === 'reExecute') {
    const wf = store.findWorkflow(ws.value.id, e.wfId)
    if (wf && wf.status === 'published') {
      executeWf(wf)
    } else {
      store.showToast('warning', '无法执行', '工作流当前状态不支持执行')
    }
  }
  showConfirmExec.value = false
}

// === SETTINGS TAB ===
const memberTab = ref('admin')
const wsAdmins = computed(() => (ws.value?.members || []).filter(m => m.role === 'admin'))
const wsMembers = computed(() => (ws.value?.members || []).filter(m => m.role === 'member'))
const wsViewers = computed(() => (ws.value?.members || []).filter(m => m.role === 'viewer'))
const currentRoleMembers = computed(() => (ws.value?.members || []).filter(m => m.role === memberTab.value))
const memberRoleOptions = [{ title: '管理员', value: 'admin' }, { title: '成员', value: 'member' }, { title: '只读查看者', value: 'viewer' }]
const isSingleAdmin = computed(() => wsAdmins.value.length === 1 && wsAdmins.value[0]?.userId === 101)

const showEditWs = ref(false)
const editWsForm = ref({ name: '', desc: '' })
function saveWsEdit() {
  store.updateWorkspace(ws.value.id, { name: editWsForm.value.name, desc: editWsForm.value.desc })
  showEditWs.value = false; store.showToast('success', '保存成功', '空间已更新')
}

// 2-step delete workspace
const showDeleteWs = ref(false)
const deleteWsConfirm = ref('')
const deleteWsStep = ref(1)
function confirmDeleteWs() {
  store.deleteWorkspace(ws.value.id)
  showDeleteWs.value = false
  store.showToast('success', '删除成功', `空间已删除`)
  router.push('/workspace')
}

// Transfer admin
const showTransferAdmin = ref(false)
const transferTargetId = ref(null)
const transferCandidates = computed(() => (ws.value?.members || []).filter(m => m.userId !== 101))
function confirmTransferAdmin() {
  if (!transferTargetId.value || !ws.value) return
  const target = ws.value.members.find(m => m.userId === transferTargetId.value)
  const current = ws.value.members.find(m => m.userId === 101)
  if (target) target.role = 'admin'
  if (current) current.role = 'member'
  showTransferAdmin.value = false
  transferTargetId.value = null
  store.showToast('success', '转让成功', `管理员权限已转让`)
}

// Role change with confirmation
const showRoleChangeConfirm = ref(false)
const roleChangeMember = ref(null)
const roleChangeFrom = ref('')
const roleChangeTo = ref('')

function onRoleChange(member, newRole) {
  if (member.role === newRole) return
  // Prevent removing last admin
  if (roleChangeFrom.value === 'admin' && wsAdmins.value.length <= 1 && member.role === 'admin') {
    member.role = 'admin' // revert
    store.showToast('error', '操作失败', '至少保留一名管理员')
    return
  }
  roleChangeMember.value = member
  roleChangeFrom.value = member.role === newRole ? roleChangeFrom.value : (wsAdmins.value.find(a => a.userId === member.userId) ? 'admin' : wsMembers.value.find(m => m.userId === member.userId) ? 'member' : 'viewer')
  // Since v-select already changed the value, we need to track the original
  roleChangeFrom.value = memberTab.value
  roleChangeTo.value = newRole
  showRoleChangeConfirm.value = true
}
function confirmRoleChange() {
  showRoleChangeConfirm.value = false
  store.showToast('success', '角色变更', `已变更为${roleLabels[roleChangeTo.value]}`)
}
function cancelRoleChange() {
  // Revert the role change
  if (roleChangeMember.value) {
    roleChangeMember.value.role = roleChangeFrom.value
  }
  showRoleChangeConfirm.value = false
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

// === Watchers ===
watch(() => showAddMember.value, (v) => { if (v) { selectedNewMembers.value = []; memberSearch.value = '' } })
watch(() => showDeleteWf.value, (v) => { if (v) deleteConfirmCode.value = '' })
watch(() => showDeleteWs.value, (v) => { if (v) { deleteWsConfirm.value = ''; deleteWsStep.value = 1 } })
watch(() => showTransferAdmin.value, (v) => { if (v) transferTargetId.value = null })
watch(() => showExecuteWf.value, (v) => { if (v && executingWf.value) { executeInputs.value = {} } })
watch(() => showPublishWf.value, (v) => { if (v) publishNote.value = '' })
watch(() => showFolderDelete.value, (v) => { if (v) cascadeDeleteConfirm.value = '' })
watch(() => showFolderMove.value, (v) => { if (v) folderMoveTargetId.value = null })
watch(() => showBatchDelete.value, (v) => { if (v) batchDeleteConfirm.value = '' })
watch(() => showBatchMove.value, (v) => { if (v) batchMoveTargetId.value = null })
</script>