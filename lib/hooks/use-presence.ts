"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PresenceUser {
  userId: string;
  email: string;
}

export function usePresence(roomId: string, currentUser: { id: string; email: string }) {
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users = Object.values(state)
          .flat()
          .map((p) => ({ userId: p.userId, email: p.email }));
        setOnline(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: currentUser.id, email: currentUser.email });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUser.id, currentUser.email]);

  return online;
}
