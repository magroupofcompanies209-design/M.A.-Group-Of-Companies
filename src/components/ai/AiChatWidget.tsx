import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { safeJsonResponse } from '../../utils/api';
import {
  Sparkles,
  X,
  Send,
  Bot,
  ExternalLink,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendedProducts?: string[];
}

const DEFAULT_WELCOME_MESSAGE =
  "Hello! I'm M.A. SMART ASSISTANT. How can I help you find the right product today?";

const DEFAULT_TAGLINE = 'Your intelligent shopping assistant.';

const DEFAULT_SUGGESTED_BUTTONS: { label: string; prompt: string }[] = [
  {
    label: 'Find a Product',
    prompt: 'I want to find a product in the M.A. GROUP OF COMPANIES catalog.',
  },
  {
    label: 'Compare Products',
    prompt: 'Compare two products from your catalog with prices, specifications, and warranty.',
  },
  {
    label: 'Find Products Under My Budget',
    prompt: 'I need a solar inverter under PKR 350,000 or show me products by budget.',
  },
  {
    label: 'Help Me Choose',
    prompt: 'Help me choose the right solar, electrical, sanitary, kitchen, or EV product.',
  },
  {
    label: 'Track My Order',
    prompt: 'Help me check my order status and delivery information.',
  },
  {
    label: 'Contact M.A. Group Of Companies',
    prompt: 'How can I contact M.A. Group Of Companies or request a quotation?',
  },
];

export const AiChatWidget: React.FC = () => {
  const {
    isAiChatOpen,
    setIsAiChatOpen,
    visibleProducts,
    addToCart,
    navigate,
    settings,
    customerAccount,
  } = useStore();

  const welcomeMessage = settings?.aiWelcomeMessage || DEFAULT_WELCOME_MESSAGE;
  const tagline = settings?.aiTagline || DEFAULT_TAGLINE;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init',
      sender: 'assistant',
      text: welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial welcome message if Admin updates it in settings
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'init') {
        return [{ ...prev[0], text: welcomeMessage }];
      }
      return prev;
    });
  }, [welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiChatOpen) {
      scrollToBottom();
    }
  }, [messages, isAiChatOpen]);

  useEffect(() => {
    const handleCustomPrompt = (e: any) => {
      const prompt = e.detail?.prompt;
      if (prompt) {
        handleSendMessage(prompt);
      }
    };
    window.addEventListener('open-ai-prompt', handleCustomPrompt);
    return () => window.removeEventListener('open-ai-prompt', handleCustomPrompt);
  }, [visibleProducts, customerAccount]);

  // If Admin disabled M.A. SMART ASSISTANT, do not render on storefront
  if (settings && settings.aiAssistantEnabled === false) {
    return null;
  }

  const suggestedButtons =
    Array.isArray(settings?.aiSuggestedQuestions) && settings.aiSuggestedQuestions.length > 0
      ? settings.aiSuggestedQuestions.map((q) => {
          const match = DEFAULT_SUGGESTED_BUTTONS.find(
            (b) => b.label.toLowerCase() === q.toLowerCase()
          );
          return {
            label: q,
            prompt: match ? match.prompt : q,
          };
        })
      : DEFAULT_SUGGESTED_BUTTONS;

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
        body: JSON.stringify({
          message: query,
          history,
          customerAccount: customerAccount
            ? {
                id: customerAccount.id,
                email: customerAccount.email,
                phone: customerAccount.phone,
                fullName: customerAccount.fullName,
              }
            : null,
        }),
      });

      const data = await safeJsonResponse(res, {
        reply:
          "Hello! I'm M.A. SMART ASSISTANT. Please let me know which product, category, or budget you are looking for.",
        recommendedProductIds: [] as string[],
      });
      const replyText =
        data.reply ||
        "Hello! I'm M.A. SMART ASSISTANT. Please let me know which product, category, or budget you are looking for.";

      const serverRecIds: string[] = Array.isArray(data.recommendedProductIds)
        ? data.recommendedProductIds
        : [];
      const maxRecs = Math.max(1, Math.min(6, Number(settings?.aiMaxRecommendations || 3)));

      const matched =
        settings?.aiAccessProductCatalog === false
          ? []
          : visibleProducts
              .filter((p) => {
                if (serverRecIds.includes(p.id)) return true;
                const queryLower = query.toLowerCase();
                const replyLower = replyText.toLowerCase();
                return (
                  replyLower.includes(p.sku.toLowerCase()) ||
                  queryLower.includes(p.sku.toLowerCase()) ||
                  (replyLower.includes(p.brand.toLowerCase()) &&
                    replyLower.includes(p.categoryName.toLowerCase()))
                );
              })
              .slice(0, maxRecs);

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
          text: 'M.A. SMART ASSISTANT is ready to help you explore our catalog, compare products, or check your order status. Please try your question again.',
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
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#151C2C] hover:bg-[#0D0E10] text-[#FCFBF8] border border-[#C9B27C]/50 px-4.5 py-3 rounded-full shadow-2xl transition-all hover:scale-105 cursor-pointer group"
      >
        <div className="relative">
          <Sparkles className="w-4 h-4 text-[#C9B27C]" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#FCFBF8] leading-none">
            M.A. SMART ASSISTANT
          </span>
          <span className="text-[9px] text-[#C9B27C] font-medium leading-tight mt-0.5">
            {tagline}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-[395px] sm:max-w-[430px] h-[600px] max-h-[85vh] bg-[#FCFBF8] text-[#292B30] rounded-2xl shadow-2xl border border-[#C9B27C]/45 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-[#0D0E10] text-[#FCFBF8] p-4 flex items-center justify-between border-b border-[#C9B27C]/25 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#151C2C] border border-[#C9B27C]/45 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-[#C9B27C]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-luxury-serif text-sm font-bold text-[#FCFBF8] tracking-wide truncate">
                M.A. SMART ASSISTANT
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            </div>
            <div className="text-[10px] text-[#C9B27C] tracking-wide truncate">
              {tagline}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAiChatOpen(false)}
          className="p-2 rounded-lg text-[#B8B9BC] hover:text-[#FCFBF8] hover:bg-white/10 transition-colors cursor-pointer"
          title="Close M.A. SMART ASSISTANT"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Quick Buttons Bar */}
      <div className="bg-[#F7F3EA] p-2.5 border-b border-[#B8B9BC]/35 overflow-x-auto flex items-center gap-1.5 text-[11px]">
        {suggestedButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => handleSendMessage(btn.prompt)}
            className="whitespace-nowrap px-2.5 py-1.5 bg-[#FCFBF8] hover:bg-[#151C2C] hover:text-[#FCFBF8] hover:border-[#C9B27C] border border-[#B8B9BC]/45 rounded-lg text-[#151C2C] font-medium transition-colors cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F7F3EA]/60">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 text-[10px] text-[#292B30]/60 mb-1 px-1">
              {m.sender === 'user' ? (
                <>
                  <span>You</span>
                  <span>&middot;</span>
                  <span>{m.timestamp}</span>
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-[#A98B52]" />
                  <span className="font-semibold text-[#151C2C]">M.A. SMART ASSISTANT</span>
                  <span>&middot;</span>
                  <span>{m.timestamp}</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                m.sender === 'user'
                  ? 'bg-[#151C2C] text-[#FCFBF8] rounded-tr-none shadow-xs'
                  : 'bg-[#FCFBF8] text-[#292B30] border border-[#B8B9BC]/35 shadow-xs rounded-tl-none'
              }`}
            >
              {m.text}

              {/* Matched Product Recommendations */}
              {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#B8B9BC]/30 space-y-2">
                  <div className="text-[10px] font-bold text-[#A98B52] uppercase tracking-[0.14em]">
                    Live Catalog Recommendations:
                  </div>
                  {m.recommendedProducts.map((pId) => {
                    const prod = visibleProducts.find((p) => p.id === pId);
                    if (!prod) return null;
                    return (
                      <div
                        key={prod.id}
                        className="p-2.5 rounded-lg bg-[#F7F3EA] border border-[#B8B9BC]/35 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#0D0E10] truncate">
                            {prod.name}
                          </div>
                          <div className="text-[10px] text-[#292B30]/65 truncate">
                            SKU: {prod.sku} &middot; {prod.stock > 0 ? 'In Stock' : 'Out of Stock'}
                          </div>
                          <div className="text-[#151C2C] font-bold mt-0.5 tabular-nums">
                            PKR {(prod.salePrice || prod.price).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setIsAiChatOpen(false);
                              navigate('product', { id: prod.id });
                            }}
                            className="p-1.5 rounded bg-[#FCFBF8] hover:border-[#C9B27C] text-[#151C2C] border border-[#B8B9BC]/40 cursor-pointer"
                            title="View Product Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {prod.stock > 0 && (
                            <button
                              onClick={() => addToCart(prod, 1)}
                              className="p-1.5 rounded bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] cursor-pointer"
                              title="Add to Cart (COD)"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}
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
          <div className="flex items-center gap-2 p-3 bg-[#FCFBF8] border border-[#B8B9BC]/35 rounded-2xl w-fit text-xs text-[#292B30]/75 shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#A98B52]" />
            <span>M.A. SMART ASSISTANT is checking live catalog...</span>
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
        className="p-3 bg-[#FCFBF8] border-t border-[#B8B9BC]/35 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask M.A. SMART ASSISTANT about products, budget, or orders..."
          className="flex-1 bg-[#F7F3EA] border border-[#B8B9BC]/40 rounded-lg px-3.5 py-2.5 text-xs text-[#0D0E10] placeholder-[#292B30]/50 focus:outline-none focus:border-[#C9B27C]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
