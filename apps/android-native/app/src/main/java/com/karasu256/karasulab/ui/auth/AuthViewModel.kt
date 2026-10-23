package com.karasu256.karasulab.ui.auth

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.karasu256.karasulab.R
import com.karasu256.karasulab.auth.CredentialProvider
import com.karasu256.karasulab.data.AuthRepository
import com.karasu256.karasulab.data.ConnectionRepository
import com.karasu256.karasulab.data.SignInResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

/** Drives the auth screen: holds its input and runs each sign-in or account creation method through [AuthRepository]. */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    connectionRepository: ConnectionRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AuthUiState())

    /** Current state of the screen. */
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _signedIn = Channel<Unit>(Channel.BUFFERED)

    /** Emits once each time sign-in or account creation completes. */
    val signedIn: Flow<Unit> = _signedIn.receiveAsFlow()

    init {
        viewModelScope.launch {
            connectionRepository.observe().collect { info ->
                _uiState.update { it.copy(connection = info) }
            }
        }
    }

    /** Switches between the sign-in and account creation forms, keeping what was typed. */
    fun onModeChange(mode: AuthMode) {
        if (_uiState.value.isBusy) return
        _uiState.update { it.copy(mode = mode, errorMessage = null) }
    }

    /** Updates the typed display name. */
    fun onNameChange(name: String) {
        _uiState.update { it.copy(name = name, errorMessage = null) }
    }

    /** Updates the typed email address. */
    fun onEmailChange(email: String) {
        _uiState.update { it.copy(email = email, errorMessage = null) }
    }

    /** Updates the typed password. */
    fun onPasswordChange(password: String) {
        _uiState.update { it.copy(password = password, errorMessage = null) }
    }

    /** Signs in with the typed email address and password. */
    fun signInWithEmail() {
        val state = _uiState.value
        if (!state.canSubmitEmail) return
        run(AuthMethod.Email) { authRepository.signInWithEmail(state.email.trim(), state.password) }
    }

    /** Creates an account with the typed display name, email address and password. */
    fun signUpWithEmail() {
        val state = _uiState.value
        if (!state.canSubmitSignUp) return
        run(AuthMethod.SignUp) { authRepository.signUpWithEmail(state.name.trim(), state.email.trim(), state.password) }
    }

    /** Signs in with an ID token from the native Google sign-in shown by [credentials]. */
    fun signInWithGoogle(credentials: CredentialProvider) = run(AuthMethod.Google) {
        val idToken = credentials.requestGoogleIdToken() ?: return@run null
        authRepository.signInWithGoogle(idToken)
    }

    /** Signs in with a passkey chosen in the native picker shown by [credentials]. */
    fun signInWithPasskey(credentials: CredentialProvider) = run(AuthMethod.Passkey) {
        val challenge = authRepository.requestPasskeyChallenge()
        val assertion = credentials.requestPasskeyAssertion(challenge.optionsJson) ?: return@run null
        authRepository.signInWithPasskey(challenge, assertion)
    }

    private fun run(method: AuthMethod, block: suspend () -> SignInResult?) {
        if (_uiState.value.isBusy) return
        _uiState.update { it.copy(busyMethod = method, errorMessage = null) }
        viewModelScope.launch {
            val result = try {
                block()
            } catch (e: CancellationException) {
                throw e
            } catch (_: IOException) {
                SignInResult.NetworkError
            } catch (_: Exception) {
                SignInResult.Failed
            }
            if (result == SignInResult.Success) _signedIn.send(Unit)
            _uiState.update { it.copy(busyMethod = null, errorMessage = result?.let { r -> errorMessageFor(method, r) }) }
        }
    }

    @StringRes
    private fun errorMessageFor(method: AuthMethod, result: SignInResult): Int? = when (result) {
        SignInResult.Success -> null
        SignInResult.NetworkError -> R.string.error_network
        SignInResult.InvalidCredentials, SignInResult.Failed -> when (method) {
            AuthMethod.Email -> if (result == SignInResult.InvalidCredentials) R.string.error_invalid_credentials else R.string.error_generic
            AuthMethod.SignUp -> R.string.error_sign_up_failed
            AuthMethod.Google -> R.string.error_google_failed
            AuthMethod.Passkey -> R.string.error_passkey_failed
        }
    }
}
