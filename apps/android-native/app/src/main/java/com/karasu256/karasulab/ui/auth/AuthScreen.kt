package com.karasu256.karasulab.ui.auth

import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.karasu256.karasulab.R
import com.karasu256.karasulab.auth.CredentialAuthenticator
import com.karasu256.karasulab.ui.components.BrandGoogleIconButton
import com.karasu256.karasulab.ui.components.BrandPasskeyIconButton
import com.ramcosta.composedestinations.annotation.Destination
import com.ramcosta.composedestinations.annotation.RootGraph
import com.ramcosta.composedestinations.generated.NavGraphs
import com.ramcosta.composedestinations.generated.destinations.HomeScreenDestination
import com.ramcosta.composedestinations.navigation.DestinationsNavigator

/** Screen shown while signed out, switching between signing in and creating an account. Navigates to the home screen once either completes. */
@Destination<RootGraph>(start = true)
@Composable
fun AuthScreen(
    navigator: DestinationsNavigator,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val activity = LocalActivity.current
    val credentials = remember(activity) { activity?.let(::CredentialAuthenticator) }

    LaunchedEffect(viewModel) {
        viewModel.signedIn.collect {
            navigator.navigate(HomeScreenDestination) {
                popUpTo(NavGraphs.root) { inclusive = true }
            }
        }
    }

    AuthContent(
        state = state,
        onModeChange = viewModel::onModeChange,
        onNameChange = viewModel::onNameChange,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSignIn = viewModel::signInWithEmail,
        onSignUp = viewModel::signUpWithEmail,
        onGoogle = { credentials?.let(viewModel::signInWithGoogle) },
        onPasskey = { credentials?.let(viewModel::signInWithPasskey) },
    )
}

/** Stateless layout of the auth screen. */
@Composable
private fun AuthContent(
    state: AuthUiState,
    onModeChange: (AuthMode) -> Unit,
    onNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit,
    onGoogle: () -> Unit,
    onPasskey: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.brand_title),
                style = MaterialTheme.typography.displayMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(48.dp))
            val linkRow: @Composable () -> Unit = {
                AuthLinkRow(
                    message = state.errorMessage?.let { stringResource(it) }.orEmpty(),
                    linkText = stringResource(if (state.mode == AuthMode.SignIn) R.string.create_account else R.string.sign_in),
                    onLinkClick = { onModeChange(if (state.mode == AuthMode.SignIn) AuthMode.SignUp else AuthMode.SignIn) },
                    linkEnabled = !state.isBusy,
                )
            }
            when (state.mode) {
                AuthMode.SignIn -> SignInForm(
                    state = state,
                    onEmailChange = onEmailChange,
                    onPasswordChange = onPasswordChange,
                    onSubmit = onSignIn,
                    middle = linkRow,
                )
                AuthMode.SignUp -> SignUpForm(
                    state = state,
                    onNameChange = onNameChange,
                    onEmailChange = onEmailChange,
                    onPasswordChange = onPasswordChange,
                    onSubmit = onSignUp,
                    middle = linkRow,
                )
            }
            Spacer(Modifier.height(24.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                HorizontalDivider(Modifier.weight(1f))
                Text(
                    text = stringResource(R.string.or_divider),
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                HorizontalDivider(Modifier.weight(1f))
            }
            Spacer(Modifier.height(24.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                BrandGoogleIconButton(
                    onClick = onGoogle,
                    enabled = !state.isBusy,
                    isBusy = state.busyMethod == AuthMethod.Google,
                )
                BrandPasskeyIconButton(
                    onClick = onPasskey,
                    enabled = !state.isBusy,
                    isBusy = state.busyMethod == AuthMethod.Passkey,
                )
            }
        }
        ConnectionFooter(
            info = state.connection,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp),
        )
    }
}
