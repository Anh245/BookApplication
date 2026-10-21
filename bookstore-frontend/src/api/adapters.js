export const unwrap = value => value && !Array.isArray(value) && typeof value.success === 'boolean' && 'data' in value ? value.data : value;

export const mapUser = user => user && ({ ...user, id: user.userId ?? user.id, full_name: user.fullName ?? user.full_name, created_at: user.createdAt ?? user.created_at });
export const mapBook = book => ({ ...book, book_id: book.id, category_id: book.category?.id, publisher_id: book.publisher?.id, created_at: book.createdAt });
export const mapCartItem = item => ({
  ...item,
  book_id: item.bookId,
  book: { id: item.bookId, title: item.title ?? item.bookTitle },
  title: item.title ?? item.bookTitle,
  price: item.unitPrice,
  unit_price: item.unitPrice,
  subtotal: item.lineTotal,
});
export const mapCart = cart => ({ ...cart, items: (cart.items || []).map(mapCartItem), total: cart.totalAmount });
export const mapOrder = order => ({
  ...order,
  id: order.orderId,
  status: order.orderStatus,
  shipping_address: order.shippingAddress,
  total: order.totalAmount,
  total_amount: order.totalAmount,
  payment_method: order.paymentMethod,
  payment_status: order.paymentStatus,
  created_at: order.createdAt,
  items: (order.items || []).map(mapCartItem),
});

export function mapPage(page, mapper = value => value) {
  const data = Array.isArray(page) ? page : page?.content ?? page?.items ?? [];
  return { data: data.map(mapper), total: page?.totalElements ?? data.length, totalPages: page?.totalPages ?? 1 };
}

export function catalogParams(params = {}) {
  return {
    q: params.q ?? params.search,
    page: Math.max(0, (params.page ?? 1) - 1),
    size: Math.min(100, params.size ?? params.limit ?? 20),
    categoryId: params.categoryId ?? params.category_id,
    authorId: params.authorId ?? params.author_id,
    publisherId: params.publisherId ?? params.publisher_id,
    minPrice: params.minPrice ?? params.min_price,
    maxPrice: params.maxPrice ?? params.max_price,
    sort: ({ price_asc: 'price-asc', price_desc: 'price-desc' })[params.sort] ?? params.sort,
  };
}

export const bookRequest = data => ({ title: data.title, price: data.price, description: data.description,
  categoryId: data.categoryId ?? data.category_id ?? data.category?.id,
  publisherId: data.publisherId ?? data.publisher_id ?? data.publisher?.id,
  authorIds: data.authorIds ?? data.author_ids ?? data.authors?.map(author => author.id),
});
