import rss from '@astrojs/rss';
import { getPublishedPosts } from '../utils/posts';

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: "Nick Kane's Website",
    description: 'Rants, ramblings, and ideas straight from my internal CPU.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/posts/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
