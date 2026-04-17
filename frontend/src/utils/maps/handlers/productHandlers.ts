import type { ProductHandlersOptions } from '../../../types/map';

export function createProductHandlers({
  setProductNameForSearch,
  setProductSearchStores,
  setFilteredStores,
  refetchShopsByProduct
}: ProductHandlersOptions) {

  const handleProductSelect = async (productName: string) => {
    // Fetch stores that have this product
    setProductNameForSearch(productName);
    const result = await refetchShopsByProduct({ productName });
    const shops = result.data?.shopsByProduct?.data || [];
    
    // Convert shops to marker format with full data for sidebar
    const storeMarkers = shops.map((shop: any) => ({
      id: shop.id,
      lat: shop.coordinates?.lat || 0,
      lng: shop.coordinates?.lng || 0,
      title: shop.name,
      description: shop.description,
      phone: shop.contactDetails?.phone,
      email: shop.contactDetails?.email,
      hours: shop.businessHours ? `${shop.businessHours.openTime} - ${shop.businessHours.closeTime}` : undefined,
      coverPhoto: shop.coverPhoto,
      businessType: shop.businessType,
      location: shop.contactDetails?.address || shop.location,
    })).filter((s: any) => s.lat && s.lng);
    
    // Update product search stores - these persist when selecting a store
    setProductSearchStores(storeMarkers);
    // Also update filtered stores for backward compatibility
    setFilteredStores(storeMarkers);
  };

  const clearProductStores = () => {
    console.log('[MapPage] Clearing product search stores');
    setProductSearchStores([]);
    setFilteredStores([]);
  };

  return { handleProductSelect, clearProductStores };
}
