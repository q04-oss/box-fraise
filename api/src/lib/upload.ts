import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const MAX_BASE64_BYTES = 20 * 1024 * 1024; // 20 MB base64 ≈ 15 MB binary

export async function uploadMedia(base64Data: string, resourceType: 'image' | 'video'): Promise<string> {
  if (!base64Data || typeof base64Data !== 'string') throw new Error('invalid_payload');
  if (Buffer.byteLength(base64Data, 'utf8') > MAX_BASE64_BYTES) throw new Error('payload_too_large');
  const dataUri = `data:${resourceType === 'video' ? 'video/mp4' : 'image/jpeg'};base64,${base64Data}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: resourceType,
    folder: 'box-fraise',
  });
  return result.secure_url;
}
