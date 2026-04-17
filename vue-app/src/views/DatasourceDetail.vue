<template>
  <div v-if="ds">
    <!-- Compact Header with actions -->
    <div class="compact-header">
      <div class="compact-header-top">
        <v-btn variant="text" size="small" prepend-icon="mdi-arrow-left" @click="$router.push('/datasource')">返回</v-btn>
        <span class="compact-header-title">{{ ds.name }}</span>
        <v-chip :color="ds.isPublic ? 'success' : 'grey'" size="x-small" variant="tonal" label>
          <v-icon start size="12">{{ ds.isPublic ? 'mdi-earth' : 'mdi-lock-outline' }}</v-icon>
          {{ ds.isPublic ? '公开' : '私有' }}
        </v-chip>
        <v-chip v-if="ds.referenced" color="primary" size="x-small" variant="tonal" class="ml-1">被引用 {{ ds.referenceCount }}</v-chip>
        <v-spacer />
        <!-- Header Action Buttons -->
        <v-btn variant="outlined" size="small" prepend-icon="mdi-pencil-outline" class="mr-2" @click="showEditDs = true">编辑</v-btn>
        <v-btn variant="outlined" size="small" color="error" prepend-icon="mdi-delete-outline" @click="showDeleteDs = true">删除</v-btn>
      </div>
      <div class="compact-header-meta">
        <span>{{ ds.desc || '暂无描述' }}</span>
        <span class="meta-sep">·</span><span>创建者: {{ ds.creator }}</span>
        <span class="meta-sep">·</span><span><v-icon size="12">mdi-calendar-outline</v-icon> {{ ds.createdAt }}</span>
        <span class="meta-sep">·</span><span>{{ ds.items.length }} 条目</span>
      </div>
    </div>

    <!-- Tabs with Badges -->
    <v-tabs v-model="tab" color="primary" density="compact" class="mb-4">
      <v-tab value="items">
        <v-icon start size="16">mdi-format-list-bulleted</v-icon>数据条目
        <v-chip size="x-small" variant="tonal" class="ml-2">{{ ds.items.length }}</v-chip>
      </v-tab>
      <v-tab value="auth">
        <v-icon start size="16">mdi-shield-lock-outline</v-icon>授权管理
        <v-chip v-if="!ds.isPublic" size="x-small" variant="tonal" class="ml-2">{{ ds.authorizedSpaces.length }}</v-chip>
      </v-tab>
      <v-tab value="sync">
        <v-icon start size="16">mdi-sync</v-icon>API 同步
        <v-chip size="x-small" variant="tonal" class="ml-2">{{ ds.syncLogs.length }}</v-chip>
      </v-tab>
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
            <v-tooltip v-if="ds.items.length >= 500" location="top" text="已达数据项上限（500条），无法继续添加">
              <template #activator="{ props: tp }">
                <span v-bind="tp" style="cursor:not-allowed">
                  <v-btn color="primary" size="small" prepend-icon="mdi-plus" disabled>添加条目</v-btn>
                </span>
              </template>
            </v-tooltip>
            <v-btn v-else color="primary" size="small" prepend-icon="mdi-plus" @click="openAddItem">添加条目</v-btn>
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
                <th class="col-header" :class="{ 'sort-active': itemSort === 'key' }" @click="toggleItemSort('key')" style="cursor:pointer">
                  Key <v-icon v-if="itemSort === 'key'" size="14">{{ itemSortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                </th>
                <th class="col-header" :class="{ 'sort-active': itemSort === 'value' }" @click="toggleItemSort('value')" style="cursor:pointer">
                  Value <v-icon v-if="itemSort === 'value'" size="14">{{ itemSortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                </th>
                <th>类型</th>
                <th class="col-header" :class="{ 'sort-active': itemSort === 'updatedAt' }" @click="toggleItemSort('updatedAt')" style="cursor:pointer">
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
                  <v-btn icon variant="text" size="x-small" @click="openEditItem(item)"><v-icon size="16">mdi-pencil-outline</v-icon></v-btn>
                  <v-btn icon variant="text" size="x-small" color="error" @click="openDeleteItem(item)"><v-icon size="16">mdi-delete-outline</v-icon></v-btn>
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
        <!-- Segmented Control for auth type -->
        <div class="d-flex align-center ga-4 mb-5">
          <span class="text-body-2 font-weight-medium text-grey" style="white-space:nowrap">授权方式</span>
          <v-btn-toggle v-model="authMode" mandatory density="compact" divided variant="outlined" color="primary" style="max-width:360px;flex:1">
            <v-btn value="public" prepend-icon="mdi-earth">公开</v-btn>
            <v-btn value="private" prepend-icon="mdi-lock-outline">指定空间</v-btn>
          </v-btn-toggle>
        </div>

        <!-- Public mode -->
        <div v-if="ds.isPublic" class="text-center pa-8">
          <v-icon size="48" color="success" class="mb-3">mdi-earth</v-icon>
          <h3 class="text-subtitle-1 font-weight-medium mb-1">所有空间均可访问</h3>
          <p class="text-body-2 text-grey">当前为公开数据源，无需单独授权</p>
        </div>

        <!-- Private mode -->
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
              <v-btn icon variant="text" size="x-small" color="error" @click="openRemoveAuth(space)">
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
          <v-text-field v-model="ds.syncConfig.url" label="API 地址" placeholder="https://api.example.com/data" class="mb-2" :error-messages="syncErrors.url" @update:model-value="syncErrors.url = ''" />
          <div class="d-flex ga-3 mb-3">
            <v-text-field v-model="ds.syncConfig.keyField" label="Key 映射字段" placeholder="code" style="flex:1" :error-messages="syncErrors.keyField" @update:model-value="syncErrors.keyField = ''" />
            <v-text-field v-model="ds.syncConfig.valueField" label="Value 映射字段" placeholder="name" style="flex:1" :error-messages="syncErrors.valueField" @update:model-value="syncErrors.valueField = ''" />
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" size="small" @click="saveSyncConfig">保存配置</v-btn>
            <v-btn color="primary" size="small" prepend-icon="mdi-sync" @click="openSyncStrategy" :disabled="!ds.syncConfig.url">执行同步</v-btn>
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

    <!-- Add Item Dialog (type-aware) -->
    <v-dialog v-model="showAddItem" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">添加条目<v-btn icon variant="text" @click="showAddItem = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="newItem.key" label="Key *" class="mb-2" :error-messages="addItemErrors.key" @update:model-value="addItemErrors.key = ''" hint="英文、数字、下划线、连字符" persistent-hint />
          <v-select v-model="newItem.type" :items="dataTypes" label="数据类型 *" class="mb-2" @update:model-value="onNewItemTypeChange" />
          <!-- Type-aware value input -->
          <template v-if="newItem.type === 'Boolean'">
            <v-select v-model="newItem.value" :items="['true', 'false']" label="Value *" :error-messages="addItemErrors.value" @update:model-value="addItemErrors.value = ''" />
          </template>
          <template v-else-if="newItem.type === 'Integer'">
            <v-text-field v-model="newItem.value" type="number" step="1" label="Value *" placeholder="请输入整数" :error-messages="addItemErrors.value" @update:model-value="addItemErrors.value = ''" />
          </template>
          <template v-else-if="newItem.type === 'Double'">
            <v-text-field v-model="newItem.value" type="number" step="any" label="Value *" placeholder="请输入数字" :error-messages="addItemErrors.value" @update:model-value="addItemErrors.value = ''" />
          </template>
          <template v-else-if="newItem.type === 'DateTime'">
            <v-text-field v-model="newItem.value" type="datetime-local" label="Value *" :error-messages="addItemErrors.value" @update:model-value="addItemErrors.value = ''" />
          </template>
          <template v-else>
            <v-text-field v-model="newItem.value" label="Value *" placeholder="请输入文本" :error-messages="addItemErrors.value" @update:model-value="addItemErrors.value = ''" />
          </template>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showAddItem = false">取消</v-btn><v-btn color="primary" @click="addItem">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Item Dialog (Key+Type disabled, type-aware value) -->
    <v-dialog v-model="showEditItem" max-width="460" persistent>
      <v-card v-if="editingItem">
        <v-card-title class="d-flex align-center justify-space-between">编辑条目<v-btn icon variant="text" @click="showEditItem = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field :model-value="editingItem.key" label="Key" class="mb-2" disabled style="opacity:0.6" />
          <v-text-field :model-value="editingItem.type" label="类型" class="mb-2" disabled style="opacity:0.6" hint="类型创建后不可修改" persistent-hint />
          <!-- Type-aware value input for edit -->
          <template v-if="editingItem.type === 'Boolean'">
            <v-select v-model="editingItem.value" :items="['true', 'false']" label="Value *" :error-messages="editItemErrors.value" @update:model-value="editItemErrors.value = ''" />
          </template>
          <template v-else-if="editingItem.type === 'Integer'">
            <v-text-field v-model="editingItem.value" type="number" step="1" label="Value *" placeholder="请输入整数" :error-messages="editItemErrors.value" @update:model-value="editItemErrors.value = ''" />
          </template>
          <template v-else-if="editingItem.type === 'Double'">
            <v-text-field v-model="editingItem.value" type="number" step="any" label="Value *" placeholder="请输入数字" :error-messages="editItemErrors.value" @update:model-value="editItemErrors.value = ''" />
          </template>
          <template v-else-if="editingItem.type === 'DateTime'">
            <v-text-field v-model="editingItem.value" type="datetime-local" label="Value *" :error-messages="editItemErrors.value" @update:model-value="editItemErrors.value = ''" />
          </template>
          <template v-else>
            <v-text-field v-model="editingItem.value" label="Value *" placeholder="请输入文本" :error-messages="editItemErrors.value" @update:model-value="editItemErrors.value = ''" />
          </template>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showEditItem = false">取消</v-btn><v-btn color="primary" @click="saveEditItem">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Item Dialog (shows full details) -->
    <v-dialog v-model="showDeleteItem" max-width="440" persistent>
      <v-card>
        <v-card-title>删除条目</v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            确定删除数据项「{{ deletingItem?.key }}」吗？此操作不可恢复。
          </v-alert>
          <div v-if="deletingItem" class="pa-3 rounded-lg" style="background:rgba(0,0,0,0.03)">
            <div class="d-flex ga-4 mb-1"><span class="text-caption text-grey" style="min-width:40px">Key:</span><code class="text-body-2 font-weight-medium">{{ deletingItem.key }}</code></div>
            <div class="d-flex ga-4 mb-1"><span class="text-caption text-grey" style="min-width:40px">Value:</span><span class="text-body-2">{{ deletingItem.value }}</span></div>
            <div class="d-flex ga-4"><span class="text-caption text-grey" style="min-width:40px">类型:</span><span class="wf-input-type-tag">{{ deletingItem.type }}</span></div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showDeleteItem = false">取消</v-btn><v-btn color="error" @click="confirmDeleteItem">确认删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Auth Space Dialog -->
    <v-dialog v-model="showAddAuth" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">添加授权空间<v-btn icon variant="text" @click="showAddAuth = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="authSpaceSearch" placeholder="搜索空间名称..." prepend-inner-icon="mdi-magnify" hide-details clearable density="compact" class="mb-3" />
          <div v-for="space in filteredAvailableSpaces" :key="space" class="d-flex align-center pa-2 rounded-lg mb-1" style="cursor:pointer" :style="{ background: selectedSpaces.includes(space) ? '#EEF2FF' : '' }" @click="toggleSpace(space)">
            <v-avatar size="28" color="#EEF2FF"><v-icon size="14" color="primary">mdi-folder-outline</v-icon></v-avatar>
            <span class="ml-3 flex-grow-1 text-body-2">{{ space }}</span>
            <v-icon v-if="selectedSpaces.includes(space)" color="primary">mdi-check-circle</v-icon>
          </div>
          <div v-if="filteredAvailableSpaces.length === 0" class="text-center text-grey pa-6">{{ authSpaceSearch ? '无匹配空间' : '所有空间均已授权' }}</div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <span class="text-caption text-grey">已选 {{ selectedSpaces.length }} 个</span>
          <v-spacer /><v-btn @click="showAddAuth = false">取消</v-btn><v-btn color="primary" :disabled="selectedSpaces.length === 0" @click="confirmAddAuth">确认授权</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Auth Space Confirmation Dialog -->
    <v-dialog v-model="showRemoveAuth" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">移除授权<v-btn icon variant="text" @click="showRemoveAuth = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            确定要移除「{{ removingSpace }}」的授权吗？
          </v-alert>
          <div v-if="removingSpaceHasRunning" class="pa-3 rounded-lg mb-3" style="background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.15)">
            <p class="text-body-2" style="color:rgb(220,38,38)"><strong>⚠ 该空间内有正在运行的工作流引用了此数据源</strong>，撤销后不影响运行中的实例，但新的实例将无法启动。是否继续？</p>
          </div>
          <div class="pa-3 rounded-lg" style="background:rgba(0,0,0,0.03)">
            <div class="text-body-2 font-weight-medium mb-1" style="color:rgb(220,38,38)">移除后的影响：</div>
            <ul class="text-body-2 text-grey pl-4" style="margin:0;line-height:1.8">
              <li>该空间内引用此数据源的工作流<strong>新实例将无法启动</strong></li>
              <li>已运行的实例不受影响</li>
              <li>重新授权后可恢复访问</li>
            </ul>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showRemoveAuth = false">取消</v-btn><v-btn color="error" @click="confirmRemoveAuth">确认移除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Auth Switch Confirmation: Private → Public -->
    <v-dialog v-model="showSwitchToPublic" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">切换为公开<v-btn icon variant="text" @click="cancelAuthSwitch"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-alert v-if="ds.authorizedSpaces.length > 0" type="warning" variant="tonal" density="compact" class="mb-3">
            切换为公开后，已有的 <strong>{{ ds.authorizedSpaces.length }}</strong> 个空间授权将被清空且无法恢复。
          </v-alert>
          <p class="text-body-2 text-grey">切换后所有空间将可以直接访问此数据源，确定切换吗？</p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="cancelAuthSwitch">取消</v-btn><v-btn color="primary" @click="confirmSwitchToPublic">确认切换</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Auth Switch Confirmation: Public → Private -->
    <v-dialog v-model="showSwitchToPrivate" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">切换为指定空间<v-btn icon variant="text" @click="cancelAuthSwitch"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-2">切换为「指定空间」后，只有被授权的空间才可以访问此数据源。</p>
          <p class="text-body-2 text-grey">切换后需手动添加授权空间，未授权空间内引用此数据源的工作流新实例将无法启动。确定切换吗？</p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="cancelAuthSwitch">取消</v-btn><v-btn color="primary" @click="confirmSwitchToPrivate">确认切换</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit DS Dialog -->
    <v-dialog v-model="showEditDs" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">编辑数据源<v-btn icon variant="text" @click="showEditDs = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <v-text-field v-model="editDsForm.name" label="数据源名称 *" maxlength="50" class="mb-2" :error-messages="editDsErrors.name" @update:model-value="editDsErrors.name = ''" />
          <v-textarea v-model="editDsForm.desc" label="描述" maxlength="200" rows="3" auto-grow />
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showEditDs = false">取消</v-btn><v-btn color="primary" @click="saveEditDs">保存</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete DS Dialog (with reference warning) -->
    <v-dialog v-model="showDeleteDs" max-width="520" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">删除数据源<v-btn icon variant="text" @click="showDeleteDs = false"><v-icon>mdi-close</v-icon></v-btn></v-card-title>
        <v-card-text>
          <template v-if="ds.referenced && ds.referenceCount > 0">
            <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
              该数据源被 <strong>{{ ds.referenceCount }}</strong> 个工作流引用
            </v-alert>
            <v-card variant="outlined" class="mb-3">
              <v-table density="compact">
                <thead><tr><th class="text-caption">工作流名称</th><th class="text-caption">所属空间</th></tr></thead>
                <tbody>
                  <tr v-for="(ref, idx) in mockRefs" :key="idx">
                    <td class="text-body-2 font-weight-medium" style="color:rgb(79,70,229)">{{ ref.wfName }}</td>
                    <td class="text-body-2 text-grey">{{ ref.wsName }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card>
            <p class="text-body-2" style="color:rgb(220,38,38)">删除后，上述工作流的新实例将无法启动。是否继续？</p>
          </template>
          <v-alert v-else type="warning" variant="tonal" density="compact">
            确定删除数据源「{{ ds.name }}」吗？此操作不可恢复。
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn @click="showDeleteDs = false">取消</v-btn><v-btn color="error" @click="confirmDeleteDs">确认删除</v-btn></v-card-actions>
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
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const props = defineProps({ id: Number })
const store = useAppStore()
const router = useRouter()

const ds = computed(() => store.dataSources.find(d => d.id === props.id))
const tab = ref('items')

// ============================================
//   ITEMS TAB
// ============================================
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
    items = items.filter(i => i.key.toLowerCase().includes(q) || String(i.value).toLowerCase().includes(q))
  }
  if (itemTypeFilter.value !== 'all') items = items.filter(i => i.type === itemTypeFilter.value)
  items.sort((a, b) => {
    const va = itemSort.value === 'key' ? a.key : itemSort.value === 'value' ? String(a.value) : a.updatedAt
    const vb = itemSort.value === 'key' ? b.key : itemSort.value === 'value' ? String(b.value) : b.updatedAt
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

function getNow() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// --- Value Validation ---
function validateItemValue(type, value) {
  if (!value && value !== 'false' && value !== '0') return '请输入 Value'
  switch (type) {
    case 'Integer': if (!/^-?\d+$/.test(String(value))) return 'Value 必须为整数'; break
    case 'Double': if (isNaN(Number(value))) return 'Value 必须为数字'; break
    case 'Boolean': if (String(value) !== 'true' && String(value) !== 'false') return 'Value 必须为 true 或 false'; break
    case 'DateTime': if (isNaN(Date.parse(value))) return 'Value 必须为有效的日期时间'; break
  }
  return ''
}

// --- Add item ---
const showAddItem = ref(false)
const newItem = ref({ key: '', value: '', type: 'String' })
const addItemErrors = ref({ key: '', value: '' })

function openAddItem() {
  newItem.value = { key: '', value: '', type: 'String' }
  addItemErrors.value = { key: '', value: '' }
  showAddItem.value = true
}

function onNewItemTypeChange() {
  // Reset value when type changes
  if (newItem.value.type === 'Boolean') newItem.value.value = 'true'
  else newItem.value.value = ''
  addItemErrors.value.value = ''
}

function addItem() {
  addItemErrors.value = { key: '', value: '' }
  const key = newItem.value.key?.trim()
  const value = String(newItem.value.value ?? '').trim()
  const type = newItem.value.type

  // Key validation
  if (!key) { addItemErrors.value.key = '请输入 Key'; return }
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) { addItemErrors.value.key = 'Key 仅支持英文、数字、下划线和连字符'; return }
  if (ds.value.items.some(i => i.key === key)) { addItemErrors.value.key = '该 Key 已存在，请使用其他名称'; return }

  // 500 limit
  if (ds.value.items.length >= 500) { store.showToast('warning', '已达上限', '已达数据项上限（500条）'); return }

  // Value validation
  const valErr = validateItemValue(type, value)
  if (valErr) { addItemErrors.value.value = valErr; return }

  ds.value.items.push({ key, value, type, updatedAt: getNow() })
  showAddItem.value = false
  store.showToast('success', '添加成功', '条目已添加')
}

// --- Edit item ---
const showEditItem = ref(false)
const editingItem = ref(null)
const editItemErrors = ref({ value: '' })

function openEditItem(item) {
  editingItem.value = { ...item, originalKey: item.key }
  editItemErrors.value = { value: '' }
  showEditItem.value = true
}

function saveEditItem() {
  if (!editingItem.value) return
  editItemErrors.value = { value: '' }

  const value = String(editingItem.value.value ?? '').trim()
  const valErr = validateItemValue(editingItem.value.type, value)
  if (valErr) { editItemErrors.value.value = valErr; return }

  const item = ds.value.items.find(i => i.key === editingItem.value.originalKey)
  if (!item) return
  item.value = value
  item.updatedAt = getNow()
  showEditItem.value = false
  store.showToast('success', '保存成功', '条目已更新')
}

// --- Delete item (with full details) ---
const showDeleteItem = ref(false)
const deletingItem = ref(null)

function openDeleteItem(item) {
  deletingItem.value = { ...item }
  showDeleteItem.value = true
}

function confirmDeleteItem() {
  if (!deletingItem.value) return
  ds.value.items = ds.value.items.filter(i => i.key !== deletingItem.value.key)
  showDeleteItem.value = false
  store.showToast('success', '删除成功', '条目已删除')
}

// ============================================
//   AUTH TAB
// ============================================
const authMode = computed({
  get: () => ds.value?.isPublic ? 'public' : 'private',
  set: (val) => {
    if (!ds.value) return
    if (val === 'public' && !ds.value.isPublic) showSwitchToPublic.value = true
    else if (val === 'private' && ds.value.isPublic) showSwitchToPrivate.value = true
  }
})

// Switch confirmation dialogs
const showSwitchToPublic = ref(false)
const showSwitchToPrivate = ref(false)

function cancelAuthSwitch() {
  showSwitchToPublic.value = false
  showSwitchToPrivate.value = false
}

function confirmSwitchToPublic() {
  if (!ds.value) return
  ds.value.authorizedSpaces = []
  ds.value.isPublic = true
  showSwitchToPublic.value = false
  store.showToast('success', '已切换', '数据源已设为公开')
}

function confirmSwitchToPrivate() {
  if (!ds.value) return
  ds.value.isPublic = false
  showSwitchToPrivate.value = false
  store.showToast('success', '已切换', '数据源已设为指定空间授权')
}

// Add auth space
const showAddAuth = ref(false)
const selectedSpaces = ref([])
const authSpaceSearch = ref('')

const availableSpaces = computed(() => {
  if (!ds.value) return []
  return store.allSpaces.filter(s => !ds.value.authorizedSpaces.includes(s))
})

const filteredAvailableSpaces = computed(() => {
  if (!authSpaceSearch.value) return availableSpaces.value
  const q = authSpaceSearch.value.toLowerCase()
  return availableSpaces.value.filter(s => s.toLowerCase().includes(q))
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

// Remove auth space (with confirmation)
const showRemoveAuth = ref(false)
const removingSpace = ref('')
const removingSpaceHasRunning = computed(() => {
  const ws = store.workspaces.find(w => w.name === removingSpace.value)
  return ws && ws.runningInstances > 0
})

function openRemoveAuth(space) {
  removingSpace.value = space
  showRemoveAuth.value = true
}

function confirmRemoveAuth() {
  ds.value.authorizedSpaces = ds.value.authorizedSpaces.filter(s => s !== removingSpace.value)
  showRemoveAuth.value = false
  store.showToast('success', '移除成功', '已撤销授权')
}

// ============================================
//   EDIT / DELETE DS
// ============================================
const showEditDs = ref(false)
const editDsForm = ref({ name: '', desc: '' })
const editDsErrors = ref({ name: '' })

const showDeleteDs = ref(false)

// Mock referenced workflows for delete dialog
const mockRefs = computed(() => {
  if (!ds.value || !ds.value.referenced) return []
  const wsNames = ['酒店预订流程', '机票同步流程', '数据清洗工作区', '报表统计空间', '通知推送流程']
  const wfPrefixes = ['搜索', '计算', '校验', '验证', '转换', '生成', '同步', '导入', '导出', '清洗', '格式化', '汇总']
  const refs = []
  for (let i = 0; i < ds.value.referenceCount; i++) {
    refs.push({ wfName: wfPrefixes[i % wfPrefixes.length] + '流程' + (i >= wfPrefixes.length ? (Math.floor(i / wfPrefixes.length) + 1) : ''), wsName: wsNames[i % wsNames.length] })
  }
  return refs
})

function saveEditDs() {
  editDsErrors.value = { name: '' }
  const name = editDsForm.value.name?.trim()
  if (!name) { editDsErrors.value.name = '请输入数据源名称'; return }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(name)) { editDsErrors.value.name = '仅支持中文、英文、数字、下划线和连字符'; return }
  if (store.dataSources.some(d => d.id !== ds.value.id && d.name === name)) { editDsErrors.value.name = '该名称已存在'; return }
  ds.value.name = name
  ds.value.desc = editDsForm.value.desc?.trim() || ''
  showEditDs.value = false
  store.showToast('success', '保存成功', '数据源已更新')
}

function confirmDeleteDs() {
  const name = ds.value.name
  store.deleteDataSource(ds.value.id)
  showDeleteDs.value = false
  store.showToast('success', '删除成功', `数据源「${name}」已删除`)
  router.push('/datasource')
}

// ============================================
//   SYNC TAB
// ============================================
const syncLogPage = ref(1)
const syncLogPageSize = 10
const syncLogTotalPages = computed(() => Math.max(1, Math.ceil((ds.value?.syncLogs?.length || 0) / syncLogPageSize)))
const pagedSyncLogs = computed(() => {
  if (!ds.value) return []
  const start = (syncLogPage.value - 1) * syncLogPageSize
  return ds.value.syncLogs.slice(start, start + syncLogPageSize)
})

const syncErrors = ref({ url: '', keyField: '', valueField: '' })

function saveSyncConfig() {
  syncErrors.value = { url: '', keyField: '', valueField: '' }
  let hasError = false
  const url = ds.value.syncConfig.url?.trim()
  const keyField = ds.value.syncConfig.keyField?.trim()
  const valueField = ds.value.syncConfig.valueField?.trim()

  if (!url) { syncErrors.value.url = '请输入 API 地址'; hasError = true }
  else if (!/^https?:\/\/.+/i.test(url)) { syncErrors.value.url = 'API 地址格式不正确，需以 http:// 或 https:// 开头'; hasError = true }
  if (!keyField) { syncErrors.value.keyField = '请输入 Key 映射字段'; hasError = true }
  if (!valueField) { syncErrors.value.valueField = '请输入 Value 映射字段'; hasError = true }
  if (hasError) return

  store.showToast('success', '保存成功', 'API 同步配置已保存')
}

function validateSyncFields() {
  const url = ds.value?.syncConfig?.url?.trim()
  const keyField = ds.value?.syncConfig?.keyField?.trim()
  const valueField = ds.value?.syncConfig?.valueField?.trim()
  if (!url) return '请先输入 API 地址'
  if (!/^https?:\/\/.+/i.test(url)) return 'API 地址格式不正确，需以 http:// 或 https:// 开头'
  if (!keyField) return '请先填写 Key 映射字段'
  if (!valueField) return '请先填写 Value 映射字段'
  return ''
}

const showSyncStrategy = ref(false)
const syncStrategy = ref(null)
const syncStrategies = [
  { value: 'full', label: '全量覆盖', desc: '清空现有数据后完整替换为 API 返回结果', icon: 'mdi-sync', color: '#2563EB' },
  { value: 'incremental', label: '增量更新', desc: '仅新增和更新数据，不删除已有项', icon: 'mdi-plus', color: '#16A34A' },
]

function openSyncStrategy() {
  const validationError = validateSyncFields()
  if (validationError) { store.showToast('warning', '提示', validationError); return }
  syncStrategy.value = null
  showSyncStrategy.value = true
}

function executeSync() {
  if (!syncStrategy.value) return
  const isSuccess = Math.random() > 0.3
  const strategyText = syncStrategy.value === 'full' ? '全量覆盖' : '增量更新'
  ds.value.syncLogs.unshift({
    time: getNow(), operator: 'Sukey Wu', strategy: strategyText,
    result: isSuccess ? 'success' : 'error',
    summary: isSuccess ? `新增 ${Math.floor(Math.random() * 5)} 条、更新 ${Math.floor(Math.random() * 10)} 条${syncStrategy.value === 'full' ? `、删除 ${Math.floor(Math.random() * 3)} 条` : ''}` : '',
    reason: isSuccess ? '' : 'API 返回格式异常',
  })
  showSyncStrategy.value = false; syncStrategy.value = null
  store.showToast(isSuccess ? 'success' : 'error', isSuccess ? '同步成功' : '同步失败', '')
}

// ============================================
//   Watchers
// ============================================
watch(() => showAddAuth.value, (v) => { if (v) { selectedSpaces.value = []; authSpaceSearch.value = '' } })
watch(() => showSyncStrategy.value, (v) => { if (v) syncStrategy.value = null })
watch(() => showEditDs.value, (v) => {
  if (v && ds.value) {
    editDsForm.value = { name: ds.value.name, desc: ds.value.desc }
    editDsErrors.value = { name: '' }
  }
})
watch(() => showAddItem.value, (v) => {
  if (v) { newItem.value = { key: '', value: '', type: 'String' }; addItemErrors.value = { key: '', value: '' } }
})
</script>
