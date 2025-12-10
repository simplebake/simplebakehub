import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Crown, Users, Shield, HeadphonesIcon } from 'lucide-react';
import { maskEmail } from '@/lib/emailMasking';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'moderator' | 'support' | 'user' | null;
}

export const UserRoleManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    email: string;
    currentRole: string;
    newRole: 'admin' | 'moderator' | 'support' | 'user';
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap = new Map(
        rolesData?.map(r => [r.user_id, r.role as 'admin' | 'moderator' | 'support' | 'user']) || []
      );

      const usersWithRoles: UserWithRole[] = profilesData?.map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        created_at: profile.created_at,
        role: rolesMap.get(profile.id) || 'user'
      })) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const requestRoleChange = (userId: string, email: string, currentRole: string, newRole: 'admin' | 'moderator' | 'support' | 'user') => {
    if (currentRole === newRole) return;
    setPendingRoleChange({ userId, email, currentRole, newRole });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    
    const { userId, newRole } = pendingRoleChange;
    
    try {
      setUpdating(userId);
      setPendingRoleChange(null);

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        event_type: 'admin_action',
        user_id: user?.id,
        ip_address: 'webapp',
        endpoint: 'update_user_role',
        details: {
          target_user_id: userId,
          new_role: newRole,
          action: 'role_update'
        }
      });

      toast({
        title: 'Success',
        description: `User role updated to ${newRole}`
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="default">
            <Crown className="h-3 w-3 mr-1" />
            admin
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Shield className="h-3 w-3 mr-1" />
            moderator
          </Badge>
        );
      case 'support':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <HeadphonesIcon className="h-3 w-3 mr-1" />
            support
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            user
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const adminCount = users.filter(u => u.role === 'admin').length;
  const moderatorCount = users.filter(u => u.role === 'moderator').length;
  const supportCount = users.filter(u => u.role === 'support').length;
  const userCount = users.filter(u => u.role === 'user').length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Moderators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{moderatorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{supportCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regular Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>User Roles</CardTitle>
          </div>
          <CardDescription>
            Manage user roles and permissions. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{maskEmail(u.email)}</TableCell>
                  <TableCell>
                    {getRoleBadge(u.role)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={u.role || 'user'}
                      onValueChange={(value) => requestRoleChange(u.id, u.email, u.role || 'user', value as 'admin' | 'moderator' | 'support' | 'user')}
                      disabled={u.id === user?.id || updating === u.id}
                    >
                      <SelectTrigger className="w-[130px]">
                        {updating === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingRoleChange} onOpenChange={() => setPendingRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the role for <strong>{pendingRoleChange?.email ? maskEmail(pendingRoleChange.email) : ''}</strong> from{' '}
              <strong>{pendingRoleChange?.currentRole}</strong> to <strong>{pendingRoleChange?.newRole}</strong>?
              {pendingRoleChange?.newRole === 'admin' && (
                <span className="block mt-2 text-destructive">
                  Warning: Admin users have full access to all system settings and user management.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
