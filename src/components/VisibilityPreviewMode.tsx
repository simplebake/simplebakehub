import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Cookie, BookOpen, Users, LayoutGrid, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ContentType, VisibilitySetting } from '@/hooks/useContentVisibility';

const ROLES = ['admin', 'moderator', 'support', 'user'] as const;

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'premixes', label: 'Premixes', icon: <Cookie className="h-4 w-4" /> },
  { value: 'tutorials', label: 'Tutorials', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'community_bakes', label: 'Community Bakes', icon: <Users className="h-4 w-4" /> },
  { value: 'dashboard_sections', label: 'Dashboard', icon: <LayoutGrid className="h-4 w-4" /> },
  { value: 'landing_page', label: 'Landing Page', icon: <LayoutGrid className="h-4 w-4" /> },
];

const DASHBOARD_SECTIONS = [
  { key: 'learning_paths', label: 'Personalized Learning Paths' },
  { key: 'smart_tips', label: 'Smart Tips' },
  { key: 'achievements', label: 'Achievement Badges' },
  { key: 'baking_history', label: 'Baking History' },
  { key: 'community_insights', label: 'Community Insights' },
  { key: 'performance_goals', label: 'Performance Goals' },
  { key: 'recommendations', label: 'Personalized Recommendations' },
  { key: 'recipe_analyzer', label: 'Recipe Difficulty Analyzer' },
];

const LANDING_SECTIONS = [
  { key: 'hero', label: 'Hero Section' },
  { key: 'features', label: 'Features Section' },
  { key: 'benefits', label: 'Benefits Section' },
  { key: 'cta', label: 'Call to Action' },
];

interface PreviewUser {
  id: string;
  name: string;
  email: string;
}

interface ContentItem {
  id: string;
  name: string;
}

interface Props {
  settings: VisibilitySetting[];
}

export const VisibilityPreviewMode = ({ settings }: Props) => {
  const [previewRole, setPreviewRole] = useState<typeof ROLES[number]>('user');
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<PreviewUser[]>([]);
  const [contentItems, setContentItems] = useState<Record<ContentType, ContentItem[]>>({
    premixes: [],
    tutorials: [],
    community_bakes: [],
    dashboard_sections: DASHBOARD_SECTIONS.map(s => ({ id: s.key, name: s.label })),
    landing_page: LANDING_SECTIONS.map(s => ({ id: s.key, name: s.label })),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [usersRes, premixesRes, tutorialsRes] = await Promise.all([
      supabase.from('profiles').select('id, name, email').limit(50),
      supabase.from('premixes').select('id, name'),
      supabase.from('tutorials').select('id, title'),
    ]);

    setUsers(usersRes.data || []);
    setContentItems(prev => ({
      ...prev,
      premixes: (premixesRes.data || []).map(p => ({ id: p.id, name: p.name })),
      tutorials: (tutorialsRes.data || []).map(t => ({ id: t.id, name: t.title })),
    }));
  };

  const isContentVisibleForPreview = (
    contentType: ContentType,
    contentId?: string,
    sectionKey?: string
  ): boolean => {
    const matchingSetting = settings.find(s => {
      if (s.content_type !== contentType) return false;
      if (contentId && s.content_id === contentId) return true;
      if (sectionKey && s.section_key === sectionKey) return true;
      if (!s.content_id && !s.section_key) return true;
      return false;
    });

    if (!matchingSetting) return true;
    if (!matchingSetting.is_visible) return false;

    // Check if preview user is explicitly hidden
    if (previewUserId && matchingSetting.hidden_from_users.includes(previewUserId)) return false;

    // Check role restrictions
    if (matchingSetting.visible_to_roles.length > 0) {
      if (!matchingSetting.visible_to_roles.includes(previewRole)) {
        if (!previewUserId || !matchingSetting.visible_to_users.includes(previewUserId)) {
          return false;
        }
      }
    }

    // Check user-specific visibility
    if (matchingSetting.visible_to_roles.length === 0 && matchingSetting.visible_to_users.length > 0) {
      if (!previewUserId || !matchingSetting.visible_to_users.includes(previewUserId)) {
        return false;
      }
    }

    return true;
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5 text-primary" />
          Preview Mode
        </CardTitle>
        <CardDescription>
          See how content visibility appears for different roles and users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Preview as Role</label>
            <Select value={previewRole} onValueChange={(v) => setPreviewRole(v as typeof ROLES[number])}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Preview as User (optional)</label>
            <Select value={previewUserId || 'none'} onValueChange={(v) => setPreviewUserId(v === 'none' ? null : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific user</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{user.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-background">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            Content Visibility for: 
            <Badge variant="secondary" className="capitalize">{previewRole}</Badge>
            {previewUserId && (
              <Badge variant="outline">
                {users.find(u => u.id === previewUserId)?.name || 'User'}
              </Badge>
            )}
          </h4>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {CONTENT_TYPES.map(type => (
              <div key={type.value} className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  {type.icon}
                  {type.label}
                </h5>
                <div className="space-y-1">
                  {contentItems[type.value].slice(0, 4).map(item => {
                    const isSectionType = type.value === 'dashboard_sections' || type.value === 'landing_page';
                    const isVisible = isContentVisibleForPreview(
                      type.value,
                      !isSectionType ? item.id : undefined,
                      isSectionType ? item.id : undefined
                    );
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
                          isVisible ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-muted-foreground line-through'
                        }`}
                      >
                        {isVisible ? (
                          <Eye className="h-3 w-3 text-primary" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                  {contentItems[type.value].length > 4 && (
                    <p className="text-xs text-muted-foreground pl-2">
                      +{contentItems[type.value].length - 4} more...
                    </p>
                  )}
                  {contentItems[type.value].length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No items</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
