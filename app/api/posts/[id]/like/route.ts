import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: postId } = await context.params;
  const debug: any = { step: 'start', postId };
  try {
    debug.postId = postId;
    const authHeader = request.headers.get('authorization')
    debug.authHeader = authHeader;
    if (!authHeader) {
      debug.error = 'No authorization header';
      return NextResponse.json({ error: 'No authorization header', debug }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    debug.token = token;
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    debug.user = user;
    debug.userError = userError;
    if (userError || !user) {
      debug.error = 'Unauthorized';
      return NextResponse.json({ error: 'Unauthorized', debug }, { status: 401 })
    }

    // Check if user already liked the post
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
    debug.existingLike = existingLike;
    debug.checkError = checkError;

    if (checkError && checkError.code !== 'PGRST116') {
      debug.error = 'Failed to check like status';
      return NextResponse.json({ error: 'Failed to check like status', debug }, { status: 500 })
    }

    if (existingLike) {
      // Unlike the post
      const { error: unlikeError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
      debug.unlikeError = unlikeError;
      if (unlikeError) {
        debug.error = 'Failed to unlike post';
        return NextResponse.json({ error: 'Failed to unlike post', debug }, { status: 500 })
      }
      debug.liked = false;
      return NextResponse.json({ liked: false, debug })
    } else {
      // Like the post
      const { error: likeError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id
        })
      debug.likeError = likeError;
      if (likeError) {
        debug.error = 'Failed to like post';
        return NextResponse.json({ error: 'Failed to like post', debug }, { status: 500 })
      }
      debug.liked = true;
      return NextResponse.json({ liked: true, debug })
    }
  } catch (error) {
    debug.error = 'Internal server error';
    debug.exception = String(error);
    return NextResponse.json({ error: 'Internal server error', debug }, { status: 500 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: postId } = await context.params;
  const debug: any = { step: 'start', postId };
  try {
    debug.postId = postId;
    const authHeader = request.headers.get('authorization')
    debug.authHeader = authHeader;
    if (!authHeader) {
      debug.error = 'No authorization header';
      return NextResponse.json({ error: 'No authorization header', debug }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    debug.token = token;
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    debug.user = user;
    debug.userError = userError;
    if (userError || !user) {
      debug.error = 'Unauthorized';
      return NextResponse.json({ error: 'Unauthorized', debug }, { status: 401 })
    }

    // Get like count and check if current user liked the post
    const [{ count: likeCount }, { data: userLike }] = await Promise.all([
      supabase
        .from('post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId),
      supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle()
    ])
    debug.likeCount = likeCount;
    debug.userLike = userLike;

    return NextResponse.json({
      likeCount: likeCount || 0,
      isLiked: !!userLike,
      debug
    })
  } catch (error) {
    debug.error = 'Internal server error';
    debug.exception = String(error);
    return NextResponse.json({ error: 'Internal server error', debug }, { status: 500 })
  }
} 