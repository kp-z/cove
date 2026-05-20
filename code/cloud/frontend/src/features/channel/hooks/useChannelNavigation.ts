import { useParams, useNavigate } from 'react-router';

interface UseChannelNavigationReturn {
  channelId?: string;
  threadId?: string;
  selectChannel: (channelId: string) => void;
  selectThread: (threadId: string) => void;
  clearSelection: () => void;
}

export function useChannelNavigation(): UseChannelNavigationReturn {
  const { channelId, threadId } = useParams<{ channelId?: string; threadId?: string }>();
  const navigate = useNavigate();

  const selectChannel = (id: string) => {
    navigate(`/channel/${id}`);
  };

  const selectThread = (id: string) => {
    if (!channelId) return;
    navigate(`/channel/${channelId}/${id}`);
  };

  const clearSelection = () => {
    navigate('/channel');
  };

  return {
    channelId,
    threadId,
    selectChannel,
    selectThread,
    clearSelection,
  };
}
