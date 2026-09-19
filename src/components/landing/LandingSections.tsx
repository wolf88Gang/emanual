import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Camera, CheckCircle2, ChevronDown, ClipboardCheck, FileText, Leaf, Lock, MapPinned, Menu, PackageCheck, QrCode, ShieldCheck, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguagePicker } from '@/components/LanguagePicker';
import { HGReveal, HGStaggerGroup, HGTextReveal, LandingSectionHeading } from './motion';
import type { landingCopy, LandingLanguage } from './copy';

type Copy = (typeof landingCopy)[LandingLanguage];
const problemIcons = [FileText, ClipboardCheck, Users];
const stepIcons = [Building2, ClipboardCheck, Camera, FileText];
const capabilityIcons = [MapPinned, ClipboardCheck, QrCode, Leaf, PackageCheck, FileText];
const trustIcons = [Users, Lock, ShieldCheck];

export function LandingNavbar({ copy }: { copy: Copy['nav'] }) {
  const [open, setOpen] = useState(false);
  const links = [[copy.how, '#how-it-works'], [copy.visibility, '#visibility'], [copy.capabilities, '#capabilities'], [copy.pricing, '#pricing']];
  return <header className="landing-nav-wrap">
    <div className="landing-nav">
      <Link to="/" className="landing-brand" aria-label="Home Guide"><img src="/images/hg-logo.png" alt="" /><span>Home Guide</span></Link>
      <nav className="landing-nav-links" aria-label="Main navigation">{links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
      <div className="landing-nav-actions"><LanguagePicker /><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">{copy.signIn}</Link></Button><Button asChild size="sm" className="hidden xs:inline-flex"><Link to="/auth?mode=signup">{copy.create}</Link></Button><Button variant="ghost" size="icon" className="lg:hidden" aria-label={copy.menu} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</Button></div>
    </div>
    {open && <nav className="landing-mobile-nav" aria-label="Mobile navigation">{links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}<Link to="/auth">{copy.signIn}</Link><Link to="/auth?mode=signup">{copy.create}</Link></nav>}
  </header>;
}

export function HeroSection({ copy }: { copy: Copy['hero'] }) {
  return <section className="landing-hero" aria-labelledby="landing-hero-title">
    <img src="/images/estate_guide_4.jpg" alt={copy.imageAlt} width="1920" height="1080" decoding="async" className="landing-hero-image" />
    <div className="landing-hero-overlay" /><div className="landing-topography" aria-hidden="true"><span /><span /><span /></div>
    <div className="landing-shell landing-hero-inner">
      <div className="landing-hero-copy"><HGReveal direction="none" duration={520}><p className="landing-eyebrow text-primary-foreground/80">{copy.eyebrow}</p></HGReveal><HGTextReveal as="h1" delay={60} duration={880} className="landing-hero-title" >{copy.title}</HGTextReveal><HGReveal delay={160}><p className="landing-hero-body">{copy.body}</p></HGReveal><HGReveal delay={230}><p className="landing-hero-support">{copy.support}</p></HGReveal><HGReveal delay={300}><div className="landing-hero-actions"><Button asChild size="lg" className="bg-background text-foreground hover:bg-secondary"><Link to="/auth?mode=signup">{copy.primary}<ArrowRight /></Link></Button><Button asChild size="lg" variant="outline" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><a href="#how-it-works">{copy.secondary}</a></Button></div></HGReveal></div>
    </div>
  </section>;
}

export function ProblemSection({ copy }: { copy: Copy['problem'] }) {
  return <section className="landing-section numbered-section" aria-labelledby="problem-title"><span className="section-watermark" aria-hidden="true">01</span><div className="landing-shell editorial-split"><div className="editorial-sticky"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} /></div><HGStaggerGroup className="editorial-rows" startDelay={80} step={120} direction="right">{copy.rows.map(([title, body], index) => { const Icon = problemIcons[index]; return <article className="editorial-row" key={title}><span className="editorial-index">0{index + 1}</span><span className="editorial-icon"><Icon /></span><div><h3>{title}</h3><p>{body}</p></div></article>; })}</HGStaggerGroup></div></section>;
}

export function HowItWorksSection({ copy }: { copy: Copy['how'] }) {
  return <section id="how-it-works" className="landing-section scroll-mt-28 numbered-section" aria-labelledby="how-title"><span className="section-watermark section-watermark-right" aria-hidden="true">02</span><div className="landing-shell how-grid"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} className="how-heading" /><HGStaggerGroup className="timeline" startDelay={80} step={130}>{copy.steps.map(([title, body], index) => { const Icon = stepIcons[index]; return <article className="timeline-step" key={title}><div className="timeline-marker"><Icon /></div><div className="timeline-content"><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></div></article>; })}</HGStaggerGroup></div></section>;
}

export function ConnectedDataSection({ copy }: { copy: Copy['connected'] }) {
  return <section className="landing-section connected-section numbered-section" aria-labelledby="connected-title"><span className="section-watermark" aria-hidden="true">03</span><div className="landing-shell"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} className="max-w-3xl" /><HGStaggerGroup className="data-routes" startDelay={70} step={110} direction="left">{copy.routes.map(([origin, targets], index) => <div className="data-route" key={origin}><span className="data-route-index">0{index + 1}</span><strong>{origin}</strong><div className="flow-line" aria-hidden="true"><span /></div><ArrowRight className="data-arrow" aria-hidden="true"/><div className="data-targets">{targets.map((target) => <span key={target}>{target}</span>)}</div></div>)}</HGStaggerGroup></div></section>;
}

export function AudienceSection({ copy }: { copy: Copy['audience'] }) {
  return <section className="landing-section" aria-labelledby="audience-title"><div className="landing-shell editorial-split audience-layout"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} /><HGStaggerGroup className="audience-list" startDelay={70}>{copy.groups.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</HGStaggerGroup></div></section>;
}

export function OperationalVisibilitySection({ copy }: { copy: Copy['visibility'] }) {
  return <section id="visibility" className="landing-section scroll-mt-28 visibility-section" aria-labelledby="visibility-title"><div className="landing-shell visibility-grid"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} /><HGReveal delay={100} className="operation-preview"><div className="operation-scan" aria-hidden="true"/><div className="operation-preview-head"><span>{copy.demo}</span><span className="status-dot status-in-progress" /></div><dl>{copy.labels.map((label, index) => <div key={label}><dt>{label}</dt><dd>{copy.values[index]}</dd></div>)}</dl><div className="record-relationship" aria-hidden="true"><span/><span/><span/><span/></div></HGReveal></div></section>;
}

export function CapabilitiesSection({ copy }: { copy: Copy['capabilities'] }) {
  return <section id="capabilities" className="landing-section scroll-mt-28" aria-labelledby="capabilities-title"><div className="landing-shell"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} className="max-w-3xl" /><div className="capability-list">{copy.items.map(([title, body], index) => { const Icon = capabilityIcons[index]; return <HGReveal key={title} direction={index % 2 ? 'left' : 'right'} delay={80}><article className="capability-row"><span className="capability-number">0{index + 1}</span><span className="capability-icon"><Icon /></span><h3>{title}</h3><p>{body}</p></article></HGReveal>; })}</div></div></section>;
}

export function DifferentiatorsSection({ copy }: { copy: Copy['differences'] }) {
  return <section className="landing-section numbered-section" aria-labelledby="differences-title"><span className="section-watermark section-watermark-right" aria-hidden="true">04</span><div className="landing-shell editorial-split"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} /><HGStaggerGroup className="difference-list" startDelay={70} step={100}>{copy.items.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</HGStaggerGroup></div></section>;
}

export function TrustSection({ copy }: { copy: Copy['trust'] }) {
  return <section className="landing-section trust-section" aria-labelledby="trust-title"><div className="landing-shell"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.body} className="max-w-3xl" /><HGStaggerGroup className="trust-list" startDelay={80}>{copy.items.map(([title, body], index) => { const Icon = trustIcons[index]; return <article key={title}><Icon /><h3>{title}</h3><p>{body}</p></article>; })}</HGStaggerGroup></div></section>;
}

export function FaqSection({ copy }: { copy: Copy['faq'] }) {
  return <section className="landing-section faq-section" aria-labelledby="faq-title"><div className="landing-shell editorial-split"><LandingSectionHeading eyebrow={copy.eyebrow} title={copy.title} /><div className="faq-list">{copy.items.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><div><p>{answer}</p></div></details>)}</div></div></section>;
}

export function FinalCtaSection({ copy }: { copy: Copy['final'] }) {
  return <section className="final-cta"><div className="landing-shell"><HGTextReveal className="final-title">{copy.title}</HGTextReveal><HGReveal delay={120}><p>{copy.body}</p><div><Button asChild size="lg" className="bg-background text-foreground hover:bg-secondary"><Link to="/auth?mode=signup">{copy.create}<ArrowRight /></Link></Button><Button asChild variant="outline" size="lg" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/auth">{copy.signIn}</Link></Button></div></HGReveal></div></section>;
}

export function LandingFooter({ copy }: { copy: Copy }) {
  return <footer className="landing-footer"><div className="landing-shell"><div className="landing-brand"><img src="/images/hg-logo.png" alt=""/><span>Home Guide</span></div><p>{copy.footer}</p><div><a href="#how-it-works">{copy.nav.how}</a><a href="#pricing">{copy.nav.pricing}</a><Link to="/auth">{copy.nav.signIn}</Link></div></div></footer>;
}
