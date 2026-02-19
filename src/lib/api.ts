import { AUTH_ACCESS_COOKIE, AUTH_ROLE_COOKIE } from './auth-shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ecoapi-1.onrender.com/api/v1';

type ApiFetchOptions = RequestInit & {
  accessToken?: string;
};

let unauthorizedRedirectStarted = false;

function clearClientAuthCookies() {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${AUTH_ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function resolveLoginPathFromLocation(pathname: string) {
  const locale = pathname.startsWith('/my/') || pathname === '/my' ? 'my' : 'en';
  return {
    login: `/${locale}/login`,
    register: `/${locale}/register`,
    verify: `/${locale}/verify-email`,
  };
}

function handleUnauthorized(path: string) {
  if (typeof window === 'undefined') {
    return;
  }
  if (path.startsWith('/auth/')) {
    return;
  }
  if (unauthorizedRedirectStarted) {
    return;
  }

  const currentPath = window.location.pathname;
  const paths = resolveLoginPathFromLocation(currentPath);
  if (
    currentPath === paths.login ||
    currentPath === paths.register ||
    currentPath === paths.verify
  ) {
    return;
  }

  unauthorizedRedirectStarted = true;
  clearClientAuthCookies();
  window.location.replace(paths.login);
}

function toQueryString(
  params: Record<string, string | number | boolean | Array<string | number> | undefined>
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      query.set(key, value.join(','));
      continue;
    }
    query.set(key, String(value));
  }
  const stringified = query.toString();
  return stringified ? `?${stringified}` : '';
}

export async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers ? (options.headers as Record<string, string>) : {}),
  };

  if (options?.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const hasBody = options?.body !== undefined && options?.body !== null;
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  if (hasBody && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: options?.cache ?? 'no-store',
    headers,
  });

  if (!res.ok) {
    let detail = '';
    try {
      const payload = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(payload?.message)) {
        detail = payload.message.join(', ');
      } else if (payload?.message) {
        detail = payload.message;
      }
    } catch {
      detail = '';
    }
    if (res.status === 401) {
      handleUnauthorized(path);
    }
    throw new Error(detail ? `API error ${res.status}: ${detail}` : `API error ${res.status}`);
  }

  return (await res.json()) as T;
}

export type AuthRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export type RegisterInput = {
  email: string;
  password: string;
  role: Extract<AuthRole, 'CUSTOMER' | 'VENDOR'>;
  locale?: string;
};

export type RegisterResponse = {
  ok: boolean;
  userId: string;
  verifyToken?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    role: AuthRole;
    email: string;
    locale: string;
    emailVerifiedAt?: string | null;
  };
};

export type CurrentUserResponse = {
  id: string;
  role: AuthRole;
  email: string;
  locale: string;
  emailVerifiedAt?: string | null;
};

export function register(input: RegisterInput) {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type VerifyEmailInput = {
  token: string;
};

export type ResendVerificationInput = {
  email: string;
};

export function verifyEmail(input: VerifyEmailInput) {
  return apiFetch<{ ok: boolean }>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resendVerification(input: ResendVerificationInput) {
  return apiFetch<{ ok: boolean; verifyToken?: string }>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    credentials: 'include',
  });
}

export function logout() {
  return apiFetch<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export function getCurrentUser(accessToken?: string) {
  return apiFetch<CurrentUserResponse>('/users/me', { accessToken });
}

export type SubmitContactInput = {
  name: string;
  email: string;
  subject?: string;
  message: string;
};

export function submitContact(input: SubmitContactInput) {
  return apiFetch<{ ok: boolean; message: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type AdminVendorItem = {
  id: string;
  ownerUserId: string;
  owner?: {
    id: string;
    email: string;
  };
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  name: string;
  country: string;
  currency: string;
  commissionPct: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminListVendorsResponse = {
  items: AdminVendorItem[];
};

export function adminListVendors(accessToken?: string) {
  return apiFetch<AdminListVendorsResponse>('/admin/vendors', {
    accessToken,
  });
}

export type AdminStatsResponse = {
  userCount: number;
  vendorCount: number;
  pendingVendorCount: number;
};

export function adminGetStats(accessToken?: string) {
  return apiFetch<AdminStatsResponse>('/admin/stats', {
    accessToken,
  });
}

export type CreateAdminVendorInput = {
  ownerEmail: string;
  name: string;
  country: string;
  currency: string;
  commissionPct: number;
  status?: 'PENDING' | 'APPROVED' | 'SUSPENDED';
};

export type UpdateAdminVendorInput = {
  name?: string;
  country?: string;
  currency?: string;
  commissionPct?: number;
  status?: 'PENDING' | 'APPROVED' | 'SUSPENDED';
};

export function adminCreateVendor(input: CreateAdminVendorInput, accessToken?: string) {
  return apiFetch<AdminVendorItem>('/admin/vendors', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function adminGetVendor(id: string, accessToken?: string) {
  return apiFetch<AdminVendorItem>(`/admin/vendors/${id}`, {
    accessToken,
  });
}

export function adminUpdateVendor(
  id: string,
  input: UpdateAdminVendorInput,
  accessToken?: string
) {
  return apiFetch<AdminVendorItem>(`/admin/vendors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function adminSuspendVendor(id: string, accessToken?: string) {
  return apiFetch<AdminVendorItem>(`/admin/vendors/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function adminApproveVendor(id: string, accessToken?: string) {
  return apiFetch<AdminVendorItem>(`/admin/vendors/${id}/approve`, {
    method: 'PATCH',
    accessToken,
  });
}

export type TagItem = {
  id: string;
  name: string;
  en_name: string;
  mm_name: string;
  slug: string;
  description: string | null;
  active: boolean;
};

export type CategoryItem = {
  id: string;
  name: string;
  en_name: string;
  mm_name: string;
  slug: string;
  parentId: string | null;
};

export function listTags(query: { locale?: string } = {}) {
  const queryString = toQueryString({ locale: query.locale });
  return apiFetch<{ items: TagItem[] }>(`/tags${queryString}`);
}

export function listCategories(query: { locale?: string } = {}) {
  const queryString = toQueryString({ locale: query.locale });
  return apiFetch<{ items: CategoryItem[] }>(`/categories${queryString}`);
}

export type ProductVariant = {
  id: string;
  sku: string;
  price: number;
  currency: string;
  stockQty: number;
  reservedQty: number;
  weightG?: number | null;
  options?: Array<{ name: string; value: string }>;
};

export type ProductImage = {
  id: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
};

export type ProductItem = {
  id: string;
  vendorId: string;
  categoryId: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
  images: ProductImage[];
  tags?: Array<{ id: string; tagId: string; tag?: TagItem }>;
};

export type ListProductsQuery = {
  q?: string;
  categoryId?: string;
  tagIds?: string[];
  cursor?: string;
  limit?: number;
  locale?: string;
};

export function listProducts(query: ListProductsQuery = {}) {
  const queryString = toQueryString({
    q: query.q,
    categoryId: query.categoryId,
    tagIds: query.tagIds,
    cursor: query.cursor,
    limit: query.limit,
    locale: query.locale,
  });
  return apiFetch<{ items: ProductItem[]; nextCursor?: string | null }>(`/products${queryString}`);
}

export function getProduct(id: string, query: { locale?: string } = {}) {
  const queryString = toQueryString({ locale: query.locale });
  return apiFetch<ProductItem & { category?: CategoryItem; vendor?: { id: string; name: string } }>(
    `/products/${id}${queryString}`
  );
}

export type WishlistItem = {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: ProductItem & {
    category?: { id: string; name: string; slug: string };
    vendor?: { id: string; name: string };
  };
};

export function listWishlist(accessToken?: string) {
  return apiFetch<{ items: WishlistItem[] }>('/wishlist', { accessToken });
}

export function addWishlistItem(productId: string, accessToken?: string) {
  return apiFetch<WishlistItem>('/wishlist/items', {
    method: 'POST',
    body: JSON.stringify({ productId }),
    accessToken,
  });
}

export function removeWishlistItem(productId: string, accessToken?: string) {
  return apiFetch<{ ok: boolean }>(`/wishlist/items/${productId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export type CreateTagInput = {
  en_name: string;
  mm_name: string;
  slug: string;
  description?: string;
  active?: boolean;
  name?: string;
};

export type UpdateTagInput = {
  en_name?: string;
  mm_name?: string;
  slug?: string;
  description?: string;
  active?: boolean;
  name?: string;
};

export function adminCreateTag(input: CreateTagInput, accessToken?: string) {
  return apiFetch<TagItem>('/admin/tags', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function adminUpdateTag(id: string, input: UpdateTagInput, accessToken?: string) {
  return apiFetch<TagItem>(`/admin/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type CreateCategoryInput = {
  en_name: string;
  mm_name: string;
  slug: string;
  parentId?: string;
  name?: string;
};

export type UpdateCategoryInput = {
  en_name?: string;
  mm_name?: string;
  slug?: string;
  parentId?: string;
  name?: string;
};

export function adminCreateCategory(input: CreateCategoryInput, accessToken?: string) {
  return apiFetch<CategoryItem>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function adminUpdateCategory(
  id: string,
  input: UpdateCategoryInput,
  accessToken?: string
) {
  return apiFetch<CategoryItem>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type ApplyVendorInput = {
  name: string;
  country: string;
  currency: string;
  commissionPct?: number;
};

export function applyVendor(input: ApplyVendorInput, accessToken?: string) {
  return apiFetch<AdminVendorItem>('/vendors/apply', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function vendorListProducts(accessToken?: string) {
  return apiFetch<{ items: ProductItem[] }>('/vendor/products', { accessToken });
}

export type VendorCreateProductInput = {
  title: string;
  description: string;
  categoryId: string;
  tagIds?: string[];
};

export function vendorCreateProduct(input: VendorCreateProductInput, accessToken?: string) {
  return apiFetch<ProductItem>('/vendor/products', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type VendorUpdateProductInput = {
  title?: string;
  description?: string;
  categoryId?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  tagIds?: string[];
};

export function vendorUpdateProduct(
  id: string,
  input: VendorUpdateProductInput,
  accessToken?: string
) {
  return apiFetch<ProductItem>(`/vendor/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function vendorDeleteProduct(id: string, accessToken?: string) {
  return apiFetch<{ ok: boolean; mode: 'DELETED' | 'ARCHIVED'; reason?: string }>(
    `/vendor/products/${id}`,
    {
      method: 'DELETE',
      accessToken
    }
  );
}

export type CreateVariantInput = {
  sku: string;
  options: Array<{ name: string; value: string }>;
  price: number;
  currency: string;
  stockQty: number;
  weightG?: number;
};

export function vendorCreateVariant(
  productId: string,
  input: CreateVariantInput,
  accessToken?: string
) {
  return apiFetch<ProductVariant>(`/vendor/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type UpdateVariantInput = {
  sku?: string;
  options?: Array<{ name: string; value: string }>;
  price?: number;
  currency?: string;
  stockQty?: number;
  weightG?: number;
};

export function vendorUpdateVariant(
  productId: string,
  variantId: string,
  input: UpdateVariantInput,
  accessToken?: string
) {
  return apiFetch<ProductVariant>(`/vendor/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function vendorDeleteVariant(
  productId: string,
  variantId: string,
  accessToken?: string
) {
  return apiFetch<{ ok: boolean; mode?: 'DELETED' | 'DISABLED'; reason?: string }>(
    `/vendor/products/${productId}/variants/${variantId}`,
    {
    method: 'DELETE',
    accessToken
  });
}

export type AddProductImagesInput = {
  images: Array<{ url: string; altText?: string; sortOrder?: number }>;
};

export function vendorAddProductImages(
  productId: string,
  input: AddProductImagesInput,
  accessToken?: string
) {
  return apiFetch<{ ok: boolean; count: number }>(`/vendor/products/${productId}/images`, {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type PresignUploadInput = {
  filename: string;
  contentType: string;
  size: number;
};

export type PresignUploadResponse = {
  url: string;
  key: string;
  bucket: string;
  expiresIn: number;
  publicUrl?: string;
};

export function presignUpload(input: PresignUploadInput, accessToken?: string) {
  return apiFetch<PresignUploadResponse>('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type AddCartItemInput = {
  variantId: string;
  qty: number;
};

export type UpdateCartItemInput = {
  qty: number;
};

export type CreateOrderInput = {
  fulfillment: 'SHIPPING' | 'PICKUP';
  shippingAddrId?: string;
  pickupLocId?: string;
};

export type AddressItem = {
  id: string;
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postal: string;
  country: string;
  phone?: string | null;
};

export type CreateAddressInput = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal: string;
  country: string;
  phone?: string;
};

export function listAddresses(accessToken?: string) {
  return apiFetch<{ items: AddressItem[] } | AddressItem[]>('/addresses', { accessToken });
}

export function createAddress(input: CreateAddressInput, accessToken?: string) {
  return apiFetch<AddressItem>('/addresses', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function listPickupLocations(
  query: { vendorId?: string } = {},
  accessToken?: string
) {
  const queryString = toQueryString({
    vendorId: query.vendorId,
  });
  return apiFetch<Array<{ id: string; vendorId: string; name: string; line1: string; city: string; country: string; hours?: string | null }>>(
    `/shipping/pickup-locations${queryString}`,
    { accessToken }
  );
}

export function listShippingRates(
  query: { vendorId: string; country?: string },
  accessToken?: string
) {
  const queryString = toQueryString({
    vendorId: query.vendorId,
    country: query.country,
  });
  return apiFetch<{ available: boolean; flatRate: number | null; currency: string }>(
    `/shipping/rates${queryString}`,
    { accessToken }
  );
}

export type ShippingRateItem = {
  id: string;
  vendorId: string;
  country: string;
  flatRate: number;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateShippingRateInput = {
  country: string;
  flatRate: number;
  currency: string;
  active?: boolean;
};

export type UpdateShippingRateInput = {
  country?: string;
  flatRate?: number;
  currency?: string;
  active?: boolean;
};

export function vendorListShippingRates(
  query: { country?: string; active?: boolean } = {},
  accessToken?: string
) {
  const queryString = toQueryString(query);
  return apiFetch<{ items: ShippingRateItem[] }>(`/vendor/shipping/rates${queryString}`, {
    accessToken,
  });
}

export function vendorCreateShippingRate(
  input: CreateShippingRateInput,
  accessToken?: string
) {
  return apiFetch<ShippingRateItem>('/vendor/shipping/rates', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function vendorUpdateShippingRate(
  id: string,
  input: UpdateShippingRateInput,
  accessToken?: string
) {
  return apiFetch<ShippingRateItem>(`/vendor/shipping/rates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function vendorDisableShippingRate(id: string, accessToken?: string) {
  return apiFetch<ShippingRateItem>(`/vendor/shipping/rates/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function adminUpdateShippingRateStatus(
  id: string,
  active: boolean,
  accessToken?: string
) {
  return apiFetch<ShippingRateItem>(`/admin/shipping/rates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
    accessToken,
  });
}

export function getCart<T>(accessToken?: string) {
  return apiFetch<T>('/cart', { accessToken });
}

export function addCartItem<T>(input: AddCartItemInput, accessToken?: string) {
  return apiFetch<T>('/cart/items', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function updateCartItem<T>(
  id: string,
  input: UpdateCartItemInput,
  accessToken?: string
) {
  return apiFetch<T>(`/cart/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function removeCartItem<T>(id: string, accessToken?: string) {
  return apiFetch<T>(`/cart/items/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function createOrder<T>(input: CreateOrderInput, accessToken?: string) {
  return apiFetch<T>('/orders', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type OrderItem = {
  id: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  variant: ProductVariant & { product?: ProductItem };
};

export type OrderSummary = {
  id: string;
  status: string;
  currency: string;
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  fulfillment: 'SHIPPING' | 'PICKUP';
  paymentExpiresAt?: string | null;
  createdAt: string;
  vendor?: { id: string; name: string };
  user?: { id: string; email?: string | null; phone?: string | null };
  items?: OrderItem[];
};

export function listOrders(accessToken?: string) {
  return apiFetch<{ items: OrderSummary[] }>('/orders', { accessToken });
}

export function getOrder(id: string, accessToken?: string) {
  return apiFetch<OrderSummary>(`/orders/${id}`, { accessToken });
}

export function updateOrderStatus(
  id: string,
  status: string,
  accessToken?: string
) {
  return apiFetch<OrderSummary>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    accessToken,
  });
}

export function vendorListOrders(
  query: { status?: string; cursor?: string; limit?: number } = {},
  accessToken?: string
) {
  const queryString = toQueryString(query);
  return apiFetch<{ items: OrderSummary[]; nextCursor?: string | null }>(
    `/vendor/orders${queryString}`,
    { accessToken }
  );
}

export function vendorGetOrder(id: string, accessToken?: string) {
  return apiFetch<OrderSummary>(`/vendor/orders/${id}`, { accessToken });
}

export function adminListOrders(
  query: { status?: string; vendorId?: string; userId?: string; cursor?: string; limit?: number } = {},
  accessToken?: string
) {
  const queryString = toQueryString(query);
  return apiFetch<{ items: OrderSummary[]; nextCursor?: string | null }>(
    `/admin/orders${queryString}`,
    { accessToken }
  );
}

export function adminGetOrder(id: string, accessToken?: string) {
  return apiFetch<OrderSummary>(`/admin/orders/${id}`, { accessToken });
}

export type StripeCheckoutResponse = {
  url?: string;
  paymentId?: string;
  ok?: boolean;
};

export function stripeCheckout(orderId: string, accessToken?: string) {
  return apiFetch<StripeCheckoutResponse>('/payments/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
    accessToken,
  });
}

export function waveCheckout(orderId: string, accessToken?: string) {
  return apiFetch<StripeCheckoutResponse>('/payments/wave/checkout', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
    accessToken,
  });
}

export function kbzpayCheckout(orderId: string, accessToken?: string) {
  return apiFetch<StripeCheckoutResponse>('/payments/kbzpay/checkout', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
    accessToken,
  });
}

export type RequestReturnInput = {
  orderId: string;
  reason: string;
};

export function requestReturn<T>(input: RequestReturnInput, accessToken?: string) {
  return apiFetch<T>('/returns', {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export function listReturns<T>(accessToken?: string) {
  return apiFetch<T>('/returns', { accessToken });
}

export function vendorListReturns(
  query: { status?: string; cursor?: string; limit?: number } = {},
  accessToken?: string
) {
  const queryString = toQueryString(query);
  return apiFetch<{ items: Array<{ id: string; status: string; reason: string; requestedAt: string; order: { id: string; total: number; status: string; user?: { email?: string } } }>; nextCursor?: string | null }>(
    `/vendor/returns${queryString}`,
    { accessToken }
  );
}

export function vendorApproveReturn(id: string, notes?: string, accessToken?: string) {
  return apiFetch<{ id: string; status: string }>(`/returns/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
    accessToken,
  });
}

export function vendorRejectReturn(id: string, notes?: string, accessToken?: string) {
  return apiFetch<{ id: string; status: string }>(`/returns/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
    accessToken,
  });
}

export function vendorReceiveReturn(id: string, notes?: string, accessToken?: string) {
  return apiFetch<{ id: string; status: string }>(`/returns/${id}/receive`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
    accessToken,
  });
}

export function adminListReturns(
  query: { status?: string; vendorId?: string; userId?: string; cursor?: string; limit?: number } = {},
  accessToken?: string
) {
  const queryString = toQueryString(query);
  return apiFetch<{ items: Array<{ id: string; status: string; reason: string; requestedAt: string; order: { id: string; status: string; total: number; vendor?: { id: string; name: string }; user?: { id: string; email?: string | null } } }>; nextCursor?: string | null }>(
    `/admin/returns${queryString}`,
    { accessToken }
  );
}

export function adminGetReturn(id: string, accessToken?: string) {
  return apiFetch<{
    id: string;
    status: string;
    reason: string;
    requestedAt: string;
    resolvedAt?: string | null;
    notes?: string | null;
    order: {
      id: string;
      status: string;
      total: number;
      currency: string;
      vendor?: { id: string; name: string };
      user?: { id: string; email?: string | null; phone?: string | null };
    };
  }>(`/admin/returns/${id}`, { accessToken });
}

export function adminRefundReturn(id: string, notes?: string, accessToken?: string) {
  return apiFetch<{ id: string; status: string }>(`/returns/${id}/refund`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
    accessToken,
  });
}

export type ListNotificationsQuery = {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
};

export function listNotifications<T>(
  query: ListNotificationsQuery = {},
  accessToken?: string
) {
  const queryString = toQueryString(query);
  return apiFetch<T>(`/notifications${queryString}`, { accessToken });
}

export function getUnreadNotificationsCount(accessToken?: string) {
  return apiFetch<{ count: number }>('/notifications/unread-count', { accessToken });
}

export function getUnreadChatCount(accessToken?: string) {
  return apiFetch<{ count: number }>('/chat/unread-count', { accessToken });
}

export function markNotificationRead<T>(id: string, accessToken?: string) {
  return apiFetch<T>(`/notifications/${id}/read`, {
    method: 'PATCH',
    accessToken,
  });
}

export function markAllNotificationsRead<T>(accessToken?: string) {
  return apiFetch<T>('/notifications/read-all', {
    method: 'PATCH',
    accessToken,
  });
}

export type ListChatQuery = {
  cursor?: string;
  limit?: number;
};

export function listChatThreads<T>(query: ListChatQuery = {}, accessToken?: string) {
  const queryString = toQueryString(query);
  return apiFetch<T>(`/chat/threads${queryString}`, { accessToken });
}

export function listChatMessages<T>(
  orderId: string,
  query: ListChatQuery = {},
  accessToken?: string
) {
  const queryString = toQueryString(query);
  return apiFetch<T>(`/chat/threads/${orderId}/messages${queryString}`, { accessToken });
}

export type SendChatMessageInput = {
  body: string;
};

export function sendChatMessage<T>(
  orderId: string,
  input: SendChatMessageInput,
  accessToken?: string
) {
  return apiFetch<T>(`/chat/threads/${orderId}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type MarkChatReadInput = {
  messageId?: string;
};

export function markChatRead<T>(
  orderId: string,
  input: MarkChatReadInput = {},
  accessToken?: string
) {
  return apiFetch<T>(`/chat/threads/${orderId}/read`, {
    method: 'PATCH',
    body: JSON.stringify(input),
    accessToken,
  });
}

export type ReviewListItem = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  orderItem?: {
    id: string;
    variantId?: string;
    variant?: {
      id: string;
      productId: string;
      sku?: string;
    };
  };
};

export type ListReviewsQuery = {
  productId?: string;
};

export function listReviews(query: ListReviewsQuery = {}) {
  const queryString = toQueryString({ productId: query.productId });
  return apiFetch<ReviewListItem[]>(`/reviews${queryString}`);
}

export type BlogItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListBlogsQuery = {
  limit?: number;
};

export function listBlogs(query: ListBlogsQuery = {}) {
  const queryString = toQueryString({ limit: query.limit });
  return apiFetch<{ items: BlogItem[] }>(`/blogs${queryString}`);
}
