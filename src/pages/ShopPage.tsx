import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/common/ProductCard';
import {
  SlidersHorizontal,
  X,
  Star,
  Check,
  Search,
  RotateCcw,
} from 'lucide-react';

export const ShopPage: React.FC = () => {
  const { products, categories, brands, routeParams } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>(routeParams.category || 'all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(400000);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category
        if (selectedCategory !== 'all') {
          if (p.categoryId !== selectedCategory && p.slug !== selectedCategory) {
            return false;
          }
        }
        // Brand
        if (selectedBrand !== 'all') {
          if (p.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
            return false;
          }
        }
        // Price
        const effectivePrice = p.salePrice || p.price;
        if (effectivePrice > priceRange) {
          return false;
        }
        // In Stock
        if (onlyInStock && p.stock <= 0) {
          return false;
        }
        // Rating
        if (minRating > 0 && p.rating < minRating) {
          return false;
        }
        // Search
        if (localSearch.trim()) {
          const q = localSearch.toLowerCase();
          const match =
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q);
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
        return 0; // featured default
      });
  }, [products, selectedCategory, selectedBrand, priceRange, onlyInStock, minRating, sortBy, localSearch]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setPriceRange(400000);
    setOnlyInStock(false);
    setMinRating(0);
    setLocalSearch('');
    setSortBy('featured');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedBrand !== 'all' ||
    priceRange < 400000 ||
    onlyInStock ||
    minRating > 0 ||
    localSearch.trim() !== '';

  return (
    <div className="bg-neutral-50 py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              M.A. Equipment Catalog
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Showing {filteredProducts.length} certified products across Pakistan with 100% Cash on Delivery.
            </p>
          </div>

          {/* Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-bold text-neutral-800"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500 font-medium hidden sm:inline">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-amber-500 cursor-pointer"
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
            <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                  Filter Products
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Keyword Search */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Search In Catalog
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search keywords..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
                  Categories
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto text-xs pr-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-neutral-900 text-amber-400 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-100'
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
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                          selectedCategory === c.id
                            ? 'bg-neutral-900 text-amber-400 font-bold'
                            : 'text-neutral-600 hover:bg-neutral-100 font-medium'
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
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
                  Brands
                </label>
                <div className="space-y-1 max-h-40 overflow-y-auto text-xs pr-1">
                  <button
                    onClick={() => setSelectedBrand('all')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      selectedBrand === 'all'
                        ? 'bg-neutral-900 text-amber-400 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    All Brands
                  </button>
                  {brands.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBrand(b.name)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors truncate ${
                        selectedBrand.toLowerCase() === b.name.toLowerCase()
                          ? 'bg-neutral-900 text-amber-400 font-bold'
                          : 'text-neutral-600 hover:bg-neutral-100 font-medium'
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
                  <span className="font-bold text-neutral-700 uppercase tracking-wider">Max Price</span>
                  <span className="font-extrabold text-amber-700">Rs. {priceRange.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="400000"
                  step="5000"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400">
                  <span>Rs. 2,000</span>
                  <span>Rs. 400,000</span>
                </div>
              </div>

              {/* In Stock Toggle */}
              <div className="pt-2 border-t border-neutral-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Show In-Stock Only</span>
                </label>
              </div>

              {/* Min Rating */}
              <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
                  Customer Rating
                </label>
                <div className="flex items-center gap-2">
                  {[4, 3, 0].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => setMinRating(stars)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                        minRating === stars
                          ? 'bg-neutral-900 text-amber-400 border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
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
              <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">No matching products found</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Try adjusting your filters, searching for a different term, or resetting your filter criteria.
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-neutral-900 text-amber-400 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
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
