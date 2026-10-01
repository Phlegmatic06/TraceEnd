'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  Box,
  Radar,
  Activity,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Findings', href: '/findings', icon: Shield },
  { name: 'Assets', href: '/assets', icon: Box },
  { name: 'Scans', href: '/scans', icon: Radar },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const navContent = (
    <nav className="flex flex-col gap-0.5 px-2 py-3" aria-label="Primary navigation">
      {navigation.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 text-sm font-medium rounded-sm transition-colors duration-75 ${
              active
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-1.5 bg-white border border-gray-200 rounded-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-56 bg-white border-r border-gray-200 flex flex-col transition-transform duration-150 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:flex`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <div className="w-6 h-6 bg-gray-900 rounded-sm flex items-center justify-center">
            <Shield size={14} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900">TraceEnd</span>
        </div>

        {navContent}

        {/* Footer */}
        <div className="mt-auto px-4 py-3 border-t border-gray-200">
          <div className="text-xs text-gray-900 font-medium truncate">{user.name || 'User'}</div>
          <div className="text-xs text-gray-400 truncate">{user.email}</div>
        </div>
      </aside>
    </>
  );
}
