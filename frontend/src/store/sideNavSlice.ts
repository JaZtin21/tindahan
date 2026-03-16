import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface SideNavState {
  isOpen: boolean;
  selectedLocation?: {
    name: string;
    lat: number;
    lng: number;
    type: 'store' | 'location';
    description?: string;
    image?: string;
    address?: string;
    phone?: string;
    hours?: string;
  };
}

const initialState: SideNavState = {
  isOpen: false,
  selectedLocation: undefined,
};

const sideNavSlice = createSlice({
  name: 'sideNav',
  initialState,
  reducers: {
    openSideNav: (state, action: PayloadAction<SideNavState['selectedLocation']>) => {
      state.isOpen = true;
      state.selectedLocation = action.payload;
    },
    closeSideNav: (state) => {
      state.isOpen = false;
      // Don't clear selectedLocation immediately - let animation finish
      // state.selectedLocation = undefined;
    },
    clearSideNavContent: (state) => {
      state.selectedLocation = undefined;
    },
  },
});

export const { openSideNav, closeSideNav, clearSideNavContent } = sideNavSlice.actions;
export default sideNavSlice.reducer;
