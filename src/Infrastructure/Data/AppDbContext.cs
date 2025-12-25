
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<ApplicationNote> ApplicationNotes => Set<ApplicationNote>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity(JobApplicationConfig());
        modelBuilder.Entity(ApplicationNoteConfig());
        modelBuilder.Entity(UserConfig());
    }

    private static Action<Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<JobApplication>> JobApplicationConfig()
        => b =>
        {
            b.Property(p => p.Company).IsRequired().HasMaxLength(150);
            b.Property(p => p.Position).IsRequired().HasMaxLength(150);
            b.Property(p => p.Location).IsRequired().HasMaxLength(150);
            b.Property(p => p.JobPostingUrl).HasMaxLength(500);
            b.HasMany(p => p.Timeline)
             .WithOne(n => n.JobApplication!)
             .HasForeignKey(n => n.JobApplicationId)
             .OnDelete(DeleteBehavior.Cascade);
            b.HasOne(p => p.User)
             .WithMany(u => u.JobApplications)
             .HasForeignKey(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        };

    private static Action<Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<ApplicationNote>> ApplicationNoteConfig()
        => b =>
        {
            b.Property(p => p.Content).IsRequired();
            b.Property(p => p.Type).HasMaxLength(50);
        };

    private static Action<Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<User>> UserConfig()
        => b =>
        {
            b.Property(p => p.Email).IsRequired().HasMaxLength(255);
            b.Property(p => p.PasswordHash).IsRequired();
            b.Property(p => p.FirstName).IsRequired().HasMaxLength(100);
            b.Property(p => p.LastName).IsRequired().HasMaxLength(100);
            b.HasIndex(p => p.Email).IsUnique();
        };
}
