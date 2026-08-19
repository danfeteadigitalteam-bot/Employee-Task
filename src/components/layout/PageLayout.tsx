import { type ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageLayout({ children, title, description, actions }: PageLayoutProps) {
  return (
    <div className="flex-1 w-full">
      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {(title || description || actions) && (
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border/70">
            <div className="min-w-0">
              {title && (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
