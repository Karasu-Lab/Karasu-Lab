package com.karasu256.karasulab.auth

import android.app.Activity
import android.util.Log
import androidx.credentials.Credential
import androidx.credentials.CredentialManager
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.CredentialOption
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.karasu256.karasulab.BuildConfig

/**
 * [CredentialProvider] backed by Credential Manager. It needs an [Activity] to show its UI,
 * so it is created by the screen rather than injected into a ViewModel.
 */
class CredentialAuthenticator(private val activity: Activity) : CredentialProvider {
    private val credentialManager = CredentialManager.create(activity)

    override suspend fun requestGoogleIdToken(): String? {
        val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_SERVER_CLIENT_ID).build()
        val credential = request(option) ?: return null
        check(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            "Unexpected credential type: ${credential.type}"
        }
        return GoogleIdTokenCredential.createFrom(credential.data).idToken
    }

    override suspend fun requestPasskeyAssertion(requestJson: String): String? {
        val credential = request(GetPublicKeyCredentialOption(requestJson)) ?: return null
        check(credential is PublicKeyCredential) { "Unexpected credential type: ${credential.type}" }
        return credential.authenticationResponseJson
    }

    override suspend fun createPasskey(requestJson: String): String? = try {
        val response = credentialManager.createCredential(activity, CreatePublicKeyCredentialRequest(requestJson))
        check(response is CreatePublicKeyCredentialResponse) { "Unexpected credential response: ${response.type}" }
        response.registrationResponseJson
    } catch (e: CreateCredentialCancellationException) {
        Log.w(TAG, e.type, e)
        null
    } catch (e: CreateCredentialException) {
        Log.e(TAG, e.type, e)
        throw e
    }

    /**
     * Returns the credential the user picked, or null when the request was cancelled. Providers
     * such as Google Play services also report their own failures as cancellations, so every
     * failure is logged with its type and message before being handled.
     */
    private suspend fun request(option: CredentialOption): Credential? = try {
        credentialManager.getCredential(activity, GetCredentialRequest(listOf(option))).credential
    } catch (e: GetCredentialCancellationException) {
        Log.w(TAG, e.type, e)
        null
    } catch (e: GetCredentialException) {
        Log.e(TAG, e.type, e)
        throw e
    }

    private companion object {
        const val TAG = "CredentialAuthenticator"
    }
}
