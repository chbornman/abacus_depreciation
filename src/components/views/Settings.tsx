import { Minus, Plus, RotateCcw, Monitor, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CategoryManagement } from "./CategoryManagement";

type Theme = "light" | "dark" | "system";

interface SettingsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onCategoriesChange?: () => void;
}

const MIN_SCALE = 0.75;
const MAX_SCALE = 2;
const SCALE_INCREMENT = 0.1;

export function Settings({ scale, onScaleChange, theme, onThemeChange, onCategoriesChange }: SettingsProps) {
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
        <p className="text-muted-foreground">
          Customize your application preferences
        </p>
      </div>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Display</CardTitle>
              <CardDescription>Adjust the interface scale and appearance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* UI Scale and Keyboard Shortcuts Row */}
          <div className="flex items-start gap-8">
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
                  <span className="text-2xl font-bold text-primary">
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

            {/* Keyboard Shortcuts */}
            <div className="space-y-4">
              <div className="font-medium">Keyboard Shortcuts</div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground">Zoom In</span>
                  <div className="flex items-center gap-1">
                    <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">+</kbd>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground">Zoom Out</span>
                  <div className="flex items-center gap-1">
                    <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">-</kbd>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground">Reset</span>
                  <div className="flex items-center gap-1">
                    <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="rounded bg-muted px-2 py-0.5 font-mono text-xs">0</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Theme */}
          <div className="space-y-4">
            <div className="font-medium">Theme</div>
            <div className="flex gap-3">
              <button
                onClick={() => onThemeChange("light")}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  theme === "light"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Sun className={cn(
                  "h-6 w-6",
                  theme === "light" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  theme === "light" ? "text-primary" : "text-muted-foreground"
                )}>Light</span>
              </button>
              <button
                onClick={() => onThemeChange("system")}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  theme === "system"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Monitor className={cn(
                  "h-6 w-6",
                  theme === "system" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  theme === "system" ? "text-primary" : "text-muted-foreground"
                )}>System</span>
              </button>
              <button
                onClick={() => onThemeChange("dark")}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                  theme === "dark"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Moon className={cn(
                  "h-6 w-6",
                  theme === "dark" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  theme === "dark" ? "text-primary" : "text-muted-foreground"
                )}>Dark</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <CategoryManagement onCategoriesChange={onCategoriesChange} />

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <img
              src="/logo-black-minimal.svg"
              alt="Abacus"
              className="h-12 w-12 dark:hidden"
            />
            <img
              src="/logo-white-minimal.svg"
              alt="Abacus"
              className="h-12 w-12 hidden dark:block"
            />
            <div>
              <div className="font-bold tracking-widest">ABACUS</div>
              <div className="text-sm text-muted-foreground">
                Depreciation Tracker v0.1.0
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
