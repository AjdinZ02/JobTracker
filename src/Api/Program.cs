
using System.Text.Json.Serialization;
using Infrastructure.Data;
using Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

// Disable file watching in production (Render free tier fix)
builder.Host.ConfigureAppConfiguration((context, config) =>
{
    config.Sources
        .OfType<Microsoft.Extensions.Configuration.Json.JsonConfigurationSource>()
        .ToList()
        .ForEach(s => s.ReloadOnChange = false);
});

// log
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Dynamic port binding - for hosting services (Railway, Render, etc.)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// EF Core - PostgreSQL (production) or SQLite (development)
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
Console.WriteLine($"🔍 DATABASE_URL length: {databaseUrl?.Length ?? 0}");
Console.WriteLine($"🔍 DATABASE_URL starts with: {(string.IsNullOrEmpty(databaseUrl) ? "EMPTY" : databaseUrl.Substring(0, Math.Min(20, databaseUrl.Length)))}...");

// Mask password for logging
if (!string.IsNullOrEmpty(databaseUrl))
{
    var parts = databaseUrl.Split('@');
    Console.WriteLine($"🔍 Database host part: @{(parts.Length > 1 ? parts[1] : "MISSING")}");
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        // PostgreSQL for production - parse Render connection string
        Console.WriteLine("✅ Using PostgreSQL");
        try
        {
            // Render format: postgresql://user:password@host:port/database
            // Convert to Npgsql format
            var uri = new Uri(databaseUrl);
            var userInfo = uri.UserInfo.Split(':');
            var port = uri.Port > 0 ? uri.Port : 5432; // Default PostgreSQL port
            
            var npgsqlConnectionString = $"Host={uri.Host};Port={port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
            
            Console.WriteLine($"🔍 Converted connection string - Host: {uri.Host}, Port: {port}");
            options.UseNpgsql(npgsqlConnectionString);
            Console.WriteLine("✅ UseNpgsql configured successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ UseNpgsql failed: {ex.Message}");
            throw;
        }
    }
    else
    {
        // SQLite for local development
        Console.WriteLine("✅ Using SQLite");
        var cs = builder.Configuration.GetConnectionString("DefaultConnection")
                 ?? "Data Source=jobtracker.db";
        options.UseSqlite(cs);
    }
});

// JWT Authentication - Environment variable prioritized for production
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") 
                ?? builder.Configuration["Jwt:SecretKey"] 
                ?? throw new InvalidOperationException("JWT SecretKey must be set via JWT_SECRET_KEY environment variable or appsettings");

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "JobTracker";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "JobTrackerApi";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    
    // Check if token is blacklisted
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = context =>
        {
            var tokenBlacklist = context.HttpContext.RequestServices.GetRequiredService<ITokenBlacklistService>();
            var token = context.Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
            
            if (tokenBlacklist.IsTokenRevoked(token))
            {
                context.Fail("Token je opozvan.");
            }
            
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// Add Auth Service
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<ITokenBlacklistService, TokenBlacklistService>();

// Controllers + JSON 
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()); // <-- KLJUČNO
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS: Dynamic configuration for development and production
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var allowedOrigins = new List<string> { "http://localhost:5173" };
        
        // Add production frontend URL from environment variable
        var productionUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
        if (!string.IsNullOrEmpty(productionUrl))
        {
            allowedOrigins.Add(productionUrl);
        }
        
        policy.WithOrigins(allowedOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Database initialization and migrations
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("🔍 Ensuring database is created...");
        db.Database.EnsureCreated(); // Creates tables if they don't exist
        logger.LogInformation("✅ Database ready!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Error creating database");
        throw;
    }

    // Seed initial data only if database is empty
    try
    {
        if (!db.Users.Any())
        {
            logger.LogInformation("📝 Dodajem početne korisnike...");
            
            var demoUser = new Domain.Entities.User
            {
                Email = "demo@example.com",
                FirstName = "Demo",
                LastName = "User",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo123"),
                CreatedAt = DateTime.UtcNow
            };
            
            var testUser = new Domain.Entities.User
            {
                Email = "test@example.com",
                FirstName = "Test",
                LastName = "User",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("test123"),
                CreatedAt = DateTime.UtcNow
            };
            
            db.Users.AddRange(demoUser, testUser);
            db.SaveChanges();
            
            logger.LogInformation("✅ Korisnici kreirani: demo@example.com, test@example.com");

            // Add sample job applications for demo user
            if (!db.JobApplications.Any())
            {
                logger.LogInformation("📝 Dodajem primer job aplikacija...");
                
                var acme = new Domain.Entities.JobApplication
                {
                    UserId = demoUser.Id,
                    Company = "ACME Corp",
                    Position = "Frontend Developer",
                    Location = "Remote",
                    Status = Domain.Entities.ApplicationStatus.Applied,
                    AppliedDate = DateTime.UtcNow.AddDays(-10),
                    Source = "LinkedIn",
                    JobPostingUrl = "https://www.linkedin.com/jobs/acme-frontend",
                    ExpectedSalary = 3500,
                    Notes = "Poslana prijava"
                };
                
                var globex = new Domain.Entities.JobApplication
                {
                    UserId = demoUser.Id,
                    Company = "Globex",
                    Position = "Full-Stack Engineer",
                    Location = "Sarajevo",
                    Status = Domain.Entities.ApplicationStatus.Interview,
                    AppliedDate = DateTime.UtcNow.AddDays(-20),
                    Source = "Company site",
                    ExpectedSalary = 4000,
                    Notes = "Zakazan tehnički intervju"
                };
                
                db.JobApplications.AddRange(acme, globex);
                db.SaveChanges();
                
                logger.LogInformation($"✅ Kreirano {db.JobApplications.Count()} job aplikacija");

                
                var g = db.JobApplications.First(x => x.Company == "Globex");
                db.ApplicationNotes.AddRange(
                    new Domain.Entities.ApplicationNote
                    {
                        JobApplicationId = g.Id,
                        CreatedAt = DateTime.UtcNow.AddDays(-5),
                        Content = "HR screening obavljen",
                        Type = "screening"
                    },
                    new Domain.Entities.ApplicationNote
                    {
                        JobApplicationId = g.Id,
                        CreatedAt = DateTime.UtcNow.AddDays(-2),
                        Content = "Zadatak poslan",
                        Type = "task"
                    }
                );
                db.SaveChanges();
                
                logger.LogInformation($"✅ Kreirano {db.ApplicationNotes.Count()} napomena");
            }
            
            logger.LogInformation("========================================");
            logger.LogInformation("🎉 Baza inicijalizovana!");
            logger.LogInformation("Login: demo@example.com / demo123");
            logger.LogInformation("Login: test@example.com / test123");
            logger.LogInformation("========================================");
        }
        else
        {
            logger.LogInformation($"ℹ️  Baza već postoji sa {db.Users.Count()} korisnika");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Greška pri seed-anju baze");
    }
}

app.UseSwagger();
app.UseSwaggerUI();

// Rate limiting middleware
app.UseMiddleware<Infrastructure.Middleware.RateLimitingMiddleware>();

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    await next();
});

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint for Render
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

app.Run();
