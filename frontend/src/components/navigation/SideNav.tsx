import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { clearSideNavContent } from '../../store';

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation?: {
    name: string;
    lat: number;
    lng: number;
    type: 'store' | 'location';
    description?: string;
    image?: string;
    address?: string;
    phone?: string;
    hours?: string;
  };
}

export function SideNav({ isOpen, onClose, selectedLocation }: SideNavProps) {
  const dispatch = useDispatch();
  const sideNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen && selectedLocation) {
      // Clear content after 300ms (animation duration)
      const timer = setTimeout(() => {
        dispatch(clearSideNavContent());
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedLocation, dispatch]);

  return (
    <>
      {/* Side Navigation - LEFT SIDE with FIXED WIDTH - ANIMATED */}
      <div 
        ref={sideNavRef}
        className="fixed top-0 left-0 h-full w-80 max-w-sm bg-white dark:bg-zinc-900 shadow-2xl z-50"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          willChange: 'transform'
        }}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedLocation?.type === 'store' ? 'Store Details' : 'Location Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedLocation ? (
            <div className="space-y-6">
              {/* Image */}
              <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                {selectedLocation.image ? (
                  <img 
                    src={selectedLocation.image} 
                    alt={selectedLocation.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                    {selectedLocation.type === 'store' ? '🏪' : '📍'}
                    <span className="ml-2">No image available</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedLocation.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                    {selectedLocation.type === 'store' ? 'Store' : 'Location'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedLocation.description && (
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Description</h4>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {selectedLocation.description}
                  </p>
                </div>
              )}

              {/* Address */}
              {selectedLocation.address && (
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Address</h4>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {selectedLocation.address}
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-3">
                {selectedLocation.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      📞
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">Phone</p>
                      <p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.phone}</p>
                    </div>
                  </div>
                )}

                {selectedLocation.hours && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      🕐
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">Hours</p>
                      <p className="text-zinc-600 dark:text-zinc-400">{selectedLocation.hours}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Coordinates */}
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Coordinates</h4>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                  <p>Latitude: {selectedLocation.lat.toFixed(6)}</p>
                  <p>Longitude: {selectedLocation.lng.toFixed(6)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <button className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium">
                  Get Directions
                </button>
                <button className="w-full py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium">
                  Share Location
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-zinc-500 dark:text-zinc-400">
                <div className="text-4xl mb-2">📍</div>
                <p>No location selected</p>
                <p className="text-sm mt-1">Click on a store or search result to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
