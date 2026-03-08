import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

interface BakeTimerProps {
  durationMinutes: number;
  label: string;
  onComplete?: () => void;
}

const BakeTimer = ({ durationMinutes, label, onComplete }: BakeTimerProps) => {
  const totalSeconds = durationMinutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(
    () => "Notification" in window && Notification.permission === "granted"
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleNotify = () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setNotifyEnabled((v) => !v);
    } else {
      Notification.requestPermission().then((p) => {
        setNotifyEnabled(p === "granted");
      });
    }
  };

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            onComplete?.();
            if (notifyEnabled) {
              sendNotification("Timer Complete! ⏰", `${label} is done. Time to check your bread!`);
            }
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining, onComplete, notifyEnabled, label]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = ((totalSeconds - remaining) / totalSeconds) * 100;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{label}</p>

      <div className="flex items-center justify-center">
        <div className="relative h-36 w-36">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-mono font-bold text-foreground">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            setRunning(!running);
            if (!running) requestNotificationPermission();
          }}
          className="gap-1.5"
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setRunning(false); setRemaining(totalSeconds); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={toggleNotify}>
          {notifyEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </Button>
      </div>

      {remaining === 0 && (
        <p className="text-center text-sm font-medium text-primary">
          ✓ Time's up!
        </p>
      )}
    </div>
  );
};

export default BakeTimer;
