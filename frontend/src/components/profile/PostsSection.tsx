import { Loader2 } from 'lucide-react'
import type { PostsSectionProps, Post } from '../../types/profile'
import { PostItem } from './PostItem'

interface ExtendedPostsSectionProps extends PostsSectionProps {
  isMyPosts?: boolean;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (post: Post) => void;
  onPostClick?: (post: Post) => void;
}

export function PostsSection({ posts, postsLoading, profilePhoto, isMyPosts, onEditPost, onDeletePost, onPostClick }: ExtendedPostsSectionProps) {
  return (
    <div className="mt-8 px-4 sm:px-6">
      <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">Posts</h2>

      {postsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">No posts yet</p>
          <p className="mt-1 text-sm text-zinc-500">Your posts will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostItem 
              key={post.id} 
              post={post} 
              profilePhoto={profilePhoto}
              isMyPost={isMyPosts}
              onEdit={() => onEditPost?.(post)}
              onDelete={() => onDeletePost?.(post)}
              onClick={() => onPostClick?.(post)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
