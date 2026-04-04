import supabase from "./supabase_client";

/**
 * Upload an image to Supabase Storage
 * @param {File} file - The image file from an input element
 * @returns {Object} - Result object with success status and file path or error
 */
export const uploadAnImage = async (file, type, rowId) => {
  try {
    // 1. Validate that a file was provided
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // 2. Use the incoming filename so callers can control bucket naming.
    const fileName = String(file.name || "upload.jpg")
      .trim()
      .replace(/[\\/]/g, "_");
    const filePath = `${type}/${rowId}/${fileName}`; // Store in 'images' folder inside the bucket

    // 3. Upload the file to the 'private' bucket in Supabase Storage
    const { data, error } = await supabase.storage
      .from("private") // Your bucket name
      .upload(filePath, file, { upsert: true });

    // 4. Check if there was an error during upload
    if (error) {
      throw error;
    }

    // 5. Return success with the file path
    // You can use this path later to retrieve or delete the file
    return {
      success: true,
      path: data.path,
      fullPath: data.fullPath,
      message: "Image uploaded successfully!",
    };
  } catch (error) {
    // Log the error and return a user-friendly message
    console.error("Error uploading image:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Upload an image specifically for an announcement to Supabase Storage
 * @param {File} file - The image file from an input element
 * @param {string} announcementID - The ID of the announcement
 * @returns {Object} - Result object with success status and file path or error
 */
export const uploadAnnouncementImage = async (file, announcementID) => {
  try {
    // 1. Validate that a file was provided
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // 2. Validate file type - only PNG and JPEG
    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Only PNG and JPEG images are allowed" };
    }

    // 3. Create a unique filename to avoid conflicts
    const fileExt = file.name.split(".").pop().toLowerCase();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `announcement/${announcementID}/${fileName}`;

    // 4. Upload the file to the 'private' bucket in Supabase Storage
    const { data, error } = await supabase.storage
      .from("private")
      .upload(filePath, file);

    // 5. Check if there was an error during upload
    if (error) {
      throw error;
    }

    // 6. Return success with the file path
    return {
      success: true,
      path: data.path,
      fullPath: data.fullPath,
      message: "Announcement image uploaded successfully!",
    };
  } catch (error) {
    console.error("Error uploading announcement image:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch all images for an announcement from Supabase Storage
 * @param {string} announcementID - ID of the announcement
 * @returns {Object} - Result object with success status and array of image URLs or error
 */
export const fetchAnnouncementImages = async (announcementID) => {
  try {
    if (!announcementID) {
      return { success: false, error: "Announcement ID is required" };
    }

    // List all files in the folder: announcement/{announcementID}/
    const folderPath = `announcement/${announcementID}`;
    const { data, error } = await supabase.storage
      .from("private")
      .list(folderPath);

    if (error) {
      throw error;
    }

    // Filter for PNG and JPEG only
    const allowedExtensions = ["png", "jpg", "jpeg"];
    const images = [];

    if (data && data.length > 0) {
      for (const file of data) {
        const fileExt = file.name.split(".").pop().toLowerCase();
        if (allowedExtensions.includes(fileExt)) {
          // Get signed URL for the image (valid for 1 hour)
          const filePath = `${folderPath}/${file.name}`;
          const { data: signedUrlData, error: urlError } =
            await supabase.storage
              .from("private")
              .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour

          if (urlError) {
            console.error(
              `Error creating signed URL for ${filePath}:`,
              urlError,
            );
            continue;
          }

          images.push({
            name: file.name,
            url: signedUrlData.signedUrl,
            path: filePath,
          });
        }
      }
    }

    return {
      success: true,
      images: images,
      count: images.length,
    };
  } catch (error) {
    console.error("Error fetching announcement images:", error);
    return {
      success: false,
      error: error.message,
      images: [],
    };
  }
};

/**
 * Fetch all images for a request or complaint from Supabase Storage
 * @param {string} type - Type of item: 'request' or 'complaint'
 * @param {string} rowId - ID of the request or complaint
 * @returns {Object} - Result object with success status and array of image URLs or error
 */
export const fetchImagesForItem = async (type, rowId) => {
  try {
    if (!type || !rowId) {
      return { success: false, error: "Type and rowId are required" };
    }

    // List all files in the folder: private/request/{rowId}/ or private/complaint/{rowId}/
    const folderPath = `${type}/${rowId}`;
    const { data, error } = await supabase.storage
      .from("private")
      .list(folderPath);

    if (error) {
      throw error;
    }

    // Filter out non-image files and get public URLs
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const images = [];

    if (data && data.length > 0) {
      for (const file of data) {
        // Check if file is an image
        const fileExt = file.name.split(".").pop().toLowerCase();
        if (imageExtensions.includes(fileExt)) {
          // Get signed URL for the image (valid for 1 hour)
          const filePath = `${folderPath}/${file.name}`;
          const { data: signedUrlData, error: urlError } =
            await supabase.storage
              .from("private")
              .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour

          if (urlError) {
            console.error(
              `Error creating signed URL for ${filePath}:`,
              urlError,
            );
            continue; // Skip this image if URL generation fails
          }

          images.push({
            name: file.name,
            url: signedUrlData.signedUrl,
            path: filePath,
          });
        }
      }
    }

    return {
      success: true,
      images: images,
      count: images.length,
    };
  } catch (error) {
    console.error("Error fetching images:", error);
    return {
      success: false,
      error: error.message,
      images: [],
    };
  }
};
