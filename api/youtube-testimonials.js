
const PLAYLIST_ID = 'PLw2-c6_LFUmryRUn2olP6flQzNUtgnetd';

export default async function handler(req, res) {
  // Allow only GET requests.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY) {
    console.error('YOUTUBE_API_KEY is missing from environment variables.');
    return res.status(500).json({
      error: 'YouTube API is not configured on the server.'
    });
  }

  try {
    const pageToken =
      typeof req.query.pageToken === 'string'
        ? req.query.pageToken
        : '';

    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId: PLAYLIST_ID,
      maxResults: '50',
      key: API_KEY
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const youtubeUrl =
      `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`;

    const response = await fetch(youtubeUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error('YouTube API error:', data);
      return res.status(response.status).json({
        error:
          data.error?.message ||
          'Unable to retrieve YouTube playlist.'
      });
    }

    const videos = (data.items || [])
      .map((item) => {
        const videoId = item.contentDetails?.videoId;

        if (!videoId) return null;

        const thumbnails = item.snippet?.thumbnails || {};

        return {
          id: videoId,
          title: item.snippet?.title || 'Client Testimonial',
          description: item.snippet?.description || '',
          publishedAt: item.contentDetails?.videoPublishedAt || null,
          thumbnail:
            thumbnails.maxres?.url ||
            thumbnails.high?.url ||
            thumbnails.medium?.url ||
            thumbnails.default?.url ||
            '',
          channelTitle: item.snippet?.videoOwnerChannelTitle || ''
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      videos,
      nextPageToken: data.nextPageToken || null,
      totalResults: data.pageInfo?.totalResults || videos.length
    });
  } catch (error) {
    console.error('YouTube playlist server error:', error);

    return res.status(500).json({
      error: 'Something went wrong while loading YouTube videos.'
    });
  }
}
