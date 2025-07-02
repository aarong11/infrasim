import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientLayout } from '../components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InfraSim',
  description: 'Blockchain Infrastructure Simulation Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>InfraSim - Infrastructure Simulation Platform</title>
        <meta name="description" content="Advanced infrastructure modeling and simulation platform with AI-powered assistance" />
      </head>
      <body className={`${inter.className} h-screen`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
