import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { PostPreviewModalProps } from '../../types/post';
import type { RootState } from '../../store';
import { PhotoGallery } from '../common/PhotoGallery';

export function PostPreviewModal({ post, isOpen, onClose }: PostPreviewModalProps) {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.user);

  const isCurrentUser = post?.author?.id === currentUser?.id;
  
  const handleProfileClick = () => {
    if (post?.author?.id && !isCurrentUser) {
      navigate(`/profile/${post.author.id}`);
      onClose();
    }
  };
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const authorInitial = post.author?.name.charAt(0).toUpperCase() || '?';
  const formattedDate = post.createdAt 
    ? new Date(post.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : '';
  
  // Check if author has a profile photo
  const hasProfilePhoto = !!post.author?.profilePhoto;
  const profilePhotoUrl = post.author?.profilePhoto;

  // Check if user is following this author
  const isFollowing = post.author?.followers?.includes(currentUser?.id || '') || false;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-10"
        >
          <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Author Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {hasProfilePhoto ? (
              <img 
                src={profilePhotoUrl}
                alt={post.author?.name || 'User'}
                className={`w-12 h-12 rounded-full object-cover border-2 border-emerald-400 ${
                  isCurrentUser ? '' : 'cursor-pointer hover:opacity-80'
                }`}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onClick={isCurrentUser ? undefined : handleProfileClick}
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div 
                className={`w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg ${
                  isCurrentUser ? '' : 'cursor-pointer hover:opacity-80'
                }`}
                onClick={isCurrentUser ? undefined : handleProfileClick}
              >
                {authorInitial}
              </div>
            )}
            <div>
              <h3 
                className={`font-semibold text-zinc-900 dark:text-zinc-100 transition-colors ${
                  isCurrentUser 
                    ? '' 
                    : 'hover:text-emerald-600 cursor-pointer'
                }`}
                onClick={isCurrentUser ? undefined : handleProfileClick}
              >
                {post.author?.name || 'Unknown User'}
              </h3>
              {formattedDate && (
                <p className="text-xs text-zinc-400 mt-0.5">{formattedDate}</p>
              )}
              {!isCurrentUser && post.author?.id && (
                <button 
                  className={`mt-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    isFollowing
                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${post.author!.id}`);
                    onClose();
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-6">
          {/* Title */}
          {post.title && (
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              {post.title}
            </h2>
          )}
          
          {/* Text Content */}
          {post.text && (
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4 whitespace-pre-wrap">
              {post.text}
            </p>
          )}

          {/* Photos Gallery - Facebook Style with Lightbox */}
          {post.photos && post.photos.length > 0 && (
            <div className="mb-4">
              <PhotoGallery photos={post.photos} size="large" />
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span className="font-medium">{post.likes || 0} likes</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium">{post.commentCount || 0} comments</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
          <button className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors">
            Like
          </button>
          <button className="flex-1 py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg transition-colors">
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
