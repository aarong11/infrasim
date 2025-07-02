'use client';

import React, { useEffect, useState } from 'react';
import { ChatComponent } from '@components/ChatComponent';
import { CommunicationBar } from '@components/CommunicationBar';
import { SettingsModal } from '@components/SettingsModal';
import TopMenuBar from '@components/TopMenuBar';
import LogsConsole from '@components/LogsConsole';
import { ViewPortal } from '@components/ViewPortal';
import { UnifiedWalletProvider } from '@providers/UnifiedWalletProvider';
import { SetupCheck } from '@components/SetupCheck';
import { ThemeProvider } from '@contexts/ThemeContext';

export function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isIframeMode, setIsIframeMode] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check if we're in iframe mode
    const urlParams = new URLSearchParams(window.location.search)
    const iframeParam = urlParams.get('iframe') === 'true'
    
    // Also check if we're actually in an iframe
    let isInIframe = false
    try {
      isInIframe = window.self !== window.top
    } catch (e) {
      isInIframe = true
    }
    
    setIsIframeMode(iframeParam || isInIframe)
    setIsInitialized(true)
  }, [])

  // Don't render anything until we've determined iframe mode
  if (!isInitialized) {
    return (
      <ThemeProvider>
        <div className="explorer-page flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
        </div>
      </ThemeProvider>
    )
  }

  // If we're in iframe mode, render content directly without navigation or communication bar
  if (isIframeMode) {
    return (
      <ThemeProvider>
        <UnifiedWalletProvider>
          {/* Main content - no padding needed since no communication bar in iframe */}
          <div className="h-full overflow-auto">
            {children}
          </div>
          
          {/* Chat Component - controlled by parent */}
          <ChatComponent />
          
          {/* These stay persistent but are positioned for iframe mode */}
          <LogsConsole />
          <SettingsModal />
        </UnifiedWalletProvider>
      </ThemeProvider>
    )
  }

  // Normal mode with navigation and communication bar, wrapped in setup check
  return (
    <ThemeProvider>
      <UnifiedWalletProvider>
        <SetupCheck>
          {/* Fixed top navigation bar */}
          <div className="fixed top-0 left-0 right-0 z-50 h-16">
            <TopMenuBar />
          </div>
          
          {/* Main content area with iframe - accounting for top nav and bottom communication bar */}
          <div className="flex flex-col h-screen">
            <div className="flex-shrink-0 h-16"></div>
            <div className="flex-1 pb-16">
              <ViewPortal />
            </div>
          </div>
          
          {/* Communication bar at bottom */}
          <CommunicationBar />
          
          {/* Chat Component */}
          <ChatComponent />
          
          {/* These stay persistent outside the iframe */}
          <LogsConsole />
          <SettingsModal />
        </SetupCheck>
      </UnifiedWalletProvider>
    </ThemeProvider>
  )
}