<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="mx-auto w-full max-w-6xl px-6 py-8">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">System Control</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-900">系统设置</h1>
          <p class="mt-2 text-sm text-slate-500">集中管理主题、LOGO、动画与业务运行参数</p>
        </div>
        <ModernButton variant="primary" @click="saveSettings">保存设置</ModernButton>
      </header>

      <main class="mt-8 space-y-8">
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">品牌与文本</h2>
              <p class="mt-1 text-sm text-slate-500">控制顶部导航品牌文本与分店显示</p>
            </div>
            <span class="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">Brand Text</span>
          </div>
          <div class="mt-6 grid gap-4 md:grid-cols-2">
            <div class="md:col-span-2">
              <label class="text-sm font-medium text-slate-700">品牌名称</label>
              <input v-model="brandSettings.brandName" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-700">系统名称</label>
              <input v-model="brandSettings.systemName" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium text-slate-700">分店名称</label>
              <input v-model="brandSettings.storeName" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div class="flex items-center gap-3">
              <input id="show-store" v-model="brandSettings.showStoreName" type="checkbox" class="h-4 w-4 accent-orange-500" />
              <label for="show-store" class="text-sm text-slate-600">显示分店名称</label>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">云数据库（Supabase）</h2>
              <p class="mt-1 text-sm text-slate-500">开启后启用云端同步与实时协同；关闭则纯本地运行</p>
            </div>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Cloud</span>
          </div>

          <div class="mt-6 space-y-4">
            <div class="flex items-center gap-3">
              <input id="cloud-enabled" v-model="cloudSettings.enabled" type="checkbox" class="h-4 w-4 accent-orange-500" />
              <label for="cloud-enabled" class="text-sm text-slate-700">开启云数据库（Supabase）</label>
            </div>

            <div v-if="cloudSettings.enabled" class="grid gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label class="text-sm font-medium text-slate-700">Supabase URL</label>
                <input v-model="cloudSettings.supabaseUrl" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://xxxx.supabase.co" />
              </div>
              <div class="md:col-span-2">
                <label class="text-sm font-medium text-slate-700">Supabase Anon Key</label>
                <input v-model="cloudSettings.supabaseAnonKey" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="sb_..." />
              </div>
              <p class="md:col-span-2 text-xs text-slate-500">提示：保存后需要重启应用或刷新页面让云连接按新配置初始化。</p>
            </div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">主题配置</h2>
                <p class="mt-1 text-sm text-slate-500">切换系统配色方案</p>
              </div>
              <span class="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">Theme</span>
            </div>
            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                v-for="theme in themes"
                :key="theme.id"
                class="flex items-center justify-between rounded-xl border px-4 py-3 text-left transition"
                :class="currentThemeId === theme.id ? 'border-orange-500 bg-orange-50/60 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
                @click="selectTheme(theme.id)"
              >
                <div class="flex items-center gap-3">
                  <span class="h-3 w-3 rounded-full" :style="{ background: theme.colors.primary }"></span>
                  <span class="h-2.5 w-2.5 rounded-full" :style="{ background: theme.colors.secondary }"></span>
                  <span class="text-sm font-medium text-slate-700">{{ theme.name }}</span>
                </div>
                <span v-if="currentThemeId === theme.id" class="text-sm font-semibold text-orange-600">已启用</span>
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">动画节奏</h2>
                <p class="mt-1 text-sm text-slate-500">控制界面动画的速度与风格</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Animation</span>
            </div>
            <div class="mt-6 space-y-4">
              <div>
                <label class="text-sm font-medium text-slate-700">动画持续时间</label>
                <div class="mt-2 flex items-center gap-4">
                  <input
                    v-model.number="animationSettings.duration"
                    type="range"
                    min="0"
                    max="500"
                    step="50"
                    class="h-2 w-full accent-orange-500"
                  />
                  <span class="text-sm font-semibold text-orange-600">{{ animationSettings.duration }}ms</span>
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-700">动画曲线</label>
                <select
                  v-model="animationSettings.transitionType"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option v-for="option in transitionTypes" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
              <button class="text-sm font-semibold text-orange-600" @click="togglePreview">预览动画</button>
              <div class="flex h-16 items-center">
                <Transition :name="transitionName" :duration="animationSettings.duration">
                  <div
                    v-if="showPreview"
                    class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-sm font-semibold text-white shadow"
                  >
                    Aa
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold">LOGO 视觉参数</h2>
              <p class="mt-1 text-sm text-slate-500">与顶部导航品牌模块一致</p>
            </div>
            <span class="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">Logo</span>
          </div>
          <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div class="space-y-4">
              <div>
                <label class="text-sm font-medium text-slate-700">风格模式</label>
                <select v-model="logoSettings.style" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="normal">基础</option>
                  <option value="led">LED</option>
                  <option value="neon">霓虹</option>
                  <option value="3d">3D</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-700">LOGO 高度</label>
                <div class="mt-2 flex items-center gap-4">
                  <input v-model.number="logoSettings.height" type="range" min="40" max="64" step="2" class="h-2 w-full accent-orange-500" />
                  <span class="text-sm font-semibold text-orange-600">{{ logoSettings.height }}px</span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-semibold text-slate-500">圆角</label>
                  <input v-model.number="logoSettings.borderRadius" type="number" min="0" max="24" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-slate-500">内边距</label>
                  <input v-model.number="logoSettings.padding" type="number" min="0" max="16" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-slate-500">发光强度</label>
                  <input v-model.number="logoSettings.glowIntensity" type="number" min="0" max="10" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div class="space-y-4">
              <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-semibold text-slate-500">实时预览</p>
                  <span class="text-[11px] font-semibold text-slate-400">Preview</span>
                </div>
                <div class="mt-4 inline-flex items-center gap-3" :style="logoPreviewStyle">
                  <div class="flex flex-col items-center justify-center" :style="logoSignStyle">
                    <div class="flex flex-col items-center gap-0.5">
                      <span v-for="(char, index) in storeChars" :key="`store-${index}`" :style="storeTextStyle">
                        {{ char }}
                      </span>
                    </div>
                  </div>
                  <div :style="logoTextBlockStyle">
                    <span :style="brandTextStyle">{{ brandSettings.brandName }}</span>
                    <span :style="systemTextStyle">{{ brandSettings.systemName }}</span>
                  </div>
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-3">
                <div>
                  <p class="text-xs font-semibold text-slate-500">品牌字号</p>
                  <input v-model.number="logoSettings.fontSize.brand" type="number" min="12" max="32" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">系统字号</p>
                  <input v-model.number="logoSettings.fontSize.system" type="number" min="12" max="32" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">分店字号</p>
                  <input v-model.number="logoSettings.fontSize.store" type="number" min="8" max="24" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">渐变起点</p>
                  <input v-model="logoSettings.bgGradientStart" type="color" class="mt-2 h-10 w-full rounded-xl border border-slate-200" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">渐变终点</p>
                  <input v-model="logoSettings.bgGradientEnd" type="color" class="mt-2 h-10 w-full rounded-xl border border-slate-200" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">文字颜色</p>
                  <input v-model="logoSettings.textColor" type="color" class="mt-2 h-10 w-full rounded-xl border border-slate-200" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-500">霓虹颜色</p>
                  <input v-model="logoSettings.neonColor" type="color" class="mt-2 h-10 w-full rounded-xl border border-slate-200" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">数据维护</h2>
                <p class="mt-1 text-sm text-slate-500">运行维护与安全操作</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">System</span>
            </div>
            <div class="mt-6 space-y-4">
              <div class="rounded-xl border border-slate-200 p-4">
                <p class="text-sm font-semibold text-slate-700">物理数据库备份</p>
                <p class="mt-1 text-xs text-slate-500">导出核心 SQLite 节点镜像</p>
                <ModernButton variant="secondary" size="sm" class="mt-3" label="备份镜像" />
              </div>
              <div class="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <p class="text-sm font-semibold text-rose-600">系统缓存清理</p>
                <p class="mt-1 text-xs text-rose-500">清除临时索引与状态碎片</p>
                <ModernButton variant="danger" size="sm" class="mt-3" label="立即清理" />
              </div>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">操作提示</h2>
                <p class="mt-1 text-sm text-slate-500">更改设置后请同步刷新客户端</p>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Guide</span>
            </div>
            <ul class="mt-6 space-y-3 text-sm text-slate-500">
              <li>• 主题配置立即生效，LOGO 参数请重启应用查看。</li>
              <li>• 霓虹与发光强度仅在支持模式下可见。</li>
              <li>• 数据维护操作需要管理员权限。</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';
import { storeToRefs } from 'pinia';
import ModernButton from '../components/ui/ModernButton.vue';
import { useThemeStore, themes } from '../stores/theme';
import { useToast } from '../composables/useToast';
import { useSettingsStore } from '../stores/settings';

// Theme store
const themeStore = useThemeStore();
const currentThemeId = computed(() => themeStore.currentThemeId);
const { success } = useToast();

const selectTheme = (themeId: string) => {
  themeStore.setTheme(themeId);
};

const settingsStore = useSettingsStore();
settingsStore.init();

const { brandSettings, logoSettings, animationSettings, cloudSettings } = storeToRefs(settingsStore);
const showPreview = computed(() => settingsStore.animationSettings.duration >= 0);
const transitionTypes = [
  { value: 'ease', label: '平滑' },
  { value: 'linear', label: '线性' },
  { value: 'cubic', label: '弹性' },
];

const transitionName = computed(() => {
  return `transition-${animationSettings.value.transitionType}`;
});

const togglePreview = () => {
  settingsStore.animationSettings.duration = settingsStore.animationSettings.duration;
};

const storeChars = computed(() => {
  const value = brandSettings.value.storeName || '';
  return value.split('').filter((char) => char.trim().length > 0);
});

const logoPreviewStyle = computed<CSSProperties>(() => {
  const { height, padding, borderRadius, bgGradientStart, bgGradientEnd, glowIntensity, neonColor } = logoSettings.value;
  const glow = Math.max(0, glowIntensity || 0);
  const glowColor = logoSettings.value.style === 'neon' ? neonColor : 'rgba(249, 115, 22, 0.35)';

  return {
    height: `${height}px`,
    padding: `${padding}px`,
    borderRadius: `${borderRadius}px`,
    background: `linear-gradient(135deg, ${bgGradientStart} 0%, ${bgGradientEnd} 100%)`,
    boxShadow: glow > 0 ? `0 0 ${glow * 6}px ${glowColor}` : 'none',
  };
});

const logoSignStyle = computed<CSSProperties>(() => ({
  height: `${logoSettings.value.height}px`,
  width: '20px',
  padding: '2px',
  borderRadius: '6px',
  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  boxShadow: logoSettings.value.style === 'neon' ? `0 0 12px ${logoSettings.value.neonColor}` : 'none',
}));

const storeTextStyle = computed<CSSProperties>(() => ({
  fontSize: `${logoSettings.value.fontSize.store}px`,
  color: '#fff',
  lineHeight: '1.1',
  fontWeight: '500',
}));

const logoTextBlockStyle = computed<CSSProperties>(() => ({
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  gap: `${logoSettings.value.verticalGap}px`,
  paddingTop: `${logoSettings.value.paddingTop}px`,
}));

const brandTextStyle = computed<CSSProperties>(() => ({
  fontSize: `${logoSettings.value.fontSize.brand}px`,
  fontWeight: '600',
  color: logoSettings.value.textColor,
  lineHeight: '1.2',
}));

const systemTextStyle = computed<CSSProperties>(() => ({
  fontSize: `${logoSettings.value.fontSize.system}px`,
  fontWeight: '600',
  color: logoSettings.value.textColor,
  lineHeight: '1.2',
  letterSpacing: '0.08em',
}));

const saveSettings = async () => {
  await settingsStore.syncToCloud();
  success('设置已保存并已同步');
};
</script>

<style scoped>
.transition-ease-enter-active,
.transition-ease-leave-active {
  transition: all var(--animation-duration, 200ms) ease;
}

.transition-ease-enter-from,
.transition-ease-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.transition-linear-enter-active,
.transition-linear-leave-active {
  transition: all var(--animation-duration, 200ms) linear;
}

.transition-linear-enter-from,
.transition-linear-leave-to {
  opacity: 0;
}

.transition-cubic-enter-active,
.transition-cubic-leave-active {
  transition: all var(--animation-duration, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

.transition-cubic-enter-from,
.transition-cubic-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
</style>
