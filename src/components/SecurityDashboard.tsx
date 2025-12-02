import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  UserX, 
  Lock,
  Loader2
} from 'lucide-react';

interface AuthMetrics {
  total_auth_events: number;
  recent_signups: number;
  recent_signins: number;
  recent_signouts: number;
}

interface RateLimitViolation {
  ip_address: string;
  endpoint: string;
  request_count: number;
  window_start: string;
}

interface SecurityAlert {
  id: string;
  event_type: string;
  created_at: string;
  ip_address: string;
  endpoint: string;
  details: any;
}

export const SecurityDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authMetrics, setAuthMetrics] = useState<AuthMetrics>({
    total_auth_events: 0,
    recent_signups: 0,
    recent_signins: 0,
    recent_signouts: 0,
  });
  const [rateLimitViolations, setRateLimitViolations] = useState<RateLimitViolation[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<SecurityAlert[]>([]);

  useEffect(() => {
    fetchSecurityData();
    
    // Set up real-time subscription for new alerts
    const channel = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: 'event_type=in.(authentication_signin,authentication_signup,authentication_signout,edge_function_invocation)'
        },
        () => {
          fetchSecurityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Fetch authentication metrics
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: authData, error: authError } = await supabase
        .from('audit_logs')
        .select('event_type, created_at')
        .in('event_type', [
          'authentication_signup',
          'authentication_signin',
          'authentication_signout'
        ])
        .gte('created_at', oneDayAgo.toISOString());

      if (authError) throw authError;

      const metrics: AuthMetrics = {
        total_auth_events: authData?.length || 0,
        recent_signups: authData?.filter(e => e.event_type === 'authentication_signup').length || 0,
        recent_signins: authData?.filter(e => e.event_type === 'authentication_signin').length || 0,
        recent_signouts: authData?.filter(e => e.event_type === 'authentication_signout').length || 0,
      };
      setAuthMetrics(metrics);

      // Fetch rate limit violations (requests approaching or at limit)
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('rate_limits')
        .select('*')
        .gte('window_start', oneHourAgo.toISOString())
        .gte('request_count', 50) // Show IPs with 50+ requests
        .order('request_count', { ascending: false })
        .limit(10);

      if (rateLimitError) throw rateLimitError;
      setRateLimitViolations(rateLimitData || []);

      // Fetch recent security alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (alertsError) throw alertsError;
      setRecentAlerts(alertsData || []);

    } catch (error: any) {
      console.error('Error fetching security data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch security data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'authentication_signup':
        return <UserCheck className="h-4 w-4" />;
      case 'authentication_signin':
        return <Lock className="h-4 w-4" />;
      case 'authentication_signout':
        return <UserX className="h-4 w-4" />;
      case 'edge_function_invocation':
        return <Activity className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'authentication_signup':
        return 'default';
      case 'authentication_signin':
        return 'secondary';
      case 'authentication_signout':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Dashboard
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
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Dashboard
          </CardTitle>
          <CardDescription>
            Real-time security metrics and alerts (Last 24 hours)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-2 p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Total Events</span>
              </div>
              <div className="text-3xl font-bold">{authMetrics.total_auth_events}</div>
            </div>

            <div className="flex flex-col gap-2 p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                <span className="text-sm font-medium">New Signups</span>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {authMetrics.recent_signups}
              </div>
            </div>

            <div className="flex flex-col gap-2 p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Sign Ins</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {authMetrics.recent_signins}
              </div>
            </div>

            <div className="flex flex-col gap-2 p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserX className="h-4 w-4" />
                <span className="text-sm font-medium">Sign Outs</span>
              </div>
              <div className="text-3xl font-bold">{authMetrics.recent_signouts}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {rateLimitViolations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Rate Limit Activity
            </CardTitle>
            <CardDescription>
              IP addresses with high request volumes (50+ requests/hour)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Request Count</TableHead>
                  <TableHead>Window Start</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateLimitViolations.map((violation, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {violation.ip_address}
                    </TableCell>
                    <TableCell>{violation.endpoint}</TableCell>
                    <TableCell>
                      <span className={violation.request_count >= 60 ? 'text-red-600 font-bold' : 'font-semibold'}>
                        {violation.request_count}/60
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(violation.window_start).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {violation.request_count >= 60 ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">
                          Warning
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Latest authentication and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAlerts.slice(0, 15).map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getEventIcon(alert.event_type)}
                      <span className="text-sm">
                        {alert.event_type.replace('_', ' ').replace('authentication ', '')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getEventBadgeVariant(alert.event_type)}>
                      {alert.event_type.split('_')[0]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {alert.endpoint || 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {alert.ip_address}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(alert.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
