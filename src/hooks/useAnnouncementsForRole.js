import { useMemo } from "react";
import { useAnnouncementData } from "./useAnnouncementData";

/**
 * Custom hook for role-based announcement filtering
 * Extends useAnnouncementData with audience filtering
 *
 * Features:
 * - Filters announcements by audience role
 * - Maintains all core functionality from useAnnouncementData
 * - Provides filtered announcement list appropriate for each role
 *
 * Usage:
 * // For officials view
 * const { announcements, images, loading, error, refresh } = useAnnouncementsForRole("officials");
 *
 * // For residents view
 * const { announcements, images, loading, error, refresh } = useAnnouncementsForRole("residents");
 */
export function useAnnouncementsForRole(audience) {
  const {
    announcements,
    announcementImages,
    participantCounts,
    loading,
    error,
    refresh,
    getAnnouncementById,
    getImageUrl,
    getParticipantCount,
  } = useAnnouncementData();

  /**
   * Filter announcements by audience and category
   * Visibility Rules:
   * - General/Alert: visible to everyone (both officials and residents)
   * - Event: visible only to specified audience
   * Memoized to prevent unnecessary recalculations
   */
  const filteredAnnouncements = useMemo(() => {
    if (!audience) {
      return announcements; // Return all if no audience specified (for admin)
    }

    return announcements.filter((ann) => {
      const category = String(ann.category || "").trim().toLowerCase();
      const annAudience = String(ann.audience || "").trim().toLowerCase();
      const requestedAudience = String(audience).trim().toLowerCase();

      // General or Alert announcements are visible to both officials and residents
      if (category === "general" || category === "alert") {
        return true;
      }

      // Event announcements only visible to specified audience
      if (category === "event") {
        return annAudience === requestedAudience;
      }

      // Fallback: check audience match (shouldn't reach here if categories are valid)
      return annAudience === requestedAudience;
    });
  }, [announcements, audience]);

  /**
   * Filter images to only include images for visible announcements
   */
  const filteredImages = useMemo(() => {
    const filtered = {};
    filteredAnnouncements.forEach((ann) => {
      if (announcementImages[ann.id]) {
        filtered[ann.id] = announcementImages[ann.id];
      }
    });
    return filtered;
  }, [filteredAnnouncements, announcementImages]);

  /**
   * Filter participant counts
   */
  const filteredParticipantCounts = useMemo(() => {
    const filtered = {};
    filteredAnnouncements.forEach((ann) => {
      if (participantCounts[ann.id] !== undefined) {
        filtered[ann.id] = participantCounts[ann.id];
      }
    });
    return filtered;
  }, [filteredAnnouncements, participantCounts]);

  return {
    announcements: filteredAnnouncements,
    announcementImages: filteredImages,
    participantCounts: filteredParticipantCounts,
    loading,
    error,
    refresh,
    getAnnouncementById,
    getImageUrl,
    getParticipantCount,
  };
}
