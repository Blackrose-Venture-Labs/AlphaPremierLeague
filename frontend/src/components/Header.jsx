import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useModels } from '../context/ModelsContext';
import { useWebSocket } from '../context/WebSocketContext';
import { getModelIconPath, getModelIconFallback } from '../lib/utils';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { models, loading, error } = useModels();
  const { connectionStatus, getConnectionInfo } = useWebSocket();
  const connectionInfo = getConnectionInfo();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setCurrentDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on a link inside the dropdown
      if (event.target.closest('a')) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModelsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const ConnectionIndicator = () => (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        connectionStatus === 'connected' ? 'bg-green-500' : 
        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
        'bg-red-500'
      }`} />
      <span className="text-xs text-white-700">
        {connectionStatus === 'connected' ? 'Live' : 
         connectionStatus === 'connecting' ? 'Connecting...' : 
         'Disconnected'}
      </span>
      {connectionInfo.lastUpdate && (
        <span className="text-xs text-white-500">
          {new Date(connectionInfo.lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
  
  return (
    <header className="border-b-2 border-bloomberg-primary font-mono" style={{ backgroundColor: '#121212' }}>
      {/* Desktop Header */}
      <div className="hidden 2xl:flex items-center justify-between px-6 py-2">
        {/* Logo & System Info */}
        <div className="flex items-center space-x-2">
          <a 
            href="/"
            className="hover:opacity-80 transition-opacity"
          >
            <img 
              src="/blackrose-logo.png?v=2.5" 
              alt="Blackrose Logo" 
              className="w-10 h-10 object-contain"
            />
          </a>
          <div>
            <div className="text-xs text-white">
              <span className="text-white text-xs">v2.5</span>
            </div>
            <div className="text-xs text-white mt-0.5">
              PWR: <span className="text-bloomberg-primary">BLACKROSE</span>
            </div>
          </div>
          <div className="border-l border-bloomberg-primary pl-4">
            <ConnectionIndicator />
            <div className="text-xs text-xs text-white pt-1">{currentDate}</div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex items-center space-x-1">
          <Link 
            to="/" 
            className={`px-4 py-1 text-xs font-bold transition-colors ${
              location.pathname === '/' 
                ? 'bg-bloomberg-primary text-black' 
                : 'border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black'
            }`}
          >
            LIVE
          </Link>
          <Link 
            to="/leaderboard" 
            className={`px-4 py-1 text-xs font-bold transition-colors ${
              location.pathname === '/leaderboard' 
                ? 'bg-bloomberg-primary text-black' 
                : 'border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black'
            }`}
          >
            LEADERBOARD
          </Link>
          <div 
            className="relative"
            ref={dropdownRef}
          >
            <button
              onClick={() => setShowModelsDropdown(!showModelsDropdown)}
              className={`px-4 py-1 text-xs font-bold transition-colors ${
                location.pathname === '/models' || location.pathname.startsWith('/models/')
                  ? 'bg-bloomberg-primary text-black' 
                  : 'border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black'
              }`}
            >
              MODELS {showModelsDropdown ? '▲' : '▼'}
            </button>
            
            {/* Dropdown Menu */}
            {showModelsDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 border border-bloomberg-primary shadow-lg z-50" style={{ backgroundColor: '#121212' }}>
                <div className="p-4">
                  <h3 className="text-xs font-bold text-bloomberg-primary mb-3 tracking-wider">AI MODELS</h3>
                  {loading ? (
                    <div className="text-xs text-white text-center py-2">Loading models...</div>
                  ) : error ? (
                    <div className="text-xs text-red-500 text-center py-2">Error: {error}</div>
                  ) : (
                    <div className="space-y-1">
                      {models.map((model) => {
                        const iconPath = getModelIconPath(model.icon);
                        return (
                          <Link
                            key={model.id}
                            to={`/models/${model.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setShowModelsDropdown(false);
                              navigate(`/models/${model.id}`);
                            }}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-900 cursor-pointer transition-colors border-b border-gray-800 last:border-b-0"
                          >
                            <div 
                              className="w-5 h-5 rounded-sm flex items-center justify-center overflow-hidden p-0.5"
                              style={{ backgroundColor: model.color }}
                            >
                              {iconPath ? (
                                <img 
                                  src={iconPath} 
                                  alt={model.display_name} 
                                  className="w-full h-full object-contain"
                                  style={{ filter: 'brightness(0) invert(1)' }}
                                  onError={(e) => {
                                    // Fallback to text if image fails to load
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              <span 
                                className="text-xs font-bold text-white"
                                style={{ display: iconPath ? 'none' : 'block' }}
                              >
                                {getModelIconFallback(model.code_name)}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-white">
                              {model.display_name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
        
        {/* Status Bar */}
        <div className="flex items-center space-x-4">
          <div className="text-xs">
            <span className="text-white">USER:</span>
            <span className="text-bloomberg-primary ml-1 font-bold">GUEST</span>
          </div>
          <a 
            href="https://www.blackrose.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-bloomberg-primary border border-bloomberg-primary px-2 py-1 hover:bg-bloomberg-primary hover:text-black transition-colors"
          >
            ABOUT BLACKROSE
          </a>
          <a 
            href="https://discord.gg/2XDbE9JZqt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-black border border-orange-500 px-2 py-1 hover:bg-orange-500 hover:text-black transition-colors animate-pulse bg-orange-500"
          >
            JOIN DISCORD
          </a>
        </div>
      </div>
      
      {/* Mobile Header */}
      <div className="2xl:hidden">
        {/* Top row - Logo and Info */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-bloomberg-primary">
          <div className="flex items-center space-x-2">
            <a 
              href="/"
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src="/blackrose-logo.png?v=2.5" 
                alt="Blackrose Logo" 
                className="w-8 h-8 object-contain"
              />
            </a>
            <div>
              <div className="text-[9px] text-white">
                <span className="text-white text-xs">v2.5</span>
              </div>
              <div className="text-[9px] text-white">
                PWR: <span className="text-bloomberg-primary">BLACKROSE</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <div className="text-right">
              <div className="text-[9px] text-white">{currentDate}</div>
            </div>
            <div className="scale-75 origin-right">
              <ConnectionIndicator />
            </div>
          </div>
        </div>
        
        {/* Bottom row - Navigation */}
        <div className="flex items-center justify-between px-3 py-2 relative">
          <nav className="flex items-center space-x-1">
            <Link 
              to="/" 
              className={`px-3 py-1 text-[10px] font-bold transition-colors ${
                location.pathname === '/' 
                  ? 'bg-bloomberg-primary text-black' 
                  : 'border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black'
              }`}
            >
              LIVE
            </Link>
            <Link 
              to="/leaderboard" 
              className={`px-3 py-1 text-[10px] font-bold transition-colors ${
                location.pathname === '/leaderboard' 
                  ? 'bg-bloomberg-primary text-black' 
                  : 'border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black'
              }`}
            >
              LEADERBOARD
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModelsDropdown(!showModelsDropdown)}
                className={`px-3 py-1 text-[10px] font-bold transition-colors ${
                  location.pathname === '/models' || location.pathname.startsWith('/models/')
                    ? 'bg-bloomberg-primary text-black' 
                    : 'border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black'
                }`}
              >
                MODELS {showModelsDropdown ? '▲' : '▼'}
              </button>
              
              {/* Mobile Dropdown Menu */}
              {showModelsDropdown && (
                <div className="absolute top-full right-0 mt-1 w-56 border-2 border-bloomberg-primary shadow-lg z-50" style={{ backgroundColor: '#121212' }}>
                  <div className="p-3">
                    <h3 className="text-[10px] font-bold text-bloomberg-primary mb-2 tracking-wider">AI MODELS</h3>
                    {loading ? (
                      <div className="text-[10px] text-white text-center py-2">Loading models...</div>
                    ) : error ? (
                      <div className="text-[10px] text-red-500 text-center py-2">Error: {error}</div>
                    ) : (
                      <div className="space-y-1">
                        {models.map((model) => {
                          const iconPath = getModelIconPath(model.icon);
                          return (
                            <Link
                              key={model.id}
                              to={`/models/${model.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setShowModelsDropdown(false);
                                navigate(`/models/${model.id}`);
                              }}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-900 cursor-pointer transition-colors border-b border-gray-800 last:border-b-0"
                            >
                              <div 
                                className="w-4 h-4 rounded-sm flex items-center justify-center overflow-hidden p-0.5"
                                style={{ backgroundColor: model.color }}
                              >
                                {iconPath ? (
                                  <img 
                                    src={iconPath} 
                                    alt={model.display_name} 
                                    className="w-full h-full object-contain"
                                    style={{ filter: 'brightness(0) invert(1)' }}
                                    onError={(e) => {
                                      // Fallback to text if image fails to load
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  />
                                ) : null}
                                <span 
                                  className="text-[10px] font-bold text-white"
                                  style={{ display: iconPath ? 'none' : 'block' }}
                                >
                                  {getModelIconFallback(model.code_name)}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-white">
                                {model.display_name}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>
          <div className="flex items-center space-x-1">
            <a 
              href="https://discord.gg/2XDbE9JZqt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-black border border-orange-500 px-2 py-1 hover:bg-orange-500 hover:text-black transition-colors animate-pulse bg-orange-500"
            >
              DISCORD
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;