import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export interface DrugMaster {
  id: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
  unitOfMeasure: string;
  reorderLevel: number;
  categoryId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
  category?: { code: string; name: string; active: boolean };
}

export interface DrugCategory {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface ItemMaster {
  id: string;
  itemCode: string;
  name: string;
  description?: string;
  categoryId?: string;
  hasVariants?: boolean;
  unitOfMeasureId?: string;
  requiresSerialNumber?: boolean;
  reorderQuantity?: number;
  specification?: string;
  assetType?: string;
  variants?: ItemVariant[];
  category?: { id: string; name: string };
  unitOfMeasure?: { id: string; name: string; symbol: string };
}

export interface ItemVariantInput {
  variantName: string;
  attributes: Record<string, string>;
}

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
  status?: boolean;
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
  isActive?: boolean;
}

export interface LookupItem {
  value: string;
  label: string;
}

export interface DrugPurchaseItem {
  id: string;
  purchaseId: string;
  drugId: string | null;
  drugName: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  batchNo: string;
  expiryDate: string;
  qtyRemaining: number;
  remainingDays?: number;
  type?: string;
  createdAt: string;
  drug?: DrugMaster;
}

export interface DrugPurchase {
  id: string;
  invoiceNo: string;
  supplierId: string | null;
  purchaseDate: string;
  createdAt: string;
  items: DrugPurchaseItem[];
}

export interface CreateDrugPurchaseItem {
  drugId?: string;
  drugName: string;
  uom: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  batchNo?: string;
  expiryDate?: string;
  qtyRemaining: number;
}

export interface CreateDrugPurchase {
  invoiceNo?: string;
  supplierId?: string;
  purchaseDate?: string;
  items: CreateDrugPurchaseItem[];
}

export interface DrugDispatchItem {
  id: string;
  dispatchId: string;
  purchaseItemId: string;
  quantity: number;
  currentQty: number;
  purchaseItem?: DrugPurchaseItem;
}

export interface DrugDispatchAcceptance {
  id: string;
  dispatchId: string;
  acceptedBy: string;
  acceptedByUser?: { id: string; firstName: string; fatherName: string };
  acceptedDate: string;
  status: string;
  comment: string | null;
  createdAt: string;
}

export interface DrugDispatch {
  id: string;
  dispatchDate: string;
  dispatchedBy: string;
  dispatchedTo: string;
  dispatchStatus: 'Pending' | 'Confirmed' | 'Rejected';
  createdAt: string;
  items: DrugDispatchItem[];
  dispatchedByUser?: { id: string; firstName: string; fatherName: string };
  dispatchedToUser?: { id: string; firstName: string; fatherName: string };
  acceptances?: DrugDispatchAcceptance[];
}

export interface CreateDrugDispatchItem {
  purchaseItemId: string;
  quantity: number;
  currentQty: number;
}

export interface CreateDrugDispatch {
  dispatchDate?: string;
  dispatchedBy?: string;
  dispatchedTo?: string;
  dispatchStatus?: string;
  items: CreateDrugDispatchItem[];
}

export interface ItemPurchaseItem {
  id: string;
  purchaseId: string;
  itemId: string | null;
  itemName: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  batchNo: string;
  expiryDate: string;
  qtyRemaining: number;
  createdAt: string;
  item?: ItemMaster;
}

export interface ItemDispatchItem {
  id: string;
  dispatchId: string;
  purchaseItemId: string;
  quantity: number;
  currentQty?: number;
  purchaseItem?: ItemPurchaseItem;
}

export interface ItemPurchase {
  id: string;
  invoiceNo: string;
  supplierId: string | null;
  purchaseDate: string;
  createdAt: string;
  items: ItemPurchaseItem[];
}

export interface CreateItemPurchaseItem {
  itemId?: string;
  variantId?: string;
  itemName: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  batchNo?: string;
  expiryDate?: string;
  qtyRemaining: number;
}

export interface CreateItemPurchase {
  invoiceNo?: string;
  supplierId?: string;
  purchaseDate?: string;
  items: CreateItemPurchaseItem[];
}

export interface ItemDispatch {
  id: string;
  dispatchDate: string;
  dispatchedBy: string;
  dispatchedTo: string;
  dispatchStatus: string;
  createdAt: string;
  items: ItemDispatchItem[];
  dispatchedByUser?: { id: string; firstName: string; fatherName: string };
  dispatchedToUser?: { id: string; firstName: string; fatherName: string };
}

export interface CreateItemDispatchItem {
  purchaseItemId: string;
  quantity: number;
}

export interface CreateItemDispatch {
  dispatchDate?: string;
  dispatchedBy?: string;
  dispatchedTo?: string;
  items: CreateItemDispatchItem[];
}

export interface LowStockItem {
  name: string;
  qtyRemaining: number;
  reorderLevel: number;
  type: 'drug' | 'item';
}

export interface LowStockQueryParams {
  take?: number;
  skip?: number;
  search?: string;
  orderBy?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserDetail {
  id: string;
  username: string;
  firstName: string;
  fatherName: string;
  phone: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface SupplierPhone {
  id?: string;
  phoneNumber: string;
  label?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPhone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  phones: SupplierPhone[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateSupplierDto {
  name: string;
  contactPhone?: string;
  email?: string;
  address?: string;
  active?: boolean;
  phones?: { phoneNumber: string; label?: string }[];
}

export interface InventoryRequestItem {
  id?: string;
  variantId: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  issuedQuantity?: number;
  confirmedQuantity?: number;
  unitCost?: number;
  totalCost?: number;
  remarks?: string;
}

export interface InventoryRequest {
  id: string;
  requestedBy: string;
  departmentId: string | null;
  warehouseId: string | null;
  purpose: string | null;
  status: string;
  requestedDate: string;
  items: InventoryRequestItem[];
  requestedByUser?: { id: string; firstName?: string; lastName?: string };
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateInventoryRequestDto {
  departmentId: string;
  warehouseId: string;
  purpose: string;
  status: string;
  items: { variantId: string; requestedQuantity: number; approvedQuantity: number; remarks?: string }[];
}

export interface UpdateInventoryRequestDto {
  id: string;
  status?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contactPhone?: string;
  email?: string;
  address?: string;
  active?: boolean;
  phones?: { phoneNumber: string; label?: string }[];
}

// ─── Departments ───
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateDepartmentDto {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

// ─── Stores ───
export interface ItemVariant {
  id: string;
  itemId: string;
  variantName: string;
  sku: string;
  attributes: Record<string, any>;
  sellingPrice: number;
  buyingPrice: number;
  barcode: string;
  isActive: boolean;
  item?: { id: string; itemCode: string; name: string };
}

export interface CreateItemVariantDto {
  itemId: string;
  sku: string;
  attributes?: Record<string, any>;
  sellingPrice: number;
  buyingPrice: number;
  barcode?: string;
  isActive?: boolean;
}

export interface UpdateItemVariantDto {
  itemId?: string;
  sku?: string;
  attributes?: Record<string, any>;
  sellingPrice?: number;
  buyingPrice?: number;
  barcode?: string;
  isActive?: boolean;
}

export interface Store {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateStoreDto {
  name: string;
  code?: string;
  location?: string;
  isActive?: boolean;
}

export interface UpdateStoreDto {
  id: string;
  name?: string;
  code?: string;
  location?: string;
  isActive?: boolean;
}

// ─── Pharmacy Requests ───
export interface PharmacyRequestItem {
  id?: number;
  drugMasterId: string;
  requestedQty: number;
  approvedQty?: number;
  issuedQty?: number;
  receivedQty?: number;
  drug?: DrugMaster;
}

export interface PharmacyRequest {
  id: string;
  requestNo: string;
  departmentId?: string | null;
  storeId: string;
  requestedBy: string;
  status: string;
  requestedDate: string;
  approvedBy?: string | null;
  issuedBy?: string | null;
  receivedBy?: string | null;
  items: PharmacyRequestItem[];
  department?: Department | null;
  store?: Store | null;
  requestedByUser?: { id: string; firstName?: string; lastName?: string };
  createdAt: string;
  updatedAt: string | null;
}

export interface CreatePharmacyRequestDto {
  departmentId?: string;
  storeId: string;
  items: { drugMasterId: string; requestedQty: number }[];
}

export interface DrugLoss {
  id: string;
  drugId: string | null;
  dispatchDetailId: string | null;
  quantity: number;
  reason: string;
  lossDate: string;
  status: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  rejectionReason: string | null;
  drug?: DrugMaster;
  dispatchDetail?: { id: string; [key: string]: unknown };
}

export interface DrugSaleItem {
  id?: string;
  saleId?: string;
  medicationName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dispatchDetailId?: string | null;
  prescriptionDetailId?: string;
}

export interface ItemSaleItem {
  id?: string;
  saleId?: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  dispatchDetailId?: string;
}

export interface CreateDrugSaleDto {
  pharmacistId?: string;
  sex?: string;
  age?: string;
  fullName?: string;
  mrn?: string;
  prescriptionId?: number;
  soldAt?: string;
  payerType?: string;
  paymentMethod?: string;
  organizationId?: number;
  items?: DrugSaleItem[];
  itemItems?: ItemSaleItem[];
}

export interface DrugSale {
  id: string;
  pharmacistId: string | null;
  sex: string | null;
  age: string | null;
  fullName: string | null;
  mrn: string | null;
  prescriptionId: number | null;
  soldAt: string | null;
  payerType: string;
  paymentMethod: string;
  organizationId: number | null;
  createdAt: string;
  returned: boolean;
  items: DrugSaleItem[];
  itemSaleItems?: ItemSaleItem[];
  pharmacist?: { id: string; firstName?: string; lastName?: string };
}

export interface ReturnItemDto {
  dispatchDetailId: string;
  quantity: number;
}

export interface CreateDrugSalesReturnDto {
  saleId: string;
  items?: ReturnItemDto[];
  salesDetail?: string;
  drugSale?: string;
  returnReason?: string;
}

export interface DrugSalesReturn {
  id: string;
  saleId: string;
  returnConfirmedBy: string;
  returnedAt: string;
  salesDetail: string | null;
  drugSale: string | null;
  returnReason: string | null;
  sale?: DrugSale;
  confirmedBy?: { id: string; firstName?: string; lastName?: string };
}

export interface CreateDrugLossDto {
  drugId?: string;
  dispatchDetailId?: string;
  quantity: number;
  reason: string;
  lossDate?: string;
}

// ─── Reports ───
export interface AvailableItemSummary {
  id: number;
  name: string;
  unit?: string;
  batchNo: string;
  quantity: number;
  qtyRemaining: number;
  purchasePrice: number;
  rowTotal: number;
}

export interface AvailableItemsSummaryResponse {
  drugs: AvailableItemSummary[];
  nonDrugs: AvailableItemSummary[];
  drugsTotalCost: number;
  nonDrugsTotalCost: number;
  grandTotalCost: number;
}

export interface AvailableItem {
  drugId: number;
  genericName: string;
  strength: string;
  dosageForm: string;
  totalPurchased: number;
  currentQuantity: number;
  avgPurchasePrice: number;
  totalPurchaseCost: number;
}

export interface SoldDrugCount {
  drugName: string;
  dosageForm: string | null;
  strength: string | null;
  totalSold: number;
  totalPaid: number;
  unitPrice: number;
}

export interface SoldItemCount {
  itemName: string;
  totalSold: number;
  totalPaid: number;
  unitPrice: number;
}

export interface BatchStockItem {
  purchaseItemId: number;
  drugId: number;
  qualifiedName: string;
  batchNo: string;
  expiryDate: string;
  quarantined: boolean;
  inStore: number;
  inPharmacy: number;
  totalAvailable: number;
}

export interface IncomeSummaryRow {
  date: string;
  drugIncome: number;
  itemIncome: number;
  totalIncome: number;
}

export interface IncomeSummaryResponse {
  data: IncomeSummaryRow[];
  totals: { totalDrugIncome: number; totalItemIncome: number; grandTotal: number };
}

export interface ProfitSummaryDrug {
  qualifiedName: string;
  soldQuantity: number;
  totalPurchaseCost: number;
  totalSold: number;
  netProfit: number;
}

export interface ProfitSummaryItem {
  itemName: string;
  soldQuantity: number;
  totalPurchaseCost: number;
  totalSold: number;
  netProfit: number;
}

export interface ProfitSummaryResponse {
  drugs: ProfitSummaryDrug[];
  items: ProfitSummaryItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface BatchStockQueryParams extends ReportQueryParams {
  drugId?: string;
}

export interface IncomeQueryParams {
  startDate?: string;
  endDate?: string;
}



export const drugApi = createApi({
  reducerPath: 'drugApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['DrugMaster', 'DrugPurchase', 'DrugDispatch', 'DrugStock', 'DrugLoss', 'DrugSale', 'DrugSalesReturn', 'Supplier', 'InventoryRequest', 'Department', 'ItemMaster', 'ItemVariant', 'ItemPurchase', 'ItemDispatch', 'Store', 'PharmacyRequest'],
  endpoints: (builder) => ({
    // ─── Auth ───
    login: builder.mutation<AuthTokens, { username: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<void, { username: string; password: string; firstName: string; fatherName: string; phone: string; email: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    getUserDetail: builder.query<UserDetail, void>({
      query: () => '/auth/user-detail',
    }),
    getUsers: builder.query<UserDetail[], void>({
      query: () => '/auth/users',
      transformResponse: (res: { data: UserDetail[]; total: number }) => res.data,
    }),
    refreshToken: builder.mutation<{ accessToken: string }, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh-token', method: 'POST', body }),
    }),

    // ─── Drug Master ───
    getDrugs: builder.query<DrugMaster[], void>({
      query: () => '/drug-master?take=1000',
      providesTags: ['DrugMaster'],
      transformResponse: (res: { data: DrugMaster[]; total: number }) => res.data,
    }),
    getDrug: builder.query<DrugMaster, string>({
      query: (id) => `/drug-master/${id}`,
      providesTags: ['DrugMaster'],
    }),
    addDrug: builder.mutation<DrugMaster, Partial<DrugMaster>>({
      query: (body) => ({ url: '/drug-master', method: 'POST', body }),
      invalidatesTags: ['DrugMaster'],
    }),
    updateDrug: builder.mutation<DrugMaster, { id: string } & Partial<DrugMaster>>({
      query: ({ id, ...body }) => ({ url: `/drug-master/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['DrugMaster'],
    }),
    deleteDrug: builder.mutation<void, string>({
      query: (id) => ({ url: `/drug-master/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DrugMaster'],
    }),

    // ─── Drug Category Lookups ───
    getDrugCategories: builder.query<DrugCategory[], void>({
      query: () => '/drug-master/drug-categories',
    }),
    getUnitOfMeasurements: builder.query<LookupItem[], void>({
      query: () => '/drug-master/unit-of-measurements',
    }),
    getDrugForms: builder.query<LookupItem[], void>({
      query: () => '/drug-master/drug-forms',
    }),

    // ─── Drug Purchases ───
    savePurchase: builder.mutation<DrugPurchase, CreateDrugPurchase>({
      query: (body) => ({ url: '/drug-purchases', method: 'POST', body }),
      invalidatesTags: ['DrugPurchase', 'DrugStock'],
    }),
    updateDrugPurchaseItem: builder.mutation<DrugPurchaseItem, { id: string } & Partial<CreateDrugPurchaseItem>>({
      query: ({ id, ...body }) => ({ url: `/drug-purchases/items/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['DrugPurchase', 'DrugStock'],
    }),
    getPurchases: builder.query<{ data: DrugPurchase[]; total: number }, void>({
      query: () => '/drug-purchases?take=100',
      providesTags: ['DrugPurchase'],
    }),
    getDrugStocks: builder.query<DrugPurchaseItem[], void>({
      query: () => '/drug-purchases?take=1000',
      providesTags: ['DrugStock'],
      transformResponse: (res: { data: DrugPurchase[]; total: number }) => {
        const items: DrugPurchaseItem[] = [];
        for (const p of res.data) {
          for (const it of p.items) {
            items.push(it);
          }
        }
        return items;
      },
    }),
    getPurchase: builder.query<DrugPurchase, string>({
      query: (id) => `/drug-purchases/${id}`,
      providesTags: ['DrugPurchase'],
    }),

    // ─── Drug Dispatches ───
    dispatchDrug: builder.mutation<DrugDispatch, CreateDrugDispatch>({
      query: (body) => ({ url: '/drug-dispatches', method: 'POST', body }),
      invalidatesTags: ['DrugDispatch', 'DrugStock'],
    }),
    getDispatchedDrugs: builder.query<DrugDispatch[], void>({
      query: () => '/drug-dispatches?take=1000',
      providesTags: ['DrugDispatch'],
      transformResponse: (res: { data: DrugDispatch[]; total: number }) => res.data,
    }),
    getPendingDispatch: builder.query<DrugDispatch[], void>({
      query: () => '/drug-dispatches?take=1000',
      providesTags: ['DrugDispatch'],
      transformResponse: (res: { data: DrugDispatch[]; total: number }) => res.data.filter(d => d.dispatchStatus === 'Pending'),
    }),
    confirmDispatch: builder.mutation<DrugDispatch, string>({
      query: (id) => ({ url: `/drug-dispatches/${id}/confirm`, method: 'POST' }),
      invalidatesTags: ['DrugDispatch', 'DrugStock'],
    }),
    rejectDispatch: builder.mutation<DrugDispatch, { id: string; comment?: string }>({
      query: ({ id, comment }) => ({ url: `/drug-dispatches/${id}/reject`, method: 'POST', body: { comment } }),
      invalidatesTags: ['DrugDispatch'],
    }),

    // ─── Low Stock & Expiry ───
    getLowStockDrugs: builder.query<PaginatedResponse<LowStockItem>, LowStockQueryParams | void>({
      query: (params) => {
        const p: Record<string, string> = {};
        if (params?.take) p.take = String(params.take);
        if (params?.skip) p.skip = String(params.skip);
        if (params?.search) p.search = params.search;
        if (params?.orderBy) p.orderBy = params.orderBy;
        const qs = new URLSearchParams(p).toString();
        return `/drug-purchases/low-stock${qs ? '?' + qs : ''}`;
      },
    }),
    getExpiryAlerts: builder.query<DrugPurchaseItem[], number>({
      query: (days = 30) => `/drug-purchases/expiry-alert?days=${days}`,
      transformResponse: (res: { data: { name: string; batchNo: string; expiryDate: string; qtyRemaining: number; remainingDays: number; type: string }[] }) =>
        res.data.map((r, i) => ({
          id: `${r.batchNo}-${i}`,
          purchaseId: '',
          drugId: null,
          drugName: r.name,
          quantity: 0,
          purchasePrice: 0,
          salePrice: 0,
          batchNo: r.batchNo,
          expiryDate: r.expiryDate,
          qtyRemaining: r.qtyRemaining,
          remainingDays: r.remainingDays,
          type: r.type,
          createdAt: '',
        })),
    }),

    // ─── Drug Losses ───
    getDrugLosses: builder.query<DrugLoss[], void>({
      query: () => '/drug-losses',
      providesTags: ['DrugLoss'],
    }),
    createDrugLoss: builder.mutation<DrugLoss, CreateDrugLossDto>({
      query: (body) => ({ url: '/drug-losses', method: 'POST', body }),
      invalidatesTags: ['DrugLoss'],
    }),
    updateDrugLoss: builder.mutation<DrugLoss, { id: string } & Partial<CreateDrugLossDto>>({
      query: ({ id, ...body }) => ({ url: `/drug-losses/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['DrugLoss'],
    }),
    submitDrugLoss: builder.mutation<DrugLoss, string>({
      query: (id) => ({ url: `/drug-losses/${id}/submit`, method: 'POST' }),
      invalidatesTags: ['DrugLoss'],
    }),
    approveDrugLoss: builder.mutation<DrugLoss, string>({
      query: (id) => ({ url: `/drug-losses/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['DrugLoss'],
    }),
    rejectDrugLoss: builder.mutation<DrugLoss, { id: string; rejectionReason?: string }>({
      query: ({ id, rejectionReason }) => ({ url: `/drug-losses/${id}/reject`, method: 'POST', body: { rejectionReason } }),
      invalidatesTags: ['DrugLoss'],
    }),
    deleteDrugLoss: builder.mutation<void, string>({
      query: (id) => ({ url: `/drug-losses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DrugLoss'],
    }),

    // Drug Sales
    createDrugSale: builder.mutation<DrugSale, CreateDrugSaleDto>({
      query: (body) => ({ url: '/drug-sales', method: 'POST', body }),
      invalidatesTags: ['DrugSale', 'DrugDispatch', 'DrugStock'],
    }),
    getDrugSales: builder.query<DrugSale[], void>({
      query: () => '/drug-sales',
      providesTags: ['DrugSale'],
      transformResponse: (res: { data: DrugSale[]; total: number }) => res.data,
    }),
    getDrugSale: builder.query<DrugSale, string>({
      query: (id) => `/drug-sales/${id}`,
      providesTags: ['DrugSale'],
    }),
    updateDrugSale: builder.mutation<DrugSale, { id: string } & Partial<CreateDrugSaleDto>>({
      query: ({ id, ...body }) => ({ url: `/drug-sales/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['DrugSale', 'DrugDispatch', 'DrugStock'],
    }),
    deleteDrugSale: builder.mutation<void, string>({
      query: (id) => ({ url: `/drug-sales/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DrugSale'],
    }),

    // ─── Drug Sales Returns ───
    createDrugSalesReturn: builder.mutation<DrugSalesReturn, CreateDrugSalesReturnDto>({
      query: (body) => ({ url: '/drug-sales-returns', method: 'POST', body }),
      invalidatesTags: ['DrugSalesReturn', 'DrugSale', 'DrugStock', 'DrugDispatch'],
    }),
    getDrugSalesReturns: builder.query<DrugSalesReturn[], void>({
      query: () => '/drug-sales-returns',
      providesTags: ['DrugSalesReturn'],
      transformResponse: (res: { data: DrugSalesReturn[]; total: number }) => res.data,
    }),
    getDrugSalesReturn: builder.query<DrugSalesReturn, string>({
      query: (id) => `/drug-sales-returns/${id}`,
      providesTags: ['DrugSalesReturn'],
    }),
    getDrugSalesReturnsBySale: builder.query<DrugSalesReturn[], string>({
      query: (saleId) => `/drug-sales-returns/by-sale/${saleId}`,
      providesTags: ['DrugSalesReturn'],
    }),
    updateDrugSalesReturn: builder.mutation<DrugSalesReturn, { id: string } & Partial<CreateDrugSalesReturnDto>>({
      query: ({ id, ...body }) => ({ url: `/drug-sales-returns/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['DrugSalesReturn'],
    }),
    deleteDrugSalesReturn: builder.mutation<void, string>({
      query: (id) => ({ url: `/drug-sales-returns/${id}`, method: 'DELETE' }),
      invalidatesTags: ['DrugSalesReturn'],
    }),

    // ─── Suppliers ───
    getSuppliers: builder.query<Supplier[], void>({
      query: () => '/suppliers?take=1000',
      providesTags: ['Supplier'],
      transformResponse: (res: { data: Supplier[]; total: number }) => res.data,
    }),
    getSupplier: builder.query<Supplier, string>({
      query: (id) => `/suppliers/${id}`,
      providesTags: ['Supplier'],
    }),
    createSupplier: builder.mutation<Supplier, CreateSupplierDto>({
      query: (body) => ({ url: '/suppliers', method: 'POST', body }),
      invalidatesTags: ['Supplier'],
    }),
    updateSupplier: builder.mutation<Supplier, { id: string } & UpdateSupplierDto>({
      query: ({ id, ...body }) => ({ url: `/suppliers/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Supplier'],
    }),
    deleteSupplier: builder.mutation<void, string>({
      query: (id) => ({ url: `/suppliers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Supplier'],
    }),

    // ─── Inventory Requests ───
    getInventoryRequests: builder.query<InventoryRequest[], void>({
      query: () => '/inventory-requests?take=1000',
      providesTags: ['InventoryRequest'],
      transformResponse: (res: { data: InventoryRequest[]; total: number }) => res.data,
    }),
    getInventoryRequest: builder.query<InventoryRequest, string>({
      query: (id) => `/inventory-requests/${id}`,
      providesTags: ['InventoryRequest'],
    }),
    createInventoryRequest: builder.mutation<InventoryRequest, CreateInventoryRequestDto>({
      query: (body) => ({ url: '/inventory-requests', method: 'POST', body }),
      invalidatesTags: ['InventoryRequest'],
    }),
    updateInventoryRequest: builder.mutation<InventoryRequest, UpdateInventoryRequestDto>({
      query: ({ id, ...body }) => ({ url: `/inventory-requests/${id}`, method: 'PATCH', body: { id, ...body } }),
      invalidatesTags: ['InventoryRequest'],
    }),
    deleteInventoryRequest: builder.mutation<void, string>({
      query: (id) => ({ url: `/inventory-requests/${id}`, method: 'DELETE' }),
      invalidatesTags: ['InventoryRequest'],
    }),
    rejectInventoryRequest: builder.mutation<void, string>({
      query: (id) => ({ url: `/inventory-requests/${id}/reject`, method: 'POST' }),
      invalidatesTags: ['InventoryRequest'],
    }),
    approveInventoryRequest: builder.mutation<void, { id: string; comment?: string; modifiedItems: { variantId: string; approvedQuantity: number }[] }>({
      query: ({ id, ...body }) => ({ url: `/inventory-requests/${id}/approve`, method: 'POST', body }),
      invalidatesTags: ['InventoryRequest'],
    }),

    // ─── Departments ───
    getDepartments: builder.query<Department[], void>({
      query: () => '/departments?take=1000',
      providesTags: ['Department'],
    }),
    getDepartment: builder.query<Department, string>({
      query: (id) => `/departments/${id}`,
      providesTags: ['Department'],
    }),
    createDepartment: builder.mutation<Department, CreateDepartmentDto>({
      query: (body) => ({ url: '/departments', method: 'POST', body }),
      invalidatesTags: ['Department'],
    }),
    updateDepartment: builder.mutation<Department, UpdateDepartmentDto>({
      query: ({ id, ...body }) => ({ url: `/departments/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Department'],
    }),
    deleteDepartment: builder.mutation<void, string>({
      query: (id) => ({ url: `/departments/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Department'],
    }),

    // ─── Item Purchases ───
    saveItemPurchase: builder.mutation<ItemPurchase, CreateItemPurchase>({
      query: (body) => ({ url: '/item-purchases', method: 'POST', body }),
      invalidatesTags: ['ItemPurchase'],
    }),
    getItemPurchases: builder.query<{ data: ItemPurchase[]; total: number }, void>({
      query: () => '/item-purchases?take=100',
      providesTags: ['ItemPurchase'],
    }),
    getItemStocks: builder.query<ItemPurchaseItem[], void>({
      query: () => '/item-purchases?take=1000',
      providesTags: ['ItemPurchase'],
      transformResponse: (res: { data: ItemPurchase[]; total: number }) => {
        const items: ItemPurchaseItem[] = [];
        for (const p of res.data) {
          for (const it of p.items) {
            items.push(it);
          }
        }
        return items;
      },
    }),

    // ─── Item Dispatches ───
    dispatchItem: builder.mutation<ItemDispatch, CreateItemDispatch>({
      query: (body) => ({ url: '/item-dispatches', method: 'POST', body }),
      invalidatesTags: ['ItemDispatch', 'ItemPurchase'],
    }),
    getDispatchedItems: builder.query<ItemDispatch[], void>({
      query: () => '/item-dispatches?take=1000',
      providesTags: ['ItemDispatch'],
      transformResponse: (res: { data: ItemDispatch[]; total: number }) => res.data,
    }),
    confirmItemDispatch: builder.mutation<ItemDispatch, string>({
      query: (id) => ({ url: `/item-dispatches/${id}/confirm`, method: 'POST' }),
      invalidatesTags: ['ItemDispatch', 'ItemPurchase'],
    }),
    rejectItemDispatch: builder.mutation<ItemDispatch, { id: string; comment?: string }>({
      query: ({ id, comment }) => ({ url: `/item-dispatches/${id}/reject`, method: 'POST', body: { comment } }),
      invalidatesTags: ['ItemDispatch'],
    }),

    // ─── Item Masters ───
    getItems: builder.query<ItemMaster[], void>({
      query: () => '/item-masters',
      providesTags: ['ItemMaster'],
    }),
    getItem: builder.query<ItemMaster, string>({
      query: (id) => `/item-masters/${id}`,
      providesTags: ['ItemMaster'],
    }),
    addItem: builder.mutation<ItemMaster, Record<string, any>>({
      query: (body) => ({ url: '/item-masters', method: 'POST', body }),
      invalidatesTags: ['ItemMaster'],
    }),
    updateItem: builder.mutation<ItemMaster, { id: string } & Record<string, any>>({
      query: ({ id, ...body }) => ({ url: `/item-masters/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['ItemMaster'],
    }),
    deleteItem: builder.mutation<void, string>({
      query: (id) => ({ url: `/item-masters/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ItemMaster'],
    }),
    getItemCategories: builder.query<ItemCategory[], void>({
      query: () => '/item-masters/categories',
      providesTags: ['ItemMaster'],
    }),
    getUnitOfMeasures: builder.query<UnitOfMeasure[], void>({
      query: () => '/item-masters/unit-of-measures',
      providesTags: ['ItemMaster'],
    }),

    // ─── Item Variants ───
    getItemVariants: builder.query<{ data: ItemVariant[]; total: number }, void>({
      query: () => '/item-variants',
      providesTags: ['ItemVariant'],
    }),
    getItemVariant: builder.query<ItemVariant, string>({
      query: (id) => `/item-variants/${id}`,
      providesTags: ['ItemVariant'],
    }),
    createItemVariant: builder.mutation<ItemVariant, CreateItemVariantDto>({
      query: (body) => ({ url: '/item-variants', method: 'POST', body }),
      invalidatesTags: ['ItemVariant'],
    }),
    updateItemVariant: builder.mutation<ItemVariant, { id: string } & UpdateItemVariantDto>({
      query: ({ id, ...body }) => ({ url: `/item-variants/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['ItemVariant'],
    }),
    deleteItemVariant: builder.mutation<void, string>({
      query: (id) => ({ url: `/item-variants/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ItemVariant'],
    }),

    // ─── Stores ───
    getStores: builder.query<Store[], void>({
      query: () => '/stores?take=1000',
      providesTags: ['Store'],
    }),
    getStore: builder.query<Store, string>({
      query: (id) => `/stores/${id}`,
      providesTags: ['Store'],
    }),
    createStore: builder.mutation<Store, CreateStoreDto>({
      query: (body) => ({ url: '/stores', method: 'POST', body }),
      invalidatesTags: ['Store'],
    }),
    updateStore: builder.mutation<Store, UpdateStoreDto>({
      query: ({ id, ...body }) => ({ url: `/stores/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Store'],
    }),
    deleteStore: builder.mutation<void, string>({
      query: (id) => ({ url: `/stores/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Store'],
    }),

    // ─── Pharmacy Requests ───
    getPharmacyRequests: builder.query<PharmacyRequest[], void>({
      query: () => '/pharmacy-requests',
      providesTags: ['PharmacyRequest'],
    }),
    getPharmacyRequest: builder.query<PharmacyRequest, string>({
      query: (id) => `/pharmacy-requests/${id}`,
      providesTags: ['PharmacyRequest'],
    }),
    createPharmacyRequest: builder.mutation<PharmacyRequest, CreatePharmacyRequestDto>({
      query: (body) => ({ url: '/pharmacy-requests', method: 'POST', body }),
      invalidatesTags: ['PharmacyRequest'],
    }),
    approvePharmacyRequest: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `/pharmacy-requests/${id}/approve`, method: 'POST', body }),
      invalidatesTags: ['PharmacyRequest'],
    }),
    issuePharmacyRequest: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `/pharmacy-requests/${id}/issue`, method: 'POST', body }),
      invalidatesTags: ['PharmacyRequest'],
    }),
    submitPharmacyRequest: builder.mutation<any, string>({
      query: (id) => ({ url: `/pharmacy-requests/${id}/submit`, method: 'POST' }),
      invalidatesTags: ['PharmacyRequest'],
    }),
    rejectPharmacyRequest: builder.mutation<any, string>({
      query: (id) => ({ url: `/pharmacy-requests/${id}/reject`, method: 'POST' }),
      invalidatesTags: ['PharmacyRequest'],
    }),
    receivePharmacyRequest: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({ url: `/pharmacy-requests/${id}/receive`, method: 'POST', body }),
      invalidatesTags: ['PharmacyRequest'],
    }),

    // ─── Reports ───
    getAvailableItemsReport: builder.query<PaginatedResponse<AvailableItem>, ReportQueryParams>({
      query: (params) => ({ url: '/reports/available-items', params }),
    }),
    getAvailableItemsSummary: builder.query<AvailableItemsSummaryResponse, ReportQueryParams>({
      query: (params) => ({ url: '/reports/available-items/summary', params }),
    }),
    getSoldDrugCountsReport: builder.query<PaginatedResponse<SoldDrugCount>, ReportQueryParams>({
      query: (params) => ({ url: '/reports/sold-drug-counts', params }),
    }),
    getBatchStockReport: builder.query<PaginatedResponse<BatchStockItem>, BatchStockQueryParams>({
      query: (params) => ({ url: '/reports/batch-stock', params }),
    }),
    getIncomeSummaryReport: builder.query<IncomeSummaryResponse, IncomeQueryParams>({
      query: (params) => ({ url: '/reports/income-summary', params }),
    }),
    getProfitSummaryReport: builder.query<ProfitSummaryResponse, IncomeQueryParams>({
      query: (params) => ({ url: '/reports/profit-summary', params }),
    }),
    getSoldItemCountsReport: builder.query<PaginatedResponse<SoldItemCount>, ReportQueryParams>({
      query: (params) => ({ url: '/reports/sold-item-counts', params }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetUserDetailQuery,
  useGetUsersQuery,
  useRefreshTokenMutation,
  useGetDrugsQuery,
  useGetDrugQuery,
  useAddDrugMutation,
  useUpdateDrugMutation,
  useDeleteDrugMutation,
  useGetDrugCategoriesQuery,
  useGetUnitOfMeasurementsQuery,
  useGetDrugFormsQuery,
  useSavePurchaseMutation,
  useUpdateDrugPurchaseItemMutation,
  useGetPurchasesQuery,
  useGetDrugStocksQuery,
  useGetPurchaseQuery,
  useDispatchDrugMutation,
  useGetDispatchedDrugsQuery,
  useGetPendingDispatchQuery,
  useConfirmDispatchMutation,
  useRejectDispatchMutation,
  useGetLowStockDrugsQuery,
  useGetExpiryAlertsQuery,
  useGetDrugLossesQuery,
  useCreateDrugLossMutation,
  useUpdateDrugLossMutation,
  useSubmitDrugLossMutation,
  useApproveDrugLossMutation,
  useRejectDrugLossMutation,
  useDeleteDrugLossMutation,
  useCreateDrugSaleMutation,
  useGetDrugSalesQuery,
  useGetDrugSaleQuery,
  useUpdateDrugSaleMutation,
  useDeleteDrugSaleMutation,
  useCreateDrugSalesReturnMutation,
  useGetDrugSalesReturnsQuery,
  useGetDrugSalesReturnQuery,
  useGetDrugSalesReturnsBySaleQuery,
  useUpdateDrugSalesReturnMutation,
  useDeleteDrugSalesReturnMutation,
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetInventoryRequestsQuery,
  useGetInventoryRequestQuery,
  useCreateInventoryRequestMutation,
  useUpdateInventoryRequestMutation,
  useDeleteInventoryRequestMutation,
  useGetItemsQuery,
  useGetItemQuery,
  useAddItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetItemCategoriesQuery,
  useGetUnitOfMeasuresQuery,
  useSaveItemPurchaseMutation,
  useGetItemPurchasesQuery,
  useGetItemStocksQuery,
  useDispatchItemMutation,
  useGetDispatchedItemsQuery,
  useConfirmItemDispatchMutation,
  useRejectItemDispatchMutation,
  useGetItemVariantsQuery,
  useGetItemVariantQuery,
  useCreateItemVariantMutation,
  useUpdateItemVariantMutation,
  useDeleteItemVariantMutation,
  useGetDepartmentsQuery,
  useGetDepartmentQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetStoresQuery,
  useGetStoreQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useDeleteStoreMutation,
  useGetPharmacyRequestsQuery,
  useGetPharmacyRequestQuery,
  useCreatePharmacyRequestMutation,
  useSubmitPharmacyRequestMutation,
  useApprovePharmacyRequestMutation,
  useIssuePharmacyRequestMutation,
  useRejectPharmacyRequestMutation,
  useReceivePharmacyRequestMutation,
  useGetAvailableItemsReportQuery,
  useGetAvailableItemsSummaryQuery,
  useGetSoldDrugCountsReportQuery,
  useGetBatchStockReportQuery,
  useGetIncomeSummaryReportQuery,
  useGetProfitSummaryReportQuery,
  useGetSoldItemCountsReportQuery,
  useRejectInventoryRequestMutation,
  useApproveInventoryRequestMutation,
} = drugApi;
