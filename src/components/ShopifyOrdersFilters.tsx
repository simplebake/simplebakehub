import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface OrderFilters {
  status: 'any' | 'open' | 'closed' | 'cancelled';
  financialStatus: string;
  fulfillmentStatus: string;
  customerSearch: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface ShopifyOrdersFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

export const defaultFilters: OrderFilters = {
  status: 'any',
  financialStatus: 'any',
  fulfillmentStatus: 'any',
  customerSearch: '',
  dateFrom: undefined,
  dateTo: undefined,
};

export function ShopifyOrdersFilters({ 
  filters, 
  onFiltersChange, 
  onApply, 
  onClear 
}: ShopifyOrdersFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = 
    filters.status !== 'any' || 
    filters.financialStatus !== 'any' || 
    filters.fulfillmentStatus !== 'any' ||
    filters.customerSearch !== '' ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined;

  const handleApply = () => {
    onApply();
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              Active
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter Orders</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 px-2">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Order Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value as OrderFilters['status'] })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="financialStatus">Payment Status</Label>
            <Select
              value={filters.financialStatus}
              onValueChange={(value) => onFiltersChange({ ...filters, financialStatus: value })}
            >
              <SelectTrigger id="financialStatus">
                <SelectValue placeholder="Any payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="authorized">Authorized</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fulfillmentStatus">Fulfillment Status</Label>
            <Select
              value={filters.fulfillmentStatus}
              onValueChange={(value) => onFiltersChange({ ...filters, fulfillmentStatus: value })}
            >
              <SelectTrigger id="fulfillmentStatus">
                <SelectValue placeholder="Any fulfillment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer">Customer Search</Label>
            <Input
              id="customer"
              placeholder="Name or email..."
              value={filters.customerSearch}
              onChange={(e) => onFiltersChange({ ...filters, customerSearch: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, "MMM d") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
