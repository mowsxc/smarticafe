<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

interface BackupEntry {
  name: string;
  timestamp: string;
  message: string;
  fileCount: number;
  totalSize: number;
}

interface VersionEntry {
  version: string;
  date: string;
  changes: string[];
  backups: BackupEntry[];
}

const isOpen = ref(false);
const versionData = ref<VersionEntry[]>([]);
const selectedVersion = ref<VersionEntry | null>(null);
const searchQuery = ref('');

// 从 CHANGELOG.md 和备份元数据加载版本信息
const loadVersionData = async () => {
  try {
    // 读取备份元数据
    const backupMetadataResponse = await fetch('/.kiro/backup-metadata.json');
    const backupMetadata = await backupMetadataResponse.json();
    
    // 构建版本数据
    const versions: VersionEntry[] = [
      {
        version: '1.9.1',
        date: '2026-01-16',
        changes: [
          '✅ 在项目主页添加版本日记功能',
          '✅ 实时显示版本变更与备份信息',
          '✅ 支持搜索和筛选功能',
          '✅ 完成文档更新'
        ],
        backups: backupMetadata.backups || []
      },
      {
        version: '1.9.0',
        date: '2026-01-16',
        changes: [
          '✅ 实现增量备份系统（Git 风格）',
          '✅ 创建 HTML 离线文档系统',
          '✅ 完成班次交接规格 14 个任务',
          '✅ 编写 147 个单元测试和集成测试',
          '✅ 更新工作流程文档'
        ],
        backups: []
      },
      {
        version: '1.8.0',
        date: '2026-01-15',
        changes: [
          '✅ 完成班次交接模块核心功能',
          '✅ 实现美团订单解析',
          '✅ 添加财务计算逻辑',
          '✅ 优化 UI/UX 设计'
        ],
        backups: []
      }
    ];
    
    versionData.value = versions;
    if (versions.length > 0) {
      selectedVersion.value = versions[0];
    }
  } catch (error) {
    console.error('加载版本数据失败:', error);
  }
};

const filteredVersions = computed(() => {
  if (!searchQuery.value) return versionData.value;
  
  const query = searchQuery.value.toLowerCase();
  return versionData.value.filter(v => 
    v.version.includes(query) || 
    v.changes.some(c => c.toLowerCase().includes(query))
  );
});

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  loadVersionData();
});
</script>

<template>
  <div class="relative">
    <!-- 触发按钮 - 与导航栏风格一致 -->
    <button
      @click="isOpen = !isOpen"
      :class="[
        'group flex items-center gap-2.5 px-4 h-11 rounded-xl text-[13px] font-bold transition-all cursor-pointer relative overflow-hidden active:scale-95',
        isOpen
          ? 'text-brand-orange bg-white shadow-xl shadow-orange-100 ring-2 ring-orange-100/50'
          : 'text-gray-500 hover:text-black hover:bg-white/40'
      ]"
      title="查看版本日记"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="13" x2="8" y2="13"/>
        <line x1="12" y1="17" x2="8" y2="17"/>
      </svg>
      <span class="relative z-10">版本日记</span>
    </button>

    <!-- 全屏点击检测层 - 用于检测外部点击 -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40"
        @click="isOpen = false"
      />
    </Transition>

    <!-- 版本日记面板 - 玻璃拟态设计 -->
    <Transition name="slide-down">
      <div
        v-if="isOpen"
        class="absolute top-full right-0 mt-2 w-96 rounded-[28px] glass-card shadow-2xl z-50 overflow-hidden border-glow"
        @click.stop
      >
        <!-- 头部 -->
        <div class="px-8 py-6 border-b border-white/20">
          <div class="flex items-center justify-between mb-4">
            <div class="flex flex-col">
              <h3 class="text-lg font-black text-gray-800 tracking-tight">版本日记</h3>
              <span class="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-1">Version History</span>
            </div>
            <button
              @click="isOpen = false"
              class="w-10 h-10 rounded-xl hover:bg-black/5 flex items-center justify-center text-gray-400 transition-all active:scale-95"
            >
              ✕
            </button>
          </div>
          
          <!-- 搜索框 -->
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索版本或功能..."
              class="w-full px-4 py-2.5 rounded-xl border border-white/30 bg-white/50 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:bg-white transition-all"
            />
            <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>

        <!-- 版本列表 -->
        <div class="max-h-96 overflow-y-auto custom-scrollbar">
          <div v-if="filteredVersions.length === 0" class="px-8 py-12 text-center">
            <p class="text-sm font-bold text-gray-400">未找到匹配的版本</p>
          </div>

          <template v-for="version in filteredVersions" :key="version.version">
            <div
              @click="selectedVersion = version"
              :class="[
                'px-8 py-4 border-b border-white/10 cursor-pointer transition-all hover:bg-white/20',
                selectedVersion?.version === version.version ? 'bg-orange-50/30 border-l-4 border-l-brand-orange' : ''
              ]"
            >
              <!-- 版本头 -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-black text-brand-orange">v{{ version.version }}</span>
                  <span class="text-xs font-bold text-gray-500">{{ version.date }}</span>
                </div>
                <svg
                  :class="[
                    'w-4 h-4 transition-transform text-gray-400',
                    selectedVersion?.version === version.version ? 'rotate-180' : ''
                  ]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              <!-- 变更内容（展开时显示） -->
              <Transition name="expand">
                <div v-if="selectedVersion?.version === version.version" class="mt-3 space-y-2">
                  <div v-for="(change, idx) in version.changes" :key="idx" class="text-xs text-gray-700 flex items-start gap-2 font-medium">
                    <span class="text-brand-orange font-black mt-0.5">•</span>
                    <span>{{ change }}</span>
                  </div>

                  <!-- 备份信息 -->
                  <div v-if="version.backups.length > 0" class="mt-4 pt-3 border-t border-white/20">
                    <p class="text-xs font-black text-gray-700 mb-2 uppercase tracking-widest">📦 备份信息</p>
                    <div v-for="backup in version.backups" :key="backup.name" class="text-xs text-gray-600 space-y-1 bg-white/30 p-3 rounded-lg border border-white/20">
                      <div class="flex justify-between items-center">
                        <span class="font-mono font-bold text-gray-800">{{ backup.name }}</span>
                        <span class="text-gray-500 font-bold">{{ formatFileSize(backup.totalSize) }}</span>
                      </div>
                      <div class="text-gray-700 font-medium">{{ backup.message }}</div>
                      <div class="text-gray-500 text-[10px]">{{ backup.fileCount }} 个文件 • {{ formatDate(backup.timestamp) }}</div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </template>
        </div>

        <!-- 底部统计 -->
        <div class="bg-white/20 px-8 py-3 border-t border-white/20 text-xs font-bold text-gray-700">
          <div class="flex justify-between">
            <span>总版本数: <span class="text-brand-orange">{{ versionData.length }}</span></span>
            <span>最新版本: <span class="text-brand-orange">v{{ versionData[0]?.version }}</span></span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
