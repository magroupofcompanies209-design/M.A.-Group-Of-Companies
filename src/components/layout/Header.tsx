import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Search,
  ShoppingCart,
  Heart,
  Truck,
  Menu,
  X,
  Phone,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Sun,
  Zap,
  Droplet,
  Wrench,
  Flame,
  Bike,
  Building2,
  Lock,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    cart,
    wishlist,
    categories,
    navigate,
    currentRoute,
    setIsCartDrawerOpen,
    setIsAiChatOpen,
    products,
    settings,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  // Filter search suggestions
  const suggestions = searchInput.trim().length >= 2
    ? products
        .filter((p) => {
          const matchText = `${p.name} ${p.brand} ${p.sku} ${p.categoryName}`.toLowerCase();
          const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
          return matchCat && matchText.includes(searchInput.toLowerCase());
        })
        .slice(0, 6)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setIsSearchFocused(false);
      navigate('shop');
      window.location.hash = `#/shop?search=${encodeURIComponent(searchInput.trim())}${
        selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''
      }`;
    }
  };

  const getCategoryIcon = (slug: string) => {
    if (slug.includes('solar')) return <Sun className="w-4 h-4 text-amber-500" />;
    if (slug.includes('electrical')) return <Zap className="w-4 h-4 text-blue-500" />;
    if (slug.includes('sanitary')) return <Droplet className="w-4 h-4 text-cyan-500" />;
    if (slug.includes('hardware')) return <Wrench className="w-4 h-4 text-orange-500" />;
    if (slug.includes('hob')) return <Flame className="w-4 h-4 text-rose-500" />;
    if (slug.includes('ev')) return <Bike className="w-4 h-4 text-emerald-500" />;
    return <Building2 className="w-4 h-4 text-neutral-400" />;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#111318] shadow-md border-b border-[#1A1D23]">
      {/* 1. Promotional Top Bar */}
      {settings?.showAnnouncementBar !== false && (
        <div className="bg-[#0B0D10] text-[#E5E7EB] text-xs py-2 px-4 border-b border-[#1A1D23]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[#3B82F6] font-semibold tracking-wide uppercase text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></span>
                {settings?.announcementBarText || 'Modern Solutions. Quality Products. — Official Pakistan Store'}
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 text-[#6B7280]">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Cash on Delivery (COD)</span>
              </div>
              {settings?.showHelpline && settings?.contactPhone && (
                <div className="flex items-center gap-1 text-[#E5E7EB]">
                  <Phone className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>Helpline: {settings.contactPhone}</span>
                </div>
              )}
              {settings?.showWhatsapp && settings?.whatsappNumber && (
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden lg:flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp: {settings.whatsappNumber}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4 lg:gap-8">
          {/* Brand Logo */}
          <div
            onClick={() => navigate('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-11 h-11 rounded-lg bg-[#0B0D10] border border-[#2563EB]/40 flex items-center justify-center shadow-md group-hover:border-[#3B82F6] transition-colors">
              <span className="text-[#3B82F6] font-black text-xl tracking-tighter">M.A.</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white tracking-tight text-lg sm:text-xl uppercase leading-none">
                M.A. Group
              </span>
              <span className="text-[10px] text-[#3B82F6] font-semibold tracking-widest uppercase mt-0.5">
                Of Companies
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-2xl relative">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full rounded-xl border border-[#2B3038] focus-within:border-[#2563EB] bg-[#1A1D23] transition-colors overflow-hidden"
            >
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#111318] text-[#E5E7EB] text-xs font-medium px-3 border-r border-[#2B3038] focus:outline-none cursor-pointer max-w-[150px]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search solar panels, inverters, cables, hobs, EV bikes, sanitary..."
                className="flex-1 px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#6B7280] bg-transparent focus:outline-none"
              />

              <button
                type="submit"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Live Autocomplete Suggestions */}
            {isSearchFocused && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#111318] rounded-xl shadow-2xl border border-[#2B3038] overflow-hidden z-50">
                <div className="p-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider bg-[#1A1D23] border-b border-[#2B3038]">
                  Products matching &quot;{searchInput}&quot;
                </div>
                {suggestions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setIsSearchFocused(false);
                      navigate('product', { id: p.id });
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-[#1A1D23] cursor-pointer border-b border-[#2B3038]/50 last:border-none transition-colors"
                  >
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-10 h-10 object-cover rounded-lg border border-[#2B3038]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-[#6B7280] flex items-center gap-2">
                        <span>SKU: {p.sku}</span>
                        <span>&middot;</span>
                        <span className="text-[#3B82F6] font-bold">
                          Rs. {(p.salePrice || p.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={() => setIsAiChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#3B82F6] border border-[#2563EB]/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="M.A. Smart AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-[#3B82F6] animate-spin-slow" />
              <span className="hidden xl:inline">Smart AI</span>
            </button>

            {/* Track Order */}
            <button
              onClick={() => navigate('track-order')}
              className="flex items-center gap-1.5 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors text-xs font-medium cursor-pointer p-1.5 sm:p-2"
              title="Track Your Order"
            >
              <Truck className="w-5 h-5 text-[#6B7280]" />
              <span className="hidden lg:inline">Track Order</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => navigate('wishlist')}
              className="relative p-2 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              title="Saved Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Drawer Button */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex items-center gap-2 bg-[#1A1D23] hover:bg-[#2B3038] border border-[#2B3038] text-white px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-[#3B82F6]" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#2563EB] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] text-[#6B7280] uppercase font-semibold leading-none">
                  Cart (COD)
                </span>
                <span className="text-xs font-bold text-[#3B82F6] leading-tight">
                  Rs. {cartTotal.toLocaleString()}
                </span>
              </div>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#E5E7EB] hover:text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3">
          <form onSubmit={handleSearchSubmit} className="flex rounded-xl border border-[#2B3038] overflow-hidden bg-[#1A1D23]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products in Pakistan..."
              className="flex-1 px-3 py-2 text-xs text-white focus:outline-none"
            />
            <button type="submit" className="bg-[#2563EB] text-white px-3 flex items-center justify-center">
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Primary Navigation Bar */}
      <nav className="hidden md:block bg-[#0B0D10] text-[#E5E7EB] border-t border-[#1A1D23]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* All Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-4 py-3 text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                <span>All Categories</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {categoriesDropdownOpen && (
                <div
                  onMouseLeave={() => setCategoriesDropdownOpen(false)}
                  className="absolute top-full left-0 w-64 bg-[#111318] text-[#F8FAFC] shadow-2xl rounded-b-xl border border-[#2B3038] py-2 z-50 animate-in fade-in slide-in-from-top-1"
                >
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setCategoriesDropdownOpen(false);
                        navigate('category', { slug: cat.slug });
                      }}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#1A1D23] hover:text-[#3B82F6] text-xs font-semibold cursor-pointer border-b border-[#2B3038]/50 last:border-none transition-colors"
                    >
                      {getCategoryIcon(cat.slug)}
                      <span>{cat.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Main Nav Links */}
            <div className="flex items-center text-xs font-semibold">
              <button
                onClick={() => navigate('home')}
                className={`px-3 py-3 hover:text-[#3B82F6] transition-colors cursor-pointer ${
                  currentRoute === 'home' ? 'text-[#3B82F6] border-b-2 border-[#2563EB]' : 'text-[#E5E7EB]'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => navigate('shop')}
                className={`px-3 py-3 hover:text-[#3B82F6] transition-colors cursor-pointer ${
                  currentRoute === 'shop' ? 'text-[#3B82F6] border-b-2 border-[#2563EB]' : 'text-[#E5E7EB]'
                }`}
              >
                Shop All
              </button>
              <button
                onClick={() => navigate('category', { slug: 'solar-products' })}
                className="px-3 py-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                Solar
              </button>
              <button
                onClick={() => navigate('category', { slug: 'electrical-products' })}
                className="px-3 py-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                Electrical
              </button>
              <button
                onClick={() => navigate('category', { slug: 'sanitary-products' })}
                className="px-3 py-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                Sanitary
              </button>
              <button
                onClick={() => navigate('category', { slug: 'hardware-tools' })}
                className="px-3 py-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                Hardware
              </button>
              <button
                onClick={() => navigate('category', { slug: 'hobs-hoods' })}
                className="px-3 py-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                Hobs & Hoods
              </button>
              <button
                onClick={() => navigate('category', { slug: 'ev-bikes' })}
                className="px-3 py-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                EV Bikes
              </button>
              <button
                onClick={() => navigate('b2b')}
                className="px-3 py-3 text-[#E5E7EB] hover:text-[#3B82F6] transition-colors cursor-pointer"
              >
                B2B Wholesale
              </button>
            </div>
          </div>

          {/* Right Status Indicator */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#6B7280] hidden xl:inline">Lahore Hub • Nationwide Courier Dispatch</span>
            <button
              onClick={() => navigate('contact-us')}
              className="text-[#6B7280] hover:text-white transition-colors cursor-pointer px-2"
            >
              Contact Us
            </button>
            <button
              onClick={() => navigate('admin')}
              className="text-[#3B82F6] hover:text-[#2563EB] flex items-center gap-1 cursor-pointer transition-colors font-medium px-2 py-1 rounded bg-[#2563EB]/10"
              title="Private Administrator Portal"
            >
              <Lock className="w-3 h-3" />
              <span>Staff Login</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 4. Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#111318] text-[#F8FAFC] px-4 py-4 border-t border-[#1A1D23] space-y-3 animate-in slide-in-from-top duration-200">
          <div className="font-bold text-[#3B82F6] text-xs tracking-wider uppercase pb-2 border-b border-[#2B3038]">
            Navigation Menu
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('home');
              }}
              className="text-left py-2 px-3 rounded bg-neutral-800 hover:bg-neutral-700"
            >
              Home
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('shop');
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white"
            >
              Shop All
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('category', { slug: 'solar-products' });
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white"
            >
              Solar Energy
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('category', { slug: 'electrical-products' });
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white"
            >
              Electrical
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('category', { slug: 'sanitary-products' });
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white"
            >
              Sanitary Ware
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('category', { slug: 'hardware-tools' });
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white"
            >
              Hardware & Tools
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('category', { slug: 'hobs-hoods' });
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white"
            >
              Hobs & Hoods
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('category', { slug: 'ev-bikes' });
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#1A1D23] hover:bg-[#2B3038] text-white"
            >
              EV Bikes
            </button>
          </div>

          <div className="pt-2 border-t border-[#1A1D23] flex flex-col gap-2 text-xs">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('b2b');
              }}
              className="text-left py-2 px-3 rounded-lg bg-[#2563EB]/15 text-[#3B82F6] font-bold border border-[#2563EB]/30"
            >
              B2B &amp; Commercial Quotation
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('track-order');
              }}
              className="text-left py-2 px-3 rounded bg-neutral-800 text-neutral-300"
            >
              Track Order Status
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
