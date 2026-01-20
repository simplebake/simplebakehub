import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, Crown, HeadphonesIcon, User, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ALL_PERMISSIONS, AppPermission } from '@/hooks/usePermissions';
import { logAdminAction } from '@/lib/auditLogger';

type AppRole = 'admin' | 'moderator' | 'support' | 'user';

interface RolePermission {
  id: string;
  role: AppRole;
  permission: AppPermission;
}

interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  overrides: { permission: AppPermission; granted: boolean }[];
}

const ROLES: { value: AppRole; label: string; icon: React.ReactNode }[] = [
  { value: 'admin', label: 'Admin', icon: <Crown className="h-4 w-4" /> },
  { value: 'moderator', label: 'Moderator', icon: <Shield className="h-4 w-4" /> },
  { value: 'support', label: 'Support', icon: <HeadphonesIcon className="h-4 w-4" /> },
  { value: 'user', label: 'User', icon: <User className="h-4 w-4" /> },
];

export const PermissionsManager = () => {
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch role permissions
      const { data: rolePerms, error: roleError } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (roleError) throw roleError;
      setRolePermissions(rolePerms || []);

      // Fetch users with their roles and permission overrides
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name');
      
      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      const { data: userPerms, error: permsError } = await supabase
        .from('user_permissions')
        .select('user_id, permission, granted');
      
      if (permsError) throw permsError;

      const usersWithPerms: UserWithPermissions[] = (profiles || []).map(profile => {
        const userRole = userRoles?.find(r => r.user_id === profile.id);
        const overrides = (userPerms || [])
          .filter(p => p.user_id === profile.id)
          .map(p => ({ permission: p.permission as AppPermission, granted: p.granted }));
        
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: (userRole?.role || 'user') as AppRole,
          overrides,
        };
      });

      setUsers(usersWithPerms);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleRolePermission = async (role: AppRole, permission: AppPermission) => {
    setSaving(true);
    try {
      const existing = rolePermissions.find(rp => rp.role === role && rp.permission === permission);
      
      if (existing) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        setRolePermissions(prev => prev.filter(rp => rp.id !== existing.id));
      } else {
        const { data, error } = await supabase
          .from('role_permissions')
          .insert({ role, permission })
          .select()
          .single();
        if (error) throw error;
        setRolePermissions(prev => [...prev, data]);
      }

      await logAdminAction('permission_change', undefined, {
        action: existing ? 'revoked' : 'granted',
        role,
        permission,
        type: 'role_permission',
      });

      toast.success(`Permission ${existing ? 'revoked' : 'granted'} for ${role}`);
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const setUserOverride = async (userId: string, permission: AppPermission, granted: boolean | null) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (granted === null) {
        // Remove override
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission', permission);
        if (error) throw error;
      } else {
        // Upsert override
        const { error } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: userId,
            permission,
            granted,
            granted_by: user?.id,
          }, { onConflict: 'user_id,permission' });
        if (error) throw error;
      }

      await logAdminAction('permission_change', userId, {
        action: granted === null ? 'override_removed' : (granted ? 'granted' : 'revoked'),
        permission,
        type: 'user_permission',
      });

      toast.success('User permission updated');
      fetchData();
    } catch (error) {
      console.error('Error updating user permission:', error);
      toast.error('Failed to update user permission');
    } finally {
      setSaving(false);
    }
  };

  const hasRolePermission = (role: AppRole, permission: AppPermission) => {
    return rolePermissions.some(rp => rp.role === role && rp.permission === permission);
  };

  const getUserOverride = (user: UserWithPermissions, permission: AppPermission) => {
    return user.overrides.find(o => o.permission === permission);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Permissions Manager
        </CardTitle>
        <CardDescription>
          Configure role-based permissions and individual user overrides
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="roles">
          <TabsList className="mb-4">
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              Role Permissions
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              User Overrides
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission</TableHead>
                  {ROLES.map(role => (
                    <TableHead key={role.value} className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {role.icon}
                        {role.label}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_PERMISSIONS.map(perm => (
                  <TableRow key={perm.value}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </TableCell>
                    {ROLES.map(role => (
                      <TableCell key={role.value} className="text-center">
                        {role.value === 'admin' ? (
                          <div className="flex justify-center">
                            <Check className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Switch
                              checked={hasRolePermission(role.value, perm.value)}
                              onCheckedChange={() => toggleRolePermission(role.value, perm.value)}
                              disabled={saving}
                            />
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-4">
              <Select value={selectedUser || ''} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select a user to manage" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedUser && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead className="text-center">From Role</TableHead>
                      <TableHead className="text-center">Override</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ALL_PERMISSIONS.map(perm => {
                      const user = users.find(u => u.id === selectedUser)!;
                      const fromRole = hasRolePermission(user.role, perm.value);
                      const override = getUserOverride(user, perm.value);
                      
                      return (
                        <TableRow key={perm.value}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{perm.label}</p>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {fromRole ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary">Yes</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {override ? (
                              <Badge variant={override.granted ? 'default' : 'destructive'}>
                                {override.granted ? 'Granted' : 'Revoked'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant={override?.granted === true ? 'default' : 'outline'}
                                onClick={() => setUserOverride(selectedUser, perm.value, true)}
                                disabled={saving}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant={override?.granted === false ? 'destructive' : 'outline'}
                                onClick={() => setUserOverride(selectedUser, perm.value, false)}
                                disabled={saving}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              {override && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setUserOverride(selectedUser, perm.value, null)}
                                  disabled={saving}
                                >
                                  Reset
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
