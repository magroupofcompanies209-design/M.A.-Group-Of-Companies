import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Sparkles, Sun, Zap, Flame, Bike, ArrowRight } from 'lucide-react';

export const AiBanner: React.FC = () => {
  const { setIsAiChatOpen } = useStore();

  const handleOpenWithPrompt = (promptText: string) => {
    setIsAiChatOpen(true);
    // Dispatch custom event to trigger AI prompt
    window.dispatchEvent(new CustomEvent('open-ai-prompt', { detail: { prompt: promptText } }));
  };

  return (
    <section className="py-12 bg-neutral-900 text-white border-b border-neutral-800 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Info Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded Catalog Intelligence</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              M.A. Smart Engineering &amp; Sizing Assistant
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Confused about solar inverter sizing, copper wire ratings, or kitchen hood CFM?
              Our Smart Assistant is grounded in our exact inventory, Pakistan grid conditions, and technical data sheets.
            </p>

            <button
              onClick={() => setIsAiChatOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Smart Assistant</span>
            </button>
          </div>

          {/* Right Prompt Tiles Column */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              onClick={() => handleOpenWithPrompt('I want to calculate solar system sizing for a 5-Marla house with 1.5-ton AC and 4 fans.')}
              className="p-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-400 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                  <Sun className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  Solar Home Sizing
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal mb-3">
                &quot;Calculate solar sizing for a 5-Marla home running 1.5-ton AC &amp; refrigerator.&quot;
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                <span>Ask AI</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => handleOpenWithPrompt('Which Pakistan Cables copper wire gauge (7/029 or 70/0076) is required for 1.5-ton Inverter AC?')}
              className="p-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 hover:border-blue-400 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                  Cable &amp; Breaker Safety
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal mb-3">
                &quot;Which wire gauge and Schneider breaker rating is safe for 1.5-ton AC?&quot;
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-400">
                <span>Ask AI</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => handleOpenWithPrompt('Explain the difference between Corona built-in gas hobs with Sabaf brass burners and standard glass hobs.')}
              className="p-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 hover:border-rose-400 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
                  Kitchen Hob &amp; Hood Tips
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal mb-3">
                &quot;Which Corona gas hob has heavy brass burners suitable for high wok cooking?&quot;
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                <span>Ask AI</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => handleOpenWithPrompt('What is the battery range and charging cost of Crown EV Volt 72V electric bike in Pakistan?')}
              className="p-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 hover:border-emerald-400 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Bike className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  EV Bike Economics
                </div>
              </div>
              <p className="text-[11px] text-neutral-400 leading-normal mb-3">
                &quot;What is the charging cost per 100km for Crown EV Volt 72V lithium bike?&quot;
              </p>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <span>Ask AI</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
