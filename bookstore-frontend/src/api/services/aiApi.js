import axiosClient from '../axiosClient';
import { ENDPOINTS } from '../endpoints';
import { makeRequest } from '../request';

export const sendChatMessage = (data) => {
  return makeRequest('chatWithAI', [data], () =>
    axiosClient.post(ENDPOINTS.AI.CHAT, data)
  );
};

export const getSuggestedBooks = (params = {}) => {
  return makeRequest('suggestBooks', [params], () =>
    axiosClient.post(ENDPOINTS.AI.SUGGEST_BOOKS, { ...params, message: params.message || params.q || 'Gợi ý sách phù hợp với tôi' })
  );
};

export const suggestBooks = (params = {}) => {
  return makeRequest('suggestBooks', [params], () =>
    axiosClient.post(ENDPOINTS.AI.SUGGEST_BOOKS, { ...params, message: params.message || params.q || 'Gợi ý sách phù hợp với tôi' })
  );
};

export const chatWithAI = (data) => {
  return makeRequest('chatWithAI', [data], () =>
    axiosClient.post(ENDPOINTS.AI.CHAT, data)
  );
};
