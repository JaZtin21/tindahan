import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Post } from '../../types/post';
import type { RootState } from '../index';

interface PostsState {
  byId: Record<string, Post>;
  allIds: string[];
}

const initialState: PostsState = {
  byId: {},
  allIds: [],
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Add a single post (for new posts)
    addPost: (state, action: PayloadAction<Post>) => {
      const post = action.payload;
      if (!state.byId[post.id]) {
        state.allIds.push(post.id);
      }
      state.byId[post.id] = post;
    },

    // Add or update multiple posts (initial load or batch update)
    setPosts: (state, action: PayloadAction<Post[]>) => {
      const posts = action.payload;
      const newIds = new Set<string>();

      posts.forEach((post) => {
        state.byId[post.id] = post;
        newIds.add(post.id);
      });

      // Update allIds - only add new posts that don't exist
      posts.forEach((post) => {
        if (!state.allIds.includes(post.id)) {
          state.allIds.push(post.id);
        }
      });
    },

    // Update an existing post (merge with existing data)
    updatePost: (state, action: PayloadAction<Partial<Post> & { id: string }>) => {
      const { id, ...updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = {
          ...state.byId[id],
          ...updates,
        };
      }
    },

    // Delete a post
    deletePost: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      delete state.byId[postId];
      state.allIds = state.allIds.filter((id) => id !== postId);
    },

    // Delete multiple posts
    deletePosts: (state, action: PayloadAction<string[]>) => {
      action.payload.forEach((postId) => {
        delete state.byId[postId];
      });
      state.allIds = state.allIds.filter((id) => !action.payload.includes(id));
    },

    // Clear all posts
    clearPosts: (state) => {
      state.byId = {};
      state.allIds = [];
    },

    // Update post with additional data (like comments, likes, etc)
    mergePostData: (state, action: PayloadAction<Partial<Post> & { id: string }>) => {
      const { id, ...data } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = {
          ...state.byId[id],
          ...data,
        };
      }
    },
  },
});

export const {
  addPost,
  setPosts,
  updatePost,
  deletePost,
  deletePosts,
  clearPosts,
  mergePostData,
} = postsSlice.actions;

// Selectors
export const selectPostById = (state: RootState, postId: string) =>
  state.posts.byId[postId];

export const selectAllPosts = (state: RootState) =>
  state.posts.allIds.map((id) => state.posts.byId[id]);

export const selectPostsByIds = (state: RootState, postIds: string[]) =>
  postIds.map((id) => state.posts.byId[id]).filter(Boolean);

export const selectAllPostsNormalized = (state: RootState) => state.posts;

export default postsSlice.reducer;
