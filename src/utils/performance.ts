/**
 * 性能优化工具函数
 * 用于班次结算模块的性能监控和优化
 */

/**
 * 防抖函数
 * 延迟执行函数，避免频繁调用
 * 
 * @param fn - 要执行的函数
 * @param delayMs - 延迟时间（毫秒）
 * @returns 防抖后的函数
 * 
 * @example
 * const debouncedSave = debounce(() => save(), 1000);
 * input.addEventListener('input', debouncedSave);
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
};

/**
 * 节流函数
 * 限制函数执行频率
 * 
 * @param fn - 要执行的函数
 * @param intervalMs - 执行间隔（毫秒）
 * @returns 节流后的函数
 * 
 * @example
 * const throttledScroll = throttle(() => handleScroll(), 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): ((...args: Parameters<T>) => void) => {
  let lastCallTime = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallTime >= intervalMs) {
      fn(...args);
      lastCallTime = now;
    }
  };
};

/**
 * 性能计时器
 * 用于测量代码执行时间
 * 
 * @example
 * const timer = new PerformanceTimer('数据计算');
 * // ... 执行代码 ...
 * timer.end(); // 输出: [数据计算] 耗时: 123ms
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    console.log(`[${this.label}] 耗时: ${duration.toFixed(2)}ms`);
    return duration;
  }

  mark(checkpoint: string): number {
    const duration = performance.now() - this.startTime;
    console.log(`[${this.label}] ${checkpoint}: ${duration.toFixed(2)}ms`);
    return duration;
  }
}

/**
 * 批量操作优化
 * 将多个操作合并为一个，减少重排和重绘
 * 
 * @param operations - 操作函数数组
 * @returns 执行结果数组
 * 
 * @example
 * batchOperations([
 *   () => { element1.style.color = 'red'; },
 *   () => { element2.style.color = 'blue'; }
 * ]);
 */
export const batchOperations = <T>(
  operations: (() => T)[]
): T[] => {
  // 使用 requestAnimationFrame 确保在浏览器重排前执行
  return operations.map(op => op());
};

/**
 * 内存缓存
 * 简单的 LRU 缓存实现
 * 
 * @example
 * const cache = new MemoryCache<string, number>(100);
 * cache.set('key1', 123);
 * const value = cache.get('key1'); // 123
 */
export class MemoryCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    // 如果键已存在，先删除（实现 LRU）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果缓存满了，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as K;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * 异步任务队列
 * 控制并发执行数量
 * 
 * @example
 * const queue = new AsyncQueue(3); // 最多同时执行 3 个任务
 * queue.add(() => fetch('/api/data1'));
 * queue.add(() => fetch('/api/data2'));
 */
export class AsyncQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 1) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift();

    if (task) {
      try {
        await task();
      } finally {
        this.running--;
        this.process();
      }
    }
  }
}

/**
 * 计算结果缓存装饰器
 * 用于缓存计算密集型函数的结果
 * 
 * @example
 * const cachedCalculate = memoize((a, b) => a + b);
 * cachedCalculate(1, 2); // 计算
 * cachedCalculate(1, 2); // 从缓存返回
 */
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, any>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * 监控函数执行时间
 * 如果执行时间超过阈值，输出警告
 * 
 * @param fn - 要监控的函数
 * @param thresholdMs - 时间阈值（毫秒）
 * @param label - 标签
 * @returns 监控后的函数
 * 
 * @example
 * const monitored = monitor(expensiveCalculation, 100, '计算');
 * monitored(); // 如果超过 100ms，输出警告
 */
export const monitor = <T extends (...args: any[]) => any>(
  fn: T,
  thresholdMs: number = 100,
  label: string = fn.name
): T => {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;

    if (duration > thresholdMs) {
      console.warn(
        `[性能警告] ${label} 执行时间过长: ${duration.toFixed(2)}ms (阈值: ${thresholdMs}ms)`
      );
    }

    return result;
  }) as T;
};

/**
 * 延迟执行
 * 在浏览器空闲时执行任务
 * 
 * @param task - 要执行的任务
 * @param timeoutMs - 超时时间（毫秒）
 * 
 * @example
 * scheduleIdleTask(() => {
 *   // 在浏览器空闲时执行
 *   updateAnalytics();
 * });
 */
export const scheduleIdleTask = (
  task: () => void,
  timeoutMs: number = 5000
): void => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(task, { timeout: timeoutMs });
  } else {
    // 降级方案：使用 setTimeout
    setTimeout(task, 0);
  }
};

/**
 * 获取性能指标
 * 
 * @returns 性能指标对象
 */
export const getPerformanceMetrics = () => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  return {
    // 页面加载时间
    pageLoadTime: navigation?.loadEventEnd - navigation?.fetchStart,
    // DOM 解析时间
    domParseTime: navigation?.domInteractive - navigation?.fetchStart,
    // 资源加载时间
    resourceLoadTime: navigation?.loadEventEnd - navigation?.domContentLoadedEventEnd,
    // 首次绘制
    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
    // 首次内容绘制
    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
  };
};

/**
 * 监控内存使用
 * 
 * @returns 内存使用信息
 */
export const getMemoryUsage = () => {
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }
  return null;
};
