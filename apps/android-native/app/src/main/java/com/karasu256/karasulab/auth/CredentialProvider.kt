package com.karasu256.karasulab.auth

/** Obtains credentials from the platform's native sign-in UI. */
interface CredentialProvider {
    /** Shows the native Google sign-in and returns the ID token, or null when the user cancels. */
    suspend fun requestGoogleIdToken(): String?

    /** Shows the native passkey picker for [requestJson] and returns the assertion JSON, or null when the user cancels. */
    suspend fun requestPasskeyAssertion(requestJson: String): String?

    suspend fun createPasskey(requestJson: String): String?
}
