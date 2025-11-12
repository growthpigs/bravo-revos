export interface SandboxResponse {
  success: boolean;
  response: string;
  interactive?: any;
  sandboxMode: true;
  originalRequest?: {
    url: string;
    method: string;
    body?: any;
  };
}

export type MockResponseGenerator = (url: string, options: RequestInit) => Promise<SandboxResponse>;
