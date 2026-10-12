import { useState } from 'react';
import { ClipboardList, History, Wallet, Menu, X } from 'lucide-react';
import type { TabId } from '@/types';
import EntryTab from '@/components/EntryTab';
import HistoryTab from '@/components/HistoryTab';
import PayTab from '@/components/PayTab';

const MOCK_USER = {
  id: 'mock-user',
  username: 'Driver',
  email: null,
};

const tabs: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
  { id: 'entry', label: 'New Entry', icon: ClipboardList },
  { id: 'history', label: 'History', icon: History },
  { id: 'pay', label: 'Pay & Claims', icon: Wallet },
];

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('entry');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-auspost-gray-light flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-auspost-gray-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/images/AusPost_logo.png" alt="Australia Post" className="h-8 w-auto" />
              <div className="hidden sm:block border-l border-auspost-gray-border pl-3">
                <h1 className="text-auspost-charcoal text-lg font-display font-bold leading-tight">
                  Parcel Log Pro
                </h1>
                <p className="text-auspost-gray text-xs">Contractor Portal</p>
              </div>
            </div>

            {/* Desktop tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-auspost text-sm font-semibold transition-all ${
                      active
                        ? 'bg-auspost-red text-white'
                        : 'text-auspost-gray hover:bg-auspost-gray-light hover:text-auspost-charcoal'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-auspost-charcoal">
                  Driver
                </p>
                <p className="text-xs text-auspost-gray">Van</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-auspost-red-light flex items-center justify-center">
                <span className="text-sm font-bold text-auspost-red">
                  D
                </span>
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-auspost-charcoal"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-auspost-gray-border bg-white animate-slide-down">
            <div className="px-4 py-3 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-auspost text-sm font-semibold transition-all ${
                      active
                        ? 'bg-auspost-red text-white'
                        : 'text-auspost-charcoal hover:bg-auspost-gray-light'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        {activeTab === 'entry' && <EntryTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'pay' && <PayTab />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-auspost-gray-border z-30">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
                  active ? 'text-auspost-red' : 'text-auspost-gray'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-xs font-semibold">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
