import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useIsMobile } from './hooks/useMediaQuery';
import { Sidebar } from './components/Sidebar';
import { Newsfeed } from './components/Newsfeed';
import { WidgetPanel } from './components/WidgetPanel';
import { MobileTabBar } from './components/MobileTabBar';
import { HubsList } from './components/HubsList';
import { BackSidebar } from './components/BackSidebar';
import { ExternalView } from './components/ExternalView';
import { RepresentativeProfile } from './components/RepresentativeProfile';
import { SampleBallotPage } from './components/SampleBallotPage';
import { ContactRepsPage } from './components/ContactRepsPage';
import { DemoPage, VoterPrimeLogo } from './components/DemoPage';
import { AdvisoryVotingPage } from './components/AdvisoryVotingPage';
import { HubPage } from './components/HubPage';
import { WelcomeOverlay } from './components/WelcomeOverlay';

function App() {
  const isMobile = useIsMobile();
  const [selectedHub, setSelectedHub] = useState(null);
  const [mobileTab, setMobileTab] = useState('feed');
  const [externalView, setExternalView] = useState(null);
  const [activePage, setActivePage] = useState(null);
  const widgetPanelScrollRef = useRef({ info: 0, tools: 0 });
  const mobileInfoScrollRef = useRef(0);
  const shouldRestoreMobileInfoScrollRef = useRef(false);
  const isOutOfDashboard = activePage || externalView;

  // Handle hub selection
  const handleSelectHub = (hubId) => {
    setSelectedHub(hubId);
    if (isMobile) {
      setMobileTab('feed');
    }
  };

  const handleSelectAll = () => {
    setSelectedHub(null);
    if (isMobile) {
      setMobileTab('feed');
    }
  };

  // Handle viewing item in hub - navigate to hub page with item highlighted
  const handleViewInHub = (item, hub) => {
    setActivePage({ type: 'hub-page', data: { hub, highlightedItem: item } });
  };

  // Open a live source's real site inside the dashboard (ExternalView +
  // back sidebar) — same navigation pattern as the civic tools. Used by
  // live feed-item CTAs (deep link via action_url) and the sidebar's
  // open-hub icons (source home page).
  const handleOpenLive = (title, url) => {
    setExternalView({ isHub: false, title, url });
  };

  // Handle opening external tool
  const handleOpenTool = (tool) => {
    if (isMobile && mobileTab === 'info') {
      mobileInfoScrollRef.current = window.scrollY;
      shouldRestoreMobileInfoScrollRef.current = true;
    }

    if (tool.url) {
      setExternalView({
        isHub: false,
        title: tool.name,
        url: tool.url,
      });
    }
  };

  // Handle opening internal pages
  const handleOpenPage = (pageType, data) => {
    if (isMobile && mobileTab === 'info') {
      mobileInfoScrollRef.current = window.scrollY;
      shouldRestoreMobileInfoScrollRef.current = true;
    }

    if (pageType === 'hub' && data?.hubId) {
      setSelectedHub(data.hubId);
      if (isMobile) setMobileTab('feed');
      return;
    }
    setActivePage({ type: pageType, data });
  };

  const handleWidgetPanelScrollChange = useCallback((section, scrollTop) => {
    widgetPanelScrollRef.current[section] = scrollTop;
  }, []);

  const handleMobileTabChange = useCallback((nextTab) => {
    shouldRestoreMobileInfoScrollRef.current = false;
    setMobileTab(nextTab);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, []);

  useEffect(() => {
    if (!isMobile || isOutOfDashboard || mobileTab !== 'info') return undefined;

    const handleScroll = () => {
      mobileInfoScrollRef.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, isOutOfDashboard, mobileTab]);

  useEffect(() => {
    if (!isMobile || isOutOfDashboard || mobileTab !== 'info' || !shouldRestoreMobileInfoScrollRef.current) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: mobileInfoScrollRef.current, behavior: 'auto' });
      shouldRestoreMobileInfoScrollRef.current = false;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, isOutOfDashboard, mobileTab]);

  // Ref to prevent duplicate history pushes (React strict mode / HMR)
  const historyPushedRef = useRef(false);

  // Always stamp the current history entry as dashboard on mount
  // This ensures a clean baseline even after HMR or page reloads
  useEffect(() => {
    window.history.replaceState({ page: 'dashboard' }, '');
  }, []);

  // Handle closing pages / returning to dashboard
  const handleBackToDashboard = useCallback((fromPopState = false) => {
    setActivePage(null);
    setExternalView(null);
    historyPushedRef.current = false;
    if (isMobile) {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    }
    if (!fromPopState) {
      // Triggered by sidebar back button — go back in history to match
      window.history.back();
    } else {
      // Triggered by browser back — stamp current entry as dashboard
      window.history.replaceState({ page: 'dashboard' }, '');
    }
  }, [isMobile]);

  // Browser back button support
  useEffect(() => {
    const onPopState = () => {
      // Any browser back/forward while on a subpage should return to dashboard
      handleBackToDashboard(true);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleBackToDashboard]);

  // Push a history entry whenever we leave the dashboard (guarded against duplicates)
  useEffect(() => {
    if ((activePage || externalView) && !historyPushedRef.current) {
      window.history.pushState({ page: 'subpage' }, '');
      historyPushedRef.current = true;
    } else if (!activePage && !externalView) {
      historyPushedRef.current = false;
    }
  }, [activePage, externalView]);

  const overlay = <WelcomeOverlay />;

  // Render out-of-dashboard views with unified left sidebar
  if (isOutOfDashboard) {
    let pageContent = null;

    if (activePage) {
      switch (activePage.type) {
        case 'representative':
          pageContent = (
            <RepresentativeProfile representative={activePage.data.representative} />
          );
          break;
        case 'sample-ballot':
          pageContent = <SampleBallotPage />;
          break;
        case 'contact-reps':
          pageContent = (
            <ExternalView
              url="https://civiq.chat/ea024c1c-c4ca-4b49-9ad8-b62d7047c0b4"
              title="Contact Representatives"
              isHub={false}
            />
          );
          break;
        case 'advisory-voting':
          pageContent = <AdvisoryVotingPage />;
          break;
        case 'discover':
          pageContent = (
            <DemoPage
              title="Discover Civic Opportunities"
              description="Find civic actions and participation opportunities that match your interests. From volunteering to advocacy, discover ways to make a difference in your community."
              poweredBy={{
                name: 'VoterPrime',
                url: 'https://voterprime.org/',
                logo: <VoterPrimeLogo size={28} />,
              }}
            />
          );
          break;
        case 'hub-page':
          pageContent = (
            <HubPage
              hub={activePage.data.hub}
              highlightedItem={activePage.data.highlightedItem}
            />
          );
          break;
        default:
          break;
      }
    } else if (externalView) {
      pageContent = (
        <ExternalView
          url={externalView.url}
          title={externalView.title}
          isHub={externalView.isHub}
        />
      );
    }

    return (
      <div className="flex min-h-screen overflow-x-hidden">
        {overlay}
        <BackSidebar onBack={handleBackToDashboard} />
        {pageContent}
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-civic-cream pb-[72px]">
        {overlay}
        {mobileTab === 'info' && (
          <WidgetPanel
            onOpenTool={handleOpenTool}
            onOpenPage={handleOpenPage}
            scrollState={widgetPanelScrollRef.current}
            onScrollChange={handleWidgetPanelScrollChange}
          />
        )}
        {mobileTab === 'feed' && (
          <Newsfeed
            selectedHub={selectedHub}
            onViewInHub={handleViewInHub}
            onSelectHub={handleSelectHub}
            onSelectAll={handleSelectAll}
            onOpenLive={handleOpenLive}
          />
        )}
        {mobileTab === 'hubs' && (
          <HubsList onSelectHub={handleSelectHub} onOpenLive={handleOpenLive} />
        )}

        <MobileTabBar
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
        />
      </div>
    );
  }

  // Desktop Layout - Three Column
  return (
    <div className="min-h-screen bg-civic-cream flex">
      {overlay}
      {/* Left Column - Sidebar Navigation */}
      <div className="w-[300px] flex-shrink-0 border-r border-gray-200 h-screen sticky top-0">
        <Sidebar
          selectedHub={selectedHub}
          onSelectHub={handleSelectHub}
          onSelectAll={handleSelectAll}
          onOpenLive={handleOpenLive}
        />
      </div>

      {/* Center Column - Newsfeed */}
      <div className="flex-1 min-w-0 h-screen overflow-hidden bg-civic-cream">
        <Newsfeed
          selectedHub={selectedHub}
          onViewInHub={handleViewInHub}
          onSelectHub={handleSelectHub}
          onSelectAll={handleSelectAll}
          onOpenLive={handleOpenLive}
        />
      </div>

      {/* Right Column - Civic Info + Tools */}
      <div className="w-[380px] flex-shrink-0 h-screen overflow-hidden border-l border-gray-200 bg-white">
        <WidgetPanel
          onOpenTool={handleOpenTool}
          onOpenPage={handleOpenPage}
          scrollState={widgetPanelScrollRef.current}
          onScrollChange={handleWidgetPanelScrollChange}
        />
      </div>
    </div>
  );
}

export default App;
