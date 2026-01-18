export type MessageType =
  | 'render.complete'
  | 'render.failed'
  | 'route.change'
  | 'error'
  | 'console.error'
  | 'build-error';

export interface Message {
  type: MessageType;
  data: any;
  timestamp?: number;
}

export interface RenderCompleteData {
  isDefaultTemplate?: boolean;
  renderTime: number;
  routerMode?: 'hash' | 'history' | 'default';
  routerPath?: string;
}

export interface RouteChangeData {
  routerMode: 'hash' | 'history' | 'default';
  routerPath: string;
  triggerType: string;
}

export interface ErrorData {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: string;
  stack?: string;
}

export interface ConsoleErrorData {
  message: string;
  args?: any[];
}

export interface BuildErrorData {
  message: string;
  errorType: string;
  timestamp: number;
}
