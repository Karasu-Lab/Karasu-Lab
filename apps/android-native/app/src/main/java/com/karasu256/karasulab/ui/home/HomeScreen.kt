package com.karasu256.karasulab.ui.home

import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.karasu256.karasulab.R
import com.karasu256.karasulab.auth.CredentialAuthenticator
import com.karasu256.karasulab.ui.components.BaseButton
import com.karasu256.karasulab.ui.components.BaseButtonStyle
import com.ramcosta.composedestinations.annotation.Destination
import com.ramcosta.composedestinations.annotation.RootGraph
import com.ramcosta.composedestinations.generated.NavGraphs
import com.ramcosta.composedestinations.generated.destinations.AuthScreenDestination
import com.ramcosta.composedestinations.generated.destinations.PasskeyListScreenDestination
import com.ramcosta.composedestinations.navigation.DestinationsNavigator

/** Home screen showing the signed-in user's name with passkey and sign-out buttons. */
@Destination<RootGraph>
@Composable
fun HomeScreen(
    navigator: DestinationsNavigator,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val profile by viewModel.profile.collectAsStateWithLifecycle()
    val isSigningOut by viewModel.isSigningOut.collectAsStateWithLifecycle()
    val createPasskey by viewModel.createPasskey.collectAsStateWithLifecycle()
    val activity = LocalActivity.current
    val credentials = remember(activity) { activity?.let(::CredentialAuthenticator) }

    LaunchedEffect(viewModel) {
        viewModel.signedOut.collect {
            navigator.navigate(AuthScreenDestination) {
                popUpTo(NavGraphs.root) { inclusive = true }
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = profile?.name ?: stringResource(R.string.profile_name_placeholder),
            style = MaterialTheme.typography.headlineMedium,
        )
        Spacer(Modifier.height(24.dp))
        BaseButton(
            text = stringResource(R.string.create_passkey),
            onClick = viewModel::openCreatePasskey,
        )
        Spacer(Modifier.height(12.dp))
        BaseButton(
            text = stringResource(R.string.manage_passkeys),
            onClick = { navigator.navigate(PasskeyListScreenDestination) },
            style = BaseButtonStyle.Outlined,
        )
        Spacer(Modifier.height(12.dp))
        BaseButton(
            text = stringResource(R.string.sign_out),
            onClick = viewModel::signOut,
            isBusy = isSigningOut,
            style = BaseButtonStyle.Outlined,
        )
    }

    createPasskey?.let { state ->
        CreatePasskeyDialog(
            state = state,
            onNameChange = viewModel::onPasskeyNameChange,
            onCreate = { credentials?.let(viewModel::createPasskey) },
            onDismiss = viewModel::closeCreatePasskey,
        )
    }
}
