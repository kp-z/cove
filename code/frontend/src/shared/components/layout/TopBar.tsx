import { User } from 'lucide-react';

export function TopBar() {
  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-400">Search...</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
