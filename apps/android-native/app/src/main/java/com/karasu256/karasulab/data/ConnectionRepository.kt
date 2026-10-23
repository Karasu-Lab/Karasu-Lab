package com.karasu256.karasulab.data

import android.util.Log
import com.karasu256.karasulab.data.remote.AuthApi
import com.karasu256.karasulab.data.remote.RemoteHostConfig
import com.karasu256.karasulab.data.remote.UserApi
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.channelFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout
import okhttp3.HttpUrl.Companion.toHttpUrl
import java.net.SocketTimeoutException
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.cancellation.CancellationException
import kotlin.time.Duration.Companion.seconds

/** Prefers what the API reports about itself over the app's own configuration. */
@Singleton
class ConnectionRepository @Inject constructor(
    private val userApi: UserApi,
    private val authApi: AuthApi,
    private val hosts: RemoteHostConfig,
) {
    /** Emits on every status change so the screen shows each host's progress as soon as it is known, not only when both finish. */
    fun observe(): Flow<ConnectionInfo> = channelFlow {
        val lock = Mutex()
        var info = ConnectionInfo(
            api = HostConnection(hosts.apiHost, HostStatus.Connecting),
            auth = HostConnection(hosts.authHost, HostStatus.Connecting),
            branch = null,
        )
        send(info)

        suspend fun update(change: (ConnectionInfo) -> ConnectionInfo) = lock.withLock {
            info = change(info)
            send(info)
        }

        launch {
            val (status, meta) = probe(hosts.apiHost) { userApi.meta() }
            update { it.copy(api = HostConnection(meta?.apiUrl?.toHttpUrl()?.host ?: hosts.apiHost, status), branch = meta?.gitBranch) }
        }
        launch {
            val (status) = probe(hosts.authHost) { authApi.ok() }
            update { it.copy(auth = it.auth.copy(status = status)) }
        }
    }

    /**
     * [TimeoutCancellationException] is a [CancellationException], so it has to be caught first or a timeout would
     * cancel the caller. Failures are logged here because the screen only shows an icon, which cannot tell a refused
     * connection from an HTTP error. The exception is part of the message because [Log.w] prints an empty stack trace
     * for `UnknownHostException`, which would hide a DNS failure.
     */
    private suspend fun <T> probe(host: String, block: suspend () -> T): Pair<HostStatus, T?> = try {
        HostStatus.Connected to withTimeout(5.seconds) { block() }
    } catch (e: TimeoutCancellationException) {
        Log.w(TAG, "$host did not answer within 5 seconds: $e", e)
        HostStatus.TimedOut to null
    } catch (e: CancellationException) {
        throw e
    } catch (e: SocketTimeoutException) {
        Log.w(TAG, "$host timed out: $e", e)
        HostStatus.TimedOut to null
    } catch (e: Exception) {
        Log.w(TAG, "$host could not be reached: $e", e)
        HostStatus.Failed to null
    }

    private companion object {
        const val TAG = "ConnectionProbe"
    }
}
