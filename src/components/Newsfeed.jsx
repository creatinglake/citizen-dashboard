import React, { useEffect, useRef, useState } from 'react';
import { FeedItem } from './FeedItem';
import { useFeedContext } from '../context/FeedContext.jsx';
import { useIsMobile } from '../hooks/useMediaQuery';
import { ChevronDownIcon } from './Icons';
import { MobileBrandHeader } from './MobileBrandHeader';

export function Newsfeed({ selectedHub, onViewInHub, onSelectHub, onSelectAll }) {
  const isMobile = useIsMobile();
  const [isHubMenuOpen, setIsHubMenuOpen] = useState(false);
  const hubMenuRef = useRef(null);
  const { items: allItems, itemsForHub, hubs } = useFeedContext();
  const items = selectedHub ? itemsForHub(selectedHub) : allItems;
  const unreadCount = items.filter(item => !item.isRead).length;
  const totalCount = items.length;
  const selectedHubData = selectedHub ? hubs.find((hub) => hub.id === selectedHub) : null;

  useEffect(() => {
    if (!isHubMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!hubMenuRef.current?.contains(event.target)) {
        setIsHubMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isHubMenuOpen]);

  // Count civic opportunities (actions, votes, meetings, events happening soon)
  const opportunities = items.filter(item =>
    ['action', 'vote', 'meeting', 'event', 'poll', 'hearing'].includes(item.type) && !item.isRead
  ).length;

  return (
    <div className="h-full flex flex-col">
      {/* Feed Header */}
      {isMobile ? (
        <MobileBrandHeader title="Feed" subtitle={`${unreadCount} new · ${totalCount} total`}>
          <div className="w-full">
            <label htmlFor="mobile-feed-hub-filter" className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Showing
            </label>
            <div ref={hubMenuRef} className="relative">
              <button
                id="mobile-feed-hub-filter"
                type="button"
                onClick={() => setIsHubMenuOpen((open) => !open)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm"
                aria-expanded={isHubMenuOpen}
                aria-haspopup="listbox"
              >
                <span className="block pr-8 text-[1.02rem] font-medium text-civic-green">
                  {selectedHubData?.name || 'All Hubs'}
                </span>
                <ChevronDownIcon
                  size={18}
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${
                    isHubMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isHubMenuOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <div className="py-2" role="listbox" aria-labelledby="mobile-feed-hub-filter">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectAll?.();
                        setIsHubMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-[1.02rem] ${
                        !selectedHub
                          ? 'bg-civic-green/6 font-semibold text-civic-green'
                          : 'text-gray-700'
                      }`}
                    >
                      <span>All Hubs</span>
                      {!selectedHub && <span className="text-civic-green">✓</span>}
                    </button>

                    {hubs.map((hub) => {
                      const isSelected = selectedHub === hub.id;
                      return (
                        <button
                          key={hub.id}
                          type="button"
                          onClick={() => {
                            onSelectHub?.(hub.id);
                            setIsHubMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-[1.02rem] ${
                            isSelected
                              ? 'bg-civic-green/6 font-semibold text-civic-green'
                              : 'text-gray-700'
                          }`}
                        >
                          <span>{hub.name}</span>
                          {isSelected && <span className="text-civic-green">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </MobileBrandHeader>
      ) : (
        <div className="px-10 py-8 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-heading font-semibold text-gray-900">
                {selectedHubData?.name || 'All Updates'}
              </h2>
              <p className="text-sm text-gray-400 mt-1.5">
                {unreadCount} new &middot; {totalCount} total
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Civic Opportunities Banner */}
      {!selectedHub && opportunities > 0 && (
        <div className={`${isMobile ? 'mx-4 mt-4 px-4 py-3.5' : 'mx-8 mt-6 px-5 py-4'} bg-civic-green/5 border border-civic-green/15 rounded-xl`}>
          <p className="text-sm font-medium text-civic-green">
            You have {opportunities} civic {opportunities === 1 ? 'opportunity' : 'opportunities'} this week.
          </p>
        </div>
      )}

      {/* Feed Content */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? 'px-4 py-4' : 'px-8 py-6'}`}>
        <div className={isMobile ? 'space-y-4' : 'space-y-5'}>
          {items.length > 0 ? (
            items.map((item) => (
              <FeedItem
                key={item.id}
                item={item}
                onViewInHub={onViewInHub}
              />
            ))
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No updates from this hub yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
