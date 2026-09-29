import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LocalLinkProvider } from './context/LocalLinkContext';
import { AppLayout } from './components/layout/AppLayout';

import { HomePage } from './pages/HomePage';
import { DevicesPage } from './pages/DevicesPage';
import { ConnectPage } from './pages/ConnectPage';
import { ConnectCodePage } from './pages/ConnectCodePage';
import { ConnectScanPage } from './pages/ConnectScanPage';
import { ChatsPage } from './pages/ChatsPage';
import { ChatPage } from './pages/ChatPage';
import { TransfersPage } from './pages/TransfersPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { ConnectionSettingsPage } from './pages/ConnectionSettingsPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { PrivacySettingsPage } from './pages/PrivacySettingsPage';
import { StorageSettingsPage } from './pages/StorageSettingsPage';
import { AboutPage } from './pages/AboutPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <ThemeProvider>
      <LocalLinkProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="connect" element={<ConnectPage />} />
              <Route path="connect/code" element={<ConnectCodePage />} />
              <Route path="connect/scan" element={<ConnectScanPage />} />
              <Route path="chats" element={<ChatsPage />} />
              <Route path="chats/:deviceId" element={<ChatPage />} />
              <Route path="transfers" element={<TransfersPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />}>
                <Route path="profile" element={<ProfileSettingsPage />} />
                <Route path="connection" element={<ConnectionSettingsPage />} />
                <Route path="notifications" element={<NotificationSettingsPage />} />
                <Route path="privacy" element={<PrivacySettingsPage />} />
                <Route path="storage" element={<StorageSettingsPage />} />
              </Route>
              <Route path="about" element={<AboutPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </LocalLinkProvider>
    </ThemeProvider>
  );
}
