export type PermDef = { key: string; group: string; en: string; ar: string };

export const PERMISSIONS: PermDef[] = [
  { key: "orders.view", group: "orders", en: "View orders", ar: "عرض الطلبات" },
  { key: "orders.update", group: "orders", en: "Change order status", ar: "تغيير حالة الطلب" },
  { key: "orders.cancel", group: "orders", en: "Cancel orders", ar: "إلغاء الطلبات" },
  { key: "orders.refund", group: "orders", en: "Refund online payments", ar: "استرجاع المدفوعات الإلكترونية" },
  { key: "orders.alerts", group: "orders", en: "Receive new-order notifications", ar: "استلام إشعارات الطلبات الجديدة" },
  { key: "products.view", group: "catalog", en: "View products", ar: "عرض المنتجات" },
  { key: "products.edit", group: "catalog", en: "Create / edit products", ar: "إضافة / تعديل المنتجات" },
  { key: "products.delete", group: "catalog", en: "Delete products", ar: "حذف المنتجات" },
  { key: "prices.edit", group: "catalog", en: "Edit prices", ar: "تعديل الأسعار" },
  { key: "stock.update", group: "catalog", en: "Update stock", ar: "تحديث المخزون" },
  { key: "offers.manage", group: "catalog", en: "Manage offers & discounts", ar: "إدارة العروض والخصومات" },
  { key: "categories.manage", group: "catalog", en: "Manage categories", ar: "إدارة الفئات" },
  { key: "customers.view", group: "customers", en: "View customers", ar: "عرض الزبائن" },
  { key: "messages.view", group: "customers", en: "Read contact messages", ar: "قراءة رسائل التواصل" },
  { key: "delivery.manage", group: "settings", en: "Manage delivery zones & fees", ar: "إدارة مناطق التوصيل والرسوم" },
  { key: "content.edit", group: "content", en: "Edit website text & sections", ar: "تعديل نصوص وأقسام الموقع" },
  { key: "pages.manage", group: "content", en: "Manage pages", ar: "إدارة الصفحات" },
  { key: "banners.manage", group: "content", en: "Manage banners & testimonials", ar: "إدارة البانرات والآراء" },
  { key: "media.manage", group: "content", en: "Manage media library", ar: "إدارة مكتبة الصور" },
  { key: "payments.manage", group: "settings", en: "Payments: enable/disable methods, see Whish logs", ar: "المدفوعات: تفعيل/إيقاف الطرق ورؤية سجلات ويش" },
  { key: "settings.manage", group: "settings", en: "Site settings & payments", ar: "إعدادات الموقع والدفع" },
  { key: "staff.manage", group: "admin", en: "Manage staff accounts", ar: "إدارة حسابات الموظفين" },
  { key: "permissions.manage", group: "admin", en: "Change staff permissions", ar: "تغيير صلاحيات الموظفين" },
  { key: "audit.view", group: "admin", en: "View audit log", ar: "عرض سجل النشاط" },
];

export const PERM_GROUPS: Record<string, { en: string; ar: string }> = {
  orders: { en: "Orders", ar: "الطلبات" },
  catalog: { en: "Catalog & stock", ar: "المنتجات والمخزون" },
  customers: { en: "Customers", ar: "الزبائن" },
  content: { en: "Website content", ar: "محتوى الموقع" },
  settings: { en: "Settings", ar: "الإعدادات" },
  admin: { en: "Administration", ar: "الإدارة" },
};

export const PERM_KEYS = PERMISSIONS.map((p) => p.key);

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
