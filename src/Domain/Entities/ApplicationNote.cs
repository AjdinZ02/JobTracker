
namespace Domain.Entities;

public class ApplicationNote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid JobApplicationId { get; set; }
    public JobApplication? JobApplication { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Content { get; set; } = default!;
    public string? Type { get; set; } 
}

