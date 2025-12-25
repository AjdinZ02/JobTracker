
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Api.Controllers;

[ApiController]
[Route("api/job-applications")]
[Authorize]
public class JobApplicationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<JobApplicationsController> _logger;

    private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());

    public JobApplicationsController(AppDbContext db, ILogger<JobApplicationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        try
        {
            var q = _db.JobApplications
                       .Where(x => x.UserId == UserId)
                       .Include(x => x.Timeline)
                       .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) &&
                Enum.TryParse<ApplicationStatus>(status, true, out var st))
                q = q.Where(x => x.Status == st);

            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(x => x.Company.Contains(search) || x.Position.Contains(search));

            if (from is not null) q = q.Where(x => x.AppliedDate >= from);
            if (to is not null)   q = q.Where(x => x.AppliedDate <= to);

            var items = await q.OrderByDescending(x => x.AppliedDate).ToListAsync();
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Greška u List endpointu");
            return StatusCode(500, "Greška na serveru. Pogledaj log.");
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var entity = await _db.JobApplications
                .Where(x => x.UserId == UserId)
                .Include(x => x.Timeline)
                .FirstOrDefaultAsync(x => x.Id == id);

            return entity is null ? NotFound() : Ok(entity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Greška u GetById endpointu");
            return StatusCode(500, "Greška na serveru. Pogledaj log.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JobApplicationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Company) || string.IsNullOrWhiteSpace(dto.Position))
            return BadRequest("Company i Position su obavezni.");

        if (dto.AppliedDate > DateTime.UtcNow.AddMinutes(5))
            return BadRequest("AppliedDate ne može biti u budućnosti.");

        var entity = new JobApplication
        {
            UserId = UserId,
            Company = dto.Company,
            Position = dto.Position,
            Location = dto.Location,
            Status = dto.Status,
            AppliedDate = dto.AppliedDate,
            Source = dto.Source,
            JobPostingUrl = dto.JobPostingUrl,
            ExpectedSalary = dto.ExpectedSalary,
            Notes = dto.Notes
        };

        _db.JobApplications.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, entity);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] JobApplicationDto dto)
    {
        var entity = await _db.JobApplications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity is null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Company) || string.IsNullOrWhiteSpace(dto.Position))
            return BadRequest("Company i Position su obavezni.");

        if (dto.AppliedDate > DateTime.UtcNow.AddMinutes(5))
            return BadRequest("AppliedDate ne može biti u budućnosti.");

        entity.Company = dto.Company;
        entity.Position = dto.Position;
        entity.Location = dto.Location;
        entity.Status = dto.Status;
        entity.AppliedDate = dto.AppliedDate;
        entity.Source = dto.Source;
        entity.JobPostingUrl = dto.JobPostingUrl;
        entity.ExpectedSalary = dto.ExpectedSalary;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entity = await _db.JobApplications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (entity is null) return NotFound();
        _db.JobApplications.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Notes (timeline)
    [HttpPost("{id:guid}/notes")]
    public async Task<IActionResult> AddNote(Guid id, [FromBody] AddNoteDto dto)
    {
        var app = await _db.JobApplications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId);
        if (app is null) return NotFound();

        var note = new ApplicationNote
        {
            JobApplicationId = id,
            Content = dto.Content,
            Type = dto.Type
        };

        _db.ApplicationNotes.Add(note);
        await _db.SaveChangesAsync();

        return Ok(note);
    }

    [HttpDelete("{id:guid}/notes/{noteId:guid}")]
    public async Task<IActionResult> DeleteNote(Guid id, Guid noteId)
    {
        var note = await _db.ApplicationNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.JobApplicationId == id);

        if (note is null) return NotFound();

        _db.ApplicationNotes.Remove(note);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
