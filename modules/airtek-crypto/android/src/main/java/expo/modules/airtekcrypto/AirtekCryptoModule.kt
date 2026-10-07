package expo.modules.airtekcrypto

import android.graphics.Bitmap
import android.media.MediaDataSource
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.CipherOutputStream
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

private const val AES_BLOCK_BYTES = 16
private const val BUFFER_BYTES = 64 * 1024
private const val CONNECT_TIMEOUT_MS = 10_000
private const val READ_TIMEOUT_MS = 15_000
private const val THUMBNAIL_WIDTH = 640
private const val THUMBNAIL_QUALITY = 82

class InvalidCryptoMaterialException(name: String) :
  CodedException("ERR_INVALID_CRYPTO_MATERIAL", "$name must be $AES_BLOCK_BYTES bytes in hex", null)

class UnsupportedSourceException(protocol: String) :
  CodedException("ERR_UNSUPPORTED_SOURCE", "Only http and https sources are allowed, got $protocol", null)

class SegmentHttpException(status: Int) :
  CodedException("ERR_SEGMENT_HTTP", "HTTP $status", null)

class SegmentTruncatedException(expected: Long, received: Long) :
  CodedException("ERR_SEGMENT_TRUNCATED", "unexpected end of stream ($received of $expected bytes)", null)

class AirtekCryptoModule : Module() {
  private val random = SecureRandom()

  override fun definition() = ModuleDefinition {
    Name("AirtekCrypto")

    Function("randomBytesHex") { size: Int ->
      val bytes = ByteArray(size)
      random.nextBytes(bytes)
      bytes.toHex()
    }

    AsyncFunction("downloadEncryptedAsync") Coroutine { url: String, destination: String, keyHex: String, ivHex: String ->
      withContext(Dispatchers.IO) {
        downloadEncrypted(url, destination, keyHex, ivHex)
      }
    }

    AsyncFunction("createThumbnailAsync") Coroutine { source: String, sourceKeyHex: String?, sourceIvHex: String?, destination: String, keyHex: String?, ivHex: String? ->
      withContext(Dispatchers.IO) {
        createThumbnail(source, sourceKeyHex, sourceIvHex, destination, keyHex, ivHex)
      }
    }

    AsyncFunction("decryptToBase64Async") Coroutine { source: String, keyHex: String, ivHex: String ->
      withContext(Dispatchers.IO) {
        val bytes = cipher(Cipher.DECRYPT_MODE, keyHex, ivHex).doFinal(fileFor(source).readBytes())
        Base64.encodeToString(bytes, Base64.NO_WRAP)
      }
    }
  }

  private fun createThumbnail(
    source: String,
    sourceKeyHex: String?,
    sourceIvHex: String?,
    destination: String,
    keyHex: String?,
    ivHex: String?
  ): Boolean {
    val encrypted = fileFor(source).readBytes()
    val media = if (sourceKeyHex != null && sourceIvHex != null) {
      cipher(Cipher.DECRYPT_MODE, sourceKeyHex, sourceIvHex).doFinal(encrypted)
    } else {
      encrypted
    }

    val frame = MediaMetadataRetriever().run {
      try {
        setDataSource(ByteArrayMediaSource(media))
        val durationUs = (extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull() ?: 0L) * 1000
        getFrameAtTime(durationUs / 2, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
          ?: getFrameAtTime(-1)
      } catch (error: Exception) {
        null
      } finally {
        runCatching { release() }
      }
    } ?: return false

    val scaled = if (frame.width > THUMBNAIL_WIDTH) {
      Bitmap.createScaledBitmap(frame, THUMBNAIL_WIDTH, frame.height * THUMBNAIL_WIDTH / frame.width, true)
    } else {
      frame
    }
    val jpeg = ByteArrayOutputStream().use { output ->
      scaled.compress(Bitmap.CompressFormat.JPEG, THUMBNAIL_QUALITY, output)
      output.toByteArray()
    }
    if (scaled !== frame) scaled.recycle()
    frame.recycle()

    val output = if (keyHex != null && ivHex != null) cipher(Cipher.ENCRYPT_MODE, keyHex, ivHex).doFinal(jpeg) else jpeg
    val target = fileFor(destination)
    val partial = File(target.parentFile, "${target.name}.part")
    partial.writeBytes(output)
    if (moveIntoPlace(partial, target)) return true
    partial.delete()
    return false
  }

  private fun moveIntoPlace(partial: File, target: File): Boolean {
    if (partial.renameTo(target)) return true
    target.delete()
    return partial.renameTo(target)
  }

  private fun cipher(mode: Int, keyHex: String, ivHex: String): Cipher {
    val key = keyHex.hexToBytes()?.takeIf { it.size == AES_BLOCK_BYTES } ?: throw InvalidCryptoMaterialException("key")
    val iv = ivHex.hexToBytes()?.takeIf { it.size == AES_BLOCK_BYTES } ?: throw InvalidCryptoMaterialException("iv")
    return Cipher.getInstance("AES/CBC/PKCS5Padding").apply {
      init(mode, SecretKeySpec(key, "AES"), IvParameterSpec(iv))
    }
  }

  private fun fileFor(uri: String) = File(requireNotNull(Uri.parse(uri).path))

  private fun downloadEncrypted(url: String, destination: String, keyHex: String, ivHex: String): Double {
    val cipher = cipher(Cipher.ENCRYPT_MODE, keyHex, ivHex)
    val target = fileFor(destination)
    val partial = File(target.parentFile, "${target.name}.part")
    val source = URL(url)
    if (source.protocol != "http" && source.protocol != "https") throw UnsupportedSourceException(source.protocol)
    val connection = (source.openConnection() as HttpURLConnection).apply {
      connectTimeout = CONNECT_TIMEOUT_MS
      readTimeout = READ_TIMEOUT_MS
      setRequestProperty("Cache-Control", "no-cache")
    }

    try {
      val status = connection.responseCode
      if (status !in 200..299) throw SegmentHttpException(status)

      var received = 0L
      connection.inputStream.use { input ->
        CipherOutputStream(partial.outputStream().buffered(BUFFER_BYTES), cipher).use { output ->
          val buffer = ByteArray(BUFFER_BYTES)
          while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            output.write(buffer, 0, read)
            received += read
          }
        }
      }

      val expected = connection.contentLengthLong
      if (expected >= 0 && received != expected) throw SegmentTruncatedException(expected, received)
      if (!moveIntoPlace(partial, target)) throw IllegalStateException("Cannot move encrypted segment into place")
      return received.toDouble()
    } catch (error: Throwable) {
      partial.delete()
      throw error
    } finally {
      connection.disconnect()
    }
  }
}

private class ByteArrayMediaSource(private val data: ByteArray) : MediaDataSource() {
  override fun readAt(position: Long, buffer: ByteArray, offset: Int, size: Int): Int {
    if (position >= data.size) return -1
    val length = minOf(size.toLong(), data.size - position).toInt()
    System.arraycopy(data, position.toInt(), buffer, offset, length)
    return length
  }

  override fun getSize(): Long = data.size.toLong()

  override fun close() = Unit
}

private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }

private fun String.hexToBytes(): ByteArray? {
  if (length % 2 != 0) return null
  val bytes = ByteArray(length / 2)
  for (index in bytes.indices) {
    val high = Character.digit(this[index * 2], 16)
    val low = Character.digit(this[index * 2 + 1], 16)
    if (high < 0 || low < 0) return null
    bytes[index] = ((high shl 4) or low).toByte()
  }
  return bytes
}
