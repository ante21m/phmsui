import type { ReactNode } from 'react';
import {
  MdDashboard, MdMedicalServices, MdKeyboardArrowDown,
  MdShoppingCart, MdCheckCircle, MdWarning, MdNotifications,
  MdAdd, MdInventory, MdLocalHospital, MdReport, MdPayment,
  MdUndo, MdBusiness, MdPeople, MdPointOfSale,
} from 'react-icons/md';

// ─── Roles ───────────────────────────────────────────────────────────────────
// These must match the role strings returned by GET /auth/user-detail.

export const ROLE = {
  admin: 'admin',
  pharmacist: 'pharmacist',
  inventoryOfficer: 'pharmacy-inventory-officer',
  storeManager: 'store-manager',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

/** Shortcuts for the role combinations used by several menu items. */
const ALL_STAFF: Role[] = [ROLE.pharmacist, ROLE.inventoryOfficer, ROLE.storeManager];
const PHARMACY_STAFF: Role[] = [ROLE.pharmacist, ROLE.inventoryOfficer];

// ─── Menu structure ─────────────────────────────────────────────────────────

export type MenuKey =
  | 'dashboard'
  | 'medicine'
  | 'drugMaster'
  | 'itemMaster'
  | 'purchasedDrugs'
  | 'purchasedItems'
  | 'dispatchConfirmation'
  | 'itemDispatchConfirmation'
  | 'lowStock'
  | 'expiryAlert'
  | 'drugLosses'
  | 'drugLossReview'
  | 'drugSales'
  | 'soldDrugs'
  | 'drugSalesReturns'
  | 'workflowManagement'
  | 'users'
  | 'departments'
  | 'stores'
  | 'suppliers'
  | 'inventoryRequests'
  | 'inventoryApprovals'
  | 'pharmacyRequests'
  | 'drugRequest'
  | 'requestConfirmation'
  | 'requestHistory'
  | 'reports'
  | 'availableItems'
  | 'soldDrugCounts'
  | 'soldItemCounts'
  | 'batchStock'
  | 'incomeSummary'
  | 'profitSummary'
  | 'myPurchaseRequests'
  | 'notice'
  | 'viewNotices'
  | 'myStock'
  | 'stockOverview';

export interface NavItem {
  key: MenuKey;
  label: string;
  href?: string;
  icon?: ReactNode;
  children?: NavItem[];
  badge?: number;
}

/**
 * ★★★  EDIT MENU ACCESS HERE  ★★★
 *
 * One entry per menu item. Add or remove role constants to change who sees it.
 *   - `[]`                       → admin only
 *   - `[ROLE.pharmacist, ...]`   → those roles + admin
 *   - Admin always sees everything; you never need to add ROLE.admin here.
 *   - A child is hidden if its own roles OR its parent group's roles don't match.
 */
export const MENU_ROLES: Record<MenuKey, Role[]> = {
  dashboard: ALL_STAFF,

  medicine: ALL_STAFF,
  drugMaster: [ROLE.inventoryOfficer],
  itemMaster: [ROLE.inventoryOfficer],
  purchasedDrugs: [ROLE.inventoryOfficer],
  purchasedItems: [ROLE.inventoryOfficer],
  dispatchConfirmation: [ROLE.pharmacist],
  itemDispatchConfirmation: [ROLE.pharmacist],
  lowStock: [ROLE.pharmacist, ROLE.inventoryOfficer],
  expiryAlert: [ROLE.pharmacist, ROLE.inventoryOfficer],
  drugLosses: [ROLE.pharmacist],
  drugLossReview: [ROLE.inventoryOfficer],
  drugSales: [ROLE.pharmacist],
  soldDrugs: PHARMACY_STAFF,
  drugSalesReturns: [ROLE.storeManager],

  workflowManagement: [],
  users: [],

  departments: [ROLE.inventoryOfficer],
  stores: [ROLE.inventoryOfficer],
  suppliers: [ROLE.inventoryOfficer],

  inventoryRequests: [ROLE.pharmacist],
  inventoryApprovals: [ROLE.inventoryOfficer],

  pharmacyRequests: PHARMACY_STAFF,
  drugRequest: [ROLE.pharmacist],
  requestConfirmation: [ROLE.inventoryOfficer],
  requestHistory: PHARMACY_STAFF,

  reports: PHARMACY_STAFF,
  availableItems: PHARMACY_STAFF,
  soldDrugCounts: PHARMACY_STAFF,
  soldItemCounts: PHARMACY_STAFF,
  batchStock: PHARMACY_STAFF,
  incomeSummary: [ROLE.inventoryOfficer],
  profitSummary: [ROLE.inventoryOfficer],

  myPurchaseRequests: [ROLE.inventoryOfficer],

  notice: PHARMACY_STAFF,
  viewNotices: [ROLE.storeManager],

  myStock: [ROLE.storeManager],
  stockOverview: ALL_STAFF,
};

/** The menu tree. Labels, links and icons live here; access lives in MENU_ROLES above. */
export const navItems: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <MdDashboard />,
  },
  {
    key: 'medicine',
    label: 'Medicine',
    icon: <MdMedicalServices />,
    children: [
      { key: 'drugMaster', label: 'Drug Master', href: '/medicine/drug-master', icon: <MdAdd /> },
      { key: 'itemMaster', label: 'Item Master', href: '/medicine/item-master', icon: <MdAdd /> },
      { key: 'purchasedDrugs', label: 'Purchased Drugs', href: '/medicine/purchased-drugs', icon: <MdShoppingCart /> },
      { key: 'purchasedItems', label: 'Purchased Items', href: '/medicine/purchased-items', icon: <MdShoppingCart /> },
      { key: 'dispatchConfirmation', label: 'Dispatch Confirmation', href: '/medicine/dispatch-confirmation', icon: <MdCheckCircle /> },
      { key: 'itemDispatchConfirmation', label: 'Item Dispatch Confirmation', href: '/medicine/item-dispatch-confirmation', icon: <MdCheckCircle /> },
      { key: 'lowStock', label: 'Low Stock', href: '/medicine/low-stock', icon: <MdWarning /> },
      { key: 'expiryAlert', label: 'Expiry Alert', href: '/medicine/expiry-alert', icon: <MdWarning /> },
      { key: 'drugLosses', label: 'Drug Losses', href: '/medicine/drug-losses', icon: <MdReport /> },
      { key: 'drugLossReview', label: 'Drug Loss Review', href: '/medicine/drug-loss-review', icon: <MdCheckCircle /> },
      { key: 'drugSales', label: 'Drug Sales', href: '/medicine/drug-sales', icon: <MdPointOfSale /> },
      { key: 'soldDrugs', label: 'Sold List', href: '/medicine/sold-drugs', icon: <MdPointOfSale /> },
      { key: 'drugSalesReturns', label: 'Drug Sales Returns', href: '/medicine/drug-sales-returns', icon: <MdUndo /> },
    ],
  },
  { key: 'workflowManagement', label: 'Workflow Management', href: '/workflow-management', icon: <MdCheckCircle /> },
  { key: 'users', label: 'Users', href: '/users', icon: <MdPeople /> },
  { key: 'departments', label: 'Departments', href: '/medicine/departments', icon: <MdBusiness /> },
  { key: 'stores', label: 'Stores', href: '/medicine/stores', icon: <MdBusiness /> },
  { key: 'suppliers', label: 'Suppliers', href: '/medicine/suppliers', icon: <MdBusiness /> },
  { key: 'inventoryRequests', label: 'Inventory Requests', href: '/inventory-requests', icon: <MdInventory /> },
  { key: 'inventoryApprovals', label: 'Inventory Approvals', href: '/inventory-approvals', icon: <MdCheckCircle /> },
  {
    key: 'pharmacyRequests',
    label: 'Pharmacy Requests',
    icon: <MdInventory />,
    children: [
      { key: 'drugRequest', label: 'Drug Request', href: '/pharmacy-requests', icon: <MdInventory /> },
      { key: 'requestConfirmation', label: 'Request Confirmation', href: '/pharmacy-requests/confirmation', icon: <MdCheckCircle /> },
      { key: 'requestHistory', label: 'Request History', href: '/pharmacy-requests/history', icon: <MdCheckCircle /> },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: <MdReport />,
    children: [
      { key: 'availableItems', label: 'Available Items', href: '/reports/available-items', icon: <MdInventory /> },
      { key: 'soldDrugCounts', label: 'Sold Drug Counts', href: '/reports/sold-drug-counts', icon: <MdPointOfSale /> },
      { key: 'soldItemCounts', label: 'Sold Item Counts', href: '/reports/sold-item-counts', icon: <MdPointOfSale /> },
      { key: 'batchStock', label: 'Batch Stock', href: '/reports/batch-stock', icon: <MdLocalHospital /> },
      { key: 'incomeSummary', label: 'Income Summary', href: '/reports/income-summary', icon: <MdPayment /> },
      { key: 'profitSummary', label: 'Profit Summary', href: '/reports/profit-summary', icon: <MdReport /> },
    ],
  },
  { key: 'myPurchaseRequests', label: 'My Purchase Requests', href: '/purchase-requests', icon: <MdInventory /> },
  {
    key: 'notice',
    label: 'Notice',
    icon: <MdNotifications />,
    children: [
      { key: 'viewNotices', label: 'View Notices', href: '/notice/view', icon: <MdNotifications /> },
    ],
  },
  {
    key: 'myStock',
    label: 'My Stock',
    icon: <MdLocalHospital />,
    children: [
      { key: 'stockOverview', label: 'Stock Overview', href: '/stock/overview', icon: <MdLocalHospital /> },
    ],
  },
];

/** Filter the menu using MENU_ROLES. Admin sees everything. */
export function getVisibleMenu(userRoles: string[]): NavItem[] {
  const isAdmin = userRoles.includes(ROLE.admin);

  const isAllowed = (key: MenuKey): boolean => {
    if (isAdmin) return true;
    const roles = MENU_ROLES[key];
    return !!roles?.length && roles.some((role) => userRoles.includes(role));
  };

  const filter = (item: NavItem): NavItem | null => {
    if (!isAllowed(item.key)) return null;
    if (!item.children) return item;

    const children = item.children.map(filter).filter(Boolean) as NavItem[];
    return children.length ? { ...item, children } : null;
  };

  return navItems.map(filter).filter(Boolean) as NavItem[];
}
