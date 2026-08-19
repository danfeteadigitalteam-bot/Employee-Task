import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppFrameProps {
  src: string;
  title: string;
}

export function AppFrame({ src, title }: AppFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <div className="flex items-center justify-between border-b bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/")}
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-medium text-foreground">{title}</h1>
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Full Screen
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="flex-1 relative bg-white">
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <p className="text-sm text-muted-foreground">
              Unable to load {title}. The application may not support being embedded.
            </p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Open {title} in a new tab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <iframe
            src={src}
            title={title}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            allow="clipboard-write; clipboard-read"
          />
        )}
      </div>
    </div>
  );
}
