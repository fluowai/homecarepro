import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
const region = process.env.MINIO_REGION || "us-east-1"; // MinIO usually ignores this but SDK requires it
const accessKeyId = process.env.MINIO_ACCESS_KEY || "minioadmin";
const secretAccessKey = process.env.MINIO_SECRET_KEY || "minioadmin";
const bucketName = process.env.MINIO_BUCKET_NAME || "homecare-uploads";

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
  
  // Public URL logic: assumes bucket policy is set to public read for this prefix
  const publicUrl = `${endpoint}/${bucketName}/${fileName}`;

  return { uploadUrl, publicUrl };
};
