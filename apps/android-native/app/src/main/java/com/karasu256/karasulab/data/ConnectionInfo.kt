package com.karasu256.karasulab.data

enum class HostStatus {
    Connecting,
    Connected,
    Failed,
    TimedOut,
}

data class HostConnection(
    val host: String,
    val status: HostStatus,
)

/** [branch] is null until the API answers, since only the API knows which branch it was built from. */
data class ConnectionInfo(
    val api: HostConnection,
    val auth: HostConnection,
    val branch: String?,
)
