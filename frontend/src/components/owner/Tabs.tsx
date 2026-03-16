import type { ActiveTab } from '../../types/owner';

interface TabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isShopView?: boolean;
}

export function Tabs({ activeTab, onTabChange, isShopView = false }: TabsProps) {
  const shopTabs: { id: ActiveTab; label: string }[] = [
    { id: 'shops', label: 'My Shops' },
    { id: 'add-shop', label: 'Add Shop' }
  ];

  const shopDetailTabs: { id: ActiveTab; label: string }[] = [
    { id: 'add-item', label: 'Add Item' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'inquiries', label: 'Inquiries' },
    { id: 'edit-shop', label: 'Edit Shop' }
  ];

  const tabs = isShopView ? shopDetailTabs : shopTabs;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 mb-8">
      <nav className="flex space-x-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
