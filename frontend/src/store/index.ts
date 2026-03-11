import { configureStore } from '@reduxjs/toolkit'
import { userSlice, themeSlice, locationSlice } from './slices'

export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
    theme: themeSlice.reducer,
    location: locationSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export actions from slices
export const { setUser, clearUser } = userSlice.actions;
export const { toggleTheme, setTheme } = themeSlice.actions;
export const { setLocation, clearLocation } = locationSlice.actions;
