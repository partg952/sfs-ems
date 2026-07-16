/**
 * In-Memory TTL Cache Service
 * Provides caching with time-to-live for expensive database aggregations and AI model calls.
 */
class CacheService {
  constructor() {
    this.store = new Map()
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { value, expiresAt })
    return value
  }

  del(key) {
    return this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }

  async getOrCompute(key, ttlSeconds, computeFn) {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    const computed = await computeFn()
    this.set(key, computed, ttlSeconds)
    return computed
  }
}

export const cacheService = new CacheService()
