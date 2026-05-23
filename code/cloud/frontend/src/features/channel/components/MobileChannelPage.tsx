import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ChannelPanel } from './ChannelPanel';
import { useChannelNavigation } from '../hooks/useChannelNavigation';

export default function MobileChannelPage() {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const { threadId } = useChannelNavigation();

  const handleBack = () => {
    navigate('/channels');
  };

  if (!channelId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[#1a1d2e] flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Back to channels"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Channel Panel */}
      <div className="flex-1 overflow-hidden">
        <ChannelPanel
          channel_id={channelId}
          thread_id={threadId}
          className="h-full"
        />
      </div>
    </div>
  );
}
