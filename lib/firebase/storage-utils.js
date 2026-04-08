import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"

/**
 * Upload a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The storage path (e.g., 'plots', 'vehicles', 'users')
 * @param {string} userId - The user ID
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<string>} - The download URL
 */
export const uploadFile = async (file, path, userId, progressCallback = null) => {
  try {
    if (!file) {
      throw new Error("No file provided")
    }

    const storage = getStorage()
    const fileExtension = file.name.split(".").pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    const storagePath = `${path}/${userId}/${fileName}`
    const storageRef = ref(storage, storagePath)

    const uploadTask = uploadBytesResumable(storageRef, file)

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (progressCallback) {
            progressCallback(progress)
          }
        },
        (error) => {
          console.error("Upload error:", error)
          reject(error)
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            resolve({
              url: downloadURL,
              path: storagePath,
              name: file.name,
              type: file.type,
              size: file.size,
            })
          } catch (error) {
            console.error("Error getting download URL:", error)
            reject(error)
          }
        },
      )
    })
  } catch (error) {
    console.error("Error in uploadFile:", error)
    throw error
  }
}

/**
 * Upload multiple files to Firebase Storage
 * @param {File[]} files - Array of files to upload
 * @param {string} path - The storage path
 * @param {string} userId - The user ID
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<Array>} - Array of download URLs and file metadata
 */
export const uploadMultipleFiles = async (files, path, userId, progressCallback = null) => {
  try {
    if (!files || files.length === 0) {
      return []
    }

    const uploadPromises = Array.from(files).map((file, index) => {
      return uploadFile(file, path, userId, (progress) => {
        if (progressCallback) {
          // Calculate overall progress
          const individualProgress = progress / files.length
          const baseProgress = (index / files.length) * 100
          progressCallback(baseProgress + individualProgress)
        }
      })
    })

    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error("Error in uploadMultipleFiles:", error)
    throw error
  }
}

/**
 * Delete a file from Firebase Storage
 * @param {string} storagePath - The full storage path of the file
 * @returns {Promise<void>}
 */
export const deleteFile = async (storagePath) => {
  try {
    if (!storagePath) {
      throw new Error("No storage path provided")
    }

    const storage = getStorage()
    const fileRef = ref(storage, storagePath)

    await deleteObject(fileRef)
    return { success: true }
  } catch (error) {
    console.error("Error deleting file:", error)
    throw error
  }
}

/**
 * Delete multiple files from Firebase Storage
 * @param {string[]} storagePaths - Array of storage paths
 * @returns {Promise<void>}
 */
export const deleteMultipleFiles = async (storagePaths) => {
  try {
    if (!storagePaths || storagePaths.length === 0) {
      return { success: true }
    }

    const deletePromises = storagePaths.map((path) => deleteFile(path))
    await Promise.all(deletePromises)

    return { success: true }
  } catch (error) {
    console.error("Error in deleteMultipleFiles:", error)
    throw error
  }
}

/**
 * Get file metadata from a URL
 * @param {string} url - The download URL
 * @returns {Promise<object>} - The file metadata
 */
export const getFileMetadata = async (url) => {
  try {
    if (!url) {
      throw new Error("No URL provided")
    }

    const storage = getStorage()
    const fileRef = ref(storage, url)

    const metadata = await fileRef.getMetadata()
    return metadata
  } catch (error) {
    console.error("Error getting file metadata:", error)
    throw error
  }
}

/**
 * Extract file extension from a file name
 * @param {string} fileName - The file name
 * @returns {string} - The file extension
 */
export const getFileExtension = (fileName) => {
  return fileName.split(".").pop().toLowerCase()
}

/**
 * Check if a file is an image
 * @param {string} fileName - The file name
 * @returns {boolean} - True if the file is an image
 */
export const isImageFile = (fileName) => {
  const extension = getFileExtension(fileName)
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"]
  return imageExtensions.includes(extension)
}

/**
 * Check if a file is a document
 * @param {string} fileName - The file name
 * @returns {boolean} - True if the file is a document
 */
export const isDocumentFile = (fileName) => {
  const extension = getFileExtension(fileName)
  const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"]
  return documentExtensions.includes(extension)
}

/**
 * Format file size to human-readable format
 * @param {number} bytes - The file size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
