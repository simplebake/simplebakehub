import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, UserMinus, X, Search, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/auditLogger';
import type { VisibilitySetting } from '@/hooks/useContentVisibility';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Props {
  setting: VisibilitySetting;
  onUpdate: (updatedSetting: VisibilitySetting) => void;
  onClose: () => void;
}

export const UserVisibilityOverrides = ({ setting, onUpdate, onClose }: Props) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overrideType, setOverrideType] = useState<'allow' | 'hide'>('allow');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });

  const addUserOverride = async (userId: string, type: 'allow' | 'hide') => {
    setSaving(true);
    try {
      const field = type === 'allow' ? 'visible_to_users' : 'hidden_from_users';
      const currentList = type === 'allow' ? setting.visible_to_users : setting.hidden_from_users;
      
      if (currentList.includes(userId)) {
        toast.info('User already in this list');
        return;
      }

      const updatedList = [...currentList, userId];
      
      const { error } = await supabase
        .from('content_visibility_settings')
        .update({ 
          [field]: updatedList,
          updated_at: new Date().toISOString() 
        })
        .eq('id', setting.id);

      if (error) throw error;

      const updatedSetting = {
        ...setting,
        [type === 'allow' ? 'visible_to_users' : 'hidden_from_users']: updatedList,
      };
      onUpdate(updatedSetting);

      await logAdminAction('visibility_user_override', userId, {
        setting_id: setting.id,
        type,
        action: 'added',
      });

      toast.success(`User ${type === 'allow' ? 'allowed' : 'hidden'} successfully`);
    } catch (error) {
      console.error('Error adding user override:', error);
      toast.error('Failed to add user override');
    } finally {
      setSaving(false);
    }
  };

  const removeUserOverride = async (userId: string, type: 'allow' | 'hide') => {
    setSaving(true);
    try {
      const field = type === 'allow' ? 'visible_to_users' : 'hidden_from_users';
      const currentList = type === 'allow' ? setting.visible_to_users : setting.hidden_from_users;
      const updatedList = currentList.filter(id => id !== userId);

      const { error } = await supabase
        .from('content_visibility_settings')
        .update({ 
          [field]: updatedList,
          updated_at: new Date().toISOString() 
        })
        .eq('id', setting.id);

      if (error) throw error;

      const updatedSetting = {
        ...setting,
        [type === 'allow' ? 'visible_to_users' : 'hidden_from_users']: updatedList,
      };
      onUpdate(updatedSetting);

      await logAdminAction('visibility_user_override', userId, {
        setting_id: setting.id,
        type,
        action: 'removed',
      });

      toast.success('User override removed');
    } catch (error) {
      console.error('Error removing user override:', error);
      toast.error('Failed to remove user override');
    } finally {
      setSaving(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
  };

  const getUserEmail = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.email || '';
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
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              User-Specific Overrides
            </CardTitle>
            <CardDescription className="mt-1">
              Allow or hide content for individual users regardless of role settings
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Overrides */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Allowed Users */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Allowed Users
              <Badge variant="secondary" className="text-xs">{setting.visible_to_users.length}</Badge>
            </h4>
            <div className="border rounded-lg p-2 min-h-[80px] max-h-[120px] overflow-y-auto">
              {setting.visible_to_users.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No user-specific access granted
                </p>
              ) : (
                <div className="space-y-1">
                  {setting.visible_to_users.map(userId => (
                    <div key={userId} className="flex items-center justify-between text-xs bg-primary/10 rounded px-2 py-1">
                      <div>
                        <span className="font-medium">{getUserName(userId)}</span>
                        <span className="text-muted-foreground ml-1">({getUserEmail(userId)})</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => removeUserOverride(userId, 'allow')}
                        disabled={saving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hidden Users */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-destructive" />
              Hidden From Users
              <Badge variant="secondary" className="text-xs">{setting.hidden_from_users.length}</Badge>
            </h4>
            <div className="border rounded-lg p-2 min-h-[80px] max-h-[120px] overflow-y-auto">
              {setting.hidden_from_users.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No users explicitly hidden
                </p>
              ) : (
                <div className="space-y-1">
                  {setting.hidden_from_users.map(userId => (
                    <div key={userId} className="flex items-center justify-between text-xs bg-destructive/10 rounded px-2 py-1">
                      <div>
                        <span className="font-medium">{getUserName(userId)}</span>
                        <span className="text-muted-foreground ml-1">({getUserEmail(userId)})</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => removeUserOverride(userId, 'hide')}
                        disabled={saving}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add User Override */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Add User Override</h4>
          <div className="flex gap-2 mb-2">
            <Select value={overrideType} onValueChange={(v) => setOverrideType(v as 'allow' | 'hide')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allow">
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-3 w-3 text-primary" />
                    Allow
                  </span>
                </SelectItem>
                <SelectItem value="hide">
                  <span className="flex items-center gap-2">
                    <UserMinus className="h-3 w-3 text-destructive" />
                    Hide
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {searchQuery && (
            <div className="border rounded-lg max-h-[160px] overflow-y-auto">
              <Table>
                <TableBody>
                  {filteredUsers.slice(0, 10).map(user => {
                    const isAllowed = setting.visible_to_users.includes(user.id);
                    const isHidden = setting.hidden_from_users.includes(user.id);
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="py-2">
                          <div className="text-sm">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {isAllowed && (
                            <Badge variant="outline" className="text-xs text-primary mr-2">Allowed</Badge>
                          )}
                          {isHidden && (
                            <Badge variant="outline" className="text-xs text-destructive mr-2">Hidden</Badge>
                          )}
                          <Button
                            size="sm"
                            variant={overrideType === 'allow' ? 'default' : 'destructive'}
                            onClick={() => addUserOverride(user.id, overrideType)}
                            disabled={saving || (overrideType === 'allow' && isAllowed) || (overrideType === 'hide' && isHidden)}
                          >
                            {overrideType === 'allow' ? (
                              <>
                                <UserPlus className="h-3 w-3 mr-1" />
                                Allow
                              </>
                            ) : (
                              <>
                                <UserMinus className="h-3 w-3 mr-1" />
                                Hide
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
