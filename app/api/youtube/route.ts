import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.YT_API_KEY;

function parseDuration(duration: string) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = regex.exec(duration) || [];
  const [, hours, minutes, seconds] = match;
  const h = hours ? `${hours}:` : '';
  const m = minutes ? `${hours ? String(minutes).padStart(2, '0') : minutes}:` : '0:';
  const s = seconds ? String(seconds).padStart(2, '0') : '00';
  return `${h}${m}${s}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const topic = searchParams.get('topic') || '';
  const level = searchParams.get('level') || '';
  const pageToken = searchParams.get('pageToken') || '';

  const query = `${topic} ${level} ${q}`.trim();
  const params = new URLSearchParams({
    key: API_KEY ?? '',
    q: query,
    part: 'snippet',
    maxResults: '6',
    type: 'video',
    videoEmbeddable: 'true',
    safeSearch: 'strict',
  });
  if (pageToken) params.set('pageToken', pageToken);
  try {
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    const searchData = await searchRes.json();
    if (!searchRes.ok) {
      throw new Error(searchData.error?.message || 'Error searching');
    }
    const ids = searchData.items.map((it: any) => it.id.videoId).join(',');
    if (!ids) {
      return NextResponse.json({ items: [] });
    }
    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${ids}&part=snippet,statistics,contentDetails`);
    const videosData = await videosRes.json();
    if (!videosRes.ok) {
      throw new Error(videosData.error?.message || 'Error fetching videos');
    }
    const items = videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails.medium.url,
      duration: parseDuration(video.contentDetails.duration),
      views: parseInt(video.statistics.viewCount, 10) || 0,
    }));
    return NextResponse.json({ items, nextPageToken: searchData.nextPageToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
