import { createSlice } from '@reduxjs/toolkit'

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    id: null,
    role: null,
    displayName: null,
    email: null,
  },
  reducers: {
    setUser: (state, action) => {
      return { ...state, ...action.payload };
    },
    clearUser: () => ({
      id: null,
      role: null,
      displayName: null,
      email: null,
    }),
  },
});
