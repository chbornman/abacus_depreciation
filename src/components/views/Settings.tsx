import { Minus, Plus, RotateCcw, Monitor } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SettingsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
}

const MIN_SCALE = 0.75;
const MAX_SCALE = 2;
const SCALE_INCREMENT = 0.1;

export function Settings({ scale, onScaleChange }: SettingsProps) {
  const handleZoomIn = () => {
    const newScale = Math.min(MAX_SCALE, Math.round((scale + SCALE_INCREMENT) * 100) / 100);
    onScaleChange(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(MIN_SCALE, Math.round((scale - SCALE_INCREMENT) * 100) / 100);
    onScaleChange(newScale);
  };

  const handleReset = () => {
    onScaleChange(1);
  };

  const scalePercent = Math.round(scale * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          Customize your application preferences
        </p>
      </div>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
              <Monitor className="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <CardTitle>Display</CardTitle>
              <CardDescription>Adjust the interface scale and appearance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* UI Scale */}
          <div className="space-y-4">
            <div className="font-medium">Interface Scale</div>

            {/* Simple Scale Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <div className="min-w-[80px] text-center">
                <span className="text-2xl font-bold text-[hsl(var(--primary))]">
                  {scalePercent}%
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={scale === 1}
                className="gap-2 ml-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          <Separator />

          {/* Keyboard Shortcuts Info */}
          <div className="space-y-3">
            <div className="font-medium">Keyboard Shortcuts</div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted))]/50 px-3 py-2">
                <span className="text-[hsl(var(--muted-foreground))]">Zoom In</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-xs">
                    Ctrl
                  </kbd>
                  <span>+</span>
                  <kbd className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-xs">
                    +
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted))]/50 px-3 py-2">
                <span className="text-[hsl(var(--muted-foreground))]">Zoom Out</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-xs">
                    Ctrl
                  </kbd>
                  <span>+</span>
                  <kbd className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-xs">
                    -
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--muted))]/50 px-3 py-2">
                <span className="text-[hsl(var(--muted-foreground))]">Reset Zoom</span>
                <div className="flex items-center gap-1">
                  <kbd className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-xs">
                    Ctrl
                  </kbd>
                  <span>+</span>
                  <kbd className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-xs">
                    0
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <img src="/logo-black-minimal.svg" alt="Abacus" className="h-12 w-12" />
            <div>
              <div className="font-bold tracking-widest">ABACUS</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Depreciation Tracker v0.1.0
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
