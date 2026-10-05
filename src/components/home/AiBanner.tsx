import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Sparkles, Sun, Zap, Flame, Bike, ArrowRight } from 'lucide-react';

export const AiBanner: React.FC = () => {
  const { setIsAiChatOpen, settings } = useStore();

  if (settings && settings.aiAssistantEnabled === false) {
    return null;
  }

  const handleOpenWithPrompt = (promptText: string) => {
    setIsAiChatOpen(true);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-ai-prompt', { detail: { prompt: promptText } }));
    }, 100);
  };

  return (
    <section className="py-16 sm:py-20 bg-[#151C2C] text-[#FCFBF8] border-b border-[#C9B27C]/25 relative overflow-hidden">
      {/* Subtle Luxury Ambient Accents */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-[#C9B27C]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-[#0D0E10]/50 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Info Column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#C9B27C] uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5 text-[#C9B27C]" />
              <span>{settings?.aiTagline || 'Your intelligent shopping assistant.'}</span>
            </div>

            <h2 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#FCFBF8] tracking-tight leading-tight">
              M.A. SMART ASSISTANT
            </h2>

            <p className="text-xs sm:text-sm text-[#B8B9BC] leading-relaxed">
              Search products by category or subcategory, compare technical specifications, find genuine equipment within your PKR budget, or check your authenticated order status.
            </p>

            <button
              onClick={() => setIsAiChatOpen(true)}
              className="bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] font-semibold text-xs sm:text-sm px-6 py-3.5 rounded-lg flex items-center gap-2.5 uppercase tracking-[0.12em] transition-all shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch M.A. SMART ASSISTANT</span>
            </button>
          </div>

          {/* Right Prompt Tiles Column */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() =>
                handleOpenWithPrompt(
                  'I need a solar inverter under PKR 350,000 or help me size a solar system for my home.'
                )
              }
              className="p-5 rounded-xl bg-[#0D0E10]/85 hover:bg-[#0D0E10] border border-[#B8B9BC]/20 hover:border-[#C9B27C] cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="p-2.5 rounded-lg bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/30">
                  <Sun className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-[#FCFBF8] group-hover:text-[#C9B27C] transition-colors">
                  Solar &amp; Budget Finder
                </div>
              </div>
              <p className="text-[11px] text-[#B8B9BC] leading-relaxed mb-3">
                &ldquo;Find solar panels, hybrid inverters, or lithium batteries within my PKR budget.&rdquo;
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C9B27C]">
                <span>Ask M.A. SMART ASSISTANT</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() =>
                handleOpenWithPrompt(
                  'Help me choose electrical switches, sockets, pure copper wires, or circuit breakers.'
                )
              }
              className="p-5 rounded-xl bg-[#0D0E10]/85 hover:bg-[#0D0E10] border border-[#B8B9BC]/20 hover:border-[#C9B27C] cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="p-2.5 rounded-lg bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/30">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-[#FCFBF8] group-hover:text-[#C9B27C] transition-colors">
                  Electrical &amp; Hardware Guide
                </div>
              </div>
              <p className="text-[11px] text-[#B8B9BC] leading-relaxed mb-3">
                &ldquo;Compare pure copper cable gauges, Schneider breakers, and modular switches.&rdquo;
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C9B27C]">
                <span>Ask M.A. SMART ASSISTANT</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() =>
                handleOpenWithPrompt(
                  'Help me compare kitchen hobs, chimney hoods, and luxury sanitary fittings.'
                )
              }
              className="p-5 rounded-xl bg-[#0D0E10]/85 hover:bg-[#0D0E10] border border-[#B8B9BC]/20 hover:border-[#C9B27C] cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="p-2.5 rounded-lg bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/30">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-[#FCFBF8] group-hover:text-[#C9B27C] transition-colors">
                  Sanitary, Hobs &amp; Hoods
                </div>
              </div>
              <p className="text-[11px] text-[#B8B9BC] leading-relaxed mb-3">
                &ldquo;Compare built-in tempered glass gas hobs, suction hoods, and brass faucets.&rdquo;
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C9B27C]">
                <span>Ask M.A. SMART ASSISTANT</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() =>
                handleOpenWithPrompt(
                  'Tell me about EV bikes, chargers, warranty coverage, and Cash on Delivery across Pakistan.'
                )
              }
              className="p-5 rounded-xl bg-[#0D0E10]/85 hover:bg-[#0D0E10] border border-[#B8B9BC]/20 hover:border-[#C9B27C] cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="p-2.5 rounded-lg bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/30">
                  <Bike className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-[#FCFBF8] group-hover:text-[#C9B27C] transition-colors">
                  EV Bikes &amp; Order Help
                </div>
              </div>
              <p className="text-[11px] text-[#B8B9BC] leading-relaxed mb-3">
                &ldquo;Explore lithium EV motorbikes, warranties, and Cash on Delivery terms.&rdquo;
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C9B27C]">
                <span>Ask M.A. SMART ASSISTANT</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
