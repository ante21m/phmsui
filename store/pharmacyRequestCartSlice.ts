import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  drugMasterId: string;
  drugName: string;
  requestedQty: number;
}

export interface PharmacyRequestCartState {
  items: CartItem[];
  departmentId: string;
  storeId: string;
}

const initialState: PharmacyRequestCartState = {
  items: [],
  departmentId: '',
  storeId: '',
};

export const pharmacyRequestCartSlice = createSlice({
  name: 'pharmacyRequestCart',
  initialState,
  reducers: {
    setDepartment: (state, action: PayloadAction<string>) => {
      state.departmentId = action.payload;
    },
    setStore: (state, action: PayloadAction<string>) => {
      state.storeId = action.payload;
    },
    addItem: (state, action: PayloadAction<CartItem>) => {
      const exists = state.items.find(i => i.drugMasterId === action.payload.drugMasterId);
      if (!exists) state.items.push(action.payload);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.drugMasterId !== action.payload);
    },
    updateQty: (state, action: PayloadAction<{ drugMasterId: string; qty: number }>) => {
      const item = state.items.find(i => i.drugMasterId === action.payload.drugMasterId);
      if (item) item.requestedQty = action.payload.qty;
    },
    clearCart: (state) => {
      state.items = [];
      state.departmentId = '';
      state.storeId = '';
    },
  },
});

export const { setDepartment, setStore, addItem, removeItem, updateQty, clearCart } = pharmacyRequestCartSlice.actions;
