import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { logout, updateTokens } from '../slices/authSlice';
import {
  SyncJob,
  CreateSyncJobRequest,
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

export const syncApi = createApi({
  reducerPath: 'syncApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['SyncJob'],
  endpoints: (builder) => ({
    // Get all sync jobs with pagination
    getSyncJobs: builder.query<
      PaginatedResponse<SyncJob>,
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

        return `/sync?${params.toString()}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'SyncJob' as const, id })),
              { type: 'SyncJob', id: 'LIST' },
            ]
          : [{ type: 'SyncJob', id: 'LIST' }],
    }),

    // Get specific sync job
    getSyncJob: builder.query<SyncJob, string>({
      query: (jobId) => `/sync/${jobId}`,
      providesTags: (result, error, jobId) => [{ type: 'SyncJob', id: jobId }],
    }),

    // Create new sync job
    createSyncJob: builder.mutation<SyncJob, CreateSyncJobRequest>({
      query: (syncData) => ({
        url: '/sync',
        method: 'POST',
        body: syncData,
      }),
      invalidatesTags: [{ type: 'SyncJob', id: 'LIST' }],
    }),

    // Update sync job
    updateSyncJob: builder.mutation<SyncJob, { id: string; updates: Partial<SyncJob> }>({
      query: ({ id, updates }) => ({
        url: `/sync/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'SyncJob', id },
        { type: 'SyncJob', id: 'LIST' },
      ],
    }),

    // Delete sync job
    deleteSyncJob: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/sync/${jobId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, jobId) => [
        { type: 'SyncJob', id: jobId },
        { type: 'SyncJob', id: 'LIST' },
      ],
    }),

    // Enable/disable sync job
    toggleSyncJob: builder.mutation<SyncJob, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/sync/${id}/toggle`,
        method: 'POST',
        body: { isActive },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'SyncJob', id },
        { type: 'SyncJob', id: 'LIST' },
      ],
    }),

    // Trigger manual sync
    triggerSync: builder.mutation<APIResponse, string>({
      query: (jobId) => ({
        url: `/sync/${jobId}/trigger`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, jobId) => [{ type: 'SyncJob', id: jobId }],
    }),

    // Get sync history for a job
    getSyncHistory: builder.query<
      PaginatedResponse<{
        id: string;
        syncJobId: string;
        status: 'completed' | 'failed' | 'partial';
        filesProcessed: number;
        filesAdded: number;
        filesUpdated: number;
        filesDeleted: number;
        bytesTransferred: number;
        duration: number;
        errorMessage?: string;
        startedAt: string;
        completedAt: string;
      }>,
      { jobId: string } & PaginationParams
    >({
      query: ({ jobId, page = 1, limit = 20, sortBy = 'startedAt', sortOrder = 'desc' }) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);

        return `/sync/${jobId}/history?${params.toString()}`;
      },
    }),

    // Get sync statistics
    getSyncStats: builder.query<{
      totalJobs: number;
      activeJobs: number;
      recentSyncs: number;
      totalFilesProcessed: number;
      totalBytesTransferred: number;
      successRate: number;
    }, { period?: 'day' | 'week' | 'month' | 'year' }>({
      query: ({ period = 'month' }) => `/sync/stats?period=${period}`,
    }),

    // Validate sync job configuration
    validateSyncJob: builder.mutation<
      { valid: boolean; errors?: string[]; warnings?: string[] },
      CreateSyncJobRequest
    >({
      query: (syncData) => ({
        url: '/sync/validate',
        method: 'POST',
        body: syncData,
      }),
    }),

    // Get conflict resolution preview
    getConflictPreview: builder.mutation<
      {
        conflicts: Array<{
          path: string;
          type: 'file_exists' | 'newer_in_source' | 'newer_in_destination' | 'size_mismatch';
          sourceFile: {
            size: number;
            modifiedAt: string;
            checksum?: string;
          };
          destinationFile: {
            size: number;
            modifiedAt: string;
            checksum?: string;
          };
          recommendedAction: 'skip' | 'overwrite' | 'rename';
        }>;
        totalConflicts: number;
      },
      { syncJobId: string; dryRun?: boolean }
    >({
      query: ({ syncJobId, dryRun = true }) => ({
        url: `/sync/${syncJobId}/preview`,
        method: 'POST',
        body: { dryRun },
      }),
    }),

    // Get active sync jobs
    getActiveSyncJobs: builder.query<SyncJob[], void>({
      query: () => '/sync?isActive=true',
      providesTags: [{ type: 'SyncJob', id: 'ACTIVE' }],
    }),

    // Get sync schedule overview
    getSyncSchedule: builder.query<
      Array<{
        syncJobId: string;
        alias: string;
        nextRun: string;
        lastRun?: string;
        schedule: string;
        isActive: boolean;
      }>,
      { days?: number }
    >({
      query: ({ days = 7 }) => `/sync/schedule?days=${days}`,
    }),

    // Bulk operations
    bulkToggleSyncJobs: builder.mutation<APIResponse, { jobIds: string[]; isActive: boolean }>({
      query: ({ jobIds, isActive }) => ({
        url: '/sync/bulk/toggle',
        method: 'POST',
        body: { jobIds, isActive },
      }),
      invalidatesTags: [{ type: 'SyncJob', id: 'LIST' }],
    }),

    bulkDeleteSyncJobs: builder.mutation<APIResponse, string[]>({
      query: (jobIds) => ({
        url: '/sync/bulk/delete',
        method: 'DELETE',
        body: { jobIds },
      }),
      invalidatesTags: [{ type: 'SyncJob', id: 'LIST' }],
    }),

    bulkTriggerSyncJobs: builder.mutation<APIResponse, string[]>({
      query: (jobIds) => ({
        url: '/sync/bulk/trigger',
        method: 'POST',
        body: { jobIds },
      }),
      invalidatesTags: [{ type: 'SyncJob', id: 'LIST' }],
    }),

    // Test sync path connectivity
    testSyncPaths: builder.mutation<
      {
        sourcePath: { accessible: boolean; error?: string };
        destinationPath: { accessible: boolean; error?: string };
      },
      { sourceCloudId: string; destinationCloudId: string; sourcePath: string; destinationPath: string }
    >({
      query: (pathData) => ({
        url: '/sync/test-paths',
        method: 'POST',
        body: pathData,
      }),
    }),
  }),
});

export const {
  useGetSyncJobsQuery,
  useGetSyncJobQuery,
  useCreateSyncJobMutation,
  useUpdateSyncJobMutation,
  useDeleteSyncJobMutation,
  useToggleSyncJobMutation,
  useTriggerSyncMutation,
  useGetSyncHistoryQuery,
  useGetSyncStatsQuery,
  useValidateSyncJobMutation,
  useGetConflictPreviewMutation,
  useGetActiveSyncJobsQuery,
  useGetSyncScheduleQuery,
  useBulkToggleSyncJobsMutation,
  useBulkDeleteSyncJobsMutation,
  useBulkTriggerSyncJobsMutation,
  useTestSyncPathsMutation,
} = syncApi;

export default syncApi;
