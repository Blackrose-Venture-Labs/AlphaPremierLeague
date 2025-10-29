import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import MetricsBar from '../components/MetricsBar';
import TabbedSidebar from '../components/TabbedSidebar';
import SummaryCards from '../components/SummaryCards';
import ChartPlaceholder from '../components/ChartPlaceholder';

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(false); // Changed to false to bypass loading screen
  const [showContent, setShowContent] = useState(true); // Changed to true to show content immediately
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Commented out the loading screen logic to bypass it entirely
  // useEffect(() => {
  //   // Check if user has visited before and if it's been less than 1 hour
  //   const lastVisitTime = sessionStorage.getItem('lastVisitTime');
  //   
  //   if (lastVisitTime) {
  //     const currentTime = Date.now();
  //     const oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds
  //     const timeSinceLastVisit = currentTime - parseInt(lastVisitTime, 10);
  //     
  //     if (timeSinceLastVisit < oneHourInMs) {
  //       // Skip loading screen if visited within the last hour
  //       setIsLoading(false);
  //       setShowContent(true);
  //     }
  //   }
  // }, []);

  // const handleLoadingComplete = () => {
  //   // Store the current timestamp
  //   sessionStorage.setItem('lastVisitTime', Date.now().toString());
  //   setIsLoading(false);
  //   // Delay showing content for smooth transition
  //   setTimeout(() => setShowContent(true), 300);
  // };

  // Removed loading screen check - page loads directly
  // if (isLoading) {
  //   return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  // }

  return (
    <div className={`h-screen flex flex-col font-mono transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: '#121212' }}>
      <Header />
      <MetricsBar />
      
      {/* Desktop Layout - shown on 2xl screens and above */}
      <div className="hidden 2xl:flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-row flex-1 overflow-hidden border-t-4 border-black relative min-h-0">
          {/* Chart Area - 75% on 2xl screens */}
          <div className="w-[75%] p-0 overflow-hidden border-r border-bloomberg-primary">
            <ChartPlaceholder />
          </div>
          
          {/* Sidebar - 25% on right side */}
          <div className="w-[25%] relative overflow-hidden">
            <TabbedSidebar 
              isFullScreen={isFullScreen} 
              setIsFullScreen={setIsFullScreen}
            />
          </div>
        </div>
        
        {/* Summary Cards - Always visible at bottom on desktop */}
        <div className="border-t border-bloomberg-primary flex-shrink-0">
          <SummaryCards />
        </div>
      </div>
      
      {/* Mobile Layout - shown on screens below 2xl */}
      <div className="2xl:hidden flex flex-col overflow-auto">
        {/* Chart Section - Takes most of the viewport height like the reference image */}
        <div className="border-y border-bloomberg-primary" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
          <ChartPlaceholder />
        </div>
        
        {/* Detailed View Section */}
        <div className="border-b-4 p-4" style={{ backgroundColor: '#121212', borderColor: '#121212' }}>
          <h2 className="text-sm font-bold text-bloomberg-primary tracking-wider mb-3 text-center">
            DETAILED VIEW
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                setIsFullScreen(true);
                const event = new CustomEvent('openSidebarTab', { detail: 'trades' });
                window.dispatchEvent(event);
              }}
              className="border border-bloomberg-primary text-bloomberg-primary px-4 py-3 text-xs font-bold hover:bg-bloomberg-primary hover:text-black transition-colors text-center"
            >
              TRADES
            </button>
            <button 
              onClick={() => {
                setIsFullScreen(true);
                const event = new CustomEvent('openSidebarTab', { detail: 'chat' });
                window.dispatchEvent(event);
              }}
              className="border border-bloomberg-primary text-bloomberg-primary px-4 py-3 text-xs font-bold hover:bg-bloomberg-primary hover:text-black transition-colors text-center"
            >
              MODELCHAT
            </button>
            <button 
              onClick={() => {
                setIsFullScreen(true);
                const event = new CustomEvent('openSidebarTab', { detail: 'positions' });
                window.dispatchEvent(event);
              }}
              className="border border-bloomberg-primary text-bloomberg-primary px-4 py-3 text-xs font-bold hover:bg-bloomberg-primary hover:text-black transition-colors text-center"
            >
              POSITIONS
            </button>
            <button 
              onClick={() => {
                setIsFullScreen(true);
                const event = new CustomEvent('openSidebarTab', { detail: 'readme' });
                window.dispatchEvent(event);
              }}
              className="border border-bloomberg-primary text-bloomberg-primary px-4 py-3 text-xs font-bold hover:bg-bloomberg-primary hover:text-black transition-colors text-center"
            >
              README.TXT
            </button>
          </div>
        </div>
        
        {/* Leading Models Section */}
        <div className="p-4 pb-6" style={{ backgroundColor: '#121212' }}>
          <h2 className="text-sm font-bold text-bloomberg-primary tracking-wider mb-3 text-center">
            LEADING MODELS
          </h2>
          <SummaryCards />
        </div>
        
        {/* Sidebar component - always rendered to respond to events */}
        <TabbedSidebar 
          isFullScreen={isFullScreen} 
          setIsFullScreen={setIsFullScreen}
        />
      </div>
    </div>
  );
};

export default Dashboard;