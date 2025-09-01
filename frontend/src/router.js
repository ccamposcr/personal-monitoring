import { createRouter, createWebHistory } from 'vue-router'
import MixerView from './views/MixerView.vue'

const routes = [
  {
    path: '/',
    name: 'mixer',
    component: MixerView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router