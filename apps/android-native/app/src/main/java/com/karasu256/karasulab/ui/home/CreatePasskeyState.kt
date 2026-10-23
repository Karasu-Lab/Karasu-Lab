package com.karasu256.karasulab.ui.home

import androidx.annotation.StringRes

data class CreatePasskeyState(
    val name: String = "",
    val isBusy: Boolean = false,
    @param:StringRes val errorMessage: Int? = null,
) {
    val canCreate: Boolean get() = name.isNotBlank() && !isBusy
}
