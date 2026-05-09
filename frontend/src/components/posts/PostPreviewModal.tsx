import { useEffect, useState, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import type { PostPreviewModalProps, Comment, Post } from '../../types/post';
import type { RootState } from '../../store';
import { PhotoGallery } from '../common/PhotoGallery';
import {
  LIKE_POST_MUTATION,
  UNLIKE_POST_MUTATION,
  COMMENTS_QUERY,
  ADD_COMMENT_MUTATION,
  DELETE_COMMENT_MUTATION,
  POST_QUERY,
} from '../../api/graphql/post/post-queries';
import { Modal, DropdownMenu, DropdownItem } from '../common/Modal';

function PostPreviewModalInner({ post, isOpen, onClose, onEdit, onDelete }: PostPreviewModalProps & { onEdit?: (post: Post) => void; onDelete?: (post: Post) => void }) {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.user);
  
  // Like state
  const [isLiked, setIsLiked] = useState(post?.isLiked || false);
  const [likesCount, setLikesCount] = useState(post?.likes || 0);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post?.commentCount || 0);
  
  // Track if like mutation is pending to prevent POST_QUERY from overriding
  const likePendingRef = useRef(false);
  
  // Mutations
  const [likePost] = useMutation(LIKE_POST_MUTATION);
  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION);
  const [addComment] = useMutation(ADD_COMMENT_MUTATION);
  const [deleteComment] = useMutation(DELETE_COMMENT_MUTATION);
  
  // Dropdown menu state
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);
  
  // Fetch fresh post details when modal opens (to get correct likes/isLiked)
  const { data: postData } = useQuery(POST_QUERY, {
    variables: { id: post?.id },
    skip: !isOpen || !post?.id,
    fetchPolicy: 'network-only',
  });
  
  // Update likes from fresh post data (but not if mutation is pending)
  useEffect(() => {
    if (postData?.post?.data && !likePendingRef.current) {
      const freshPost = postData.post.data;
      setIsLiked(freshPost.isLiked || false);
      setLikesCount(freshPost.likes || 0);
    }
  }, [postData]);
  
  // Fetch comments - initial load only
  const [fetchComments, { data: commentsData }] = useLazyQuery(COMMENTS_QUERY, {
    fetchPolicy: 'network-only',
  });
  
  // Clear comments when post changes
  useEffect(() => {
    if (post?.id) {
      setComments([]);
      setCommentPage(1);
      setHasMoreComments(false);
    }
  }, [post?.id]);
  
  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && post?.id) {
      fetchComments({ variables: { postId: post.id, page: 1, limit: 5 } });
    }
  }, [isOpen, post?.id, fetchComments]);
  
  // Track current post to prevent race conditions
  const currentPostIdRef = useRef(post?.id);
  
  useEffect(() => {
    currentPostIdRef.current = post?.id;
  }, [post?.id]);
  
  // Update comments when data changes - ONLY for current post
  useEffect(() => {
    // Only update if data is for current post and we're on page 1
    if (commentsData?.comments?.data && commentPage === 1 && currentPostIdRef.current === post?.id) {
      setComments(commentsData.comments.data);
      setHasMoreComments(commentsData.comments.hasMore);
      setLocalCommentCount(commentsData.comments.total || commentsData.comments.data.length);
    }
  }, [commentsData, commentPage, post?.id]);

  const isCurrentUser = post?.author?.id === currentUser?.id;
  
  const handleProfileClick = () => {
    if (post?.author?.id && !isCurrentUser) {
      navigate(`/profile/${post.author.id}`);
      onClose();
    }
  };
  
  // Handle like/unlike - optimistic update with proper state management
  const handleLikeToggle = async () => {
    if (!post?.id || likePendingRef.current) return;
    
    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    
    // Mark mutation as pending to prevent POST_QUERY from overriding
    likePendingRef.current = true;
    
    // Optimistic update
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);
    
    try {
      if (newIsLiked) {
        await likePost({ variables: { id: post.id } });
      } else {
        await unlikePost({ variables: { id: post.id } });
      }
    } catch (error) {
      // Revert on error
      console.error('Error toggling like:', error);
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
    } finally {
      // Clear pending flag after a delay to let any in-flight queries complete
      setTimeout(() => {
        likePendingRef.current = false;
      }, 500);
    }
  };
  
  // Handle add comment - optimistic update
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post?.id || !commentText.trim()) return;
    
    const trimmedText = commentText.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic comment
    const optimisticComment: Comment = {
      id: tempId,
      text: trimmedText,
      author: {
        id: currentUser?.id || '',
        name: currentUser?.name || 'You',
        email: currentUser?.email || '',
        profilePhoto: currentUser?.profilePhoto,
      },
      createdAt: new Date().toISOString(),
    };
    
    // Optimistic update - add to top immediately
    setComments(prev => [optimisticComment, ...prev]);
    setLocalCommentCount(prev => prev + 1);
    setCommentText('');
    setIsSubmittingComment(true);
    
    try {
      const { data } = await addComment({
        variables: { postId: post.id, text: trimmedText }
      });
      
      if (data?.addComment?.success) {
        // Replace temp comment with real one from API
        const realComment = data.addComment.data;
        setComments(prev => prev.map(c => c.id === tempId ? realComment : c));
      } else {
        // Remove on failure
        setComments(prev => prev.filter(c => c.id !== tempId));
        setLocalCommentCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Remove temp comment on error
      setComments(prev => prev.filter(c => c.id !== tempId));
      setLocalCommentCount(prev => Math.max(0, prev - 1));
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!post?.id) return;
    
    try {
      const { data } = await deleteComment({
        variables: { commentId, postId: post.id }
      });
      
      if (data?.deleteComment?.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        // Update comment count
        setLocalCommentCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };
  
  // Separate lazy query for loading more (doesn't trigger the useEffect)
  const [loadMoreComments] = useLazyQuery(COMMENTS_QUERY, {
    fetchPolicy: 'network-only',
  });
  
  // Handle load more comments
  const handleLoadMoreComments = async () => {
    if (!post?.id || !hasMoreComments) return;
    
    const nextPage = commentPage + 1;
    try {
      const { data } = await loadMoreComments({
        variables: {
          postId: post.id,
          page: nextPage,
          limit: 5
        }
      });
      
      if (data?.comments?.data) {
        // Deduplicate - filter out comments we already have
        const existingIds = new Set(comments.map(c => c.id));
        const newComments = data.comments.data.filter((c: Comment) => !existingIds.has(c.id));
        // Append only new comments to the end
        setComments(prev => [...prev, ...newComments]);
        setHasMoreComments(data.comments.hasMore);
        setCommentPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more comments:', error);
    }
  };
  
  // Pre-compute values used by both mobile and desktop
  const authorInitial = post?.author?.name.charAt(0).toUpperCase() || '?';
  const formattedDate = post?.createdAt 
    ? new Date(post.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : '';
  const hasProfilePhoto = !!post?.author?.profilePhoto;
  const profilePhotoUrl = post?.author?.profilePhoto;
  const isFollowing = post?.author?.followers?.includes(currentUser?.id || '') || false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      mobileBottomSheet
      showCloseButton={true}
      title={
        post ? (
          <div className="flex items-center gap-3">
            {hasProfilePhoto ? (
              <img 
                src={profilePhotoUrl}
                alt={post.author?.name || 'User'}
                className={`w-10 h-10 rounded-full object-cover border-2 border-emerald-400 ${
                  isCurrentUser ? '' : 'cursor-pointer hover:opacity-80'
                }`}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onClick={isCurrentUser ? undefined : handleProfileClick}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div 
                className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg ${
                  isCurrentUser ? '' : 'cursor-pointer hover:opacity-80'
                }`}
                onClick={isCurrentUser ? undefined : handleProfileClick}
              >
                {authorInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
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
            </div>
            {!isCurrentUser && post.author?.id && (
              <button 
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
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
            {/* Action buttons */}
            {isCurrentUser && (
              <div className="relative" ref={menuRef}>
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
                      onEdit?.(post);
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
                      onDelete?.(post);
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
        ) : 'Loading...'
      }
    >
      {!post ? (
        <div className="p-6 text-center text-zinc-500">Loading...</div>
      ) : (
        <>

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
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-pink-600 dark:text-pink-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-pink-500'}`}
            >
              <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-medium">{likesCount} likes</span>
            </button>
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="font-medium">{localCommentCount} comments</span>
            </div>
          </div>
        </div>

      {/* Comments Section - Fixed height with sticky input */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 flex flex-col" style={{ maxHeight: '400px' }}>
          {/* Scrollable Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '320px' }}>
            {comments.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  {/* Comment Author Avatar - Clickable */}
                  <button
                    onClick={() => {
                      if (comment.author?.id && comment.author.id !== currentUser?.id) {
                        navigate(`/profile/${comment.author.id}`);
                        onClose();
                      }
                    }}
                    className={`flex-shrink-0 ${comment.author?.id === currentUser?.id ? '' : 'cursor-pointer hover:opacity-80'}`}
                    disabled={comment.author?.id === currentUser?.id}
                  >
                    {comment.author?.profilePhoto ? (
                      <img
                        src={comment.author.profilePhoto}
                        alt={comment.author.name}
                        className="w-8 h-8 rounded-full object-cover"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                        {comment.author?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </button>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-3 py-2">
                      {/* Clickable Author Name */}
                      <button
                        onClick={() => {
                          if (comment.author?.id && comment.author.id !== currentUser?.id) {
                            navigate(`/profile/${comment.author.id}`);
                            onClose();
                          }
                        }}
                        className={`text-sm font-semibold text-zinc-900 dark:text-zinc-100 block ${
                          comment.author?.id === currentUser?.id ? '' : 'hover:text-emerald-600 cursor-pointer'
                        }`}
                      >
                        {comment.author?.name || 'Unknown'}
                      </button>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 break-words">
                        {comment.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-2">
                      <span className="text-xs text-zinc-500">
                        {comment.createdAt
                          ? new Date(comment.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                      {(comment.author?.id === currentUser?.id || post?.author?.id === currentUser?.id) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Load More Comments */}
            {hasMoreComments && (
              <button
                onClick={handleLoadMoreComments}
                className="w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
              >
                Load more comments
              </button>
            )}
          </div>

          {/* Sticky Comment Input at Bottom */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky bottom-0">
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={isSubmittingComment}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {isSubmittingComment ? '...' : 'Post'}
              </button>
            </form>
          </div>
        </div>
        </>
      )}
    </Modal>
  );
}

export const PostPreviewModal = memo(PostPreviewModalInner);
