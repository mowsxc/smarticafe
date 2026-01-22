<template>
  <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-orange-50 via-white to-orange-50 p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="brand-vertical bg-brand-orange text-white text-sm font-black py-2 px-1 rounded leading-none tracking-widest shadow-lg select-none writing-vertical-rl">
            草场地
          </div>
          <div class="flex flex-col leading-none">
            <div class="text-3xl font-extrabold text-gray-800 tracking-tight">
              创新意 电竞馆
            </div>
            <div class="text-xs font-bold text-gray-400 tracking-widest mt-2 uppercase scale-90 origin-left">
              CHUANGXINYI
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-500">智慧管理系统 v2.0</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <h2 class="text-2xl font-black text-gray-800 mb-6 text-center">登录系统</h2>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- 用户名选择 -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">选择用户</label>
            <select 
              v-model="pickName" 
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 outline-none transition-all"
              required
            >
              <option value="">请选择...</option>
              <option v-for="emp in employees" :key="emp" :value="emp">{{ emp }}</option>
              <option v-for="boss in bosses" :key="boss" :value="boss">{{ boss }} (管理员)</option>
            </select>
          </div>

          <!-- 密码输入 -->
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2">密码</label>
            <input 
              v-model="password" 
              type="password"
              placeholder="请输入密码"
              class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 outline-none transition-all"
              required
            />
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMessage" class="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm text-red-600">
            {{ errorMessage }}
          </div>

          <!-- 登录按钮 -->
          <button 
            type="submit"
            :disabled="loading"
            class="w-full bg-brand-orange hover:bg-orange-600 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-orange-200 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">登录中...</span>
            <span v-else>登录</span>
          </button>
        </form>

        <!-- 提示信息 -->
        <div class="mt-6 text-center text-xs text-gray-400">
          <p>请使用您的账号和密码登录</p>
          <p class="mt-1">如有问题请联系管理员</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center text-xs text-gray-400">
        <p>© 2026 创新意电竞馆 · 智慧管理系统</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const pickName = ref('');
const password = ref('');
const employees = ref<string[]>([]);
const bosses = ref<string[]>([]);
const loading = ref(false);
const errorMessage = ref('');

// 加载用户列表
onMounted(async () => {
  try {
    const pickList = await authStore.fetchPickList();
    employees.value = pickList.employees || [];
    bosses.value = pickList.bosses || [];
  } catch (error) {
    console.error('加载用户列表失败:', error);
    errorMessage.value = '加载用户列表失败';
  }
});

// 处理登录
const handleLogin = async () => {
  errorMessage.value = '';
  loading.value = true;

  try {
    await authStore.login(pickName.value, password.value);
    
    // 登录成功，重定向
    const redirect = (route.query.redirect as string) || '/cashier';
    router.push(redirect);
  } catch (error: any) {
    errorMessage.value = error.message || '登录失败，请检查用户名和密码';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.brand-vertical {
  text-orientation: upright;
}
</style>
