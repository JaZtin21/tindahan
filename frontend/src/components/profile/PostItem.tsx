import type { Post } from '../../types'
import { PhotoGallery } from '../common'
import { PostAuthorAvatar } from './PostAuthorAvatar'
import { formatDate } from '../../utils/profile'

interface PostItemProps {
  post: Post
  profilePhoto?: string
}

export function PostItem({ post, profilePhoto }: PostItemProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center gap-3">
        <PostAuthorAvatar profilePhoto={profilePhoto} authorName={post.author?.name || 'Unknown'} />
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">{post.author?.name || 'Unknown'}</p>
          <p className="text-xs text-zinc-500">{formatDate(post.createdAt || '')}</p>
        </div>
      </div>

      {post.title && (
        <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">{post.title}</h3>
      )}
      <p className="mb-3 text-zinc-700 dark:text-zinc-300">{post.text}</p>

      {post.photos && post.photos.length > 0 && (
        <div className="mb-3">
          <PhotoGallery photos={post.photos} size="large" />
        </div>
      )}

      <div className="flex items-center gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-sm text-zinc-500">
        <span>{post.likes} likes</span>
        <span>{post.commentCount} comments</span>
      </div>
    </div>
  )
}
