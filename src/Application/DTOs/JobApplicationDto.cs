
using Domain.Entities;

namespace Application.DTOs;

public record JobApplicationDto(
    Guid? Id,
    string Company,
    string Position,
    string Location,
    ApplicationStatus Status,
    DateTime AppliedDate,
    string? Source,
    string? JobPostingUrl,
    decimal? ExpectedSalary,
    string? Notes
);

