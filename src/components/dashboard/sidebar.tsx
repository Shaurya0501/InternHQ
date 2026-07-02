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
  Terminal,
  Menu,
  X,
  Compass,
  Bookmark,
  Bell,
  Activity,
  Video,
  HelpCircle,
  Award,
  Users
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

  interface NavItem {
    label: string
    href: string
    icon: React.ReactNode
    badge?: string
  }

  const navItems: NavItem[] = [
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
      label: 'Interviews',
      href: '/dashboard/interviews',
      icon: <Video className="h-4 w-4" />
    },
    {
      label: 'Messages',
      href: '/dashboard/messages',
      icon: <MessageSquare className="h-4 w-4" />
    },
    {
      label: 'Question Bank',
      href: '/dashboard/questions',
      icon: <HelpCircle className="h-4 w-4" />
    },
    {
      label: 'Skill Progress',
      href: '/dashboard/skills',
      icon: <Award className="h-4 w-4" />
    },
    {
      label: 'Community Feed',
      href: '/community/interviews',
      icon: <Users className="h-4 w-4" />
    },
    {
      label: 'Notifications',
      href: '/dashboard/notifications',
      icon: <Bell className="h-4 w-4" />
    },
    {
      label: 'Activity Feed',
      href: '/dashboard/activity',
      icon: <Activity className="h-4 w-4" />
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
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-white/50 cursor-not-allowed select-none text-xs hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-[8px] text-white/60 font-mono py-0 px-1.5 uppercase">
                    {item.badge}
                  </Badge>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 border ${
                  isActive
                    ? 'bg-white/20 text-white border-white/20 shadow-sm'
                    : 'text-white/70 hover:text-white border-transparent hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-white/70'}>
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
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-md cursor-pointer"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          onClick={toggleMobileSidebar}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Frame */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-45 flex flex-col w-64 bg-white/10 border-r border-white/20 backdrop-blur-xl transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Banner */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-white/20 bg-white/5">
          <div className="h-7 w-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center font-bold text-white shadow-lg text-xs">
            I
          </div>
          <span className="font-bold text-sm text-white">
            InternHQ
          </span>
          <Badge variant="outline" className="border-white/20 bg-white/10 text-white text-[8px] px-1 font-mono uppercase scale-90">
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
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white/70 hover:text-white text-[10px] text-left hover:border-white/30 hover:bg-white/10 transition duration-150 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" />
              Search commands...
            </span>
            <kbd className="hidden md:inline-block border border-white/20 px-1 bg-white/15 text-[8px] rounded font-mono text-white/95">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav Links */}
        {renderNavList()}

        {/* User profile Summary tray */}
        <div className="p-4 border-t border-white/20 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white/20 bg-white/5 shrink-0">
              <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs text-white truncate leading-tight">
                {profile.fullName}
              </h4>
              <p className="text-[9px] text-white/80 truncate mt-0.5 font-mono">
                {profile.degree}
              </p>
              <p className="text-[8px] text-white/70 truncate mt-0.5 uppercase tracking-wide">
                {profile.university}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
