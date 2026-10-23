package com.karasu256.karasulab.data

import com.karasu256.karasulab.auth.CredentialProvider
import com.karasu256.karasulab.data.local.SessionStore
import com.karasu256.karasulab.data.remote.AuthApi
import com.karasu256.karasulab.data.remote.DeletePasskeyRequest
import com.karasu256.karasulab.data.remote.PasskeyRegisterRequest
import com.karasu256.karasulab.data.remote.SessionCookie
import com.karasu256.karasulab.data.remote.setCookies
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PasskeyRepository @Inject constructor(
    private val authApi: AuthApi,
    private val store: SessionStore,
    private val json: Json,
) {
    suspend fun list(): List<Passkey> = authApi.listPasskeys(sessionCookie()).map {
        Passkey(id = it.id, name = it.name, createdOn = it.createdAt?.take(DATE_LENGTH))
    }

    /**
     * Registers a passkey named [name]; returns false when the user cancels.
     *
     * better-auth reads the challenge from a cookie set while generating the options, so verification sends it together with the session cookie.
     */
    suspend fun register(name: String, credentials: CredentialProvider): Boolean {
        val session = sessionCookie()
        val options = authApi.generatePasskeyRegisterOptions(session, name)
        if (!options.isSuccessful) throw HttpException(options)
        val optionsJson = options.body()?.use { it.string() } ?: throw IllegalStateException("Empty passkey options")
        val challenge = options.setCookies().joinToString("; ") { "${it.name}=${it.value}" }
        val registration = credentials.createPasskey(optionsJson) ?: return false
        val verification = authApi.verifyPasskeyRegistration(
            cookie = "$session; $challenge",
            body = PasskeyRegisterRequest(response = json.parseToJsonElement(registration), name = name),
        )
        verification.body()?.close()
        verification.errorBody()?.close()
        if (!verification.isSuccessful) throw HttpException(verification)
        return true
    }

    suspend fun delete(id: String) {
        val response = authApi.deletePasskey(sessionCookie(), DeletePasskeyRequest(id))
        response.body()?.close()
        response.errorBody()?.close()
        if (!response.isSuccessful) throw HttpException(response)
    }

    private suspend fun sessionCookie(): String {
        val token = store.currentToken() ?: throw IllegalStateException("Not signed in")
        return SessionCookie(token.sessionCookieName, token.sessionCookieValue, token.sessionExpiresAtMs).toHeader()
    }

    private companion object {
        const val DATE_LENGTH = 10
    }
}
