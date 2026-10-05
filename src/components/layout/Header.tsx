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
  ChevronRight,
  Sparkles,
  Sun,
  Zap,
  Droplet,
  Wrench,
  Flame,
  Bike,
  Building2,
  User,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    cart,
    wishlist,
    visibleCategories,
    visibleProducts,
    customerAccount,
    navigate,
    currentRoute,
    setIsAiChatOpen,
    settings,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  // Filter search suggestions using visibleProducts
  const suggestions =
    searchInput.trim().length >= 2
      ? visibleProducts
          .filter((p) => {
            const matchText = `${p.name} ${p.brand} ${p.sku} ${p.categoryName} ${p.subcategoryName || ''}`.toLowerCase();
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
      navigate('shop', {
        search: searchInput.trim(),
        ...(selectedCategory !== 'all' ? { category: selectedCategory } : {}),
      });
      window.location.hash = `#/shop?search=${encodeURIComponent(searchInput.trim())}${
        selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''
      }`;
    }
  };

  const getCategoryIcon = (slug: string) => {
    if (slug.includes('solar')) return <Sun className="w-4 h-4 text-[#C9B27C]" />;
    if (slug.includes('electrical')) return <Zap className="w-4 h-4 text-[#C9B27C]" />;
    if (slug.includes('sanitary')) return <Droplet className="w-4 h-4 text-[#C9B27C]" />;
    if (slug.includes('hardware')) return <Wrench className="w-4 h-4 text-[#C9B27C]" />;
    if (slug.includes('hob') || slug.includes('hood') || slug.includes('kitchen'))
      return <Flame className="w-4 h-4 text-[#C9B27C]" />;
    if (slug.includes('ev')) return <Bike className="w-4 h-4 text-[#C9B27C]" />;
    return <Building2 className="w-4 h-4 text-[#C9B27C]" />;
  };

  const activeHoveredCat =
    visibleCategories.find((c) => c.id === hoveredCatId) || visibleCategories[0] || null;

  return (
    <header className="sticky top-0 z-40 bg-[#0D0E10] text-[#FCFBF8] shadow-[0_10px_30px_rgba(13,14,16,0.25)] border-b border-[#B8B9BC]/15">
      {/* 1. Executive Top Concierge Bar */}
      {settings?.showAnnouncementBar !== false && (
        <div className="bg-[#0D0E10] text-[#B8B9BC] text-[11px] py-2 px-4 border-b border-[#B8B9BC]/10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-[#C9B27C] font-medium tracking-[0.16em] uppercase text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9B27C]"></span>
                {settings?.announcementBarText ||
                  'M.A. GROUP OF COMPANIES — Architectural, Solar & Luxury Living Showroom'}
              </span>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 text-[#B8B9BC]">
              <div className="flex items-center gap-1.5 text-[#FCFBF8]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C9B27C]" />
                <span className="tracking-wide">Cash on Delivery Across Pakistan</span>
              </div>
              {settings?.showHelpline && settings?.contactPhone && (
                <div className="hidden md:flex items-center gap-1.5 text-[#FCFBF8]">
                  <Phone className="w-3.5 h-3.5 text-[#C9B27C]" />
                  <span>{settings.contactPhone}</span>
                </div>
              )}
              {settings?.showWhatsapp && settings?.whatsappNumber && (
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden lg:flex items-center gap-1.5 text-[#C9B27C] hover:text-[#FCFBF8] transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Concierge: {settings.whatsappNumber}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Luxury Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-4 lg:gap-8">
          {/* M.A. GROUP OF COMPANIES Logo */}
          <div
            onClick={() => navigate('home')}
            className="flex items-center gap-3.5 cursor-pointer select-none group shrink-0"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-[#151C2C] border border-[#C9B27C]/50 flex items-center justify-center shadow-inner group-hover:border-[#C9B27C] transition-all duration-300">
              <span className="font-luxury-serif text-[#C9B27C] font-bold text-lg sm:text-xl tracking-wider">
                M.A
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-luxury-serif font-semibold text-[#FCFBF8] tracking-[0.08em] text-base sm:text-xl uppercase leading-none">
                M.A. Group
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#C9B27C] font-medium tracking-[0.26em] uppercase mt-1">
                Of Companies
              </span>
            </div>
          </div>

          {/* Refined Search Bar */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-xl relative">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-full rounded-lg border border-[#B8B9BC]/25 focus-within:border-[#C9B27C] bg-[#151C2C]/60 transition-all overflow-hidden"
            >
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#0D0E10] text-[#B8B9BC] hover:text-[#FCFBF8] text-xs font-medium px-3.5 border-r border-[#B8B9BC]/20 focus:outline-none cursor-pointer max-w-[155px]"
              >
                <option value="all">All Collections</option>
                {visibleCategories.map((c) => (
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
                placeholder="Search solar systems, architectural sanitary, hobs, hoods, EV bikes..."
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm text-[#FCFBF8] placeholder-[#B8B9BC]/60 bg-transparent focus:outline-none"
              />

              <button
                type="submit"
                className="bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] px-5 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Search Catalog"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Live Autocomplete Suggestions */}
            {isSearchFocused && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#FCFBF8] text-[#292B30] rounded-xl shadow-2xl border border-[#B8B9BC]/40 overflow-hidden z-50">
                <div className="px-4 py-2.5 text-[10px] font-semibold text-[#292B30]/70 uppercase tracking-[0.18em] bg-[#F7F3EA] border-b border-[#B8B9BC]/30">
                  Curated Matches for &ldquo;{searchInput}&rdquo;
                </div>
                {suggestions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setIsSearchFocused(false);
                      navigate('product', { id: p.id });
                    }}
                    className="flex items-center gap-3.5 p-3.5 hover:bg-[#F7F3EA] cursor-pointer border-b border-[#B8B9BC]/20 last:border-none transition-colors"
                  >
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-11 h-11 object-cover rounded-lg border border-[#B8B9BC]/30 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#0D0E10] truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-[#292B30]/70 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px]">SKU: {p.sku}</span>
                        <span>&middot;</span>
                        <span className="text-[#A98B52] font-bold">
                          PKR {(p.salePrice || p.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Executive Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Smart Advisor Trigger */}
            <button
              onClick={() => setIsAiChatOpen(true)}
              className="hidden xl:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#C9B27C] hover:text-[#0D0E10] border border-[#C9B27C]/35 text-xs font-medium tracking-wide transition-all cursor-pointer"
              title="M.A. Technical Concierge"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Advisor</span>
            </button>

            {/* Track Order */}
            <button
              onClick={() => navigate('track-order')}
              className="hidden sm:flex items-center gap-1.5 text-[#FCFBF8] hover:text-[#C9B27C] transition-colors text-xs font-medium cursor-pointer px-2 py-2"
              title="Track Your Order"
            >
              <Truck className="w-4 h-4 text-[#C9B27C]" />
              <span className="hidden lg:inline tracking-wide">Track Order</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => navigate('wishlist')}
              className="relative p-2 text-[#FCFBF8] hover:text-[#C9B27C] transition-colors cursor-pointer"
              title="Saved Collection"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#A98B52] text-[#FCFBF8] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Customer Account / Sign In */}
            <button
              onClick={() => navigate('account')}
              className="p-2 text-[#FCFBF8] hover:text-[#C9B27C] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title={customerAccount ? `Signed in as ${customerAccount.fullName}` : 'Customer Account / Sign In'}
            >
              <User className="w-5 h-5 text-[#C9B27C]" />
              <span className="hidden xl:inline tracking-wide max-w-[100px] truncate">
                {customerAccount ? customerAccount.fullName.split(' ')[0] : 'Account'}
              </span>
            </button>

            {/* Full-Screen Cart Page Button */}
            <button
              onClick={() => navigate('cart')}
              className="flex items-center gap-2.5 bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/40 px-3.5 py-2 rounded-lg transition-all duration-300 cursor-pointer group"
              title="Open Shopping Cart"
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4 text-[#C9B27C] group-hover:text-[#0D0E10] transition-colors" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#C9B27C] group-hover:bg-[#0D0E10] text-[#0D0E10] group-hover:text-[#FCFBF8] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[9px] text-[#B8B9BC] group-hover:text-[#0D0E10]/80 uppercase tracking-[0.14em] leading-none">
                  Cart (COD)
                </span>
                <span className="text-xs font-semibold text-[#FCFBF8] group-hover:text-[#0D0E10] leading-tight mt-0.5 tabular-nums">
                  PKR {cartTotal.toLocaleString()}
                </span>
              </div>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#FCFBF8] hover:text-[#C9B27C] cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3.5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex rounded-lg border border-[#B8B9BC]/25 focus-within:border-[#C9B27C] overflow-hidden bg-[#151C2C]/70"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search luxury collection..."
              className="flex-1 px-3.5 py-2.5 text-xs text-[#FCFBF8] placeholder-[#B8B9BC]/60 bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#C9B27C] text-[#0D0E10] px-4 flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Spacious Luxury Navigation Bar */}
      <nav className="hidden md:block bg-[#0D0E10] text-[#FCFBF8] border-t border-[#B8B9BC]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Categories + Subcategories Mega Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
                onMouseEnter={() => {
                  setCategoriesDropdownOpen(true);
                  if (!hoveredCatId && visibleCategories[0]) {
                    setHoveredCatId(visibleCategories[0].id);
                  }
                }}
                className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border-r border-[#B8B9BC]/15 font-medium px-5 py-3 text-xs uppercase tracking-[0.14em] flex items-center gap-2.5 transition-all cursor-pointer"
              >
                <Menu className="w-4 h-4 text-[#C9B27C] group-hover:text-[#0D0E10]" />
                <span>Categories</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {categoriesDropdownOpen && (
                <div
                  onMouseLeave={() => setCategoriesDropdownOpen(false)}
                  className="absolute top-full left-0 w-[620px] bg-[#0D0E10] text-[#FCFBF8] shadow-2xl rounded-b-2xl border border-[#C9B27C]/35 grid grid-cols-12 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1"
                >
                  {/* Left Col: Parent Categories */}
                  <div className="col-span-6 border-r border-[#B8B9BC]/15 py-2 bg-[#0D0E10]">
                    {visibleCategories.map((cat) => {
                      const isHovered = activeHoveredCat?.id === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onMouseEnter={() => setHoveredCatId(cat.id)}
                          onClick={() => {
                            setCategoriesDropdownOpen(false);
                            navigate('category', { slug: cat.slug });
                          }}
                          className={`flex items-center justify-between px-5 py-3 text-xs font-medium tracking-wide cursor-pointer border-b border-[#B8B9BC]/10 last:border-none transition-colors ${
                            isHovered
                              ? 'bg-[#151C2C] text-[#C9B27C]'
                              : 'text-[#FCFBF8] hover:bg-[#151C2C]/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            {getCategoryIcon(cat.slug)}
                            <span className="truncate">{cat.name}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Col: Subcategories of Active Category */}
                  <div className="col-span-6 p-5 bg-[#151C2C]/40 flex flex-col justify-between">
                    {activeHoveredCat ? (
                      <div className="space-y-3">
                        <div className="pb-2.5 border-b border-[#B8B9BC]/15">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9B27C]">
                            Department Subcategories
                          </span>
                          <h4 className="font-luxury-serif text-base font-semibold text-[#FCFBF8] mt-0.5">
                            {activeHoveredCat.name}
                          </h4>
                        </div>

                        {(activeHoveredCat.subcategories || []).length > 0 ? (
                          <div className="grid grid-cols-1 gap-1.5">
                            {(activeHoveredCat.subcategories || []).map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setCategoriesDropdownOpen(false);
                                  navigate('category', {
                                    slug: activeHoveredCat.slug,
                                    subcategory: sub.slug || sub.id,
                                  });
                                }}
                                className="text-left px-3 py-2 rounded-lg text-xs text-[#B8B9BC] hover:text-[#FCFBF8] hover:bg-[#151C2C] flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <span>↳ {sub.name}</span>
                                <ChevronRight className="w-3 h-3 text-[#C9B27C]" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#B8B9BC]/70 py-4">
                            Explore all certified products in {activeHoveredCat.name}.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {activeHoveredCat && (
                      <button
                        onClick={() => {
                          setCategoriesDropdownOpen(false);
                          navigate('category', { slug: activeHoveredCat.slug });
                        }}
                        className="mt-4 w-full py-2.5 px-4 rounded-lg bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] text-[11px] font-semibold uppercase tracking-wider text-center transition-colors cursor-pointer"
                      >
                        View All {activeHoveredCat.name}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Primary Header Links */}
            <div className="flex items-center text-xs font-medium tracking-[0.08em] uppercase">
              <button
                onClick={() => navigate('home')}
                className={`px-3.5 py-3 hover:text-[#C9B27C] transition-colors cursor-pointer ${
                  currentRoute === 'home'
                    ? 'text-[#C9B27C] border-b-2 border-[#C9B27C]'
                    : 'text-[#FCFBF8]'
                }`}
              >
                Home
              </button>

              <button
                onClick={() => navigate('shop')}
                className={`px-3.5 py-3 hover:text-[#C9B27C] transition-colors cursor-pointer ${
                  currentRoute === 'shop'
                    ? 'text-[#C9B27C] border-b-2 border-[#C9B27C]'
                    : 'text-[#FCFBF8]'
                }`}
              >
                Products
              </button>

              <button
                onClick={() => {
                  navigate('deals');
                  window.location.hash = '#/deals';
                }}
                className={`px-3.5 py-3 hover:text-[#C9B27C] transition-colors cursor-pointer ${
                  currentRoute === 'deals'
                    ? 'text-[#C9B27C] border-b-2 border-[#C9B27C]'
                    : 'text-[#FCFBF8]'
                }`}
              >
                Deals
              </button>

              {visibleCategories.slice(0, 4).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate('category', { slug: cat.slug })}
                  className="px-3 py-3 text-[#B8B9BC] hover:text-[#C9B27C] transition-colors cursor-pointer hidden xl:inline-block truncate max-w-[130px]"
                >
                  {cat.name.replace(' Products & Equipment', '').replace(' Products', '')}
                </button>
              ))}

              <button
                onClick={() => navigate('solutions')}
                className={`px-3.5 py-3 hover:text-[#C9B27C] transition-colors cursor-pointer ${
                  currentRoute === 'solutions' || currentRoute === 'solution'
                    ? 'text-[#C9B27C] border-b-2 border-[#C9B27C]'
                    : 'text-[#C9B27C]'
                }`}
              >
                Build Solution
              </button>

              <button
                onClick={() => navigate('company', { slug: 'about-ma-group' })}
                className={`px-3.5 py-3 hover:text-[#C9B27C] transition-colors cursor-pointer ${
                  currentRoute === 'company' || currentRoute === 'about-us'
                    ? 'text-[#C9B27C] border-b-2 border-[#C9B27C]'
                    : 'text-[#FCFBF8]'
                }`}
              >
                Company Profile
              </button>

              <button
                onClick={() => navigate('contact-us')}
                className={`px-3.5 py-3 hover:text-[#C9B27C] transition-colors cursor-pointer ${
                  currentRoute === 'contact-us'
                    ? 'text-[#C9B27C] border-b-2 border-[#C9B27C]'
                    : 'text-[#FCFBF8]'
                }`}
              >
                Contact
              </button>
            </div>
          </div>

          {/* Right Quick Links */}
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => navigate('b2b-wholesale')}
              className="text-[#C9B27C] hover:text-[#FCFBF8] transition-colors cursor-pointer font-medium tracking-[0.1em] uppercase text-[11px]"
            >
              Request a Quote
            </button>
            <span className="text-[#B8B9BC]/30">|</span>
            <button
              onClick={() => navigate('account')}
              className="text-[#FCFBF8] hover:text-[#C9B27C] flex items-center gap-1.5 cursor-pointer transition-colors font-medium text-[11px] uppercase tracking-wider"
            >
              <span>{customerAccount ? 'My Account' : 'Sign In'}</span>
            </button>
            <span className="text-[#B8B9BC]/30">|</span>
            <button
              onClick={() => navigate('admin')}
              className="text-[#B8B9BC] hover:text-[#C9B27C] flex items-center gap-1.5 cursor-pointer transition-colors font-medium text-[11px] uppercase tracking-wider"
              title="Executive Admin Console"
            >
              <span>Admin</span>
            </button>
          </div>
        </div>
      </nav>

      {/* 4. Responsive Mobile Luxury Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D0E10] text-[#FCFBF8] px-5 py-6 border-t border-[#B8B9BC]/15 space-y-5 animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#B8B9BC]/15">
            <span className="font-luxury-serif text-[#C9B27C] text-xs tracking-[0.2em] uppercase">
              Showroom Navigation
            </span>
            <span className="text-[10px] text-[#B8B9BC] uppercase tracking-widest">
              COD Nationwide
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('home');
              }}
              className="text-left py-2.5 px-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] hover:text-[#0D0E10] text-[#FCFBF8] font-medium transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('shop');
              }}
              className="text-left py-2.5 px-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] hover:text-[#0D0E10] text-[#FCFBF8] font-medium transition-colors"
            >
              All Products
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('cart');
              }}
              className="text-left py-2.5 px-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] hover:text-[#0D0E10] text-[#C9B27C] font-medium transition-colors"
            >
              Shopping Cart ({cartItemCount})
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('track-order');
              }}
              className="text-left py-2.5 px-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] hover:text-[#0D0E10] text-[#FCFBF8] font-medium transition-colors"
            >
              Track Order
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('account');
              }}
              className="text-left py-2.5 px-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] hover:text-[#0D0E10] text-[#FCFBF8] font-medium transition-colors"
            >
              {customerAccount ? 'My Account' : 'Sign In / Sign Up'}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('solutions');
              }}
              className="text-left py-2.5 px-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] hover:text-[#0D0E10] text-[#C9B27C] font-medium transition-colors"
            >
              Build Your Solution
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('company', { slug: 'about-ma-group' });
              }}
              className="text-left py-2.5 px-3.5 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] hover:text-[#0D0E10] text-[#FCFBF8] font-medium transition-colors"
            >
              Company Profile
            </button>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#B8B9BC]/15">
            <div className="text-[10px] text-[#C9B27C] uppercase tracking-[0.18em]">
              Categories & Subcategories
            </div>
            <div className="space-y-2 text-xs">
              {visibleCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-lg border border-[#B8B9BC]/15 p-3 bg-[#151C2C]/40 space-y-2"
                >
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('category', { slug: cat.slug });
                    }}
                    className="w-full text-left font-semibold text-[#FCFBF8] hover:text-[#C9B27C] flex items-center justify-between"
                  >
                    <span>{cat.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#C9B27C]" />
                  </button>
                  {(cat.subcategories || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(cat.subcategories || []).map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate('category', {
                              slug: cat.slug,
                              subcategory: sub.slug || sub.id,
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-[#0D0E10] text-[11px] text-[#B8B9BC] hover:text-[#C9B27C] border border-[#B8B9BC]/15"
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#B8B9BC]/15 flex items-center justify-between gap-2 text-xs">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('b2b-wholesale');
              }}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[#C9B27C] text-[#0D0E10] font-semibold text-center uppercase tracking-wider"
            >
              Request a Quote
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('admin');
              }}
              className="py-2.5 px-4 rounded-lg border border-[#C9B27C]/40 text-[#C9B27C] font-medium"
            >
              Admin Portal
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
