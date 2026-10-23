package com.karasu256.karasulab.ui.auth

import androidx.annotation.StringRes
import com.karasu256.karasulab.data.ConnectionInfo

/** The two forms the auth screen switches between. */
enum class AuthMode {
    /** Signing in to an existing account. */
    SignIn,

    /** Creating a new account. */
    SignUp,
}

/** The ways a user can sign in or create an account. */
enum class AuthMethod {
    /** Email address and password of an existing account. */
    Email,

    /** Display name, email address and password of a new account. */
    SignUp,

    /** Native Google sign-in. */
    Google,

    /** Passkey through Credential Manager. */
    Passkey,
}

/**
 * State of the auth screen.
 *
 * @property mode the form currently shown.
 * @property name the display name typed so far, used when creating an account.
 * @property email the email address typed so far.
 * @property password the password typed so far.
 * @property busyMethod the method in progress, or null when idle.
 * @property errorMessage message describing the last failure, or null when there is none.
 * @property connection the hosts shown at the bottom of the screen and how reaching each stands, or null before they are known.
 */
data class AuthUiState(
    val mode: AuthMode = AuthMode.SignIn,
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val busyMethod: AuthMethod? = null,
    @param:StringRes val errorMessage: Int? = null,
    val connection: ConnectionInfo? = null,
) {
    /** Whether any method is in progress. */
    val isBusy: Boolean get() = busyMethod != null

    /** Whether the sign-in form has enough input to submit. */
    val canSubmitEmail: Boolean get() = email.isNotBlank() && password.isNotEmpty()

    /** Whether the account creation form has enough input to submit. */
    val canSubmitSignUp: Boolean get() = name.isNotBlank() && canSubmitEmail
}
