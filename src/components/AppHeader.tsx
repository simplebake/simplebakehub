import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
}

const AppHeader = ({ title, showBack = true }: AppHeaderProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 mb-6">
      {showBack && (
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    </div>
  );
};

export default AppHeader;
