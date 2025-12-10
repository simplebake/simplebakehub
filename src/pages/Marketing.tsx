import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Users, Mail, TrendingUp, Gift, Target, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { BakingTrendsChart } from "@/components/analytics/BakingTrendsChart";
import { SuccessRatingChart } from "@/components/analytics/SuccessRatingChart";
import { PopularPremixesChart } from "@/components/analytics/PopularPremixesChart";
import { EngagementMetrics } from "@/components/analytics/EngagementMetrics";

const Marketing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const marketingFeatures = [
    {
      title: "Email Campaigns",
      description: "Create and manage email communications with your customers",
      icon: Mail,
    },
    {
      title: "Promotions",
      description: "Set up discounts, bundles, and special offers",
      icon: Gift,
    },
    {
      title: "Targeting",
      description: "Segment customers for personalised marketing",
      icon: Target,
    },
    {
      title: "Campaigns",
      description: "Plan and execute marketing campaigns",
      icon: Megaphone,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Marketing & Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships and marketing activities
          </p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <EngagementMetrics />
            
            <div className="grid gap-6 lg:grid-cols-2">
              <BakingTrendsChart />
              <SuccessRatingChart />
            </div>

            <PopularPremixesChart />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Insights
                </CardTitle>
                <CardDescription>
                  View baking patterns, preferences, and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Customer segmentation and detailed insights are coming soon. 
                  Check the Analytics tab for current engagement data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {marketingFeatures.map((feature) => (
                <Card key={feature.title} className="hover:shadow-lg transition-shadow cursor-pointer opacity-75">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <span className="text-xs text-muted-foreground">Coming soon</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Marketing;
