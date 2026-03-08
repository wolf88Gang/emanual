import React, { ReactNode } from 'react';

// ModernAppLayout is now a passthrough — layout is handled by SidebarLayout at the route level
export function ModernAppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
