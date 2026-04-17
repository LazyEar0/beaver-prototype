<template>
  <v-app>
    <v-navigation-drawer permanent :width="220" color="#1E1B4B" theme="dark">
      <div class="sidebar-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <span>Beaver</span>
      </div>
      <v-list density="compact" nav class="px-2">
        <v-list-subheader class="text-white" style="opacity:0.5;font-size:11px;letter-spacing:1px">管理</v-list-subheader>
        <v-list-item
          prepend-icon="mdi-folder-outline"
          title="空间管理"
          :active="currentModule === 'workspace'"
          @click="$router.push('/workspace')"
          rounded="lg"
          color="white"
        />
        <v-list-item
          prepend-icon="mdi-database-outline"
          title="数据源管理"
          :active="currentModule === 'datasource'"
          @click="$router.push('/datasource')"
          rounded="lg"
          color="white"
        />
      </v-list>
      <template #append>
        <div class="pa-3 text-center" style="font-size:11px;opacity:0.3;color:#fff">&copy; 2025 DidaTravel 道旅科技</div>
      </template>
    </v-navigation-drawer>

    <v-main style="background:#F8FAFC;min-height:100vh">
      <v-app-bar flat color="white" density="compact" :elevation="0" style="border-bottom:1px solid #F1F5F9">
        <v-breadcrumbs :items="breadcrumbs" class="px-6">
          <template #divider><v-icon size="14">mdi-chevron-right</v-icon></template>
        </v-breadcrumbs>
        <v-spacer />
        <v-btn variant="text" size="small" prepend-icon="mdi-magnify" color="grey-darken-1" @click="store.showToast('info','全局搜索','该功能将在后续版本中实现')">搜索</v-btn>
        <v-btn variant="text" size="small" prepend-icon="mdi-help-circle-outline" color="grey-darken-1" @click="store.showToast('info','帮助中心','该功能将在后续版本中实现')">帮助</v-btn>
        <v-btn variant="text" size="small" prepend-icon="mdi-bell-outline" color="grey-darken-1" class="mr-1" @click="store.showToast('info','通知中心','该功能将在后续版本中实现')">
          通知
          <v-badge dot color="error" floating />
        </v-btn>
        <v-divider vertical class="mx-2" length="20" />
        <v-avatar size="30" color="primary" class="mr-2"><span class="text-white text-caption font-weight-bold">W</span></v-avatar>
        <span class="text-body-2 mr-4" style="color:#374151">Sukey Wu</span>
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
          style="min-width:300px;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.08)"
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.fade-enter-from { opacity: 0; transform: translateY(8px); }
.fade-leave-to { opacity: 0; }
</style>
