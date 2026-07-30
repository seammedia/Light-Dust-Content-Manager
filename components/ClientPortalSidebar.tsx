import {
  Building2,
  CalendarDays,
  Bell,
  CircleHelp,
  CreditCard,
  Home,
  Link2,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  MailCheck,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  ChartNoAxesCombined,
  Handshake,
  Users,
} from 'lucide-react';

export type PortalSection = 'home' | 'notifications' | 'content' | 'account' | 'connections' | 'billing' | 'analytics' | 'comments' | 'social-inbox' | 'support' | 'clients' | 'reports' | 'leads';

interface ClientPortalSidebarProps {
  activeSection: PortalSection;
  clientName: string;
  collapsed: boolean;
  hasMaxFeatures: boolean;
  hasSocialInbox: boolean;
  notificationUnread: number;
  isMasterAccount: boolean;
  onNavigate: (section: PortalSection) => void;
  onToggle: () => void;
  onLogout: () => void;
}

const navigation = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'content' as const, label: 'Social calendar', icon: CalendarDays },
  { id: 'account' as const, label: 'Account & brand', icon: Building2 },
  { id: 'connections' as const, label: 'Social accounts', icon: Link2 },
  { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  { id: 'analytics' as const, label: 'Analytics', icon: ChartNoAxesCombined, locked: true },
  { id: 'comments' as const, label: 'Comments', icon: MessageSquareText, locked: true },
  { id: 'social-inbox' as const, label: 'Social Inbox', icon: Inbox, socialInbox: true },
];

export function ClientPortalSidebar({
  activeSection,
  clientName,
  collapsed,
  hasMaxFeatures,
  hasSocialInbox,
  notificationUnread,
  isMasterAccount,
  onNavigate,
  onToggle,
  onLogout,
}: ClientPortalSidebarProps) {
  return (
    <aside className={`hidden lg:flex shrink-0 flex-col border-r border-stone-200 bg-white transition-[width] duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col p-3">
        <button
          type="button"
          onClick={onToggle}
          className="mb-3 flex h-10 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-brand-dark"
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        {!collapsed && (
          <div className="mb-4 rounded-xl bg-[#F5F5F0] px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Workspace</p>
            <p className="mt-1 truncate text-sm font-semibold text-brand-dark">{clientName}</p>
          </div>
        )}

        <nav aria-label="Client portal" className="space-y-1">
          {navigation.map(({ id, label, icon: Icon, locked, socialInbox }) => {
            const isLocked = Boolean((locked && !hasMaxFeatures) || (socialInbox && !hasSocialInbox));
            return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className={`relative flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors ${
                collapsed ? 'justify-center' : 'gap-3 px-3'
              } ${
                activeSection === id
                  ? 'bg-brand-green text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-brand-dark'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {collapsed && id === 'notifications' && notificationUnread > 0 && (
                <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notificationUnread > 9 ? '9+' : notificationUnread}
                </span>
              )}
              {!collapsed && (
                <>
                  <span>{label}</span>
                  {id === 'notifications' && notificationUnread > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-200 px-1.5 text-[10px] font-bold text-stone-600">
                      {notificationUnread > 99 ? '99+' : notificationUnread}
                    </span>
                  )}
                  {isLocked && <LockKeyhole className="ml-auto h-3.5 w-3.5 opacity-60" aria-label="Not available on current plan" />}
                </>
              )}
            </button>
            );
          })}

          {isMasterAccount && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('clients')}
                title={collapsed ? 'Client management' : undefined}
                className={`flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  activeSection === 'clients'
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-brand-dark'
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Client management</span>}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('leads')}
                title={collapsed ? 'Lead management' : undefined}
                className={`flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  activeSection === 'leads'
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-brand-dark'
                }`}
              >
                <Handshake className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Lead management</span>}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                title={collapsed ? 'Analytics emails' : undefined}
                className={`flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  activeSection === 'reports'
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-brand-dark'
                }`}
              >
                <MailCheck className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Analytics emails</span>}
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto space-y-1 border-t border-stone-200 pt-3">
          <button
            type="button"
            onClick={() => onNavigate('support')}
            title={collapsed ? 'Help & support' : undefined}
            className={`flex h-11 w-full items-center rounded-lg text-sm font-medium transition-colors ${
              collapsed ? 'justify-center' : 'gap-3 px-3'
            } ${
              activeSection === 'support'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-stone-600 hover:bg-stone-100 hover:text-brand-dark'
            }`}
          >
            <CircleHelp className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Help & support</span>}
          </button>
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? 'Log out' : undefined}
            className={`flex h-11 w-full items-center rounded-lg text-sm font-medium text-stone-500 transition-colors hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
