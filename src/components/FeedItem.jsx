import React, { useState } from 'react';
import { getContentTypeIcon, HubIcon, ChevronRightIcon } from './Icons';
import { getHubById, hubColors } from '../data/mockData';
import { LIVE_HUB_COLORS } from '../config';
import { liveSourceHubs } from '../hooks/useFeed';
import { useIsMobile } from '../hooks/useMediaQuery';

/** Subtle "this came from a real service" marker (A5). */
function LiveChip() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-civic-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-civic-green"
      title="Live from a connected civic service"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-civic-green animate-pulse" />
      Live
    </span>
  );
}

export function FeedItem({ item, onViewInHub, onMarkRead, onOpenLive }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hub =
    getHubById(item.hubId) || liveSourceHubs.find((h) => h.id === item.hubId);
  const colors =
    hubColors[item.hubId] || LIVE_HUB_COLORS[item.hubId] || { bg: '#F5F5F5', text: '#666' };
  const isMobile = useIsMobile();

  const markLiveRead = () => {
    if (item.live && !item.isRead) onMarkRead?.(item.id);
  };

  // Live click-through: open the real service inside the dashboard
  // (ExternalView + back sidebar). Falls back to a new tab when rendered
  // without the App-level handler.
  const handleOpenLive = (e) => {
    e.stopPropagation();
    markLiveRead();
    if (onOpenLive) {
      onOpenLive(hub?.name ?? 'Live source', item.actionUrl);
    } else {
      window.open(item.actionUrl, '_blank', 'noreferrer');
    }
  };

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    markLiveRead();
  };

  const handleViewInHub = (e) => {
    e.stopPropagation();
    onViewInHub(item, hub);
  };

  if (isMobile) {
    return (
      <article
        className={`card feed-item px-3.5 py-3.5 relative ${isExpanded ? 'expanded' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              <HubIcon icon={hub?.icon} size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium leading-tight" style={{ color: colors.text }}>
                <span>{hub?.shortName}</span>
                {item.live && <LiveChip />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                <span className="flex items-center gap-1 min-w-0">
                  <span>{getContentTypeIcon(item.type)}</span>
                  <span className="capitalize">{item.type.replace('-', ' ')}</span>
                </span>
                <span className="text-gray-300">&middot;</span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="font-heading text-[1.02rem] font-semibold text-gray-900 leading-snug mb-3">
          {item.title}
        </h3>

        <div className="mb-3">
          {item.live ? (
            <button
              data-action-url={item.actionUrl}
              onClick={handleOpenLive}
              className="text-sm font-medium inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: colors.text, backgroundColor: colors.bg }}
            >
              Open in {hub?.shortName}
              <ChevronRightIcon size={14} />
            </button>
          ) : (
            <button
              onClick={handleViewInHub}
              className="text-sm font-medium inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: colors.text, backgroundColor: colors.bg }}
            >
              View in {hub?.shortName}
              <ChevronRightIcon size={14} />
            </button>
          )}
        </div>

        <p className="text-[0.96rem] text-gray-500 leading-relaxed break-words">
          {isExpanded ? (
            <span className="whitespace-pre-line">{item.fullContent}</span>
          ) : (
            item.preview
          )}
        </p>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-gray-100 animate-fadeIn">
            <span className="text-xs text-gray-400">{item.author}</span>
          </div>
        )}
      </article>
    );
  }

  return (
    <article
      className={`card feed-item px-8 py-7 relative ${isExpanded ? 'expanded' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-expanded={isExpanded}
    >
      {/* Top row: Hub icon + meta on left, View button on right */}
      <div className="flex items-start gap-5">
        {/* Hub Icon */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          <HubIcon icon={hub?.icon} size={20} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Hub name, type, timestamp */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {hub?.shortName}
            </span>
            {item.live && <LiveChip />}
            <span className="text-gray-300">&middot;</span>
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <span>{getContentTypeIcon(item.type)}</span>
              <span className="capitalize">{item.type.replace('-', ' ')}</span>
            </span>
            <span className="text-gray-300">&middot;</span>
            <span className="text-xs text-gray-400">{item.timestamp}</span>
          </div>

          {/* Title */}
          <h3 className="font-heading font-semibold text-gray-900 leading-snug mb-2.5">
            {item.title}
          </h3>

          {/* Preview or full content */}
          <p className="text-sm text-gray-500 leading-relaxed">
            {isExpanded ? (
              <span className="whitespace-pre-line">{item.fullContent}</span>
            ) : (
              item.preview
            )}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Author shown when expanded */}
          {isExpanded && (
            <div className="mt-5 pt-4 border-t border-gray-100 animate-fadeIn">
              <span className="text-xs text-gray-400">{item.author}</span>
            </div>
          )}
        </div>

        {/* View/Open button - top right, hub-colored pill style. Live items
            click through to the real service's action_url in a new tab. */}
        {item.live ? (
          <button
            data-action-url={item.actionUrl}
            onClick={handleOpenLive}
            className="text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: colors.text, backgroundColor: colors.bg }}
          >
            Open in {hub?.shortName}
            <ChevronRightIcon size={14} />
          </button>
        ) : (
          <button
            onClick={handleViewInHub}
            className="text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: colors.text, backgroundColor: colors.bg }}
          >
            View in {hub?.shortName}
            <ChevronRightIcon size={14} />
          </button>
        )}
      </div>
    </article>
  );
}
