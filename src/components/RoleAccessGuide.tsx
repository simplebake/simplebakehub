import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Crown, Shield, User, HeadphonesIcon } from 'lucide-react';

interface FeatureAccess {
  feature: string;
  admin: boolean;
  moderator: boolean;
  support: boolean;
  user: boolean;
}

const featureAccess: FeatureAccess[] = [
  { feature: 'View Dashboard', admin: true, moderator: true, support: true, user: true },
  { feature: 'View Premixes & Tutorials', admin: true, moderator: true, support: true, user: true },
  { feature: 'Start Guided Bakes', admin: true, moderator: true, support: true, user: true },
  { feature: 'Track Baking History', admin: true, moderator: true, support: true, user: true },
  { feature: 'Share Bakes', admin: true, moderator: true, support: true, user: true },
  { feature: 'Contact Support', admin: true, moderator: true, support: true, user: true },
  { feature: 'View Customer Messages', admin: true, moderator: true, support: false, user: false },
  { feature: 'Respond to Messages', admin: true, moderator: true, support: false, user: false },
  { feature: 'Delete Customer Messages', admin: true, moderator: false, support: false, user: false },
  { feature: 'Manage Tutorials', admin: true, moderator: false, support: true, user: false },
  { feature: 'View Audit Logs', admin: true, moderator: false, support: false, user: false },
  { feature: 'Manage User Roles', admin: true, moderator: false, support: false, user: false },
  { feature: 'Block/Unblock IPs', admin: true, moderator: false, support: false, user: false },
  { feature: 'View Security Dashboard', admin: true, moderator: false, support: false, user: false },
  { feature: 'Manage Premixes', admin: true, moderator: false, support: false, user: false },
];

const AccessIcon = ({ hasAccess }: { hasAccess: boolean }) => (
  hasAccess ? (
    <Check className="h-4 w-4 text-green-600" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/50" />
  )
);

export const RoleAccessGuide = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Role Access Guide
        </CardTitle>
        <CardDescription>
          Overview of what each user role can access in the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Descriptions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-primary" />
              <Badge variant="default">Admin</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Full access to all features including user management, security settings, and content administration.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">Moderator</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Can view and respond to customer messages. Cannot access security or user management.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <HeadphonesIcon className="h-4 w-4 text-green-500" />
              <Badge variant="secondary" className="bg-green-100 text-green-700">Support</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Can manage tutorials and content. No access to customer messages or security features.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">User</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Standard access to baking features, tutorials, and personal profile management.
            </p>
          </div>
        </div>

        {/* Access Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3" />
                  Admin
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Shield className="h-3 w-3" />
                  Moderator
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <HeadphonesIcon className="h-3 w-3" />
                  Support
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <User className="h-3 w-3" />
                  User
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureAccess.map((item) => (
              <TableRow key={item.feature}>
                <TableCell className="font-medium">{item.feature}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <AccessIcon hasAccess={item.admin} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <AccessIcon hasAccess={item.moderator} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <AccessIcon hasAccess={item.support} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <AccessIcon hasAccess={item.user} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
