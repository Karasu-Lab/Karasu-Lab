package com.karasu256.karasulab.ui.passkeys

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.karasu256.karasulab.R
import com.karasu256.karasulab.data.Passkey
import com.karasu256.karasulab.data.PasskeyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.coroutines.cancellation.CancellationException

@HiltViewModel
class PasskeyListViewModel @Inject constructor(
    private val passkeyRepository: PasskeyRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(PasskeyListUiState())
    val uiState: StateFlow<PasskeyListUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            try {
                val passkeys = passkeyRepository.list()
                _uiState.value = PasskeyListUiState(passkeys = passkeys, isLoading = false)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _uiState.update { it.copy(isLoading = false, errorMessage = R.string.error_passkey_load_failed) }
            }
        }
    }

    /** The row leaves the list at once because the swipe has already dismissed it; a failed deletion reloads the list to bring it back. */
    fun delete(passkey: Passkey) {
        _uiState.update { it.copy(passkeys = it.passkeys - passkey, errorMessage = null) }
        viewModelScope.launch {
            try {
                passkeyRepository.delete(passkey.id)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                load()
                _uiState.update { it.copy(errorMessage = R.string.error_passkey_delete_failed) }
            }
        }
    }
}
