import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { REPLY_TO_INQUIRY_MUTATION, INQUIRY_QUERY } from '../../api/graphql/inquiry/inquiry-queries';
import { Modal } from '../common/Modal';
import { useAuth } from '../../api/graphql/apolloProviderWithAuth';

interface InquiryConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: string;
}

export function InquiryConversationModal({ isOpen, onClose, inquiryId }: InquiryConversationModalProps) {
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [localReplies, setLocalReplies] = useState<Array<{
    id: string;
    author?: {
      id: string;
      name: string;
      profilePhoto?: string;
    };
    message: string;
    createdAt: string;
  }>>([]);
  const { userInfo } = useAuth();

  const { data } = useQuery<{
    inquiry: {
      success: boolean;
      message: string;
      data?: {
        id: string;
        user?: {
          id: string;
          name: string;
          profilePhoto?: string;
        };
        shop?: {
          id: string;
          name: string;
        };
        item: string;
        message: string;
        status: string;
        replies: Array<{
          id: string;
          author?: {
            id: string;
            name: string;
            profilePhoto?: string;
          };
          message: string;
          createdAt: string;
        }>;
        createdAt: string;
      };
    };
  }>(INQUIRY_QUERY, {
    variables: { id: inquiryId },
    skip: !isOpen || !inquiryId,
    fetchPolicy: 'cache-and-network'
  });

  const inquiry = data?.inquiry.data;

  // Reset local replies when modal opens with new data
  useEffect(() => {
    if (inquiry) {
      setLocalReplies(inquiry.replies || []);
    }
  }, [inquiry?.id, inquiry?.replies]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localReplies, isOpen]);

  const [replyToInquiry] = useMutation<{
    replyToInquiry: {
      success: boolean;
      message: string;
      data?: {
        id: string;
        author?: {
          id: string;
          name: string;
          profilePhoto?: string;
        };
        message: string;
        createdAt: string;
      };
    };
  }>(REPLY_TO_INQUIRY_MUTATION);

  const handleSubmitReply = async () => {
    if (!replyMessage.trim() || !inquiry) return;

    setIsSubmitting(true);
    try {
      const result = await replyToInquiry({
        variables: {
          input: {
            inquiryId: inquiry.id,
            message: replyMessage.trim()
          }
        }
      });

      if (result.data?.replyToInquiry?.success) {
        const newReply = {
          id: result.data.replyToInquiry.data?.id || Date.now().toString(),
          message: replyMessage.trim(),
          createdAt: result.data.replyToInquiry.data?.createdAt || new Date().toISOString(),
          author: userInfo ? {
            id: userInfo.id,
            name: userInfo.name || 'You',
            profilePhoto: userInfo.profilePhoto
          } : undefined
        };
        
        setLocalReplies(prev => [...prev, newReply]);
        setReplyMessage('');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name?: string): string => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleImgError = (id: string) => {
    setImgErrors(prev => new Set(prev).add(id));
  };

  const ProfilePhoto = ({ user, size = 'w-8 h-8' }: { user?: { name?: string; profilePhoto?: string; id?: string }, size?: string }) => {
    const hasError = user?.id ? imgErrors.has(user.id) : false;
    const photo = user?.profilePhoto;
    
    if (photo && !hasError) {
      return (
        <img
          src={photo}
          alt={user.name}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={() => user?.id && handleImgError(user.id)}
          className={`${size} rounded-full object-cover border border-zinc-200 dark:border-zinc-700`}
        />
      );
    }
    
    return (
      <div className={`${size} rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium`}>
        {getUserInitials(user?.name)}
      </div>
    );
  };

  if (!inquiry) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Conversation" maxWidth="lg">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Conversation" maxWidth="lg">
      <div className="flex flex-col">
        {/* Item info */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <p className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-1">
            {inquiry.user?.name || 'You'}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Item: {inquiry.item}</p>
        </div>

        {/* Messages */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Initial inquiry message */}
          <div
            className={`flex flex-col space-y-1 ${
              inquiry.user?.id === userInfo?.id ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center space-x-2">
              {inquiry.user?.id === userInfo?.id ? (
                <>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(inquiry.createdAt).toLocaleString()}
                  </span>
                  <ProfilePhoto user={inquiry.user} />
                </>
              ) : (
                <>
                  <ProfilePhoto user={inquiry.user} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(inquiry.createdAt).toLocaleString()}
                  </span>
                </>
              )}
            </div>
            <div
              className={`rounded-lg p-3 max-w-[80%] ${
                inquiry.user?.id === userInfo?.id
                  ? 'bg-primary text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800'
              }`}
            >
              <p className="text-sm">{inquiry.message}</p>
            </div>
          </div>

          {/* Replies */}
          {localReplies.map((reply) => (
            <div
              key={reply.id}
              className={`flex flex-col space-y-1 ${
                reply.author?.id === userInfo?.id ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center space-x-2">
                {reply.author?.id === userInfo?.id ? (
                  <>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(reply.createdAt).toLocaleString()}
                    </span>
                    <ProfilePhoto user={reply.author} />
                  </>
                ) : (
                  <>
                    <ProfilePhoto user={reply.author} />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(reply.createdAt).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  reply.author?.id === userInfo?.id
                    ? 'bg-primary text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                <p className="text-sm">{reply.message}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply input */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitReply()}
            />
            <button
              onClick={handleSubmitReply}
              disabled={!replyMessage.trim() || isSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
