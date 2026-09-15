import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// The endpoint must be reachable by the browser because the upload uses a
// presigned PUT URL. Keep credentials server-side only.
const endpoint = (process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || "https://storage.wootech.com.br").replace(/\/$/, "");
const region = process.env.MINIO_REGION || "us-east-1"; // MinIO usually ignores this but SDK requires it
const accessKeyId = process.env.MINIO_ACCESS_KEY || "";
const secretAccessKey = process.env.MINIO_SECRET_KEY || "";
const bucketName = process.env.MINIO_BUCKET_NAME || "homecare-uploads";

if (!accessKeyId || !secretAccessKey) {
  console.warn("[MinIO] MINIO_ACCESS_KEY/MINIO_SECRET_KEY are not configured; uploads will fail until configured.");
}

export const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Required for MinIO
});

export const getUploadPresignedUrl = async (fileName: string, mimeType: string) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: mimeType,
  });

  // URL expires in 15 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  
  // The bucket/prefix must allow public read, or this can be replaced by a
  // download presigned URL without exposing objects publicly.
  const publicUrl = `${endpoint}/${bucketName}/${fileName}`;

  return { uploadUrl, publicUrl };
};

export const uploadBuffer = async (fileName: string, buffer: Buffer, mimeType: string) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  
  return `${endpoint}/${bucketName}/${fileName}`;
};
