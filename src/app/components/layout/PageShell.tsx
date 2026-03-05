import { NavBar } from './NavBar';

export const PageShell = ({ children }: { children: React.ReactNode }) => (
  <>
    <NavBar />
    <main className="container">{children}</main>
  </>
);
