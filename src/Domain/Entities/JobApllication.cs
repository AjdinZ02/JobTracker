
namespace Domain.Entities;

public class JobApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Company { get; set; } = default!;
    public string Position { get; set; } = default!;
    public string Location { get; set; } = default!;
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;
    public DateTime AppliedDate { get; set; } = DateTime.UtcNow;
    public DateTime? NextActionDate { get; set; }
    public string? Source { get; set; }
    public string? JobPostingUrl { get; set; }
    public decimal? ExpectedSalary { get; set; }
    public string? Notes { get; set; }

    public List<ApplicationNote> Timeline { get; set; } = new();
}
