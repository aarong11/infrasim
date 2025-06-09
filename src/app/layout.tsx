import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'InfraSim - Infrastructure Simulator',
  description: 'Natural language infrastructure simulation with LangChain and Ollama',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-cyber-dark`}>{children}</body>
    </html>
  )
}
