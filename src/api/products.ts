import { supabaseAdmin } from '../services/supabase/client';
import type { Product } from './types';

// 为了向后兼容，重新导出Product类型
export type { Product } from './types';

/**
 * 获取商品列表
 */
export async function fetchProducts(includeOffline = false): Promise<Product[]> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    let queryBuilder = (supabaseAdmin as any).from('products').select('*');
    
    if (!includeOffline) {
      queryBuilder = queryBuilder.eq('on_shelf', 1);
    }
    
    const { data, error } = await queryBuilder.order('name');

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit_price: item.unit_price,
      stock: item.stock,
      spec: item.spec,
      on_shelf: !!item.on_shelf
    }));
  } catch (error) {
    console.error('Failed to fetch products from Supabase:', error);
    // 返回空数组作为fallback
    return [];
  }
}

/**
 * 搜索商品
 */
export async function searchProducts(query: string): Promise<Product[]> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('products')
      .select('*')
      .eq('on_shelf', 1)
      .ilike('name', `%${query}%`)
      .order('name');

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit_price: item.unit_price,
      stock: item.stock,
      spec: item.spec,
      on_shelf: !!item.on_shelf
    }));
  } catch (error) {
    console.error('Failed to search products:', error);
    return [];
  }
}

/**
 * 保存商品到数据库
 */
/**
 * 保存商品到数据库 (兼容旧代码)
 */
export async function saveProduct(product: Partial<Product>): Promise<string> {
  const newProduct = await createProduct(product);
  return newProduct.id;
}

/**
 * 创建新商品
 */
export async function createProduct(product: Partial<Product>): Promise<Product> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    // 浏览器模式下使用 crypto API 生成 UUID
    const generateId = (): string => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // 降级方案：简单生成唯一 ID
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const { data, error } = await (supabaseAdmin as any)
      .from('products')
      .insert({
        id: generateId(), // 浏览器模式下需要手动生成 id
        name: product.name,
        category: product.category || '未分类',
        unit_price: product.unit_price || 0,
        stock: product.stock || 0,
        spec: product.spec || 24,
        on_shelf: product.on_shelf !== undefined ? (product.on_shelf ? 1 : 0) : 1 // 默认为 1 (在售)
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      unit_price: data.unit_price,
      stock: data.stock,
      spec: data.spec,
      on_shelf: !!data.on_shelf
    };
  } catch (error) {
    console.error('Failed to create product:', error);
    throw error;
  }
}

/**
 * 更新商品
 */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    // 诊断：打印当前认证状态
    const session = await (supabaseAdmin as any).auth.getSession();
    console.log('🔍 [updateProduct] 认证状态:', {
      hasSession: !!session?.data?.session,
      userId: session?.data?.session?.user?.id,
      userEmail: session?.data?.session?.user?.email,
      productId: id,
      updates
    });

    // 只更新传入的字段，避免将其他字段设置为 undefined
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.unit_price !== undefined) updateData.unit_price = updates.unit_price;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.spec !== undefined) updateData.spec = updates.spec;
    if (updates.on_shelf !== undefined) updateData.on_shelf = updates.on_shelf ? 1 : 0;

    const { error, count, data: responseData } = await (supabaseAdmin as any)
      .from('products')
      .update(updateData, { count: 'exact' })
      .eq('id', id)
      .select();

    console.log('📊 [updateProduct] 操作结果:', { error, count, responseData });

    if (error) {
      console.error('❌ [updateProduct] Supabase 错误:', error);
      throw error;
    }

    if (count === 0) {
      // 检查商品是否真的存在
      const { data: existingProduct } = await (supabaseAdmin as any)
        .from('products')
        .select('id, name, on_shelf')
        .eq('id', id)
        .maybeSingle();
      
      console.log('🔍 [updateProduct] 商品存在性:', existingProduct);
      
      throw new Error(`更新失败：商品不存在或 RLS 拦截 (ID: ${id}, 存在: ${!!existingProduct})`);
    }
  } catch (error) {
    console.error('Failed to update product:', error);
    throw error;
  }
}

/**
 * 删除商品
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase not configured');
    }

    // 诊断：打印当前认证状态
    const session = await (supabaseAdmin as any).auth.getSession();
    console.log('🔍 [deleteProduct] 认证状态:', {
      hasSession: !!session?.data?.session,
      userId: session?.data?.session?.user?.id,
      userEmail: session?.data?.session?.user?.email,
      productId: id
    });

    const { error, count } = await (supabaseAdmin as any)
      .from('products')
      .delete({ count: 'exact' })
      .eq('id', id);

    console.log('📊 [deleteProduct] 操作结果:', { error, count });

    if (error) {
      console.error('❌ [deleteProduct] Supabase 错误:', error);
      throw error;
    }
    
    if (count === 0) {
      throw new Error('删除失败：商品不存在或权限不足（RLS 策略拦截）');
    }
  } catch (error) {
    console.error('Failed to delete product:', error);
    throw error;
  }
}
