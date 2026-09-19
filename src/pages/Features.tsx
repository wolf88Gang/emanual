import { useLanguage } from '@/contexts/LanguageContext';
import { Seo } from '@/components/Seo';
import { landingCopy, type LandingLanguage } from '@/components/landing/copy';
import { PricingSection } from '@/components/landing/PricingSection';
import {
  AudienceSection, CapabilitiesSection, ConnectedDataSection, DifferentiatorsSection,
  FaqSection, FinalCtaSection, HeroSection, HowItWorksSection, LandingFooter,
  LandingNavbar, OperationalVisibilitySection, ProblemSection, TrustSection,
} from '@/components/landing/LandingSections';

export default function Features() {
  const { language } = useLanguage();
  const currentLanguage: LandingLanguage = language === 'es' ? 'es' : language === 'de' ? 'de' : 'en';
  const copy = landingCopy[currentLanguage];

  return (
    <main className="homeguide-landing landing-canvas min-h-screen overflow-x-hidden bg-background text-foreground">
      <Seo title="Home Guide | Property operations, documented" description={copy.hero.body} path="/" image="https://homeguide.casa/images/og-share.jpg" />
      <LandingNavbar copy={copy.nav} />
      <HeroSection copy={copy.hero} />
      <ProblemSection copy={copy.problem} />
      <HowItWorksSection copy={copy.how} />
      <ConnectedDataSection copy={copy.connected} />
      <AudienceSection copy={copy.audience} />
      <OperationalVisibilitySection copy={copy.visibility} />
      <CapabilitiesSection copy={copy.capabilities} />
      <DifferentiatorsSection copy={copy.differences} />
      <TrustSection copy={copy.trust} />
      <PricingSection copy={copy.pricing} language={currentLanguage} />
      <FaqSection copy={copy.faq} />
      <FinalCtaSection copy={copy.final} />
      <LandingFooter copy={copy} />
    </main>
  );
}
