import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { logout, updateTokens } from '../slices/authSlice';
import {
  TransferJob,
  CreateTransferJobRequest,
  TransferProgress,
  PaginationParams,
  PaginatedResponse,
  APIResponse,
  TokenPair
} from '../../types';

// Base query with automatic token handling and refresh
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.tokens?.accessToken;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Enhanced base query with token refresh logic
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.tokens?.refreshToken;
    
    if (refreshToken) {
      // Try to refresh the token
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );
      
      if (refreshResult.data) {
        const tokens = refreshResult.data as TokenPair;
        // Update tokens in store
        api.dispatch(updateTokens(tokens));
        
        // Retry the original query with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        api.dispatch(logout());
      }
    } else {
      // No refresh token, logout user
      api.dispatch(logout());
    }
  }
  
  return result;
};

export const transfersApi = createApi({
  reducerPath: 'transfersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['TransferJob', 'TransferProgress'],
  endpoints: (builder) => ({
    // Get all transfer jobs with pagination
    getTransferJobs: builder.query<
      PaginatedResponse<TransferJob>,
      PaginationParams & { status?: string; search?: string }
    >({
      query: ({ page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, search }) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
        if (status) params.append('status', status);
        if (search) params.append('search', search);

        return `/transfers?${params.toString()}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'TransferJob' as const, id })),
              { type: 'TransferJob', id: 'LIST' },
            ]
          : [{ type: 'TransferJob', id: 'LIST' }],
    }),

    // Get specific transfer job
    getTransferJob: builder.query<TransferJob, string>({
      query: (jobId) => `/transfers/${jobId}`,
      providesTags: (result, error, jobId) => [{ type: 'TransferJob', id: jobId }],
    }),

    // Create new transfer job
    createTransferJob: builder.mutation<TransferJob, CreateTransferJobRequest>({
      query: (transferData) => ({
        url: '/transfers',
        method: 'POST',
        body: transferData,
      }),
      invalidatesTags: [{ type: 'TransferJob', id: 'LIST' }],
    }),

    // Start transfer job
    startTransfer: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/transfers/${jobId}/start`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, jobId) => [
        { type: 'TransferJob', id: jobId },
        { type: 'TransferProgress', id: jobId },
      ],
    }),

    // Pause transfer job
    pauseTransfer: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/transfers/${jobId}/pause`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, jobId) => [
        { type: 'TransferJob', id: jobId },
        { type: 'TransferProgress', id: jobId },
      ],
    }),

    // Resume transfer job
    resumeTransfer: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/transfers/${jobId}/resume`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, jobId) => [
        { type: 'TransferJob', id: jobId },
        { type: 'TransferProgress', id: jobId },
      ],
    }),

    // Cancel transfer job
    cancelTransfer: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/transfers/${jobId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, jobId) => [
        { type: 'TransferJob', id: jobId },
        { type: 'TransferProgress', id: jobId },
      ],
    }),

    // Delete transfer job
    deleteTransfer: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/transfers/${jobId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, jobId) => [
        { type: 'TransferJob', id: jobId },
        { type: 'TransferJob', id: 'LIST' },
      ],
    }),

    // Get transfer progress
    getTransferProgress: builder.query<TransferProgress, string>({
      query: (jobId) => `/transfers/${jobId}/progress`,
      providesTags: (result, error, jobId) => [{ type: 'TransferProgress', id: jobId }],
    }),

    // Get transfer statistics
    getTransferStats: builder.query<{
      totalJobs: number;
      activeJobs: number;
      completedJobs: number;
      failedJobs: number;
      totalBytesTransferred: number;
      averageSpeed: number;
    }, { period?: 'day' | 'week' | 'month' | 'year' }>({
      query: ({ period = 'month' }) => `/transfers/stats?period=${period}`,
    }),

    // Retry failed transfer
    retryTransfer: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/transfers/${jobId}/retry`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, jobId) => [
        { type: 'TransferJob', id: jobId },
        { type: 'TransferProgress', id: jobId },
      ],
    }),

    // Estimate transfer time
    estimateTransfer: builder.mutation<
      { estimatedTime: number; estimatedSize: number },
      Omit<CreateTransferJobRequest, 'options'>
    >({
      query: (transferData) => ({
        url: '/transfers/estimate',
        method: 'POST',
        body: transferData,
      }),
    }),

    // Validate transfer request
    validateTransfer: builder.mutation<
      { valid: boolean; errors?: string[]; warnings?: string[] },
      CreateTransferJobRequest
    >({
      query: (transferData) => ({
        url: '/transfers/validate',
        method: 'POST',
        body: transferData,
      }),
    }),

    // Get active transfers for real-time monitoring
    getActiveTransfers: builder.query<TransferJob[], void>({
      query: () => '/transfers?status=running&status=pending',
      providesTags: [{ type: 'TransferJob', id: 'ACTIVE' }],
    }),

    // Bulk operations
    bulkStartTransfers: builder.mutation<APIResponse, string[]>({
      query: (jobIds) => ({
        url: '/transfers/bulk/start',
        method: 'POST',
        body: { jobIds },
      }),
      invalidatesTags: [{ type: 'TransferJob', id: 'LIST' }],
    }),

    bulkPauseTransfers: builder.mutation<APIResponse, string[]>({
      query: (jobIds) => ({
        url: '/transfers/bulk/pause',
        method: 'POST',
        body: { jobIds },
      }),
      invalidatesTags: [{ type: 'TransferJob', id: 'LIST' }],
    }),

    bulkCancelTransfers: builder.mutation<APIResponse, string[]>({
      query: (jobIds) => ({
        url: '/transfers/bulk/cancel',
        method: 'POST',
        body: { jobIds },
      }),
      invalidatesTags: [{ type: 'TransferJob', id: 'LIST' }],
    }),

    bulkDeleteTransfers: builder.mutation<APIResponse, string[]>({
      query: (jobIds) => ({
        url: '/transfers/bulk/delete',
        method: 'DELETE',
        body: { jobIds },
      }),
      invalidatesTags: [{ type: 'TransferJob', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetTransferJobsQuery,
  useGetTransferJobQuery,
  useCreateTransferJobMutation,
  useStartTransferMutation,
  usePauseTransferMutation,
  useResumeTransferMutation,
  useCancelTransferMutation,
  useDeleteTransferMutation,
  useGetTransferProgressQuery,
  useGetTransferStatsQuery,
  useRetryTransferMutation,
  useEstimateTransferMutation,
  useValidateTransferMutation,
  useGetActiveTransfersQuery,
  useBulkStartTransfersMutation,
  useBulkPauseTransfersMutation,
  useBulkCancelTransfersMutation,
  useBulkDeleteTransfersMutation,
} = transfersApi;

export default transfersApi;