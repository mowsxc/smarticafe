/**
 * 错误处理工具函数
 * 用于班次结算模块的错误捕获和处理
 */

/**
 * 错误日志类型
 */
export enum ErrorLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 记录错误日志
 * 
 * @param level - 错误级别
 * @param message - 错误信息
 * @param error - 原始错误对象
 * @param context - 上下文信息
 */
export const logError = (
  level: ErrorLevel,
  message: string,
  error?: any,
  context?: Record<string, any>
) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    error: error?.message || String(error),
    stack: error?.stack,
    context
  };

  // 输出到控制台
  switch (level) {
    case ErrorLevel.INFO:
      console.info(`[${level.toUpperCase()}] ${message}`, logEntry);
      break;
    case ErrorLevel.WARN:
      console.warn(`[${level.toUpperCase()}] ${message}`, logEntry);
      break;
    case ErrorLevel.ERROR:
    case ErrorLevel.CRITICAL:
    default:
      console.error(`[${level.toUpperCase()}] ${message}`, logEntry);
      break;
  }

  // 可以在这里添加远程日志上传逻辑
  // await sendToRemoteLogger(logEntry);
};

/**
 * 处理草稿保存错误
 * 静默失败，不阻塞用户操作
 * 
 * @param error - 错误对象
 * @param context - 上下文信息
 */
export const handleDraftSaveError = (error: any, context?: Record<string, any>) => {
  logError(
    ErrorLevel.WARN,
    '草稿自动保存失败，数据可能未保存',
    error,
    { ...context, module: 'cashier-draft' }
  );
  
  // 不显示用户提示，静默失败
  // 用户可以通过手动保存或重新输入来恢复
};

/**
 * 处理草稿加载错误
 * 
 * @param error - 错误对象
 * @param context - 上下文信息
 */
export const handleDraftLoadError = (error: any, context?: Record<string, any>) => {
  logError(
    ErrorLevel.WARN,
    '草稿加载失败，将使用默认数据',
    error,
    { ...context, module: 'cashier-draft' }
  );
  
  // 不显示用户提示，使用默认数据继续
};

/**
 * 处理快照生成错误
 * 
 * @param error - 错误对象
 * @param context - 上下文信息
 * @returns 用户友好的错误信息
 */
export const handleSnapshotGenerationError = (error: any, context?: Record<string, any>): string => {
  logError(
    ErrorLevel.ERROR,
    '快照生成失败',
    error,
    { ...context, module: 'cashier-snapshot' }
  );
  
  // 返回用户友好的错误信息
  if (error?.message?.includes('DOM')) {
    return '快照生成失败：无法访问页面元素，请刷新页面后重试';
  }
  if (error?.message?.includes('memory')) {
    return '快照生成失败：内存不足，请关闭其他应用后重试';
  }
  return '快照生成失败，请检查网络连接后重试';
};

/**
 * 处理交班提交错误
 * 
 * @param error - 错误对象
 * @param context - 上下文信息
 * @returns 用户友好的错误信息
 */
export const handleHandoverSubmitError = (error: any, context?: Record<string, any>): string => {
  logError(
    ErrorLevel.ERROR,
    '交班提交失败',
    error,
    { ...context, module: 'cashier-handover' }
  );
  
  // 返回用户友好的错误信息
  if (error?.message?.includes('network') || error?.message?.includes('offline')) {
    return '网络连接失败，请检查网络后重试';
  }
  if (error?.message?.includes('permission')) {
    return '权限不足，无法完成交班';
  }
  if (error?.message?.includes('timeout')) {
    return '请求超时，请检查网络连接后重试';
  }
  return '交班失败，请稍后重试';
};

/**
 * 处理美团订单解析错误
 * 
 * @param error - 错误对象
 * @param context - 上下文信息
 * @returns 用户友好的错误信息
 */
export const handleMeituanParseError = (error: any, context?: Record<string, any>): string => {
  logError(
    ErrorLevel.WARN,
    '美团订单解析失败',
    error,
    { ...context, module: 'cashier-meituan' }
  );
  
  // 返回用户友好的错误信息
  if (error?.message?.includes('clipboard')) {
    return '无法访问剪贴板，请手动粘贴订单数据';
  }
  if (error?.message?.includes('format')) {
    return '订单格式不正确，请检查剪贴板内容';
  }
  return '订单解析失败，请检查数据格式后重试';
};

/**
 * 检测网络连接状态
 * 
 * @returns true 如果在线，false 如果离线
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * 监听网络连接变化
 * 
 * @param onOnline - 连接恢复时的回调
 * @param onOffline - 连接断开时的回调
 * @returns 取消监听的函数
 */
export const watchNetworkStatus = (
  onOnline?: () => void,
  onOffline?: () => void
): (() => void) => {
  const handleOnline = () => {
    logError(ErrorLevel.INFO, '网络连接已恢复');
    onOnline?.();
  };

  const handleOffline = () => {
    logError(ErrorLevel.WARN, '网络连接已断开');
    onOffline?.();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // 返回取消监听的函数
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

/**
 * 安全执行异步操作
 * 自动捕获错误并记录
 * 
 * @param fn - 异步函数
 * @param errorHandler - 错误处理函数
 * @param context - 上下文信息
 * @returns 操作结果或 null
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  errorHandler?: (error: any) => void,
  context?: Record<string, any>
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    logError(ErrorLevel.ERROR, '异步操作失败', error, context);
    errorHandler?.(error);
    return null;
  }
};

/**
 * 重试异步操作
 * 
 * @param fn - 异步函数
 * @param maxRetries - 最大重试次数
 * @param delayMs - 重试延迟（毫秒）
 * @param context - 上下文信息
 * @returns 操作结果或 null
 */
export const retryAsync = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  context?: Record<string, any>
): Promise<T | null> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logError(
        ErrorLevel.WARN,
        `操作失败，准备重试 (${i + 1}/${maxRetries})`,
        error,
        context
      );

      // 最后一次重试不需要延迟
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  logError(ErrorLevel.ERROR, `操作在 ${maxRetries} 次重试后仍然失败`, lastError, context);
  return null;
};

/**
 * 验证数据完整性
 * 
 * @param data - 要验证的数据
 * @param requiredFields - 必需字段列表
 * @returns 验证结果和错误信息
 */
export const validateData = (
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`缺少必需字段: ${field}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};
