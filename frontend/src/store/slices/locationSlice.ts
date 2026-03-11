import { createSlice } from '@reduxjs/toolkit'

export const locationSlice = createSlice({
  name: 'location',
  initialState: {
    lat: null,
    lng: null,
  },
  reducers: {
    setLocation: (state, action) => {
      return { ...state, ...action.payload };
    },
    clearLocation: () => ({
      lat: null,
      lng: null,
    }),
  },
});
