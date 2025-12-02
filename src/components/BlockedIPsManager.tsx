import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  ShieldBan, 
  ShieldCheck, 
  Loader2, 
  Clock,
  Ban,
  Plus
} from 'lucide-react';

interface BlockedIP {
  id: string;
  ip_address: string;
  blocked_at: string;
  reason: string;
  expires_at: string | null;
  is_active: boolean;
  auto_blocked: boolean;
  violation_count: number;
}

export const BlockedIPsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [newReason, setNewReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('24');

  useEffect(() => {
    fetchBlockedIPs();
  }, []);

  const fetchBlockedIPs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .order('blocked_at', { ascending: false });

      if (error) throw error;
      setBlockedIPs(data || []);
    } catch (error: any) {
      console.error('Error fetching blocked IPs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch blocked IPs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addBlockedIP = async () => {
    if (!newIP || !newReason) {
      toast({
        title: 'Error',
        description: 'Please enter IP address and reason',
        variant: 'destructive'
      });
      return;
    }

    try {
      const expiresAt = blockDuration === 'permanent' 
        ? null 
        : new Date(Date.now() + parseInt(blockDuration) * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('blocked_ips')
        .insert({
          ip_address: newIP,
          reason: newReason,
          expires_at: expiresAt,
          is_active: true,
          auto_blocked: false,
          violation_count: 0
        });

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        event_type: 'admin_action',
        ip_address: 'webapp',
        endpoint: 'block_ip',
        details: {
          blocked_ip: newIP,
          reason: newReason,
          expires_at: expiresAt
        }
      });

      toast({
        title: 'Success',
        description: 'IP address blocked successfully'
      });

      setShowAddDialog(false);
      setNewIP('');
      setNewReason('');
      setBlockDuration('24');
      fetchBlockedIPs();
    } catch (error: any) {
      console.error('Error blocking IP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to block IP address',
        variant: 'destructive'
      });
    }
  };

  const unblockIP = async (id: string, ipAddress: string) => {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        event_type: 'admin_action',
        ip_address: 'webapp',
        endpoint: 'unblock_ip',
        details: {
          unblocked_ip: ipAddress
        }
      });

      toast({
        title: 'Success',
        description: 'IP address unblocked successfully'
      });

      fetchBlockedIPs();
    } catch (error: any) {
      console.error('Error unblocking IP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unblock IP address',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldBan className="h-5 w-5" />
            Blocked IP Addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const activeBlocks = blockedIPs.filter(ip => ip.is_active);
  const inactiveBlocks = blockedIPs.filter(ip => !ip.is_active);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldBan className="h-5 w-5" />
              Blocked IP Addresses
            </CardTitle>
            <CardDescription>
              Manage IP addresses blocked for security violations
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Block IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block IP Address</DialogTitle>
                <DialogDescription>
                  Manually block an IP address from accessing the application
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">IP Address</label>
                  <Input
                    placeholder="192.168.1.1"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    placeholder="Suspicious activity detected..."
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Block Duration</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(e.target.value)}
                  >
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
                <Button onClick={addBlockedIP} className="w-full">
                  Block IP Address
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              Active Blocks ({activeBlocks.length})
            </h3>
            {activeBlocks.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active blocks</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBlocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-mono text-sm font-semibold">
                        {block.ip_address}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {block.reason}
                      </TableCell>
                      <TableCell>
                        {block.violation_count > 0 && (
                          <Badge variant="destructive">
                            {block.violation_count} violations
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(block.blocked_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {block.expires_at ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {new Date(block.expires_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <Badge variant="outline">Permanent</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={block.auto_blocked ? 'secondary' : 'default'}>
                          {block.auto_blocked ? 'Auto' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unblockIP(block.id, block.ip_address)}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {inactiveBlocks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-5 w-5" />
                Unblocked History ({inactiveBlocks.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked Period</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveBlocks.slice(0, 10).map((block) => (
                    <TableRow key={block.id} className="opacity-60">
                      <TableCell className="font-mono text-sm">
                        {block.ip_address}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {block.reason}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(block.blocked_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {block.auto_blocked ? 'Auto' : 'Manual'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
