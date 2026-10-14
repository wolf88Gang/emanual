import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { useLanguage } from "@/contexts/LanguageContext";

const errorCopy = {
  en: {
    eyebrow: "Page not found",
    title: "We could not find this page.",
    body: "The page may have moved, changed its address, or no longer be available.",
    home: "Back to home",
    back: "Go back",
    code: "Error 404",
  },
  es: {
    eyebrow: "Página no encontrada",
    title: "No encontramos esta página.",
    body: "Es posible que la página se haya movido, cambiado de dirección o ya no esté disponible.",
    home: "Volver al inicio",
    back: "Volver atrás",
    code: "Error 404",
  },
  de: {
    eyebrow: "Seite nicht gefunden",
    title: "Diese Seite wurde nicht gefunden.",
    body: "Die Seite wurde möglicherweise verschoben, umbenannt oder ist nicht mehr verfügbar.",
    home: "Zur Startseite",
    back: "Zurück",
    code: "Fehler 404",
  },
} as const;

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const copy = errorCopy[language];

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="homeguide-landing error-page min-h-screen overflow-hidden bg-background text-foreground">
      <Seo title={`${copy.eyebrow} — HomeGuide`} description={copy.body} path={location.pathname} />
      <header className="error-header">
        <Link to="/" className="landing-brand" aria-label="HomeGuide">
          <img src="/images/hg-logo.png" alt="" />
          <span>HomeGuide</span>
        </Link>
        <span>{copy.code}</span>
      </header>

      <section className="error-content" aria-labelledby="error-title">
        <div className="error-topography" aria-hidden="true"><span /><span /><span /></div>
        <div className="error-number" aria-hidden="true">404</div>
        <div className="error-copy">
          <p className="landing-eyebrow">{copy.eyebrow}</p>
          <h1 id="error-title">{copy.title}</h1>
          <p>{copy.body}</p>
          <div className="error-actions">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/">{copy.home}<ArrowRight /></Link>
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft />{copy.back}
            </Button>
          </div>
        </div>
      </section>

      <footer className="error-footer">
        <span>HomeGuide</span>
        <span>{language === "es" ? "Qué necesita cada propiedad, qué se hizo y qué sigue." : language === "de" ? "Was jede Immobilie braucht, was erledigt wurde und was als Nächstes ansteht." : "What each property needs, what was done and what comes next."}</span>
      </footer>
    </main>
  );
};

export default NotFound;
