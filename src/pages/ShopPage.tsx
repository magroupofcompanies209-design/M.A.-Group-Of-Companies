import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import { Search, SlidersHorizontal, X, RotateCcw, ChevronRight } from 'lucide-react';

export const ShopPage: React.FC = () => {
  const { visibleProducts, visibleCategories, brands, routeParams, currentRoute } = useStore();

  const maxCatalogPrice = useMemo(() => {
    const highest = visibleProducts.reduce(
      (max, p) => Math.max(max, p.salePrice || p.price || 0),
      0
    );
    return Math.max(500000, Math.ceil(highest / 10000) * 10000);
  }, [visibleProducts]);

  const [selectedCategory, setSelectedCategory] = useState<string>(
    routeParams.category || routeParams.slug || 'all'
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    routeParams.subcategory || 'all'
  );
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(10000000);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [localSearch, setLocalSearch] = useState<string>(routeParams.search || '');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    if (routeParams.category || routeParams.slug) {
      setSelectedCategory(routeParams.category || routeParams.slug);
    } else {
      setSelectedCategory('all');
    }
    if (routeParams.subcategory) {
      setSelectedSubcategory(routeParams.subcategory);
    } else {
      setSelectedSubcategory('all');
    }
    if (routeParams.search) setLocalSearch(routeParams.search);
  }, [routeParams]);

  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return (
      visibleCategories.find(
        (c) =>
          c.id === selectedCategory ||
          c.slug.toLowerCase() === selectedCategory.toLowerCase() ||
          c.name.toLowerCase() === selectedCategory.toLowerCase()
      ) || null
    );
  }, [visibleCategories, selectedCategory]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedBrand('all');
    setPriceRange(maxCatalogPrice);
    setSortBy('featured');
    setOnlyInStock(false);
    setMinRating(0);
    setLocalSearch('');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedSubcategory !== 'all' ||
    selectedBrand !== 'all' ||
    priceRange < maxCatalogPrice ||
    onlyInStock ||
    minRating > 0 ||
    localSearch.trim().length > 0;

  const filteredProducts = useMemo(() => {
    return visibleProducts
      .filter((p) => {
        if (currentRoute === 'deals' && (!p.salePrice || p.salePrice >= p.price)) {
          return false;
        }
        if (currentRoute === 'new-arrivals' && !p.isNewArrival) {
          return false;
        }
        if (currentRoute === 'bestsellers' && !p.isBestSeller) {
          return false;
        }

        if (selectedCategory !== 'all') {
          const matchesCat =
            p.categoryId === selectedCategory ||
            (activeCategoryObj &&
              (p.categoryId === activeCategoryObj.id ||
                p.categoryId.toLowerCase() === activeCategoryObj.slug.toLowerCase() ||
                (p.categoryName &&
                  p.categoryName.toLowerCase() === activeCategoryObj.name.toLowerCase()))) ||
            (p.categoryName && p.categoryName.toLowerCase() === selectedCategory.toLowerCase());
          if (!matchesCat) return false;
        }

        if (selectedSubcategory !== 'all') {
          const subLower = selectedSubcategory.toLowerCase();
          const activeSubObj = (activeCategoryObj?.subcategories || []).find(
            (s) =>
              s.id.toLowerCase() === subLower ||
              s.slug.toLowerCase() === subLower ||
              s.name.toLowerCase() === subLower
          );
          const matchesSub =
            (p.subcategoryId &&
              (p.subcategoryId.toLowerCase() === subLower ||
                (activeSubObj && p.subcategoryId === activeSubObj.id))) ||
            (p.subcategoryName &&
              (p.subcategoryName.toLowerCase() === subLower ||
                (activeSubObj &&
                  p.subcategoryName.toLowerCase() === activeSubObj.name.toLowerCase()))) ||
            (activeSubObj &&
              `${p.name} ${p.shortDescription || ''} ${p.description || ''}`
                .toLowerCase()
                .includes(activeSubObj.name.toLowerCase().replace(/s$/, '')));
          if (!matchesSub) return false;
        }

        if (selectedBrand !== 'all' && p.brand.toLowerCase() !== selectedBrand.toLowerCase())
          return false;

        const effectivePrice = p.salePrice || p.price;
        if (effectivePrice > Math.max(priceRange, maxCatalogPrice)) return false;
        if (priceRange < maxCatalogPrice && effectivePrice > priceRange) return false;

        if (onlyInStock && p.stock <= 0) return false;

        if (minRating > 0 && p.rating < minRating) return false;

        if (localSearch.trim()) {
          const q = localSearch.toLowerCase();
          const match =
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
            (p.subcategoryName && p.subcategoryName.toLowerCase().includes(q)) ||
            (p.shortDescription && p.shortDescription.toLowerCase().includes(q));
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.salePrice || a.price;
        const priceB = b.salePrice || b.price;

        if (sortBy === 'price-low') return priceA - priceB;
        if (sortBy === 'price-high') return priceB - priceA;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'newest')
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [
    visibleProducts,
    activeCategoryObj,
    currentRoute,
    selectedCategory,
    selectedSubcategory,
    selectedBrand,
    priceRange,
    maxCatalogPrice,
    onlyInStock,
    minRating,
    localSearch,
    sortBy,
  ]);

  const filterSidebarContent = (
    <div className="bg-[#FCFBF8] rounded-2xl p-6 border border-[#B8B9BC]/40 shadow-sm space-y-6 text-[#292B30]">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#B8B9BC]/30">
        <span className="font-luxury-serif text-sm font-semibold uppercase tracking-[0.14em] text-[#0D0E10] flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#A98B52]" />
          <span>Refine Selection</span>
        </span>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-[11px] font-semibold text-[#A98B52] hover:text-[#0D0E10] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Keyword Search */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-[#292B30]/70 uppercase tracking-[0.14em]">
          Search In Catalog
        </label>
        <div className="relative">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search name, SKU, brand..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-[#F7F3EA] border border-[#B8B9BC]/40 text-[#0D0E10] rounded-lg focus:outline-none focus:border-[#C9B27C]"
          />
          <Search className="w-3.5 h-3.5 text-[#A98B52] absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Categories & Subcategories Hierarchy */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-[#292B30]/70 uppercase tracking-[0.14em] block">
          Categories & Subcategories
        </label>
        <div className="space-y-1 max-h-80 overflow-y-auto text-xs pr-1">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSubcategory('all');
            }}
            className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#151C2C] text-[#FCFBF8] font-semibold'
                : 'text-[#292B30] hover:bg-[#F7F3EA]'
            }`}
          >
            All Collections ({visibleProducts.length})
          </button>

          {visibleCategories.map((c) => {
            const count = visibleProducts.filter(
              (p) =>
                p.categoryId === c.id ||
                p.categoryId.toLowerCase() === c.slug.toLowerCase() ||
                (p.categoryName && p.categoryName.toLowerCase() === c.name.toLowerCase())
            ).length;
            const isSel =
              selectedCategory === c.id ||
              selectedCategory.toLowerCase() === c.slug.toLowerCase() ||
              selectedCategory.toLowerCase() === c.name.toLowerCase();

            return (
              <div key={c.id} className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedCategory(c.id);
                    setSelectedSubcategory('all');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                    isSel
                      ? 'bg-[#151C2C] text-[#FCFBF8] font-semibold'
                      : 'text-[#292B30] hover:bg-[#F7F3EA] font-medium'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>

                {/* Render Subcategories when Category is selected */}
                {isSel && (c.subcategories || []).length > 0 && (
                  <div className="pl-4 space-y-1 py-1 border-l-2 border-[#C9B27C]/40 ml-3">
                    <button
                      onClick={() => setSelectedSubcategory('all')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                        selectedSubcategory === 'all'
                          ? 'bg-[#C9B27C]/25 text-[#0D0E10] font-bold'
                          : 'text-[#292B30]/75 hover:bg-[#F7F3EA]'
                      }`}
                    >
                      All {c.name.split(' ')[0]}
                    </button>
                    {(c.subcategories || []).map((sub) => {
                      const isSubSel =
                        selectedSubcategory.toLowerCase() === sub.id.toLowerCase() ||
                        selectedSubcategory.toLowerCase() === sub.slug.toLowerCase() ||
                        selectedSubcategory.toLowerCase() === sub.name.toLowerCase();
                      return (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubcategory(sub.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isSubSel
                              ? 'bg-[#151C2C] text-[#C9B27C] font-semibold'
                              : 'text-[#292B30]/80 hover:bg-[#F7F3EA]'
                          }`}
                        >
                          <span>↳</span>
                          <span className="truncate">{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Brands */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-[#292B30]/70 uppercase tracking-[0.14em] block">
          Manufacturer Brands
        </label>
        <div className="space-y-1 max-h-44 overflow-y-auto text-xs pr-1">
          <button
            onClick={() => setSelectedBrand('all')}
            className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              selectedBrand === 'all'
                ? 'bg-[#151C2C] text-[#FCFBF8] font-semibold'
                : 'text-[#292B30] hover:bg-[#F7F3EA]'
            }`}
          >
            All Partners
          </button>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBrand(b.name)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors truncate cursor-pointer ${
                selectedBrand.toLowerCase() === b.name.toLowerCase()
                  ? 'bg-[#151C2C] text-[#FCFBF8] font-semibold'
                  : 'text-[#292B30] hover:bg-[#F7F3EA] font-medium'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-[#292B30]/70 uppercase tracking-[0.14em]">
            Max Price
          </span>
          <span className="font-bold text-[#A98B52]">Rs. {priceRange.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min="2000"
          max={maxCatalogPrice}
          step="5000"
          value={Math.min(priceRange, maxCatalogPrice)}
          onChange={(e) => setPriceRange(Number(e.target.value))}
          className="w-full accent-[#151C2C] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#292B30]/60">
          <span>Rs. 2,000</span>
          <span>Rs. {maxCatalogPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* In Stock Toggle */}
      <div className="pt-3 border-t border-[#B8B9BC]/30">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#292B30]">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="accent-[#151C2C] rounded cursor-pointer"
          />
          <span>Show In-Stock Only</span>
        </label>
      </div>

      {/* Min Rating */}
      <div className="pt-3 border-t border-[#B8B9BC]/30 space-y-2">
        <label className="text-[11px] font-semibold text-[#292B30]/70 uppercase tracking-[0.14em] block">
          Minimum Rating
        </label>
        <div className="flex items-center gap-2">
          {[4, 3, 0].map((stars) => (
            <button
              key={stars}
              onClick={() => setMinRating(stars)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                minRating === stars
                  ? 'bg-[#151C2C] text-[#FCFBF8] border-[#151C2C]'
                  : 'bg-[#F7F3EA] text-[#292B30] border-[#B8B9BC]/40 hover:border-[#C9B27C]'
              }`}
            >
              {stars === 0 ? 'All' : `${stars}+ Stars`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F7F3EA] text-[#292B30] py-10 sm:py-14 border-b border-[#B8B9BC]/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Top Header & Sort Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#B8B9BC]/35">
          <div>
            <div className="text-[11px] font-semibold text-[#A98B52] uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
              <span>M.A. GROUP OF COMPANIES</span>
              {activeCategoryObj && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span>{activeCategoryObj.name}</span>
                </>
              )}
            </div>
            <h1 className="font-luxury-serif text-2xl sm:text-4xl font-semibold text-[#0D0E10] tracking-tight">
              {currentRoute === 'deals'
                ? 'Exclusive Showroom Deals'
                : activeCategoryObj
                ? activeCategoryObj.name
                : 'Showroom Collection'}
            </h1>
            <p className="text-xs text-[#292B30]/70 mt-1">
              Showing {filteredProducts.length} certified products across Pakistan with 100% Cash on Delivery.
            </p>
          </div>

          {/* Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#FCFBF8] border border-[#B8B9BC]/40 text-xs font-semibold text-[#0D0E10] hover:border-[#C9B27C]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#A98B52]" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#292B30]/70 font-medium hidden sm:inline">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#FCFBF8] border border-[#B8B9BC]/40 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-[#0D0E10] focus:outline-none focus:border-[#C9B27C] cursor-pointer"
              >
                <option value="featured">Featured / Best Match</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subcategory Quick Pills when a Category is selected */}
        {activeCategoryObj && (activeCategoryObj.subcategories || []).length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedSubcategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                selectedSubcategory === 'all'
                  ? 'bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 shadow-xs'
                  : 'bg-[#FCFBF8] text-[#292B30] border border-[#B8B9BC]/40 hover:border-[#C9B27C]'
              }`}
            >
              All {activeCategoryObj.name}
            </button>
            {(activeCategoryObj.subcategories || []).map((sub) => {
              const isSubActive =
                selectedSubcategory.toLowerCase() === sub.id.toLowerCase() ||
                selectedSubcategory.toLowerCase() === sub.slug.toLowerCase() ||
                selectedSubcategory.toLowerCase() === sub.name.toLowerCase();
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                    isSubActive
                      ? 'bg-[#151C2C] text-[#C9B27C] border border-[#C9B27C]/40 shadow-xs'
                      : 'bg-[#FCFBF8] text-[#292B30] border border-[#B8B9BC]/40 hover:border-[#C9B27C]'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile Filter Drawer */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              onClick={() => setMobileFilterOpen(false)}
              className="fixed inset-0 bg-[#0D0E10]/60 backdrop-blur-xs"
            />
            <div className="relative z-10 w-80 max-w-full bg-[#FCFBF8] h-full overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-luxury-serif font-semibold text-base text-[#0D0E10]">
                  Filter Collection
                </span>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1.5 rounded-lg text-[#292B30] hover:bg-[#F7F3EA]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {filterSidebarContent}
            </div>
          </div>
        )}

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-6">{filterSidebarContent}</aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3 space-y-6">
            {filteredProducts.length === 0 ? (
              <div className="bg-[#FCFBF8] rounded-2xl p-14 text-center border border-[#B8B9BC]/40 space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#F7F3EA] text-[#A98B52] mx-auto flex items-center justify-center border border-[#B8B9BC]/30">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-luxury-serif text-lg font-semibold text-[#0D0E10]">
                  No Matching Products Found
                </h3>
                <p className="text-xs text-[#292B30]/70 max-w-sm mx-auto">
                  Try adjusting your filter criteria, selecting another subcategory, or resetting your filters.
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
