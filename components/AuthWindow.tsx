import { AuthForm } from "./AuthForm"

interface AuthWindowProps {
  onClose: () => void
  onSuccess: () => void
}

export function AuthWindow({ onClose, onSuccess }: AuthWindowProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background p-8 rounded-lg max-w-md w-full">
        <AuthForm onSuccess={onSuccess} />
        <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

