import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { REPLY_TO_INQUIRY_MUTATION } from '../../api/graphql/inquiry/inquiry-queries';

interface InquiryConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: {
    id: string;
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
  currentUserId?: string;
}

export function InquiryConversationModal({ isOpen, onClose, inquiry, currentUserId }: InquiryConversationModalProps) {
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyToInquiry] = useMutation<{
    replyToInquiry: {
      success: boolean;
      message: string;
      data?: {
        id: string;
        message: string;
        createdAt: string;
      };
    };
  }>(REPLY_TO_INQUIRY_MUTATION);

  const handleSubmitReply = async () => {
    if (!replyMessage.trim()) return;

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
        setReplyMessage('');
        // Note: You may want to refetch the inquiry data here to update the conversation
        // This would require passing a refetch function as a prop
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Conversation</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Item: {inquiry.item}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Initial inquiry message */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm">
                {inquiry.replies[0]?.author?.name?.[0] || 'U'}
              </div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {inquiry.replies[0]?.author?.name || 'You'}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(inquiry.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 max-w-[80%]">
              <p className="text-sm text-zinc-900 dark:text-zinc-100">{inquiry.message}</p>
            </div>
          </div>

          {/* Replies */}
          {inquiry.replies.map((reply) => (
            <div
              key={reply.id}
              className={`flex flex-col space-y-1 ${
                reply.author?.id === currentUserId ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center space-x-2">
                {reply.author?.id === currentUserId ? (
                  <>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(reply.createdAt).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {reply.author?.name || 'You'}
                    </span>
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm">
                      {reply.author?.name?.[0] || 'U'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm">
                      {reply.author?.name?.[0] || 'S'}
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {reply.author?.name || 'Shop Owner'}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(reply.createdAt).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
              <div
                className={`rounded-lg p-3 max-w-[80%] ${
                  reply.author?.id === currentUserId
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                <p className="text-sm">{reply.message}</p>
              </div>
            </div>
          ))}
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
