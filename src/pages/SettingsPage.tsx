import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  User,
  Wifi,
  Bell,
  Shield,
  HardDrive,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallSection } from '../components/ui/PWAInstallSection';

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const { isDark } = useTheme();

  const settingsTabs = [
    { label: 'Profile', path: '/settings/profile', icon: User, desc: 'Device identity, avatar and name' },
    { label: 'Connection', path: '/settings/connection', icon: Wifi, desc: 'Local IP, network diagnostics and peer discovery' },
    { label: 'Notifications', path: '/settings/notifications', icon: Bell, desc: 'Audio alerts and incoming push toggles' },
    { label: 'Privacy', path: '/settings/privacy', icon: Shield, desc: 'LAN visibility, clipboard sharing and blocked peers' },
    { label: 'Storage', path: '/settings/storage', icon: HardDrive, desc: 'Offline IndexedDB caches and data cleanup' },
  ];

  const isRootSettings = location.pathname === '/settings';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
          Settings
        </h1>
        <p className={`text-xs sm:text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Manage your device identity, local networking preferences, privacy, and storage.
        </p>
      </div>

      {/* PWA INSTALL CARD */}
      <PWAInstallSection />

      {/* HORIZONTAL NAV TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-inherit scrollbar-none">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* IF ROOT /settings: SHOW OVERVIEW CARDS */}
      {isRootSettings ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                  isDark
                    ? 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 hover:border-neutral-700'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-inherit">{tab.label}</h3>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {tab.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
              </NavLink>
            );
          })}
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
};
