import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  ShieldX,
  Check,
  X,
  AlertTriangle,
  Lock,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';

interface TablePolicy {
  tableName: string;
  rlsEnabled: boolean;
  policies: {
    select: { exists: boolean; restrictive: boolean; description: string };
    insert: { exists: boolean; restrictive: boolean; description: string };
    update: { exists: boolean; restrictive: boolean; description: string };
    delete: { exists: boolean; restrictive: boolean; description: string };
  };
  securityLevel: 'high' | 'medium' | 'low';
  notes: string[];
}

// Static RLS configuration based on the database schema
const tableConfigs: TablePolicy[] = [
  {
    tableName: 'profiles',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Users can view own profile; Admins can view all' },
      insert: { exists: true, restrictive: true, description: 'Users can insert their own profile' },
      update: { exists: true, restrictive: true, description: 'Users can update their own profile' },
      delete: { exists: false, restrictive: false, description: 'No delete allowed' }
    },
    securityLevel: 'high',
    notes: ['Delete blocked intentionally', 'Admin override for viewing']
  },
  {
    tableName: 'user_roles',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Users view own; Admins view all' },
      insert: { exists: true, restrictive: true, description: 'Admin only' },
      update: { exists: true, restrictive: true, description: 'Admin only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Critical table - admin-only mutations']
  },
  {
    tableName: 'audit_logs',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Service role only' },
      update: { exists: true, restrictive: true, description: 'Blocked for all' },
      delete: { exists: true, restrictive: true, description: 'Blocked for all' }
    },
    securityLevel: 'high',
    notes: ['Immutable audit trail', 'Update/Delete blocked by design']
  },
  {
    tableName: 'customer_messages',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Users view own; Staff view all' },
      insert: { exists: true, restrictive: true, description: 'Validated user_id matching' },
      update: { exists: true, restrictive: true, description: 'Admins and moderators only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Anonymous submissions allowed with null user_id']
  },
  {
    tableName: 'content_reports',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Users view own; Staff view all' },
      insert: { exists: true, restrictive: true, description: 'User must match reporter_id' },
      update: { exists: true, restrictive: true, description: 'Staff only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Proper reporter validation']
  },
  {
    tableName: 'bake_shares',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Visible shares public; own shares always' },
      insert: { exists: true, restrictive: true, description: 'User must match user_id' },
      update: { exists: true, restrictive: true, description: 'Own shares or admin' },
      delete: { exists: true, restrictive: true, description: 'Own shares or admin' }
    },
    securityLevel: 'high',
    notes: ['Visibility flag controls public access']
  },
  {
    tableName: 'bake_comments',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Public read access' },
      insert: { exists: true, restrictive: true, description: 'User must match user_id' },
      update: { exists: true, restrictive: true, description: 'Own comments only' },
      delete: { exists: true, restrictive: true, description: 'Own comments or admin' }
    },
    securityLevel: 'medium',
    notes: ['Public read - community feature']
  },
  {
    tableName: 'bake_likes',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Public read access' },
      insert: { exists: true, restrictive: true, description: 'User must match user_id' },
      update: { exists: false, restrictive: false, description: 'No update policy' },
      delete: { exists: true, restrictive: true, description: 'Own likes only' }
    },
    securityLevel: 'high',
    notes: ['Likes are immutable - no update needed']
  },
  {
    tableName: 'baking_sessions',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Own sessions; Admins view all' },
      insert: { exists: true, restrictive: true, description: 'User must match user_id' },
      update: { exists: true, restrictive: true, description: 'Own sessions only' },
      delete: { exists: true, restrictive: true, description: 'Own sessions only' }
    },
    securityLevel: 'high',
    notes: ['Personal baking data protected']
  },
  {
    tableName: 'user_achievements',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Authenticated users can view community' },
      insert: { exists: true, restrictive: true, description: 'Service role only' },
      update: { exists: false, restrictive: false, description: 'No update allowed' },
      delete: { exists: false, restrictive: false, description: 'No delete allowed' }
    },
    securityLevel: 'high',
    notes: ['Achievements immutable', 'Community view requires auth']
  },
  {
    tableName: 'conversations',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Own conversations only' },
      insert: { exists: true, restrictive: true, description: 'User must match user_id' },
      update: { exists: true, restrictive: true, description: 'Own conversations only' },
      delete: { exists: true, restrictive: true, description: 'Own conversations only' }
    },
    securityLevel: 'high',
    notes: ['Private chat data']
  },
  {
    tableName: 'messages',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Via conversation ownership' },
      insert: { exists: true, restrictive: true, description: 'Via conversation ownership' },
      update: { exists: false, restrictive: false, description: 'No update allowed' },
      delete: { exists: true, restrictive: true, description: 'Via conversation ownership' }
    },
    securityLevel: 'high',
    notes: ['Linked to conversation RLS']
  },
  {
    tableName: 'premixes',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Public read access' },
      insert: { exists: true, restrictive: true, description: 'Admin only' },
      update: { exists: true, restrictive: true, description: 'Admin only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Product catalog - public read, admin write']
  },
  {
    tableName: 'premix_steps',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Public read access' },
      insert: { exists: true, restrictive: true, description: 'Admin only' },
      update: { exists: true, restrictive: true, description: 'Admin only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Recipe steps - public read, admin write']
  },
  {
    tableName: 'tutorials',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Public read access' },
      insert: { exists: true, restrictive: true, description: 'Admin or support only' },
      update: { exists: true, restrictive: true, description: 'Admin or support only' },
      delete: { exists: true, restrictive: true, description: 'Admin or support only' }
    },
    securityLevel: 'high',
    notes: ['Educational content - staff managed']
  },
  {
    tableName: 'blocked_ips',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Admin or service role' },
      update: { exists: true, restrictive: true, description: 'Admin only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Security infrastructure - restricted']
  },
  {
    tableName: 'rate_limits',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Service role only' },
      update: { exists: true, restrictive: true, description: 'Service role only' },
      delete: { exists: true, restrictive: true, description: 'Service role only' }
    },
    securityLevel: 'high',
    notes: ['Rate limiting infrastructure']
  },
  {
    tableName: 'webhook_configs',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Own configs; Admins view all' },
      insert: { exists: true, restrictive: true, description: 'Own configs only' },
      update: { exists: true, restrictive: true, description: 'Own configs only' },
      delete: { exists: true, restrictive: true, description: 'Own configs only' }
    },
    securityLevel: 'high',
    notes: ['User webhook secrets protected']
  },
  {
    tableName: 'webhook_logs',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Service role only' },
      update: { exists: true, restrictive: true, description: 'Blocked for all' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Immutable webhook logs']
  },
  {
    tableName: 'app_settings',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Admin only' },
      update: { exists: true, restrictive: true, description: 'Admin only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['System configuration - admin restricted']
  },
  {
    tableName: 'notification_preferences',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Staff own preferences only' },
      insert: { exists: true, restrictive: true, description: 'Staff own preferences only' },
      update: { exists: true, restrictive: true, description: 'Staff own preferences only' },
      delete: { exists: false, restrictive: false, description: 'No delete policy' }
    },
    securityLevel: 'high',
    notes: ['Staff-only feature']
  },
  {
    tableName: 'performance_goals',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Admin only' },
      update: { exists: true, restrictive: true, description: 'Admin only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Business metrics - admin only']
  },
  {
    tableName: 'performance_goal_history',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Service role only' },
      update: { exists: false, restrictive: false, description: 'No update policy' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['Historical data - append-only design']
  },
  {
    tableName: 'integration_health',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Service role only' },
      update: { exists: true, restrictive: true, description: 'Service role only' },
      delete: { exists: true, restrictive: true, description: 'Service role only' }
    },
    securityLevel: 'high',
    notes: ['System health monitoring']
  },
  {
    tableName: 'integration_alerts',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Admin only' },
      insert: { exists: true, restrictive: true, description: 'Service role only' },
      update: { exists: true, restrictive: true, description: 'Admin only' },
      delete: { exists: true, restrictive: true, description: 'Admin only' }
    },
    securityLevel: 'high',
    notes: ['System alerts - admin managed']
  },
  {
    tableName: 'user_preferences',
    rlsEnabled: true,
    policies: {
      select: { exists: true, restrictive: true, description: 'Own preferences only' },
      insert: { exists: true, restrictive: true, description: 'Own preferences only' },
      update: { exists: true, restrictive: true, description: 'Own preferences only' },
      delete: { exists: true, restrictive: true, description: 'Own preferences only' }
    },
    securityLevel: 'high',
    notes: ['User personalization data']
  }
];

export const RLSHealthDashboard = () => {
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const stats = useMemo(() => {
    const total = tableConfigs.length;
    const withRLS = tableConfigs.filter(t => t.rlsEnabled).length;
    const highSecurity = tableConfigs.filter(t => t.securityLevel === 'high').length;
    const mediumSecurity = tableConfigs.filter(t => t.securityLevel === 'medium').length;
    const lowSecurity = tableConfigs.filter(t => t.securityLevel === 'low').length;
    
    const fullCoverage = tableConfigs.filter(t => 
      t.policies.select.exists && 
      t.policies.insert.exists && 
      (t.policies.update.exists || t.notes.some(n => n.toLowerCase().includes('immutable') || n.toLowerCase().includes('no update'))) &&
      (t.policies.delete.exists || t.notes.some(n => n.toLowerCase().includes('no delete')))
    ).length;

    return {
      total,
      withRLS,
      rlsCoverage: Math.round((withRLS / total) * 100),
      highSecurity,
      mediumSecurity,
      lowSecurity,
      fullCoverage,
      policyCoverage: Math.round((fullCoverage / total) * 100)
    };
  }, []);

  const filteredTables = useMemo(() => {
    if (selectedLevel === 'all') return tableConfigs;
    return tableConfigs.filter(t => t.securityLevel === selectedLevel);
  }, [selectedLevel]);

  const getSecurityBadge = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium</Badge>;
      case 'low':
        return <Badge variant="destructive">Low</Badge>;
    }
  };

  const getPolicyIcon = (exists: boolean, restrictive: boolean) => {
    if (!exists) return <X className="h-4 w-4 text-muted-foreground" />;
    if (restrictive) return <Check className="h-4 w-4 text-green-600" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'select': return <Eye className="h-3 w-3" />;
      case 'insert': return <Plus className="h-3 w-3" />;
      case 'update': return <Edit className="h-3 w-3" />;
      case 'delete': return <Trash2 className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              RLS Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.rlsCoverage}%</div>
            <Progress value={stats.rlsCoverage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.withRLS} of {stats.total} tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Policy Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.policyCoverage}%</div>
            <Progress value={stats.policyCoverage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.fullCoverage} tables fully covered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              High Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.highSecurity}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tables with strong RLS
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-yellow-600" />
              Needs Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.mediumSecurity + stats.lowSecurity}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Medium or low security tables
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                RLS Policy Status
              </CardTitle>
              <CardDescription>
                Detailed view of Row Level Security policies for all tables
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Tables ({stats.total})</TabsTrigger>
              <TabsTrigger value="high">High ({stats.highSecurity})</TabsTrigger>
              <TabsTrigger value="medium">Medium ({stats.mediumSecurity})</TabsTrigger>
              <TabsTrigger value="low">Low ({stats.lowSecurity})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedLevel} className="mt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>RLS</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-3 w-3" /> SELECT
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Plus className="h-3 w-3" /> INSERT
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Edit className="h-3 w-3" /> UPDATE
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Trash2 className="h-3 w-3" /> DELETE
                        </div>
                      </TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTables.map((table) => (
                      <TableRow key={table.tableName}>
                        <TableCell className="font-mono text-sm font-medium">
                          {table.tableName}
                        </TableCell>
                        <TableCell>
                          {table.rlsEnabled ? (
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                          ) : (
                            <ShieldX className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell>{getSecurityBadge(table.securityLevel)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center" title={table.policies.select.description}>
                            {getPolicyIcon(table.policies.select.exists, table.policies.select.restrictive)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center" title={table.policies.insert.description}>
                            {getPolicyIcon(table.policies.insert.exists, table.policies.insert.restrictive)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center" title={table.policies.update.description}>
                            {getPolicyIcon(table.policies.update.exists, table.policies.update.restrictive)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center" title={table.policies.delete.description}>
                            {getPolicyIcon(table.policies.delete.exists, table.policies.delete.restrictive)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {table.notes.map((note, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {note}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Policy exists (restrictive)</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span>Policy exists (permissive)</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-muted-foreground" />
              <span>No policy</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>RLS enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-red-600" />
              <span>RLS disabled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
