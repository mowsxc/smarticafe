<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'success', name: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const searchName = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);

const employees = ref<string[]>([]);
const bosses = ref<string[]>([]);

watch(() => props.isOpen, async (val) => {
  if (val) {
    searchName.value = '';
    password.value = '';
    showPassword.value = false;
    errorMessage.value = '';
    const list = await authStore.fetchPickList();
    employees.value = list.employees;
    bosses.value = list.bosses;
  }
});

const handleSearch = async () => {
  const name = searchName.value.trim();
  errorMessage.value = '';
  
  if (employees.value.includes(name)) {
    // 员工直接交接 (免密且自动触发)
    emit('success', name);
    return;
  }
  
  if (bosses.value.includes(name)) {
    showPassword.value = true;
  } else {
    showPassword.value = false;
  }
};

const handleBossLogin = async () => {
  if (!password.value) return;
  isLoading.value = true;
  errorMessage.value = '';
  try {
     // 验证密码逻辑
     await authStore.login(searchName.value.trim(), password.value);
     // 验证成功后，触发成功事件
     emit('success', searchName.value.trim());
  } catch (e: any) {
     errorMessage.value = e.message || '密码验证失败';
  } finally {
     isLoading.value = false;
  }
};

const suggests = computed(() => {
  const query = searchName.value.toLowerCase().trim();
  const all = [...bosses.value, ...employees.value];
  if (!query) return all.slice(0, 10);
  return all.filter(n => n.toLowerCase().includes(query)).slice(0, 10);
});

const selectSuggest = (name: string) => {
  searchName.value = name;
  handleSearch();
};
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <Transition name="scale" appear>
        <div v-if="isOpen" class="w-full max-w-[400px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col p-10 space-y-8">
          
          <div class="text-center space-y-2">
            <div class="w-16 h-16 bg-linear-to-tr from-brand-orange to-orange-400 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-orange-200/50 mb-4 transition-transform hover:rotate-12">
               <span class="text-2xl text-white font-black">H</span>
            </div>
            <h3 class="text-2xl font-black text-slate-800 tracking-tight">交接班验证</h3>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Handover Verification</p>
          </div>

          <div class="space-y-6">
            <!-- 名字输入 -->
            <div class="relative group">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block text-center">接班人姓名</label>
              <input 
                v-model="searchName"
                @input="handleSearch"
                type="text"
                placeholder="选取或输入姓名"
                class="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-center text-lg font-bold text-slate-800 focus:border-brand-orange/30 focus:bg-white outline-none transition-all"
                autofocus
              />
              
              <!-- 建议 -->
              <div v-if="!showPassword && suggests.length > 0" class="flex flex-wrap justify-center gap-2 mt-6">
                <button 
                  v-for="name in suggests" 
                  :key="name"
                  @click="selectSuggest(name)"
                  class="px-4 py-2 rounded-full bg-slate-100/50 hover:bg-brand-orange/10 hover:text-brand-orange text-xs font-bold text-slate-500 transition-all border border-transparent hover:border-brand-orange/20"
                >
                  {{ name }}
                </button>
              </div>
            </div>

            <!-- 密码输入 (如果是股东) -->
            <Transition name="slide-up">
              <div v-if="showPassword" class="space-y-4 pt-4 border-t border-slate-50">
                <div class="relative">
                  <input 
                    v-model="password"
                    @keyup.enter="handleBossLogin"
                    type="password"
                    placeholder="输入该账户密码"
                    class="w-full h-14 bg-white border-2 border-brand-orange/30 rounded-2xl px-6 text-center text-lg font-mono outline-none focus:border-brand-orange shadow-lg shadow-orange-500/5"
                    autofocus
                  />
                  <div v-if="isLoading" class="absolute right-4 top-1/2 -translate-y-1/2">
                    <div class="w-4 h-4 border-2 border-brand-orange border-t-transparent animate-spin rounded-full"></div>
                  </div>
                </div>
                <button 
                  @click="handleBossLogin"
                  class="w-full h-14 bg-brand-orange hover:bg-orange-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                >
                  验证并接班
                </button>
              </div>
            </Transition>

            <!-- 错误提示 -->
            <p v-if="errorMessage" class="text-center text-xs font-bold text-red-500 animate-pulse">{{ errorMessage }}</p>
          </div>

          <button @click="emit('close')" class="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
            取消交班
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  backdrop-filter: blur(12px);
}
.scale-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
.slide-up-enter-active {
  transition: all 0.3s ease-out;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
</style>
