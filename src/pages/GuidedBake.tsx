import { useAuth } from "@/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SmartTipCard } from "@/components/SmartTipCard";
import { RelatedPremixes } from "@/components/RelatedPremixes";
import { TroubleshootingAlert } from "@/components/TroubleshootingAlert";

interface PremixStep {
  id: string;
  step_number: number;
  title: string;
  content: string;
}

interface Premix {
  id: string;
  name: string;
  description: string;
}

const GuidedBake = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [premix, setPremix] = useState<Premix | null>(null);
  const [steps, setSteps] = useState<PremixStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchPremixData();
    }
  }, [user, id]);

  const fetchPremixData = async () => {
    try {
      const { data: premixData, error: premixError } = await supabase
        .from("premixes")
        .select("id, name, description")
        .eq("id", id)
        .single();

      if (premixError) throw premixError;
      setPremix(premixData);

      const { data: stepsData, error: stepsError } = await supabase
        .from("premix_steps")
        .select("*")
        .eq("premix_id", id)
        .order("step_number");

      if (stepsError) throw stepsError;
      setSteps(stepsData || []);
    } catch (error: any) {
      toast.error("Failed to load baking instructions");
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !premix) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/premixes")}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Premixes
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{premix.name}</h1>
          <p className="text-muted-foreground mb-4">{premix.description}</p>
          
          {steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {steps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No steps available for this premix yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{steps[currentStep].title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{steps[currentStep].content}</p>
                </div>
              </CardContent>
            </Card>

            {/* Predictive Troubleshooting System */}
            <div className="mb-6">
              <TroubleshootingAlert
                premixName={premix.name}
                stepTitle={steps[currentStep].title}
                stepContent={steps[currentStep].content}
                stepNumber={currentStep + 1}
                totalSteps={steps.length}
              />
            </div>

            {/* Smart Tip for current step */}
            <div className="mb-6">
              <SmartTipCard 
                context="guided_bake" 
                premixName={premix.name}
                stepTitle={steps[currentStep].title}
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Step
              </Button>
              
              {currentStep === steps.length - 1 ? (
                <Button onClick={() => navigate("/share")}>
                  Share Your Bake! →
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next Step
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>

            {/* Show related premixes on last step */}
            {currentStep === steps.length - 1 && (
              <div className="mt-12">
                <RelatedPremixes currentPremixId={id} limit={3} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default GuidedBake;
