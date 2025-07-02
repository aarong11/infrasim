'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SetupCheckProps {
  children: React.ReactNode;
}

export function SetupCheck({ children }: SetupCheckProps) {
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch('/api/setup');
        const data = await response.json();
        
        if (data.success && data.setupCompleted) {
          setIsSetupCompleted(true);
        } else {
          setIsSetupCompleted(false);
          // Only redirect to setup if not already on setup page
          if (!window.location.pathname.startsWith('/setup')) {
            router.push('/setup');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
        setIsSetupCompleted(false);
        // On error, redirect to setup for safety
        if (!window.location.pathname.startsWith('/setup')) {
          router.push('/setup');
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSetupStatus();
  }, [router]);

  // Show loading while checking setup status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Checking setup status...</p>
        </div>
      </div>
    );
  }

  // If setup is not completed and we're not on the setup page, show loading
  // (the redirect should have happened by now)
  if (!isSetupCompleted && !window.location.pathname.startsWith('/setup')) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  // Setup is completed or we're on the setup page, render children
  return <>{children}</>;
}