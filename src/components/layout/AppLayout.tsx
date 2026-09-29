import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Radio,
  Laptop,
  MessageSquare,
  ArrowLeftRight,
  Bell,
  Settings,
  Info,
  RefreshCw,
  Sun,
  Moon,
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useLocalLink } from '../../context/LocalLinkContext';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { ToastContainer } from '../ui/Toast';
import { ConnectionRequestModal } from '../ui/ConnectionRequestModal';
import { ClipboardReceivedModal } from '../ui/ClipboardReceivedModal';
import { ConnectDeviceModal } from '../ui/ConnectDeviceModal';
import { ConnectServerModal } from '../ui/ConnectServerModal';
import { QrCode, Plus, Download, Server, AlertCircle } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const {
    profile,
    networkInfo,
    wsState,
    unreadNotificationCount,
    conversations,
    transfers,
    scanDevices,
    openConnectModal,
    openServerModal,
  } = useLocalLink();

  const { theme, setTheme, isDark } = useTheme();
  const { isInstallable, isInstalled, triggerInstall } = usePWAInstall();

  const isVercelHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('vercel.app') ||
      (!['localhost', '127.0.0.1'].includes(window.location.hostname) &&
        !window.location.hostname.startsWith('192.168.') &&
        !window.location.hostname.startsWith('10.') &&
        !window.location.hostname.startsWith('172.')));

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const activeTransfersCount = transfers.filter((t) => t.status === 'transferring').length;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Laptop className="w-4 h-4" />;
    }
  };

  const navItems = [
    { label: 'Home', path: '/', icon: Radio },
    { label: 'Devices', path: '/devices', icon: Laptop },
    { label: 'Chats', path: '/chats', icon: MessageSquare, badge: totalUnreadMessages },
    { label: 'Transfers', path: '/transfers', icon: ArrowLeftRight, badge: activeTransfersCount },
    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadNotificationCount },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'About', path: '/about', icon: Info },
  ];

  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'Home';
    if (pathname.startsWith('/devices')) return 'Devices';
    if (pathname.startsWith('/chats/')) return 'Private Chat';
    if (pathname.startsWith('/chats')) return 'Chats';
    if (pathname.startsWith('/transfers')) return 'File Transfers';
    if (pathname.startsWith('/notifications')) return 'Notifications';
    if (pathname.startsWith('/settings/profile')) return 'Profile Settings';
    if (pathname.startsWith('/settings/connection')) return 'Connection Settings';
    if (pathname.startsWith('/settings/notifications')) return 'Notification Settings';
    if (pathname.startsWith('/settings/privacy')) return 'Privacy Settings';
    if (pathname.startsWith('/settings/storage')) return 'Storage Settings';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/about')) return 'About LocalLink';
    return 'LocalLink';
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'
    }`}>
      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden md:flex flex-col w-64 shrink-0 border-r ${
        isDark ? 'bg-neutral-900/40 border-neutral-800/80' : 'bg-white border-neutral-200'
      }`}>
        {/* Brand */}
        <div className="p-5 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">LocalLink</span>
              </div>
              <p className={`text-[11px] leading-tight ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Private LAN Communication
              </p>
            </div>
          </div>

          {/* Network Status Badge */}
          <button
            onClick={openServerModal}
            className={`w-full text-left mt-4 p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
              wsState === 'connected'
                ? isDark
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300 hover:bg-emerald-900/30'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : isDark
                ? 'bg-rose-950/20 border-rose-500/20 text-rose-300 hover:bg-rose-900/30'
                : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
            }`}
            title="Click to configure LocalLink Server connection"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {wsState === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  wsState === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
              </span>
              <div className="min-w-0 text-xs truncate font-medium">
                {wsState === 'connected' ? 'Connected to Local Network' : 'Disconnected from LAN'}
              </div>
            </div>
            <Server className="w-3.5 h-3.5 opacity-60 shrink-0" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                      : 'bg-neutral-100 text-neutral-900 font-semibold shadow-sm'
                    : isDark
                    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : ''}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-neutral-950 tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        {/* Device Profile Footer */}
        <div className="p-3 border-t border-inherit">
          <NavLink
            to="/settings/profile"
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
              isDark ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400 shrink-0">
              {getDeviceIcon(profile.deviceType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate text-inherit">{profile.deviceName}</div>
              <div className={`text-[11px] truncate tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {networkInfo?.localIp || '127.0.0.1'}
              </div>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className={`md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-40 backdrop-blur-md ${
        isDark ? 'bg-neutral-950/90 border-neutral-800' : 'bg-white/90 border-neutral-200'
      }`}>
        <div
          onClick={openServerModal}
          className="flex items-center gap-2.5 cursor-pointer"
          title="Click to configure Local Server connection"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">LocalLink</span>
              <span className="relative flex h-2 w-2">
                <span className={`inline-flex rounded-full h-2 w-2 ${
                  wsState === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openConnectModal('code')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
              isDark
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect</span>
          </button>

          {/* Mobile Device Code Badge */}
          <button
            onClick={() => openConnectModal('my-qr')}
            className={`px-2 py-1.5 rounded-lg border text-xs font-mono font-bold ${
              isDark
                ? 'border-neutral-800 bg-neutral-900/80 text-emerald-400 hover:border-emerald-500/40'
                : 'border-neutral-200 bg-neutral-100 text-emerald-700 hover:border-emerald-300'
            }`}
            title="Your 4-Digit Device Code"
          >
            #{profile.deviceCode}
          </button>

          <button
            onClick={() => scanDevices()}
            className={`p-2 rounded-lg border transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-300' : 'border-neutral-200 bg-neutral-100 text-neutral-700'
            }`}
            title="Scan LAN"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <NavLink
            to="/notifications"
            className={`relative p-2 rounded-lg border transition-colors ${
              isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-300' : 'border-neutral-200 bg-neutral-100 text-neutral-700'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            )}
          </NavLink>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Vercel Free / Remote Alert Banner when not connected to local service */}
        {isVercelHost && wsState !== 'connected' && (
          <div
            onClick={openServerModal}
            className={`flex items-center justify-between px-4 sm:px-6 py-2 border-b text-xs cursor-pointer transition-colors ${
              isDark
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-200 hover:bg-amber-900/50'
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Vercel Free Mode:</strong> Local LAN service is offline. Click here to connect your PC or Termux LocalLink server.
              </span>
            </div>
            <span className="font-bold underline shrink-0 ml-3 text-amber-400 hover:text-amber-300">
              Connect Server
            </span>
          </div>
        )}

        {/* Desktop Header */}
        <header className={`hidden md:flex items-center justify-between px-8 py-4 border-b ${
          isDark ? 'bg-neutral-900/20 border-neutral-800/80' : 'bg-white border-neutral-200'
        }`}>
          <div>
            <h1 className="text-base font-semibold text-inherit">{getPageTitle(location.pathname)}</h1>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Wi-Fi / LAN Private Mesh
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Connect Device Primary Button */}
            <button
              onClick={() => openConnectModal('code')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Device</span>
            </button>

            {/* In-App PWA Install Button when supported */}
            {isInstallable && !isInstalled && (
              <button
                onClick={() => triggerInstall()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isDark
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
                title="Install LocalLink as a native desktop/mobile app"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Install App</span>
              </button>
            )}

            {/* My Code Quick Access Badge */}
            <button
              onClick={() => openConnectModal('my-qr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                isDark
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
              title="Click to view your 4-digit code and QR"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>#{profile.deviceCode}</span>
            </button>

            {/* Quick scan button */}
            <button
              onClick={() => scanDevices()}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                  : 'border-neutral-200 bg-neutral-100/80 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan Network</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-xl border transition-all ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:text-white'
                  : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:text-neutral-900'
              }`}
              title="Toggle Dark/Light Mode"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
            </button>

            {/* Notification Bell */}
            <NavLink
              to="/notifications"
              className={`relative p-2 rounded-xl border transition-all ${
                isDark
                  ? 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:text-white'
                  : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:text-neutral-900'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              )}
            </NavLink>

            {/* IP indicator */}
            <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs tabular-nums ${
              isDark ? 'border-neutral-800 bg-neutral-900/40 text-neutral-400' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
            }`}>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>{networkInfo?.localIp || '127.0.0.1'}</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-2 py-2 backdrop-blur-lg ${
        isDark ? 'bg-neutral-950/95 border-neutral-800 text-neutral-400' : 'bg-white/95 border-neutral-200 text-neutral-600'
      }`}>
        {[
          { label: 'Home', path: '/', icon: Radio },
          { label: 'Devices', path: '/devices', icon: Laptop },
          { label: 'Chats', path: '/chats', icon: MessageSquare, badge: totalUnreadMessages },
          { label: 'Files', path: '/transfers', icon: ArrowLeftRight, badge: activeTransfersCount },
          { label: 'Settings', path: '/settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-medium relative transition-colors ${
                isActive
                  ? 'text-emerald-500 font-semibold'
                  : 'text-inherit hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[9px] font-bold rounded-full bg-emerald-500 text-neutral-950 tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Modals & Overlays */}
      <ToastContainer />
      <ConnectionRequestModal />
      <ClipboardReceivedModal />
      <ConnectDeviceModal />
      <ConnectServerModal />
    </div>
  );
};
