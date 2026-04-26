import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    // Step 1: Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseErr: any) {
      console.error("Upload: Failed to parse formData:", parseErr.message);
      return NextResponse.json(
        { error: `Failed to parse upload data: ${parseErr.message}` },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`Upload: Received file "${file.name}", type="${file.type}", size=${file.size}, folder="${folder}"`);

    // Step 2: Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 3: Determine file extension
    let fileExtension = file.name?.split(".").pop();
    if (!fileExtension || fileExtension === file.name) {
      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
        "image/heif": "heif",
        "image/gif": "gif",
      };
      fileExtension = mimeToExt[file.type] || "jpg";
    }

    const uniqueFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

    // Step 4: Validate R2 configuration
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      console.error("Upload: R2_BUCKET_NAME is not configured");
      return NextResponse.json(
        { error: "Storage not configured (missing bucket)" },
        { status: 500 }
      );
    }

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
      console.error("Upload: R2 credentials are missing", {
        hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
        hasEndpoint: !!process.env.R2_ENDPOINT,
      });
      return NextResponse.json(
        { error: "Storage not configured (missing credentials)" },
        { status: 500 }
      );
    }

    // Step 5: Upload to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    });

    try {
      await r2.send(command);
    } catch (r2Err: any) {
      console.error("Upload: R2 upload failed:", r2Err.message, r2Err.Code, r2Err.$metadata);
      return NextResponse.json(
        { error: `Storage upload failed: ${r2Err.message}` },
        { status: 502 }
      );
    }

    console.log(`Upload: Success -> ${uniqueFileName}`);

    // Step 6: Build the public URL
    const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!publicUrlBase || publicUrlBase.includes("<")) {
      console.warn("Upload: NEXT_PUBLIC_R2_PUBLIC_URL is not configured properly.");
    }

    const fileUrl = `${publicUrlBase || "https://storage-not-configured.example.com"}/${uniqueFileName}`;

    return NextResponse.json({ url: fileUrl, path: uniqueFileName });
  } catch (error: any) {
    console.error("Upload: Unexpected error:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
