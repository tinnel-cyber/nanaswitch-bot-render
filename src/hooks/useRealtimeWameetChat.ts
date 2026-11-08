'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface WameetMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  recipient_id?: string;
  content: string;
  media_url?: string;
  media_type?: string;
  is_read: boolean;
  created_at: string;
}

export function useRealtimeWameetChat(conversationId?: string | null) {
  const [messages, setMessages] = useState<WameetMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Initial Fetch
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from('wameet_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!isMounted) return;
        if (fetchErr) {
          console.warn('[WameetChat] Erreur lecture messages:', fetchErr);
          setError(fetchErr.message);
        } else if (data) {
          setMessages(data as WameetMessage[]);
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Erreur fetch chat');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMessages();

    // 2. Écouteur Supabase Realtime
    const channelName = `chat_${conversationId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wameet_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!isMounted) return;
          if (payload.new) {
            setMessages(prev => [...prev, payload.new as WameetMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(async (msg: Omit<WameetMessage, 'id' | 'created_at' | 'is_read'>) => {
    if (!conversationId) return { success: false, error: 'Pas de conversation_id' };
    try {
      const { data, error: sendErr } = await supabase
        .from('wameet_messages')
        .insert([{
          ...msg,
          conversation_id: conversationId,
          is_read: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (sendErr) throw sendErr;
      return { success: true, data };
    } catch (err: any) {
      console.error('[WameetChat] Erreur envoi message:', err);
      return { success: false, error: err?.message };
    }
  }, [conversationId]);

  return { messages, loading, error, sendMessage };
}

export default useRealtimeWameetChat;
