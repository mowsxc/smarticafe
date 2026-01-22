<script setup lang="ts">
import { type CartItem } from '../../stores/cart';

defineProps<{
  item: CartItem;
}>();

defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'add', item: CartItem): void;
}>();
</script>

<template>
  <div class="flex items-center gap-3 p-3 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div class="flex-1 min-w-0">
      <div class="font-black text-gray-900 text-[14px] truncate tracking-tight group-hover:text-brand-orange transition-colors">
        {{ item.name }}
      </div>
      <div class="flex items-center gap-2 mt-0.5">
        <div class="flex flex-col leading-none">
          <span class="text-[8px] font-bold text-gray-400">单价 / Unit</span>
          <span class="font-mono font-black text-[11px] text-gray-600 tracking-tighter">¥{{ item.unit_price }}</span>
        </div>
      </div>
    </div>
    
    <div class="flex items-center gap-4">
      <!-- Quantity Controls -->
      <div class="flex items-center bg-white/40 backdrop-blur-md p-1 rounded-xl border border-white h-9 shadow-inner">
        <button 
          @click="$emit('remove', item.id)" 
          class="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white hover:shadow-lg hover:shadow-red-100 transition-all active:scale-90"
        >
          <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="5"><path d="M5 12h14"/></svg>
        </button>
        <span class="font-mono font-black text-[13px] w-8 text-center text-gray-800">{{ item.quantity }}</span>
        <button 
          @click="$emit('add', item)" 
          class="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-white hover:shadow-lg hover:shadow-emerald-100 transition-all active:scale-90"
        >
          <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      <!-- Subtotal -->
      <div class="w-20 text-right flex flex-col items-end">
        <div class="flex flex-col items-end leading-none mb-0.5">
          <span class="text-[8px] font-black text-gray-400">合计</span>
          <span class="text-[6px] font-bold text-gray-300 uppercase">Subtotal</span>
        </div>
        <div class="font-mono font-black text-gray-900 text-[16px] tracking-tighter leading-none group-hover:text-brand-orange transition-colors">
          ¥{{ (item.unit_price * item.quantity).toFixed(2) }}
        </div>
      </div>
    </div>
  </div>
</template>
