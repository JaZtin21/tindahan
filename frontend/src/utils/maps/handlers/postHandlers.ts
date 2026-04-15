import { fileToBase64 } from '../../file';
import type { CreatePostInput, PostHandlersOptions } from '../../../types/map';

export function createPostHandlers({ createPost }: PostHandlersOptions) {

  const handleCreatePost = async (post: CreatePostInput) => {
    try {
      // Convert photos to base64
      const photoPromises = post.photos.map(file => fileToBase64(file));
      const base64Photos = await Promise.all(photoPromises);

      const result = await createPost({
        variables: {
          input: {
            title: post.title,
            text: post.text,
            photos: base64Photos,
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
      alert('Failed to create post. Please try again.');
    }
  };

  return { handleCreatePost };
}
