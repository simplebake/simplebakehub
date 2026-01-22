import { useState, useMemo } from 'react';
import { useShopifyOrders, ShopifyOrder, OrderFiltersParams } from '@/hooks/useShopifyOrders';
import { ShopifyOrdersFilters, OrderFilters, defaultFilters } from '@/components/ShopifyOrdersFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ShopifyOrdersListProps {
  limit?: number;
}

const getFinancialStatusBadge = (status: string) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
    refunded: { variant: 'outline', icon: <RefreshCw className="h-3 w-3" /> },
    voided: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  };
  
  const config = variants[status] || { variant: 'secondary' as const, icon: null };
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1 capitalize">
      {config.icon}
      {status}
    </Badge>
  );
};

const getFulfillmentStatusBadge = (status: string | null) => {
  if (!status) {
    return <Badge variant="outline" className="capitalize">Unfulfilled</Badge>;
  }
  
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    fulfilled: 'default',
    partial: 'secondary',
    restocked: 'outline',
  };
  
  return (
    <Badge variant={variants[status] || 'secondary'} className="capitalize">
      {status}
    </Badge>
  );
};

const OrderCard = ({ order }: { order: ShopifyOrder }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {order.name}
          </CardTitle>
          <div className="flex gap-2">
            {getFinancialStatusBadge(order.financial_status)}
            {getFulfillmentStatusBadge(order.fulfillment_status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">
              {order.customer 
                ? `${order.customer.first_name} ${order.customer.last_name}`
                : order.email || 'Guest'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">
              {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-semibold text-lg">
              {order.currency} {parseFloat(order.total_price).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Items</p>
            <p className="font-medium">{order.line_items.length} item(s)</p>
          </div>
        </div>
        
        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground mb-2">Products</p>
          <ul className="space-y-1">
            {order.line_items.slice(0, 3).map((item) => (
              <li key={item.id} className="text-sm flex justify-between">
                <span className="truncate flex-1">
                  {item.title}
                  {item.variant_title && ` - ${item.variant_title}`}
                </span>
                <span className="text-muted-foreground ml-2">×{item.quantity}</span>
              </li>
            ))}
            {order.line_items.length > 3 && (
              <li className="text-sm text-muted-foreground">
                +{order.line_items.length - 3} more item(s)
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const OrdersSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <Card key={i}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export function ShopifyOrdersList({ limit = 50 }: ShopifyOrdersListProps) {
  const [filters, setFilters] = useState<OrderFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<OrderFiltersParams>({});

  const { orders, isLoading, error, refetch } = useShopifyOrders({ 
    limit, 
    filters: appliedFilters 
  });

  const handleApplyFilters = () => {
    const newFilters: OrderFiltersParams = {
      status: filters.status,
      financialStatus: filters.financialStatus,
      fulfillmentStatus: filters.fulfillmentStatus,
      createdAtMin: filters.dateFrom?.toISOString(),
      createdAtMax: filters.dateTo?.toISOString(),
    };
    setAppliedFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters({});
  };

  // Client-side filter for customer search (Shopify API doesn't support this directly)
  const filteredOrders = useMemo(() => {
    if (!filters.customerSearch) return orders;
    
    const search = filters.customerSearch.toLowerCase();
    return orders.filter(order => {
      const customerName = order.customer 
        ? `${order.customer.first_name} ${order.customer.last_name}`.toLowerCase()
        : '';
      const email = (order.customer?.email || order.email || '').toLowerCase();
      return customerName.includes(search) || email.includes(search);
    });
  }, [orders, filters.customerSearch]);

  if (isLoading) {
    return <OrdersSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading orders</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No orders found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Orders will appear here once customers make purchases.
          </p>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} order(s)
        </p>
        <div className="flex gap-2">
          <ShopifyOrdersFilters
            filters={filters}
            onFiltersChange={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
