// Tauri API 类型声明
declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: (command: string, args?: any) => Promise<any>;
      };
      webviewWindow?: {
        WebviewWindow?: any;
      };
      WebviewWindow?: any;
      shell?: {
        open?: (url: string) => Promise<void>;
      };
    };
  }
}

export {};
