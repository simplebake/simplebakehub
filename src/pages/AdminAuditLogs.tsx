import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ScrollText, RefreshCw, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  endpoint: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface ProfileLite {
  id: string;
  name: string | null;
  email: string | null;
}

const PAGE_SIZE = 100;

const TIME_RANGES: Record<string, { label: string; hours: number | null }> = {
  '1h': { label: 'Last hour', hours: 1 },
  '24h': { label: 'Last 24 hours', hours: 24 },
  '7d': { label: 'Last 7 days', hours: 24 * 7 },
  '30d': { label: 'Last 30 days', hours: 24 * 30 },
  all: { label: 'All time', hours: null },
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [userQuery, setUserQuery] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('id, user_id, event_type, endpoint, details, ip_address, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      const range = TIME_RANGES[timeRange];
      if (range?.hours) {
        const since = new Date(Date.now() - range.hours * 3600 * 1000).toISOString();
        query = query.gte('created_at', since);
      }
      if (eventType !== 'all') {
        query = query.eq('event_type', eventType);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as AuditLog[];
      setLogs(rows);

      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        const map: Record<string, ProfileLite> = {};
        (profs ?? []).forEach((p: any) => {
          map[p.id] = p;
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, timeRange]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.event_type));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const p = l.user_id ? profiles[l.user_id] : null;
      return (
        l.user_id?.toLowerCase().includes(q) ||
        p?.name?.toLowerCase().includes(q) ||
        p?.email?.toLowerCase().includes(q)
      );
    });
  }, [logs, profiles, userQuery]);

  const renderUser = (log: AuditLog) => {
    if (!log.user_id) return <span className="text-muted-foreground italic">system</span>;
    const p = profiles[log.user_id];
    if (!p) return <code className="text-xs">{log.user_id.slice(0, 8)}…</code>;
    return (
      <div className="flex flex-col">
        <span className="text-sm">{p.name ?? '—'}</span>
        <span className="text-xs text-muted-foreground">{p.email}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <ScrollText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Moderation and security events. Showing the most recent {PAGE_SIZE} entries that match the filters.
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
            <CardDescription>Filter by user, action type, and time range.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="user-filter">User (name, email or ID)</Label>
                <Input
                  id="user-filter"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="e.g. jane@…"
                />
              </div>
              <div className="space-y-2">
                <Label>Action / event</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="moderation_action">Moderation actions</SelectItem>
                    <SelectItem value="security_doc_viewed">Security doc viewed</SelectItem>
                    <SelectItem value="security_step_up_confirmed">Security step-up</SelectItem>
                    <SelectItem value="webhook_secret_regenerated">Webhook secret regenerated</SelectItem>
                    <SelectItem value="webhook_secret_verified">Webhook secret verified</SelectItem>
                    {eventTypes
                      .filter(
                        (t) =>
                          ![
                            'moderation_action',
                            'security_doc_viewed',
                            'security_step_up_confirmed',
                            'webhook_secret_regenerated',
                            'webhook_secret_verified',
                          ].includes(t),
                      )
                      .map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIME_RANGES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchLogs} variant="outline" className="w-full gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No audit log entries match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{renderUser(log)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.event_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.endpoint ?? '—'}
                    </TableCell>
                    <TableCell>
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <pre className="text-xs bg-muted/50 p-2 rounded max-w-md overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuditLogs;