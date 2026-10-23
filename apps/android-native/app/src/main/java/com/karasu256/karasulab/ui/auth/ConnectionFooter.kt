package com.karasu256.karasulab.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.karasu256.karasulab.R
import com.karasu256.karasulab.data.ConnectionInfo
import com.karasu256.karasulab.data.HostConnection
import com.karasu256.karasulab.data.HostStatus

/** The rows share the widest host's width through [IntrinsicSize.Max], so the status icons line up in one column. */
@Composable
fun ConnectionFooter(info: ConnectionInfo?, modifier: Modifier = Modifier) {
    if (info == null) return
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Column(
            modifier = Modifier.width(IntrinsicSize.Max),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            HostRow(info.api)
            HostRow(info.auth)
        }
        info.branch?.let { branch ->
            Text(
                text = branch,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun HostRow(connection: HostConnection) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = connection.host,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        StatusIcon(connection.status)
    }
}

@Composable
private fun StatusIcon(status: HostStatus) {
    Box(modifier = Modifier.size(14.dp), contentAlignment = Alignment.Center) {
        when (status) {
            HostStatus.Connecting -> CircularProgressIndicator(
                modifier = Modifier.fillMaxSize(),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            HostStatus.Connected -> Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = stringResource(R.string.connection_connected),
                modifier = Modifier.fillMaxSize(),
                tint = MaterialTheme.colorScheme.primary,
            )
            HostStatus.Failed -> Icon(
                imageVector = Icons.Filled.Close,
                contentDescription = stringResource(R.string.connection_failed),
                modifier = Modifier.fillMaxSize(),
                tint = MaterialTheme.colorScheme.error,
            )
            HostStatus.TimedOut -> Icon(
                imageVector = Icons.Filled.Schedule,
                contentDescription = stringResource(R.string.connection_timed_out),
                modifier = Modifier.fillMaxSize(),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
