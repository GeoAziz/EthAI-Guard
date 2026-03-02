export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ApiCategoryType = 'analysis' | 'explainability' | 'compliance' | 'data-management' | 'authentication' | 'errors';

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  category: ApiCategoryType;
  requestExample?: string;
  responseExample?: string;
  errorCodes?: number[];
  parameters?: ApiParameter[];
  authentication?: boolean;
  rateLimit?: string;
}

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ApiErrorResponse {
  code: number;
  status: string;
  description: string;
  example?: string;
}

export interface ApiCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}
