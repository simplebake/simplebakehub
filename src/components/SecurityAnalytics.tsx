import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  Shield, 
  Calendar,
  Loader2
} from 'lucide-react';

interface TimeSeriesData {
  date: string;
  signups: number;
  signins: number;
  signouts: number;
  blocked_ips: number;
  rate_violations: number;
}

interface EventTypeDistribution {
  name: string;
  value: number;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const SecurityAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [eventDistribution, setEventDistribution] = useState<EventTypeDistribution[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalEvents: 0,
    totalBlocks: 0,
    totalViolations: 0,
    activeBlocks: 0
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const getDaysBack = () => {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const daysBack = getDaysBack();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Fetch authentication events
      const { data: authEvents, error: authError } = await supabase
        .from('audit_logs')
        .select('event_type, created_at')
        .in('event_type', [
          'authentication_signup',
          'authentication_signin',
          'authentication_signout'
        ])
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (authError) throw authError;

      // Fetch blocked IPs over time
      const { data: blockedIPs, error: blocksError } = await supabase
        .from('blocked_ips')
        .select('blocked_at, is_active')
        .gte('blocked_at', startDate.toISOString())
        .order('blocked_at', { ascending: true });

      if (blocksError) throw blocksError;

      // Fetch rate limit violations
      const { data: rateLimits, error: rateError } = await supabase
        .from('rate_limits')
        .select('window_start, request_count')
        .gte('request_count', 60)
        .gte('window_start', startDate.toISOString());

      if (rateError) throw rateError;

      // Process data into time series
      const dateMap = new Map<string, TimeSeriesData>();
      
      // Initialize dates
      for (let i = 0; i < daysBack; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (daysBack - i - 1));
        const dateKey = date.toISOString().split('T')[0];
        dateMap.set(dateKey, {
          date: dateKey,
          signups: 0,
          signins: 0,
          signouts: 0,
          blocked_ips: 0,
          rate_violations: 0
        });
      }

      // Process auth events
      authEvents?.forEach(event => {
        const dateKey = event.created_at.split('T')[0];
        const data = dateMap.get(dateKey);
        if (data) {
          if (event.event_type === 'authentication_signup') data.signups++;
          if (event.event_type === 'authentication_signin') data.signins++;
          if (event.event_type === 'authentication_signout') data.signouts++;
        }
      });

      // Process blocked IPs
      blockedIPs?.forEach(block => {
        const dateKey = block.blocked_at.split('T')[0];
        const data = dateMap.get(dateKey);
        if (data) data.blocked_ips++;
      });

      // Process rate violations
      rateLimits?.forEach(limit => {
        const dateKey = limit.window_start.split('T')[0];
        const data = dateMap.get(dateKey);
        if (data) data.rate_violations++;
      });

      const seriesData = Array.from(dateMap.values());
      setTimeSeriesData(seriesData);

      // Calculate event type distribution
      const distribution: EventTypeDistribution[] = [
        { name: 'Sign Ups', value: authEvents?.filter(e => e.event_type === 'authentication_signup').length || 0 },
        { name: 'Sign Ins', value: authEvents?.filter(e => e.event_type === 'authentication_signin').length || 0 },
        { name: 'Sign Outs', value: authEvents?.filter(e => e.event_type === 'authentication_signout').length || 0 },
        { name: 'IP Blocks', value: blockedIPs?.length || 0 },
        { name: 'Rate Violations', value: rateLimits?.length || 0 }
      ];
      setEventDistribution(distribution);

      // Calculate totals
      setTotalStats({
        totalEvents: authEvents?.length || 0,
        totalBlocks: blockedIPs?.length || 0,
        totalViolations: rateLimits?.length || 0,
        activeBlocks: blockedIPs?.filter(b => b.is_active).length || 0
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Security Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Security Analytics
              </CardTitle>
              <CardDescription>
                Track security trends and patterns over time
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Total Events</span>
              </div>
              <div className="text-2xl font-bold">{totalStats.totalEvents}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">IP Blocks</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {totalStats.totalBlocks}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Rate Violations</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {totalStats.totalViolations}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Active Blocks</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {totalStats.activeBlocks}
              </div>
            </div>
          </div>

          <Tabs defaultValue="auth" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="security">Security Events</TabsTrigger>
              <TabsTrigger value="violations">Rate Limits</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
            </TabsList>

            <TabsContent value="auth" className="space-y-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={formatDate}
                      contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="signups" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="#10b981" 
                      name="Sign Ups"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="signins" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      name="Sign Ins"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="signouts" 
                      stackId="1"
                      stroke="#6b7280" 
                      fill="#6b7280" 
                      name="Sign Outs"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={formatDate}
                      contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="blocked_ips" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="IP Blocks"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="violations" className="space-y-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={formatDate}
                      contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="rate_violations" 
                      fill="#f59e0b" 
                      name="Rate Limit Violations"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
