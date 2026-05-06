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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Webhook, RefreshCw, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookConfig {
  id: string;
  user_id: string;
  outgoing_url: string | null;
  secret_key: string;
  subscribed_events: string[] | null;
  is_enabled: boolean;
  retry_count: number;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
}

interface ProfileLite {
  id: string;
  name: string | null;
  email: string | null;
}

const maskSecret = (s: string | null | undefined) => {
  if (!s) return '—';
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)`;
};

const hostFromUrl = (url: string | null | undefined) => {
  if (!url) return '—';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

const AdminWebhooks = () => {
  const [configs, setConfigs] = useState<WebhookConfig[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WebhookConfig | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as WebhookConfig[];
      setConfigs(rows);

      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
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

      // Audit the read so we have a trail of admin inspections.
      try {
        await supabase.from('audit_logs').insert({
          event_type: 'webhook_configs_viewed',
          endpoint: 'page:/admin/webhooks',
          details: { count: rows.length },
        });
      } catch {
        /* non-fatal */
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load webhook configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return configs;
    return configs.filter((c) => {
      const p = profiles[c.user_id];
      return (
        c.outgoing_url?.toLowerCase().includes(q) ||
        c.user_id.toLowerCase().includes(q) ||
        p?.name?.toLowerCase().includes(q) ||
        p?.email?.toLowerCase().includes(q) ||
        c.subscribed_events?.some((e) => e.toLowerCase().includes(q))
      );
    });
  }, [configs, profiles, query]);

  const renderOwner = (userId: string) => {
    const p = profiles[userId];
    if (!p) return <code className="text-xs">{userId.slice(0, 8)}…</code>;
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
          <Webhook className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Webhook Destinations</h1>
            <p className="text-sm text-muted-foreground">
              Read-only audit view of every outgoing webhook configuration. Secrets are masked.
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Search
            </CardTitle>
            <CardDescription>
              Filter by URL, owner name/email, user ID, or subscribed event name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="webhook-filter">Search</Label>
                <Input
                  id="webhook-filter"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. hooks.example.com or jane@…"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchConfigs} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {filtered.length} {filtered.length === 1 ? 'destination' : 'destinations'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Destination host</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead className="w-[170px]">Last updated</TableHead>
                  <TableHead className="w-[80px] text-right">Inspect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No webhook destinations match this search.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{renderOwner(c.user_id)}</TableCell>
                      <TableCell className="font-mono text-xs">{hostFromUrl(c.outgoing_url)}</TableCell>
                      <TableCell>
                        <Badge variant={c.is_enabled ? 'default' : 'secondary'}>
                          {c.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.subscribed_events?.length
                          ? `${c.subscribed_events.length} subscribed`
                          : 'None'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(c.updated_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Inspect webhook config"
                          onClick={() => setSelected(c)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Webhook configuration details</DialogTitle>
              <DialogDescription>
                Read-only view for auditing. The secret key is shown masked; use the rotation flow
                to retrieve a new value.
              </DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="grid gap-3 text-sm">
                <DetailRow label="Config ID" value={selected.id} mono />
                <DetailRow
                  label="Owner"
                  value={
                    profiles[selected.user_id]
                      ? `${profiles[selected.user_id].name ?? '—'} <${profiles[selected.user_id].email ?? '—'}>`
                      : selected.user_id
                  }
                />
                <DetailRow label="Owner user ID" value={selected.user_id} mono />
                <DetailRow label="Outgoing URL" value={selected.outgoing_url ?? '—'} mono />
                <DetailRow label="Destination host" value={hostFromUrl(selected.outgoing_url)} mono />
                <DetailRow label="Status" value={selected.is_enabled ? 'Enabled' : 'Disabled'} />
                <DetailRow label="Retry count" value={String(selected.retry_count)} />
                <DetailRow label="Timeout (s)" value={String(selected.timeout_seconds)} />
                <DetailRow
                  label="Subscribed events"
                  value={selected.subscribed_events?.length ? selected.subscribed_events.join(', ') : 'None'}
                />
                <DetailRow label="Secret key" value={maskSecret(selected.secret_key)} mono />
                <DetailRow
                  label="Created"
                  value={format(new Date(selected.created_at), 'dd MMM yyyy HH:mm:ss')}
                />
                <DetailRow
                  label="Last updated"
                  value={format(new Date(selected.updated_at), 'dd MMM yyyy HH:mm:ss')}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="grid grid-cols-[180px_1fr] gap-3 items-start border-b border-border/50 pb-2 last:border-0">
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className={mono ? 'font-mono text-xs break-all' : 'text-sm break-words'}>{value}</span>
  </div>
);

export default AdminWebhooks;