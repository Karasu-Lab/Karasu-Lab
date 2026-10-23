package com.karasu256.karasulab.data.remote

/** The hosts of the remote servers the app talks to. */
interface RemoteHostConfig {
    /** The host of the authentication server, e.g. `api-auth.karasu256.com`. */
    val authHost: String

    /** The host of the API server, e.g. `api.karasu256.com`. */
    val apiHost: String

    /** The base URL of the authentication server, with a trailing slash. */
    val authBaseUrl: String get() = "https://$authHost/"

    /** The base URL of the API server, with a trailing slash. */
    val apiBaseUrl: String get() = "https://$apiHost/"
}

/**
 * The hosts used by debug builds, which point at the local environment.
 *
 * @property authHost the host of the local authentication server.
 * @property apiHost the host of the local API server.
 */
data class DebugRemoteHostConfig(
    override val authHost: String = "local-api-auth.karasu256.com",
    override val apiHost: String = "local-api.karasu256.com",
) : RemoteHostConfig

/**
 * The hosts used by release builds, which point at the main environment.
 *
 * @property authHost the host of the main authentication server.
 * @property apiHost the host of the main API server.
 */
data class ReleaseRemoteHostConfig(
    override val authHost: String = "api-auth.karasu256.com",
    override val apiHost: String = "api.karasu256.com",
) : RemoteHostConfig
