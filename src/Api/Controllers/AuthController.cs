using Application.DTOs;
using Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ITokenBlacklistService _tokenBlacklist;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ITokenBlacklistService tokenBlacklist, ILogger<AuthController> logger)
    {
        _authService = authService;
        _tokenBlacklist = tokenBlacklist;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) ||
                string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
                return BadRequest("Sva polja su obavezna.");

            var (user, accessToken, refreshToken) = await _authService.RegisterAsync(dto.Email, dto.Password, dto.FirstName, dto.LastName);

            return Ok(new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Token = accessToken,
                RefreshToken = refreshToken
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Greška pri registraciji");
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Greška pri validaciji");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Greška u Register endpointu");
            return StatusCode(500, "Greška na serveru.");
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Email i password su obavezni.");

            var (user, accessToken, refreshToken) = await _authService.LoginAsync(dto.Email, dto.Password);

            return Ok(new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Token = accessToken,
                RefreshToken = refreshToken
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Greška pri logiranju");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Greška u Login endpointu");
            return StatusCode(500, "Greška na serveru.");
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto dto)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(dto.RefreshToken))
                return BadRequest("Refresh token je obavezan.");

            var (user, accessToken, refreshToken) = await _authService.RefreshTokenAsync(dto.RefreshToken);

            return Ok(new AuthResponse
            {
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Token = accessToken,
                RefreshToken = refreshToken
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Greška pri refresh tokena");
            return Unauthorized(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Greška u RefreshToken endpointu");
            return StatusCode(500, "Greška na serveru.");
        }
    }

    [HttpPost("logout")]
    public IActionResult Logout([FromBody] LogoutDto dto)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(dto.Token))
            {
                _tokenBlacklist.RevokeToken(dto.Token);
                _logger.LogInformation("Token opozvan uspješno");
            }

            return Ok(new { message = "Uspješno ste se odjavili." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Greška u Logout endpointu");
            return StatusCode(500, "Greška na serveru.");
        }
    }
}
