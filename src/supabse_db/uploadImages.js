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

    // 2. Create a unique filename to avoid conflicts
    const fileExt = file.name.split(".").pop(); // Get file extension (jpg, png, etc.)
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${type}/${rowId}/${fileName}`; // Store in 'images' folder inside the bucket

    // 3. Upload the file to the 'private' bucket in Supabase Storage
    const { data, error } = await supabase.storage
      .from("private") // Your bucket name
      .upload(filePath, file);

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
