import { useState, useEffect, useCallback, useRef } from "react";
import supabase from "../supabse_db/supabase_client";
import {
  getAnnouncements,
  getAnnouncementParticipants,
} from "../supabse_db/announcement/announcement";
import { fetchAnnouncementImages } from "../supabse_db/uploadImages";

/**
 * Custom hook for managing announcement data with caching and real-time updates
 * This hook provides the single source of truth for all announcement data
 * across admin, official, and resident views.
 *
 * Features:
 * - Fetches announcements from Supabase
 * - Loads associated images for each announcement
 * - Fetches participant counts for event announcements
 * - Provides manual refresh capability
 * - Optional real-time updates via subscriptions
 *
 * Usage:
 * const { announcements, images, loading, error, refresh } = useAnnouncementData();
 */
export function useAnnouncementData() {
  const [announcements, setAnnouncements] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState({});
  const [participantCounts, setParticipantCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  /**
   * Fetch all announcements and associated data
   */
  const fetchAnnouncementData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all announcements
      const result = await getAnnouncements();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch announcements");
      }

      const announcementList = result.data || [];
      setAnnouncements(announcementList);

      // Fetch images for all announcements in parallel
      const imageMap = {};
      const imagePromises = announcementList.map(async (ann) => {
        try {
          const imageResult = await fetchAnnouncementImages(ann.id);
          if (imageResult.success && imageResult.images.length > 0) {
            imageMap[ann.id] = imageResult.images[0].url;
          }
        } catch (err) {
          console.error(`Failed to fetch image for announcement ${ann.id}:`, err);
        }
      });
      await Promise.all(imagePromises);
      setAnnouncementImages(imageMap);

      // Fetch participant counts for event announcements
      const eventAnnouncements = announcementList.filter(
        (a) => a.category && String(a.category).toLowerCase() === "event"
      );

      if (eventAnnouncements.length > 0) {
        const counts = {};
        await Promise.all(
          eventAnnouncements.map(async (eventAnn) => {
            try {
              // Always query the actual participant count from the database
              const { count, error: countError } = await supabase
                .from("event_participants")
                .select("*", { count: "exact", head: true })
                .eq("announcement_id", eventAnn.id);
              
              if (!countError && typeof count === "number") {
                counts[eventAnn.id] = count;
              } else {
                // Fallback to 0 if query fails
                counts[eventAnn.id] = 0;
              }
            } catch (err) {
              console.error(
                `Failed to fetch participant count for announcement ${eventAnn.id}:`,
                err
              );
              counts[eventAnn.id] = 0;
            }
          })
        );
        setParticipantCounts(counts);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching announcement data:", err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  /**
   * Set up real-time subscription to announcement and participant changes
   * This ensures all components stay in sync when users sign up/cancel
   */
  const setupRealtimeSubscription = useCallback(() => {
    // Unsubscribe from existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create a single channel for all real-time updates
    subscriptionRef.current = supabase
      .channel("announcements_and_participants_channel")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "announcement_tbl",
        },
        (payload) => {
          console.log("Announcement change detected:", payload.eventType);
          // Refresh data when changes are detected
          fetchAnnouncementData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "event_participants",
        },
        async (payload) => {
          console.log("Participant change detected:", payload.eventType, payload);
          
          try {
            // Fetch the fresh participant count for the affected announcement
            const announcementId = payload.new?.announcement_id || payload.old?.announcement_id;
            
            if (announcementId) {
              const { count, error: countError } = await supabase
                .from("event_participants")
                .select("*", { count: "exact", head: true })
                .eq("announcement_id", announcementId);

              if (!countError && typeof count === "number") {
                // Update the count for this specific announcement
                setParticipantCounts((prev) => ({
                  ...prev,
                  [announcementId]: count,
                }));
              }
            }
          } catch (err) {
            console.error("Failed to fetch updated participant count:", err);
            // If fetch fails, trigger a full refresh
            fetchAnnouncementData();
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Real-time subscription established for announcements and participants");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.warn("Real-time subscription ended, will use polling");
        }
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [fetchAnnouncementData]);

  /**
   * Initial fetch and subscription setup
   */
  useEffect(() => {
    fetchAnnouncementData();
    const unsubscribe = setupRealtimeSubscription();

    return () => {
      unsubscribe();
    };
  }, [fetchAnnouncementData, setupRealtimeSubscription]);

  /**
   * Manually refresh announcement data
   * Called after operations in AdminAnnouncements
   */
  const refresh = useCallback(async () => {
    console.log("Manually refreshing announcement data");
    await fetchAnnouncementData();
  }, [fetchAnnouncementData]);

  /**
   * Get announcement by ID
   */
  const getAnnouncementById = useCallback(
    (id) => {
      return announcements.find((ann) => ann.id === id) || null;
    },
    [announcements]
  );

  /**
   * Get image URL for announcement
   */
  const getImageUrl = useCallback(
    (announcementId) => {
      return announcementImages[announcementId] || null;
    },
    [announcementImages]
  );

  /**
   * Get participant count for announcement
   */
  const getParticipantCount = useCallback(
    (announcementId) => {
      return participantCounts[announcementId] || 0;
    },
    [participantCounts]
  );

  return {
    announcements,
    announcementImages,
    participantCounts,
    loading,
    error,
    refresh,
    getAnnouncementById,
    getImageUrl,
    getParticipantCount,
  };
}
