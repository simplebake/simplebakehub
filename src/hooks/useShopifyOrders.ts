import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    variant_title: string | null;
  }>;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  shipping_address?: {
    first_name: string;
    last_name: string;
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
}

interface UseShopifyOrdersOptions {
  limit?: number;
  status?: 'any' | 'open' | 'closed' | 'cancelled';
}

export function useShopifyOrders(options: UseShopifyOrdersOptions = {}) {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { limit = 50, status = 'any' } = options;

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('shopify-orders', {
        body: null,
        headers: {},
      });

      // Build query params manually since invoke doesn't support them directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'twszrhkovxpvosnfkdjk';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shopify-orders?limit=${limit}&status=${status}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const result = await response.json();
      setOrders(result.orders || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(errorMessage);
      console.error('Error fetching Shopify orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [limit, status]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
  };
}

export function useShopifyOrder(orderId: string | null) {
  const [order, setOrder] = useState<ShopifyOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!orderId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'twszrhkovxpvosnfkdjk';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shopify-orders?order_id=${orderId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch order');
      }

      const result = await response.json();
      setOrder(result.order || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch order';
      setError(errorMessage);
      console.error('Error fetching Shopify order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  return {
    order,
    isLoading,
    error,
    refetch: fetchOrder,
  };
}
