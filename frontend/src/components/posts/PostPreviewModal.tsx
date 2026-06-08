import { useEffect, useState, useRef, memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import type { PostPreviewModalProps, Comment, Post } from '../../types/post';
import type { RootState } from '../../store';
import { mergePostData } from '../../store';
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
import { useFollowUser, useUnfollowUser } from '../../hooks';


function PostPreviewModalInner({ post, isOpen, onClose, onEdit, onDelete }: PostPreviewModalProps & { onEdit?: (post: Post) => void; onDelete?: (post: Post) => void }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user);

  const reduxCachedPost = useSelector((state: RootState) =>
    post?.id ? (state.posts.byId[post.id] as Post | undefined) : null
  );

  // Use cached post first, fall back to prop
  const [effectivePost, setEffectivePost] = useState(post);

  const isStateFresh = effectivePost?.id === post?.id;
  const basePost = isStateFresh ? effectivePost : (isOpen ? post : null);

  // 2. MERGE DYNAMIC REDUX EDITS ON THE FLY (No useEffects, No Infinite Loops):
  // This blends the local interactive states with the text fields from Redux.
  // If you edit text or titles in the other modal, it updates here with zero frame delay.
  const displayedPost = basePost
    ? {
      ...basePost,
      title: reduxCachedPost?.id === basePost.id ? (reduxCachedPost.title || basePost.title) : basePost.title,
      text: reduxCachedPost?.id === basePost.id ? (reduxCachedPost.text || basePost.text) : basePost.text,
      photos: reduxCachedPost?.id === basePost.id ? (reduxCachedPost.photos || basePost.photos) : basePost.photos,
    }
    : null;
  // Keyboard handling for mobile

  // Track the current post ID to prevent race conditions
  const currentPostIdRef = useRef<string | null>(effectivePost?.id || null);

  // Like state
  const [isLiked, setIsLiked] = useState(effectivePost?.isLiked || false);
  const [likesCount, setLikesCount] = useState(effectivePost?.likes || 0);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(post?.author?.followers?.includes(currentUser?.id || '') || false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(effectivePost?.commentCount || 0);

  // Track if like mutation is pending to prevent POST_QUERY from overriding
  const likePendingRef = useRef(false);

  // Mutations
  const [likePost] = useMutation(LIKE_POST_MUTATION);
  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION);
  const [addComment] = useMutation(ADD_COMMENT_MUTATION);
  const [deleteComment] = useMutation(DELETE_COMMENT_MUTATION);

  // Follow/unfollow hooks
  const { follow, loading: followLoading } = useFollowUser();
  const { unfollow, loading: unfollowLoading } = useUnfollowUser();

  // Dropdown menu state
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Comment input ref for keyboard handling
  const commentInputRef = useRef<HTMLInputElement>(null);


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


  // Fetch fresh post details when modal opens
  const { data: postData, loading: postLoading } = useQuery(POST_QUERY, {
    variables: { id: post?.id },
    skip: !isOpen || !post?.id,
    fetchPolicy: 'no-cache',
  });

  // Update local state with fresh post data
  useEffect(() => {
    if (postData?.post?.data) {
      console.log(postData.post.data, 'fresh post data from POST_QUERY')
      setEffectivePost(postData.post.data);
    }
  }, [postData]);

  // Update likes from fresh post data (but not if mutation is pending)
  // Also update Redux cache with fresh data
  useEffect(() => {
    if (postData?.post?.data && !likePendingRef.current && post?.id === effectivePost?.id) {
      const freshPost = postData.post.data;
      console.log('[PostPreviewModal] Fresh post data received - freshPost.author.profilePhoto:', freshPost.author?.profilePhoto)

      // Update local state
      setIsLiked(freshPost.isLiked || false);
      setLikesCount(freshPost.likes || 0);
      // Update follow status from fresh post data
      setIsFollowing(freshPost.author?.followers?.includes(currentUser?.id || '') || false);

      // Update Redux cache with fresh post data
      dispatch(mergePostData({
        id: freshPost.id,
        isLiked: freshPost.isLiked,
        likes: freshPost.likes,
        author: freshPost.author,
        commentCount: freshPost.commentCount,
      }));
    }
  }, [postData, effectivePost?.id, post?.id, currentUser?.id, dispatch]);

  // Fetch comments - use lazy query with proper dependencies
  const [fetchComments, { data: commentsData, loading: commentsLoading }] = useLazyQuery(COMMENTS_QUERY, {
    fetchPolicy: 'no-cache',
  });

  // Load comments when modal opens with a post
  useEffect(() => {
    if (isOpen && post?.id && currentPostIdRef.current === post.id) {
      fetchComments({ variables: { postId: post.id, page: 1, limit: 5 } });
    }
  }, [isOpen, post?.id]);


  // Update comments when data changes - ONLY for current post
  useEffect(() => {
    if (commentsData?.comments?.data && currentPostIdRef.current === post?.id) {
      console.log('[PostPreviewModal] Comments data received - comments:', commentsData.comments.data)
      setComments(commentsData.comments.data);
      setHasMoreComments(commentsData.comments.hasMore);
      setLocalCommentCount(commentsData.comments.total || commentsData.comments.data.length);
    }
  }, [commentsData, post?.id]);

  const isCurrentUser = useMemo(() => effectivePost?.author?.id === currentUser?.id, [effectivePost?.author?.id, currentUser?.id]);

  // Handle follow/unfollow
  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!effectivePost?.author?.id || !currentUser?.id) return;

    try {
      if (isFollowing) {
        await unfollow(effectivePost.author.id);
        setIsFollowing(false);
      } else {
        await follow(effectivePost.author.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleProfileClick = () => {
    if (effectivePost?.author?.id && !isCurrentUser) {
      navigate(`/profile/${effectivePost.author.id}`);
      onClose();
    }
  };

  // Handle like/unlike - optimistic update with proper state management
  const handleLikeToggle = async () => {
    if (!effectivePost?.id || likePendingRef.current) return;

    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    // Mark mutation as pending to prevent POST_QUERY from overriding
    likePendingRef.current = true;

    // Optimistic update
    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);

    // Update Redux cache optimistically
    dispatch(mergePostData({
      id: effectivePost.id,
      isLiked: newIsLiked,
      likes: newLikesCount,
    }));

    try {
      if (newIsLiked) {
        await likePost({ variables: { id: effectivePost.id } });
      } else {
        await unlikePost({ variables: { id: effectivePost.id } });
      }
    } catch (error) {
      // Revert on error
      console.error('Error toggling like:', error);
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      // Revert Redux update on error
      dispatch(mergePostData({
        id: effectivePost.id,
        isLiked: !newIsLiked,
        likes: likesCount,
      }));
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
    if (!effectivePost?.id || !commentText.trim()) return;

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
        variables: { postId: effectivePost.id, text: trimmedText }
      });

      if (data?.addComment?.success) {
        // Replace temp comment with real one from API
        const realComment = data.addComment.data;
        setComments(prev => prev.map(c => c.id === tempId ? realComment : c));

        // Update Redux cache with new comment count
        dispatch(mergePostData({
          id: effectivePost.id,
          commentCount: (effectivePost.commentCount || 0) + 1,
        }));
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

  // Use profilePhoto from post if available, otherwise use userInfo's profilePhoto if author is current user
  const hasProfilePhoto = !!post?.author?.profilePhoto;
  const profilePhotoUrl = post?.author?.profilePhoto;

  console.log(displayedPost, 'heyyy  displayed post');

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
                className={`w-10 h-10 rounded-full object-cover border-2 border-primary ${isCurrentUser ? '' : 'cursor-pointer hover:opacity-80'
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
                className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg ${isCurrentUser ? '' : 'cursor-pointer hover:opacity-80'
                  }`}
                onClick={isCurrentUser ? undefined : handleProfileClick}
              >
                {authorInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-zinc-900 dark:text-zinc-100 transition-colors ${isCurrentUser
                  ? ''
                  : ' cursor-pointer'
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
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${isFollowing
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  : 'bg-primary hover:bg-primary-700 text-white'
                  }`}
                onClick={handleFollowToggle}
                disabled={followLoading || unfollowLoading}
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
        ) : 'Loading...1'
      }
    >
      {!displayedPost ? (
        <div className="p-6 text-center text-zinc-500">Loading...</div>
      ) : (
        <>

          {/* Post Content */}
          <div className="p-2">
            {/* Title */}
            {displayedPost.title && (
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                {displayedPost.title}
              </h2>
            )}

            {/* Text Content */}
            {displayedPost.text && (
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4 whitespace-pre-wrap">
                {displayedPost.text}
              </p>
            )}

            {/* Photos Gallery - Facebook Style with Lightbox */}
            {displayedPost.photos && displayedPost.photos.length > 0 && (
              <div className="mb-4">
                <PhotoGallery photos={displayedPost.photos} size="large" />
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 pt-4 pb-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={handleLikeToggle}
                className={`flex items-center gap-2 transition-colors ${displayedPost.isLiked ? 'text-pink-600 dark:text-pink-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-pink-500'}`}
              >
                <svg className="w-5 h-5" fill={displayedPost.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="font-medium">{displayedPost.likes} likes</span>
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
          <div
            className="border-t mx-2 py-2 border-zinc-100 dark:border-zinc-800 flex flex-col transition-all duration-300 relative"
          >

            {/* Scrollable Comments List */}
            {commentsLoading ? (
              <div className="p-4 text-center text-zinc-500">Loading comments...</div>
            ) : (
              <>
                <div
                  className="flex-1 overflow-y-auto p-0 py-2 space-y-3 transition-all duration-300"
                >
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
                              className={`text-sm font-semibold text-zinc-900 dark:text-zinc-100 block ${comment.author?.id === currentUser?.id ? '' : 'hover:text-emerald-600 cursor-pointer'
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

                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 fixed md:sticky bottom-0 md:-bottom-6 left-0 right-0 ">
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      ref={commentInputRef}
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isSubmittingComment}
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="px-4 py-2 bg-primary hover:bg-primary-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                      {isSubmittingComment ? '...' : 'Post'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

export const PostPreviewModal = memo(PostPreviewModalInner);
