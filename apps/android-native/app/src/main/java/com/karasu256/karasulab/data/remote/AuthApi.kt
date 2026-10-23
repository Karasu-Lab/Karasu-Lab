package com.karasu256.karasulab.data.remote

import kotlinx.serialization.json.JsonObject
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query

/** better-auth endpoints served by api-auth.karasu256.com under `/api/auth`. */
interface AuthApi {
    /** Signs in with an email address and password; the session cookie comes back in `Set-Cookie`. */
    @POST("api/auth/sign-in/email")
    suspend fun signInEmail(@Body body: EmailSignInRequest): Response<ResponseBody>

    /** Creates an account with an email address and password; the session cookie comes back in `Set-Cookie`. */
    @POST("api/auth/sign-up/email")
    suspend fun signUpEmail(@Body body: EmailSignUpRequest): Response<ResponseBody>

    /** Signs in with a natively obtained provider ID token; the session cookie comes back in `Set-Cookie`. */
    @POST("api/auth/sign-in/social")
    suspend fun signInSocial(@Body body: SocialSignInRequest): Response<ResponseBody>

    /** Returns WebAuthn request options for signing in, setting the challenge cookie in `Set-Cookie`. */
    @GET("api/auth/passkey/generate-authenticate-options")
    suspend fun generatePasskeyAuthenticateOptions(): Response<ResponseBody>

    /** Verifies a passkey assertion against the challenge carried by [cookie]; the session cookie comes back in `Set-Cookie`. */
    @POST("api/auth/passkey/verify-authentication")
    suspend fun verifyPasskeyAuthentication(
        @Header("Cookie") cookie: String,
        @Body body: PasskeyVerifyRequest,
    ): Response<ResponseBody>

    @GET("api/auth/passkey/generate-register-options")
    suspend fun generatePasskeyRegisterOptions(
        @Header("Cookie") cookie: String,
        @Query("name") name: String,
    ): Response<ResponseBody>

    @POST("api/auth/passkey/verify-registration")
    suspend fun verifyPasskeyRegistration(
        @Header("Cookie") cookie: String,
        @Body body: PasskeyRegisterRequest,
    ): Response<ResponseBody>

    @GET("api/auth/passkey/list-user-passkeys")
    suspend fun listPasskeys(@Header("Cookie") cookie: String): List<PasskeyResponse>

    @POST("api/auth/passkey/delete-passkey")
    suspend fun deletePasskey(
        @Header("Cookie") cookie: String,
        @Body body: DeletePasskeyRequest,
    ): Response<ResponseBody>

    @GET("api/auth/ok")
    suspend fun ok()

    /** Returns the session for [cookie], with the custom token in the `set-auth-jwt` header. */
    @GET("api/auth/get-session")
    suspend fun getSession(@Header("Cookie") cookie: String): Response<ResponseBody>

    /** Revokes the session carried by [cookie]. */
    @POST("api/auth/sign-out")
    suspend fun signOut(
        @Header("Cookie") cookie: String,
        @Body body: JsonObject = JsonObject(emptyMap()),
    ): Response<ResponseBody>
}
