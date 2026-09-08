import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// This URL is returned to the browser for the direct PUT. A localhost
// fallback only works inside the Docker network and creates unusable URLs.
const endpoint = process.env.MINIO_ENDPOINT || process.env.MINIO_PUBLIC_ENDPOINT || "https://mypanel.wootech.com.br";
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
