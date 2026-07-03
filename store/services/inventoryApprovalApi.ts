import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export enum InventoryApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface InventoryApproval {
  id: string;
  requestId: string;
  stepId: string;
  stepOrder: number;
  role: string;
  approvedBy: string;
  status: InventoryApprovalStatus;
  comment: string;
  approvalDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  approvedTasks?: InventoryApproval[];
  request?: {
    requestedByUser?: { id: string; firstName: string; fatherName: string };
    items?: InventoryApprovalItem[];
  };
  approvedByUser?: { id: string; firstName: string; fatherName: string };
  step?: any;
}

export interface InventoryApprovalItem {
  id: string;
  variantId: string;
  requestedQuantity: number;
  approvedQuantity: number;
  issuedQuantity: number;
  confirmedQuantity: number;
  unitCost: number;
  totalCost: number;
  remarks?: string;
}

export interface CreateInventoryApprovalDto {
  requestId: string;
  approvedBy: string;
  status: InventoryApprovalStatus;
  comment?: string;
}

export interface UpdateInventoryApprovalDto {
  id: string;
  status?: InventoryApprovalStatus;
  comment?: string;
}

export interface InventoryApprovalListResponse {
  data: InventoryApproval[];
  total: number;
}



export const inventoryApprovalApi = createApi({
  reducerPath: 'inventoryApprovalApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['InventoryApproval'],
  endpoints: (builder) => ({
    getInventoryApprovals: builder.query<InventoryApprovalListResponse, Record<string, any>>({
      query: (params) => ({ url: '/inventory-approvals', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'InventoryApproval' as const, id })),
              { type: 'InventoryApproval', id: 'LIST' },
            ]
          : [{ type: 'InventoryApproval', id: 'LIST' }],
    }),

    getInventoryApprovalById: builder.query<InventoryApproval, string>({
      query: (id) => `/inventory-approvals/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'InventoryApproval', id }],
    }),

    createInventoryApproval: builder.mutation<InventoryApproval, CreateInventoryApprovalDto>({
      query: (body) => ({ url: '/inventory-approvals', method: 'POST', body }),
      invalidatesTags: [{ type: 'InventoryApproval', id: 'LIST' }],
    }),

    updateInventoryApproval: builder.mutation<InventoryApproval, UpdateInventoryApprovalDto>({
      query: ({ id, ...body }) => ({ url: `/inventory-approvals/${id}`, method: 'PATCH', body: { id, ...body } }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'InventoryApproval', id },
        { type: 'InventoryApproval', id: 'LIST' },
      ],
    }),

    deleteInventoryApproval: builder.mutation<void, string>({
      query: (id) => ({ url: `/inventory-approvals/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'InventoryApproval', id },
        { type: 'InventoryApproval', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetInventoryApprovalsQuery,
  useGetInventoryApprovalByIdQuery,
  useCreateInventoryApprovalMutation,
  useUpdateInventoryApprovalMutation,
  useDeleteInventoryApprovalMutation,
} = inventoryApprovalApi;
