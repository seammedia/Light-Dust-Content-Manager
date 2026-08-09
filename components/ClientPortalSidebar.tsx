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
  hasAnalytics: boolean;
  hasComments: boolean;
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
  { id: 'analytics' as const, label: 'Analytics', icon: ChartNoAxesCombined, access: 'analytics' as const },
  { id: 'comments' as const, label: 'Comments', icon: MessageSquareText, access: 'comments' as const },
  { id: 'social-inbox' as const, label: 'Social Inbox', icon: Inbox, access: 'social-inbox' as const },
];

export function ClientPortalSidebar({
  activeSection,
  clientName,
  collapsed,
  hasAnalytics,
  hasComments,
  hasSocialInbox,
  notificationUnread,
  isMasterAccount,
  onNavigate,
  onToggle,
  onLogout,
}: ClientPortalSidebarProps) {
  return (
    <aside className={`app-sidebar hidden shrink-0 flex-col border-r border-white/[0.06] bg-[#182019] transition-[width] duration-300 ease-out lg:flex ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="sticky top-[72px] flex h-[calc(100vh-72px)] flex-col p-3">
        <button
          type="button"
          onClick={onToggle}
          className="mb-3 flex h-10 items-center justify-center rounded-xl text-white/40 transition-all hover:bg-white/[0.07] hover:text-white"
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        {!collapsed && (
          <div className="mb-4 animate-[ui-page-in_300ms_cubic-bezier(0.22,1,0.36,1)_both] rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Workspace</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{clientName}</p>
          </div>
        )}

        <nav aria-label="Client portal" className="space-y-1">
          {navigation.map(({ id, label, icon: Icon, access }) => {
            const isLocked = access === 'analytics'
              ? !hasAnalytics
              : access === 'comments'
                ? !hasComments
                : access === 'social-inbox'
                  ? !hasSocialInbox
                  : false;
            return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className={`relative flex h-11 w-full items-center rounded-xl text-sm font-medium transition-all ${
                collapsed ? 'justify-center' : 'gap-3 px-3'
              } ${
                activeSection === id
                  ? 'bg-[#dce9d7] text-[#182019] shadow-[0_10px_24px_rgba(0,0,0,0.20)]'
                  : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
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
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-bold text-current">
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
                className={`flex h-11 w-full items-center rounded-xl text-sm font-medium transition-all ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  activeSection === 'clients'
                    ? 'bg-[#dce9d7] text-[#182019] shadow-sm'
                    : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Client management</span>}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('leads')}
                title={collapsed ? 'Lead management' : undefined}
                className={`flex h-11 w-full items-center rounded-xl text-sm font-medium transition-all ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  activeSection === 'leads'
                    ? 'bg-[#dce9d7] text-[#182019] shadow-sm'
                    : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <Handshake className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Lead management</span>}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                title={collapsed ? 'Analytics emails' : undefined}
                className={`flex h-11 w-full items-center rounded-xl text-sm font-medium transition-all ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  activeSection === 'reports'
                    ? 'bg-[#dce9d7] text-[#182019] shadow-sm'
                    : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <MailCheck className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Analytics emails</span>}
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto space-y-1 border-t border-white/[0.08] pt-3">
          <button
            type="button"
            onClick={() => onNavigate('support')}
            title={collapsed ? 'Help & support' : undefined}
            className={`flex h-11 w-full items-center rounded-xl text-sm font-medium transition-all ${
              collapsed ? 'justify-center' : 'gap-3 px-3'
            } ${
              activeSection === 'support'
                ? 'bg-[#dce9d7] text-[#182019] shadow-sm'
                : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
            }`}
          >
            <CircleHelp className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Help & support</span>}
          </button>
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? 'Log out' : undefined}
            className={`flex h-11 w-full items-center rounded-xl text-sm font-medium text-white/45 transition-all hover:bg-red-500/10 hover:text-red-300 ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
