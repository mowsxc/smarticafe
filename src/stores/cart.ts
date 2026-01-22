import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type Product } from '../api/products';
import { tauriCmd } from '../utils/tauri';
import { useAuthStore } from './auth';
import { getSyncService } from '../services/supabase/client';

export interface CartItem extends Product {
  quantity: number;
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);
  const auth = useAuthStore();

  const totalAmount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  });

  const addToCart = (product: Product) => {
    const existing = items.value.find(prev => prev.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.value.push({ ...product, quantity: 1 });
    }
  };

  const removeFromCart = (productId: string) => {
    const index = items.value.findIndex(item => item.id === productId);
    if (index > -1) {
      if (items.value[index].quantity > 1) {
        items.value[index].quantity -= 1;
      } else {
        items.value.splice(index, 1);
      }
    }
  };

  const clearCart = () => {
    items.value = [];
  };

  const checkout = async (employee: string, shift: string) => {
    if (items.value.length === 0) return;
    if (!auth.currentUser?.id) throw new Error("Please login first");
    if (!auth.currentUser?.token) throw new Error("Please login first");

    const dateYmd = new Date().toISOString().split('T')[0];
    const checkoutTime = new Date().toISOString();

    const input = {
      token: auth.currentUser.token,
      date_ymd: dateYmd,
      shift: shift,
      employee: employee,
      items: items.value.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }))
    };

    try {
      // Create order in local SQLite via Tauri
      const orderId = await tauriCmd<string>('pos_checkout', { input });

      // Sync to Supabase using enhanced service if available
      const syncService = getSyncService();
      
      console.log('📤 Syncing order to Supabase cloud...');
      
      // Enqueue order (use 'insert' for new orders)
      const orderData = {
        id: orderId,
        user_id: auth.currentUser.id,
        employee_name: employee,
        shift_name: shift,
        order_date: dateYmd,
        total_amount: totalAmount.value,
        created_at: checkoutTime,
      };

      syncService.enqueueTable('orders', 'insert', orderData);

      // Enqueue order items
      for (const item of items.value) {
        syncService.enqueueTable('order_items', 'insert', {
          id: `${orderId}_${item.id}`,
          order_id: orderId,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
          created_at: checkoutTime,
        });
      }

      console.log('✅ Order enqueued for cloud sync');

      // Trigger sync in background (don't wait for it to complete)
      syncService.sync().catch((error) => {
        console.error('Failed to sync checkout to Supabase:', error);
        // Continue offline even if sync fails
      });

      clearCart();
      return orderId;
    } catch (e) {
      console.error("Checkout failed:", e);
      throw e;
    }
  };

  return { items, totalAmount, addToCart, removeFromCart, clearCart, checkout };
});