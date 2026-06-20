import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export function isPublished(post: Post, now: Date = new Date()): boolean {
  if (post.data.draft) return false;
  return post.data.pubDate.valueOf() <= now.valueOf();
}

export async function getPublishedPosts(now: Date = new Date()): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts
    .filter(post => isPublished(post, now))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
