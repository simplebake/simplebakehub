import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Lightbulb, TrendingUp, Mail, Users, MousePointerClick, Repeat, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BakingTrendsChart } from "@/components/analytics/BakingTrendsChart";
import { SuccessRatingChart } from "@/components/analytics/SuccessRatingChart";
import { PopularPremixesChart } from "@/components/analytics/PopularPremixesChart";
import { EngagementMetrics } from "@/components/analytics/EngagementMetrics";

const Marketing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [contentTab, setContentTab] = useState("ideas");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  // Placeholder metrics
  const summaryMetrics = [
    { label: "Active Campaigns", value: "3", icon: Megaphone, trend: "+1 this week" },
    { label: "Traffic / Clicks", value: "1,247", icon: MousePointerClick, trend: "+12% vs last week" },
    { label: "Email Open Rate", value: "34%", icon: Mail, trend: "Above industry avg" },
    { label: "Repeat Customer Rate", value: "28%", icon: Repeat, trend: "+4% this month" },
  ];

  // Content engine data
  const contentIdeas = [
    { id: 1, title: "Autumn Baking Tips Blog Post", channel: "Blog", status: "idea", nextAction: "Outline content" },
    { id: 2, title: "Customer Success Story: Mary", channel: "Social", status: "idea", nextAction: "Reach out to customer" },
    { id: 3, title: "Gluten-Free Christmas Guide", channel: "Email", status: "idea", nextAction: "Plan structure" },
  ];

  const contentDrafts = [
    { id: 4, title: "Newsletter: October Recipes", channel: "Email", status: "draft", nextAction: "Final review" },
    { id: 5, title: "Instagram Reel: Quick Bread Tips", channel: "Social", status: "draft", nextAction: "Edit video" },
  ];

  const contentPublished = [
    { id: 6, title: "September Newsletter", channel: "Email", status: "published", nextAction: "Review metrics" },
    { id: 7, title: "Blog: 5 Common Mistakes", channel: "Blog", status: "published", nextAction: "Promote on social" },
  ];

  const getContentByTab = () => {
    switch (contentTab) {
      case "drafts": return contentDrafts;
      case "published": return contentPublished;
      default: return contentIdeas;
    }
  };

  // Campaigns data
  const campaigns = [
    { name: "Autumn Sale 2024", status: "active", channel: "Multi-channel", dates: "Oct 1 - Oct 31", kpi: "£2,400 revenue" },
    { name: "New Customer Welcome", status: "active", channel: "Email", dates: "Ongoing", kpi: "42% open rate" },
    { name: "Referral Programme", status: "active", channel: "In-app", dates: "Ongoing", kpi: "18 referrals" },
    { name: "Summer Flash Sale", status: "completed", channel: "Email + Social", dates: "Aug 1 - Aug 7", kpi: "£1,850 revenue" },
  ];

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
            <Button variant="outline" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Add content idea
            </Button>
            <Button className="gap-2">
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
                <TabsTrigger value="ideas">Ideas ({contentIdeas.length})</TabsTrigger>
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
                      <TableCell className="text-muted-foreground">{item.nextAction}</TableCell>
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
                {campaigns.map((campaign, index) => (
                  <TableRow key={index} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{campaign.channel}</TableCell>
                    <TableCell className="text-muted-foreground">{campaign.dates}</TableCell>
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
    </div>
  );
};

export default Marketing;
