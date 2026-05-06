import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface PostPreviewState {
  isOpen: boolean
  postId: string | null
}

const initialState: PostPreviewState = {
  isOpen: false,
  postId: null,
}

const postPreviewSlice = createSlice({
  name: 'postPreview',
  initialState,
  reducers: {
    openPostPreview: (state, action: PayloadAction<string>) => {
      state.isOpen = true
      state.postId = action.payload
    },
    closePostPreview: (state) => {
      state.isOpen = false
      state.postId = null
    },
  },
})

export const { openPostPreview, closePostPreview } = postPreviewSlice.actions
export default postPreviewSlice.reducer
