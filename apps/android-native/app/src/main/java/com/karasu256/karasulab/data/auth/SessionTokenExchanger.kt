package com.karasu256.karasulab.data.auth

import com.karasu256.karasulab.data.local.AuthTokenEntity
import com.karasu256.karasulab.data.local.SessionStore
import com.karasu256.karasulab.data.remote.AuthApi
import com.karasu256.karasulab.data.remote.GetSessionResponse
import com.karasu256.karasulab.data.remote.SessionCookie
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Exchanges a better-auth session for the custom token the API accepts, the same way the web apps do:
 * `get-session` returns the token in its `set-auth-jwt` response header.
 */
@Singleton
class SessionTokenExchanger @Inject constructor(
    private val authApi: AuthApi,
    private val store: SessionStore,
    private val jwtExpiry: JwtExpiry,
    private val json: Json,
) {
    private val mutex = Mutex()

    /**
     * Exchanges [cookie] for a custom token and stores both.
     *
     * @return the stored token, or null when the session is no longer valid.
     * @throws HttpException when api-auth.karasu256.com fails for any other reason.
     */
    suspend fun exchange(cookie: SessionCookie): AuthTokenEntity? {
        val response = authApi.getSession(cookie.toHeader())
        if (response.code() in INVALID_SESSION_CODES) {
            response.errorBody()?.close()
            return null
        }
        if (!response.isSuccessful) throw HttpException(response)
        val body = response.body()?.use { it.string() } ?: return null
        json.decodeFromString<GetSessionResponse?>(body) ?: return null
        val customToken = response.headers()[SET_AUTH_JWT_HEADER] ?: return null
        val renewed = SessionCookie.from(response) ?: cookie
        val token = AuthTokenEntity(
            sessionCookieName = renewed.name,
            sessionCookieValue = renewed.value,
            sessionExpiresAtMs = renewed.expiresAtMillis,
            customToken = customToken,
            customTokenExpiresAtMs = jwtExpiry.expiresAtMillis(customToken) ?: 0L,
        )
        store.saveToken(token)
        return token
    }

    /** Returns a custom token that has not expired yet, re-exchanging the stored session when needed, or null while signed out. */
    suspend fun validToken(): String? {
        val current = store.currentToken() ?: return null
        if (current.customTokenExpiresAtMs - EXPIRY_MARGIN_MS > System.currentTimeMillis()) return current.customToken
        return reexchange(current.customToken)
    }

    /**
     * Re-exchanges the stored session for a new custom token, clearing the store when the session has ended.
     *
     * @param staleToken the token the caller found unusable; when another caller already replaced it, that newer token is returned as is.
     * @return the new custom token, or null when signed out.
     */
    suspend fun reexchange(staleToken: String?): String? = mutex.withLock {
        val current = store.currentToken() ?: return@withLock null
        if (staleToken != null && current.customToken != staleToken) return@withLock current.customToken
        val cookie = SessionCookie(current.sessionCookieName, current.sessionCookieValue, current.sessionExpiresAtMs)
        val refreshed = exchange(cookie)
        if (refreshed == null) store.clear()
        refreshed?.customToken
    }

    private companion object {
        const val SET_AUTH_JWT_HEADER = "set-auth-jwt"
        const val EXPIRY_MARGIN_MS = 30_000L
        val INVALID_SESSION_CODES = 401..403
    }
}
