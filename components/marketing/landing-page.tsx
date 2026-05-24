'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { HeroSection } from './sections/hero';
import { TrustedSection, BranchSection, MobileShowcaseSection, AnalyticsShowcaseSection } from './sections/showcase';
import { FeaturesSection } from './sections/features';
import { WorkspaceModesSection } from './sections/workspace-modes';
import { TestimonialsSection, FAQSection, CTASection, FooterSection } from './sections/pricing-footer';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Dashboard Preview', href: '#showcase' },
  { label: 'Testimonials', href: '#testimonials' },
];

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div 
      className="min-h-screen bg-[#F9FAFB] text-[#111827] selection:bg-[#10B981]/20 overflow-x-hidden" 
      style={{ fontFamily: "'Inter', 'Manrope', system-ui, sans-serif" }}
    >
      {/* Sticky Glass Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-5 md:px-8 h-[72px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm flex items-center justify-center p-0.5">
              <Image 
                src="/icons/icon-192x192.png" 
                alt="HexaTrack Logo" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover rounded-lg" 
                priority 
              />
            </div>
            <span className="text-[16px] font-bold tracking-tight text-[#111827]">HexaTrack</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <a 
                key={link.label} 
                href={link.href} 
                className="text-[14px] text-[#6B7280] hover:text-[#111827] transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={onLogin} 
              className="text-[14px] text-[#6B7280] hover:text-[#111827] transition-colors font-medium px-4 py-2"
            >
              Login
            </button>
            <button
              onClick={onGetStarted}
              className="text-[14px] font-semibold text-white bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-105 px-5 py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-sm"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button 
            onClick={() => setMobileMenu(!mobileMenu)} 
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#111827]"
            aria-label="Toggle Menu"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden bg-white border-t border-gray-200 px-5 py-4 space-y-1 shadow-lg"
            >
              {NAV_LINKS.map(link => (
                <a 
                  key={link.label} 
                  href={link.href} 
                  onClick={() => setMobileMenu(false)} 
                  className="block py-3 text-[15px] text-[#6B7280] hover:text-[#111827] font-medium"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 flex flex-col gap-2 border-t border-gray-200 mt-2">
                <button 
                  onClick={() => { setMobileMenu(false); onLogin(); }} 
                  className="py-3 text-[15px] text-[#6B7280] hover:text-[#111827] font-medium text-left"
                >
                  Login
                </button>
                <button
                  onClick={() => { setMobileMenu(false); onGetStarted(); }}
                  className="py-3 px-5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-[15px] font-semibold text-center"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Sections */}
      <main>
        <HeroSection onGetStarted={onGetStarted} onLogin={onLogin} />
        <TrustedSection />
        <FeaturesSection />
        <div id="solutions">
          <WorkspaceModesSection />
        </div>
        <BranchSection />
        <MobileShowcaseSection />
        <AnalyticsShowcaseSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection onGetStarted={onGetStarted} />
      </main>

      <FooterSection />
    </div>
  );
}
