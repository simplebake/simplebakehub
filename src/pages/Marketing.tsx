import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Plus, Lightbulb, TrendingUp, Mail, Users, MousePointerClick, Repeat, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { BakingTrendsChart } from "@/components/analytics/BakingTrendsChart";
import { SuccessRatingChart } from "@/components/analytics/SuccessRatingChart";
import { PopularPremixesChart } from "@/components/analytics/PopularPremixesChart";
import { EngagementMetrics } from "@/components/analytics/EngagementMetrics";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ContentItem {
  id: string;
  title: string;
  channel: string;
  status: string;
  next_action: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  start_date: string;
  end_date: string;
  kpi: string;
}

const Marketing = () => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [contentTab, setContentTab] = useState("ideas");
  
  // Dialog states
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  
  // Form states for content idea
  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentChannel, setNewContentChannel] = useState("");
  const [newContentNextAction, setNewContentNextAction] = useState("");
  
  // Form states for campaign
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignChannel, setNewCampaignChannel] = useState("");
  const [newCampaignStartDate, setNewCampaignStartDate] = useState("");
  const [newCampaignEndDate, setNewCampaignEndDate] = useState("");
  const [newCampaignKpi, setNewCampaignKpi] = useState("");

  // Fetch content ideas from database
  const { data: contentIdeas = [] } = useQuery({
    queryKey: ['content-ideas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_ideas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContentItem[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch campaigns from database
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user && isAdmin,
  });

  // Mutations
  const addContentIdeaMutation = useMutation({
    mutationFn: async (newIdea: { title: string; channel: string; next_action: string }) => {
      const { data, error } = await supabase
        .from('content_ideas')
        .insert({
          user_id: user!.id,
          title: newIdea.title,
          channel: newIdea.channel,
          next_action: newIdea.next_action,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-ideas'] });
    },
  });

  const addCampaignMutation = useMutation({
    mutationFn: async (newCampaign: { name: string; channel: string; start_date: string; end_date: string; kpi: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user!.id,
          name: newCampaign.name,
          channel: newCampaign.channel,
          start_date: newCampaign.start_date,
          end_date: newCampaign.end_date,
          kpi: newCampaign.kpi,
          status: 'planning',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, loading, isAdmin, roleLoading, navigate]);

  const handleAddContentIdea = async () => {
    if (!newContentTitle.trim() || !newContentChannel || !newContentNextAction.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await addContentIdeaMutation.mutateAsync({
        title: newContentTitle.trim(),
        channel: newContentChannel,
        next_action: newContentNextAction.trim(),
      });
      
      setNewContentTitle("");
      setNewContentChannel("");
      setNewContentNextAction("");
      setContentDialogOpen(false);
      
      toast({
        title: "Content idea added",
        description: `"${newContentTitle}" has been added to your ideas`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add content idea",
        variant: "destructive",
      });
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim() || !newCampaignChannel || !newCampaignStartDate || !newCampaignEndDate || !newCampaignKpi.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await addCampaignMutation.mutateAsync({
        name: newCampaignName.trim(),
        channel: newCampaignChannel,
        start_date: newCampaignStartDate,
        end_date: newCampaignEndDate,
        kpi: newCampaignKpi.trim(),
      });
      
      setNewCampaignName("");
      setNewCampaignChannel("");
      setNewCampaignStartDate("");
      setNewCampaignEndDate("");
      setNewCampaignKpi("");
      setCampaignDialogOpen(false);
      
      toast({
        title: "Campaign created",
        description: `"${newCampaignName}" has been added`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;


  // Filter content by status
  const contentDrafts = contentIdeas.filter(item => item.status === 'draft');
  const contentPublished = contentIdeas.filter(item => item.status === 'published');
  const contentIdeasOnly = contentIdeas.filter(item => item.status === 'idea');

  // Placeholder metrics
  const summaryMetrics = [
    { label: "Active Campaigns", value: String(campaigns.filter(c => c.status === "active").length), icon: Megaphone, trend: "+1 this week" },
    { label: "Traffic / Clicks", value: "1,247", icon: MousePointerClick, trend: "+12% vs last week" },
    { label: "Email Open Rate", value: "34%", icon: Mail, trend: "Above industry avg" },
    { label: "Repeat Customer Rate", value: "28%", icon: Repeat, trend: "+4% this month" },
  ];

  const getContentByTab = () => {
    switch (contentTab) {
      case "drafts": return contentDrafts;
      case "published": return contentPublished;
      default: return contentIdeasOnly;
    }
  };

  // Funnel data
  const funnelSteps = [
    { stage: "Awareness", value: 4200, percentage: 100 },
    { stage: "Visit", value: 1247, percentage: 30 },
    { stage: "Add to Cart", value: 312, percentage: 7.4 },
    { stage: "Purchase", value: 89, percentage: 2.1 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "idea":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Idea</Badge>;
      case "published":
        return <Badge className="bg-success/10 text-success border-success/20">Published</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Marketing & Customers</h1>
            <p className="text-muted-foreground mt-1">
              Manage campaigns, content, and customer engagement
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setContentDialogOpen(true)}>
              <Lightbulb className="h-4 w-4" />
              Add content idea
            </Button>
            <Button className="gap-2" onClick={() => setCampaignDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create campaign
            </Button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryMetrics.map((metric) => (
            <Card key={metric.label} className="bg-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                    <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.trend}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <metric.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Engine */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Content Engine</CardTitle>
            <CardDescription>Manage your content pipeline from idea to publication</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={contentTab} onValueChange={setContentTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="ideas">Ideas ({contentIdeasOnly.length})</TabsTrigger>
                <TabsTrigger value="drafts">Drafts ({contentDrafts.length})</TabsTrigger>
                <TabsTrigger value="published">Published ({contentPublished.length})</TabsTrigger>
              </TabsList>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getContentByTab().map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.channel}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.next_action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Tabs>
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Campaigns</CardTitle>
            <CardDescription>Track and manage your marketing campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Primary KPI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{campaign.channel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {campaign.start_date === campaign.end_date 
                        ? campaign.start_date 
                        : `${campaign.start_date} - ${campaign.end_date}`}
                    </TableCell>
                    <TableCell>{campaign.kpi}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Funnels */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Customer Funnel</CardTitle>
            <CardDescription>Conversion flow from awareness to purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              {funnelSteps.map((step, index) => (
                <div key={step.stage} className="flex-1 flex items-center">
                  <div className="flex-1 p-4 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-sm text-muted-foreground mb-1">{step.stage}</p>
                    <p className="text-xl font-semibold text-foreground">{step.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{step.percentage}%</p>
                  </div>
                  {index < funnelSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-2 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Customer Analytics</h2>
          <EngagementMetrics />
          <div className="grid gap-6 lg:grid-cols-2">
            <BakingTrendsChart />
            <SuccessRatingChart />
          </div>
          <PopularPremixesChart />
        </div>
      </main>

      {/* Add Content Idea Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Content Idea</DialogTitle>
            <DialogDescription>
              Create a new content idea to add to your pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="content-title">Title</Label>
              <Input
                id="content-title"
                placeholder="e.g., Holiday Baking Tips Blog Post"
                value={newContentTitle}
                onChange={(e) => setNewContentTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content-channel">Channel</Label>
              <Select value={newContentChannel} onValueChange={setNewContentChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blog">Blog</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Social">Social</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content-next-action">Next Action</Label>
              <Input
                id="content-next-action"
                placeholder="e.g., Outline content"
                value={newContentNextAction}
                onChange={(e) => setNewContentNextAction(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContentIdea}>
              Add Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Set up a new marketing campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Winter Holiday Sale"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-channel">Channel</Label>
              <Select value={newCampaignChannel} onValueChange={setNewCampaignChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Social">Social</SelectItem>
                  <SelectItem value="Multi-channel">Multi-channel</SelectItem>
                  <SelectItem value="In-app">In-app</SelectItem>
                  <SelectItem value="Email + Social">Email + Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-start-date">Start Date</Label>
              <Input
                id="campaign-start-date"
                type="date"
                value={newCampaignStartDate}
                onChange={(e) => setNewCampaignStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-end-date">End Date</Label>
              <Input
                id="campaign-end-date"
                type="date"
                value={newCampaignEndDate}
                onChange={(e) => setNewCampaignEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-kpi">Primary KPI</Label>
              <Input
                id="campaign-kpi"
                placeholder="e.g., £5,000 revenue or 50% open rate"
                value={newCampaignKpi}
                onChange={(e) => setNewCampaignKpi(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign}>
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketing;
