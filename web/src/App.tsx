import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { AnnonceursPage } from "@/pages/AnnonceursPage";
import { AnnonceursEspacePage } from "@/pages/AnnonceursEspacePage";
import { MePage } from "@/pages/MePage";
import { FaqPage } from "@/pages/FaqPage";
import { CguPage } from "@/pages/CguPage";
import { ConfidentialitePage } from "@/pages/ConfidentialitePage";
import { CgvAnnonceursPage } from "@/pages/CgvAnnonceursPage";
import { MentionsLegalesPage } from "@/pages/MentionsLegalesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/annonceurs" element={<AnnonceursPage />} />
        <Route path="/annonceurs/espace" element={<AnnonceursEspacePage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/cgu" element={<CguPage />} />
        <Route path="/confidentialite" element={<ConfidentialitePage />} />
        <Route path="/cgv-annonceurs" element={<CgvAnnonceursPage />} />
        <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
      </Routes>
    </BrowserRouter>
  );
}
