// YouTube Videos API - 代理YouTube RSS，返回频道最新视频列表
// 用于首页动态渲染竖屏视频卡片（工厂与交付现场）
//
// 注意：RSS返回的是频道最新上传，不能无条件认定全部属于Shorts。
// 如果频道同时发布长视频，后续应改用专用Shorts播放列表：
//   配置 YOUTUBE_SHORTS_PLAYLIST_ID 后，接口将改用播放列表RSS：
//   https://www.youtube.com/feeds/videos.xml?playlist_id=YOUTUBE_SHORTS_PLAYLIST_ID
// 当前默认使用频道RSS，返回最新6条视频。

export async function onRequest(context) {
  const { request, env } = context;

  // 配置：Shorts专用播放列表ID（预留，当前为空则使用频道RSS）
  // 后续如需仅显示Shorts，在此配置播放列表ID，或通过环境变量 YOUTUBE_SHORTS_PLAYLIST_ID 传入
  const SHORTS_PLAYLIST_ID = env.YOUTUBE_SHORTS_PLAYLIST_ID || '';

  // 允许CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const channelId = 'UC6-uk_aWXrl1BiBvAc4Lx3A';

    // 根据是否配置了播放列表ID，选择RSS源
    let rssUrl;
    let sourceType;
    if (SHORTS_PLAYLIST_ID) {
      rssUrl = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + SHORTS_PLAYLIST_ID;
      sourceType = 'playlist';
    } else {
      rssUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
      sourceType = 'channel';
    }

    // 从缓存读取（如果有）
    const cacheKey = 'youtube-videos-' + sourceType + '-' + (SHORTS_PLAYLIST_ID || channelId);
    const cached = await env.YOUTUBE_CACHE?.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    // 请求YouTube RSS
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZhongSaiWebsite/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error('YouTube RSS request failed: ' + response.status);
    }

    const xmlText = await response.text();

    // 解析XML提取视频信息
    const videos = parseYouTubeRSS(xmlText);

    // 取最新6个视频
    const latestVideos = videos.slice(0, 6);

    const result = JSON.stringify({
      success: true,
      channel: '@ZhongSaiSteel',
      channelId: channelId,
      sourceType: sourceType,
      playlistId: SHORTS_PLAYLIST_ID || null,
      count: latestVideos.length,
      videos: latestVideos
    });

    // 写入缓存（如果有KV存储）
    try {
      await env.YOUTUBE_CACHE?.put(cacheKey, result, { expirationTtl: 3600 });
    } catch (e) {
      // 缓存不可用时忽略
    }

    return new Response(result, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });

  } catch (error) {
    console.error('YouTube Videos API error:', error);

    // 返回降级数据（固定的3个视频，作为接口失败时的备用内容）
    const fallback = JSON.stringify({
      success: true,
      fallback: true,
      channel: '@ZhongSaiSteel',
      sourceType: 'fallback',
      count: 3,
      videos: [
        { id: 'SdM7zC5Dp5Y', title: '中赛钢构工厂实拍', url: 'https://youtube.com/shorts/SdM7zC5Dp5Y', thumbnail: 'https://img.youtube.com/vi/SdM7zC5Dp5Y/hqdefault.jpg', published: '' },
        { id: 'KeXTIxd07LY', title: '钢结构装柜过程', url: 'https://youtube.com/shorts/KeXTIxd07LY', thumbnail: 'https://img.youtube.com/vi/KeXTIxd07LY/hqdefault.jpg', published: '' },
        { id: 'kr2S2qqL_AY', title: '钢结构生产车间', url: 'https://youtube.com/shorts/kr2S2qqL_AY', thumbnail: 'https://img.youtube.com/vi/kr2S2qqL_AY/hqdefault.jpg', published: '' }
      ]
    });

    return new Response(fallback, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 解析YouTube RSS XML
function parseYouTubeRSS(xml) {
  const videos = [];

  // 匹配每个<entry>块
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    // 提取视频ID
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = videoIdMatch ? videoIdMatch[1] : '';

    // 提取标题
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : '';

    // 提取发布日期
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const published = publishedMatch ? publishedMatch[1] : '';

    // 提取缩略图（media:thumbnail）
    const thumbnailMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';

    // 构建Shorts URL
    const shortsUrl = 'https://youtube.com/shorts/' + videoId;

    if (videoId) {
      videos.push({
        id: videoId,
        title: title,
        url: shortsUrl,
        thumbnail: thumbnail,
        published: published
      });
    }
  }

  return videos;
}
