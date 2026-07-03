import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface StockItem {
  id: number;
  drugMasterId: string;
  drugName: string;
  unit: string;
  inStock: number;
  expiryDate: string;
}

export const pharmacyRequestApi = createApi({
  reducerPath: 'pharmacyRequestApi',
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002' }),
  tagTypes: ['PharmacyRequest'],
  endpoints: (builder) => ({
    getAvailableDrugs: builder.query<StockItem[], void>({
      query: () => '/drug-purchases?take=1000',
      transformResponse: (res: { data: { items: any[] }[]; total: number }) => {
        const items: StockItem[] = [];
        for (const p of res.data) {
          for (const it of p.items) {
            if (!it.drugId || it.qtyRemaining <= 0) continue;
            items.push({
              id: it.id,
              drugMasterId: it.drugId,
              drugName: it.drug?.genericName || it.drugName,
              unit: it.drug?.unitOfMeasure || '-',
              inStock: it.qtyRemaining,
              expiryDate: it.expiryDate || '-',
            });
          }
        }
        return items;
      },
    }),
  }),
});

export const { useGetAvailableDrugsQuery } = pharmacyRequestApi;
