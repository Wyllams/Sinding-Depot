import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "general"; // optional folder (e.g., 'profiles', 'jobs')

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a unique file name to avoid collisions
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("R2_BUCKET_NAME is not properly configured");
    }

    // Upload to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: file.type,
    });

    await r2.send(command);

    // Build the public URL (replace <seu_subdominio> locally then via ENV)
    const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!publicUrlBase || publicUrlBase.includes("<")) {
      console.warn("⚠️ NEXT_PUBLIC_R2_PUBLIC_URL is not configured. The returned URL is a placeholder.");
    }
    
    const fileUrl = `${publicUrlBase || "https://sua-url-r2-nao-configurada.com"}/${uniqueFileName}`;

    return NextResponse.json({ url: fileUrl, path: uniqueFileName });

  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
