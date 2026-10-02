import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
} from 'lucide-react';

export const ShopPage: React.FC = () => {
  const { products, categories, brands, routeParams } = useStore();

  // Search & Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(routeParams.category || 'all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(400000);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [localSearch, setLocalSearch] = useState<string>(routeParams.search || '');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync routeParams if URL changes
  useEffect(() => {
    if (routeParams.category) setSelectedCategory(routeParams.category);
    if (routeParams.search) setLocalSearch(routeParams.search);
  }, [routeParams]);

  // Reset Filters
  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setPriceRange(400000);
    setSortBy('featured');
    setOnlyInStock(false);
    setMinRating(0);
    setLocalSearch('');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedBrand !== 'all' ||
    priceRange < 400000 ||
    onlyInStock ||
    minRating > 0 ||
    localSearch.trim().length > 0;

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Status filter: only active products in customer storefront
        if (p.status === 'archived' || p.status === 'inactive') return false;

        // Category
        if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;

        // Brand
        if (selectedBrand !== 'all' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;

        // Price
        const effectivePrice = p.salePrice || p.price;
        if (effectivePrice > priceRange) return false;

        // In Stock
        if (onlyInStock && p.stock <= 0) return false;

        // Rating
        if (minRating > 0 && p.rating < minRating) return false;

        // Keyword Search
        if (localSearch.trim()) {
          const q = localSearch.toLowerCase();
          const match =
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.categoryName.toLowerCase().includes(q) ||
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
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        // default 'featured'
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, selectedCategory, selectedBrand, priceRange, onlyInStock, minRating, localSearch, sortBy]);

  return (
    <div className="bg-[#0B0D10] text-[#F8FAFC] py-8 sm:py-12 border-b border-[#1A1D23] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Top Header & Sort Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#1A1D23]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              M.A. Equipment Catalog
            </h1>
            <p className="text-xs text-[#6B7280] mt-1">
              Showing {filteredProducts.length} certified products across Pakistan with 100% Cash on Delivery.
            </p>
          </div>

          {/* Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111318] border border-[#2B3038] text-xs font-bold text-white hover:border-[#2563EB]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#3B82F6]" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6B7280] font-medium hidden sm:inline">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#111318] border border-[#2B3038] rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#2563EB] cursor-pointer"
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

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-6">
            <div className="bg-[#111318] rounded-2xl p-5 border border-[#2B3038] shadow-lg space-y-6 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#1A1D23]">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#3B82F6]" />
                  Filter Products
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-[11px] font-bold text-[#3B82F6] hover:text-[#2563EB] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Keyword Search */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                  Search In Catalog
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search keywords..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#0B0D10] border border-[#2B3038] text-white rounded-lg focus:outline-none focus:border-[#2563EB]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                  Categories
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto text-xs pr-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedCategory === 'all'
                        ? 'bg-[#2563EB] text-white font-bold'
                        : 'text-[#E5E7EB] hover:bg-[#1A1D23]'
                    }`}
                  >
                    All Categories ({products.length})
                  </button>
                  {categories.map((c) => {
                    const count = products.filter((p) => p.categoryId === c.id).length;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                          selectedCategory === c.id
                            ? 'bg-[#2563EB] text-white font-bold'
                            : 'text-[#E5E7EB] hover:bg-[#1A1D23] font-medium'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brands */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                  Brands
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto text-xs pr-1">
                  <button
                    onClick={() => setSelectedBrand('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedBrand === 'all'
                        ? 'bg-[#2563EB] text-white font-bold'
                        : 'text-[#E5E7EB] hover:bg-[#1A1D23]'
                    }`}
                  >
                    All Brands
                  </button>
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBrand(b.name)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors truncate cursor-pointer ${
                        selectedBrand.toLowerCase() === b.name.toLowerCase()
                          ? 'bg-[#2563EB] text-white font-bold'
                          : 'text-[#E5E7EB] hover:bg-[#1A1D23] font-medium'
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
                  <span className="font-bold text-[#6B7280] uppercase tracking-wider">Max Price</span>
                  <span className="font-extrabold text-[#3B82F6]">Rs. {priceRange.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="400000"
                  step="5000"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#6B7280]">
                  <span>Rs. 2,000</span>
                  <span>Rs. 400,000</span>
                </div>
              </div>

              {/* In Stock Toggle */}
              <div className="pt-2 border-t border-[#1A1D23]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#E5E7EB]">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="accent-[#2563EB] rounded cursor-pointer"
                  />
                  <span>Show In-Stock Only</span>
                </label>
              </div>

              {/* Min Rating */}
              <div className="pt-2 border-t border-[#1A1D23] space-y-1.5">
                <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                  Customer Rating
                </label>
                <div className="flex items-center gap-2">
                  {[4, 3, 0].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setMinRating(stars)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        minRating === stars
                          ? 'bg-[#2563EB] text-white border-[#3B82F6]'
                          : 'bg-[#0B0D10] text-[#E5E7EB] border-[#2B3038] hover:border-[#3B82F6]'
                      }`}
                    >
                      {stars === 0 ? 'All' : `${stars}+ Stars`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3 space-y-6">
            {filteredProducts.length === 0 ? (
              <div className="bg-[#111318] rounded-2xl p-12 text-center border border-[#2B3038] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#1A1D23] text-[#6B7280] mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6 text-[#3B82F6]" />
                </div>
                <h3 className="text-base font-bold text-white">No matching products found</h3>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                  Try adjusting your filters, searching for a different term, or resetting your filter criteria.
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors shadow-md shadow-blue-500/20"
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
