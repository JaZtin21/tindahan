import { createSlice } from '@reduxjs/toolkit';

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    id: null,
    role: null,
    name: null,       // 👈 Changed from displayName to match API
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    profilePhoto: null,
    coverPhoto: null,
    birthday: null,
    following: [] as string[],
    followers: [] as string[],
    followersCount: 0, // 👈 Added to track stats dynamically
    followingCount: 0, // 👈 Added to track stats dynamically
  },
  reducers: {
    setUser: (state, action) => {
      return { ...state, ...action.payload };
    },
    clearUser: () => ({
      id: null,
      role: null,
      name: null,      // 👈 Reset safely
      firstName: null,
      lastName: null,
      email: null,
      phone: null,
      profilePhoto: null,
      coverPhoto: null,
      birthday: null,
      following: [] as string[],
      followers: [] as string[],
      followersCount: 0,
      followingCount: 0,
    }),
  },
});
