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
      state.selectedLocation = undefined;
    },
  },
});

export const { openSideNav, closeSideNav } = sideNavSlice.actions;
export default sideNavSlice.reducer;
