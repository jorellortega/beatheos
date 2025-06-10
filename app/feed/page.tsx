"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Hash, Headphones, Clock, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserProfileButton } from "@/components/UserProfileButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInView } from 'react-intersection-observer';
import { toast } from "@/components/ui/use-toast";
import { PurchaseOptionsModal } from "@/components/PurchaseOptionsModal";
import { usePlayer } from "@/contexts/PlayerContext";
import { Play, Pause, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import React from "react";
import { createClient } from '@supabase/supabase-js';

// Add type declaration for window.adsbygoogle
if (typeof window !== 'undefined') {
  (window as any).adsbygoogle = (window as any).adsbygoogle || [];
}

// Define Post type
interface Post {
  id: number;
  user: {
    name: string;
    role: string;
    avatar: string;
    id: string;
  };
  content: string;
  timestamp: string;
  audio?: string;
  image?: string;
  video?: string;
  likes: number;
  comments: Comment[];
  isLiked: boolean;
  hashtags?: string[];
  shares: number;
  beat?: {
    id: string;
    title: string;
    cover_art_url: string;
    mp3_url: string;
    price_lease: number;
    price_premium_lease: number;
    price_exclusive: number;
    price_buyout: number;
    producer_id: string;
    producer_name: string;
    producer_avatar: string;
    genre: string;
    bpm: number;
    key: string;
    duration: number;
    plays: number;
    likes: number;
    purchases: number;
    license_type?: "lease" | "premium_lease" | "exclusive" | "buyout";
  };
}

interface Comment {
  id: number;
  user: {
    name: string;
    role: string;
    avatar: string;
    id: string;
  };
  content: string;
  timestamp: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Add AdSense component
function AdSenseAd() {
  const adRef = useRef(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).adsbygoogle && adRef.current) {
      try {
        (window as any).adsbygoogle.push({});
      } catch (e) {}
    }
  }, []);
  return (
    <div className="flex justify-center my-6">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5771281829620343"
        data-ad-slot="3252632061"
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      ></ins>
    </div>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newAudio, setNewAudio] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<{ [postId: number]: string }>({});
  const [showComments, setShowComments] = useState<{ [postId: number]: boolean }>({});
  const [feedFilter, setFeedFilter] = useState<"all" | "following" | "trending">("all");
  const [following, setFollowing] = useState<Set<string>>(new Set(["1"]));
  const { ref, inView } = useInView();
  const [selectedBeat, setSelectedBeat] = useState<any>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const { setCurrentBeat, currentBeat, isPlaying, setIsPlaying } = usePlayer();
  const { user } = useAuth();
  const [sortOption, setSortOption] = useState<'recent' | 'trending'>('recent');
  const [userBeats, setUserBeats] = useState<any[]>([]);
  const [selectedBeatForPost, setSelectedBeatForPost] = useState<any | null>(null);
  const [loadingBeats, setLoadingBeats] = useState(false);
  const [showBeatSearch, setShowBeatSearch] = useState(false);
  const [beatSearchQuery, setBeatSearchQuery] = useState("");

  // Fetch user's beats for the combobox
  useEffect(() => {
    if (!user?.id) return;
    setLoadingBeats(true);
    fetch(`/api/beats?producerId=${user.id}`)
      .then(res => res.json())
      .then(data => setUserBeats(data || []))
      .finally(() => setLoadingBeats(false));
  }, [user?.id]);

  // Extract hashtags from content
  const extractHashtags = (content: string): string[] => {
    const hashtagRegex = /#[\w-]+/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  };

  // Fetch posts from Supabase
  useEffect(() => {
    async function fetchPosts() {
      setLoadingPosts(true);
      // Example: adjust select as needed for your schema
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          audio_url,
          image_url,
          video_url,
          beat_id,
          created_at,
          user:users!posts_user_id_fkey(id, display_name, avatar_url, role),
          beat:beats(id, title, cover_art_url, mp3_url, price_lease, price_premium_lease, price_exclusive, price_buyout, producer_id, genre, bpm, key, duration, play_count, likes, purchases, license_type)
        `)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) {
        setLoadingPosts(false);
        toast({ title: 'Error', description: 'Failed to load feed.' });
        return;
      }
      // Map data to Post[]
      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        user: {
          id: p.user?.id || '',
          name: p.user?.display_name || 'Unknown',
          role: p.user?.role || '',
          avatar: p.user?.avatar_url || '/placeholder.svg',
        },
        content: p.content,
        timestamp: p.created_at,
        audio: p.audio_url || undefined,
        image: p.image_url || undefined,
        video: p.video_url || undefined,
        likes: 0, // TODO: fetch like count
        comments: [], // TODO: fetch comments
        isLiked: false, // TODO: fetch like status for current user
        hashtags: extractHashtags(p.content),
        shares: 0, // TODO: fetch share count if tracked
        beat: p.beat ? {
          id: p.beat.id,
          title: p.beat.title,
          cover_art_url: p.beat.cover_art_url,
          mp3_url: p.beat.mp3_url,
          price_lease: p.beat.price_lease,
          price_premium_lease: p.beat.price_premium_lease,
          price_exclusive: p.beat.price_exclusive,
          price_buyout: p.beat.price_buyout,
          producer_id: p.beat.producer_id,
          producer_name: '', // TODO: fetch producer name if needed
          producer_avatar: '', // TODO: fetch producer avatar if needed
          genre: p.beat.genre,
          bpm: p.beat.bpm,
          key: p.beat.key,
          duration: p.beat.duration,
          plays: p.beat.play_count,
          likes: p.beat.likes,
          purchases: p.beat.purchases,
          license_type: p.beat.license_type,
        } : undefined,
      }));
      setPosts(mapped);
      setLoadingPosts(false);
    }
    fetchPosts();
  }, []);

  // Restore handler functions for UI interactivity
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'audio') setNewAudio(url);
      if (type === 'image') setNewImage(url);
      if (type === 'video') setNewVideo(url);
    }
  };

  const handleAddPost = () => {
    if (!newContent && !newAudio && !newImage && !newVideo) return;
    const hashtags = extractHashtags(newContent);
    setPosts([
      {
        id: Date.now(),
        user: {
          id: user?.id || 'current-user',
          name: user?.display_name || 'You',
          role: 'Artist',
          avatar: user?.avatar_url || '/placeholder.svg',
        },
        content: newContent,
        timestamp: 'Just now',
        audio: newAudio || undefined,
        image: newImage || undefined,
        video: newVideo || undefined,
        likes: 0,
        comments: [],
        isLiked: false,
        hashtags,
        shares: 0
      },
      ...posts,
    ]);
    setNewContent("");
    setNewAudio(null);
    setNewImage(null);
    setNewVideo(null);
  };

  const handleFollowToggle = (userId: string) => {
    setFollowing(prev => {
      const newFollowing = new Set(prev);
      if (newFollowing.has(userId)) {
        newFollowing.delete(userId);
      } else {
        newFollowing.add(userId);
      }
      return newFollowing;
    });
  };

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked
        };
      }
      return post;
    }));
  };

  const handleAddComment = (postId: number) => {
    if (!newComment[postId]) return;
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [
            {
              id: Date.now(),
              user: {
                id: user?.id || 'current-user',
                name: user?.display_name || 'You',
                role: 'Artist',
                avatar: user?.avatar_url || '/placeholder.svg',
              },
              content: newComment[postId],
              timestamp: 'Just now'
            },
            ...post.comments
          ]
        };
      }
      return post;
    }));
    setNewComment({ ...newComment, [postId]: "" });
  };

  const toggleComments = (postId: number) => {
    setShowComments({
      ...showComments,
      [postId]: !showComments[postId]
    });
  };

  const handlePlayPause = (beat: any) => {
    if (currentBeat?.id === beat.id && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentBeat({
        id: beat.id,
        title: beat.title,
        artist: beat.producer_id,
        audioUrl: beat.mp3_url,
        image: beat.cover_art_url,
      });
      setIsPlaying(true);
    }
  };

  const handlePurchase = (beat: any) => {
    setSelectedBeat(beat);
    setIsPurchaseModalOpen(true);
  };

  const handleShare = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.user.name}'s Post`,
          text: post.content,
          url: window.location.href
        });
        setPosts(posts.map(p =>
          p.id === post.id ? { ...p, shares: p.shares + 1 } : p
        ));
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Post link has been copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div style={{ background: '#141414', minHeight: '100vh', width: '100vw' }}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8 font-display tracking-wider text-primary">Feed</h1>
        
        {/* Feed Filter Tabs */}
        <Tabs value={feedFilter} onValueChange={(value) => setFeedFilter(value as any)} className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Add Post Section */}
        <Card className="bg-black border-yellow-400 mb-8">
          <CardHeader>
            <CardTitle className="text-yellow-400">Add Post</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full p-4 rounded bg-zinc-900 text-lg text-gray-200 mb-4 focus:outline-none"
              placeholder="What's on your mind? Use #hashtags to categorize your post"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={3}
            />
            {/* Beat selector */}
            <div className="mb-4">
              <div className="flex items-center mb-1">
                <label className="block text-gray-300 mr-2">Your Most Recent Beats:</label>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-yellow-400 text-yellow-400 px-2 py-1 h-7 text-xs ml-2"
                  onClick={() => setShowBeatSearch(true)}
                  type="button"
                >
                  Search
                </Button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {userBeats.slice(0, 5).map(beat => (
                  <button
                    key={beat.id}
                    type="button"
                    onClick={() => {
                      setSelectedBeatForPost(beat);
                      setNewAudio(null);
                      setNewImage(null);
                      setNewVideo(null);
                    }}
                    className={`flex flex-col items-center bg-zinc-800 rounded p-2 border-2 transition-colors ${selectedBeatForPost?.id === beat.id ? 'border-yellow-400' : 'border-transparent'} hover:border-yellow-400`}
                    style={{ minWidth: 100 }}
                  >
                    <Image src={beat.cover_art_url} alt={beat.title} width={48} height={48} className="rounded mb-1" />
                    <span className="text-xs text-gray-200 text-center line-clamp-2 max-w-[80px]">{beat.title}</span>
                  </button>
                ))}
              </div>
              {showBeatSearch && (
                <div className="mt-2 mb-2 p-3 bg-zinc-900 rounded shadow-lg relative z-10">
                  <div className="flex items-center mb-2">
                    <input
                      type="text"
                      className="w-full p-2 rounded bg-zinc-800 text-gray-200 border border-yellow-400 focus:outline-none"
                      placeholder="Search your beats..."
                      value={beatSearchQuery}
                      onChange={e => setBeatSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={() => setShowBeatSearch(false)} aria-label="Close search" className="ml-2">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                    {userBeats.filter(beat => beat.title.toLowerCase().includes(beatSearchQuery.toLowerCase())).map(beat => (
                      <button
                        key={beat.id}
                        type="button"
                        onClick={() => {
                          setSelectedBeatForPost(beat);
                          setShowBeatSearch(false);
                          setNewAudio(null);
                          setNewImage(null);
                          setNewVideo(null);
                        }}
                        className="flex items-center gap-2 p-2 rounded hover:bg-yellow-400/10 transition-colors"
                      >
                        <Image src={beat.cover_art_url} alt={beat.title} width={32} height={32} className="rounded" />
                        <span className="text-gray-200 text-sm">{beat.title}</span>
                      </button>
                    ))}
                    {userBeats.filter(beat => beat.title.toLowerCase().includes(beatSearchQuery.toLowerCase())).length === 0 && (
                      <span className="text-gray-400 text-xs">No beats found.</span>
                    )}
                  </div>
                </div>
              )}
              {selectedBeatForPost && (
                <div className="flex items-center gap-2 mt-2 bg-zinc-800 p-2 rounded">
                  <Image src={selectedBeatForPost.cover_art_url} alt={selectedBeatForPost.title} width={48} height={48} className="rounded" />
                  <span className="text-gray-200">{selectedBeatForPost.title}</span>
                  <Button size="icon" variant="ghost" onClick={() => setSelectedBeatForPost(null)} aria-label="Remove beat">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {/* Hide media upload if beat is selected */}
            {!selectedBeatForPost && (
              <div className="flex gap-4 mb-4">
                <label className="cursor-pointer text-gray-400 hover:text-yellow-400">
                  Audio
                  <input type="file" accept="audio/*" className="hidden" onChange={e => handleFileChange(e, 'audio')} />
                </label>
                <label className="cursor-pointer text-gray-400 hover:text-yellow-400">
                  Image
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'image')} />
                </label>
                <label className="cursor-pointer text-gray-400 hover:text-yellow-400">
                  Video
                  <input type="file" accept="video/*" className="hidden" onChange={e => handleFileChange(e, 'video')} />
                </label>
              </div>
            )}
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-2 rounded mt-2" onClick={handleAddPost}>
              Post
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loadingPosts ? (
            <div className="flex justify-center py-10">
              <span className="text-gray-400">Loading feed...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, idx) => (
                <React.Fragment key={post.id}>
                  <Card className="bg-black border-primary">
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <UserProfileButton
                        user={post.user}
                        isFollowing={following.has(post.user.id)}
                        onFollowToggle={handleFollowToggle}
                      />
                      <CardDescription className="text-xs text-gray-400">{post.timestamp}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base text-white mb-2">
                        {post.content.split(/(#\w+)/g).map((part, i) => 
                          part.startsWith('#') ? (
                            <span key={i} className="text-primary hover:underline cursor-pointer">
                              {part}
                            </span>
                          ) : (
                            part
                          )
                        )}
                      </p>
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {post.hashtags.map(tag => (
                            <span key={tag} className="text-xs text-primary flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {post.beat && (
                        <div className="mb-4 p-4 bg-zinc-900 rounded-lg">
                          <div className="flex items-start gap-4">
                            <Image
                              src={post.beat.cover_art_url}
                              alt={post.beat.title}
                              width={120}
                              height={120}
                              className="rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-primary text-lg">{post.beat.title}</h3>
                                  <Link 
                                    href={`/producer/${post.beat.producer_id}`}
                                    className="text-sm text-gray-400 hover:text-primary transition-colors"
                                  >
                                    by {post.beat.producer_name}
                                  </Link>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {post.beat.license_type?.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Music className="h-3 w-3" />
                                  {post.beat.genre}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {post.beat.bpm} BPM
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {post.beat.key}
                                </Badge>
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(post.beat.duration)}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Headphones className="h-4 w-4" />
                                  {post.beat.plays.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-4 w-4" />
                                  {post.beat.likes.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <ShoppingCart className="h-4 w-4" />
                                  {post.beat.purchases.toLocaleString()}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handlePlayPause(post.beat)}
                                  className="flex-shrink-0"
                                >
                                  {currentBeat?.id === post.beat.id && isPlaying ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  className="gradient-button text-black font-medium hover:text-white flex items-center gap-2 flex-1"
                                  onClick={() => handlePurchase(post.beat)}
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  Buy Now - ${post.beat.price_lease}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {post.audio && !post.beat && (
                        <audio src={post.audio} controls className="w-full mb-2 rounded" />
                      )}
                      {post.image && !post.beat && (
                        <img src={post.image} alt="post media" className="w-full max-h-64 object-cover rounded mb-2" />
                      )}
                      {post.video && !post.beat && (
                        <video src={post.video} controls className="w-full max-h-64 rounded mb-2" />
                      )}
                      <div className="flex items-center gap-4 mb-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`flex items-center gap-1 ${post.isLiked ? 'text-red-500' : 'text-gray-400'}`}
                          onClick={() => handleLike(post.id)}
                        >
                          <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                          {post.likes}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex items-center gap-1 text-gray-400"
                          onClick={() => toggleComments(post.id)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {post.comments.length}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 text-gray-400"
                          onClick={() => handleShare(post)}
                        >
                          <Share2 className="h-4 w-4" />
                          {post.shares}
                        </Button>
                      </div>
                      {showComments[post.id] && (
                        <div className="mt-4 space-y-4">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment[post.id] || ""}
                              onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                              className="flex-1 bg-zinc-900 text-white"
                            />
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleAddComment(post.id)}
                            >
                              Comment
                            </Button>
                          </div>
                          <div className="space-y-4">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <UserProfileButton
                                  user={comment.user}
                                  isFollowing={following.has(comment.user.id)}
                                  onFollowToggle={handleFollowToggle}
                                />
                                <div className="flex-1">
                                  <p className="text-sm text-gray-200">{comment.content}</p>
                                  <span className="text-xs text-gray-400">{comment.timestamp}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {(idx + 1) % 5 === 0 && <AdSenseAd />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseOptionsModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        beat={selectedBeat ? {
          id: String(selectedBeat.id),
          title: selectedBeat.title,
          price: selectedBeat.price_lease || 0,
          price_lease: selectedBeat.price_lease || 0,
          price_premium_lease: selectedBeat.price_premium_lease || 0,
          price_exclusive: selectedBeat.price_exclusive || 0,
          price_buyout: selectedBeat.price_buyout || 0,
        } : null}
      />
    </div>
  );
} 