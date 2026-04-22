import { Loader2 } from 'lucide-react'
import type { Post } from '../../types'
import { PostItem } from './PostItem'

interface PostsSectionProps {
  posts: Post[]
  postsLoading: boolean
  profilePhoto?: string
}

export function PostsSection({ posts, postsLoading, profilePhoto }: PostsSectionProps) {
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
          {posts.map((post: Post) => (
            <PostItem key={post.id} post={post} profilePhoto={profilePhoto} />
          ))}
        </div>
      )}
    </div>
  )
}
