import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Bell } from "lucide-react";

interface BakeTimerProps {
  defaultMinutes?: number;
  label?: string;
  onComplete?: () => void;
}

export const BakeTimer = ({ defaultMinutes = 25, label = "Bake Timer", onComplete }: BakeTimerProps) => {
  const [totalSeconds, setTotalSeconds] = useState(defaultMinutes * 60);
  const [remaining, setRemaining] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [inputMinutes, setInputMinutes] = useState(String(defaultMinutes));
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    const mins = Math.max(1, parseInt(inputMinutes) || defaultMinutes);
    setTotalSeconds(mins * 60);
    setRemaining(mins * 60);
  }, [inputMinutes, defaultMinutes]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, onComplete]);

  const handleSetTime = () => {
    const mins = Math.max(1, parseInt(inputMinutes) || defaultMinutes);
    setInputMinutes(String(mins));
    setTotalSeconds(mins * 60);
    setRemaining(mins * 60);
    setRunning(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-accent" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Circular progress */}
        <div className="flex justify-center">
          <div className="relative h-36 w-36">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                stroke={remaining === 0 ? "hsl(var(--success))" : "hsl(var(--primary))"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-bold text-foreground">{formatTime(remaining)}</span>
              {remaining === 0 && <span className="text-xs font-medium text-success">Done!</span>}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {!running ? (
            <Button size="sm" onClick={start} disabled={remaining === 0}>
              <Play className="mr-1 h-4 w-4" /> Start
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={pause}>
              <Pause className="mr-1 h-4 w-4" /> Pause
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
        </div>

        {/* Set time */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={inputMinutes}
            onChange={(e) => setInputMinutes(e.target.value)}
            className="w-20 text-center"
            disabled={running}
          />
          <span className="text-sm text-muted-foreground">min</span>
          <Button size="sm" variant="ghost" onClick={handleSetTime} disabled={running}>
            Set
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
