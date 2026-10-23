package com.karasu256.karasulab.data

import com.karasu256.karasulab.data.auth.SessionTokenExchanger
import com.karasu256.karasulab.data.local.SessionStore
import com.karasu256.karasulab.data.remote.AuthApi
import com.karasu256.karasulab.data.remote.EmailSignInRequest
import com.karasu256.karasulab.data.remote.EmailSignUpRequest
import com.karasu256.karasulab.data.remote.IdTokenPayload
import com.karasu256.karasulab.data.remote.PasskeyVerifyRequest
import com.karasu256.karasulab.data.remote.SessionCookie
import com.karasu256.karasulab.data.remote.SocialSignInRequest
import com.karasu256.karasulab.data.remote.setCookies
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import okhttp3.ResponseBody
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException

/**
 * Signs the user in and out through better-auth on api-auth.karasu256.com.
 *
 * Every sign-in method ends in the same workflow: the session cookie is exchanged for the custom token,
 * both are stored, and the profile is fetched from the API with that token and cached.
 */
@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val store: SessionStore,
    private val exchanger: SessionTokenExchanger,
    private val profileRepository: ProfileRepository,
    private val json: Json,
) {
    /** Emits whether a token is stored. */
    val isSignedIn: Flow<Boolean> = store.token.map { it != null }.distinctUntilChanged()

    /** Signs in with an email address and password. */
    suspend fun signInWithEmail(email: String, password: String): SignInResult =
        signIn { authApi.signInEmail(EmailSignInRequest(email = email, password = password)) }

    /** Creates an account with a display name, an email address and a password, and signs in to it. */
    suspend fun signUpWithEmail(name: String, email: String, password: String): SignInResult =
        signIn { authApi.signUpEmail(EmailSignUpRequest(name = name, email = email, password = password)) }

    /** Signs in with a Google ID token obtained through Credential Manager. */
    suspend fun signInWithGoogle(idToken: String): SignInResult =
        signIn { authApi.signInSocial(SocialSignInRequest(provider = GOOGLE_PROVIDER, idToken = IdTokenPayload(idToken))) }

    /** Requests a passkey challenge. Throws when api-auth.karasu256.com cannot issue one. */
    suspend fun requestPasskeyChallenge(): PasskeyChallenge {
        val response = authApi.generatePasskeyAuthenticateOptions()
        if (!response.isSuccessful) throw HttpException(response)
        val options = response.body()?.use { it.string() } ?: throw IllegalStateException("Empty passkey options")
        val cookieHeader = response.setCookies().joinToString("; ") { "${it.name}=${it.value}" }
        return PasskeyChallenge(optionsJson = options, cookieHeader = cookieHeader)
    }

    /** Signs in with the passkey assertion [responseJson] Credential Manager produced for [challenge]. */
    suspend fun signInWithPasskey(challenge: PasskeyChallenge, responseJson: String): SignInResult = signIn {
        authApi.verifyPasskeyAuthentication(
            cookie = challenge.cookieHeader,
            body = PasskeyVerifyRequest(json.parseToJsonElement(responseJson)),
        )
    }

    /** Revokes the session on a best-effort basis, then deletes the stored token and cached profile. */
    suspend fun signOut() {
        val current = store.currentToken()
        if (current != null) {
            try {
                authApi.signOut(SessionCookie(current.sessionCookieName, current.sessionCookieValue, current.sessionExpiresAtMs).toHeader())
                    .close()
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
            }
        }
        store.clear()
    }

    private suspend fun signIn(request: suspend () -> Response<ResponseBody>): SignInResult = try {
        val response = request()
        response.close()
        when {
            response.code() in INVALID_CREDENTIAL_CODES -> SignInResult.InvalidCredentials
            !response.isSuccessful -> SignInResult.Failed
            else -> SessionCookie.from(response)?.let { completeSignIn(it) } ?: SignInResult.Failed
        }
    } catch (e: CancellationException) {
        throw e
    } catch (_: IOException) {
        SignInResult.NetworkError
    } catch (_: Exception) {
        SignInResult.Failed
    }

    private suspend fun completeSignIn(cookie: SessionCookie): SignInResult {
        exchanger.exchange(cookie) ?: return SignInResult.Failed
        return try {
            profileRepository.refresh()
            SignInResult.Success
        } catch (e: Exception) {
            store.clear()
            throw e
        }
    }

    private fun Response<ResponseBody>.close() {
        body()?.close()
        errorBody()?.close()
    }

    private companion object {
        const val GOOGLE_PROVIDER = "google"
        val INVALID_CREDENTIAL_CODES = 400..403
    }
}
