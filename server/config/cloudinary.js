/**
 * Cloudinary config for event image uploads.
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.
 */
const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

function isConfigured() {
  return Boolean(cloudName && apiKey && apiSecret);
}

if (isConfigured()) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

/**
 * Upload an event image from a base64 data URI or raw base64 string.
 * @param {string} image - Base64 string (with or without data URI prefix)
 * @param {string} [contentType] - 'image/png' or 'image/jpeg' (used if image has no data URI prefix)
 * @returns {Promise<{ url: string }>} - The secure URL of the uploaded image
 */
async function uploadEventImage(image, contentType = 'image/jpeg') {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }
  const dataUri = image.startsWith('data:') ? image : `data:${contentType};base64,${image}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'event-images',
    resource_type: 'image',
  });
  return { url: result.secure_url };
}

module.exports = {
  isConfigured,
  uploadEventImage,
};
