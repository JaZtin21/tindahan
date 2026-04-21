import type { CreatePostInput, PostHandlersOptions } from '../../../types/map';

export function createPostHandlers({ createPost }: PostHandlersOptions) {

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
        alert('Post created successfully!');
      } else {
        alert('Failed to create post: ' + result.data?.createPost?.message);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post. Please try again.');
    }
  };

  return { handleCreatePost };
}
