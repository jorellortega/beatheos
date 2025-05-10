import { Button } from "@/components/ui/button"
import { Grid, List, Columns, Smartphone } from "lucide-react"

interface ViewSelectorProps {
  currentView: "grid" | "list" | "compact" | "vertical"
  onViewChange: (view: "grid" | "list" | "compact" | "vertical") => void
}

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex justify-center space-x-4 mb-8">
      <Button
        variant={currentView === "grid" ? "default" : "outline"}
        className={`gradient-button text-black font-medium hover:text-white ${currentView === "grid" ? "bg-primary" : ""}`}
        onClick={() => onViewChange("grid")}
      >
        <Grid className="mr-2 h-4 w-4" />
        Grid View
      </Button>
      <Button
        variant={currentView === "list" ? "default" : "outline"}
        className={`gradient-button text-black font-medium hover:text-white ${currentView === "list" ? "bg-primary" : ""}`}
        onClick={() => onViewChange("list")}
      >
        <List className="mr-2 h-4 w-4" />
        List View
      </Button>
      <Button
        variant={currentView === "compact" ? "default" : "outline"}
        className={`gradient-button text-black font-medium hover:text-white ${currentView === "compact" ? "bg-primary" : ""}`}
        onClick={() => onViewChange("compact")}
      >
        <Columns className="mr-2 h-4 w-4" />
        Compact View
      </Button>
      <Button
        variant={currentView === "vertical" ? "default" : "outline"}
        className={`gradient-button text-black font-medium hover:text-white ${currentView === "vertical" ? "bg-primary" : ""}`}
        onClick={() => onViewChange("vertical")}
      >
        <Smartphone className="mr-2 h-4 w-4" />
        Vertical View
      </Button>
    </div>
  )
}

