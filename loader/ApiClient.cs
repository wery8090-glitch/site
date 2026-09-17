using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;

namespace Chroma.Loader;

public sealed record Account(string Username, string Email, string Plan, string Status, string? EndsAt);
public sealed record Visual(string Name, string Slug, string Version, string MinecraftVersion, string Description);
public sealed record Release(string Version, string MinecraftVersion, string FileName, string? DownloadUrl, string ReleaseNotes);
public sealed record ClientVersion(string Version, string MinecraftVersion, string FileName, string? DownloadUrl, string ReleaseNotes);

public sealed class ChromaApiClient
{
    public const string WebsiteUrl = "https://chroma-client-coghj9mdn-pozetiv.vercel.app";
    private static readonly string[] WebsiteEndpoints =
    {
        "https://chroma-client-pozetiv.vercel.app",
        "https://chroma-client-git-main-pozetiv.vercel.app",
        WebsiteUrl,
        "https://chroma-client-m0enaceu4-pozetiv.vercel.app",
        "https://chroma-client.vercel.app",
    };
    private const string SupabaseUrl = "https://rsbcqzeyiazogktztubu.supabase.co";
    private const string PublishableKey = "sb_publishable_lA5GKwBVATAXDuZN2NTc-g_Y-Igb8Dr";
    private readonly HttpClient http = new() { Timeout = TimeSpan.FromSeconds(20) };
    private string? accessToken;
    private string? refreshToken;

    public async Task<Account> LoginAsync(string email, string password, bool remember, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email)) throw new InvalidOperationException("Введите email.");
        if (string.IsNullOrWhiteSpace(password)) throw new InvalidOperationException("Введите пароль.");
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{SupabaseUrl}/auth/v1/token?grant_type=password");
        request.Headers.Add("apikey", PublishableKey);
        request.Content = new StringContent(JsonSerializer.Serialize(new { email, password }), Encoding.UTF8, "application/json");
        using var response = await http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(MapError(body));
        using var json = JsonDocument.Parse(body);
        accessToken = json.RootElement.GetProperty("access_token").GetString();
        refreshToken = json.RootElement.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() : null;
        if (remember && !string.IsNullOrWhiteSpace(refreshToken)) SessionStore.Save(refreshToken!); else SessionStore.Clear();
        return await GetAccountAsync(cancellationToken);
    }

    public async Task<string> RegisterAsync(string username, string email, string password, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(username)) throw new InvalidOperationException("Введите имя пользователя.");
        if (string.IsNullOrWhiteSpace(email)) throw new InvalidOperationException("Введите email.");
        if (password.Length < 6) throw new InvalidOperationException("Пароль должен содержать минимум 6 символов.");
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{SupabaseUrl}/auth/v1/signup");
        request.Headers.Add("apikey", PublishableKey);
        request.Content = new StringContent(JsonSerializer.Serialize(new { email, password, data = new { username, name = username } }), Encoding.UTF8, "application/json");
        using var response = await http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(MapError(body));
        using var json = JsonDocument.Parse(body);
        if (json.RootElement.TryGetProperty("access_token", out var token) && !string.IsNullOrWhiteSpace(token.GetString()))
        {
            accessToken = token.GetString();
            refreshToken = json.RootElement.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() : null;
            if (!string.IsNullOrWhiteSpace(refreshToken)) SessionStore.Save(refreshToken!);
            return "Аккаунт создан. Вход выполнен.";
        }
        return "Аккаунт создан. Подтвердите email, затем войдите.";
    }

    public async Task<Account?> RestoreAsync(CancellationToken cancellationToken = default)
    {
        var stored = SessionStore.Load();
        if (string.IsNullOrWhiteSpace(stored)) return null;
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{SupabaseUrl}/auth/v1/token?grant_type=refresh_token");
        request.Headers.Add("apikey", PublishableKey);
        request.Content = new StringContent(JsonSerializer.Serialize(new { refresh_token = stored }), Encoding.UTF8, "application/json");
        using var response = await http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) { SessionStore.Clear(); return null; }
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        accessToken = json.RootElement.GetProperty("access_token").GetString();
        refreshToken = json.RootElement.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() : stored;
        if (!string.IsNullOrWhiteSpace(refreshToken)) SessionStore.Save(refreshToken!);
        return await GetAccountAsync(cancellationToken);
    }

    public async Task<Account> GetAccountAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accessToken)) throw new InvalidOperationException("Сессия отсутствует.");
        string body = "";
        HttpResponseMessage? response = null;
        foreach (var endpoint in WebsiteEndpoints)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{endpoint}/api/loader/account");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            response = await http.SendAsync(request, cancellationToken);
            body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (response.IsSuccessStatusCode) break;
            if (response.StatusCode is not System.Net.HttpStatusCode.NotFound and not System.Net.HttpStatusCode.BadGateway and not System.Net.HttpStatusCode.ServiceUnavailable and not System.Net.HttpStatusCode.InternalServerError) break;
        }
        if (response is null || !response.IsSuccessStatusCode) throw new InvalidOperationException(MapError(body));
        using var json = JsonDocument.Parse(body);
        var user = json.RootElement.GetProperty("user");
        var subscription = json.RootElement.TryGetProperty("subscription", out var sub) && sub.ValueKind != JsonValueKind.Null ? sub : default;
        var plan = subscription.ValueKind == JsonValueKind.Object && subscription.TryGetProperty("plan", out var planObj) && planObj.TryGetProperty("slug", out var slug) ? slug.GetString() ?? "free" : "free";
        var status = subscription.ValueKind == JsonValueKind.Object ? "ACTIVE" : "FREE";
        string? endsAt = subscription.ValueKind == JsonValueKind.Object && subscription.TryGetProperty("subscription", out var subObj) && subObj.TryGetProperty("endsAt", out var end) ? end.GetString() : null;
        var username = user.TryGetProperty("username", out var name) ? name.GetString() : null;
        var email = user.TryGetProperty("email", out var mail) ? mail.GetString() : null;
        return new Account(username ?? email ?? "Chroma User", email ?? "", plan.Replace('_', ' ').ToUpperInvariant(), status, endsAt);
    }

    public async Task<IReadOnlyList<Visual>> GetVisualsAsync(CancellationToken cancellationToken = default)
    {
        using var request = Authorized(HttpMethod.Get, "/api/loader/visuals");
        using var response = await http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(MapError(body));
        using var json = JsonDocument.Parse(body);
        if (!json.RootElement.TryGetProperty("visuals", out var visuals)) return Array.Empty<Visual>();
        return visuals.EnumerateArray().Select(item => new Visual(
            item.TryGetProperty("name", out var name) ? name.GetString() ?? "Visual" : "Visual",
            item.TryGetProperty("slug", out var slug) ? slug.GetString() ?? "free" : "free",
            item.TryGetProperty("version", out var version) ? version.GetString() ?? "—" : "—",
            item.TryGetProperty("minecraftVersion", out var mc) ? mc.GetString() ?? "—" : "—",
            item.TryGetProperty("description", out var description) ? description.GetString() ?? "" : "")).ToArray();
    }

    public async Task<Release?> GetLatestReleaseAsync(CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{WebsiteUrl}/api/loader/version");
        using var response = await http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode) return null;
        using var json = JsonDocument.Parse(body);
        return new Release(
            json.RootElement.TryGetProperty("version", out var version) ? version.GetString() ?? "—" : "—",
            json.RootElement.TryGetProperty("minecraftVersion", out var mc) ? mc.GetString() ?? "—" : "—",
            json.RootElement.TryGetProperty("fileName", out var file) ? file.GetString() ?? "" : "",
            json.RootElement.TryGetProperty("downloadUrl", out var url) ? url.GetString() : null,
            json.RootElement.TryGetProperty("releaseNotes", out var notes) ? notes.GetString() ?? "" : "");
    }

    public async Task<IReadOnlyList<ClientVersion>> GetAvailableVersionsAsync(CancellationToken cancellationToken = default)
    {
        using var request = Authorized(HttpMethod.Get, "/api/loader/versions");
        using var response = await http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(MapError(body));
        using var json = JsonDocument.Parse(body);
        if (!json.RootElement.TryGetProperty("versions", out var versions)) return Array.Empty<ClientVersion>();
        return versions.EnumerateArray().Select(item => new ClientVersion(
            item.GetProperty("version").GetString() ?? "—",
            item.GetProperty("minecraftVersion").GetString() ?? "—",
            item.GetProperty("fileName").GetString() ?? "",
            item.TryGetProperty("fileKey", out var url) ? url.GetString() : null,
            item.TryGetProperty("releaseNotes", out var notes) ? notes.GetString() ?? "" : "")).ToArray();
    }

    private HttpRequestMessage Authorized(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, $"{WebsiteUrl}{path}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return request;
    }

    public void Logout() { accessToken = null; refreshToken = null; SessionStore.Clear(); }
    private static string MapError(string body)
    {
        var text = body.ToLowerInvariant();
        if (text.Contains("invalid login credentials") || text.Contains("invalid password")) return "Неверный email или пароль.";
        if (text.Contains("network") || text.Contains("fetch")) return "Нет соединения с интернетом.";
        if (text.Contains("subscription_required")) return "Для этого действия нужна активная подписка.";
        if (text.Contains("email not confirmed")) return "В Supabase включено подтверждение email. Отключите Confirm email в Authentication → Providers → Email.";
        if (text.Contains("unauthorized")) return "Сессия не принята сервером Chroma. Войдите заново.";
        return "Не удалось подключиться к Chroma. Попробуйте позже.";
    }
}

internal static class SessionStore
{
    private static readonly string Path = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Chroma", "session.bin");
    public static void Save(string value)
    {
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(Path)!);
        var protectedBytes = ProtectedData.Protect(Encoding.UTF8.GetBytes(value), null, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(Path, protectedBytes);
    }
    public static string? Load()
    {
        try { return Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(Path), null, DataProtectionScope.CurrentUser)); } catch { return null; }
    }
    public static void Clear() { try { if (File.Exists(Path)) File.Delete(Path); } catch { } }
}
