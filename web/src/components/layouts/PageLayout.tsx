import type { ReactNode } from "react";
import { Header } from "@/components/layouts/Header";
import { Footer } from "@/components/layouts/Footer";

interface Props {
  children: ReactNode;
  fullWidth?: boolean;
}

export function PageLayout({ children, fullWidth = false }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-white)",
      }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: fullWidth ? "none" : "1200px",
          margin: "0 auto",
          padding: fullWidth ? "0" : "0 1.5rem",
        }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
