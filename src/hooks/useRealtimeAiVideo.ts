'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface VideoGenerationJob {
  id: string;
  user_id: string;
  tenant_id?: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  video_url?: string;
  thumbnail_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export function useRealtimeAiVideo(jobId?: string | null) {
  const [job, setJob] = useState<VideoGenerationJob | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchJob = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('video_generations')
          .select('*')
          .eq('id', jobId)
          .maybeSingle();

        if (!isMounted) return;
        if (fetchErr) {
          console.warn('[RealtimeAiVideo] Erreur lecture job:', fetchErr);
          setError(fetchErr.message);
        } else if (data) {
          setJob(data as VideoGenerationJob);
          setIsCompleted(data.status === 'completed');
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch video job');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchJob();

    // 2. Écouteur Supabase Realtime
    const channelName = `video_${jobId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.new) {
            const updated = payload.new as VideoGenerationJob;
            setJob(updated);
            if (updated.status === 'completed') {
              setIsCompleted(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return { job, isCompleted, loading, error };
}

export default useRealtimeAiVideo;
