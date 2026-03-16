import type { Shop } from '../../types/owner';

interface InquiriesProps {
  shop: Shop;
}

interface Inquiry {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  timestamp: string;
  status: 'pending' | 'responded' | 'resolved';
}

export function Inquiries({ shop }: InquiriesProps) {
  // Sample inquiries data
  const inquiries: Inquiry[] = [
    {
      id: '1',
      customerName: 'Juan Dela Cruz',
      customerEmail: 'juan@email.com',
      customerPhone: '+63 912 345 6789',
      message: 'Do you have fresh stocks of rice available?',
      timestamp: '2024-03-15 10:30 AM',
      status: 'pending'
    },
    {
      id: '2',
      customerName: 'Maria Santos',
      customerEmail: 'maria@email.com',
      customerPhone: '+63 923 456 7890',
      message: 'What brands of cooking oil do you have?',
      timestamp: '2024-03-15 9:15 AM',
      status: 'responded'
    },
    {
      id: '3',
      customerName: 'Pedro Reyes',
      customerEmail: 'pedro@email.com',
      customerPhone: '+63 934 567 8901',
      message: 'Can I get a discount for bulk purchase of canned goods?',
      timestamp: '2024-03-14 3:45 PM',
      status: 'resolved'
    }
  ];

  const getStatusColor = (status: Inquiry['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'responded':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Customer Inquiries</h3>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {inquiries.length} total inquiries
        </span>
      </div>

      {inquiries.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <div className="text-4xl mb-2">📬</div>
          <p>No inquiries yet</p>
          <p className="text-sm mt-1">Customer inquiries will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map(inquiry => (
            <div key={inquiry.id} className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {inquiry.customerName}
                  </h4>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                    <div>📧 {inquiry.customerEmail}</div>
                    <div>📞 {inquiry.customerPhone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                    {inquiry.status}
                  </span>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    {inquiry.timestamp}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <p className="text-zinc-700 dark:text-zinc-300">{inquiry.message}</p>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm">
                  Reply
                </button>
                <button className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm">
                  Mark as Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
