<template>
  <div class="h-full flex flex-col gap-6 p-8 bg-transparent overflow-hidden">
    <!-- Header Area -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex flex-col">
        <h1 class="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <span class="text-2xl">🔐</span> 系统访问权限控制
        </h1>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] opacity-70">Access Control List (ACL)</span>
          <div class="w-1 h-1 rounded-full bg-gray-300"></div>
          <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">配置角色行为边界与审计日志</span>
        </div>
      </div>
      <button 
        @click="savePermissions"
        class="h-12 px-8 bg-brand-orange text-white rounded-xl font-black text-sm shadow-xl shadow-orange-100/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
        同步权限架构 SYNC ACL
      </button>
    </div>

    <div class="flex-1 flex gap-6 overflow-hidden">
      <!-- Left Column: Permission Matrix -->
      <div class="flex-[3] flex flex-col gap-6 overflow-hidden">
        <div class="glass-panel rounded-[32px] border border-white/60 shadow-2xl flex-1 overflow-hidden flex flex-col">
          <div ref="permissionsTableContainerRef" class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-2">
            <div
              class="origin-top-left"
              :style="{ transform: `scale(${permissionsScale})`, width: permissionsTargetWidth ? `${permissionsTargetWidth}px` : 'auto' }"
            >
            <table
              ref="permissionsTableRef"
              class="border-collapse table-fixed"
              :style="{ width: permissionsTargetWidth ? `${permissionsTargetWidth}px` : 'auto' }"
            >
              <colgroup v-if="permissionsColWidths.length">
                <col v-for="(w, idx) in permissionsColWidths" :key="idx" :style="{ width: `${w}px` }" />
              </colgroup>
              <thead class="sticky top-0 z-10 bg-white/40 backdrop-blur-md">
                <tr class="h-14 border-b border-gray-100 font-black text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                  <th class="text-left pl-10 pr-4 whitespace-nowrap">功能模块与权限描述 / MODULES</th>
                  <th class="text-center px-4 whitespace-nowrap text-red-400/80">超级管理员</th>
                  <th class="text-center px-4 whitespace-nowrap text-orange-400/80">股东节点</th>
                  <th class="text-center px-4 whitespace-nowrap text-blue-400/80">终端员工</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50/50">
                <tr 
                  v-for="permission in permissions" 
                  :key="permission.id"
                  class="h-16 luxury-table-row group transition-all"
                >
                  <td class="pl-10 pr-4 relative whitespace-nowrap">
                     <div class="flex flex-col">
                       <span class="font-black text-gray-800 text-[14px] group-hover:text-brand-orange transition-colors">{{ permission.name }}</span>
                       <span class="text-[10px] font-bold text-gray-400 leading-none mt-1 uppercase tracking-wider">{{ permission.description }}</span>
                     </div>
                  </td>
                  <td class="px-4 whitespace-nowrap">
                    <div class="flex items-center justify-center">
                       <label class="relative inline-flex items-center cursor-pointer">
                         <input type="checkbox" v-model="permission.admin" class="sr-only peer">
                         <div class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                       </label>
                    </div>
                  </td>
                  <td class="px-4 whitespace-nowrap">
                    <div class="flex items-center justify-center">
                       <label class="relative inline-flex items-center cursor-pointer">
                         <input type="checkbox" v-model="permission.boss" class="sr-only peer">
                         <div class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                       </label>
                    </div>
                  </td>
                  <td class="px-4 whitespace-nowrap">
                    <div class="flex items-center justify-center">
                       <label class="relative inline-flex items-center cursor-pointer">
                         <input type="checkbox" v-model="permission.employee" class="sr-only peer">
                         <div class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                       </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Audit Logs -->
      <div class="flex-[1.2] flex flex-col gap-6 overflow-hidden">
        <div class="glass-panel rounded-[32px] border border-white/60 shadow-xl overflow-hidden flex flex-col">
           <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/40">
             <div class="flex flex-col">
               <span class="font-black text-gray-800 text-[14px] tracking-tight">操作审计日志</span>
               <span class="text-[8px] font-black text-orange-400 uppercase tracking-widest">Global Audit Trail</span>
             </div>
             <button class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors">
               <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
             </button>
           </div>
           
           <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <div 
                v-for="log in operationLogs" 
                :key="log.id"
                class="bg-white/40 backdrop-blur-md rounded-2xl p-4 border border-white/80 hover:border-brand-orange/20 transition-all hover:shadow-md group"
              >
                <div class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-black text-gray-400 font-mono">{{ log.time }}</span>
                    <div class="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></div>
                  </div>
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-xl bg-brand-dark/5 flex items-center justify-center shrink-0">
                       <span class="text-[10px] font-black text-brand-dark">{{ log.user[0] }}</span>
                    </div>
                    <div class="flex flex-col">
                      <div class="text-[12px] font-black text-gray-700 leading-none mb-1">
                        <span class="text-brand-orange">{{ log.user }}</span>
                        <span class="mx-1.5 text-gray-300 font-normal">executed</span>
                        {{ log.action }}
                      </div>
                      <span class="text-[10px] font-bold text-gray-400 truncate">{{ log.target }}</span>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useAutoFitTable } from '../composables/useAutoFitTable';
import { useToast } from '../composables/useToast';

interface Permission {
  id: string;
  name: string;
  description: string;
  admin: boolean;
  boss: boolean;
  employee: boolean;
}

interface OperationLog {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

const permissions = ref<Permission[]>([
  { id: '1', name: '收银台', description: 'POS收银、结账、盘点', admin: true, boss: true, employee: true },
  { id: '2', name: '商品管理', description: '添加、编辑、删除商品', admin: true, boss: true, employee: false },
  { id: '3', name: '交班记录', description: '查看交班历史、导出报表', admin: true, boss: true, employee: true },
  { id: '4', name: '财务管理', description: '支出表、入账表、财务审核', admin: true, boss: true, employee: false },
  { id: '5', name: '用户管理', description: '管理员工账号、创建用户', admin: true, boss: false, employee: false },
  { id: '6', name: '权限管理', description: '配置角色权限、ACL控制', admin: true, boss: false, employee: false },
  { id: '7', name: '系统设置', description: '修改系统配置、主题设置', admin: true, boss: false, employee: false },
  { id: '8', name: '数据导出', description: '导出报表、备份数据', admin: true, boss: true, employee: false },
  { id: '9', name: '接班选择', description: '选择接班人、发起交班', admin: true, boss: true, employee: true },
]);

const operationLogs = ref<OperationLog[]>([
  { id: '1', user: '莫健', action: '修改了', target: '商品: 可口可乐库存', time: '2分钟前' },
  { id: '2', user: '黄河', action: '完成了', target: '早班交班记录', time: '15分钟前' },
  { id: '3', user: '莫健', action: '重置了', target: '用户: 刘杰 的密码', time: '1小时前' },
  { id: '4', user: '朱晓培', action: '查看了', target: '财务支出表', time: '2小时前' },
  { id: '5', user: '莫健', action: '修改了', target: '权限配置: 财务管理', time: '3小时前' },
  { id: '6', user: '史红', action: '创建了', target: '商品: 农夫山泉', time: '5小时前' },
]);

onMounted(async () => {
  // TODO: 从API加载权限配置和操作日志
});

const permissionsTableContainerRef = ref<HTMLDivElement | null>(null);
const permissionsTableRef = ref<HTMLTableElement | null>(null);
const permissionsFit = useAutoFitTable(permissionsTableContainerRef, permissionsTableRef, {
  getHeaders: () => ['功能模块与权限描述 / MODULES', '超级管理员', '股东节点', '终端员工'],
  getRows: () => permissions.value,
  getRowValues: (p) => [
    `${String(p.name || '')} ${String(p.description || '')}`,
    p.admin ? 'ON' : 'OFF',
    p.boss ? 'ON' : 'OFF',
    p.employee ? 'ON' : 'OFF',
  ],
  safetyGapPx: 8,
  minColPx: 96,
  padXByCol: [96, 40, 40, 40],
  watchDeps: () => [permissions.value.length],
});

const permissionsScale = computed(() => permissionsFit.scale.value);
const permissionsTargetWidth = computed(() => permissionsFit.targetWidth.value);
const permissionsColWidths = computed(() => permissionsFit.colWidths.value);
const { success } = useToast();

const savePermissions = async () => {
  const adminCount = permissions.value.filter(p => p.admin).length;
  const bossCount = permissions.value.filter(p => p.boss).length;
  const employeeCount = permissions.value.filter(p => p.employee).length;
  
  operationLogs.value.unshift({
    id: Date.now().toString(),
    user: '当前用户',
    action: '同步了',
    target: `权限配置 (${adminCount}/${permissions.value.length} 管理员, ${bossCount}/${permissions.value.length} 股东, ${employeeCount}/${permissions.value.length} 员工)`,
    time: '刚刚'
  });
  
  success(`权限配置已保存\n\n超级管理员权限: ${adminCount} 项\n股东节点权限: ${bossCount} 项\n终端员工权限: ${employeeCount} 项`);
};
</script>

<style scoped>
.luxury-table-row:hover {
  background: linear-gradient(90deg, rgba(249, 115, 22, 0.05) 0%, rgba(255, 255, 255, 0) 100%);
}
</style>
