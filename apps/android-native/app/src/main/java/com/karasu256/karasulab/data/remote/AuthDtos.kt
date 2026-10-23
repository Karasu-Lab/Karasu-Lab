package com.karasu256.karasulab.data.remote

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Body of better-auth's `POST /api/auth/sign-in/email`.
 *
 * @property email the account's email address.
 * @property password the account's password.
 */
@Serializable
data class EmailSignInRequest(
    val email: String,
    val password: String,
)

/**
 * Body of better-auth's `POST /api/auth/sign-up/email`.
 *
 * @property name the new account's display name.
 * @property email the new account's email address.
 * @property password the new account's password.
 */
@Serializable
data class EmailSignUpRequest(
    val name: String,
    val email: String,
    val password: String,
)

/**
 * Body of better-auth's `POST /api/auth/sign-in/social` when signing in with a provider-issued ID token.
 *
 * @property provider better-auth provider id, e.g. `google`.
 * @property idToken the ID token obtained natively from the provider.
 */
@Serializable
data class SocialSignInRequest(
    val provider: String,
    val idToken: IdTokenPayload,
)

/**
 * ID token part of [SocialSignInRequest].
 *
 * @property token the raw ID token.
 */
@Serializable
data class IdTokenPayload(
    val token: String,
)

/**
 * Body of better-auth's `POST /api/auth/passkey/verify-authentication`.
 *
 * @property response the WebAuthn authentication response produced by Credential Manager.
 */
@Serializable
data class PasskeyVerifyRequest(
    val response: JsonElement,
)

@Serializable
data class PasskeyRegisterRequest(
    val response: JsonElement,
    val name: String,
)

@Serializable
data class DeletePasskeyRequest(
    val id: String,
)

@Serializable
data class PasskeyResponse(
    val id: String,
    val name: String? = null,
    val createdAt: String? = null,
)

/**
 * The part of better-auth's `GET /api/auth/get-session` body the app reads. The body is `null` when the session is invalid.
 *
 * @property user the session's user.
 */
@Serializable
data class GetSessionResponse(
    val user: SessionUser,
)

/**
 * The user of a [GetSessionResponse].
 *
 * @property id the user's id.
 */
@Serializable
data class SessionUser(
    val id: String,
)

/**
 * Body of the API's `GET /meta`, which the API worker reports about itself.
 *
 * @property apiUrl the origin the API is served from.
 * @property gitBranch the git branch the API was built from.
 */
@Serializable
data class MetaResponse(
    val apiUrl: String,
    val gitBranch: String,
)

/**
 * Body of the API's `GET /user/profile`.
 *
 * @property id the user's id.
 * @property name display name, or null when unset.
 * @property image avatar URL, or null when unset.
 */
@Serializable
data class ProfileResponse(
    val id: String,
    val name: String? = null,
    val image: String? = null,
)
