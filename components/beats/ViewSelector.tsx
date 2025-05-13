import { Button } from "@/components/ui/button"
import { Grid, List, Columns, Smartphone } from "lucide-react"

interface ViewSelectorProps {
  currentView: "grid" | "list" | "compact" | "vertical"
  onViewChange: (view: "grid" | "list" | "compact" | "vertical") => void
}

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex justify-center space-x-4">
      <Button
        variant={currentView === "grid" ? "default" : "outline"}
        className={`gradient-button text-black font-medium hover:text-white ${currentView === "grid" ? "bg-primary" : ""}`}
        onClick={() => onViewChange("grid")}
      >
        <Grid className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">Grid View</span>
      </Button>
      <Button
        variant={currentView === "list" ? "default" : "outline"}
        className={`gradient-button text-black font-medium hover:text-white ${currentView === "list" ? "bg-primary" : ""}`}
        onClick={() => onViewChange("list")}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">List View</span>
      </Button>
      <Button
        variant={currentView === "compact" ? "default" : "outline"}
        className={`gradient-button text-black font-medium hover:text-white ${currentView === "compact" ? "bg-primary" : ""}`}
        onClick={() => onViewChange("compact")}
      >
        <Columns className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">Compact View</span>
      </Button>
      <Button
        variant={currentView === "vertical" ? "default" : "outline"}
        className={`text-xs opacity-50 px-2 py-1 ${currentView === "vertical" ? "bg-primary" : ""}`}
        style={{ pointerEvents: 'none' }}
        onClick={() => onViewChange("vertical")}
      >
        Other
      </Button>
    </div>
  )
}

