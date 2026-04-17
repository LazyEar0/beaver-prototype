<template>
  <v-app>
    <!-- Light Sidebar (MD3 Navigation Drawer) -->
    <v-navigation-drawer permanent :width="240" class="beaver-sidebar" :border="0">
      <div class="sidebar-brand">
        <div class="sidebar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <span>Beaver</span>
      </div>
      <v-list density="compact" nav class="px-2">
        <v-list-subheader class="sidebar-section-title">管理</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-folder-outline"
          title="空间管理"
          :active="currentModule === 'workspace'"
          @click="$router.push('/workspace')"
          rounded="lg"
        />
        <v-list-item
          prepend-icon="mdi-database-outline"
          title="数据源管理"
          :active="currentModule === 'datasource'"
          @click="$router.push('/datasource')"
          rounded="lg"
        />
      </v-list>
      <template #append>
        <div class="pa-3 text-center sidebar-footer-text">&copy; 2025 DidaTravel 道旅科技</div>
      </template>
    </v-navigation-drawer>

    <v-main style="min-height:100vh" :style="{ background: 'var(--md-content-bg)' }">
      <!-- Header (MD3 Top App Bar) -->
      <v-app-bar flat density="compact" :elevation="0" :style="{ background: 'var(--color-bg-header)', borderBottom: '1px solid var(--md-surface-container-high)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }">
        <v-breadcrumbs :items="breadcrumbs" class="px-6">
          <template #divider><v-icon size="14" color="grey">mdi-chevron-right</v-icon></template>
        </v-breadcrumbs>
        <v-spacer />
        <v-btn variant="text" size="small" prepend-icon="mdi-magnify" :style="headerBtnStyle" @click="store.showToast('info','全局搜索','该功能将在后续版本中实现')">搜索</v-btn>
        <v-btn variant="text" size="small" prepend-icon="mdi-help-circle-outline" :style="headerBtnStyle" @click="store.showToast('info','帮助中心','该功能将在后续版本中实现')">帮助</v-btn>
        <div style="position:relative;display:inline-flex">
          <v-btn variant="text" size="small" prepend-icon="mdi-bell-outline" :style="headerBtnStyle" class="mr-1" @click="store.showToast('info','通知中心','该功能将在后续版本中实现')">通知</v-btn>
          <span style="position:absolute;top:4px;right:12px;width:6px;height:6px;background:var(--md-error);border-radius:50%"></span>
        </div>
        <v-divider vertical class="mx-2" length="20" />
        <div class="d-flex align-center ga-3" style="padding-left:var(--space-3);margin-left:var(--space-2)">
          <v-avatar size="32" :style="{ background: 'var(--md-primary)' }"><span style="color:var(--md-on-primary);font-size:var(--font-size-sm);font-weight:500">W</span></v-avatar>
          <span style="font-size:var(--font-size-base);font-weight:500;color:var(--md-on-surface)" class="mr-4">Sukey Wu</span>
        </div>
      </v-app-bar>

      <div class="pa-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </v-main>

    <!-- Toast snackbars -->
    <div style="position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px">
      <v-slide-x-reverse-transition group>
        <v-alert
          v-for="t in store.toasts"
          :key="t.id"
          :type="t.type === 'success' ? 'success' : t.type === 'error' ? 'error' : t.type === 'warning' ? 'warning' : 'info'"
          :title="t.title"
          :text="t.message"
          closable
          @click:close="store.removeToast(t.id)"
          density="compact"
          variant="tonal"
          rounded="lg"
          style="min-width:300px;max-width:400px;box-shadow:var(--shadow-lg)"
        />
      </v-slide-x-reverse-transition>
    </div>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const route = useRoute()

const headerBtnStyle = {
  color: 'var(--md-on-surface-variant)',
  borderRadius: 'var(--radius-full)',
  fontSize: 'var(--font-size-sm)',
}

const currentModule = computed(() => {
  if (route.path.startsWith('/datasource')) return 'datasource'
  return 'workspace'
})

const breadcrumbs = computed(() => {
  const items = []
  if (currentModule.value === 'workspace') {
    items.push({ title: '空间管理', to: '/workspace' })
    if (route.params.id) {
      const ws = store.workspaces.find(w => w.id === Number(route.params.id))
      if (ws) items.push({ title: ws.name, disabled: true })
    }
  } else {
    items.push({ title: '数据源管理', to: '/datasource' })
    if (route.params.id) {
      const ds = store.dataSources.find(d => d.id === Number(route.params.id))
      if (ds) items.push({ title: ds.name, disabled: true })
    }
  }
  return items
})
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}
.fade-enter-from { opacity: 0; transform: translateY(8px); }
.fade-leave-to { opacity: 0; }
</style>
