package com.karasu256.karasulab.ui.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role

/**
 * A container filling the width with a two-column grid: [message] in the first column and a link
 * aligned to the end in the second.
 *
 * @param message text shown in the first column, typically the last error; it keeps one line of height when empty.
 * @param linkText label of the link in the second column.
 * @param onLinkClick called when the link is clicked.
 * @param modifier modifier applied to the container.
 * @param linkEnabled whether the link can be clicked.
 */
@Composable
fun AuthLinkRow(
    message: String,
    linkText: String,
    onLinkClick: () -> Unit,
    modifier: Modifier = Modifier,
    linkEnabled: Boolean = true,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = message,
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall,
            minLines = 1,
        )
        Box(
            modifier = Modifier.weight(1f),
            contentAlignment = Alignment.CenterEnd,
        ) {
            Text(
                text = linkText,
                modifier = Modifier.clickable(enabled = linkEnabled, role = Role.Button, onClick = onLinkClick),
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}
