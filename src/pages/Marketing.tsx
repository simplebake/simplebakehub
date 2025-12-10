import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Users, Mail, TrendingUp, Gift, Target } from "lucide-react";
import { useAuth } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

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
      title: "Customer Insights",
      description: "View baking patterns, preferences, and engagement metrics",
      icon: Users,
    },
    {
      title: "Email Campaigns",
      description: "Create and manage email communications with your customers",
      icon: Mail,
    },
    {
      title: "Analytics",
      description: "Track sales trends, popular products, and conversion rates",
      icon: TrendingUp,
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {marketingFeatures.map((feature) => (
            <Card key={feature.title} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              These marketing tools are being developed to help you grow your baking business.
              Check back soon for updates!
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
};

export default Marketing;
