import React from 'react'
import { AuthProvider } from '@/context/AuthContext'
import SOCLayout from '@/components/SOCLayout'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MedSIEM — Healthcare SOC Dashboard',
  description: 'Security Information and Event Management Platform for Healthcare',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
        <AuthProvider>
          <SOCLayout>
            {children}
          </SOCLayout>
        </AuthProvider>
      </body>
    </html>
  )
}

