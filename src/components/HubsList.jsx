import React from 'react';
import { HubIcon, ChevronRightIcon, ExternalLinkIcon } from './Icons';
import { hubColors } from '../data/mockData';
import { LIVE_HUB_COLORS } from '../config';
import { useFeedContext } from '../context/FeedContext.jsx';
import { useIsMobile } from '../hooks/useMediaQuery';
import { MobileBrandHeader } from './MobileBrandHeader';

const hubTypeLabels = {
  live: 'Live Sources',
  jurisdiction: 'Jurisdictions',
  issue: 'Issues',
  organization: 'Organizations',
};

const hubTypeOrder = ['live', 'jurisdiction', 'issue', 'organization'];

export function HubsList({ onSelectHub, onOpenLive }) {
  const isMobile = useIsMobile();
  const { hubs: allHubs } = useFeedContext();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      {isMobile ? (
        <MobileBrandHeader title="My Civic Hubs" subtitle={`${allHubs.length} hubs you follow`} />
      ) : (
        <div className="px-6 py-5 border-b border-civic-green/10 bg-civic-cream/50">
          <h2 className="text-2xl font-heading font-semibold text-civic-green">
            My Civic Hubs
          </h2>
          <p className="text-sm text-civic-green/60 mt-1">
            {allHubs.length} hubs you follow
          </p>
        </div>
      )}

      {/* Hubs List */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-4'}`}>
        {hubTypeOrder.map((type) => {
          const hubs = allHubs.filter((hub) => hub.type === type);
          if (hubs.length === 0) return null;
          return (
            <div key={type} className="mb-4">
              <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {hubTypeLabels[type]}
              </h3>
              <div className="space-y-2">
                {hubs.map((hub) => {
                  const colors = hubColors[hub.id] || LIVE_HUB_COLORS[hub.id] || { bg: '#F5F5F5', text: '#666' };
                  return (
                    <button
                      key={hub.id}
                      onClick={() => onSelectHub(hub.id)}
                      className="w-full card p-4 flex items-center gap-4 text-left hover:bg-civic-teal/5 transition-colors"
                    >
                      <div
                        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        <HubIcon icon={hub.icon} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-civic-green truncate">
                          {hub.name}
                        </h3>
                        {hub.unreadCount > 0 && (
                          <p className="text-sm text-civic-rust mt-0.5">
                            {hub.unreadCount} new updates
                          </p>
                        )}
                      </div>
                      {hub.live && hub.homeUrl && onOpenLive && (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Open ${hub.name}`}
                          title={`Open ${hub.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLive(hub.name, hub.homeUrl);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onOpenLive(hub.name, hub.homeUrl);
                            }
                          }}
                          className="flex-shrink-0 p-2 rounded-md text-civic-green/40 hover:text-civic-green hover:bg-civic-green/10 transition-colors"
                        >
                          <ExternalLinkIcon size={16} />
                        </span>
                      )}
                      <ChevronRightIcon size={20} className="text-civic-green/40" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
