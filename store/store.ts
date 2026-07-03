import { configureStore } from '@reduxjs/toolkit';
import { drugApi } from './services/drugApi';
import { workflowApi } from './services/workflowApi';
import { inventoryApprovalApi } from './services/inventoryApprovalApi';
import { usersApi } from './services/usersApi';
import { pharmacyRequestApi } from './apis/pharmacyRequestApi';
import { pharmacyRequestCartSlice } from './pharmacyRequestCartSlice';

export const store = configureStore({
  reducer: {
    [drugApi.reducerPath]: drugApi.reducer,
    [workflowApi.reducerPath]: workflowApi.reducer,
    [inventoryApprovalApi.reducerPath]: inventoryApprovalApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [pharmacyRequestApi.reducerPath]: pharmacyRequestApi.reducer,
    [pharmacyRequestCartSlice.name]: pharmacyRequestCartSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(drugApi.middleware, workflowApi.middleware, inventoryApprovalApi.middleware, usersApi.middleware, pharmacyRequestApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
