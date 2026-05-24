'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronDown, ArrowRight, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'CFO, TechNova', quote: 'HexaTrack replaced three separate tools for us. Branch management alone saved us 15 hours per week.', avatar: 'P' },
  { name: 'Rahul Mehta', role: 'Founder, QuickBite Group', quote: 'Managing 8 restaurant branches from one dashboard is a game-changer. The staff permissions are perfect.', avatar: 'R' },
  { name: 'Ananya Iyer', role: 'Independent Professional', quote: 'I use the individual mode for personal finances. Clean, simple, and the reports are beautiful.', avatar: 'A' },
  { name: 'Vikram Patel', role: 'Ops Manager, GreenLeaf', quote: 'The approval workflow means no expense goes unnoticed. Our team of 30 adopted it in days.', avatar: 'V' },
];

const FAQS = [
  { q: 'Is HexaTrack suitable for organizations?', a: 'Absolutely. HexaTrack supports multi-tenant organization structures where owners can delegate workspace actions to managers, supervise branches, and audit team transactions.' },
  { q: 'Does it support branches?', a: 'Yes. Enabling branch-based accounting allows branch managers to supervise localized ledgers, while corporate owners can view consolidated analytics or drill down into specific outlets.' },
  { q: 'Can staff have limited permissions?', a: 'Yes, role-based access control is built-in. Staff accounts are restricted to creating and viewing transaction logs in their assigned branch workspaces, preventing unauthorized administrative mutations.' },
  { q: 'Is there mobile support?', a: 'Yes, HexaTrack is built mobile-first as a Progressive Web App (PWA). It features thumb-friendly bottom navigations, a floating action button, and safe area padding.' },
  { q: 'Does it work offline?', a: 'Yes. The client sync queue saves transactions locally inside a secure browser database and syncs them automatically to the server when network access is recovered.' },
  { q: 'Is data secure?', a: 'Yes. All database requests are isolated at the workspace context level using strict JWT claims verification and automated Row Level Security (RLS) policies.' },
];

/* ── Testimonials Section ──────────────────────── */
export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 lg:py-32 px-5 md:px-8 bg-[#F9FAFB] border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-16"
        >
          <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">Testimonials</p>
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight">
            Loved by Modern Operations
          </h2>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div 
              key={t.name} 
              initial={{ opacity: 0, y: 12 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-gray-250 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              {/* Star rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={14} className="text-[#10B981] fill-[#10B981]" />
                ))}
              </div>
              <p className="text-[14px] text-[#475569] leading-relaxed mb-6 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white text-xs font-bold shadow-inner">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#111827]">{t.name}</p>
                  <p className="text-[11px] text-[#6B7280] font-medium">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ Section ───────────────────────────────── */
export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  
  return (
    <section className="py-24 lg:py-32 px-5 md:px-8 bg-white border-b border-gray-100">
      <div className="max-w-[720px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-12"
        >
          <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.2em] mb-3">FAQ</p>
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight">
            Common Questions
          </h2>
        </motion.div>
        
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0 }} 
              whileInView={{ opacity: 1 }} 
              viewport={{ once: true }} 
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-gray-200 bg-[#F9FAFB] overflow-hidden transition-colors"
            >
              <button 
                onClick={() => setOpen(open === i ? null : i)} 
                className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
              >
                <span className={`text-[14px] font-bold transition-colors ${open === i ? 'text-[#059669]' : 'text-[#111827]'}`}>
                  {faq.q}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`text-[#6B7280] transition-transform duration-300 shrink-0 ml-3 ${open === i ? 'rotate-180 text-[#10B981]' : ''}`} 
                />
              </button>
              
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="px-5 pb-5 border-t border-gray-200/50 pt-2">
                      <p className="text-[13px] text-[#475569] leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA Section ─────────────────────────── */
export function CTASection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="py-24 lg:py-32 px-5 md:px-8 bg-[#F9FAFB]">
      <div className="max-w-[800px] mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.98 }} 
          whileInView={{ opacity: 1, y: 0, scale: 1 }} 
          viewport={{ once: true }}
          className="relative rounded-3xl border border-gray-200 bg-white p-12 lg:p-16 overflow-hidden shadow-sm"
        >
          {/* Subtle green ambient light */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,rgba(16,185,129,0.06),transparent_70%)] pointer-events-none" />
          
          <h2 className="text-[32px] sm:text-[42px] font-extrabold text-[#111827] tracking-tight mb-4 relative z-10">
            Take Control of Your Financial Operations
          </h2>
          
          <p className="text-[16px] text-[#6B7280] mb-10 max-w-md mx-auto relative z-10">
            Modern finance management for ambitious businesses. Experience isolated workspaces and automated ledgers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center relative z-10">
            <button 
              onClick={onGetStarted} 
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm transition-all hover:brightness-105 active:scale-[0.98] shadow-md shadow-emerald-500/10"
            >
              Get Started Free 
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button 
              onClick={() => window.open('mailto:support@hexatrack.app')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-gray-200 bg-gray-50 text-[#374151] font-bold text-sm transition-all hover:bg-gray-100 active:scale-[0.98]"
            >
              <MessageSquare size={15} className="text-[#10B981]" /> Contact Support
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer Section ────────────────────────────── */
export function FooterSection() {
  const cols = [
    { title: 'Product', links: ['Features', 'Mobile App', 'Solutions', 'Integrations', 'Security'] },
    { title: 'Company', links: ['About Us', 'Blog Hub', 'Careers', 'Press', 'Contact'] },
    { title: 'Resources', links: ['Documentation', 'API Reference', 'Guides', 'Community', 'Status'] },
    { title: 'Legal', links: ['Privacy Policy', 'Terms of Use', 'Cookie Policy', 'Licensing'] },
  ];
  
  return (
    <footer className="py-16 px-5 md:px-8 border-t border-gray-200 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm flex items-center justify-center p-0.5">
                <Image 
                  src="/icons/icon-192x192.png" 
                  alt="HexaTrack Logo" 
                  width={28} 
                  height={28} 
                  className="w-full h-full object-cover rounded-lg" 
                />
              </div>
              <span className="text-[15px] font-bold text-[#111827]">HexaTrack</span>
            </div>
            <p className="text-[12px] text-[#6B7280] max-w-[240px] leading-relaxed">
              The modern finance workspace for individuals, businesses, and enterprise organizations.
            </p>
          </div>
          
          {cols.map(c => (
            <div key={c.title}>
              <p className="text-[11px] font-bold text-[#111827] uppercase tracking-wider mb-4">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-[12.5px] text-[#6B7280] hover:text-[#111827] transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[12px] text-[#9CA3AF]">
            © {new Date().getFullYear()} HexaTrack Finance. All rights reserved.
          </p>
          <div className="flex gap-4">
            {['Twitter', 'LinkedIn', 'GitHub'].map(s => (
              <a 
                key={s} 
                href="#" 
                className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
