import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Trash2,
  Calendar,
  X,
  Eye,
  Users,
  Clock,
  Tag,
  AlertCircle,
  Edit,
} from "lucide-react";
import "../../styles/BarangayAdmin.css";
import "../../styles/AdminAnnouncements.css";
import "../../styles/BarangayOfficial.css";
import {
  getAnnouncements,
  postAnnouncement,
  deleteAnnouncement,
  getAnnouncementParticipants,
  updateAnnouncement,
  getPurokChoices,
} from "../../supabse_db/announcement/announcement";
import {
  uploadAnnouncementImage,
  fetchAnnouncementImages,
} from "../../supabse_db/uploadImages";

export default function AdminAnnouncements() {
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementImages, setAnnouncementImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [imageLoadingMap, setImageLoadingMap] = useState({});
  const [dateErrors, setDateErrors] = useState({ start: "", end: "" });
  const [formErrors, setFormErrors] = useState({});
  const [formFeedback, setFormFeedback] = useState({
    type: "",
    message: "",
  });
  const [formData, setFormData] = useState({
    category: "general",
    priority: "normal",
    title: "",
    content: "",
    imageFile: null,
    event_start: "",
    event_end: "",
    audience: "residents",
    max_participants: "",
    purok: [],
    min_age: "",
    max_age: "",
    voter_status: [],
    occupation: [],
    religion: [],
    civil_status: [],
    sex: "",
    send_sms: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [purokOptions, setPurokOptions] = useState([]);
  const [purokDropdown, setPurokDropdown] = useState(false);
  const [voterStatusDropdown, setVoterStatusDropdown] = useState(false);
  const [occupationDropdown, setOccupationDropdown] = useState(false);
  const [religionDropdown, setReligionDropdown] = useState(false);
  const [civilStatusDropdown, setCivilStatusDropdown] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Search and filter state
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Enum value mappings from database (occupation_types_v2)
  const occupationOptions = [
    { display: "Unemployed", value: "Unemployed" },
    { display: "Employed", value: "Employed" },
    { display: "Retired", value: "Retired" },
  ];

  const mapSexToUi = (value) => {
    if (value === "M" || value === "Male") return "Male";
    if (value === "F" || value === "Female") return "Female";
    return "";
  };

  const mapSexToDb = (value) => {
    if (value === "Male" || value === "M") return "M";
    if (value === "Female" || value === "F") return "F";
    return null;
  };

  const formatDateTimeLocal = (date) => {
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryConfig = (category) => {
    const cat = (category || "").toLowerCase();
    if (cat === "event")
      return { label: "Event", color: "#8b5cf6", bg: "#f5f3ff", icon: "📅" };
    if (cat === "alert")
      return { label: "Alert", color: "#ef4444", bg: "#fef2f2", icon: "🚨" };
    return { label: "General", color: "#10b981", bg: "#f0fdf4", icon: "📢" };
  };

  const getPriorityConfig = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return { label: "HIGH", color: "#dc2626", bg: "#fef2f2" };
    if (p === "urgent")
      return { label: "URGENT", color: "#9f1239", bg: "#fff1f2" };
    if (p === "medium")
      return { label: "MED", color: "#d97706", bg: "#fffbeb" };
    return null;
  };

  const filterOptions = [
    { key: "all", label: "All" },
    { key: "event", label: "Events" },
    { key: "general", label: "General" },
    { key: "alert", label: "Alerts" },
  ];

  const getDefaultTargetingData = () => ({
    purok: [],
    min_age: "",
    max_age: "",
    voter_status: [],
    occupation: [],
    religion: [],
    civil_status: [],
    sex: "",
    send_sms: false,
  });

  const getMinAllowedDateTime = () => {
    const minDate = new Date();
    minDate.setHours(0, 0, 0, 0);
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
  };

  const validateEventDates = (startValue, endValue) => {
    const errors = { start: "", end: "" };
    const minAllowedDate = getMinAllowedDateTime();
    const startDate = startValue ? new Date(startValue) : null;
    const endDate = endValue ? new Date(endValue) : null;

    if (startDate && startDate < minAllowedDate) {
      errors.start = "Start date must be tomorrow or later.";
    }

    if (endDate && endDate < minAllowedDate) {
      errors.end = "End date must be tomorrow or later.";
    }

    if (startDate && endDate && endDate <= startDate) {
      errors.end = "End date must be after start date.";
    }

    setDateErrors(errors);
    return !errors.start && !errors.end;
  };

  const formatDateTimeReadable = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toArray = (value) => (Array.isArray(value) ? value : []);

  const toReadableLabel = (value) => {
    if (!value) return "—";
    return String(value)
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getEventStatus = (announcement) => {
    if (!announcement?.event_start) return "No Schedule";
    const now = new Date();
    const start = new Date(announcement.event_start);
    const end = announcement.event_end
      ? new Date(announcement.event_end)
      : null;

    if (now < start) return "Upcoming";
    if (end && now > end) return "Completed";
    return "Ongoing";
  };

  const getEventDuration = (announcement) => {
    if (!announcement?.event_start || !announcement?.event_end)
      return "Open-ended";
    const start = new Date(announcement.event_start);
    const end = new Date(announcement.event_end);
    const ms = end - start;
    if (Number.isNaN(ms) || ms <= 0) return "—";

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  const getTargetingChips = (announcement) => {
    const chips = [];
    const ageMin = announcement?.min_age;
    const ageMax = announcement?.max_age;
    const stayMin = announcement?.minimum_year_of_stay;
    const stayMax = announcement?.maximum_year_of_stay;

    if (toArray(announcement?.purok).length > 0) {
      chips.push(`Purok: ${toArray(announcement.purok).join(", ")}`);
    }

    if (announcement?.sex) {
      chips.push(`Sex: ${mapSexToUi(announcement.sex) || announcement.sex}`);
    }

    if (ageMin !== null && ageMin !== undefined && ageMin !== "") {
      chips.push(`Min Age: ${ageMin}`);
    }
    if (ageMax !== null && ageMax !== undefined && ageMax !== "") {
      chips.push(`Max Age: ${ageMax}`);
    }

    if (toArray(announcement?.voter_status).length > 0) {
      chips.push(
        `Voter Status: ${toArray(announcement.voter_status)
          .map((v) => toReadableLabel(v))
          .join(", ")}`,
      );
    }

    if (toArray(announcement?.occupation).length > 0) {
      chips.push(`Occupation: ${toArray(announcement.occupation).join(", ")}`);
    }

    if (toArray(announcement?.religion).length > 0) {
      chips.push(`Religion: ${toArray(announcement.religion).join(", ")}`);
    }

    if (toArray(announcement?.civil_status).length > 0) {
      chips.push(
        `Civil Status: ${toArray(announcement.civil_status)
          .map((status) => toReadableLabel(status))
          .join(", ")}`,
      );
    }

    if (stayMin !== null && stayMin !== undefined && stayMin !== "") {
      chips.push(`Minimum Years of Stay: ${stayMin}`);
    }
    if (stayMax !== null && stayMax !== undefined && stayMax !== "") {
      chips.push(`Maximum Years of Stay: ${stayMax}`);
    }

    return chips;
  };

  const minStartDateTime = formatDateTimeLocal(getMinAllowedDateTime());
  const minEndDateTime = formData.event_start
    ? (() => {
        const endMin = new Date(formData.event_start);
        endMin.setMinutes(endMin.getMinutes() + 1);
        return formatDateTimeLocal(
          endMin < getMinAllowedDateTime() ? getMinAllowedDateTime() : endMin,
        );
      })()
    : minStartDateTime;

  const shouldShowAdvancedFiltering =
    !isEditMode &&
    formData.category === "event" &&
    formData.audience === "residents";

  // Filtered announcements for search and filter
  const filteredAnnouncements = announcements.filter((ann) => {
    const cat = (ann.category || "general").toLowerCase();
    const matchesFilter = activeFilter === "all" || cat === activeFilter;
    const matchesSearch =
      !searchQuery ||
      ann.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const eventCount = announcements.filter(
    (a) => (a.category || "").toLowerCase() === "event",
  ).length;

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });
  };

  const clearFormFeedback = () => {
    setFormErrors({});
    setFormFeedback({ type: "", message: "" });
  };

  const clearFieldError = (field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  console.log("AdminAnnouncements render, showModal=", showModal);

  // Fetch announcements on mount
  useEffect(() => {
    let isMounted = true;

    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getAnnouncements();

        if (!isMounted) return;

        if (result.success && Array.isArray(result.data)) {
          setAnnouncements(result.data);
          setLoading(false);

          // Fetch images in parallel after announcements are displayed
          const imagePromises = result.data.map(async (announcement) => {
            if (!isMounted) return null;

            setImageLoadingMap((prev) => ({
              ...prev,
              [announcement.id]: true,
            }));

            try {
              const imageResult = await fetchAnnouncementImages(
                announcement.id,
              );
              if (
                isMounted &&
                imageResult.success &&
                imageResult.images.length > 0
              ) {
                return { id: announcement.id, url: imageResult.images[0].url };
              }
            } catch (err) {
              console.error(
                `Error fetching image for announcement ${announcement.id}:`,
                err,
              );
            } finally {
              if (isMounted) {
                setImageLoadingMap((prev) => ({
                  ...prev,
                  [announcement.id]: false,
                }));
              }
            }
            return null;
          });

          // Update images as they load
          Promise.all(imagePromises).then((results) => {
            if (!isMounted) return;

            const imageMap = {};
            results.forEach((result) => {
              if (result && result.url) {
                imageMap[result.id] = result.url;
              }
            });

            setAnnouncementImages(imageMap);
          });
        } else {
          console.error("Failed to fetch announcements:", result.message);
          setError(result.message);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching announcements:", err);
        if (isMounted) {
          setError("Error fetching announcements");
          setLoading(false);
        }
      }
    };

    fetchAnnouncements();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const fetchPurokChoices = async () => {
      const result = await getPurokChoices();
      if (result.success && Array.isArray(result.data)) {
        setPurokOptions(result.data);
      } else {
        console.error("Failed to fetch purok choices:", result.message);
      }
    };

    fetchPurokChoices();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", onKey);

    // lock body scroll when modal is open
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [showModal]);

  useEffect(() => {
    if (formData.category !== "event") {
      setDateErrors({ start: "", end: "" });
      return;
    }

    validateEventDates(formData.event_start, formData.event_end);
  }, [formData.category, formData.event_start, formData.event_end]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast.show, toast.message]);

  const openModal = () => {
    console.log("Opening modal...");
    clearFormFeedback();
    setShowModal(true);
  };

  const closeModal = () => {
    console.log("Closing modal...");
    setShowModal(false);
    setIsEditMode(false);
    setEditingAnnouncement(null);
    setDateErrors({ start: "", end: "" });
    clearFormFeedback();
  };

  const openEditModal = (ann) => {
    console.log("Editing announcement:", ann);
    clearFormFeedback();
    setEditingAnnouncement(ann);
    setIsEditMode(true);
    setFormData({
      category: ann.category || "general",
      priority: ann.priority || "normal",
      title: ann.title || "",
      content: ann.content || "",
      imageFile: null,
      event_start: ann.event_start ? ann.event_start.slice(0, 16) : "",
      event_end: ann.event_end ? ann.event_end.slice(0, 16) : "",
      audience: ann.audience || "residents",
      max_participants: ann.max_participants || "",
      purok: Array.isArray(ann.purok) ? ann.purok : [],
      min_age: ann.min_age ?? "",
      max_age: ann.max_age ?? "",
      voter_status: Array.isArray(ann.voter_status) ? ann.voter_status : [],
      occupation: Array.isArray(ann.occupation) ? ann.occupation : [],
      religion: Array.isArray(ann.religion) ? ann.religion : [],
      civil_status: Array.isArray(ann.civil_status) ? ann.civil_status : [],
      sex: mapSexToUi(ann.sex),
      send_sms: Boolean(ann.send_sms),
    });
    setShowModal(true);
  };

  const closeEditModal = () => {
    setShowModal(false);
    setIsEditMode(false);
    setEditingAnnouncement(null);
    clearFormFeedback();
    setFormData({
      category: "general",
      priority: "normal",
      title: "",
      content: "",
      imageFile: null,
      event_start: "",
      event_end: "",
      audience: "residents",
      max_participants: "",
      purok: [],
      min_age: "",
      max_age: "",
      voter_status: [],
      occupation: [],
      religion: [],
      civil_status: [],
      sex: "",
      send_sms: false,
    });
  };

  const openAnnDetails = (ann) => setSelectedAnnouncement(ann);
  const closeAnnDetails = () => setSelectedAnnouncement(null);

  // Load participants whenever an event announcement is selected
  useEffect(() => {
    if (!selectedAnnouncement || selectedAnnouncement.category !== "event") {
      setParticipants([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setParticipantsLoading(true);
      try {
        const result = await getAnnouncementParticipants(
          selectedAnnouncement.id,
          selectedAnnouncement.audience,
        );
        if (!cancelled) setParticipants(result.success ? result.data : []);
      } catch {
        if (!cancelled) setParticipants([]);
      } finally {
        if (!cancelled) setParticipantsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAnnouncement]);

  // Escape key + scroll lock for details modal
  useEffect(() => {
    if (!selectedAnnouncement) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") closeAnnDetails();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnnouncement]);

  const handleDeleteAnnouncement = async (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        const result = await deleteAnnouncement(id);
        if (result.success) {
          console.log("Announcement deleted successfully");
          // Optimistically update UI
          setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
          setAnnouncementImages((prev) => {
            const newImages = { ...prev };
            delete newImages[id];
            return newImages;
          });
        } else {
          alert("Error deleting announcement: " + result.message);
        }
      } catch (err) {
        console.error("Error deleting announcement:", err);
        alert("Error deleting announcement");
      }
    }
  };

  const handlePostAnnouncement = async () => {
    const nextErrors = {};

    if (!formData.title.trim()) {
      nextErrors.title = "Please enter a title.";
    }
    if (!formData.content.trim()) {
      nextErrors.content = "Please enter announcement details.";
    }

    const isEventCategory = formData.category === "event";
    if (isEventCategory && !formData.event_start) {
      nextErrors.event_start = "Please select an event start date and time.";
    }

    if (isEventCategory && !formData.event_end) {
      nextErrors.event_end = "Please select an event end date and time.";
    }

    if (
      isEventCategory &&
      formData.event_start &&
      formData.event_end &&
      new Date(formData.event_end) < new Date(formData.event_start)
    ) {
      nextErrors.event_end = "Event end must be after event start.";
    }

    if (isEventCategory) {
      const datesValid = validateEventDates(
        formData.event_start,
        formData.event_end,
      );
      if (!datesValid) {
        nextErrors.event_dates = "Please fix the event date and time fields.";
      }
    }

    if (isEventCategory && !formData.max_participants) {
      nextErrors.max_participants =
        "Please enter max participants for event announcements.";
    }

    if (
      isEventCategory &&
      formData.max_participants &&
      Number(formData.max_participants) <= 0
    ) {
      nextErrors.max_participants = "Max participants must be greater than 0.";
    }

    let minAge =
      formData.min_age === "" ? null : Number.parseInt(formData.min_age, 10);
    let maxAge =
      formData.max_age === "" ? null : Number.parseInt(formData.max_age, 10);

    if (isEventCategory) {
      if ((minAge !== null && Number.isNaN(minAge)) || minAge < 0) {
        nextErrors.min_age =
          "Minimum age must be a valid number (0 or greater).";
      }

      if ((maxAge !== null && Number.isNaN(maxAge)) || maxAge < 0) {
        nextErrors.max_age =
          "Maximum age must be a valid number (0 or greater).";
      }

      if (minAge === null && maxAge !== null) {
        minAge = 0;
      }

      if (minAge !== null && maxAge === null) {
        maxAge = minAge;
      }

      if (minAge !== null && maxAge !== null && maxAge < minAge) {
        nextErrors.max_age = "Maximum age cannot be lower than minimum age.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setFormFeedback({
        type: "error",
        message: "Please fix the highlighted fields before submitting.",
      });
      return;
    }

    clearFormFeedback();

    if (
      isEventCategory &&
      !validateEventDates(formData.event_start, formData.event_end)
    ) {
      setFormFeedback({
        type: "error",
        message: "Please fix the event schedule inside the popup.",
      });
      return;
    }

    if (isEventCategory) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.event_dates;
        return next;
      });
    }

    const eventData = isEventCategory
      ? {
          event_start: formData.event_start || null,
          event_end: formData.event_end || null,
          audience: formData.audience || null,
          max_participants: formData.max_participants
            ? Number(formData.max_participants)
            : null,
          purok: formData.purok.length > 0 ? formData.purok : null,
          min_age: minAge,
          max_age: maxAge,
          voter_status:
            formData.voter_status.length > 0 ? formData.voter_status : null,
          occupation:
            formData.occupation.length > 0 ? formData.occupation : null,
          religion: formData.religion.length > 0 ? formData.religion : null,
          civil_status:
            formData.civil_status.length > 0 ? formData.civil_status : null,
          sex: mapSexToDb(formData.sex),
          send_sms: Boolean(formData.send_sms),
        }
      : {
          event_start: null,
          event_end: null,
          audience: null,
          max_participants: null,
          purok: null,
          min_age: null,
          max_age: null,
          voter_status: null,
          occupation: null,
          religion: null,
          civil_status: null,
          sex: null,
          send_sms: false,
        };

    try {
      setPosting(true);
      console.log("Posting announcement:", formData);

      let result;
      if (isEditMode && editingAnnouncement) {
        // Update existing announcement
        console.log("Updating announcement:", editingAnnouncement.id);
        result = await updateAnnouncement(
          editingAnnouncement.id,
          formData.category,
          formData.priority,
          formData.title,
          formData.content,
          eventData,
        );
      } else {
        // Create new announcement
        result = await postAnnouncement(
          formData.category,
          formData.priority,
          formData.title,
          formData.content,
          eventData,
        );
      }

      if (result.success) {
        console.log("Announcement saved successfully:", result.data);

        // Show success message
        if (isEditMode) {
          showToast("Announcement updated successfully!", "success");
        } else {
          showToast("Announcement successfully created!", "success");
        }

        // Upload image if provided and it's a file (not just a reference)
        if (formData.imageFile && formData.imageFile instanceof File) {
          const announcementID = isEditMode
            ? editingAnnouncement.id
            : result.data?.id;
          if (announcementID) {
            const uploadResult = await uploadAnnouncementImage(
              formData.imageFile,
              announcementID,
            );
            if (uploadResult.success) {
              console.log(
                "Announcement image uploaded successfully:",
                uploadResult,
              );
            } else {
              console.error(
                "Error uploading announcement image:",
                uploadResult.error,
              );
              alert(
                "Announcement created but image upload failed: " +
                  uploadResult.error,
              );
              showToast(
                "Announcement was saved, but image upload failed.",
                "error",
              );
            }
          } else {
            console.warn("No announcement ID returned from server");
          }
        }

        // Reset form
        setFormData({
          category: "general",
          priority: "normal",
          title: "",
          content: "",
          imageFile: null,
          event_start: "",
          event_end: "",
          audience: "residents",
          max_participants: "",
          purok: [],
          min_age: "",
          max_age: "",
          voter_status: [],
          occupation: [],
          religion: [],
          civil_status: [],
          sex: "",
          send_sms: false,
        });
        setShowAdvanced(false);
        closeModal();

        // Force refresh of announcements list (bypass cache)
        console.log("Force refreshing announcements after update/post");
        const refreshResult = await getAnnouncements(true);
        if (refreshResult.success && Array.isArray(refreshResult.data)) {
          setAnnouncements(refreshResult.data);

          // Fetch images only for new/updated announcements in parallel
          const newAnnouncements = refreshResult.data.filter(
            (ann) => !announcementImages[ann.id] || isEditMode,
          );

          if (newAnnouncements.length > 0) {
            const imagePromises = newAnnouncements.map(async (announcement) => {
              try {
                const imageResult = await fetchAnnouncementImages(
                  announcement.id,
                );
                if (imageResult.success && imageResult.images.length > 0) {
                  return {
                    id: announcement.id,
                    url: imageResult.images[0].url,
                  };
                }
              } catch (err) {
                console.error(
                  `Error fetching image for announcement ${announcement.id}:`,
                  err,
                );
              }
              return null;
            });

            const results = await Promise.all(imagePromises);
            const newImageMap = { ...announcementImages };
            results.forEach((result) => {
              if (result && result.url) {
                newImageMap[result.id] = result.url;
              }
            });
            setAnnouncementImages(newImageMap);
          }
        }
      } else {
        setFormFeedback({
          type: "error",
          message: result.message || "Unable to save announcement.",
        });
      }
    } catch (err) {
      console.error("Error posting announcement:", err);
      setFormFeedback({
        type: "error",
        message: "Error posting announcement.",
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ann-page-root">
      {/* ── Page Header ── */}
      <div className="ann-page-header">
        <div className="ann-page-header-left">
          <h1 className="ann-page-title">Announcements</h1>
          <p className="ann-page-subtitle">
            Create and monitor official barangay updates
          </p>
        </div>
        <div className="ann-summary-chips">
          <div className="ann-summary-chip">
            <span className="ann-summary-chip-num">{announcements.length}</span>
            <span className="ann-summary-chip-label">Total</span>
          </div>
          <div className="ann-summary-chip accent-purple">
            <span className="ann-summary-chip-num">{eventCount}</span>
            <span className="ann-summary-chip-label">Events</span>
          </div>
        </div>
      </div>

      {/* ── Add New Announcement Button ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "24px",
        }}
      >
        <button className="btn-new-ann" onClick={openModal}>
          + New Announcement
        </button>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="ann-toolbar">
        <div className="ann-search-wrap">
          <svg
            className="ann-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="ann-search-input"
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ann-filter-pills">
          {filterOptions.map((f) => (
            <button
              key={f.key}
              className={`ann-filter-pill${activeFilter === f.key ? " active" : ""}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Count Label ── */}
      <div className="ann-count-label">
        Showing {filteredAnnouncements.length} of {announcements.length}{" "}
        announcements
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="ann-loading-state">
          <div className="ann-loading-spinner" />
          <span>Loading announcements...</span>
        </div>
      )}

      {/* ── Error State ── */}
      {error && (
        <div className="ann-error-state">
          <div className="ann-error-icon">⚠️</div>
          <p className="ann-error-text">Error: {error}</p>
        </div>
      )}

      {/* ── Cards Grid ── */}
      {!loading &&
        !error &&
        (filteredAnnouncements.length === 0 ? (
          <div className="ann-empty-state">
            <div className="ann-empty-icon">📭</div>
            <p className="ann-empty-text">No announcements found</p>
            <p className="ann-empty-sub">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="ann-cards-grid">
            {filteredAnnouncements.map((ann, idx) => {
              const catConfig = getCategoryConfig(ann.category);
              const priorityConfig = getPriorityConfig(ann.priority);
              const isEvent = (ann.category || "").toLowerCase() === "event";
              const hasImage = !!announcementImages[ann.id];

              return (
                <div
                  className="ann-card-new"
                  key={ann.id}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Image / Placeholder */}
                  <div className="ann-card-img-wrap">
                    {imageLoadingMap[ann.id] ? (
                      <div
                        className="ann-card-img-placeholder"
                        style={{ background: "#f3f4f6" }}
                      >
                        <div
                          className="loading-spinner"
                          style={{ width: "24px", height: "24px" }}
                        />
                      </div>
                    ) : hasImage ? (
                      <img
                        src={announcementImages[ann.id]}
                        alt={ann.title}
                        className="ann-card-img"
                      />
                    ) : (
                      <div
                        className="ann-card-img-placeholder"
                        style={{ background: catConfig.bg }}
                      >
                        <span className="ann-card-img-emoji">
                          {catConfig.icon}
                        </span>
                      </div>
                    )}

                    {/* Category badge overlaid on image */}
                    <span
                      className="ann-card-cat-badge"
                      style={{ background: catConfig.color }}
                    >
                      {catConfig.label}
                    </span>

                    {/* Priority badge */}
                    {priorityConfig && (
                      <span
                        className="ann-card-priority-badge"
                        style={{
                          color: priorityConfig.color,
                          background: priorityConfig.bg,
                        }}
                      >
                        {priorityConfig.label}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="ann-card-body">
                    <div className="ann-card-meta">
                      <span className="ann-card-author">
                        {ann.author || "Barangay"}
                      </span>
                      <span className="ann-card-dot">·</span>
                      <span className="ann-card-date">
                        {formatDateShort(ann.created_at)}
                      </span>
                    </div>

                    <h3 className="ann-card-title">{ann.title}</h3>
                    <p className="ann-card-desc">{ann.content}</p>

                    {/* Event details */}
                    {isEvent && ann.event_start && (
                      <div className="ann-card-event-row">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="13"
                          height="13"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <span>
                          {new Date(ann.event_start).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </span>
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="ann-card-admin-actions">
                      <button
                        className="ann-admin-btn-view"
                        onClick={() => openAnnDetails(ann)}
                        title="View Details"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        className="ann-admin-btn-edit"
                        onClick={() => openEditModal(ann)}
                        title="Edit"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        className="ann-admin-btn-delete"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {/* Announcement Details Modal */}
      {selectedAnnouncement &&
        createPortal(
          <div
            className="ann-details-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeAnnDetails();
            }}
          >
            <div className="ann-details-shell">
              {/* Header */}
              <div className="ann-details-header">
                <div className="ann-details-header-left">
                  <div className="ann-details-badges">
                    <span
                      className={`ann-details-category-badge cat-${
                        selectedAnnouncement.category?.toLowerCase() ||
                        "general"
                      }`}
                    >
                      {selectedAnnouncement.category?.toUpperCase() ||
                        "GENERAL"}
                    </span>
                    <span
                      className={`priority-pill priority-${
                        selectedAnnouncement.priority?.toLowerCase() || "normal"
                      }`}
                    >
                      {selectedAnnouncement.priority?.toUpperCase() || "NORMAL"}
                    </span>
                  </div>
                  <h2 className="ann-details-title">
                    {selectedAnnouncement.title}
                  </h2>
                  <p className="ann-details-meta">
                    Posted{" "}
                    {new Date(
                      selectedAnnouncement.created_at,
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <button
                  className="ann-details-close"
                  onClick={closeAnnDetails}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="ann-details-content">
                <div className="ann-details-kpi-grid">
                  <div className="ann-details-kpi-card">
                    <span className="ann-details-kpi-label">Audience</span>
                    <span
                      className="ann-details-kpi-value"
                      style={{ textTransform: "capitalize" }}
                    >
                      {toReadableLabel(
                        selectedAnnouncement.audience || "Residents",
                      )}
                    </span>
                  </div>
                  <div className="ann-details-kpi-card">
                    <span className="ann-details-kpi-label">
                      SMS Notification
                    </span>
                    <span className="ann-details-kpi-value">
                      {selectedAnnouncement.send_sms ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="ann-details-kpi-card">
                    <span className="ann-details-kpi-label">
                      Targeting Rules
                    </span>
                    <span className="ann-details-kpi-value">
                      {getTargetingChips(selectedAnnouncement).length} rules
                    </span>
                  </div>
                  <div className="ann-details-kpi-card">
                    <span className="ann-details-kpi-label">
                      Announcement ID
                    </span>
                    <span className="ann-details-kpi-value">
                      #{selectedAnnouncement.id}
                    </span>
                  </div>
                </div>

                {/* Full content */}
                <div className="ann-details-section">
                  <div className="ann-details-section-header">
                    <Tag size={15} />
                    Content
                  </div>
                  <p className="ann-details-content-text">
                    {selectedAnnouncement.content}
                  </p>
                </div>

                {/* Event-only sections */}
                {selectedAnnouncement.category === "event" && (
                  <>
                    {/* Event details */}
                    <div className="ann-details-section">
                      <div className="ann-details-section-header">
                        <Clock size={15} />
                        Event Details
                      </div>
                      <div className="ann-details-info-grid">
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">Status</span>
                          <span className="ann-details-info-value">
                            {getEventStatus(selectedAnnouncement)}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Event Start
                          </span>
                          <span className="ann-details-info-value">
                            {formatDateTimeReadable(
                              selectedAnnouncement.event_start,
                            )}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Event End
                          </span>
                          <span className="ann-details-info-value">
                            {formatDateTimeReadable(
                              selectedAnnouncement.event_end,
                            )}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Duration
                          </span>
                          <span className="ann-details-info-value">
                            {getEventDuration(selectedAnnouncement)}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Audience
                          </span>
                          <span
                            className="ann-details-info-value"
                            style={{ textTransform: "capitalize" }}
                          >
                            {selectedAnnouncement.audience || "—"}
                          </span>
                        </div>
                        <div className="ann-details-info-row">
                          <span className="ann-details-info-label">
                            Max Participants
                          </span>
                          <span className="ann-details-info-value">
                            {selectedAnnouncement.max_participants ??
                              "Unlimited"}
                          </span>
                        </div>
                      </div>

                      {/* Fill bar */}
                      {selectedAnnouncement.max_participants && (
                        <div className="ann-details-fill-wrap">
                          <div className="ann-details-fill-label">
                            <span>
                              <Users size={13} /> Participants signed up
                            </span>
                            <span>
                              {participantsLoading
                                ? "..."
                                : participants.length}{" "}
                              / {selectedAnnouncement.max_participants}
                            </span>
                          </div>
                          <div className="ann-details-fill-bar">
                            <div
                              className="ann-details-fill-inner"
                              style={{
                                width: participantsLoading
                                  ? "0%"
                                  : `${Math.min(
                                      100,
                                      (participants.length /
                                        selectedAnnouncement.max_participants) *
                                        100,
                                    )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Participants list */}
                    <div className="ann-details-section">
                      <div className="ann-details-section-header">
                        <Users size={15} />
                        Participants
                        {!participantsLoading && (
                          <span className="ann-details-count-chip">
                            {participants.length}
                          </span>
                        )}
                      </div>

                      {participantsLoading ? (
                        <div className="ann-details-loading">
                          <div className="loading-spinner" aria-hidden="true" />
                          Loading participants...
                        </div>
                      ) : participants.length === 0 ? (
                        <div className="ann-details-empty">
                          <AlertCircle size={18} />
                          No participants have signed up yet.
                        </div>
                      ) : (
                        <div className="ann-details-table-wrap">
                          <table className="ann-details-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>
                                  {selectedAnnouncement.audience?.toLowerCase() ===
                                  "officials"
                                    ? "Role"
                                    : "Contact Number"}
                                </th>
                                <th>Signed Up At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {participants.map((p, idx) => (
                                <tr key={p.participantId}>
                                  <td className="muted">{idx + 1}</td>
                                  <td>{p.fullName}</td>
                                  <td>{p.email}</td>
                                  <td style={{ textTransform: "capitalize" }}>
                                    {selectedAnnouncement.audience?.toLowerCase() ===
                                    "officials"
                                      ? p.role
                                      : p.contactNumber}
                                  </td>
                                  <td className="muted">
                                    {new Date(p.signedUpAt).toLocaleDateString(
                                      "en-US",
                                      {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      },
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="ann-details-section">
                  <div className="ann-details-section-header">
                    <Users size={15} />
                    Audience Targeting
                  </div>

                  {getTargetingChips(selectedAnnouncement).length > 0 ? (
                    <div className="ann-targeting-chip-wrap">
                      {getTargetingChips(selectedAnnouncement).map((chip) => (
                        <span key={chip} className="ann-targeting-chip">
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="ann-details-empty">
                      <AlertCircle size={18} />
                      No targeting filters applied. This announcement is broadly
                      visible to the selected audience.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal - TEST VERSION */}
      {showModal &&
        createPortal(
          <div
            className="admin-announcement-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div
              className="admin-announcement-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "20px", color: "#065f46" }}>
                  {isEditMode ? "Edit Announcement" : "Create Announcement"}
                </h4>
                <button
                  onClick={closeModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#999",
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {formFeedback.message && (
                  <div
                    style={{
                      border: `1px solid ${formFeedback.type === "error" ? "#fecaca" : "#a7f3d0"}`,
                      backgroundColor:
                        formFeedback.type === "error" ? "#fef2f2" : "#ecfdf5",
                      color:
                        formFeedback.type === "error" ? "#991b1b" : "#065f46",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                    role="alert"
                    aria-live="polite"
                  >
                    {formFeedback.message}
                  </div>
                )}

                {/* Category and Priority */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const nextCategory = e.target.value;
                        setFormData({
                          ...formData,
                          category: nextCategory,
                          ...(nextCategory !== "event"
                            ? {
                                event_start: "",
                                event_end: "",
                                audience: "residents",
                                max_participants: "",
                                purok: [],
                                min_age: "",
                                max_age: "",
                                voter_status: [],
                                occupation: [],
                                religion: [],
                                civil_status: [],
                                sex: "",
                                send_sms: false,
                              }
                            : {}),
                        });
                        setFormFeedback({ type: "", message: "" });
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.category;
                          if (nextCategory !== "event") {
                            delete next.event_start;
                            delete next.event_end;
                            delete next.event_dates;
                            delete next.max_participants;
                            delete next.min_age;
                            delete next.max_age;
                          }
                          return next;
                        });
                        if (nextCategory !== "event") {
                          setShowAdvanced(false);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="general">General</option>
                      <option value="event">Event</option>
                      <option value="alert">Alert</option>
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Priority Level
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Monthly Clean-up Drive"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      clearFieldError("title");
                      setFormFeedback({ type: "", message: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                  {formErrors.title && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#dc2626",
                      }}
                    >
                      {formErrors.title}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Content
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Details about the announcement..."
                    value={formData.content}
                    onChange={(e) => {
                      setFormData({ ...formData, content: e.target.value });
                      clearFieldError("content");
                      setFormFeedback({ type: "", message: "" });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                  {formErrors.content && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#dc2626",
                      }}
                    >
                      {formErrors.content}
                    </div>
                  )}
                </div>

                {formData.category === "event" && (
                  <>
                    {formErrors.event_dates && (
                      <div
                        style={{
                          border: "1px solid #fecaca",
                          backgroundColor: "#fef2f2",
                          color: "#991b1b",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {formErrors.event_dates}
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontWeight: "500",
                            fontSize: "14px",
                          }}
                        >
                          Event Start
                        </label>
                        <input
                          type="datetime-local"
                          min={minStartDateTime}
                          value={formData.event_start}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              event_start: e.target.value,
                            });
                            clearFieldError("event_start");
                            clearFieldError("event_dates");
                            setFormFeedback({ type: "", message: "" });
                          }}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                          }}
                        />
                        {formErrors.event_start && (
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                          >
                            {formErrors.event_start}
                          </div>
                        )}
                        {dateErrors.start && (
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                          >
                            {dateErrors.start}
                          </div>
                        )}
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontWeight: "500",
                            fontSize: "14px",
                          }}
                        >
                          Event End
                        </label>
                        <input
                          type="datetime-local"
                          min={minEndDateTime}
                          value={formData.event_end}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              event_end: e.target.value,
                            });
                            clearFieldError("event_end");
                            clearFieldError("event_dates");
                            setFormFeedback({ type: "", message: "" });
                          }}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                          }}
                        />
                        {formErrors.event_end && (
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                          >
                            {formErrors.event_end}
                          </div>
                        )}
                        {dateErrors.end && (
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                          >
                            {dateErrors.end}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontWeight: "500",
                            fontSize: "14px",
                          }}
                        >
                          Audience
                        </label>
                        <select
                          value={formData.audience}
                          onChange={(e) => {
                            const nextAudience = e.target.value;
                            setFormData({
                              ...formData,
                              audience: nextAudience,
                              ...(!isEditMode && nextAudience !== "residents"
                                ? getDefaultTargetingData()
                                : {}),
                            });

                            if (!isEditMode && nextAudience !== "residents") {
                              setShowAdvanced(false);
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontFamily: "inherit",
                          }}
                        >
                          <option value="residents">Residents</option>
                          <option value="officials">Officials</option>
                        </select>
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontWeight: "500",
                            fontSize: "14px",
                          }}
                        >
                          Max Participants
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="E.g., 50"
                          value={formData.max_participants}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              max_participants: e.target.value,
                            });
                            clearFieldError("max_participants");
                            setFormFeedback({ type: "", message: "" });
                          }}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                          }}
                        />
                        {formErrors.max_participants && (
                          <div
                            style={{
                              marginTop: "6px",
                              fontSize: "12px",
                              color: "#dc2626",
                            }}
                          >
                            {formErrors.max_participants}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {shouldShowAdvancedFiltering && (
                  <div style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        background: showAdvanced ? "#f0fdf4" : "#f9fafb",
                        color: showAdvanced ? "#047857" : "#6b7280",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {showAdvanced ? "▼" : "▶"} Advanced Filtering Options
                    </button>

                    {showAdvanced && (
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "20px",
                          background: "#f9fafb",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          display: "flex",
                          flexDirection: "column",
                          gap: "20px",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: "18px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Purok (Select Multiple)
                            </label>
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={() => setPurokDropdown(!purokDropdown)}
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  textAlign: "left",
                                  backgroundColor: "#f9fafb",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                {formData.purok.length > 0
                                  ? `${formData.purok.length} selected`
                                  : "Select purok..."}
                              </button>
                              {purokDropdown && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderTop: "none",
                                    borderRadius: "0 0 6px 6px",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    zIndex: 10,
                                  }}
                                >
                                  {purokOptions.map((purokName) => (
                                    <label
                                      key={purokName}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #eee",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData.purok.includes(
                                          purokName,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormData({
                                              ...formData,
                                              purok: [
                                                ...formData.purok,
                                                purokName,
                                              ],
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              purok: formData.purok.filter(
                                                (p) => p !== purokName,
                                              ),
                                            });
                                          }
                                        }}
                                        style={{
                                          marginRight: "8px",
                                          cursor: "pointer",
                                        }}
                                      />
                                      {purokName}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            {formData.purok.length > 0 && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "6px",
                                }}
                              >
                                {formData.purok.map((purokName) => (
                                  <div
                                    key={purokName}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      backgroundColor: "#e8f0ff",
                                      border: "1px solid #b3d9ff",
                                      borderRadius: "4px",
                                      padding: "6px 10px",
                                      fontSize: "13px",
                                    }}
                                  >
                                    <span style={{ marginRight: "6px" }}>
                                      {purokName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          purok: formData.purok.filter(
                                            (p) => p !== purokName,
                                          ),
                                        });
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "#d32f2f",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        padding: "0",
                                        lineHeight: "1",
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Age Range
                            </label>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "10px",
                              }}
                            >
                              <input
                                type="number"
                                min="0"
                                placeholder="Minimum age"
                                value={formData.min_age}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    min_age: e.target.value,
                                  });
                                  clearFieldError("min_age");
                                  clearFieldError("max_age");
                                  setFormFeedback({ type: "", message: "" });
                                }}
                                onBlur={() => {
                                  if (
                                    formData.min_age !== "" &&
                                    formData.max_age === ""
                                  ) {
                                    setFormData({
                                      ...formData,
                                      max_age: formData.min_age,
                                    });
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  fontFamily: "inherit",
                                }}
                              />
                              {formErrors.min_age && (
                                <div
                                  style={{
                                    marginTop: "6px",
                                    fontSize: "12px",
                                    color: "#dc2626",
                                    gridColumn: "1 / -1",
                                  }}
                                >
                                  {formErrors.min_age}
                                </div>
                              )}
                              <input
                                type="number"
                                min="0"
                                placeholder="Maximum age"
                                value={formData.max_age}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    max_age: e.target.value,
                                  });
                                  clearFieldError("max_age");
                                  clearFieldError("min_age");
                                  setFormFeedback({ type: "", message: "" });
                                }}
                                onBlur={() => {
                                  if (
                                    formData.max_age !== "" &&
                                    formData.min_age === ""
                                  ) {
                                    setFormData({
                                      ...formData,
                                      min_age: "0",
                                    });
                                  }
                                }}
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  fontFamily: "inherit",
                                }}
                              />
                              {formErrors.max_age && (
                                <div
                                  style={{
                                    marginTop: "6px",
                                    fontSize: "12px",
                                    color: "#dc2626",
                                    gridColumn: "1 / -1",
                                  }}
                                >
                                  {formErrors.max_age}
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Voter Status (Select Multiple)
                            </label>
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setVoterStatusDropdown(!voterStatusDropdown)
                                }
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  textAlign: "left",
                                  backgroundColor: "#f9fafb",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                {formData.voter_status.length > 0
                                  ? `${formData.voter_status.length} selected`
                                  : "Select voter status..."}
                              </button>
                              {voterStatusDropdown && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderTop: "none",
                                    borderRadius: "0 0 6px 6px",
                                    zIndex: 10,
                                  }}
                                >
                                  {[
                                    "registered",
                                    "not-registered",
                                    "transferred",
                                  ].map((status) => (
                                    <label
                                      key={status}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #eee",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData.voter_status.includes(
                                          status,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormData({
                                              ...formData,
                                              voter_status: [
                                                ...formData.voter_status,
                                                status,
                                              ],
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              voter_status:
                                                formData.voter_status.filter(
                                                  (v) => v !== status,
                                                ),
                                            });
                                          }
                                        }}
                                        style={{
                                          marginRight: "8px",
                                          cursor: "pointer",
                                        }}
                                      />
                                      {status === "not-registered"
                                        ? "Not Registered"
                                        : status.charAt(0).toUpperCase() +
                                          status.slice(1)}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            {formData.voter_status.length > 0 && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "6px",
                                }}
                              >
                                {formData.voter_status.map((status) => (
                                  <div
                                    key={status}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      backgroundColor: "#e8f0ff",
                                      border: "1px solid #b3d9ff",
                                      borderRadius: "4px",
                                      padding: "6px 10px",
                                      fontSize: "13px",
                                    }}
                                  >
                                    <span style={{ marginRight: "6px" }}>
                                      {status === "not-registered"
                                        ? "Not Registered"
                                        : status.charAt(0).toUpperCase() +
                                          status.slice(1)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          voter_status:
                                            formData.voter_status.filter(
                                              (v) => v !== status,
                                            ),
                                        });
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "#d32f2f",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        padding: "0",
                                        lineHeight: "1",
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Occupation (Select Multiple)
                            </label>
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setOccupationDropdown(!occupationDropdown)
                                }
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  textAlign: "left",
                                  backgroundColor: "#f9fafb",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                {formData.occupation.length > 0
                                  ? `${formData.occupation.length} selected`
                                  : "Select occupations..."}
                              </button>
                              {occupationDropdown && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderTop: "none",
                                    borderRadius: "0 0 6px 6px",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    zIndex: 10,
                                  }}
                                >
                                  {occupationOptions.map((occ) => (
                                    <label
                                      key={occ.value}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #eee",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData.occupation.includes(
                                          occ.value,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormData({
                                              ...formData,
                                              occupation: [
                                                ...formData.occupation,
                                                occ.value,
                                              ],
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              occupation:
                                                formData.occupation.filter(
                                                  (o) => o !== occ.value,
                                                ),
                                            });
                                          }
                                        }}
                                        style={{
                                          marginRight: "8px",
                                          cursor: "pointer",
                                        }}
                                      />
                                      {occ.display}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            {formData.occupation.length > 0 && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "6px",
                                }}
                              >
                                {formData.occupation.map((occ) => {
                                  const option = occupationOptions.find(
                                    (o) => o.value === occ,
                                  );
                                  return (
                                    <div
                                      key={occ}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        backgroundColor: "#e8f0ff",
                                        border: "1px solid #b3d9ff",
                                        borderRadius: "4px",
                                        padding: "6px 10px",
                                        fontSize: "13px",
                                      }}
                                    >
                                      <span style={{ marginRight: "6px" }}>
                                        {option?.display || occ}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFormData({
                                            ...formData,
                                            occupation:
                                              formData.occupation.filter(
                                                (o) => o !== occ,
                                              ),
                                          });
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#d32f2f",
                                          cursor: "pointer",
                                          fontSize: "16px",
                                          padding: "0",
                                          lineHeight: "1",
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Religion (Select Multiple)
                            </label>
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setReligionDropdown(!religionDropdown)
                                }
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  textAlign: "left",
                                  backgroundColor: "#f9fafb",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                {formData.religion.length > 0
                                  ? `${formData.religion.length} selected`
                                  : "Select religions..."}
                              </button>
                              {religionDropdown && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderTop: "none",
                                    borderRadius: "0 0 6px 6px",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    zIndex: 10,
                                  }}
                                >
                                  {["Catholic", "Christian", "Born Again"].map(
                                    (rel) => (
                                      <label
                                        key={rel}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          padding: "8px 10px",
                                          cursor: "pointer",
                                          borderBottom: "1px solid #eee",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={formData.religion.includes(
                                            rel,
                                          )}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setFormData({
                                                ...formData,
                                                religion: [
                                                  ...formData.religion,
                                                  rel,
                                                ],
                                              });
                                            } else {
                                              setFormData({
                                                ...formData,
                                                religion:
                                                  formData.religion.filter(
                                                    (r) => r !== rel,
                                                  ),
                                              });
                                            }
                                          }}
                                          style={{
                                            marginRight: "8px",
                                            cursor: "pointer",
                                          }}
                                        />
                                        {rel}
                                      </label>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                            {formData.religion.length > 0 && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "6px",
                                }}
                              >
                                {formData.religion.map((rel) => (
                                  <div
                                    key={rel}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      backgroundColor: "#e8f0ff",
                                      border: "1px solid #b3d9ff",
                                      borderRadius: "4px",
                                      padding: "6px 10px",
                                      fontSize: "13px",
                                    }}
                                  >
                                    <span style={{ marginRight: "6px" }}>
                                      {rel}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          religion: formData.religion.filter(
                                            (r) => r !== rel,
                                          ),
                                        });
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "#d32f2f",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        padding: "0",
                                        lineHeight: "1",
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Civil Status (Select Multiple)
                            </label>
                            <div style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setCivilStatusDropdown(!civilStatusDropdown)
                                }
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  border: "1px solid #ddd",
                                  borderRadius: "6px",
                                  textAlign: "left",
                                  backgroundColor: "#f9fafb",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                {formData.civil_status.length > 0
                                  ? `${formData.civil_status.length} selected`
                                  : "Select civil status..."}
                              </button>
                              {civilStatusDropdown && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderTop: "none",
                                    borderRadius: "0 0 6px 6px",
                                    zIndex: 10,
                                  }}
                                >
                                  {[
                                    "single",
                                    "married",
                                    "widowed",
                                    "seperated",
                                    "divorced",
                                  ].map((status) => (
                                    <label
                                      key={status}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #eee",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData.civil_status.includes(
                                          status,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormData({
                                              ...formData,
                                              civil_status: [
                                                ...formData.civil_status,
                                                status,
                                              ],
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              civil_status:
                                                formData.civil_status.filter(
                                                  (c) => c !== status,
                                                ),
                                            });
                                          }
                                        }}
                                        style={{
                                          marginRight: "8px",
                                          cursor: "pointer",
                                        }}
                                      />
                                      {status.charAt(0).toUpperCase() +
                                        status.slice(1)}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            {formData.civil_status.length > 0 && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "6px",
                                }}
                              >
                                {formData.civil_status.map((status) => (
                                  <div
                                    key={status}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      backgroundColor: "#e8f0ff",
                                      border: "1px solid #b3d9ff",
                                      borderRadius: "4px",
                                      padding: "6px 10px",
                                      fontSize: "13px",
                                    }}
                                  >
                                    <span style={{ marginRight: "6px" }}>
                                      {status.charAt(0).toUpperCase() +
                                        status.slice(1)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          civil_status:
                                            formData.civil_status.filter(
                                              (c) => c !== status,
                                            ),
                                        });
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "#d32f2f",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        padding: "0",
                                        lineHeight: "1",
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Sex
                            </label>
                            <select
                              value={formData.sex}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  sex: e.target.value,
                                })
                              }
                              style={{
                                width: "100%",
                                padding: "10px",
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                fontFamily: "inherit",
                              }}
                            >
                              <option value="">All</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>

                          <div>
                            <label
                              style={{
                                display: "block",
                                marginBottom: "6px",
                                fontWeight: "500",
                                fontSize: "14px",
                              }}
                            >
                              Send SMS to Qualified Residents
                            </label>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={formData.send_sms}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  send_sms: !formData.send_sms,
                                })
                              }
                              style={{
                                width: "100%",
                                padding: "10px 12px",
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                backgroundColor: formData.send_sms
                                  ? "#ecfdf5"
                                  : "#f9fafb",
                                color: formData.send_sms
                                  ? "#047857"
                                  : "#374151",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}
                            >
                              <span>
                                {formData.send_sms ? "Enabled" : "Disabled"}
                              </span>
                              <span
                                style={{
                                  width: "44px",
                                  height: "24px",
                                  borderRadius: "999px",
                                  backgroundColor: formData.send_sms
                                    ? "#10b981"
                                    : "#d1d5db",
                                  padding: "2px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: formData.send_sms
                                    ? "flex-end"
                                    : "flex-start",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <span
                                  style={{
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    backgroundColor: "#fff",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                  }}
                                />
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Picture (Optional)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "2px dashed #ddd",
                      borderRadius: "6px",
                      padding: "24px",
                      textAlign: "center",
                      cursor: "pointer",
                      backgroundColor: "#f9fafb",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        marginBottom: "4px",
                      }}
                    >
                      Click to upload image
                    </div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                      PNG, JPG up to 10MB
                    </div>
                    {formData.imageFile && (
                      <div
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          color: "#16a34a",
                          fontSize: "13px",
                        }}
                      >
                        <span>✓ {formData.imageFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, imageFile: null });
                          }}
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setFormData({
                          ...formData,
                          imageFile: e.target.files[0],
                        });
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                  marginTop: "24px",
                  paddingTop: "16px",
                  borderTop: "1px solid #eee",
                }}
              >
                <button
                  onClick={closeModal}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#fff",
                    color: "#333",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostAnnouncement}
                  disabled={
                    posting ||
                    (formData.category === "event" &&
                      (Boolean(dateErrors.start) || Boolean(dateErrors.end)))
                  }
                  style={{
                    padding: "10px 20px",
                    backgroundColor: posting ? "#ccc" : "#16a34a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: posting ? "not-allowed" : "pointer",
                    fontWeight: "500",
                  }}
                >
                  {posting
                    ? isEditMode
                      ? "Updating..."
                      : "Posting..."
                    : isEditMode
                      ? "Update Announcement"
                      : "Post Announcement"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {toast.show &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: "24px",
              right: "24px",
              zIndex: 2000,
              minWidth: "280px",
              maxWidth: "420px",
              backgroundColor: toast.type === "error" ? "#fef2f2" : "#ecfdf5",
              color: toast.type === "error" ? "#991b1b" : "#065f46",
              border: `1px solid ${toast.type === "error" ? "#fecaca" : "#a7f3d0"}`,
              borderRadius: "10px",
              padding: "12px 14px",
              boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
            role="status"
            aria-live="polite"
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>
              {toast.type === "error" ? "⚠️" : "✅"}
            </span>
            <div style={{ flex: 1, fontSize: "14px", fontWeight: 600 }}>
              {toast.message}
            </div>
            <button
              onClick={hideToast}
              aria-label="Close notification"
              style={{
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
            >
              <X size={16} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
