package com.karasu256.karasulab.di

import android.content.Context
import androidx.room.Room
import com.karasu256.karasulab.BuildConfig
import com.karasu256.karasulab.data.auth.Base64JwtExpiry
import com.karasu256.karasulab.data.auth.JwtExpiry
import com.karasu256.karasulab.data.local.AppDatabase
import com.karasu256.karasulab.data.local.RoomSessionStore
import com.karasu256.karasulab.data.local.SessionStore
import com.karasu256.karasulab.data.remote.AuthApi
import com.karasu256.karasulab.data.remote.CustomTokenAuthenticator
import com.karasu256.karasulab.data.remote.CustomTokenInterceptor
import com.karasu256.karasulab.data.remote.DebugRemoteHostConfig
import com.karasu256.karasulab.data.remote.HttpErrorLoggingInterceptor
import com.karasu256.karasulab.data.remote.UserApi
import com.karasu256.karasulab.data.remote.OriginInterceptor
import com.karasu256.karasulab.data.remote.ReleaseRemoteHostConfig
import com.karasu256.karasulab.data.remote.RemoteHostConfig
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import javax.inject.Qualifier
import javax.inject.Singleton

/** Marks the [OkHttpClient] that talks to api-auth.karasu256.com. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AuthHttpClient

/** Marks the [OkHttpClient] that talks to api.karasu256.com with the custom token. */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ApiHttpClient

/** Provides the app's singletons: JSON, HTTP clients, API services and the database. */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    private val jsonMediaType = "application/json".toMediaType()

    /** Provides the JSON configuration shared by every client. */
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    /** Provides the remote hosts: the local environment for debug builds, the main one for release builds. */
    @Provides
    @Singleton
    fun provideRemoteHostConfig(): RemoteHostConfig =
        if (BuildConfig.DEBUG) DebugRemoteHostConfig() else ReleaseRemoteHostConfig()

    /** Provides the client for the authentication server, which sends the trusted `Origin` better-auth requires. */
    @Provides
    @Singleton
    @AuthHttpClient
    fun provideAuthHttpClient(hosts: RemoteHostConfig): OkHttpClient {
        val authUrl = hosts.authBaseUrl.toHttpUrl()
        return OkHttpClient.Builder()
            .addInterceptor(OriginInterceptor("${authUrl.scheme}://${authUrl.host}"))
            .addNetworkInterceptor(HttpErrorLoggingInterceptor())
            .build()
    }

    /** Provides the client for api.karasu256.com, which authenticates with the custom token. */
    @Provides
    @Singleton
    @ApiHttpClient
    fun provideApiHttpClient(
        interceptor: CustomTokenInterceptor,
        authenticator: CustomTokenAuthenticator,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(interceptor)
        .addNetworkInterceptor(HttpErrorLoggingInterceptor())
        .authenticator(authenticator)
        .build()

    /** Provides the better-auth service. */
    @Provides
    @Singleton
    fun provideAuthApi(
        @AuthHttpClient client: OkHttpClient,
        json: Json,
        hosts: RemoteHostConfig,
    ): AuthApi = Retrofit.Builder()
        .baseUrl(hosts.authBaseUrl)
        .client(client)
        .addConverterFactory(json.asConverterFactory(jsonMediaType))
        .build()
        .create(AuthApi::class.java)

    /** Provides the api.karasu256.com service. */
    @Provides
    @Singleton
    fun provideUserApi(
        @ApiHttpClient client: OkHttpClient,
        json: Json,
        hosts: RemoteHostConfig,
    ): UserApi = Retrofit.Builder()
        .baseUrl(hosts.apiBaseUrl)
        .client(client)
        .addConverterFactory(json.asConverterFactory(jsonMediaType))
        .build()
        .create(UserApi::class.java)

    /** Provides the Room database. */
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, AppDatabase.NAME).build()
}

/** Binds the app's interfaces to their implementations. */
@Module
@InstallIn(SingletonComponent::class)
abstract class BindingModule {
    /** Binds [SessionStore] to Room. */
    @Binds
    @Singleton
    abstract fun bindSessionStore(store: RoomSessionStore): SessionStore

    /** Binds [JwtExpiry] to the Base64 decoder. */
    @Binds
    abstract fun bindJwtExpiry(expiry: Base64JwtExpiry): JwtExpiry
}
