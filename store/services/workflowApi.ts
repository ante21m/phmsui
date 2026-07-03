import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export interface WorkflowStep {
  id?: string;
  stepOrder: number;
  stepName: string;
  role: string;
  canModifyQuantity: boolean;
  isRequired: boolean;
}

export interface WorkflowStepPayload {
  stepOrder: number;
  role: string;
  stepName: string;
  canModifyQuantity?: boolean;
  isRequired?: boolean;
  workflowDefinitionId?: string;
}

export interface ApprovalWorkflow {
  id: string;
  moduleName: string;
  workflowName: string;
  description: string;
  isActive: boolean;
  steps: WorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
}

export type ApprovalWorkflowPayload = Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>;

export interface WorkflowListResponse {
  data: ApprovalWorkflow[];
  total: number;
  page: number;
  limit: number;
}



export const workflowApi = createApi({
  reducerPath: 'workflowApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ApprovalWorkflow'],
  endpoints: (builder) => ({
    getApprovalWorkflows: builder.query<WorkflowListResponse, { page?: number; limit?: number; search?: string; isActive?: string; moduleName?: string }>({
      query: (params) => ({ url: '/workflow-management/definitions', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'ApprovalWorkflow' as const, id })),
              { type: 'ApprovalWorkflow', id: 'LIST' },
            ]
          : [{ type: 'ApprovalWorkflow', id: 'LIST' }],
    }),

    getApprovalWorkflowById: builder.query<ApprovalWorkflow, string>({
      query: (id) => `/workflow-management/definitions/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'ApprovalWorkflow', id }],
    }),

    createApprovalWorkflow: builder.mutation<ApprovalWorkflow, ApprovalWorkflowPayload>({
      query: (body) => ({ url: '/workflow-management/definitions', method: 'POST', body }),
      invalidatesTags: [{ type: 'ApprovalWorkflow', id: 'LIST' }],
    }),

    updateApprovalWorkflow: builder.mutation<ApprovalWorkflow, { id: string; body: Partial<ApprovalWorkflowPayload> }>({
      query: ({ id, body }) => ({ url: `/workflow-management/definitions/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'ApprovalWorkflow', id },
        { type: 'ApprovalWorkflow', id: 'LIST' },
      ],
    }),

    deleteApprovalWorkflow: builder.mutation<void, string>({
      query: (id) => ({ url: `/workflow-management/definitions/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'ApprovalWorkflow', id },
        { type: 'ApprovalWorkflow', id: 'LIST' },
      ],
    }),

    toggleApprovalWorkflowActive: builder.mutation<ApprovalWorkflow, string>({
      query: (id) => ({ url: `/workflow-management/definitions/${id}/toggle-active`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'ApprovalWorkflow', id },
        { type: 'ApprovalWorkflow', id: 'LIST' },
      ],
    }),

    // ── Steps ──

    getStepsByDefinition: builder.query<WorkflowStep[], string>({
      query: (definitionId) => `/workflow-management/steps/by-definition/${definitionId}`,
    }),

    getWorkflowStepById: builder.query<WorkflowStep, string>({
      query: (id) => `/workflow-management/steps/${id}`,
    }),

    createWorkflowStep: builder.mutation<WorkflowStep, WorkflowStepPayload>({
      query: (body) => ({ url: '/workflow-management/steps', method: 'POST', body }),
      invalidatesTags: [{ type: 'ApprovalWorkflow', id: 'LIST' }],
    }),

    updateWorkflowStep: builder.mutation<WorkflowStep, { id: string; body: Partial<WorkflowStepPayload> }>({
      query: ({ id, body }) => ({ url: `/workflow-management/steps/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'ApprovalWorkflow', id: 'LIST' }],
    }),

    deleteWorkflowStep: builder.mutation<void, string>({
      query: (id) => ({ url: `/workflow-management/steps/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'ApprovalWorkflow', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetApprovalWorkflowsQuery,
  useGetApprovalWorkflowByIdQuery,
  useCreateApprovalWorkflowMutation,
  useUpdateApprovalWorkflowMutation,
  useDeleteApprovalWorkflowMutation,
  useToggleApprovalWorkflowActiveMutation,
  useGetStepsByDefinitionQuery,
  useGetWorkflowStepByIdQuery,
  useCreateWorkflowStepMutation,
  useUpdateWorkflowStepMutation,
  useDeleteWorkflowStepMutation,
} = workflowApi;
