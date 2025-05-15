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
        variant="outline"
        className={"bg-black border border-gray-700 text-gray-400 font-medium transition hover:bg-gradient-to-r hover:from-yellow-300 hover:to-yellow-100 hover:text-black hover:font-bold"}
        onClick={() => onViewChange("grid")}
      >
        <Grid className={`h-4 w-4 ${currentView === "grid" ? "text-yellow-400" : ""}`} />
        <span className="hidden sm:inline ml-2">Grid View</span>
      </Button>
      <Button
        variant="outline"
        className={"bg-black border border-gray-700 text-gray-400 font-medium transition hover:bg-gradient-to-r hover:from-yellow-300 hover:to-yellow-100 hover:text-black hover:font-bold"}
        onClick={() => onViewChange("list")}
      >
        <List className={`h-4 w-4 ${currentView === "list" ? "text-yellow-400" : ""}`} />
        <span className="hidden sm:inline ml-2">List View</span>
      </Button>
      <Button
        variant="outline"
        className={"bg-black border border-gray-700 text-gray-400 font-medium transition hover:bg-gradient-to-r hover:from-yellow-300 hover:to-yellow-100 hover:text-black hover:font-bold"}
        onClick={() => onViewChange("compact")}
      >
        <Columns className={`h-4 w-4 ${currentView === "compact" ? "text-yellow-400" : ""}`} />
        <span className="hidden sm:inline ml-2">Compact View</span>
      </Button>
      <Button
        variant="outline"
        className="text-xs opacity-50 px-2 py-1 bg-black border border-gray-700 text-gray-400"
        style={{ pointerEvents: 'none' }}
        onClick={() => onViewChange("vertical")}
      >
        Other
      </Button>
    </div>
  )
}

