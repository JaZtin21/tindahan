import type { InventoryTableProps } from '../../types/owner';

export function InventoryTable({ shops, onEditItem, onDeleteItem }: InventoryTableProps) {
  const getStockStatus = (stock: number) => {
    if (stock > 50) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    } else if (stock > 10) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {shops.map(shop => (
        <div key={shop.id} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-4">{shop.name}</h3>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-2 px-4 min-w-[200px]">Item Name</th>
                  <th className="text-left py-2 px-4 min-w-[120px]">Category</th>
                  <th className="text-left py-2 px-4 min-w-[100px]">Price</th>
                  <th className="text-left py-2 px-4 min-w-[100px]">Stock</th>
                  <th className="text-left py-2 px-4 min-w-[250px]">Description</th>
                  <th className="text-left py-2 px-4 min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shop.inventory?.length ? (
                  shop.inventory.map(item => (
                    <tr key={item.id} className="border-b border-zinc-200 dark:border-zinc-700">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-zinc-200 dark:bg-zinc-700 rounded-full text-xs whitespace-nowrap">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">₱{item.price.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getStockStatus(item.stock)}`}>
                          {item.stock} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">{item.description}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEditItem(shop.id, item.id)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors whitespace-nowrap"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDeleteItem(shop.id, item.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors whitespace-nowrap"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                      No items in inventory. Add items from the &quot;Add Item&quot; tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
