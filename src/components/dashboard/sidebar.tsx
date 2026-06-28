'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  FileCode,
  Settings,
  Sparkles,
  Terminal,
  Menu,
  X,
  Compass,
  Bookmark
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  profile: {
    fullName: string
    avatarUrl: string
    university: string
    degree: string
  }
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />
    },
    {
      label: 'Discover',
      href: '/dashboard/internships',
      icon: <Compass className="h-4 w-4" />
    },
    {
      label: 'Saved Internships',
      href: '/dashboard/saved',
      icon: <Bookmark className="h-4 w-4" />
    },
    {
      label: 'Applications',
      href: '/dashboard/applications',
      icon: <ClipboardList className="h-4 w-4" />
    },
    {
      label: 'Interview Prep',
      href: '#',
      icon: <MessageSquare className="h-4 w-4" />,
      badge: 'Soon'
    },
    {
      label: 'Vault',
      href: '/dashboard/resumes',
      icon: <FileCode className="h-4 w-4" />
    },
    {
      label: 'Settings',
      href: '/dashboard/profile',
      icon: <Settings className="h-4 w-4" />
    }
  ]

  const toggleMobileSidebar = () => {
    setIsOpen(!isOpen)
  }

  const renderNavList = () => (
    <nav className="flex-1 space-y-1.5 px-3 py-4">
      {navItems.map((item, idx) => {
        const isActive = pathname === item.href
        const isDisabled = item.href === '#'

        return (
          <div key={idx}>
            {isDisabled ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-500 cursor-not-allowed select-none text-xs hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="outline" className="border-white/5 bg-slate-900 text-[8px] text-slate-500 font-mono py-0 px-1.5 uppercase">
                    {item.badge}
                  </Badge>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/5 text-white border-white/10 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile Burger Button */}
      <button
        onClick={toggleMobileSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white backdrop-blur-md"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          onClick={toggleMobileSidebar}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Frame */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-45 flex flex-col w-64 bg-slate-950/80 border-r border-white/5 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Banner */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/5 bg-slate-950/40">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-xs">
            I
          </div>
          <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            InternHQ
          </span>
          <Badge variant="outline" className="border-blue-500/20 bg-blue-500/5 text-blue-400 text-[8px] px-1 font-mono uppercase scale-90">
            Console
          </Badge>
        </div>

        {/* Command Palette Trigger in Sidebar */}
        <div className="px-4 pt-4">
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
              setIsOpen(false)
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-slate-500 hover:text-slate-300 text-[10px] text-left hover:border-white/10 transition duration-150"
          >
            <span className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" />
              Search commands...
            </span>
            <kbd className="hidden md:inline-block border border-white/15 px-1 bg-slate-950 text-[8px] rounded font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav Links */}
        {renderNavList()}

        {/* User profile Summary tray */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white/10 bg-slate-900 shrink-0">
              <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs text-slate-200 truncate leading-tight">
                {profile.fullName}
              </h4>
              <p className="text-[9px] text-slate-500 truncate mt-0.5 font-mono">
                {profile.degree}
              </p>
              <p className="text-[8px] text-slate-600 truncate mt-0.5 uppercase tracking-wide">
                {profile.university}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
