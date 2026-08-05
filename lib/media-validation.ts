/**
 * 画像アップロードの検証。
 * content-type は詐称できるため、マジックバイト (ファイル先頭のシグネチャ) で
 * 実体を確認する。
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // 8MB
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const
export type AllowedMime = (typeof ALLOWED_MIME)[number]

const EXTENSION_BY_MIME: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/** マジックバイトから実際の画像形式を判定する。判定できなければ null */
export function detectImageMime(bytes: Uint8Array): AllowedMime | null {
  if (bytes.length < 12) return null
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png"
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp"
  }
  // AVIF: ....ftypavif
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4) && startsWith(bytes, [0x61, 0x76, 0x69, 0x66], 8)) {
    return "image/avif"
  }
  return null
}

export function extensionFor(mime: AllowedMime): string {
  return EXTENSION_BY_MIME[mime]
}

export interface UploadValidation {
  ok: boolean
  error?: string
  mime?: AllowedMime
}

export function validateUpload(bytes: Uint8Array, declaredType: string, size: number): UploadValidation {
  if (size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `ファイルサイズは${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB以下にしてください` }
  }
  if (size === 0) return { ok: false, error: "空のファイルです" }

  const detected = detectImageMime(bytes)
  if (!detected) {
    return { ok: false, error: "JPEG / PNG / WebP / AVIF の画像のみアップロードできます" }
  }
  // 宣言されたtypeと実体が食い違う場合は実体を採用する (拡張子偽装対策)
  if (declaredType && !ALLOWED_MIME.includes(declaredType as AllowedMime)) {
    return { ok: false, error: "許可されていないファイル形式です" }
  }
  return { ok: true, mime: detected }
}

/** Supabase Storage の公開URLを組み立てる */
export function storagePublicUrl(storagePath: string, bucket = "place-images"): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  return `${base}/storage/v1/object/public/${bucket}/${storagePath}`
}
