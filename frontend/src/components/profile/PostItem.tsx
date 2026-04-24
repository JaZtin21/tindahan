import { useState } from 'react'
import type { PostItemProps } from '../../types/profile'
import { PhotoGallery } from '../common'
import { PostAuthorAvatar } from './PostAuthorAvatar'
import { DropdownMenu, DropdownItem } from '../common/Modal'
import { formatDate } from '../../utils/profile'

export function PostItem({ post, profilePhoto, isMyPost, onEdit, onDelete }: PostItemProps & { isMyPost?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center gap-3">
        <PostAuthorAvatar profilePhoto={profilePhoto} authorName={post.author?.name || 'Unknown'} />
        <div className="flex-1">
          <p className="font-medium text-zinc-900 dark:text-white">{post.author?.name || 'Unknown'}</p>
          <p className="text-xs text-zinc-500">{formatDate(post.createdAt || '')}</p>
        </div>
        {/* 3-dot menu for my posts */}
        {isMyPost && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="18" r="2" />
              </svg>
            </button>
            <DropdownMenu isOpen={showMenu} onClose={() => setShowMenu(false)} align="right">
              <DropdownItem
                onClick={() => {
                  setShowMenu(false);
                  onEdit?.();
                }}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                Edit
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setShowMenu(false);
                  onDelete?.();
                }}
                variant="danger"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </div>
        )}
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
