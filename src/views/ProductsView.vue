<template>
  <div class="h-full flex flex-col gap-6 p-6 bg-linear-to-br from-gray-50 to-orange-50/30 overflow-hidden">
    <!-- Header Section -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <span class="w-10 h-10 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
            📦
          </span>
          商品管理
        </h1>
        <p class="text-sm text-gray-500 ml-13">管理您的商品库存、价格和状态</p>
      </div>
      
      <!-- Stats Cards -->
      <div class="flex items-center gap-4">
        <div class="px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="text-xs text-gray-500 font-medium">总商品</div>
          <div class="text-2xl font-bold text-gray-900">{{ products.length }}</div>
        </div>
        <div class="px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="text-xs text-gray-500 font-medium">在售</div>
          <div class="text-2xl font-bold text-emerald-600">{{ onShelfCount }}</div>
        </div>
        <div class="px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <div class="text-xs text-gray-500 font-medium">已下架</div>
          <div class="text-2xl font-bold text-gray-400">{{ offShelfCount }}</div>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-4 shrink-0">
      <!-- Search Bar -->
      <div class="flex-1 relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索商品名称、品类..."
          class="w-full px-4 py-3 pl-11 bg-white rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
        />
        <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Sort Control -->
      <select
        v-model="sortOption"
        @change="handleSort"
        class="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 outline-none font-medium text-gray-700"
      >
        <option value="custom" disabled hidden>当前排序</option>
        <option value="default">默认排序 (老数据)</option>
        <option value="price_asc">价格升序 (¥↑)</option>
        <option value="price_desc">价格降序 (¥↓)</option>
        <option value="category">分类排序</option>
        <option value="name">名称排序 (A-Z)</option>
      </select>
 
      <!-- Category Filter -->
      <select
        v-model="filterCategory"
        class="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 outline-none font-medium"
      >
        <option value="">全部品类</option>
        <option value="饮品">饮品</option>
        <option value="食品">食品</option>
        <option value="零食">零食</option>
        <option value="日用">日用</option>
        <option value="槟榔">槟榔</option>
        <option value="其他">其他</option>
      </select>

      <!-- Status Filter -->
      <select
        v-model="filterStatus"
        class="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 outline-none font-medium"
      >
        <option value="">全部状态</option>
        <option value="on">在售</option>
        <option value="off">已下架</option>
        <option value="low">库存不足</option>
      </select>

      <!-- View Mode Toggle -->
      <div class="flex bg-white rounded-xl border border-gray-200 p-1">
        <button
          @click="viewMode = 'grid'"
          :class="viewMode === 'grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:text-gray-700'"
          class="px-3 py-2 rounded-lg transition-all"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          @click="viewMode = 'table'"
          :class="viewMode === 'table' ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:text-gray-700'"
          class="px-3 py-2 rounded-lg transition-all"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- Add Product Button -->
      <button
        @click="showAddDialog = true"
        class="px-6 py-3 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        添加商品
      </button>
    </div>

    <!-- Batch Actions Bar -->
    <Transition name="slide-down">
      <div v-if="selectedIds.size > 0" class="flex items-center justify-between px-6 py-4 bg-orange-50 border border-orange-200 rounded-xl shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div class="text-sm font-bold text-gray-900">已选择 {{ selectedIds.size }} 个商品</div>
            <div class="text-xs text-gray-500">对选中的商品执行批量操作</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="batchToggleShelf(true)"
            class="px-4 py-2 bg-white text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition-all border border-emerald-200"
          >
            批量上架
          </button>
          <button
            @click="batchToggleShelf(false)"
            class="px-4 py-2 bg-white text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-all border border-amber-200"
          >
            批量下架
          </button>
          <button
            @click="showBatchDeleteConfirm = true"
            class="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all border border-red-200"
          >
            批量删除
          </button>
          <button
            @click="selectedIds.clear()"
            class="px-4 py-2 bg-white text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-all border border-gray-200"
          >
            取消选择
          </button>
        </div>
      </div>
    </Transition>

    <!-- Products Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="h-full flex flex-col items-center justify-center gap-4">
        <div class="w-16 h-16 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
        <p class="text-sm text-gray-500 font-medium">加载商品数据中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProducts.length === 0" class="h-full flex flex-col items-center justify-center gap-4">
        <div class="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center text-5xl">
          {{ searchQuery || filterCategory || filterStatus ? '🔍' : '📦' }}
        </div>
        <div class="text-center">
          <h3 class="text-lg font-bold text-gray-900 mb-1">
            {{ searchQuery || filterCategory || filterStatus ? '没有找到商品' : '还没有商品' }}
          </h3>
          <p class="text-sm text-gray-500">
            {{ searchQuery || filterCategory || filterStatus ? '试试调整搜索条件' : '点击右上角按钮添加第一个商品' }}
          </p>
        </div>
      </div>

      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="h-full overflow-y-auto custom-scrollbar p-1">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="group bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden flex flex-col relative"
            :class="{ 'ring-2 ring-orange-200 border-orange-200': selectedIds.has(product.id) }"
            @click="toggleSelect(product.id)"
          >
            <!-- Header: Status & Check -->
            <div class="px-3 pt-3 flex items-start justify-between">
               <div 
                  class="w-4 h-4 rounded border transition-colors flex items-center justify-center"
                  :class="selectedIds.has(product.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white group-hover:border-orange-300'"
               >
                  <svg v-if="selectedIds.has(product.id)" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"/></svg>
               </div>
               
               <span 
                 class="px-1.5 py-0.5 text-[10px] font-bold rounded"
                 :class="product.on_shelf ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'"
               >
                 {{ product.on_shelf ? '在售' : '下架' }}
               </span>
            </div>

            <!-- Content -->
            <div class="px-3 py-2 flex-1 flex flex-col gap-1">
               <div class="flex items-center gap-1.5 mb-1">
                 <span class="text-[10px] px-1 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100">{{ product.category }}</span>
               </div>
               <h3 class="font-bold text-gray-800 text-sm leading-tight line-clamp-2 min-h-[2.5em]" :title="product.name">{{ product.name }}</h3>
               
               <div class="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 border-dashed">
                  <div class="flex flex-col">
                    <span class="text-[10px] text-gray-400">售价</span>
                     <span class="font-bold text-orange-600 text-sm">¥{{ product.unit_price }}</span>
                     <span v-if="product.cost_price" class="text-[9px] text-gray-400 mt-0.5">进: ¥{{ product.cost_price }}</span>
                   </div>
                  <div class="flex flex-col text-right">
                    <span class="text-[10px] text-gray-400">库存</span>
                    <span class="font-bold text-sm" :class="product.stock < 10 ? 'text-red-500 animate-pulse' : 'text-gray-700'">{{ product.stock }}</span>
                  </div>
               </div>
            </div>

            <!-- Hover Actions -->
            <div class="absolute inset-x-0 bottom-0 p-2 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
               <button
                 @click.stop="toggleShelf(product)"
                 class="flex-1 py-1 text-[10px] font-bold rounded bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors"
               >
                 {{ product.on_shelf ? '下架' : '上架' }}
               </button>
               <button
                 @click.stop="editProduct(product)"
                 class="flex-1 py-1 text-[10px] font-bold rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-colors"
               >
                 编辑
               </button>
               <button
                 @click.stop="deleteProductById(product)"
                 class="flex-1 py-1 text-[10px] font-bold rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-colors"
               >
                 删除
               </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-else class="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div class="flex-1 overflow-auto custom-scrollbar">
          <table class="w-full">
            <thead class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr class="h-12">
                <th class="w-12 text-center">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                </th>
                <th class="text-left px-4 font-bold text-gray-700 text-sm">商品信息</th>
                <th class="text-center px-4 font-bold text-gray-700 text-sm w-24">品类</th>
                <th class="text-center px-4 font-bold text-gray-700 text-sm w-20">状态</th>
                <th class="text-right px-4 font-bold text-gray-700 text-sm w-24">售价</th>
                <th class="text-right px-4 font-bold text-gray-700 text-sm w-20">库存</th>
                <th class="text-right px-4 font-bold text-gray-700 text-sm w-20">规格</th>
                <th class="text-center px-4 font-bold text-gray-700 text-sm w-48">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="product in filteredProducts"
                :key="product.id"
                class="h-16 hover:bg-orange-50/30 transition-colors"
                :class="{ 'bg-orange-50/50': selectedIds.has(product.id) }"
              >
                <td class="text-center">
                  <input
                    type="checkbox"
                    :checked="selectedIds.has(product.id)"
                    @change="toggleSelect(product.id)"
                    class="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                </td>
                <td class="px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-linear-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-xl">
                      {{ getCategoryIcon(product.category) }}
                    </div>
                    <div>
                      <div class="font-bold text-gray-900">{{ product.name }}</div>
                      <div class="text-xs text-gray-400 font-mono">{{ product.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-center px-4">
                  <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                    {{ product.category }}
                  </span>
                </td>
                <td class="text-center px-4">
                  <div class="flex flex-col items-center gap-1">
                    <span
                      v-if="product.on_shelf"
                      class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded"
                    >
                      在售
                    </span>
                    <span
                      v-else
                      class="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded"
                    >
                      下架
                    </span>
                    <span
                      v-if="product.stock < 10"
                      class="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse"
                    >
                      库存低
                    </span>
                  </div>
                </td>
                <td class="text-right px-4">
                  <div class="font-bold text-orange-600 text-lg">¥{{ product.unit_price.toFixed(2) }}</div>
                  <div class="text-xs text-gray-400">单价 ¥{{ (product.unit_price / (product.spec || 1)).toFixed(2) }}</div>
                </td>
                <td class="text-right px-4">
                  <span class="font-bold text-gray-900" :class="product.stock < 10 ? 'text-red-600' : ''">
                    {{ product.stock }}
                  </span>
                </td>
                <td class="text-right px-4">
                  <span class="font-mono text-gray-600">{{ product.spec }}</span>
                </td>
                <td class="text-center px-4">
                  <div class="flex items-center justify-center gap-2">
                    <button
                      @click="toggleShelf(product)"
                      :class="product.on_shelf 
                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                        : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      {{ product.on_shelf ? '下架' : '上架' }}
                    </button>
                    <button
                      @click="editProduct(product)"
                      class="px-3 py-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg text-xs font-bold transition-all"
                    >
                      编辑
                    </button>
                    <button
                      @click="deleteProductById(product)"
                      class="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all border border-red-200"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <Transition name="modal">
      <div
        v-if="showAddDialog || editingProduct"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="cancelEdit"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
          <!-- Dialog Header -->
          <div class="px-6 py-4 bg-linear-to-r from-orange-500 to-orange-600 flex items-center justify-between">
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {{ editingProduct ? '编辑商品' : '添加新商品' }}
            </h3>
            <button
              @click="cancelEdit"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/20 transition-all"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Dialog Content -->
          <form @submit.prevent="saveProduct" class="p-6">
            <div class="grid grid-cols-2 gap-6">
              <!-- Product Name -->
              <div class="col-span-2">
                <label class="block text-sm font-bold text-gray-700 mb-2">
                  商品名称 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  placeholder="例如：可口可乐"
                />
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">
                  商品品类 <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.category"
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                >
                  <option value="饮品">🥤 饮品</option>
                  <option value="食品">🍔 食品</option>
                  <option value="零食">🍿 零食</option>
                  <option value="日用">🧴 日用</option>
                  <option value="槟榔">🌿 槟榔</option>
                  <option value="其他">📦 其他</option>
                </select>
              </div>

              <!-- Spec -->
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">
                  规格（瓶/箱） <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="formData.spec"
                  type="number"
                  required
                  min="1"
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-mono"
                  placeholder="24"
                />
              </div>

              <!-- Cost Price -->
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">
                  进货价（¥）
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                  <input
                    v-model.number="formData.cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <!-- Unit Price -->
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">
                  售价（¥） <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                  <input
                    v-model.number="formData.unit_price"
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    class="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-mono"
                    placeholder="3.00"
                  />
                </div>
              </div>

              <!-- Stock -->
              <div>
                <label class="block text-sm font-bold text-gray-700 mb-2">
                  库存数量 <span class="text-red-500">*</span>
                </label>
                <input
                  v-model.number="formData.stock"
                  type="number"
                  required
                  min="0"
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-mono"
                  placeholder="100"
                />
              </div>

              <!-- Calculated Unit Price -->
              <div class="col-span-2 p-4 bg-gray-50 rounded-xl">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600">单价（每瓶/个）</span>
                  <span class="text-lg font-bold text-orange-600">
                    ¥{{ formData.unit_price && formData.spec ? (formData.unit_price / formData.spec).toFixed(2) : '0.00' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 mt-6">
              <button
                type="button"
                @click="cancelEdit"
                class="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                class="flex-1 px-6 py-3 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                {{ editingProduct ? '保存修改' : '添加商品' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirmation Dialog -->
    <Transition name="modal">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="showDeleteConfirm = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="p-6">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 text-center mb-2">确认删除商品？</h3>
            <p class="text-sm text-gray-500 text-center mb-6">
              此操作不可撤销，商品数据将被永久删除
            </p>
            <div class="flex gap-3">
              <button
                @click="showDeleteConfirm = false"
                class="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                @click="confirmDelete"
                class="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Batch Delete Confirmation Dialog -->
    <Transition name="modal">
      <div
        v-if="showBatchDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="showBatchDeleteConfirm = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="p-6">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 text-center mb-2">批量删除商品？</h3>
            <p class="text-sm text-gray-500 text-center mb-6">
              将删除 <span class="font-bold text-red-600">{{ selectedIds.size }}</span> 个商品，此操作不可撤销
            </p>
            <div class="flex gap-3">
              <button
                @click="showBatchDeleteConfirm = false"
                class="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                @click="confirmBatchDelete"
                class="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchProducts, createProduct, updateProduct, deleteProduct, type Product } from '../api/products';
import { useToast } from '../composables/useToast';

const { success, error, warning } = useToast();

// State
const products = ref<Product[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const filterCategory = ref('');
const filterStatus = ref('');
const viewMode = ref<'grid' | 'table'>('grid');
const selectedIds = ref(new Set<string>());
const sortOption = ref('default'); // default, price_asc, price_desc, category, name

// Dialog states
const showAddDialog = ref(false);
const showDeleteConfirm = ref(false);
const showBatchDeleteConfirm = ref(false);
const editingProduct = ref<Product | null>(null);
const productToDelete = ref<Product | null>(null);

// Form data
const formData = ref({
  name: '',
  category: '饮品',
  unit_price: 0,
  cost_price: 0,
  stock: 0,
  spec: 1,
});

// Computed
const filteredProducts = computed(() => {
  let result = products.value;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
    );
  }

  // Category filter
  if (filterCategory.value) {
    result = result.filter(p => p.category === filterCategory.value);
  }

  // Status filter
  if (filterStatus.value === 'on') {
    result = result.filter(p => p.on_shelf);
  } else if (filterStatus.value === 'off') {
    result = result.filter(p => !p.on_shelf);
  } else if (filterStatus.value === 'low') {
    result = result.filter(p => p.stock < 10);
  }

  return result;
});

const onShelfCount = computed(() => products.value.filter(p => p.on_shelf).length);
const offShelfCount = computed(() => products.value.filter(p => !p.on_shelf).length);

const isAllSelected = computed(() => {
  return filteredProducts.value.length > 0 && 
    filteredProducts.value.every(p => selectedIds.value.has(p.id));
});

// Methods
const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    '饮品': '🥤',
    '食品': '🍔',
    '零食': '🍿',
    '日用': '🧴',
    '槟榔': '🌿',
    '其他': '📦',
  };
  return icons[category] || '📦';
};

const loadProducts = async () => {
  loading.value = true;
  try {
    products.value = await fetchProducts(true);
    applySortOrder(); // Apply saved sort
  } catch (e) {
    error('加载商品失败');
    console.error(e);
  } finally {
    loading.value = false;
  }
};

// Sort Logic synced with CashierView
const saveSortOrder = () => {
    const ids = products.value.map(i => i.id);
    localStorage.setItem('inventory_sort_order', JSON.stringify(ids));
    // Dispatch event for other tabs/components?
    window.dispatchEvent(new Event('storage')); 
};

const applySortOrder = () => {
    const json = localStorage.getItem('inventory_sort_order');
    if (!json) return;
    try {
        const ids = JSON.parse(json) as string[];
        const map = new Map(products.value.map(i => [i.id, i]));
        const sorted: Product[] = [];
        const seen = new Set<string>();
        
        ids.forEach(id => {
            if (map.has(id)) {
                sorted.push(map.get(id)!);
                seen.add(id);
            }
        });
        
        // Put remaining (new items) at the TOP
        const remaining: Product[] = [];
        products.value.forEach(item => {
             if(!seen.has(item.id)) remaining.push(item);
        });
        products.value = [...remaining, ...sorted];
    } catch(e) {}
};

const handleSort = () => {
    if (sortOption.value === 'default') {
        resetSort();
        return;
    }

    let sorted = [...products.value];
    if (sortOption.value === 'price_asc') {
        sorted.sort((a, b) => a.unit_price - b.unit_price);
    } else if (sortOption.value === 'price_desc') {
        sorted.sort((a, b) => b.unit_price - a.unit_price);
    } else if (sortOption.value === 'category') {
        sorted.sort((a, b) => a.category.localeCompare(b.category, 'zh-CN'));
    } else if (sortOption.value === 'name') {
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    }
    
    products.value = sorted;
    saveSortOrder();
    success('排序已更新');
};

const resetSort = async () => {
    localStorage.removeItem('inventory_sort_order');
    await loadProducts(); // Reload to get DB order
    success('已恢复默认(老数据)排序');
};

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear();
  } else {
    filteredProducts.value.forEach(p => selectedIds.value.add(p.id));
  }
};

const toggleShelf = async (product: Product) => {
  try {
    await updateProduct(product.id, { on_shelf: !product.on_shelf });
    product.on_shelf = !product.on_shelf;
    success(product.on_shelf ? '商品已上架' : '商品已下架');
  } catch (e: any) {
    error(`操作失败: ${e.message}`);
  }
};

const batchToggleShelf = async (onShelf: boolean) => {
  if (selectedIds.value.size === 0) return;

  loading.value = true;
  let count = 0;
  try {
    for (const id of selectedIds.value) {
      await updateProduct(id, { on_shelf: onShelf });
      const p = products.value.find(prod => prod.id === id);
      if (p) p.on_shelf = onShelf;
      count++;
    }
    success(`成功${onShelf ? '上架' : '下架'} ${count} 个商品`);
    selectedIds.value.clear();
  } catch (e) {
    error('部分商品操作失败');
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const editProduct = (product: Product) => {
  editingProduct.value = product;
  formData.value = {
    name: product.name,
    category: product.category,
    unit_price: product.unit_price,
    cost_price: product.cost_price || 0,
    stock: product.stock,
    spec: product.spec,
  };
};

const cancelEdit = () => {
  showAddDialog.value = false;
  editingProduct.value = null;
  formData.value = {
    name: '',
    category: '饮品',
    unit_price: 0,
    cost_price: 0,
    stock: 0,
    spec: 1,
  };
};

const saveProduct = async () => {
  try {
    if (editingProduct.value) {
      await updateProduct(editingProduct.value.id, formData.value);
      Object.assign(editingProduct.value, formData.value);
      success('商品已更新');
    } else {
      const newProduct = await createProduct(formData.value);
      products.value.push(newProduct);
      success('商品已添加');
    }
    cancelEdit();
  } catch (e: any) {
    error(`保存失败: ${e.message}`);
  }
};

const deleteProductById = (product: Product) => {
  if (product.on_shelf) {
    error('无法删除：请先将商品下架');
    return;
  }
  productToDelete.value = product;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  if (!productToDelete.value) return;

  try {
    await deleteProduct(productToDelete.value.id);
    const index = products.value.findIndex(p => p.id === productToDelete.value!.id);
    if (index > -1) {
      products.value.splice(index, 1);
      selectedIds.value.delete(productToDelete.value.id);
    }
    success('商品已删除');
  } catch (e: any) {
    error(`删除失败: ${e.message}`);
  } finally {
    showDeleteConfirm.value = false;
    productToDelete.value = null;
  }
};

const confirmBatchDelete = async () => {
  if (selectedIds.value.size === 0) return;

  loading.value = true;
  let successCount = 0;
  let failCount = 0;

  try {
    for (const id of selectedIds.value) {
      const product = products.value.find(p => p.id === id);
      if (product?.on_shelf) {
        failCount++;
        continue;
      }
      try {
        await deleteProduct(id);
        const index = products.value.findIndex(p => p.id === id);
        if (index > -1) {
          products.value.splice(index, 1);
        }
        successCount++;
      } catch (e) {
        failCount++;
        console.error(`Failed to delete ${id}:`, e);
      }
    }

    if (successCount > 0) {
      success(`成功删除 ${successCount} 个商品`);
    }
    if (failCount > 0) {
      warning(`${failCount} 个商品删除失败`);
    }

    selectedIds.value.clear();
  } finally {
    loading.value = false;
    showBatchDeleteConfirm.value = false;
  }
};

onMounted(() => {
    if (localStorage.getItem('inventory_sort_order')) {
        sortOption.value = 'custom';
    }
    loadProducts();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
