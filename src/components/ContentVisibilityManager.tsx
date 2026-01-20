import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Cookie, BookOpen, Users, LayoutGrid, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/auditLogger';
import type { ContentType, VisibilitySetting } from '@/hooks/useContentVisibility';

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'premixes', label: 'Premixes & Recipes', icon: <Cookie className="h-4 w-4" /> },
  { value: 'tutorials', label: 'Tutorials', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'community_bakes', label: 'Community Bakes', icon: <Users className="h-4 w-4" /> },
  { value: 'dashboard_sections', label: 'Dashboard Sections', icon: <LayoutGrid className="h-4 w-4" /> },
];

const DASHBOARD_SECTIONS = [
  { key: 'learning_paths', label: 'Personalized Learning Paths' },
  { key: 'smart_tips', label: 'Smart Tips & Recommendations' },
  { key: 'achievements', label: 'Achievement Badges' },
  { key: 'baking_history', label: 'Baking History' },
  { key: 'community_insights', label: 'Community Insights' },
  { key: 'performance_goals', label: 'Performance Goals Widget' },
];

const ROLES = ['admin', 'moderator', 'support', 'user'];

interface ContentItem {
  id: string;
  name: string;
}

export const ContentVisibilityManager = () => {
  const [settings, setSettings] = useState<VisibilitySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>('dashboard_sections');
  const [contentItems, setContentItems] = useState<Record<ContentType, ContentItem[]>>({
    premixes: [],
    tutorials: [],
    community_bakes: [],
    dashboard_sections: DASHBOARD_SECTIONS.map(s => ({ id: s.key, name: s.label })),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch visibility settings
      const { data: visSettings, error: settingsError } = await supabase
        .from('content_visibility_settings')
        .select('*');

      if (settingsError) throw settingsError;
      setSettings((visSettings || []) as VisibilitySetting[]);

      // Fetch content items
      const [premixesRes, tutorialsRes] = await Promise.all([
        supabase.from('premixes').select('id, name'),
        supabase.from('tutorials').select('id, title'),
      ]);

      setContentItems(prev => ({
        ...prev,
        premixes: (premixesRes.data || []).map(p => ({ id: p.id, name: p.name })),
        tutorials: (tutorialsRes.data || []).map(t => ({ id: t.id, name: t.title })),
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load visibility settings');
    } finally {
      setLoading(false);
    }
  };

  const getSetting = (contentType: ContentType, itemId?: string, sectionKey?: string): VisibilitySetting | undefined => {
    return settings.find(s => {
      if (s.content_type !== contentType) return false;
      if (contentType === 'dashboard_sections') {
        return s.section_key === sectionKey;
      }
      return s.content_id === itemId;
    });
  };

  const toggleVisibility = async (contentType: ContentType, itemId?: string, sectionKey?: string) => {
    setSaving(true);
    try {
      const existing = getSetting(contentType, itemId, sectionKey);
      const { data: { user } } = await supabase.auth.getUser();

      if (existing) {
        // Toggle existing setting
        const { error } = await supabase
          .from('content_visibility_settings')
          .update({ is_visible: !existing.is_visible, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
        setSettings(prev => prev.map(s => 
          s.id === existing.id ? { ...s, is_visible: !s.is_visible } : s
        ));
      } else {
        // Create new setting (hidden by default when creating)
        const newSetting = {
          content_type: contentType,
          content_id: contentType !== 'dashboard_sections' ? itemId : null,
          section_key: contentType === 'dashboard_sections' ? sectionKey : null,
          is_visible: false,
          visible_to_roles: [],
          visible_to_users: [],
          hidden_from_users: [],
          created_by: user?.id,
        };

        const { data, error } = await supabase
          .from('content_visibility_settings')
          .insert(newSetting)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => [...prev, data as VisibilitySetting]);
      }

      await logAdminAction('visibility_change', undefined, {
        content_type: contentType,
        item_id: itemId || sectionKey,
        action: existing ? 'toggled' : 'created',
      });

      toast.success('Visibility setting updated');
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    } finally {
      setSaving(false);
    }
  };

  const updateRoleRestriction = async (settingId: string, roles: string[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('content_visibility_settings')
        .update({ 
          visible_to_roles: roles as ('admin' | 'moderator' | 'support' | 'user')[], 
          updated_at: new Date().toISOString() 
        })
        .eq('id', settingId);

      if (error) throw error;
      setSettings(prev => prev.map(s => 
        s.id === settingId ? { ...s, visible_to_roles: roles } : s
      ));

      await logAdminAction('visibility_role_restriction', undefined, {
        setting_id: settingId,
        roles,
      });

      toast.success('Role restriction updated');
    } catch (error) {
      console.error('Error updating role restriction:', error);
      toast.error('Failed to update role restriction');
    } finally {
      setSaving(false);
    }
  };

  const deleteSetting = async (settingId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('content_visibility_settings')
        .delete()
        .eq('id', settingId);

      if (error) throw error;
      setSettings(prev => prev.filter(s => s.id !== settingId));

      await logAdminAction('visibility_setting_deleted', undefined, { setting_id: settingId });
      toast.success('Visibility setting removed');
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast.error('Failed to delete setting');
    } finally {
      setSaving(false);
    }
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
          <Eye className="h-5 w-5 text-primary" />
          Content Visibility Settings
        </CardTitle>
        <CardDescription>
          Control which content is visible to specific users and roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {CONTENT_TYPES.map(type => (
              <TabsTrigger key={type.value} value={type.value} className="gap-2">
                {type.icon}
                <span className="hidden sm:inline">{type.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {CONTENT_TYPES.map(type => (
            <TabsContent key={type.value} value={type.value}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-center">Visible</TableHead>
                    <TableHead>Restricted to Roles</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentItems[type.value].map(item => {
                    const setting = getSetting(
                      type.value, 
                      type.value !== 'dashboard_sections' ? item.id : undefined,
                      type.value === 'dashboard_sections' ? item.id : undefined
                    );
                    const isVisible = !setting || setting.is_visible;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {type.icon}
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center items-center gap-2">
                            <Switch
                              checked={isVisible}
                              onCheckedChange={() => toggleVisibility(
                                type.value,
                                type.value !== 'dashboard_sections' ? item.id : undefined,
                                type.value === 'dashboard_sections' ? item.id : undefined
                              )}
                              disabled={saving}
                            />
                            {isVisible ? (
                              <Eye className="h-4 w-4 text-primary" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {setting ? (
                            <Select
                              value={setting.visible_to_roles.join(',') || 'all'}
                              onValueChange={(value) => {
                                const roles = value === 'all' ? [] : value.split(',');
                                updateRoleRestriction(setting.id, roles);
                              }}
                              disabled={saving}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="admin">Admins Only</SelectItem>
                                <SelectItem value="admin,moderator">Staff Only</SelectItem>
                                <SelectItem value="admin,moderator,support">Staff + Support</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              All Users (Default)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {setting && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteSetting(setting.id)}
                              disabled={saving}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {contentItems[type.value].length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No {type.label.toLowerCase()} found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
