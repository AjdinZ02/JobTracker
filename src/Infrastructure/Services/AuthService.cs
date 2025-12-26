using Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

public interface IAuthService
{
    Task<(User user, string accessToken, string refreshToken)> RegisterAsync(string email, string password, string firstName, string lastName);
    Task<(User user, string accessToken, string refreshToken)> LoginAsync(string email, string password);
    Task<(User user, string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken);
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    Task<User?> ValidateRefreshTokenAsync(string refreshToken);
}

public class AuthService : IAuthService
{
    private readonly Infrastructure.Data.AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    
    // In-memory storage for refresh tokens (for production, use Redis or database)
    private static readonly Dictionary<string, (Guid userId, DateTime expiresAt)> _refreshTokens = new();
    private static readonly object _refreshTokenLock = new();

    public AuthService(Infrastructure.Data.AppDbContext db, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(User user, string accessToken, string refreshToken)> RegisterAsync(string email, string password, string firstName, string lastName)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Email i password su obavezni.");

        if (password.Length < 6)
            throw new ArgumentException("Password mora biti najmanje 6 karaktera.");

        var existingUser = _db.Users.FirstOrDefault(u => u.Email == email);
        if (existingUser != null)
            throw new InvalidOperationException("Korisnik sa ovim email-om već postoji.");

        var user = new User
        {
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();
        
        // Store refresh token
        lock (_refreshTokenLock)
        {
            _refreshTokens[refreshToken] = (user.Id, DateTime.UtcNow.AddDays(30));
        }
        
        return (user, accessToken, refreshToken);
    }

    public async Task<(User user, string accessToken, string refreshToken)> LoginAsync(string email, string password)
    {
        var user = _db.Users.FirstOrDefault(u => u.Email == email);
        if (user == null)
            throw new InvalidOperationException("Korisnik nije pronađen.");

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new InvalidOperationException("Pogrešna lozinka.");

        user.LastLoginAt = DateTime.UtcNow;
        _db.Users.Update(user);
        await _db.SaveChangesAsync();

        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();
        
        // Store refresh token
        lock (_refreshTokenLock)
        {
            _refreshTokens[refreshToken] = (user.Id, DateTime.UtcNow.AddDays(30));
        }
        
        return (user, accessToken, refreshToken);
    }

    public string GenerateAccessToken(User user)
    {
        // CRITICAL: Must match Program.cs - check ENV variable first!
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
                        ?? _configuration["Jwt:SecretKey"] 
                        ?? "super-secret-key-change-this-in-production";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "JobTracker";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "JobTrackerApi";

        var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var key = System.Text.Encoding.ASCII.GetBytes(jwtSecret);
        var signingKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key);
        
        // CRITICAL: Add KeyId to make JsonWebTokenHandler happy
        signingKey.KeyId = "JobTrackerKey2025";

        var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Subject = new System.Security.Claims.ClaimsIdentity(new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id.ToString()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, user.Email),
                new System.Security.Claims.Claim("FirstName", user.FirstName),
                new System.Security.Claims.Claim("LastName", user.LastName)
            }),
            Expires = DateTime.UtcNow.AddMinutes(30), // Short-lived: 30 minutes
            Issuer = jwtIssuer,
            Audience = jwtAudience,
            SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                signingKey,
                Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        // Generate a cryptographically secure random string
        var randomBytes = new byte[64];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        return Convert.ToBase64String(randomBytes);
    }

    public async Task<User?> ValidateRefreshTokenAsync(string refreshToken)
    {
        lock (_refreshTokenLock)
        {
            if (!_refreshTokens.TryGetValue(refreshToken, out var tokenData))
                return null;

            if (tokenData.expiresAt < DateTime.UtcNow)
            {
                // Token expired, remove it
                _refreshTokens.Remove(refreshToken);
                return null;
            }

            var user = _db.Users.FirstOrDefault(u => u.Id == tokenData.userId);
            return user;
        }
    }

    public async Task<(User user, string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken)
    {
        var user = await ValidateRefreshTokenAsync(refreshToken);
        if (user == null)
            throw new InvalidOperationException("Nevažeći ili istekao refresh token.");

        // Generate new tokens
        var newAccessToken = GenerateAccessToken(user);
        var newRefreshToken = GenerateRefreshToken();

        // Replace old refresh token with new one
        lock (_refreshTokenLock)
        {
            _refreshTokens.Remove(refreshToken);
            _refreshTokens[newRefreshToken] = (user.Id, DateTime.UtcNow.AddDays(30));
        }

        _logger.LogInformation("Token refreshed for user: {Email}", user.Email);
        
        return (user, newAccessToken, newRefreshToken);
    }
}
