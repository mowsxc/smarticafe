<script setup lang="ts">
import { type Product } from '../../api/products';

defineProps<{
  product: Product;
}>();

defineEmits<{
  (e: 'add', p: Product): void;
  (e: 'double-add', p: Product): void;
}>();

// Double-click handler
const handleDoubleClick = (event: MouseEvent) => {
  event.preventDefault();
  // Visual feedback for double-click
  const card = (event.currentTarget as HTMLElement);
  card.classList.add('animate-pulse');
  setTimeout(() => {
    card.classList.remove('animate-pulse');
  }, 300);
};
</script>

<template>
  <div 
    @click="$emit('add', product)"
    @dblclick="handleDoubleClick($event)"
    class="relative bg-white/70 backdrop-blur-md p-4 rounded-[24px] border border-white shadow-[0_8px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(249,115,22,0.1)] hover:border-brand-orange/30 cursor-pointer transition-all duration-200 active:scale-95 group overflow-hidden"
    title="双击快速添加"
  >
    <!-- Hover Shine Effect -->
    <div class="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"></div>

    <div class="flex flex-col h-full relative z-10">
      <div class="flex justify-between items-start mb-2">
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 bg-white/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60 shadow-sm">
          {{ product.category || '未分类' }}
        </span>
        <div v-if="product.stock <= 5" class="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
          <div class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
          <span class="text-[8px] font-black text-red-500">库存紧张</span>
        </div>
      </div>

      <div class="font-black text-gray-800 text-[15px] mb-4 group-hover:text-brand-orange transition-colors duration-200 line-clamp-2 leading-tight min-h-[2.5em] tracking-tight">
        {{ product.name }}
      </div>

      <div class="mt-auto flex items-end justify-between">
        <div class="flex flex-col">
          <div class="flex flex-col leading-none mb-1.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-200">
            <span class="text-[9px] font-black text-gray-500">标准售价</span>
            <span class="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Price Unit</span>
          </div>
          <div class="flex items-baseline gap-0.5">
            <span class="text-[12px] font-bold text-gray-400">¥</span>
            <span class="font-mono text-2xl font-black text-gray-900 tracking-tighter leading-none group-hover:text-brand-orange transition-colors duration-200">{{ product.unit_price }}</span>
          </div>
        </div>
        <div 
          class="flex flex-col items-center px-3 py-1.5 rounded-xl transition-all duration-200 shadow-sm"
          :class="product.stock > 0 ? 'bg-white/80 text-gray-700 border border-white/60 group-hover:bg-brand-dark group-hover:text-white group-hover:border-brand-dark shadow-xl shadow-black/5' : 'bg-red-50 text-red-500 border border-red-100 placeholder-pulse'"
        >
          <span class="text-[10px] font-black">{{ product.stock > 0 ? `库存 ${product.stock}` : '已售罄' }}</span>
          <span class="text-[6px] font-bold opacity-40 uppercase tracking-tighter">{{ product.stock > 0 ? 'Stock' : 'Empty' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
