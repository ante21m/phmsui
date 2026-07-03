import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export interface User {
  id: string;
  firstName: string;
  fatherName: string;
  username: string;
  email: string;
  phone: string;
  roles: string[];
  isActive: boolean;
  organizationId?: string;
}

export interface CreateUserPayload {
  firstName: string;
  fatherName: string;
  grandFatherName?: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  username: string;
  password: string;
  companyId?: string;
  roles: string[];
}

export interface UpdateUserPayload {
  firstName?: string;
  fatherName?: string;
  grandFatherName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  username?: string;
  password?: string;
  companyId?: string;
  roles?: string[];
}

export interface UsersListResponse {
  data: User[];
  total: number;
}

export interface UsersQueryParams {
  page?: number;
  perPage?: number;
  search?: string;
}



export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Users'],
  endpoints: (builder) => ({

    getUsers: builder.query<UsersListResponse, UsersQueryParams>({
      query: ({ page = 1, perPage = 10, search = '' } = {}) => ({
        url: '/auth/users',
        params: {
          take: perPage,
          skip: (page - 1) * perPage,
          ...(search ? { search } : {}),
        },
      }),
      transformResponse: (response: { data: User[]; total: number }) => {
        const mapped = response.data.map(u => ({
          ...u,
          status: u.isActive ? 'active' as const : 'inactive' as const,
        }));
        return { data: mapped as any, total: response.total };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Users' as const, id })),
              { type: 'Users', id: 'LIST' },
            ]
          : [{ type: 'Users', id: 'LIST' }],
    }),

    createUser: builder.mutation<User, CreateUserPayload>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: [{ type: 'Users', id: 'LIST' }],
    }),

    updateUserRoles: builder.mutation<User, { id: string; body: { roles: string[] } }>({
      query: ({ id, body }) => ({
        url: '/auth/grant-roles',
        method: 'POST',
        body: { userId: id, roles: body.roles },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Users', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),

    deactivateUser: builder.mutation<User, string>({
      query: (id) => ({ url: `/auth/deactivate/${id}`, method: 'POST' }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Users', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),

    activateUser: builder.mutation<User, string>({
      query: (id) => ({ url: `/auth/activate/${id}`, method: 'POST' }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Users', id },
        { type: 'Users', id: 'LIST' },
      ],
    }),

  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserRolesMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
} = usersApi;
