package com.karasu256.karasulab.data.remote

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Adds an `Origin` header to every non-GET request, since better-auth rejects state-changing
 * requests that carry cookies unless they come from one of its trusted origins.
 *
 * @property origin the trusted origin to send, e.g. `https://dev-api-auth.karasu256.com`.
 */
class OriginInterceptor(private val origin: String) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.method == "GET" || request.header("Origin") != null) return chain.proceed(request)
        return chain.proceed(request.newBuilder().header("Origin", origin).build())
    }
}
