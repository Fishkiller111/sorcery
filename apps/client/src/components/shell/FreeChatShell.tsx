import React from 'react';
import { ShellLayout } from './ShellLayout';

interface FreeChatShellProps {
  children: React.ReactNode;
}

/** @deprecated Use ShellLayout directly — kept for existing page imports. */
export function FreeChatShell({ children }: FreeChatShellProps) {
  return (
    <ShellLayout scrollable={false} showLangToggle={false}>
      {children}
    </ShellLayout>
  );
}
