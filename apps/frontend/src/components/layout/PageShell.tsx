import { PropsWithChildren } from 'react';

export function PageShell({ children }: PropsWithChildren) {
  return <main className="container">{children}</main>;
}
