using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace Infrastructure.Services;

public class CustomJwtSecurityTokenHandler : JwtSecurityTokenHandler
{
    public override bool CanReadToken(string token)
    {
        // Always return true to force using this handler
        return base.CanReadToken(token);
    }
}
