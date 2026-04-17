import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/workspace',
  },
  {
    path: '/workspace',
    name: 'WorkspaceList',
    component: () => import('@/views/WorkspaceList.vue'),
  },
  {
    path: '/workspace/:id',
    name: 'WorkspaceDetail',
    component: () => import('@/views/WorkspaceDetail.vue'),
    props: route => ({ id: Number(route.params.id) }),
  },
  {
    path: '/datasource',
    name: 'DatasourceList',
    component: () => import('@/views/DatasourceList.vue'),
  },
  {
    path: '/datasource/:id',
    name: 'DatasourceDetail',
    component: () => import('@/views/DatasourceDetail.vue'),
    props: route => ({ id: Number(route.params.id) }),
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
