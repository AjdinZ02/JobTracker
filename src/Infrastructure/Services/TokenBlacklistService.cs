using System.Collections.Concurrent;

namespace Infrastructure.Services;

public interface ITokenBlacklistService
{
    void RevokeToken(string token);
    bool IsTokenRevoked(string token);
    void CleanupExpiredTokens();
}

public class TokenBlacklistService : ITokenBlacklistService
{
    // In-memory storage (for production, use Redis or database)
    private readonly ConcurrentDictionary<string, DateTime> _revokedTokens = new();
    private readonly object _cleanupLock = new();
    private DateTime _lastCleanup = DateTime.UtcNow;

    public void RevokeToken(string token)
    {
        // Store token with expiration time (JWT tokens expire, so we don't need to keep them forever)
        _revokedTokens.TryAdd(token, DateTime.UtcNow.AddDays(7));
        
        // Cleanup old tokens periodically
        CleanupExpiredTokens();
    }

    public bool IsTokenRevoked(string token)
    {
        return _revokedTokens.ContainsKey(token);
    }

    public void CleanupExpiredTokens()
    {
        // Only cleanup once per hour to avoid performance issues
        if ((DateTime.UtcNow - _lastCleanup).TotalHours < 1)
            return;

        lock (_cleanupLock)
        {
            // Double-check after acquiring lock
            if ((DateTime.UtcNow - _lastCleanup).TotalHours < 1)
                return;

            var now = DateTime.UtcNow;
            var expiredTokens = _revokedTokens
                .Where(kvp => kvp.Value < now)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var token in expiredTokens)
            {
                _revokedTokens.TryRemove(token, out _);
            }

            _lastCleanup = DateTime.UtcNow;
        }
    }
}
