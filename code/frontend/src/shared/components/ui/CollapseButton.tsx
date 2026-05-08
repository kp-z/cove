import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapseButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

export function CollapseButton({ collapsed, onClick }: CollapseButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute -right-3 top-16 w-6 h-6 bg-[#1a1d2e] border border-[#2a2d3e] rounded-full flex items-center justify-center hover:bg-[#2a2d3e] transition-colors z-10"
    >
      {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
    </button>
  );
}
