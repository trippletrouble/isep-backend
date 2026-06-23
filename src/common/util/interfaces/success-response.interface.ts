export interface SuccessResponse<T = any> {
  status: 'success';
  timestamp: string;
  data: T;
}
