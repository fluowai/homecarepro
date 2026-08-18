import { useHomeCareStore } from '../store';

export async function uploadFileToMinio(file: File): Promise<string> {
  const token = useHomeCareStore.getState().token;
  if (!token) throw new Error("Não autenticado");

  // 1. Get presigned URL
  const res = await fetch("/api/upload/presigned-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Falha ao obter URL de upload");
  }

  const { uploadUrl, publicUrl } = await res.json();

  // 2. Upload file directly to MinIO
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Falha no upload para o storage");
  }

  return publicUrl;
}
