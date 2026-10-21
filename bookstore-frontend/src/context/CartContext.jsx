import React, { createContext, useContext, useState, useEffect } from 'react';
import * as cartApi from '../api/services/cartApi';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

/**
 * CartProvider: quản lý trạng thái giỏ hàng
 */
export const CartProvider = ({ children }) => {
  const { token } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadCart = async () => {
      try {
        const data = token ? await cartApi.getCart() : null;
        if (active) {
          setCart(data);
          setItemCount(data?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0);
        }
      } catch (error) {
        console.error('Lỗi lấy giỏ hàng:', error);
      }
    };
    loadCart();
    return () => { active = false; };
  }, [token]);

  // Lấy giỏ hàng
  const fetchCart = async () => {
    try {
      setLoading(true);
      const data = await cartApi.getCart();
      setCart(data);
      const count = data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      setItemCount(count);
    } catch (err) {
      console.error('Lỗi lấy giỏ hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  // Thêm vào giỏ
  const addToCart = async (bookId, quantity = 1) => {
    try {
      const result = await cartApi.addToCart(bookId, quantity);
      // Cập nhật lạc quan
      setItemCount((prev) => prev + quantity);
      await fetchCart();
      return result;
    } catch (err) {
      // Hoàn tác nếu lỗi
      setItemCount((prev) => Math.max(0, prev - quantity));
      throw err;
    }
  };

  // Cập nhật giỏ
  const updateCart = async (bookId, quantity) => {
    try {
      const result = await cartApi.updateCartItem(bookId, quantity);
      await fetchCart();
      return result;
    } catch (err) {
      await fetchCart(); // Reload nếu lỗi
      throw err;
    }
  };

  // Xóa khỏi giỏ
  const removeFromCart = async (bookId) => {
    try {
      const result = await cartApi.removeFromCart(bookId);
      await fetchCart();
      return result;
    } catch (err) {
      throw err;
    }
  };

  // Xóa toàn bộ giỏ
  const clearCart = async () => {
    try {
      const result = await cartApi.clearCart();
      setCart({ items: [] });
      setItemCount(0);
      return result;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    cart,
    items: cart?.items || [],
    addItem: addToCart,
    updateQuantity: updateCart,
    removeItem: removeFromCart,
    getTotal: () => cart?.total ?? 0,
    itemCount,
    loading,
    fetchCart,
    addToCart,
    updateCart,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/**
 * Hook: useCart
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được dùng bên trong CartProvider');
  }
  return context;
};
