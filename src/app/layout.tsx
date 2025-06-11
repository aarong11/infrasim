import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import TopMenuBar from '../components/TopMenuBar'
import LogsConsole from '../components/LogsConsole'
import { SettingsModal } from '../components/SettingsModal'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InfraSim - Infrastructure Simulation Platform',
  description: 'AI-powered infrastructure simulation and visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TopMenuBar />
        <main className="pt-16">
          {children}
        </main>
        <LogsConsole />
        <SettingsModal />
      </body>
    </html>
  )
}
