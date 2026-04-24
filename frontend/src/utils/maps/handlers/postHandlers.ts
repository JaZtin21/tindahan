import type { CreatePostInput, PostHandlersOptions } from '../../../types/map';

export function createPostHandlers({ createPost, showSuccess, showError }: PostHandlersOptions) {

  const handleCreatePost = async (post: CreatePostInput) => {
    try {
      // Send files directly - uploadLink handles multipart upload
      const result = await createPost({
        variables: {
          input: {
            title: post.title,
            text: post.text,
            photos: post.photos, // File[] - handled by createUploadLink
            types: post.types,
            location: post.location
          }
        }
      });

      if (result.data?.createPost?.success) {
        showSuccess('Post Created', 'Your post has been created successfully!');
      } else {
        showError('Create Failed', result.data?.createPost?.message || 'Failed to create post. Please try again.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showError('Error', 'An error occurred while creating the post. Please try again.');
    }
  };

  return { handleCreatePost };
}
