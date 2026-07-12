import React from 'react';
import { HubIcon, ExternalLinkIcon } from './Icons';
import { hubColors } from '../data/mockData';
import { LIVE_HUB_COLORS } from '../config';
import { useFeedContext } from '../context/FeedContext.jsx';
import civicLogo from '../assets/CivicSocial Logo SVG.svg';

const hubTypeLabels = {
  jurisdiction: 'Jurisdictions',
  representative: 'Representatives',
  issue: 'Issues',
  organization: 'Organizations',
};

const hubTypeOrder = ['jurisdiction', 'representative', 'issue', 'organization'];

export function Sidebar({ selectedHub, onSelectHub, onSelectAll, onOpenLive }) {
  const { hubs, totalUnread } = useFeedContext();

  return (
    <aside className="w-full h-full bg-white flex flex-col">
      {/* Header with Logo */}
      <div className="px-8 pt-10 pb-8 border-b border-gray-100">
        <img src={civicLogo} alt="Civic.Social" className="h-12 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-7 pt-8 pb-6 overflow-y-auto">
        {/* All Updates */}
        <button
          onClick={onSelectAll}
          className={`w-full text-left px-5 py-4 rounded-xl mb-4 transition-all flex items-center justify-between ${
            selectedHub === null
              ? 'bg-civic-green text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="font-semibold text-sm">All Updates</span>
          {totalUnread > 0 && (
            <span className={`text-sm font-semibold ${
              selectedHub === null ? 'text-white/80' : 'text-gray-400'
            }`}>
              {totalUnread}
            </span>
          )}
        </button>

        {/* My Civic Hubs - grouped by type */}
        <div className="mt-6">
          <h2 className="px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            My Civic Hubs
          </h2>

          {hubTypeOrder.map((type) => {
            const typeHubs = hubs.filter((hub) => hub.type === type);
            if (typeHubs.length === 0) return null;
            return (
              <div key={type} className="mb-4">
                <h3 className="px-5 text-[11px] font-medium text-gray-300 uppercase tracking-wider mb-2">
                  {hubTypeLabels[type]}
                </h3>
                <div className="space-y-1">
                  {typeHubs.map((hub) => {
                    const colors = hubColors[hub.id] || LIVE_HUB_COLORS[hub.id] || { bg: '#F5F5F5', text: '#666' };
                    return (
                      <button
                        key={hub.id}
                        onClick={() => onSelectHub(hub.id)}
                        className={`w-full text-left px-5 py-3 rounded-xl transition-all flex items-center gap-3 group ${
                          selectedHub === hub.id
                            ? 'bg-gray-50 shadow-sm'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          <HubIcon icon={hub.icon} size={18} />
                        </span>
                        <span className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
                          <span className={`w-full text-sm font-medium truncate ${
                            selectedHub === hub.id ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {hub.shortName}
                          </span>
                          {hub.live && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-civic-green/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-civic-green"
                              data-testid={`live-pill-${hub.id}`}
                            >
                              <span className="h-1 w-1 rounded-full bg-civic-green animate-pulse" />
                              Live source
                            </span>
                          )}
                        </span>
                        {hub.unreadCount > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-civic-rust/10 text-civic-rust text-xs font-semibold flex items-center justify-center">
                            {hub.unreadCount}
                          </span>
                        )}
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
                            className="flex-shrink-0 p-1 rounded-md text-gray-300 hover:text-civic-green hover:bg-civic-green/10 transition-colors"
                          >
                            <ExternalLinkIcon size={14} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-8 py-7 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Civic Social Dashboard
        </p>
      </div>
    </aside>
  );
}
