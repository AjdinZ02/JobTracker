using System.Collections.Concurrent;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    
    // Track requests per IP
    private static readonly ConcurrentDictionary<string, (DateTime resetTime, int count)> _requestCounts = new();
    
    // Configuration
    private const int MaxRequestsPerWindow = 10; // 10 requests
    private const int WindowInSeconds = 60; // per minute

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only rate limit auth endpoints
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (!path.Contains("/api/auth/"))
        {
            await _next(context);
            return;
        }

        var clientIp = GetClientIp(context);
        var now = DateTime.UtcNow;

        // Get or create entry for this IP
        var entry = _requestCounts.GetOrAdd(clientIp, _ => (now.AddSeconds(WindowInSeconds), 0));

        // Reset counter if window has passed
        if (now >= entry.resetTime)
        {
            entry = (now.AddSeconds(WindowInSeconds), 0);
        }

        // Increment counter
        entry.count++;
        _requestCounts[clientIp] = entry;

        // Check if limit exceeded
        if (entry.count > MaxRequestsPerWindow)
        {
            _logger.LogWarning("Rate limit exceeded for IP: {ClientIp}", clientIp);
            context.Response.StatusCode = 429; // Too Many Requests
            context.Response.ContentType = "application/json";
            var errorResponse = System.Text.Json.JsonSerializer.Serialize(new 
            { 
                error = "Previše zahtjeva. Pokušajte ponovo za par minuta.",
                retryAfter = (int)(entry.resetTime - now).TotalSeconds
            });
            await context.Response.WriteAsync(errorResponse);
            return;
        }

        // Cleanup old entries periodically (every 100 requests)
        if (_requestCounts.Count > 100 && entry.count == 1)
        {
            CleanupOldEntries();
        }

        await _next(context);
    }

    private string GetClientIp(HttpContext context)
    {
        // Check X-Forwarded-For header (for proxies/load balancers)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        // Check X-Real-IP header
        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        // Fallback to connection remote IP
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private void CleanupOldEntries()
    {
        var now = DateTime.UtcNow;
        var expiredKeys = _requestCounts
            .Where(kvp => now >= kvp.Value.resetTime)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            _requestCounts.TryRemove(key, out _);
        }
    }
}
