import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Banknote, Smartphone, AlertCircle } from 'lucide-react';
import {
  Button,
  Card,
  FormField,
  Input,
  Textarea,
  RadioGroup,
  EmptyState,
  Skeleton,
  ConfirmModal,
  Badge,
} from '../../components/ui';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { orderApi } from '../../api/services';

/**
 * CheckoutPage Component
 * Order review and payment method selection
 */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    note: '',
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const total = getTotal?.() || 0;
  const shippingCost = total >= 250000 ? 0 : 30000;
  const finalTotal = total + shippingCost;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmOrder = async () => {
    if (!formData.full_name?.trim()) {
      showToast('error', 'Please enter recipient name');
      return;
    }
    if (!formData.phone?.trim()) {
      showToast('error', 'Please enter phone number');
      return;
    }
    if (!formData.address?.trim()) {
      showToast('error', 'Please enter delivery address');
      return;
    }

    setConfirmOpen(true);
  };

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);

      const orderData = {
        shipping_address: formData.address,
        customer_phone: formData.phone,
        customer_name: formData.full_name,
        payment_method: paymentMethod === 'cod' ? 'COD' : paymentMethod === 'bank' ? 'BANK_TRANSFER' : 'VNPAY',
        note: formData.note,
        items: items.map(item => ({
          book_id: item.book_id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };

      const response = await orderApi.createOrder(orderData);

      if (response?.id) {
        clearCart?.();
        showToast('success', 'Order placed successfully!');

        // Handle payment based on method
        if (paymentMethod !== 'cod') {
          navigate(`/orders/${response.id}?payment_pending=true`);
        } else {
          navigate(`/orders/${response.id}`);
        }
      }
    } catch (err) {
      console.error('Order error:', err);
      showToast('error', err.message || 'Failed to place order');
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(price);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
        <EmptyState title="Cart is empty" description="Add items to checkout" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-paper py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-display-md font-bold text-ink dark:text-ink mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Information */}
            <Card className="p-6 space-y-4">
              <h2 className="font-bold text-heading-md text-ink dark:text-ink">Delivery Information</h2>

              <div className="space-y-4">
                <FormField label="Full Name" required>
                  <Input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                  />
                </FormField>

                <FormField label="Phone Number" required>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+84 90 000 0000"
                  />
                </FormField>

                <FormField label="Delivery Address" required>
                  <Textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, District, City, Country"
                    rows={3}
                  />
                </FormField>

                <FormField label="Order Notes (Optional)">
                  <Textarea
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    placeholder="Special instructions for delivery..."
                    rows={2}
                  />
                </FormField>
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-6 space-y-4">
              <h2 className="font-bold text-heading-md text-ink dark:text-ink">Payment Method</h2>

              <div className="space-y-3">
                {/* COD */}
                <label className="flex items-center p-4 border-2 border-border dark:border-border rounded-card cursor-pointer hover:border-primary transition-colors" style={{ borderColor: paymentMethod === 'cod' ? 'var(--color-primary)' : undefined }}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-start gap-3 flex-1">
                    <Banknote className="w-6 h-6 text-primary dark:text-primary-light mt-1" />
                    <div>
                      <p className="font-semibold text-body-md text-ink dark:text-ink">Cash on Delivery</p>
                      <p className="text-body-sm text-ink-muted dark:text-ink-muted">Pay when you receive your order</p>
                    </div>
                  </div>
                </label>

                {/* Bank Transfer */}
                <label className="flex items-center p-4 border-2 border-border dark:border-border rounded-card cursor-pointer hover:border-primary transition-colors" style={{ borderColor: paymentMethod === 'bank' ? 'var(--color-primary)' : undefined }}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-start gap-3 flex-1">
                    <CreditCard className="w-6 h-6 text-primary dark:text-primary-light mt-1" />
                    <div>
                      <p className="font-semibold text-body-md text-ink dark:text-ink">Bank Transfer</p>
                      <p className="text-body-sm text-ink-muted dark:text-ink-muted">Transfer payment details will be provided after order</p>
                    </div>
                  </div>
                </label>

                {/* VNPay */}
                <label className="flex items-center p-4 border-2 border-border dark:border-border rounded-card cursor-pointer hover:border-primary transition-colors" style={{ borderColor: paymentMethod === 'vnpay' ? 'var(--color-primary)' : undefined }}>
                  <input
                    type="radio"
                    name="payment"
                    value="vnpay"
                    checked={paymentMethod === 'vnpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-start gap-3 flex-1">
                    <Smartphone className="w-6 h-6 text-primary dark:text-primary-light mt-1" />
                    <div>
                      <p className="font-semibold text-body-md text-ink dark:text-ink">VNPay</p>
                      <p className="text-body-sm text-ink-muted dark:text-ink-muted">Thanh toán qua VNPay</p>
                    </div>
                  </div>
                </label>
              </div>
            </Card>

            {/* Info Alert */}
            <div className="flex gap-3 p-4 bg-info-soft dark:bg-info-soft/20 rounded-card">
              <AlertCircle className="w-5 h-5 text-info dark:text-info flex-shrink-0 mt-0.5" />
              <p className="text-body-sm text-info dark:text-info">
                By proceeding, you agree to our Terms of Service and Privacy Policy. Orders cannot be cancelled after confirmation.
              </p>
            </div>
          </div>

          {/* Order Summary - Right Column */}
          <div>
            <Card className="p-6 sticky top-24 space-y-4">
              <h2 className="font-bold text-heading-md text-ink dark:text-ink">Order Summary</h2>

              {/* Items List */}
              <div className="space-y-3 max-h-96 overflow-y-auto border-b border-border dark:border-border pb-4">
                {items.map((item) => (
                  <div key={item.book_id} className="flex justify-between text-body-sm">
                    <span className="text-ink-muted dark:text-ink-muted line-clamp-2 flex-1">
                      {item.title} <span className="font-medium">×{item.quantity}</span>
                    </span>
                    <span className="text-ink dark:text-ink font-medium ml-2">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-ink-muted dark:text-ink-muted">Subtotal:</span>
                  <span className="text-ink dark:text-ink">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-ink-muted dark:text-ink-muted">Shipping:</span>
                  <span className="text-ink dark:text-ink">
                    {shippingCost === 0 ? (
                      <Badge variant="success" size="sm">Free</Badge>
                    ) : (
                      formatPrice(shippingCost)
                    )}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-border dark:border-border pt-4">
                <div className="flex justify-between">
                  <span className="font-bold text-ink dark:text-ink">Total:</span>
                  <span className="font-bold text-heading-lg text-primary dark:text-primary-light">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirmOrder}
                disabled={loading}
                className="w-full mt-6"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Confirm Order"
        confirmLabel="Place Order"
        onConfirm={handlePlaceOrder}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      >
        <div className="space-y-3">
          <p className="text-body-md text-ink dark:text-ink">
            Please confirm your order details:
          </p>
          <div className="space-y-2 text-body-sm bg-surface-muted dark:bg-surface p-4 rounded-card">
            <div><strong>Name:</strong> {formData.full_name}</div>
            <div><strong>Phone:</strong> {formData.phone}</div>
            <div><strong>Address:</strong> {formData.address}</div>
            <div><strong>Payment:</strong> {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bank' ? 'Bank Transfer' : 'Mobile Wallet'}</div>
            <div className="pt-2 border-t border-border dark:border-border">
              <div><strong>Total Amount:</strong> <span className="text-primary dark:text-primary-light font-bold">{formatPrice(finalTotal)}</span></div>
            </div>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default CheckoutPage;
