/**
 * TypingIndicator 组件
 * 显示正在输入的用户
 */

interface TypingIndicatorProps {
  users: string[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0]} 正在输入`
      : users.length === 2
      ? `${users[0]} 和 ${users[1]} 正在输入`
      : `${users[0]} 等 ${users.length} 人正在输入`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400 animate-fade-in">
      <div className="flex gap-1">
        <span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>{text}</span>
    </div>
  );
}
