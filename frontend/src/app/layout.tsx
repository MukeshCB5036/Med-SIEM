import React from 'react'
import { AuthProvider } from '@/context/AuthContext'
import SOCNavHeader from '@/components/SOCNavHeader'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MedSIEM — Healthcare SOC Dashboard',
  description: 'Security Information and Event Management Platform for Healthcare',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>
          <SOCNavHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
