package com.karasu256.karasulab

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import com.karasu256.karasulab.ui.loading.LoadingScreen
import com.karasu256.karasulab.ui.splash.SplashScreen
import com.karasu256.karasulab.ui.theme.AppTheme
import com.ramcosta.composedestinations.DestinationsNavHost
import com.ramcosta.composedestinations.generated.NavGraphs
import com.ramcosta.composedestinations.generated.destinations.HomeScreenDestination
import com.ramcosta.composedestinations.generated.destinations.AuthScreenDestination
import com.ramcosta.composedestinations.utils.rememberDestinationsNavigator
import dagger.hilt.android.AndroidEntryPoint

/** The app's single activity, hosting every screen in a Compose Destinations nav graph. */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AppTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    LaunchFlow(viewModel)
                }
            }
        }
    }
}

/** The stages the app goes through on launch, in order. */
private enum class LaunchPhase {
    Splash,
    Loading,
    Content,
}

/** Shows the splash screen, then the loading screen, then the app's first screen. */
@Composable
private fun LaunchFlow(viewModel: MainViewModel) {
    var phase by rememberSaveable { mutableStateOf(LaunchPhase.Splash) }

    Crossfade(targetState = phase, label = "launch") { current ->
        when (current) {
            LaunchPhase.Splash -> SplashScreen(onFinished = { phase = LaunchPhase.Loading })
            LaunchPhase.Loading -> LoadingScreen(onFinished = { phase = LaunchPhase.Content })
            LaunchPhase.Content -> AppContent(viewModel)
        }
    }
}

/** Starts at the home screen when signed in and at sign-in otherwise, and returns to sign-in whenever the session ends. */
@Composable
private fun AppContent(viewModel: MainViewModel) {
    val isSignedIn by viewModel.isSignedIn.collectAsStateWithLifecycle()
    val signedInAtLaunch = isSignedIn ?: return
    val start = remember { if (signedInAtLaunch) HomeScreenDestination else AuthScreenDestination }
    val navController = rememberNavController()
    val navigator = navController.rememberDestinationsNavigator()

    LaunchedEffect(isSignedIn) {
        if (isSignedIn == false && navController.currentDestination?.route == HomeScreenDestination.route) {
            navigator.navigate(AuthScreenDestination) {
                popUpTo(NavGraphs.root) { inclusive = true }
            }
        }
    }

    DestinationsNavHost(
        navGraph = NavGraphs.root,
        modifier = Modifier.safeDrawingPadding(),
        start = start,
        navController = navController,
    )
}
