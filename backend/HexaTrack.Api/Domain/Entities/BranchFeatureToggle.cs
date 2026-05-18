namespace HexaTrack.Api.Domain.Entities;

/// <summary>Per-branch feature toggles managed by Super Admin.</summary>
public sealed class BranchFeatureToggle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BranchId { get; set; }
    public required string FeatureKey { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Branch? Branch { get; set; }
}
