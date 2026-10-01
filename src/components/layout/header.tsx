import { Bell, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="flex items-start justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-sm transition-colors duration-75"
          aria-label="Notifications"
        >
          <Bell size={16} strokeWidth={1.5} />
        </button>
        <button
          className="w-7 h-7 bg-gray-200 rounded-sm flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors duration-75"
          aria-label="Account"
        >
          <User size={14} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
