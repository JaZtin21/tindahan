import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { INQUIRIES_FOR_SHOP_QUERY, UPDATE_INQUIRY_STATUS_MUTATION } from '../../api/graphql/inquiry/inquiry-queries';
import { InquiryConversationModal } from '../inquiry/InquiryConversationModal';
import type { InquiriesProps } from '../../types/owner';

export function Inquiries({ shop }: InquiriesProps) {
  const [page, setPage] = useState(1);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<{
    inquiriesForShop: {
      success: boolean;
      message: string;
      data: Array<{
        id: string;
        user?: {
          id: string;
          name: string;
          email: string;
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
        updatedAt?: string;
      }>;
      total: number;
      page: number;
      totalPages: number;
    };
  }>(INQUIRIES_FOR_SHOP_QUERY, {
    variables: { shopID: shop.id, page, limit: 10 },
    skip: !shop.id,
    fetchPolicy: 'cache-and-network'
  });

  const [updateInquiryStatus] = useMutation<{
    updateInquiryStatus: {
      success: boolean;
      message: string;
      data?: {
        id: string;
        status: string;
        updatedAt: string;
      };
    };
  }>(UPDATE_INQUIRY_STATUS_MUTATION);

  const inquiries = data?.inquiriesForShop?.data || [];
  const total = data?.inquiriesForShop?.total || 0;

  const handleUpdateStatus = async (inquiryId: string, newStatus: 'PENDING' | 'RESPONDED' | 'RESOLVED' | 'CLOSED') => {
    try {
      const result = await updateInquiryStatus({
        variables: {
          input: {
            inquiryId,
            status: newStatus
          }
        }
      });
      
      if (result.data?.updateInquiryStatus?.success) {
        refetch();
      }
    } catch (error) {
      console.error('Error updating inquiry status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'RESPONDED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <span className="ml-3 text-zinc-600 dark:text-zinc-400">Loading inquiries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <p className="text-red-700 dark:text-red-300">
          Error loading inquiries: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Customer Inquiries</h3>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {total} total inquiries
        </span>
      </div>

      {inquiries.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <div className="text-4xl mb-2">📬</div>
          <p>No inquiries yet</p>
          <p className="text-sm mt-1">Customer inquiries will appear here</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {inquiries.map(inquiry => (
              <div key={inquiry.id} className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {inquiry.user?.name || 'Unknown Customer'}
                    </h4>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                      <div>📧 {inquiry.user?.email || 'No email'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      {formatTimestamp(inquiry.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                  <div className="mb-2">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      <strong>Item:</strong> {inquiry.item}
                    </p>
                    <p className="text-zinc-700 dark:text-zinc-300">{inquiry.message}</p>
                  </div>
                  
                  {/* Replies */}
                  {inquiry.replies && inquiry.replies.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        {inquiry.replies.length} {inquiry.replies.length === 1 ? 'reply' : 'replies'}
                      </p>
                      <button
                        onClick={() => {
                          setSelectedInquiryId(inquiry.id);
                          setIsConversationModalOpen(true);
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        See Conversation
                      </button>
                    </div>
                  )}
                  
                  {/* Status Buttons */}
                  <div className="mt-4 flex gap-2">
                    {inquiry.status !== 'RESOLVED' && inquiry.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleUpdateStatus(inquiry.id, 'RESOLVED')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Mark as Resolved
                      </button>
                    )}
                    
                    {inquiry.status !== 'CLOSED' && (
                      <button
                        onClick={() => handleUpdateStatus(inquiry.id, 'CLOSED')}
                        className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Close Inquiry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {data?.inquiriesForShop?.totalPages && data.inquiriesForShop.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-zinc-600 dark:text-zinc-400">
                Page {page} of {data.inquiriesForShop.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.inquiriesForShop.totalPages, page + 1))}
                disabled={page === data.inquiriesForShop.totalPages}
                className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Inquiry Conversation Modal */}
      {selectedInquiryId && (
        <InquiryConversationModal
          isOpen={isConversationModalOpen}
          onClose={() => {
            setIsConversationModalOpen(false);
            setSelectedInquiryId(null);
          }}
          inquiryId={selectedInquiryId}
        />
      )}
    </div>
  );
}
