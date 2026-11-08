import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/HomePage.vue')
    },
    {
      path: '/quiz/:subjectId',
      name: 'quiz',
      component: () => import('../pages/QuizPage.vue')
    },
    {
      path: '/quiz/:subjectId/result',
      name: 'result',
      component: () => import('../pages/ResultPage.vue')
    },
    {
      path: '/wrong',
      name: 'wrong',
      component: () => import('../pages/WrongBookPage.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
