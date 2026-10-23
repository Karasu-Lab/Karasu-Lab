package com.karasu256.karasulab.data.remote

import retrofit2.http.GET

/** Endpoints served by api.karasu256.com, authenticated with the custom token. */
interface UserApi {
    /** Returns the signed-in user's profile. */
    @GET("user/profile")
    suspend fun profile(): ProfileResponse

    /** Returns what the API reports about itself; needs no token. */
    @GET("meta")
    suspend fun meta(): MetaResponse
}
