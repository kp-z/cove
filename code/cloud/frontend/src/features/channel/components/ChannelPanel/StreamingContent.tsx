/**
 * StreamingContent 组件
 * 处理流式内容的逐字显示效果
 */

import { useEffect, useState } from 'react';

interface StreamingContentProps {
  content: string;
  isStreaming: boolean;
  skipAnimation?: boolean;
  speed?: number; // 打字速度（毫秒/字符）
}

export function StreamingContent({
  content,
  isStreaming,
  skipAnimation = false,
  speed = 20,
}: StreamingContentProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    // 如果跳过动画，直接显示全部内容
    if (skipAnimation) {
      setDisplayedText(content);
      setShowCursor(false);
      return;
    }

    // 如果不是流式状态，直接显示全部内容
    if (!isStreaming) {
      setDisplayedText(content);
      setShowCursor(false);
      return;
    }

    // 流式状态：逐字显示
    setShowCursor(true);
    let index = displayedText.length;

    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedText(content.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setShowCursor(false);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [content, isStreaming, skipAnimation, speed]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {displayedText}
      {showCursor && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-blue-400 animate-pulse" />
      )}
    </span>
  );
}
