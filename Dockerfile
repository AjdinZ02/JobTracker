# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy solution and project files
COPY JobTracker.sln ./
COPY src/Domain/Domain.csproj ./src/Domain/
COPY src/Application/Application.csproj ./src/Application/
COPY src/Infrastructure/Infrastructure.csproj ./src/Infrastructure/
COPY src/Api/Api.csproj ./src/Api/

# Restore dependencies
RUN dotnet restore

# Copy everything else
COPY . .

# Build and publish
WORKDIR /app/src/Api
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published app
COPY --from=build /app/publish .

# Expose port (Render uses PORT env variable)
EXPOSE 5000

# Run the application
ENTRYPOINT ["dotnet", "Api.dll"]
