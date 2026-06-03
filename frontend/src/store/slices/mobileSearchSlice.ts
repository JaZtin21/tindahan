import { createSlice } from '@reduxjs/toolkit';

interface MobileSearchState {
  isSearchVisible: boolean;
}

const initialState: MobileSearchState = {
  isSearchVisible: false,
};

const mobileSearchSlice = createSlice({
  name: 'mobileSearch',
  initialState,
  reducers: {
    toggleMobileSearch: (state) => {
      state.isSearchVisible = !state.isSearchVisible;
    },
    showMobileSearch: (state) => {
      state.isSearchVisible = true;
    },
    hideMobileSearch: (state) => {
      state.isSearchVisible = false;
    },
  },
});

export const { toggleMobileSearch, showMobileSearch, hideMobileSearch } = mobileSearchSlice.actions;
export default mobileSearchSlice.reducer;
