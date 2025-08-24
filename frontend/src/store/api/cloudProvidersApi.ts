import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { logout, updateTokens } from '../slices/authSlice';
import {
  CloudProvider,
  ConnectProviderRequest,
  FileItem,
  FileFilter,
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

export const cloudProvidersApi = createApi({
  reducerPath: 'cloudProvidersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['CloudProvider', 'FileItem'],
  endpoints: (builder) => ({
    // Get all connected cloud providers
    getCloudProviders: builder.query<CloudProvider[], void>({
      query: () => '/clouds',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'CloudProvider' as const, id })),
              { type: 'CloudProvider', id: 'LIST' },
            ]
          : [{ type: 'CloudProvider', id: 'LIST' }],
    }),

    // Get supported cloud provider types
    getSupportedProviders: builder.query<string[], void>({
      query: () => '/clouds/supported',
    }),

    // Connect a new cloud provider
    connectProvider: builder.mutation<CloudProvider, ConnectProviderRequest>({
      query: (providerData) => ({
        url: '/clouds/connect',
        method: 'POST',
        body: providerData,
      }),
      invalidatesTags: [{ type: 'CloudProvider', id: 'LIST' }],
    }),

    // Test cloud provider connection
    testConnection: builder.mutation<APIResponse<boolean>, string>({
      query: (providerId) => ({
        url: `/clouds/${providerId}/test`,
        method: 'POST',
      }),
    }),

    // Disconnect cloud provider
    disconnectProvider: builder.mutation<APIResponse, string>({
      query: (providerId) => ({
        url: `/clouds/${providerId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, providerId) => [
        { type: 'CloudProvider', id: providerId },
        { type: 'CloudProvider', id: 'LIST' },
      ],
    }),

    // Update cloud provider settings
    updateProvider: builder.mutation<CloudProvider, { id: string; updates: Partial<CloudProvider> }>({
      query: ({ id, updates }) => ({
        url: `/clouds/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CloudProvider', id },
        { type: 'CloudProvider', id: 'LIST' },
      ],
    }),

    // Browse files in cloud storage
    browseFiles: builder.query<FileItem[], { providerId: string; path?: string; filters?: FileFilter }>({
      query: ({ providerId, path = '/', filters }) => {
        const params = new URLSearchParams();
        if (path) params.append('path', path);
        if (filters?.includePatterns) {
          filters.includePatterns.forEach(pattern => params.append('includePatterns', pattern));
        }
        if (filters?.excludePatterns) {
          filters.excludePatterns.forEach(pattern => params.append('excludePatterns', pattern));
        }
        if (filters?.minSize) params.append('minSize', filters.minSize.toString());
        if (filters?.maxSize) params.append('maxSize', filters.maxSize.toString());
        if (filters?.modifiedAfter) params.append('modifiedAfter', filters.modifiedAfter);
        if (filters?.modifiedBefore) params.append('modifiedBefore', filters.modifiedBefore);
        if (filters?.fileTypes) {
          filters.fileTypes.forEach(type => params.append('fileTypes', type));
        }

        return `/clouds/${providerId}/files?${params.toString()}`;
      },
      providesTags: (result, error, { providerId, path }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'FileItem' as const, id })),
              { type: 'FileItem', id: `${providerId}:${path}` },
            ]
          : [{ type: 'FileItem', id: `${providerId}:${path}` }],
    }),

    // Get file info
    getFileInfo: builder.query<FileItem, { providerId: string; path: string }>({
      query: ({ providerId, path }) => ({
        url: `/clouds/${providerId}/files/info`,
        params: { path },
      }),
      providesTags: (result, error, { providerId, path }) => [
        { type: 'FileItem', id: `${providerId}:${path}` },
      ],
    }),

    // Search files in cloud storage
    searchFiles: builder.query<
      FileItem[],
      { providerId: string; query: string; path?: string; filters?: FileFilter }
    >({
      query: ({ providerId, query, path, filters }) => {
        const params = new URLSearchParams();
        params.append('q', query);
        if (path) params.append('path', path);
        if (filters?.includePatterns) {
          filters.includePatterns.forEach(pattern => params.append('includePatterns', pattern));
        }
        if (filters?.excludePatterns) {
          filters.excludePatterns.forEach(pattern => params.append('excludePatterns', pattern));
        }
        if (filters?.minSize) params.append('minSize', filters.minSize.toString());
        if (filters?.maxSize) params.append('maxSize', filters.maxSize.toString());
        if (filters?.fileTypes) {
          filters.fileTypes.forEach(type => params.append('fileTypes', type));
        }

        return `/clouds/${providerId}/files/search?${params.toString()}`;
      },
    }),

    // Create folder
    createFolder: builder.mutation<FileItem, { providerId: string; path: string }>({
      query: ({ providerId, path }) => ({
        url: `/clouds/${providerId}/folders`,
        method: 'POST',
        body: { path },
      }),
      invalidatesTags: (result, error, { providerId }) => [
        { type: 'FileItem', id: `${providerId}:*` },
      ],
    }),

    // Delete file or folder
    deleteFile: builder.mutation<APIResponse, { providerId: string; path: string }>({
      query: ({ providerId, path }) => ({
        url: `/clouds/${providerId}/files`,
        method: 'DELETE',
        body: { path },
      }),
      invalidatesTags: (result, error, { providerId }) => [
        { type: 'FileItem', id: `${providerId}:*` },
      ],
    }),

    // Move file or folder
    moveFile: builder.mutation<
      FileItem,
      { providerId: string; sourcePath: string; destinationPath: string }
    >({
      query: ({ providerId, sourcePath, destinationPath }) => ({
        url: `/clouds/${providerId}/files/move`,
        method: 'POST',
        body: { sourcePath, destinationPath },
      }),
      invalidatesTags: (result, error, { providerId }) => [
        { type: 'FileItem', id: `${providerId}:*` },
      ],
    }),

    // Copy file or folder
    copyFile: builder.mutation<
      FileItem,
      { providerId: string; sourcePath: string; destinationPath: string }
    >({
      query: ({ providerId, sourcePath, destinationPath }) => ({
        url: `/clouds/${providerId}/files/copy`,
        method: 'POST',
        body: { sourcePath, destinationPath },
      }),
      invalidatesTags: (result, error, { providerId }) => [
        { type: 'FileItem', id: `${providerId}:*` },
      ],
    }),

    // Get download URL
    getDownloadUrl: builder.query<
      { url: string; expiresAt: string },
      { providerId: string; path: string; expiresIn?: number }
    >({
      query: ({ providerId, path, expiresIn }) => {
        const params = new URLSearchParams();
        params.append('path', path);
        if (expiresIn) params.append('expiresIn', expiresIn.toString());

        return `/clouds/${providerId}/files/download-url?${params.toString()}`;
      },
    }),

    // Get storage quota
    getQuota: builder.query<
      { total: number; used: number; available: number; unit: string },
      string
    >({
      query: (providerId) => `/clouds/${providerId}/quota`,
    }),
  }),
});

export const {
  useGetCloudProvidersQuery,
  useGetSupportedProvidersQuery,
  useConnectProviderMutation,
  useTestConnectionMutation,
  useDisconnectProviderMutation,
  useUpdateProviderMutation,
  useBrowseFilesQuery,
  useGetFileInfoQuery,
  useSearchFilesQuery,
  useCreateFolderMutation,
  useDeleteFileMutation,
  useMoveFileMutation,
  useCopyFileMutation,
  useGetDownloadUrlQuery,
  useGetQuotaQuery,
} = cloudProvidersApi;

export default cloudProvidersApi;