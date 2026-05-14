import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { ITEMS_QUERY } from '../../api/graphql/product/product-queries';
import { Modal } from '../common/Modal';
import type { ProductSearchInput, Item } from '../../api/graphql/product/product-queries';

interface SearchProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

export function SearchProductModal({ isOpen, onClose, shopId }: SearchProductModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Ensure minimum loading time of 300ms to prevent flashing
  useEffect(() => {
    if (debouncedSearchTerm && isOpen) {
      setMinLoadingTimeElapsed(false);
      const timer = setTimeout(() => {
        setMinLoadingTimeElapsed(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [debouncedSearchTerm, isOpen]);

  const { data, loading } = useQuery<{
    items: {
      success: boolean;
      message: string;
      data: Item[];
    };
  }>(ITEMS_QUERY, {
    variables: {
      input: {
        query: debouncedSearchTerm,
        shopId,
        isActive: true,
        limit: 10,
      } as ProductSearchInput,
    },
    skip: !isOpen || !shopId || !debouncedSearchTerm.trim(),
    fetchPolicy: 'network-only',
  });

  const items = data?.items?.data || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Products" maxWidth="lg">
      <div className="flex flex-col">
        {/* Search input */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for products..."
            className="w-full px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="h-[400px] overflow-y-auto p-4">
          {loading || !minLoadingTimeElapsed ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : searchTerm && items.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              <p>No products found for "{searchTerm}"</p>
            </div>
          ) : !searchTerm ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              <p>Type a product name to search</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  {item.coverPhoto ? (
                    <img
                      src={item.coverPhoto}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {item.category}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        ₱{item.price.toFixed(2)}
                      </p>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        • Stock: {item.stock}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
