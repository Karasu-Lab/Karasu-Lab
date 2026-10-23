package com.karasu256.karasulab.data

/** Outcome of a sign-in attempt. */
sealed interface SignInResult {
    /** The user is signed in, with the token stored and the profile cached. */
    data object Success : SignInResult

    /** api-auth.karasu256.com rejected the credentials. */
    data object InvalidCredentials : SignInResult

    /** A server could not be reached. */
    data object NetworkError : SignInResult

    /** Sign-in failed for any other reason. */
    data object Failed : SignInResult
}

/**
 * A passkey challenge issued by api-auth.karasu256.com.
 *
 * @property optionsJson WebAuthn request options to hand to Credential Manager.
 * @property cookieHeader `Cookie` header value carrying the challenge, to send back with the assertion.
 */
data class PasskeyChallenge(
    val optionsJson: String,
    val cookieHeader: String,
)
