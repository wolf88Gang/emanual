import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const errorCopy = {
  en: {
    eyebrow: "Route not found",
    title: "This path does not lead anywhere yet.",
    body: "The page may have moved, changed its address, or no longer be available.",
    home: "Go to Home Guide",
    back: "Go back",
    code: "Error 404",
  },
  es: {
    eyebrow: "Ruta no encontrada",
    title: "Este camino todavía no lleva a ningún lugar.",
    body: "Es posible que la página se haya movido, cambiado de dirección o ya no esté disponible.",
    home: "Ir a Home Guide",
    back: "Volver atrás",
    code: "Error 404",
  },
  de: {
    eyebrow: "Seite nicht gefunden",
    title: "Dieser Weg führt noch nirgendwohin.",
    body: "Die Seite wurde möglicherweise verschoben, umbenannt oder ist nicht mehr verfügbar.",
    home: "Zu Home Guide",
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
      <header className="error-header">
        <Link to="/" className="landing-brand" aria-label="Home Guide">
          <img src="/images/hg-logo.png" alt="" />
          <span>Home Guide</span>
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
        <span>HOME GUIDE</span>
        <span>OPERATIONS CONNECTED TO PLACE</span>
      </footer>
    </main>
  );
};

export default NotFound;
