import { createRouter, createWebHistory } from 'vue-router'
import UsersManagement from '@/views/admin/UsersManagement.vue'
import SecurityLogs from '@/views/admin/SecurityLogs.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import SystemManagement from '@/views/admin/SystemManagement.vue'
import UserDashboard from '@/views/users/UserDashboard.vue'
import QrCodeGenerate from '@/views/users/QrCodeGenerate.vue'
import MyLogs from '@/views/users/MyLogs.vue'
import MyNotification from '@/views/users/MyNotification.vue'
import ContactUs from '@/views/users/ContactUs.vue'
import LoginView from '../views/LoginView.vue'
import SecurityDashboard from '@/views/security/SecurityDashboard.vue'
import SecuQRCode from '@/views/security/SecuQRCode.vue'
import UserLogs from '@/views/security/UserLogs.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: LoginView,
  },
  {
    path: '/login',
    redirect: '/'
  },
  {
    path:'/dashboard',
    name: 'dashboard',
    component: AdminDashboard
  },
  {
    path: '/users-management',
    name: 'users-management',
    component: UsersManagement 
  },
  {
    path: '/security-logs',
    name: 'security-logs',
    component: SecurityLogs
  },
  {
    path: '/system-management',
    name: 'system-management',
    component: SystemManagement
  },
  {
    path: '/user-dashboard',
    name: 'user-dashboard',
    component: UserDashboard,
  },
  {
    path: '/qrcode-generate',
    name: 'qrcode-generate',
    component: QrCodeGenerate,
  },
  {
    path: '/my-logs',
    name: 'my-logs',
    component: MyLogs,
  },
  {
    path: '/user-notification',
    name: 'user-notification',
    component: MyNotification,
  },
  {
    path: '/contact-us',
    name: 'contact-us',
    component: ContactUs,
  },
  {
    path: '/security-dashboard',
    name: 'security-dashboard',
    component: SecurityDashboard
  },
  {
    path: '/secu-qrcode-generator',
    name: 'secu-qrcode-generator',
    component: SecuQRCode
  },
  {
    path: '/user-logs',
    name: 'user-logs',
    component: UserLogs
  },

]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
