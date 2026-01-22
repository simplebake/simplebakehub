import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    variant_title: string | null;
    sku: string | null;
  }>;
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

export interface OrderFiltersParams {
  status?: 'any' | 'open' | 'closed' | 'cancelled';
  financialStatus?: string;
  fulfillmentStatus?: string;
  createdAtMin?: string;
  createdAtMax?: string;
}

interface UseShopifyOrdersOptions {
  limit?: number;
  filters?: OrderFiltersParams;
}

export function useShopifyOrders({ limit = 50, filters = {} }: UseShopifyOrdersOptions = {}) {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in.');
      }

      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('status', filters.status || 'any');
      
      if (filters.financialStatus && filters.financialStatus !== 'any') {
        params.set('financial_status', filters.financialStatus);
      }
      if (filters.fulfillmentStatus && filters.fulfillmentStatus !== 'any') {
        params.set('fulfillment_status', filters.fulfillmentStatus);
      }
      if (filters.createdAtMin) {
        params.set('created_at_min', filters.createdAtMin);
      }
      if (filters.createdAtMax) {
        params.set('created_at_max', filters.createdAtMax);
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'twszrhkovxpvosnfkdjk';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shopify-orders?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error('Authentication required. Please log in.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Admin, moderator, or support role required.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Error fetching Shopify orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, filters.status, filters.financialStatus, filters.fulfillmentStatus, filters.createdAtMin, filters.createdAtMax]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, isLoading, error, refetch: fetchOrders };
}

export function useShopifyOrder(orderId: string | null) {
  const [order, setOrder] = useState<ShopifyOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in.');
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'twszrhkovxpvosnfkdjk';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shopify-orders?order_id=${orderId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error('Authentication required. Please log in.');
      }

      if (response.status === 403) {
        throw new Error('Access denied. Admin, moderator, or support role required.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data.order || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order');
      console.error('Error fetching Shopify order:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, isLoading, error, refetch: fetchOrder };
}
