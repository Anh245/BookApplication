import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';
import { mapBook as adaptBook, mapPage, catalogParams, bookRequest } from '../adapters';

export const getBooks = (params) => {
  return makeRequest('getBooks', [params], () =>
    axiosClient.get(ENDPOINTS.BOOKS.LIST, { params: catalogParams(params) }).then(page => mapPage(page, adaptBook))
  );
};

export const getBookDetail = (id) => {
  return makeRequest('getBookDetail', [id], async () => {
    const book = adaptBook(await axiosClient.get(ENDPOINTS.BOOKS.DETAIL(id)));
    if (!localStorage.getItem('accessToken') && !localStorage.getItem('token')) return book;
    const stock = await axiosClient.get(`${ENDPOINTS.INVENTORY.LIST}/${id}`);
    return { ...book, stock_quantity: stock.quantity, stockQuantity: stock.quantity };
  });
};

export const searchBooks = (q, params = {}) => {
  return makeRequest('getBooks', [{ q, ...params }], () =>
    axiosClient.get(ENDPOINTS.BOOKS.SEARCH, { params: catalogParams({ ...params, q }) }).then(page => mapPage(page, adaptBook))
  );
};

export const createBook = (data) => {
  return makeRequest('createBook', [data], () =>
    axiosClient.post(ENDPOINTS.BOOKS.LIST, bookRequest(data)).then(adaptBook)
  );
};

export const updateBook = (id, data) => {
  return makeRequest('updateBook', [id, data], () =>
    axiosClient.put(ENDPOINTS.BOOKS.DETAIL(id), bookRequest(data)).then(adaptBook)
  );
};

export const deleteBook = (id) => {
  return makeRequest('deleteBook', [id], () =>
    axiosClient.delete(ENDPOINTS.BOOKS.DETAIL(id))
  );
};

export const getLowStockBooks = (params = {}) => {
  return makeRequest('getLowStockBooks', [params], async () => {
    const stocks = await axiosClient.get(ENDPOINTS.INVENTORY.LOW_STOCK, { params: { threshold: params.threshold ?? 5 } });
    const selected = stocks.slice(0, params.limit ?? 50);
    const books = await Promise.all(selected.map(stock => getBookDetail(stock.bookId)));
    return { data: books.map((book, index) => ({ ...book, stock_quantity: selected[index].quantity })) };
  });
};

// Delegated methods - import from their respective APIs
export const getCategories = (params = {}) => {
  return axiosClient.get(ENDPOINTS.CATEGORIES.LIST, { params: catalogParams(params) }).then(page => mapPage(page).data);
};

export const getAuthors = (params = {}) => {
  return axiosClient.get(ENDPOINTS.AUTHORS.LIST, { params: catalogParams(params) }).then(page => mapPage(page).data);
};

export const getPublishers = (params = {}) => {
  return axiosClient.get(ENDPOINTS.PUBLISHERS.LIST, { params: catalogParams(params) }).then(page => mapPage(page).data);
};

export const mapBook = (apiData) => ({
  id: apiData.book_id || apiData.id,
  title: apiData.title,
  price: apiData.price,
  originalPrice: apiData.originalPrice,
  stock: apiData.stock_quantity !== undefined ? apiData.stock_quantity : apiData.stock,
  description: apiData.description,
  category: apiData.category,
  publisher: apiData.publisher,
  authors: apiData.authors || [],
  image: apiData.image_url || apiData.image,
  createdAt: apiData.created_at || apiData.createdAt,
});
