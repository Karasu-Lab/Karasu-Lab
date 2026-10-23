package com.karasu256.karasulab.ui.passkeys

import androidx.annotation.StringRes
import com.karasu256.karasulab.data.Passkey

data class PasskeyListUiState(
    val passkeys: List<Passkey> = emptyList(),
    val isLoading: Boolean = true,
    @param:StringRes val errorMessage: Int? = null,
)
