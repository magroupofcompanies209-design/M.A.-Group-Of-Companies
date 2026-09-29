import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { safeJsonResponse } from '../../utils/api';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ExternalLink,
  ShoppingCart,
  Minimize2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendedProducts?: string[]; // IDs of products
}

export const AiChatWidget: React.FC = () => {
  const { isAiChatOpen, setIsAiChatOpen, products, addToCart, navigate, settings } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init',
      sender: 'assistant',
      text:
        settings?.aiWelcomeMessage ||
        'Welcome to M.A. GROUP OF COMPANIES! I am your technical sales & sizing assistant. Ask me about solar system calculations, pure copper cables, sanitary fittings, gas hobs, or EV motorbikes delivered via Cash on Delivery (COD) across Pakistan.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiChatOpen) {
      scrollToBottom();
    }
  }, [messages, isAiChatOpen]);

  // Listen for custom trigger events from AiBanner or product pages
  useEffect(() => {
    const handleCustomPrompt = (e: any) => {
      const prompt = e.detail?.prompt;
      if (prompt) {
        handleSendMessage(prompt);
      }
    };
    window.addEventListener('open-ai-prompt', handleCustomPrompt);
    return () => window.removeEventListener('open-ai-prompt', handleCustomPrompt);
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-5).map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history }),
      });

      const data = await safeJsonResponse(res, {
        reply: "I'm here to help with all M.A. GROUP OF COMPANIES products across Pakistan. Please let me know your specifications!",
      });
      const replyText = data.reply || "I'm here to help with all M.A. GROUP OF COMPANIES products across Pakistan. Please let me know your specifications!";

      // Extract matching products mentioned in reply or query
      const matched = products.filter((p) => {
        const titleLower = p.name.toLowerCase();
        const queryLower = query.toLowerCase();
        const replyLower = replyText.toLowerCase();
        return (
          replyLower.includes(p.sku.toLowerCase()) ||
          queryLower.includes(p.sku.toLowerCase()) ||
          (replyLower.includes(p.brand.toLowerCase()) && replyLower.includes(p.categoryName.toLowerCase()))
        );
      }).slice(0, 2);

      const assistantMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedProducts: matched.map((p) => p.id),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'assistant',
          text: 'Our technical support line is also available via WhatsApp for immediate sizing assistance. How else may I guide your project?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAiChatOpen) {
    return (
      <button
        onClick={() => setIsAiChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-500/40 px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105 cursor-pointer group"
      >
        <div className="relative">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin-slow" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-neutral-900"></span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black tracking-wider uppercase text-white leading-none">
            M.A. Smart Assistant
          </span>
          <span className="text-[10px] text-amber-400 font-medium leading-tight">
            Solar &middot; Cables &middot; Cash on Delivery
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-[390px] sm:max-w-[420px] h-[580px] bg-white rounded-2xl shadow-2xl border border-neutral-300 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-neutral-950 text-white p-3.5 flex items-center justify-between border-b border-neutral-800 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                M.A. Smart Assistant
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              Grounded in Official Catalog
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsAiChatOpen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            title="Return back to website"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to App</span>
          </button>
          <button
            onClick={() => setIsAiChatOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Questions Bar */}
      <div className="bg-neutral-100 p-2 border-b border-neutral-200 overflow-x-auto flex items-center gap-1.5 text-[11px]">
        <button
          onClick={() => handleSendMessage('Calculate solar setup for 1.5-ton AC in Pakistan')}
          className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-amber-50 border border-neutral-300 rounded-md text-neutral-700 font-medium transition-colors"
        >
          Solar for 1.5T AC
        </button>
        <button
          onClick={() => handleSendMessage('What is your Cash on Delivery policy?')}
          className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-amber-50 border border-neutral-300 rounded-md text-neutral-700 font-medium transition-colors"
        >
          COD Policy
        </button>
        <button
          onClick={() => handleSendMessage('Recommend heavy copper wire for home')}
          className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-amber-50 border border-neutral-300 rounded-md text-neutral-700 font-medium transition-colors"
        >
          Pure Copper Cables
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-neutral-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 text-[10px] text-neutral-400 mb-1 px-1">
              {m.sender === 'user' ? (
                <>
                  <span>You</span>
                  <span>&middot;</span>
                  <span>{m.timestamp}</span>
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-amber-600" />
                  <span className="font-semibold text-neutral-700">M.A. Advisor</span>
                  <span>&middot;</span>
                  <span>{m.timestamp}</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                m.sender === 'user'
                  ? 'bg-neutral-900 text-white rounded-tr-none'
                  : 'bg-white text-neutral-800 border border-neutral-200 shadow-xs rounded-tl-none'
              }`}
            >
              {m.text}

              {/* Matched Product Recommendations */}
              {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                    Recommended Catalog Products:
                  </div>
                  {m.recommendedProducts.map((pId) => {
                    const prod = products.find((p) => p.id === pId);
                    if (!prod) return null;
                    return (
                      <div
                        key={prod.id}
                        className="p-2 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-900 truncate">
                            {prod.name}
                          </div>
                          <div className="text-amber-700 font-bold">
                            Rs. {(prod.salePrice || prod.price).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setIsAiChatOpen(false);
                              navigate('product', { id: prod.id });
                            }}
                            className="p-1.5 rounded bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300"
                            title="View Product"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => addToCart(prod, 1)}
                            className="p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-amber-400"
                            title="Add to Cart (COD)"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-white border border-neutral-200 rounded-2xl w-fit text-xs text-neutral-500 shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>Consulting engineering catalog &amp; specs...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about solar, wire ratings, gas hobs, COD..."
          className="flex-1 bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
