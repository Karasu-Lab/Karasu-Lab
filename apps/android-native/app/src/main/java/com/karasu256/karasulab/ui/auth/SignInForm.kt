package com.karasu256.karasulab.ui.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.karasu256.karasulab.R
import com.karasu256.karasulab.ui.components.BaseButton

/**
 * The email and password form with its sign-in button.
 *
 * @param state state of the auth screen.
 * @param onEmailChange called with the typed email address.
 * @param onPasswordChange called with the typed password.
 * @param onSubmit called when the sign-in button or the keyboard's done action is used.
 * @param middle content shown between the fields and the button.
 */
@Composable
fun SignInForm(
    state: AuthUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    middle: @Composable () -> Unit,
) {
    Column {
        OutlinedTextField(
            value = state.email,
            onValueChange = onEmailChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isBusy,
            label = { Text(stringResource(R.string.email_label)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.isBusy,
            label = { Text(stringResource(R.string.password_label)) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
        )
        Spacer(Modifier.height(12.dp))
        middle()
        Spacer(Modifier.height(24.dp))
        BaseButton(
            text = stringResource(R.string.sign_in),
            onClick = onSubmit,
            modifier = Modifier.fillMaxWidth(),
            enabled = state.canSubmitEmail && !state.isBusy,
            isBusy = state.busyMethod == AuthMethod.Email,
        )
    }
}
