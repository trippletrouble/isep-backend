export interface SuccessResponse<T = any> {
  status: 'success';
  timestamp: string;
  data: T;
}

export interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  timestamp: string;
}
